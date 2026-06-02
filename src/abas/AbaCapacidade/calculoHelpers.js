/* ============================================================================
 * calculoHelpers — funções puras e constantes da Aba 6 (Capacidade de Carga)
 *
 * Reúne os helpers sem JSX usados pelos vários modos de cálculo:
 *   - MODOS_CALCULO, SUBMODOS_PERFIL_MEDIO (constantes de UI)
 *   - classificarDivergencia(qDq, qAv)
 *   - encontrarCotaSugerida(memorial, cargaPrevista_tf)
 *   - encontrarCotaSugeridaConservadora(memDq, memAv, cargaPrevista_tf)  ← Cenário B
 *   - construirOpcoesCalculo(estaca, params)  /  opcoesParaEstaca (alias)
 *   - perfilEnvoltoriaUtil(sondagens)
 *
 * Extraído fielmente das linhas 5962-5973, 6119-6129, 6385-6521, 7375-7388,
 * 7556-7586 do geospt_app.jsx. Mudança: window.GeoSPT → GeoSPT.
 *
 * Mapeamento de flags UI → engine (CRÍTICO — não inventar):
 *   UI                        engine (opcoes)
 *   aplicaFatorRedutorPonta → aplicaRedutorPonta
 *   limitaRpRl              → limitaPontaPorAtrito
 *   tratamentoPonta         → tratamentoPonta (mesmo nome)
 * ============================================================================ */

import { GeoSPT } from '@/engine/geospt-engine';

// ----- Constantes de UI -----
export const MODOS_CALCULO = [
  {
    id: 'envoltoria',
    label: 'Envoltória inferior',
    descricao: 'NSPT mínimo cota a cota (defensivo)',
  },
  {
    id: 'perfil_medio',
    label: 'Perfil médio',
    descricao: 'Média da família predominante',
  },
  {
    id: 'por_furo',
    label: 'Por furo individual',
    descricao: 'Calcula cada furo separadamente',
  },
  {
    id: 'interpolacao',
    label: 'Interpolação por locação',
    descricao: '3 furos mais próximos da estaca',
  },
];

export const SUBMODOS_PERFIL_MEDIO = [
  {
    id: '2.1_predominante',
    label: '2.1 Predominante (bloqueia)',
    hint: 'Heterogêneas exigem decisão',
  },
  {
    id: '2.2_conservador',
    label: '2.2 Conservador (default)',
    hint: 'Menor NSPT entre famílias',
  },
  {
    id: '2.3_dois_paralelos',
    label: '2.3 Perfis paralelos',
    hint: '2-3 ramos por família',
  },
];

// ----- Classificação visual da divergência DQ × AV -----
export function classificarDivergencia(qDq, qAv) {
  if (qDq === null || qDq === undefined || qAv === null || qAv === undefined) {
    return { cor: 'slate', label: '—', pct: null };
  }
  const media = (qDq + qAv) / 2;
  if (media === 0) return { cor: 'slate', label: '—', pct: null };
  const pct = Math.abs(qDq - qAv) / media;
  if (pct < 0.1) return { cor: 'green', label: 'Boa concordância', pct };
  if (pct < 0.3) return { cor: 'amber', label: 'Divergência moderada', pct };
  return { cor: 'red', label: 'Divergência alta — auditar', pct };
}

// ----- Cota sugerida simples (por método) -----
export function encontrarCotaSugerida(memorial, cargaPrevista_tf) {
  if (!memorial || memorial.length === 0) return null;
  if (
    cargaPrevista_tf === null ||
    cargaPrevista_tf === undefined ||
    !Number.isFinite(cargaPrevista_tf) ||
    cargaPrevista_tf <= 0
  ) {
    // Sem alvo: maior Q_adm
    return memorial.reduce(
      (best, m) =>
        (m.Qadm_final_tf ?? -Infinity) > (best.Qadm_final_tf ?? -Infinity)
          ? m
          : best,
      memorial[0]
    );
  }
  const atendentes = memorial.filter(
    (m) => (m.Qadm_final_tf ?? 0) >= cargaPrevista_tf
  );
  if (atendentes.length === 0) {
    return memorial.reduce(
      (best, m) =>
        (m.Qadm_final_tf ?? -Infinity) > (best.Qadm_final_tf ?? -Infinity)
          ? m
          : best,
      memorial[0]
    );
  }
  // Menor profundidade que atende = cota numericamente mais alta
  return atendentes.reduce(
    (best, m) => (m.cotaPonta_m > best.cotaPonta_m ? m : best),
    atendentes[0]
  );
}

