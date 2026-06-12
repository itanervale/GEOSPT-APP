/* ============================================================================
 * gerarWorkbookXLSX — gera o workbook XLSX (memorial de capacidade de carga)
 *
 * Abas: Identificação, Sondagens, Estacas, Compatibilização, Memorial por modo
 * (1 Envoltória, 2 Perfil Médio, 3 Por Furo, 4 Interpolação) da estaca alvo,
 * e Auditoria.
 *
 * Portado das linhas 7591-7888 do geospt_app.jsx. Mudanças:
 *   - window.GeoSPT → import { GeoSPT }
 *   - XLSX recebido por parâmetro (import no chamador via npm, não CDN)
 *   - Modo 3: usa encontrarCotaSugeridaConservadora (critério canônico: cota
 *     mais rasa onde AMBOS atendem) em vez da lógica antiga "só DQ/só AV".
 * ============================================================================ */

import { GeoSPT } from '@/engine/geospt-engine';
import { geometriaEstaca } from '@/domain/estacas';
import {
  perfilEnvoltoriaUtil,
  opcoesParaEstaca,
  encontrarCotaSugeridaConservadora,
} from '@/abas/AbaCapacidade/calculoHelpers';

export function gerarWorkbookXLSX(XLSX, obra, payloadJson) {
  const engine = GeoSPT?.engine;
  if (!engine) throw new Error('Engine GeoSPT indisponível');

  const wb = XLSX.utils.book_new();
  const sondagens = obra.sondagens || {};
  const estacas = obra.estacas || [];
  const params = obra.parametros || {};
  const ident = obra.identificacao || {};

  // Sanitização contra injeção de fórmula (CSV/Excel formula injection — OWASP).
  // Qualquer célula de TEXTO que comece com = + - @ (ou tab/CR) é interpretada
  // como fórmula pelo Excel/LibreOffice. Prefixamos com apóstrofo para forçar
  // texto literal. Não afeta números (só strings).
  function sanitizarCelula(v) {
    if (typeof v !== 'string' || v.length === 0) return v;
    if (/^[=+\-@\t\r]/.test(v)) return "'" + v;
    return v;
  }

  // Helper: cria planilha com larguras automáticas + freeze do cabeçalho
  function criarSheet(rows, opcoes) {
    opcoes = opcoes || {};
    const rowsSan = rows.map((r) =>
      Array.isArray(r) ? r.map(sanitizarCelula) : r
    );
    const ws = XLSX.utils.aoa_to_sheet(rowsSan);
    const nCols = Math.max(...rowsSan.map((r) => r.length || 0));
    const cols = [];
    for (let c = 0; c < nCols; c++) {
      let max = 8;
      for (let r = 0; r < rowsSan.length; r++) {
        const v = rowsSan[r][c];
        if (v == null) continue;
        const len = String(v).length;
        if (len > max) max = len;
      }
      cols.push({ wch: Math.min(Math.max(max + 2, 10), 50) });
    }
    ws['!cols'] = cols;
    if (rowsSan.length >= 3 && opcoes.freezeHeader !== false) {
      ws['!freeze'] = { xSplit: 0, ySplit: opcoes.headerRow ?? 1 };
    }
    return ws;
  }

  // ===== Aba: Identificação =====
  const abaIdent = [
    ['GeoSPT — Memorial de Capacidade de Carga'],
    [''],
    ['Obra:', ident.nome || '—'],
    ['Município:', ident.localizacao || '—'],
    ['Data:', ident.dataCadastro || '—'],
    ['Responsável técnico:', ident.responsavelTecnico || '—'],
    ['Observações:', ident.observacoes || '—'],
    [''],
    ['Versão do schema:', payloadJson._schemaVersao || '?'],
    ['Versão da engine:', payloadJson._engineVersao || '?'],
    ['Exportado em:', payloadJson._exportadoEm || '?'],
    ['Hash de entrada:', (payloadJson._inputHash || '').slice(0, 16) + '...'],
    ['Hash de exportação:', (payloadJson._exportHash || '').slice(0, 16) + '...'],
  ];
  XLSX.utils.book_append_sheet(wb, criarSheet(abaIdent), 'Identificação');

  // ===== Aba: Sondagens =====
  const sondRows = [
    [
      'Furo',
      'Cota topo (m)',
      'Prof. final (m)',
      'NA inicial (m)',
      'NA final (m)',
      'Critério paralisação',
      'Coord X',
      'Coord Y',
      'Domínio',
    ],
  ];
  Object.entries(sondagens).forEach(([nome, s]) => {
    sondRows.push([
      nome,
      s.cotaTopo_m ?? '',
      s.profundidadeFinal_m ?? '',
      s.naInicial_m ?? '',
      s.naFinal_m ?? '',
      s.criterioParalisacao ?? '',
      s.coordenadas?.x ?? '',
      s.coordenadas?.y ?? '',
      s.dominioGeotecnico ?? '',
    ]);
  });
  sondRows.push([]);
  sondRows.push(['Leituras SPT — todos os furos']);
  sondRows.push([
    'Furo',
    'Profundidade (m)',
    'Cota absoluta (m)',
    'NSPT real',
    'NSPT cálculo',
    'Impenetrável',
    'Solo',
    'Família',
  ]);
  Object.entries(sondagens).forEach(([nome, s]) => {
    const cotaTopo = s.cotaTopo_m;
    (s.leituras || []).forEach((L) => {
      sondRows.push([
        nome,
        L.profundidade_m ?? '',
        Number.isFinite(cotaTopo) && Number.isFinite(L.profundidade_m)
          ? (cotaTopo - L.profundidade_m).toFixed(3)
          : '',
        L.nspt_real ?? '',
        L.nspt_calculo ?? '',
        L.impenetravel ? 'sim' : 'não',
        L.solo ?? '',
        L.familia ?? '',
      ]);
    });
  });
  XLSX.utils.book_append_sheet(wb, criarSheet(sondRows), 'Sondagens');

  // ===== Aba: Estacas =====
  const estRows = [
    [
      'Nome',
      'Tipo',
      'Formato',
      'Dimensão (m) — Ø ou lado',
      'Cota arrasamento (m)',
      'Carga prevista (tf)',
      'Cap. estrutural custom (tf)',
      'Coord X',
      'Coord Y',
      'Domínio',
    ],
  ];
  estacas.forEach((e) => {
    estRows.push([
      e.nome,
      e.tipoEstaca ?? '',
      e.formato === 'quadrada' ? 'quadrada' : 'circular',
      (e.dimensao_m ?? e.diametro_m) ?? '',
      e.cotaArrasamento_m ?? '',
      e.cargaPrevista_tf ?? '',
      e.cargaEstrutural_tf_custom ?? '(tabela)',
      e.coordenadas?.x ?? '',
      e.coordenadas?.y ?? '',
      e.dominioGeotecnico ?? '',
    ]);
  });
  XLSX.utils.book_append_sheet(wb, criarSheet(estRows), 'Estacas');

  // ===== Aba: Compatibilização =====
  const env = perfilEnvoltoriaUtil(sondagens);
  if (env) {
    const compatRows = [
      [
        'Cota (m)',
        'NSPT envoltória',
        'NSPT real',
        'Impenetrável',
        'Solo',
        'Família',
        '# furos',
        'Heterogêneo',
        'Subamostrado',
      ],
    ];
    env.compat.resultados.forEach((r) => {
      compatRows.push([
        r.cotaRef_m,
        r.envoltoria.nspt ?? '',
        r.envoltoria.nspt_real ?? '',
        r.envoltoria.impenetravel ? 'sim' : 'não',
        r.envoltoria.solo ?? '',
        r.envoltoria.familia ?? '',
        r.metricas?.n_furos_amostrados ?? '',
        r.metricas?.heterogeneo ? 'sim' : 'não',
        r.metricas?.subamostrado ? 'sim' : 'não',
      ]);
    });
    XLSX.utils.book_append_sheet(
      wb,
      criarSheet(compatRows),
      'Compatibilização'
    );
  }

  // ===== Abas: Memorial por modo (estaca alvo) =====
  const estacaAlvo =
    estacas.find((e) => e.nome === payloadJson.ui?.estacaSelecionada) ||
    estacas[0];
  if (estacaAlvo && env) {
    const opc = opcoesParaEstaca(estacaAlvo, params);

    // Modo 1: Envoltória
    try {
      const dq = engine.calcularDQ(env.perfil, opc);
      const av = engine.calcularAV(env.perfil, opc);
      const rows = [
        ['Memorial — Modo 1: Envoltória inferior — Estaca ' + estacaAlvo.nome],
        [
          'Tipo: ' +
            estacaAlvo.tipoEstaca +
            (estacaAlvo.formato === 'quadrada' ? ' (quadrada) | L=' : ' | D=') +
            (estacaAlvo.dimensao_m ?? estacaAlvo.diametro_m) +
            'm' +
            (() => {
              const g = geometriaEstaca(
                estacaAlvo.formato === 'quadrada' ? 'quadrada' : 'circular',
                estacaAlvo.dimensao_m ?? estacaAlvo.diametro_m
              );
              return g
                ? ' | Ap=' + g.area_ponta_m2.toFixed(4) + 'm² | U=' + g.perimetro_m.toFixed(4) + 'm'
                : '';
            })() +
            ' | arrasamento=' +
            estacaAlvo.cotaArrasamento_m +
            'm | carga prev=' +
            (estacaAlvo.cargaPrevista_tf || '—') +
            ' tf',
        ],
        [],
        [
          'Cota ponta (m)',
          'Prof. (m)',
          'DQ R_l (kN)',
          'DQ R_p (kN)',
          'DQ Q_adm geo (tf)',
          'DQ Q_adm final (tf)',
          'DQ rege',
          'AV R_l (kN)',
          'AV R_p (kN)',
          'AV Q_adm geo (tf)',
          'AV Q_adm final (tf)',
          'AV rege',
        ],
      ];
      const avMap = {};
      (av.memorial || []).forEach((m) => {
        avMap[m.cotaPonta_m] = m;
      });
      (dq.memorial || []).forEach((d) => {
        const a = avMap[d.cotaPonta_m];
        rows.push([
          d.cotaPonta_m,
          d.profDesdeArrasamento_m,
          d.Ql_total_kN?.toFixed(2),
          d.Rp_final_kN?.toFixed(2),
          d.Qadm_geo_tf?.toFixed(2),
          d.Qadm_final_tf?.toFixed(2),
          d.rege || '',
          a?.Ql_total_kN?.toFixed(2) ?? '',
          a?.Rp_final_kN?.toFixed(2) ?? '',
          a?.Qadm_geo_tf?.toFixed(2) ?? '',
          a?.Qadm_final_tf?.toFixed(2) ?? '',
          a?.rege || '',
        ]);
      });
      XLSX.utils.book_append_sheet(wb, criarSheet(rows), 'Modo 1 - Envoltória');
    } catch (e) {
      /* silencioso */
    }

    // Modo 2.1: Predominante
    try {
      const r21 = engine.montarPerfilMedio(env.compat, '2.1_predominante');
      if (r21.perfil && !r21.bloqueado) {
        const dq = engine.calcularDQ(r21.perfil, opc);
        const av = engine.calcularAV(r21.perfil, opc);
        const rows = [
          [
            'Memorial — Modo 2.1: Perfil médio (predominante) — Estaca ' +
              estacaAlvo.nome,
          ],
          [],
          ['Cota ponta (m)', 'Prof. (m)', 'DQ Q_adm (tf)', 'AV Q_adm (tf)'],
        ];
        const avMap = {};
        (av.memorial || []).forEach((m) => {
          avMap[m.cotaPonta_m] = m;
        });
        (dq.memorial || []).forEach((d) => {
          rows.push([
            d.cotaPonta_m,
            d.profDesdeArrasamento_m,
            d.Qadm_final_tf?.toFixed(2),
            avMap[d.cotaPonta_m]?.Qadm_final_tf?.toFixed(2) ?? '',
          ]);
        });
        XLSX.utils.book_append_sheet(
          wb,
          criarSheet(rows),
          'Modo 2 - Perfil Médio'
        );
      }
    } catch (e) {
      /* silencioso */
    }

    // Modo 3: Por furo individual — critério canônico (ambos atendem, mais rasa)
    try {
      const m3 = engine.calcularPorFuroIndividual(sondagens, estacaAlvo, {});
      const carga = estacaAlvo.cargaPrevista_tf;
      const rows = [
        ['Memorial — Modo 3: Por furo individual — Estaca ' + estacaAlvo.nome],
        [
          'Sugestão por furo: cota mais RASA onde DQ e AV atendem simultaneamente. Se nenhuma atende ambos, não há cota sugerida.',
        ],
        [],
        [
          'Furo',
          'Cota sugerida (m)',
          'Limitante',
          'DQ Q_adm (tf)',
          'AV Q_adm (tf)',
          'Atende ambos?',
          'Aterro espesso',
          'Corte elevado',
          'Erro',
        ],
      ];
      m3.resultados.forEach((f) => {
        if (f.erro) {
          rows.push([f.furo, '', '', '', '', '', '', '', f.erro]);
          return;
        }
        const memDq = f.dq?.memorial || [];
        const memAv = f.av?.memorial || [];
        const sug = encontrarCotaSugeridaConservadora(memDq, memAv, carga);
        if (sug && sug.cota_m != null) {
          const dqNa = memDq.find((m) => m.cotaPonta_m === sug.cota_m);
          const avNa = memAv.find((m) => m.cotaPonta_m === sug.cota_m);
          rows.push([
            f.furo,
            sug.cota_m,
            sug.regente,
            dqNa?.Qadm_final_tf?.toFixed(2) ?? '',
            avNa?.Qadm_final_tf?.toFixed(2) ?? '',
            sug.ambosAtendem ? '✓ ambos' : '—',
            f.alertaAterroEspesso ? 'sim' : '',
            f.alertaCorteElevado ? 'sim' : '',
            '',
          ]);
        } else {
          rows.push([
            f.furo,
            '(nenhuma)',
            '—',
            '',
            '',
            '⛔ nenhuma cota atende ambos',
            f.alertaAterroEspesso ? 'sim' : '',
            f.alertaCorteElevado ? 'sim' : '',
            '',
          ]);
        }
      });
      XLSX.utils.book_append_sheet(wb, criarSheet(rows), 'Modo 3 - Por Furo');
    } catch (e) {
      /* silencioso */
    }

    // Modo 4: Interpolação (precisa de coordenadas)
    try {
      if (
        estacaAlvo.coordenadas?.x != null &&
        estacaAlvo.coordenadas?.y != null
      ) {
        const sondagensConv = {};
        let temTodasCoords = true;
        Object.entries(sondagens).forEach(([n, s]) => {
          if (s.coordenadas?.x == null || s.coordenadas?.y == null)
            temTodasCoords = false;
          sondagensConv[n] = { ...s, x: s.coordenadas?.x, y: s.coordenadas?.y };
        });
        const estacaConv = {
          ...estacaAlvo,
          x: estacaAlvo.coordenadas.x,
          y: estacaAlvo.coordenadas.y,
        };
        if (temTodasCoords) {
          const m4 = engine.calcularPorInterpolacao(
            sondagensConv,
            estacaConv,
            opc
          );
          if (m4 && !m4.metadata?.erro && m4.memorial?.length > 0) {
            const rows = [
              [
                'Memorial — Modo 4: Interpolação por locação — Estaca ' +
                  estacaAlvo.nome,
              ],
              [
                'Estaca em (x=' +
                  estacaConv.x +
                  ', y=' +
                  estacaConv.y +
                  ') · raio mín. = ' +
                  (m4.metadata?.raioMinimoUsado_m ?? '0.5') +
                  ' m',
              ],
              [],
              [
                'Cota ponta (m)',
                'DQ Q_adm interp. (tf)',
                'AV Q_adm interp. (tf)',
                'Método DQ',
                '# furos disp. DQ',
              ],
            ];
            m4.memorial.forEach((m) => {
              rows.push([
                m.cotaPonta_m,
                m.dq?.Qadm_interpolado_tf?.toFixed(2) ?? '',
                m.av?.Qadm_interpolado_tf?.toFixed(2) ?? '',
                m.dq?.metodo ?? '',
                m.dq?.n_furos_disponiveis ?? '',
              ]);
            });
            XLSX.utils.book_append_sheet(
              wb,
              criarSheet(rows),
              'Modo 4 - Interpolação'
            );
          }
        }
      }
    } catch (e) {
      /* silencioso */
    }
  }

  // ===== Aba: Auditoria =====
  const audRows = [
    ['Auditoria — registro de exportação'],
    [],
    ['Item', 'Valor'],
    ['Schema', payloadJson._schemaVersao || ''],
    ['Engine', payloadJson._engineVersao || ''],
    ['Exportado em', payloadJson._exportadoEm || ''],
    ['Hash entrada', payloadJson._inputHash || ''],
    ['Hash exportação', payloadJson._exportHash || ''],
    [],
    ['Estaca selecionada (UI)', payloadJson.ui?.estacaSelecionada || '—'],
    ['Modo de cálculo (UI)', payloadJson.ui?.modoCalculoSelecionado || '—'],
    ['Submodo Perfil Médio', payloadJson.ui?.submodoPerfilMedio || '—'],
    [],
    [
      'Compatibilização — cotas processadas',
      payloadJson._validacao?.compatibilizacao?.cotasProcessadas ?? '',
    ],
    [
      'Furo crítico',
      payloadJson._validacao?.compatibilizacao?.furoCritico ?? '—',
    ],
    [
      '# cotas heterogêneas',
      (payloadJson._validacao?.compatibilizacao?.cotasHeterogeneas_m || [])
        .length,
    ],
    [
      '# inversões NSPT',
      payloadJson._validacao?.compatibilizacao?.n_inversoes ?? 0,
    ],
    [],
    [
      'Aterro/corte — média dos topos (m)',
      payloadJson._validacao?.aterroCorte?.mediaTopos_m?.toFixed(2) ?? '—',
    ],
    [
      'Estacas com aterro espesso',
      (payloadJson._validacao?.aterroCorte?.estacasComAterroEspesso || [])
        .map((e) => e.nome)
        .join(', ') || '—',
    ],
    [
      'Estacas com corte elevado',
      (payloadJson._validacao?.aterroCorte?.estacasComCorteElevado || [])
        .map((e) => e.nome)
        .join(', ') || '—',
    ],
  ];
  XLSX.utils.book_append_sheet(wb, criarSheet(audRows), 'Auditoria');

  return wb;
}
