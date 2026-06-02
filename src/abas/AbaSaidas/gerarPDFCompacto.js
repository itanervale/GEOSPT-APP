/* ============================================================================
 * gerarPDFCompacto — memorial enxuto (HTML para impressão/PDF) de 1 estaca
 *
 * Portado de gerarHtmlCompacta + _calcularEstacaCompleto (linhas 8053-8352).
 * Mudanças:
 *   - window.GeoSPT → import { GeoSPT }
 *   - _cotaConservadora (lógica antiga Math.min) → encontrarCotaSugeridaConservadora
 *     (critério canônico: cota mais rasa onde DQ e AV atendem; null se nenhuma)
 *   - helpers de seção/CSS importados de pdfHelpers
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
  secaoSondagensResumida,
  secaoCompatibilizacaoResumo,
  secaoAnaliseCritica,
  tabelaMemorialModoComEnvoltoria,
  blocoEstacaCabecalho,
} from './pdfHelpers';
import { svgPerfilCompatibilizado, svgCurvaCapacidade } from './pdfGraficos';

// Cota sugerida canônica a partir de 2 memoriais → formato {cota_m, regente, dq, av}
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

// Calcula Modos 1, 2.1, 2.2, 3, 4 da estaca (sem 2.3, que é só na versão completa)
function calcularEstaca(estaca, sondagens, params, env) {
  const engine = GeoSPT?.engine;
  if (!engine || !env) return null;
  const opc = opcoesParaEstaca(estaca, params);
  const out = {
    modo1: { memDq: [], memAv: [], erro: null },
    modo2_1: { memDq: [], memAv: [], bloqueado: false },
    modo2_2: { memDq: [], memAv: [], bloqueado: false },
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

export function gerarPDFCompacto(obra, payloadJson) {
  const sondagens = obra.sondagens || {};
  const estacas = obra.estacas || [];
  const params = obra.parametros || {};
  const ident = obra.identificacao || {};
  const nomeObra = ident.nome || 'obra-sem-nome';
  const dataExp = new Date().toLocaleDateString('pt-BR');

  const estacaAlvo =
    estacas.find((e) => e.nome === payloadJson.ui?.estacaSelecionada) ||
    estacas[0];
  const env = perfilEnvoltoriaUtil(sondagens);
  const v = payloadJson._validacao || {};
  const compatV = v.compatibilizacao || {};
  const aterroV = v.aterroCorte || {};

  const nomeArqHtml =
    'geospt_' + slugify(nomeObra) + '_' + dataExp.replace(/\//g, '-') + '_compacto.html';

  const calc =
    estacaAlvo && env ? calcularEstaca(estacaAlvo, sondagens, params, env) : null;
  const carga = estacaAlvo?.cargaPrevista_tf;
  const temAlvo = carga > 0;
  const cotaM1 = calc ? cotaCanonica(calc.modo1.memDq, calc.modo1.memAv, carga) : null;
  const cotaM21 = calc ? cotaCanonica(calc.modo2_1.memDq, calc.modo2_1.memAv, carga) : null;
  const cotaM22 = calc ? cotaCanonica(calc.modo2_2.memDq, calc.modo2_2.memAv, carga) : null;

  const modo3Resumo = [];
  if (calc && calc.modo3?.resultados) {
    calc.modo3.resultados.forEach((f) => {
      if (f.erro) {
        modo3Resumo.push({ furo: f.furo, erro: f.erro });
        return;
      }
      const cs = cotaCanonica(f.dq?.memorial || [], f.av?.memorial || [], carga);
      modo3Resumo.push({ furo: f.furo, cs });
    });
  }

  // Modo 4: cota mais rasa onde ambos interpolados atendem
  const modo4Cota =
    calc && !calc.modo4.erro && calc.modo4.memorial?.length > 0
      ? (() => {
          const memo = calc.modo4.memorial;
          if (!temAlvo) {
            const best = memo.reduce(
              (b, m) =>
                (m.dq?.Qadm_interpolado_tf ?? 0) >
                (b.dq?.Qadm_interpolado_tf ?? 0)
                  ? m
                  : b,
              memo[0]
            );
            return {
              cota_m: best.cotaPonta_m,
              qDq: best.dq?.Qadm_interpolado_tf,
              qAv: best.av?.Qadm_interpolado_tf,
              semAlvo: true,
            };
          }
          const atend = memo.filter(
            (m) =>
              (m.dq?.Qadm_interpolado_tf ?? 0) >= carga &&
              (m.av?.Qadm_interpolado_tf ?? 0) >= carga
          );
          if (!atend.length) return null;
          const sug = atend.reduce(
            (b, m) => (m.cotaPonta_m > b.cotaPonta_m ? m : b),
            atend[0]
          );
          return {
            cota_m: sug.cotaPonta_m,
            qDq: sug.dq?.Qadm_interpolado_tf,
            qAv: sug.av?.Qadm_interpolado_tf,
          };
        })()
      : null;

  const linhasResumo = [
    { rotulo: '1', desc: 'Envoltória inferior (NSPT mín. cota a cota)', cs: cotaM1 },
    {
      rotulo: '2.1',
      desc: 'Perfil médio — predominante',
      cs: cotaM21,
      bloqueado: calc?.modo2_1.bloqueado,
      motivo: calc?.modo2_1.motivo,
    },
    {
      rotulo: '2.2',
      desc: 'Perfil médio — conservador (NSPT médio)',
      cs: cotaM22,
      bloqueado: calc?.modo2_2.bloqueado,
      motivo: calc?.modo2_2.motivo,
    },
  ];

  const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><title>GeoSPT Compacto - ${escHtml(nomeObra)}</title>
<style>${cssRelatorio()}</style></head><body>

${toolbarHTML(nomeArqHtml)}

<h1>Memorial de Capacidade de Carga — GeoSPT (versão compacta)</h1>

${secaoIdentificacao(ident)}
${secaoSondagensResumida(sondagens)}
${secaoCompatibilizacaoResumo(compatV)}
<h3>3.1. Perfil compatibilizado (NSPT × cota)</h3>
${svgPerfilCompatibilizado(env?.compat?.resultados)}
${secaoAnaliseCritica(aterroV)}

${
  estacaAlvo
    ? `
<h2>5. Cálculo de Capacidade de Carga — Estaca ${escHtml(estacaAlvo.nome)}</h2>
${blocoEstacaCabecalho(estacaAlvo, params, cotaM1, temAlvo, carga)}

<h3>5.1. Resumo de todos os modos de cálculo</h3>
<div class="info-box">Critério das cotas sugeridas: <strong>cota mais rasa onde DQ e AV atendem simultaneamente</strong> a carga prevista. Se nenhuma cota atende ambos, o modo não sugere cota.</div>
<table>
<thead><tr><th>Modo</th><th>Descrição</th><th>Cota sugerida (m)</th><th>Limitante</th><th>Q_adm DQ (tf)</th><th>Q_adm AV (tf)</th><th>Atende ambos?</th></tr></thead>
<tbody>
${linhasResumo
  .map((m) => {
    if (m.bloqueado)
      return `<tr><td><strong>${m.rotulo}</strong></td><td>${m.desc}</td><td colspan="5" class="small"><em>bloqueado: ${escHtml(m.motivo || 'critério não atendido')}</em></td></tr>`;
    if (!m.cs)
      return `<tr><td><strong>${m.rotulo}</strong></td><td>${m.desc}</td><td colspan="5" class="small"><em>nenhuma cota atende ambos os métodos</em></td></tr>`;
    const atendeM = temAlvo
      ? m.cs.dq?.Qadm_final_tf >= carga && m.cs.av?.Qadm_final_tf >= carga
      : null;
    return `<tr><td><strong>${m.rotulo}</strong></td><td>${m.desc}</td>
    <td class="value text-right">${m.cs.cota_m}</td>
    <td><span class="badge ${m.cs.regente === 'DQ' ? 'badge-dq' : 'badge-av'}">${m.cs.regente}</span></td>
    <td class="value text-right">${m.cs.dq?.Qadm_final_tf?.toFixed(2) ?? '—'}</td>
    <td class="value text-right">${m.cs.av?.Qadm_final_tf?.toFixed(2) ?? '—'}</td>
    <td>${atendeM === null ? '<span class="small">sem alvo</span>' : atendeM ? '<span class="badge badge-ok">✓ ambos</span>' : '<span class="badge badge-err">⛔</span>'}</td></tr>`;
  })
  .join('\n')}
</tbody>
</table>

<h4>Modo 3 — Por furo individual</h4>
<table>
<thead><tr><th>Furo</th><th>Cota sugerida (m)</th><th>Limitante</th><th>Q_adm DQ (tf)</th><th>Q_adm AV (tf)</th><th>Atende ambos?</th></tr></thead>
<tbody>
${modo3Resumo
  .map((r) => {
    if (r.erro)
      return `<tr><td><strong>${escHtml(r.furo)}</strong></td><td colspan="5" class="small"><em>${escHtml(r.erro)}</em></td></tr>`;
    if (!r.cs)
      return `<tr><td><strong>${escHtml(r.furo)}</strong></td><td colspan="5" class="small"><em>nenhuma cota atende ambos</em></td></tr>`;
    const ok = temAlvo
      ? r.cs.dq?.Qadm_final_tf >= carga && r.cs.av?.Qadm_final_tf >= carga
      : null;
    return `<tr><td><strong>${escHtml(r.furo)}</strong></td>
    <td class="value text-right">${r.cs.cota_m}</td>
    <td><span class="badge ${r.cs.regente === 'DQ' ? 'badge-dq' : 'badge-av'}">${r.cs.regente}</span></td>
    <td class="value text-right">${r.cs.dq?.Qadm_final_tf?.toFixed(2) ?? '—'}</td>
    <td class="value text-right">${r.cs.av?.Qadm_final_tf?.toFixed(2) ?? '—'}</td>
    <td>${ok === null ? '<span class="small">sem alvo</span>' : ok ? '<span class="badge badge-ok">✓</span>' : '<span class="badge badge-err">⛔</span>'}</td></tr>`;
  })
  .join('\n')}
</tbody>
</table>

<h4>Modo 4 — Interpolação por locação</h4>
${
  calc?.modo4.erro
    ? `<div class="info-box">Não calculado: <em>${escHtml(calc.modo4.erro)}</em></div>`
    : modo4Cota
      ? `<table>
<tr><th style="width:30%">Cota sugerida (m)</th><td class="value">${modo4Cota.cota_m}</td></tr>
<tr><th>Q_adm DQ interpolado (tf)</th><td class="value">${modo4Cota.qDq?.toFixed(2) ?? '—'}</td></tr>
<tr><th>Q_adm AV interpolado (tf)</th><td class="value">${modo4Cota.qAv?.toFixed(2) ?? '—'}</td></tr>
</table>`
      : '<div class="info-box">Nenhuma cota atende ambos os métodos.</div>'
}

<h3>5.2. Memorial cota a cota — Modo 1 (Envoltória inferior)</h3>
${calc ? tabelaMemorialModoComEnvoltoria(calc.modo1.memDq, calc.modo1.memAv, cotaM1?.cota_m) : '<em>Sem dados</em>'}
${calc ? `<h4>Curva de capacidade Q_adm × cota — Modo 1 (Envoltória)</h4>${svgCurvaCapacidade(calc.modo1.memDq, calc.modo1.memAv, estacaAlvo)}` : ''}
`
    : '<h2>5. Cálculo</h2><p><em>Nenhuma estaca cadastrada para cálculo.</em></p>'
}

<h2>6. Conclusões</h2>
<ul>
  ${
    estacaAlvo && cotaM1
      ? `
    <li>Para a estaca <strong>${escHtml(estacaAlvo.nome)}</strong>, recomenda-se cota de ponta em <strong>${cotaM1.cota_m} m</strong> pelo Modo 1 (envoltória inferior). Profundidade: <strong>${(estacaAlvo.cotaArrasamento_m - cotaM1.cota_m).toFixed(2)} m</strong> desde o arrasamento.</li>
    <li>Método limitante: <strong>${cotaM1.regente}</strong>.</li>
    ${temAlvo ? `<li>Carga prevista de ${carga} tf <strong>atendida</strong> por ambos os métodos na cota sugerida.</li>` : ''}
  `
      : estacaAlvo
        ? `<li>Para a estaca <strong>${escHtml(estacaAlvo.nome)}</strong>, <strong>nenhuma cota atende ambos os métodos</strong> para a carga de ${temAlvo ? carga + ' tf' : '(sem alvo)'}. Revisar diâmetro, comprimento ou carga prevista.</li>`
        : '<li>Cadastre uma estaca para receber recomendação técnica.</li>'
  }
  ${(aterroV.estacasComAterroEspesso || []).length > 0 ? `<li>⚠ Atenção: aterro espesso detectado em ${aterroV.estacasComAterroEspesso.map((e) => escHtml(e.nome)).join(', ')}.</li>` : ''}
  ${(aterroV.estacasComCorteElevado || []).length > 0 ? `<li>⚠ Atenção: corte elevado detectado em ${aterroV.estacasComCorteElevado.map((e) => escHtml(e.nome)).join(', ')}.</li>` : ''}
  ${compatV.n_inversoes > 0 ? `<li>⚠ ${compatV.n_inversoes} inversão(ões) de NSPT detectada(s) — revisar perfil compatibilizado.</li>` : ''}
</ul>

<div class="footer">
  GeoSPT — Engine ${payloadJson._engineVersao || '?'} / Schema ${payloadJson._schemaVersao || '?'}<br>
  Exportado em: ${dataExp}<br>
  Hashes de integridade: entrada=${(payloadJson._inputHash || '').slice(0, 8)} · exportação=${(payloadJson._exportHash || '').slice(0, 8)}
</div>

</body></html>`;

  return html;
}