// ----- Cota sugerida CONSERVADORA (Cenário B) -----
export function encontrarCotaSugeridaConservadora(memDq, memAv, cargaPrevista_tf) {
  if (!memDq?.length && !memAv?.length) return null;

  // Sem carga prevista (ou 0): referência neutra (mais profunda)
  if (
    cargaPrevista_tf === null ||
    cargaPrevista_tf === undefined ||
    !Number.isFinite(cargaPrevista_tf) ||
    cargaPrevista_tf <= 0
  ) {
    const sugDq = encontrarCotaSugerida(memDq, null);
    const sugAv = encontrarCotaSugerida(memAv, null);
    if (!sugDq)
      return sugAv
        ? {
            cota_m: sugAv.cotaPonta_m,
            regente: 'AV',
            dq: null,
            av: sugAv,
            ambosAtendem: false,
            motivoNaoAmbos: 'sem_dq',
            sem_alvo: true,
          }
        : null;
    if (!sugAv)
      return {
        cota_m: sugDq.cotaPonta_m,
        regente: 'DQ',
        dq: sugDq,
        av: null,
        ambosAtendem: false,
        motivoNaoAmbos: 'sem_av',
        sem_alvo: true,
      };
    const cotaMaisProfunda =
      sugDq.cotaPonta_m < sugAv.cotaPonta_m
        ? sugDq.cotaPonta_m
        : sugAv.cotaPonta_m;
    const regente = sugDq.cotaPonta_m < sugAv.cotaPonta_m ? 'DQ' : 'AV';
    const dqNaCota = memDq.find((m) => m.cotaPonta_m === cotaMaisProfunda) || null;
    const avNaCota = memAv.find((m) => m.cotaPonta_m === cotaMaisProfunda) || null;
    return {
      cota_m: cotaMaisProfunda,
      regente,
      dq: dqNaCota,
      av: avNaCota,
      ambosAtendem: false,
      motivoNaoAmbos: null,
      sem_alvo: true,
    };
  }

  const dqAtendentes = (memDq || []).filter(
    (m) => (m.Qadm_final_tf ?? 0) >= cargaPrevista_tf
  );
  const avAtendentes = (memAv || []).filter(
    (m) => (m.Qadm_final_tf ?? 0) >= cargaPrevista_tf
  );

  const sugDq =
    dqAtendentes.length > 0
      ? dqAtendentes.reduce(
          (best, m) => (m.cotaPonta_m > best.cotaPonta_m ? m : best),
          dqAtendentes[0]
        )
      : null;
  const sugAv =
    avAtendentes.length > 0
      ? avAtendentes.reduce(
          (best, m) => (m.cotaPonta_m > best.cotaPonta_m ? m : best),
          avAtendentes[0]
        )
      : null;

  // ----- CRITÉRIO CANÔNICO: ambos atendem na MESMA cota -----
  // Interseção real: cotas onde DQ E AV atendem simultaneamente.
  // NÃO basta cada método atender em alguma cota — tem que ser a mesma.
  const cotasDqAtende = new Set(dqAtendentes.map((m) => m.cotaPonta_m));
  const cotasAmbosAtendem = avAtendentes
    .filter((m) => cotasDqAtende.has(m.cotaPonta_m))
    .map((m) => m.cotaPonta_m);

  if (cotasAmbosAtendem.length > 0) {
    // Cota mais RASA (numericamente maior) onde AMBOS atendem.
    // Decisão de projeto: a primeira profundidade que satisfaz os dois métodos
    // é a escolha econômica — aprofundar além disso gasta estaca sem ganho real
    // (frequentemente já se atinge o teto estrutural).
    const cotaFinal = Math.max(...cotasAmbosAtendem);
    const dqNaCota =
      (memDq || []).find((m) => m.cotaPonta_m === cotaFinal) || null;
    const avNaCota =
      (memAv || []).find((m) => m.cotaPonta_m === cotaFinal) || null;
    // Regência = método com menor Q_adm na cota (o que "manda" no dimensionamento)
    const regente =
      (dqNaCota?.Qadm_final_tf ?? Infinity) <=
      (avNaCota?.Qadm_final_tf ?? Infinity)
        ? 'DQ'
        : 'AV';
    return {
      cota_m: cotaFinal,
      regente,
      dq: dqNaCota,
      av: avNaCota,
      ambosAtendem: true,
      motivoNaoAmbos: null,
      sem_alvo: false,
      sugDq_individual: sugDq,
      sugAv_individual: sugAv,
    };
  }

  // ----- Nenhuma cota satisfaz AMBOS: NÃO sugerir cota -----
  // (decisão de projeto: o app não inventa cota aceitável)
  return {
    cota_m: null,
    regente: 'NENHUM',
    dq: sugDq, // melhor cota individual de cada método (para diagnóstico)
    av: sugAv,
    ambosAtendem: false,
    motivoNaoAmbos: 'nenhuma_cota_atende_ambos',
    sem_alvo: false,
    sugDq_individual: sugDq,
    sugAv_individual: sugAv,
  };
}

