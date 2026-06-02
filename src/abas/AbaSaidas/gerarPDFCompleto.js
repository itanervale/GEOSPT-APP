/* ============================================================================
 * gerarPDFCompleto — relatório técnico completo (multi-estaca, todos os modos)
 *
 * Portado de gerarHtmlCompleta + _calcularEstacaCompleto (com Modo 2.3) das
 * linhas 8053-8146 e 8357-8792 do geospt_app.jsx. Mudanças:
 *   - window.GeoSPT → import { GeoSPT }
 *   - _cotaConservadora antigo → encontrarCotaSugeridaConservadora (canônico)
 *   - helpers de seção/CSS de pdfHelpers
 *   - tabela de coeficientes lê GeoSPT.domain.coefficients (import)
 * ============================================================================ */

import { GeoSPT } from '@/engine/geospt-engine';
import {
  perfilEnvoltoriaUtil,
  opcoesParaEstaca,
  encontrarCotaSugeridaConservadora,
} from '@/abas/AbaCapacidade/calculoHelpers';
import {
  escHtml,
  slugify,
  cssRelatorio,
  toolbarHTML,
  secaoIdentificacao,
  secaoSondagensCompleta,
  secaoCompatibilizacaoCompleta,
  secaoAnaliseCritica,
  tabelaMemorialModoComEnvoltoria,
  blocoEstacaCabecalho,
} from './pdfHelpers';
import {
  svgMiniMapa,
  svgPerfilCompatibilizado,
  svgCurvaCapacidade,
} from './pdfGraficos';

function cotaCanonica(memDq, memAv, carga) {
  const sug = encontrarCotaSugeridaConservadora(memDq, memAv, carga);
  if (!sug || sug.cota_m == null) return null;
  return {
    cota_m: sug.cota_m,
    regente: sug.regente,
    dq: (memDq || []).find((m) => m.cotaPonta_m === sug.cota_m) || null,
    av: (memAv || []).find((m) => m.cotaPonta_m === sug.cota_m) || null,
    ambosAtendem: sug.ambosAtendem,
  };
}

// Cálculo completo de 1 estaca, INCLUINDO Modo 2.3 (perfis paralelos)
function calcularEstacaCompleto(estaca, sondagens, params, env) {
  const engine = GeoSPT?.engine;
  if (!engine || !env) return null;
  const opc = opcoesParaEstaca(estaca, params);
  const out = {
    modo1: { memDq: [], memAv: [], erro: null },
    modo2_1: { memDq: [], memAv: [], bloqueado: false },
    modo2_2: { memDq: [], memAv: [], bloqueado: false },
    modo2_3: { ramos: null, erro: null, avisos: [] },
    modo3: { resultados: [], erro: null },
    modo4: { memorial: [], erro: null },
  };

  try {
    out.modo1.memDq = engine.calcularDQ(env.perfil, opc).memorial || [];
    out.modo1.memAv = engine.calcularAV(env.perfil, opc).memorial || [];
  } catch (e) {
    out.modo1.erro = e.message;
  }

  ['2.1_predominante', '2.2_conservador'].forEach((sub, idx) => {
    const key = 'modo2_' + (idx + 1);
    try {
      const r = engine.montarPerfilMedio(env.compat, sub);
      if (r.erro) {
        out[key].erro = r.erro;
        return;
      }
      if (r.bloqueado) {
        out[key].bloqueado = true;
        out[key].motivo = r.motivo;
        return;
      }
      if (r.perfil) {
        out[key].memDq = engine.calcularDQ(r.perfil, opc).memorial || [];
        out[key].memAv = engine.calcularAV(r.perfil, opc).memorial || [];
      }
    } catch (e) {
      out[key].erro = e.message;
    }
  });

  // Modo 2.3 — perfis paralelos (até 3 ramos)
  try {
    const r23 = engine.montarPerfilMedio(env.compat, '2.3_dois_paralelos');
    if (r23.erro) {
      out.modo2_3.erro = r23.erro;
    } else {
      out.modo2_3.ramos = {};
      [
        ['Coesivo', 'perfilCoesivo'],
        ['Granular', 'perfilGranular'],
        ['Intermediário', 'perfilIntermediario'],
      ].forEach(([familia, chave]) => {
        const perfilRamo = r23[chave] || [];
        if (perfilRamo.length === 0) return;
        try {
          const memDq = engine.calcularDQ(perfilRamo, opc).memorial || [];
          const memAv = engine.calcularAV(perfilRamo, opc).memorial || [];
          out.modo2_3.ramos[familia] = { perfilRamo, memDq, memAv };
        } catch (e) {
          out.modo2_3.ramos[familia] = { erro: e.message };
        }
      });
      out.modo2_3.avisos = r23.avisos || [];
    }
  } catch (e) {
    out.modo2_3.erro = e.message;
  }

  try {
    out.modo3 = engine.calcularPorFuroIndividual(sondagens, estaca, opc);
  } catch (e) {
    out.modo3.erro = e.message;
  }

  if (estaca.coordenadas?.x != null && estaca.coordenadas?.y != null) {
    try {
      const sondagensConv = {};
      let temCoords = true;
      Object.entries(sondagens).forEach(([n, s]) => {
        if (s.coordenadas?.x == null) temCoords = false;
        sondagensConv[n] = { ...s, x: s.coordenadas?.x, y: s.coordenadas?.y };
      });
      if (temCoords) {
        const estacaConv = {
          ...estaca,
          x: estaca.coordenadas.x,
          y: estaca.coordenadas.y,
        };
        const m4 = engine.calcularPorInterpolacao(
          sondagensConv,
          estacaConv,
          opc
        );
        if (m4.metadata?.erro) out.modo4.erro = m4.metadata.erro;
        else {
          out.modo4.memorial = m4.memorial || [];
          out.modo4.metadata = m4.metadata;
        }
      } else {
        out.modo4.erro = 'furos sem coordenadas';
      }
    } catch (e) {
      out.modo4.erro = e.message;
    }
  } else {
    out.modo4.erro = 'estaca sem coordenadas';
  }
  return out;
}

// Bloco de auditoria com as 7 tabelas de coeficientes (custom vs padrão)
function blocoCoeficientes(params) {
  const orig = GeoSPT?.domain?.coefficients;
  if (!orig) return '';
  const cc = params.coeficientesCustomizados || {};
  const TIPOS = [
    { id: 'helice_continua', label: 'Hélice cont.' },
    { id: 'escavada_seco', label: 'Escavada (seco)' },
    { id: 'escavada_fluido', label: 'Escavada (fluido)' },
    { id: 'premoldada', label: 'Pré-moldada' },
    { id: 'raiz', label: 'Raiz' },
  ];
  const FAMS = ['Coesivo', 'Intermediário', 'Granular'];
  const SOLOS = [
    'Areia', 'Areia Siltosa', 'Areia Silto-Argilosa', 'Areia Argilo-Siltosa',
    'Areia Argilosa', 'Silte Arenoso', 'Silte Areno-Argiloso', 'Silte',
    'Silte Argilo-Arenoso', 'Silte Argiloso', 'Argila Arenosa',
    'Argila Areno-Siltosa', 'Argila Silto-Arenosa', 'Argila Siltosa', 'Argila',
  ];
  const eq = (a, b) => Math.abs((a ?? 0) - (b ?? 0)) < 1e-6;
  const cellVal = (v, padrao, casas = 2, sufx = '') => {
    if (v === undefined || v === null)
      return '<td class="text-mono text-right small">—</td>';
    const dif = !eq(v, padrao);
    return `<td class="text-mono text-right${dif ? ' destacada' : ''}">${Number(v).toFixed(casas)}${sufx}</td>`;
  };

  let html = `<h3>Coeficientes aplicados aos cálculos</h3>
<div class="info-box small">As tabelas mostram os 7 coeficientes de DQ e AV. Valores em <span class="destacada" style="padding:0 4px;">amarelo</span> indicam customização em relação ao padrão da engine.</div>`;

  // 1.3 — C (DQ)
  html += `<h4>Tabela 1.3 — Coeficiente C (DQ) [kPa]</h4>
<table><thead><tr><th>Solo</th><th class="text-right">Padrão (kPa)</th><th class="text-right">Em uso (kPa)</th></tr></thead><tbody>
${SOLOS.map((s) => {
    const padrao = orig.DQ_C?.[s];
    const uso = cc.DQ_C?.[s] !== undefined ? cc.DQ_C[s] : padrao;
    return `<tr><td>${escHtml(s)}</td><td class="text-mono text-right small">${padrao?.toFixed(0) ?? '—'}</td>${cellVal(uso, padrao, 0)}</tr>`;
  }).join('\n')}
</tbody></table>`;

  // 1.4 — α (DQ)
  html += `<h4>Tabela 1.4 — Coeficiente α (DQ)</h4>
<table><thead><tr><th>Família</th>${TIPOS.map((t) => `<th class="text-right">${t.label}</th>`).join('')}</tr></thead><tbody>
${FAMS.map((fam) => `<tr><td><strong>${fam}</strong></td>${TIPOS.map((t) => {
      const padrao = orig.DQ_alpha?.[fam]?.[t.id];
      const uso = cc.DQ_alpha?.[fam]?.[t.id] !== undefined ? cc.DQ_alpha[fam][t.id] : padrao;
      return cellVal(uso, padrao, 2);
    }).join('')}</tr>`).join('\n')}
</tbody></table>`;

  // 1.5 — β (DQ)
  html += `<h4>Tabela 1.5 — Coeficiente β (DQ)</h4>
<table><thead><tr><th>Família</th>${TIPOS.map((t) => `<th class="text-right">${t.label}</th>`).join('')}</tr></thead><tbody>
${FAMS.map((fam) => `<tr><td><strong>${fam}</strong></td>${TIPOS.map((t) => {
      const padrao = orig.DQ_beta?.[fam]?.[t.id];
      const uso = cc.DQ_beta?.[fam]?.[t.id] !== undefined ? cc.DQ_beta[fam][t.id] : padrao;
      return cellVal(uso, padrao, 2);
    }).join('')}</tr>`).join('\n')}
</tbody></table>`;

  // 1.6 — FS (DQ)
  html += `<h4>Tabela 1.6 — Fatores de segurança (DQ)</h4>
<table><thead><tr><th>Fator</th><th>Aplicação</th><th class="text-right">Padrão</th><th class="text-right">Em uso</th></tr></thead><tbody>
${[['Fl', 'atrito lateral (parcial DQ)'], ['Fp', 'ponta (parcial DQ)'], ['FSg', 'global (DQ + AV)']]
    .map(([k, desc]) => {
      const padrao = orig.DQ_FS?.[k];
      const uso = cc.DQ_FS?.[k] !== undefined ? cc.DQ_FS[k] : padrao;
      return `<tr><td class="text-mono">${k}</td><td class="small">${desc}</td><td class="text-mono text-right small">${padrao?.toFixed(2) ?? '—'}</td>${cellVal(uso, padrao, 2)}</tr>`;
    }).join('\n')}
</tbody></table>`;

  // 1.7 — K e α (AV)
  html += `<h4>Tabela 1.7 — K e α (Aoki-Velloso)</h4>
<table><thead><tr><th>Solo</th><th class="text-right">Padrão K (kPa)</th><th class="text-right">K em uso</th><th class="text-right">Padrão α (%)</th><th class="text-right">α em uso</th></tr></thead><tbody>
${SOLOS.map((s) => {
    const padK = orig.AV_K_alpha?.[s]?.K_kPa;
    const padA = orig.AV_K_alpha?.[s]?.alpha_pct;
    const usoK = cc.AV_K_alpha?.[s]?.K_kPa !== undefined ? cc.AV_K_alpha[s].K_kPa : padK;
    const usoA = cc.AV_K_alpha?.[s]?.alpha_pct !== undefined ? cc.AV_K_alpha[s].alpha_pct : padA;
    return `<tr><td>${escHtml(s)}</td><td class="text-mono text-right small">${padK?.toFixed(0) ?? '—'}</td>${cellVal(usoK, padK, 0)}<td class="text-mono text-right small">${padA?.toFixed(1) ?? '—'}</td>${cellVal(usoA, padA, 1)}</tr>`;
  }).join('\n')}
</tbody></table>`;

  // 1.8 — F1/F2 (AV)
  const padPm = { base: 1, divisor: 0.8 };
  const padOut = { F1: 2.0, F2: 4.0 };
  const usoPm = cc.AV_F1_F2_params?.premoldada || padPm;
  const usoOut = cc.AV_F1_F2_params?.outros || padOut;
  html += `<h4>Tabela 1.8 — Fatores F1 e F2 (AV)</h4>
<table><thead><tr><th>Aplicação</th><th>Parâmetro</th><th class="text-right">Padrão</th><th class="text-right">Em uso</th></tr></thead><tbody>
<tr><td rowspan="2"><strong>Pré-moldada</strong><br><span class="small">F1 = base + D/divisor</span></td><td class="text-mono">base</td><td class="text-mono text-right small">${padPm.base.toFixed(2)}</td>${cellVal(usoPm.base, padPm.base, 2)}</tr>
<tr><td class="text-mono">divisor (m)</td><td class="text-mono text-right small">${padPm.divisor.toFixed(2)}</td>${cellVal(usoPm.divisor, padPm.divisor, 2)}</tr>
<tr><td rowspan="2"><strong>Outros tipos</strong></td><td class="text-mono">F1</td><td class="text-mono text-right small">${padOut.F1.toFixed(2)}</td>${cellVal(usoOut.F1, padOut.F1, 2)}</tr>
<tr><td class="text-mono">F2</td><td class="text-mono text-right small">${padOut.F2.toFixed(2)}</td>${cellVal(usoOut.F2, padOut.F2, 2)}</tr>
</tbody></table>`;

  // 1.9 — fator redutor de ponta
  html += `<h4>Tabela 1.9 — Fator redutor de ponta</h4>
<table><thead><tr><th>Tipo de estaca</th><th class="text-right">Padrão</th><th class="text-right">Em uso</th></tr></thead><tbody>
${TIPOS.map((t) => {
    const padrao = orig.reducaoP?.[t.id];
    const uso = cc.reducaoP?.[t.id] !== undefined ? cc.reducaoP[t.id] : padrao;
    return `<tr><td>${t.label}</td><td class="text-mono text-right small">${padrao?.toFixed(2) ?? '—'}</td>${cellVal(uso, padrao, 2)}</tr>`;
  }).join('\n')}
</tbody></table>`;

  return html;
}