// ----- Opções de cálculo (mapeia flags UI → engine) -----
export function construirOpcoesCalculo(estaca, params) {
  // CP-13a revisado — cota de arrasamento aceita decimal, mas o CÁLCULO sempre
  // usa o inteiro arredondado PARA BAIXO (Math.floor). Conservador: atrito em
  // cota ligeiramente mais profunda, a favor da segurança. A engine permanece
  // inalterada (recebe inteiro). O valor decimal original fica na estaca para
  // o desenho do corte esquemático (CP-13d).
  const cotaArrasamentoInteira =
    estaca.cotaArrasamento_m == null
      ? estaca.cotaArrasamento_m
      : Math.floor(estaca.cotaArrasamento_m);
  return {
    tipoEstaca: estaca.tipoEstaca,
    diametro_m: estaca.diametro_m,
    cotaArrasamento_m: cotaArrasamentoInteira,
    desprezaUltimoMetroAtrito: params.desprezaUltimoMetroAtrito ?? true,
    aplicaRedutorPonta: params.aplicaFatorRedutorPonta ?? false,
    limitaPontaPorAtrito: params.limitaRpRl ?? false,
    tratamentoPonta: params.tratamentoPonta ?? 'calculado',
    coeficientesCustomizados: params.coeficientesCustomizados || null,
    // Override de carga estrutural por estaca (null = usa tabela da engine)
    cargaEstrutural_tf_override: estaca.cargaEstrutural_tf_custom ?? null,
  };
}

// Alias histórico (usado por modos por_furo / comparativo no CP-9c)
export const opcoesParaEstaca = construirOpcoesCalculo;

// ----- Perfil da envoltória (helper para por_furo / comparativo) -----
export function perfilEnvoltoriaUtil(sondagens) {
  if (!GeoSPT?.engine) return null;
  const compat = GeoSPT.engine.compatibilizar(sondagens, {});
  return {
    compat,
    perfil: compat.resultados
      .filter((r) => r.envoltoria.nspt !== null)
      .map((r) => ({
        cota_m: r.cotaRef_m,
        nspt: r.envoltoria.nspt,
        nspt_real: r.envoltoria.nspt_real,
        impenetravel: r.envoltoria.impenetravel,
        solo: r.envoltoria.solo,
        familia: r.envoltoria.familia,
      })),
  };
}