// Linha de resumo de 1 modo (com badge de atendimento)
function linhaResumoModo(rotulo, desc, cs, carga, temAlvo, extra) {
  extra = extra || {};
  if (extra.bloqueado)
    return `<tr><td><strong>${rotulo}</strong></td><td>${desc}</td><td colspan="5" class="small"><em>bloqueado: ${escHtml(extra.motivo || '')}</em></td></tr>`;
  if (!cs)
    return `<tr><td><strong>${rotulo}</strong></td><td>${desc}</td><td colspan="5" class="small"><em>nenhuma cota atende ambos</em></td></tr>`;
  const at = temAlvo
    ? cs.dq?.Qadm_final_tf >= carga && cs.av?.Qadm_final_tf >= carga
    : null;
  return `<tr><td><strong>${rotulo}</strong></td><td>${desc}</td>
    <td class="value text-right">${cs.cota_m}</td>
    <td><span class="badge ${cs.regente === 'DQ' ? 'badge-dq' : 'badge-av'}">${cs.regente}</span></td>
    <td class="value text-right">${cs.dq?.Qadm_final_tf?.toFixed(2) ?? '—'}</td>
    <td class="value text-right">${cs.av?.Qadm_final_tf?.toFixed(2) ?? '—'}</td>
    <td>${at === null ? '<span class="small">sem alvo</span>' : at ? '<span class="badge badge-ok">✓</span>' : '<span class="badge badge-err">⛔</span>'}</td></tr>`;
}

export function gerarPDFCompleto(obra, payloadJson) {
  const sondagens = obra.sondagens || {};
  const estacas = obra.estacas || [];
  const params = obra.parametros || {};
  const ident = obra.identificacao || {};
  const nomeObra = ident.nome || 'obra-sem-nome';
  const dataExp = new Date().toLocaleDateString('pt-BR');

  const env = perfilEnvoltoriaUtil(sondagens);
  const v = payloadJson._validacao || {};
  const compatV = v.compatibilizacao || {};
  const aterroV = v.aterroCorte || {};

  const nomeArqHtml =
    'geospt_' + slugify(nomeObra) + '_' + dataExp.replace(/\//g, '-') + '_completo.html';

  // Pré-cálculo por estaca
  const calculos = estacas.map((e) => {
    const calc = env ? calcularEstacaCompleto(e, sondagens, params, env) : null;
    if (!calc) return { estaca: e, calc: null };
    const carga = e.cargaPrevista_tf;
    return {
      estaca: e,
      calc,
      carga,
      cs1: cotaCanonica(calc.modo1.memDq, calc.modo1.memAv, carga),
      cs2_1: cotaCanonica(calc.modo2_1.memDq, calc.modo2_1.memAv, carga),
      cs2_2: cotaCanonica(calc.modo2_2.memDq, calc.modo2_2.memAv, carga),
    };
  });

  // Tabela resumo geral
  const tabelaGeral = calculos.map((c) => {
    const e = c.estaca;
    const cs = c.cs1;
    const temAlvo = c.carga > 0;
    if (!cs) return { nome: e.nome, statusGeral: 'nenhuma cota atende', cotaSug: null };
    const atende = temAlvo
      ? cs.dq.Qadm_final_tf >= c.carga && cs.av.Qadm_final_tf >= c.carga
      : null;
    return {
      nome: e.nome, tipo: e.tipoEstaca, D: e.diametro_m, arr: e.cotaArrasamento_m,
      carga: c.carga, cotaSug: cs.cota_m, regente: cs.regente,
      qDq: cs.dq.Qadm_final_tf, qAv: cs.av.Qadm_final_tf,
      statusGeral: temAlvo ? (atende ? 'atende' : 'não atende') : 'sem alvo',
    };
  });

  // Sumário
  let sumario = `<h2>Sumário</h2><ol>
    <li>Identificação</li>
    <li>Sondagens (${Object.keys(sondagens).length} furos)</li>
    <li>Compatibilização (cota a cota)</li>
    <li>Análise Crítica</li>
    <li>Resumo geral de estacas</li>`;
  estacas.forEach((e) => {
    sumario += `<li>Estaca ${escHtml(e.nome)} — cálculo completo (Modos 1, 2.1, 2.2, 2.3, 3, 4)</li>`;
  });
  sumario += `<li>Auditoria técnica</li></ol>`;

  // Seções por estaca
  let secoesEstacas = '';
  calculos.forEach((c, idx) => {
    const e = c.estaca;
    const calc = c.calc;
    const carga = c.carga;
    const temAlvo = carga > 0;
    const N = idx + 6;

    secoesEstacas += `<div class="page-break"></div>
<h2>${N}. Estaca ${escHtml(e.nome)} — Cálculo Completo</h2>
${blocoEstacaCabecalho(e, params, c.cs1, temAlvo, carga)}`;

    if (!calc) {
      secoesEstacas += '<p><em>Não foi possível calcular.</em></p>';
      return;
    }

    // Resumo dos modos
    secoesEstacas += `<h3>${N}.1. Resumo de todos os modos</h3>
<table>
<thead><tr><th>Modo</th><th>Descrição</th><th>Cota sugerida (m)</th><th>Limitante</th><th>Q_adm DQ (tf)</th><th>Q_adm AV (tf)</th><th>Atende ambos?</th></tr></thead>
<tbody>
${linhaResumoModo('1', 'Envoltória inferior', c.cs1, carga, temAlvo)}
${linhaResumoModo('2.1', 'Perfil médio — predominante', c.cs2_1, carga, temAlvo, { bloqueado: calc.modo2_1.bloqueado, motivo: calc.modo2_1.motivo })}
${linhaResumoModo('2.2', 'Perfil médio — conservador', c.cs2_2, carga, temAlvo, { bloqueado: calc.modo2_2.bloqueado, motivo: calc.modo2_2.motivo })}
</tbody>
</table>
<div class="info-box small"><strong>Modo 2.3 (perfis paralelos por família)</strong> detalhado na seção ${N}.5.</div>`;

    // Memorial Modo 1
    secoesEstacas += `<h3>${N}.2. Memorial Modo 1 — Envoltória inferior (cota a cota)</h3>`;
    secoesEstacas += tabelaMemorialModoComEnvoltoria(
      calc.modo1.memDq,
      calc.modo1.memAv,
      c.cs1?.cota_m
    );
    secoesEstacas += `<h4>Curva de capacidade Q_adm × cota — Modo 1</h4>`;
    secoesEstacas += svgCurvaCapacidade(calc.modo1.memDq, calc.modo1.memAv, e);

    // Modos 2.1 e 2.2
    ['2_1', '2_2'].forEach((sub, i) => {
      const subRotulo = '2.' + (i + 1);
      const dadosM = calc['modo' + sub];
      const csM = c['cs' + sub];
      secoesEstacas += `<h3>${N}.${3 + i}. Memorial Modo ${subRotulo} — Perfil médio (${['predominante', 'conservador'][i]})</h3>`;
      if (dadosM.bloqueado)
        secoesEstacas += `<div class="info-box">Bloqueado: <em>${escHtml(dadosM.motivo || 'critério não atendido')}</em></div>`;
      else if (!dadosM.memDq?.length)
        secoesEstacas += `<div class="info-box"><em>Sem dados.</em></div>`;
      else
        secoesEstacas += tabelaMemorialModoComEnvoltoria(dadosM.memDq, dadosM.memAv, csM?.cota_m);
    });

    // Modo 2.3
    secoesEstacas += `<h3>${N}.5. Memorial Modo 2.3 — Perfil médio (perfis paralelos por família)</h3>`;
    const m23 = calc.modo2_3;
    if (m23.erro) {
      secoesEstacas += `<div class="info-box">Erro: <em>${escHtml(m23.erro)}</em></div>`;
    } else if (!m23.ramos || Object.keys(m23.ramos).length === 0) {
      secoesEstacas += `<div class="info-box"><em>Sem ramos disponíveis.</em></div>`;
    } else {
      secoesEstacas += `<div class="info-box small">Cada ramo é uma família geotécnica processada separadamente. Cota sugerida por ramo segue o critério canônico (mais rasa onde ambos atendem).</div>
<table>
<thead><tr><th>Família (ramo)</th><th>Cota sugerida (m)</th><th>Limitante</th><th>Q_adm DQ (tf)</th><th>Q_adm AV (tf)</th><th>Atende?</th></tr></thead>
<tbody>
${['Coesivo', 'Granular', 'Intermediário'].map((fam) => {
        const r = m23.ramos[fam];
        if (!r) return `<tr><td><strong>${fam}</strong></td><td colspan="5" class="small"><em>ramo sem dados</em></td></tr>`;
        if (r.erro) return `<tr><td><strong>${fam}</strong></td><td colspan="5" class="small"><em>${escHtml(r.erro)}</em></td></tr>`;
        const cs = cotaCanonica(r.memDq, r.memAv, carga);
        if (!cs) return `<tr><td><strong>${fam}</strong></td><td colspan="5" class="small"><em>nenhuma cota atende ambos</em></td></tr>`;
        const ok = temAlvo ? cs.dq.Qadm_final_tf >= carga && cs.av.Qadm_final_tf >= carga : null;
        return `<tr><td><strong>${fam}</strong></td>
    <td class="value text-right">${cs.cota_m}</td>
    <td><span class="badge ${cs.regente === 'DQ' ? 'badge-dq' : 'badge-av'}">${cs.regente}</span></td>
    <td class="value text-right">${cs.dq.Qadm_final_tf?.toFixed(2)}</td>
    <td class="value text-right">${cs.av.Qadm_final_tf?.toFixed(2)}</td>
    <td>${ok === null ? '<span class="small">sem alvo</span>' : ok ? '<span class="badge badge-ok">✓</span>' : '<span class="badge badge-err">⛔</span>'}</td></tr>`;
      }).join('\n')}
</tbody>
</table>`;
      ['Coesivo', 'Granular', 'Intermediário'].forEach((fam) => {
        const r = m23.ramos[fam];
        if (!r || r.erro || !r.memDq?.length) return;
        const cs = cotaCanonica(r.memDq, r.memAv, carga);
        secoesEstacas += `<h4>Modo 2.3 / Ramo ${fam} — memorial cota a cota (${r.memDq.length} cotas)</h4>`;
        secoesEstacas += tabelaMemorialModoComEnvoltoria(r.memDq, r.memAv, cs?.cota_m);
      });
    }

    // Modo 3
    secoesEstacas += `<h3>${N}.6. Memorial Modo 3 — Por furo individual</h3>`;
    if (calc.modo3.resultados?.length) {
      secoesEstacas += `<table>
<thead><tr><th>Furo</th><th>Cota sugerida (m)</th><th>Limitante</th><th>Q_adm DQ (tf)</th><th>Q_adm AV (tf)</th><th>Atende?</th><th>Aterro espesso</th><th>Corte elevado</th></tr></thead>
<tbody>
${calc.modo3.resultados.map((f) => {
        if (f.erro) return `<tr><td><strong>${escHtml(f.furo)}</strong></td><td colspan="7" class="small"><em>${escHtml(f.erro)}</em></td></tr>`;
        const cs = cotaCanonica(f.dq?.memorial || [], f.av?.memorial || [], carga);
        if (!cs) return `<tr><td><strong>${escHtml(f.furo)}</strong></td><td colspan="7" class="small"><em>nenhuma cota atende ambos</em></td></tr>`;
        const ok = temAlvo ? cs.dq.Qadm_final_tf >= carga && cs.av.Qadm_final_tf >= carga : null;
        return `<tr><td><strong>${escHtml(f.furo)}</strong></td>
    <td class="value text-right">${cs.cota_m}</td>
    <td><span class="badge ${cs.regente === 'DQ' ? 'badge-dq' : 'badge-av'}">${cs.regente}</span></td>
    <td class="value text-right">${cs.dq.Qadm_final_tf?.toFixed(2)}</td>
    <td class="value text-right">${cs.av.Qadm_final_tf?.toFixed(2)}</td>
    <td>${ok === null ? '<span class="small">sem alvo</span>' : ok ? '<span class="badge badge-ok">✓</span>' : '<span class="badge badge-err">⛔</span>'}</td>
    <td>${f.alertaAterroEspesso ? '<span class="badge badge-warn">sim</span>' : ''}</td>
    <td>${f.alertaCorteElevado ? '<span class="badge badge-warn">sim</span>' : ''}</td></tr>`;
      }).join('\n')}
</tbody>
</table>`;
    } else {
      secoesEstacas += '<div class="info-box"><em>Sem dados.</em></div>';
    }

    // Modo 4
    secoesEstacas += `<h3>${N}.7. Memorial Modo 4 — Interpolação por locação</h3>`;
    if (calc.modo4.erro) {
      secoesEstacas += `<div class="info-box">Não calculado: <em>${escHtml(calc.modo4.erro)}</em></div>`;
    } else if (calc.modo4.memorial?.length) {
      secoesEstacas += `<table>
<thead><tr><th>Cota ponta (m)</th><th>Q_adm DQ interp. (tf)</th><th>Q_adm AV interp. (tf)</th><th>Método</th><th># furos disp.</th></tr></thead>
<tbody>
${calc.modo4.memorial.map((m) => `<tr>
  <td class="text-mono text-right">${m.cotaPonta_m}</td>
  <td class="text-mono text-right">${m.dq?.Qadm_interpolado_tf?.toFixed(2) ?? '—'}</td>
  <td class="text-mono text-right">${m.av?.Qadm_interpolado_tf?.toFixed(2) ?? '—'}</td>
  <td class="small">${escHtml(m.dq?.metodo || '—')}</td>
  <td class="text-mono text-right">${m.dq?.n_furos_disponiveis ?? '—'}</td>
</tr>`).join('\n')}
</tbody>
</table>`;
    } else {
      secoesEstacas += '<div class="info-box"><em>Sem dados.</em></div>';
    }
  });

  const blocoAuditoria = `<div class="page-break"></div>
<h2>${calculos.length + 6}. Auditoria Técnica</h2>

<h3>Versões e integridade</h3>
<table>
<tr><th style="width:30%">Versão do schema</th><td class="value">${payloadJson._schemaVersao || '?'}</td></tr>
<tr><th>Versão da engine</th><td class="value">${payloadJson._engineVersao || '?'}</td></tr>
<tr><th>Exportado em</th><td>${payloadJson._exportadoEm || '?'}</td></tr>
<tr><th>Hash de entrada</th><td class="text-mono">${payloadJson._inputHash || '—'}</td></tr>
<tr><th>Hash de exportação</th><td class="text-mono">${payloadJson._exportHash || '—'}</td></tr>
</table>

<h3>Parâmetros aplicados aos cálculos</h3>
<table>
<tr><th style="width:40%">Janela de compatibilização</th><td class="value">${params.janelaCompatibilizacao_m ?? '0.5'} m</td></tr>
<tr><th>Despreza atrito último 1 m</th><td>${(params.desprezaUltimoMetroAtrito ?? true) ? 'Sim' : 'Não'}</td></tr>
<tr><th>Aplica fator redutor de ponta</th><td>${params.aplicaFatorRedutorPonta ? 'Sim' : 'Não'}</td></tr>
<tr><th>Limita R_p ≤ R_l</th><td>${params.limitaRpRl ? 'Sim' : 'Não'}</td></tr>
<tr><th>Tratamento de ponta</th><td>${escHtml(params.tratamentoPonta || 'calculado')}</td></tr>
<tr><th>Coeficientes</th><td>${params.coeficientesCustomizados ? '<span class="badge badge-warn">CUSTOMIZADOS</span>' : 'padrão da engine'}</td></tr>
</table>

${blocoCoeficientes(params)}

<h3>Critério de cota sugerida</h3>
<div class="info-box small">Em todos os modos, a cota sugerida é a <strong>mais rasa onde DQ e AV atendem simultaneamente</strong> a carga prevista. Quando nenhuma cota satisfaz ambos os métodos, o modo não sugere cota.</div>

<h3>Validações automáticas (compatibilização)</h3>
<table>
<tr><th style="width:40%">Cotas processadas</th><td class="value">${compatV.cotasProcessadas ?? '—'}</td></tr>
<tr><th>Furo crítico</th><td>${escHtml(compatV.furoCritico || '—')}</td></tr>
<tr><th>Cotas heterogêneas</th><td>${(compatV.cotasHeterogeneas_m || []).length} — ${(compatV.cotasHeterogeneas_m || []).slice(0, 10).join(', ')}${(compatV.cotasHeterogeneas_m || []).length > 10 ? '...' : ''}</td></tr>
<tr><th>Cotas subamostradas</th><td>${(compatV.cotasSubamostradas_m || []).length}</td></tr>
<tr><th># inversões NSPT</th><td>${compatV.n_inversoes ?? 0}</td></tr>
</table>

<h3>Validações automáticas (aterro/corte)</h3>
<table>
<tr><th style="width:40%">Média dos topos das sondagens</th><td class="value">${aterroV.mediaTopos_m?.toFixed(2) ?? '—'} m</td></tr>
<tr><th>Limite adotado</th><td class="value">±${aterroV.limite_m ?? '2.5'} m</td></tr>
<tr><th>Estacas com aterro espesso</th><td>${(aterroV.estacasComAterroEspesso || []).map((e) => `${escHtml(e.nome)} (+${e.delta?.toFixed(2)} m)`).join(', ') || '<em>nenhuma</em>'}</td></tr>
<tr><th>Estacas com corte elevado</th><td>${(aterroV.estacasComCorteElevado || []).map((e) => `${escHtml(e.nome)} (${e.delta?.toFixed(2)} m)`).join(', ') || '<em>nenhuma</em>'}</td></tr>
</table>`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><title>GeoSPT Completo - ${escHtml(nomeObra)}</title>
<style>${cssRelatorio()}</style></head><body>

${toolbarHTML(nomeArqHtml)}

<h1>Memorial de Capacidade de Carga — GeoSPT (versão completa)</h1>
<p class="small">Relatório técnico detalhado: identificação, sondagens, compatibilização, análise crítica, cálculo de cada estaca em todos os modos (1, 2.1, 2.2, 2.3, 3, 4) e auditoria técnica.</p>

${sumario}

<div class="page-break"></div>
${secaoIdentificacao(ident)}
${secaoSondagensCompleta(sondagens)}

<div class="page-break"></div>
${secaoCompatibilizacaoCompleta(env?.compat, compatV)}
<h3>3.2. Perfil compatibilizado (NSPT × cota)</h3>
<div class="info-box small">Envoltória inferior (vermelha cheia) e médias por família (tracejadas). ★ marca pontos impenetráveis.</div>
${svgPerfilCompatibilizado(env?.compat?.resultados)}
${secaoAnaliseCritica(aterroV)}

<h2>5. Resumo geral de todas as estacas</h2>
<div class="info-box">Cota sugerida pelo Modo 1 (Envoltória inferior), critério canônico. Outros modos nas seções de cada estaca.</div>
<h3>5.1. Planta de locação (furos e estacas)</h3>
<div class="info-box small">Triângulos = furos de sondagem; quadrados = estacas. Escala real (1 m em X = 1 m em Y). Bolhas translúcidas agrupam furos por domínio geotécnico.</div>
${svgMiniMapa(sondagens, estacas)}
<h3>5.2. Tabela resumo</h3>
<table>
<thead><tr><th>Estaca</th><th>Tipo</th><th>D (m)</th><th>Arrasamento (m)</th><th>Carga (tf)</th><th>Cota sugerida (m)</th><th>Limitante</th><th>Q_adm DQ (tf)</th><th>Q_adm AV (tf)</th><th>Status</th></tr></thead>
<tbody>
${tabelaGeral.map((t) => {
    if (!t.cotaSug) return `<tr><td><strong>${escHtml(t.nome)}</strong></td><td colspan="9"><em>${escHtml(t.statusGeral)}</em></td></tr>`;
    return `<tr><td><strong>${escHtml(t.nome)}</strong></td><td>${escHtml(t.tipo)}</td><td class="value text-right">${t.D}</td><td class="value text-right">${t.arr}</td><td class="value text-right">${t.carga || '—'}</td>
  <td class="value text-right">${t.cotaSug}</td>
  <td><span class="badge ${t.regente === 'DQ' ? 'badge-dq' : 'badge-av'}">${t.regente}</span></td>
  <td class="value text-right">${t.qDq?.toFixed(2)}</td>
  <td class="value text-right">${t.qAv?.toFixed(2)}</td>
  <td>${t.statusGeral === 'atende' ? '<span class="badge badge-ok">✓</span>' : t.statusGeral === 'sem alvo' ? '<span class="small">sem alvo</span>' : '<span class="badge badge-err">⛔</span>'}</td></tr>`;
  }).join('\n')}
</tbody>
</table>

${secoesEstacas}

${blocoAuditoria}

<div class="footer">
  GeoSPT — Engine ${payloadJson._engineVersao || '?'} / Schema ${payloadJson._schemaVersao || '?'}<br>
  Exportado em: ${dataExp}<br>
  Hashes de integridade: entrada=${(payloadJson._inputHash || '').slice(0, 8)} · exportação=${(payloadJson._exportHash || '').slice(0, 8)}
</div>

</body></html>`;

  return html;
}
