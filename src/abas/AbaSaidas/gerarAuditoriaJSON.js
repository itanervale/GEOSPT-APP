/* ============================================================================
 * gerarAuditoriaJSON — JSON de auditoria (registro datado dos RESULTADOS)
 *
 * Diferente do JSON de obra (entrada, reabertura), este arquivo congela os
 * resultados calculados no momento da exportação: para cada estaca, os 4 modos
 * com a cota sugerida (critério canônico: mais rasa onde DQ e AV atendem) e o
 * comparativo entre modos. Serve para perícia/registro, NÃO para reabertura.
 *
 * Decisão de arquitetura (usuário): dois arquivos separados — obra (entrada)
 * permanece enxuta; auditoria (resultados) é um segundo arquivo.
 * ============================================================================ */

import { GeoSPT } from '@/engine/geospt-engine';
import { prepararPerfilCalculo } from '@/abas/AbaCapacidade/prepararPerfilCalculo';
import {
  construirOpcoesCalculo,
  encontrarCotaSugeridaConservadora,
} from '@/abas/AbaCapacidade/calculoHelpers';
import { resolverFurosParaCalculo } from '@/state/dominiosHelper';
import { avaliarAlertaA6, avaliarAlertaA11, cargaEstruturalEfetiva, geometriaEstaca } from '@/domain/estacas';

// Resultado de 1 modo "de perfil único" (envoltória / perfil médio):
// calcula DQ+AV no perfil e extrai a cota sugerida canônica.
function resumoPerfilUnico(perfil, opcoes, carga) {
  const engine = GeoSPT.engine;
  const dq = engine.calcularDQ(perfil, opcoes);
  const av = engine.calcularAV(perfil, opcoes);
  const sug = encontrarCotaSugeridaConservadora(dq.memorial, av.memorial, carga);
  let dqNa = null,
    avNa = null;
  if (sug && sug.cota_m != null) {
    dqNa = dq.memorial.find((m) => m.cotaPonta_m === sug.cota_m) || null;
    avNa = av.memorial.find((m) => m.cotaPonta_m === sug.cota_m) || null;
  }
  return {
    cotaSugerida_m: sug?.cota_m ?? null,
    ambosAtendem: sug?.ambosAtendem ?? false,
    regente: sug?.regente ?? 'NENHUM',
    motivoNaoAmbos: sug?.motivoNaoAmbos ?? null,
    Qadm_DQ_tf: dqNa?.Qadm_final_tf ?? null,
    Qadm_AV_tf: avNa?.Qadm_final_tf ?? null,
    piorCaso_tf:
      dqNa && avNa
        ? Math.min(dqNa.Qadm_final_tf, avNa.Qadm_final_tf)
        : null,
    n_cotas_memorial: dq.memorial.length,
  };
}

// Calcula os modos para uma estaca, retornando o bloco modosCalculados.
// CP-12c — recebe obra para resolver o filtro de domínio da estaca.
function calcularModosDaEstaca(estaca, sondagens, params, obra) {
  const opcoes = construirOpcoesCalculo(estaca, params);
  const carga = estaca.cargaPrevista_tf;
  const modos = {};

  // CP-12c — furos do domínio da estaca (ou todos, se sem domínio).
  const filtro = obra
    ? resolverFurosParaCalculo(estaca, obra)
    : {
        sondagens,
        temFiltro: false,
        modo4Disponivel: true,
        nFuros: Object.keys(sondagens || {}).length,
        dominio: null,
      };
  const sondagensCalc = filtro.sondagens;

  // Modo 1 — Envoltória
  try {
    const r = prepararPerfilCalculo({
      modo: 'envoltoria',
      submodo: null,
      sondagens: sondagensCalc,
      estaca,
      params,
      filtroDominio: filtro,
    });
    modos.envoltoria =
      r.erro || !r.perfilParaCalculo
        ? { erro: r.erro || 'sem perfil' }
        : resumoPerfilUnico(r.perfilParaCalculo, opcoes, carga);
  } catch (e) {
    modos.envoltoria = { erro: e.message };
  }

  // Modo 2 — Perfil médio 2.2 conservador
  try {
    const r = prepararPerfilCalculo({
      modo: 'perfil_medio',
      submodo: '2.2_conservador',
      sondagens: sondagensCalc,
      estaca,
      params,
      filtroDominio: filtro,
    });
    modos.perfil_medio_2_2 =
      r.erro || !r.perfilParaCalculo
        ? { erro: r.erro || 'sem perfil' }
        : resumoPerfilUnico(r.perfilParaCalculo, opcoes, carga);
  } catch (e) {
    modos.perfil_medio_2_2 = { erro: e.message };
  }

  // Modo 3 — Por furo (critério canônico, pior caso = furo crítico)
  try {
    const r = prepararPerfilCalculo({
      modo: 'por_furo',
      submodo: null,
      sondagens: sondagensCalc,
      estaca,
      params,
      filtroDominio: filtro,
    });
    if (r.erro || !r.porFuro?.resultados) {
      modos.por_furo = { erro: r.erro || 'sem resultados' };
    } else {
      const furos = r.porFuro.resultados.map((f) => {
        if (f.erro) return { furo: f.furo, erro: f.erro };
        const sug = encontrarCotaSugeridaConservadora(
          f.dq?.memorial || [],
          f.av?.memorial || [],
          carga
        );
        let qDq = null,
          qAv = null;
        if (sug && sug.cota_m != null) {
          qDq =
            (f.dq?.memorial || []).find((m) => m.cotaPonta_m === sug.cota_m)
              ?.Qadm_final_tf ?? null;
          qAv =
            (f.av?.memorial || []).find((m) => m.cotaPonta_m === sug.cota_m)
              ?.Qadm_final_tf ?? null;
        }
        return {
          furo: f.furo,
          cotaSugerida_m: sug?.cota_m ?? null,
          ambosAtendem: sug?.ambosAtendem ?? false,
          regente: sug?.regente ?? 'NENHUM',
          Qadm_DQ_tf: qDq,
          Qadm_AV_tf: qAv,
          piorCaso_tf: qDq != null && qAv != null ? Math.min(qDq, qAv) : null,
        };
      });
      // Furo crítico = menor pior caso entre os que têm cota
      let critico = null,
        piorMin = Infinity;
      furos.forEach((f) => {
        if (f.piorCaso_tf != null && f.piorCaso_tf < piorMin) {
          piorMin = f.piorCaso_tf;
          critico = f.furo;
        }
      });
      modos.por_furo = {
        furoCritico: critico,
        piorCaso_tf: critico ? piorMin : null,
        furos,
      };
    }
  } catch (e) {
    modos.por_furo = { erro: e.message };
  }

  // Modo 4 — Interpolação (cota mais rasa onde ambos atendem)
  try {
    const r = prepararPerfilCalculo({
      modo: 'interpolacao',
      submodo: null,
      sondagens: sondagensCalc,
      estaca,
      params,
      filtroDominio: filtro,
    });
    if (r.erro || !r.interpolacao?.curva) {
      modos.interpolacao = { erro: r.erro || 'sem curva' };
    } else {
      const curva = r.interpolacao.curva;
      let sug = null;
      if (carga != null && carga > 0) {
        const ambos = curva.filter(
          (c) => (c.Qadm_DQ_tf ?? 0) >= carga && (c.Qadm_AV_tf ?? 0) >= carga
        );
        if (ambos.length > 0)
          sug = ambos.reduce((b, c) =>
            c.cotaPonta_m > b.cotaPonta_m ? c : b
          );
      }
      modos.interpolacao = {
        cotaSugerida_m: sug?.cotaPonta_m ?? null,
        nenhumaAtendeAmbos: carga > 0 && !sug,
        Qadm_DQ_tf: sug?.Qadm_DQ_tf ?? null,
        Qadm_AV_tf: sug?.Qadm_AV_tf ?? null,
        piorCaso_tf: sug
          ? Math.min(sug.Qadm_DQ_tf ?? Infinity, sug.Qadm_AV_tf ?? Infinity)
          : null,
        metadata: r.interpolacao.metadata,
      };
    }
  } catch (e) {
    modos.interpolacao = { erro: e.message };
  }

  return modos;
}

// Monta o comparativo entre modos (pior caso por modo + mais conservador).
function montarComparativo(modos) {
  const piorPorModo = {
    envoltoria: modos.envoltoria?.piorCaso_tf ?? null,
    perfil_medio_2_2: modos.perfil_medio_2_2?.piorCaso_tf ?? null,
    por_furo: modos.por_furo?.piorCaso_tf ?? null,
    interpolacao: modos.interpolacao?.piorCaso_tf ?? null,
  };
  const validos = Object.entries(piorPorModo).filter(([, v]) => v != null);
  let maisConservador = null,
    qMin = Infinity;
  validos.forEach(([id, v]) => {
    if (v < qMin) {
      qMin = v;
      maisConservador = id;
    }
  });
  const valores = validos.map(([, v]) => v);
  const qMax = valores.length ? Math.max(...valores) : null;
  const dispersao_pct =
    qMax && qMin && qMax > 0 ? ((qMax - qMin) / qMax) * 100 : null;
  return {
    piorCasoPorModo_tf: piorPorModo,
    modoMaisConservador: maisConservador,
    piorCasoGlobal_tf: maisConservador ? qMin : null,
    dispersao_pct,
  };
}

/**
 * Gera o objeto JSON de auditoria (resultados calculados).
 * @param {object} obra - obra atual (estado.obra)
 * @param {object} payloadObra - payload de exportarObra() (para hashes/versões)
 */
export function gerarAuditoriaJSON(obra, payloadObra) {
  const sondagens = obra.sondagens || {};
  const estacas = obra.estacas || [];
  const params = obra.parametros || {};

  const estacasAuditadas = estacas.map((estaca) => {
    const modosCalculados = calcularModosDaEstaca(estaca, sondagens, params, obra);
    const comparativoEntreModos = montarComparativo(modosCalculados);
    return {
      nome: estaca.nome,
      tipoEstaca: estaca.tipoEstaca,
      // CP-14 — formato da seção e dimensão livre; diametro_m mantido como
      // espelho retrocompatível (= dimensao_m).
      formato: estaca.formato === 'quadrada' ? 'quadrada' : 'circular',
      dimensao_m: estaca.dimensao_m ?? estaca.diametro_m ?? null,
      diametro_m: estaca.diametro_m,
      // CP-14f — geometria efetivamente usada no cálculo (Ap e U)
      geometriaSecao: geometriaEstaca(
        estaca.formato === 'quadrada' ? 'quadrada' : 'circular',
        estaca.dimensao_m ?? estaca.diametro_m
      ),
      // Alerta A6 (dimensão fora da faixa usual 15–120 cm). Informativo:
      // nunca bloqueia o cálculo de capacidade.
      alertaA6: avaliarAlertaA6(estaca),
      // CP-16 — Alerta A11 (carga estrutural acima da norma σₑ×A) + hierarquia
      // da carga estrutural admissível efetiva (override → catálogo → norma).
      alertaA11: avaliarAlertaA11(estaca, params.coeficientesCustomizados),
      cargaEstruturalAdmissivel: (() => {
        const info = cargaEstruturalEfetiva(estaca, params.coeficientesCustomizados);
        return {
          valor_tf: info.valor,
          origem: info.origem, // 'override' | 'catalogo' | 'norma' | null
          catalogo_tf: info.catalogo,
          norma_tf: info.norma,
          sigma_e_MPa: info.sigma_MPa,
        };
      })(),
      cotaArrasamento_m: estaca.cotaArrasamento_m,
      cargaPrevista_tf: estaca.cargaPrevista_tf,
      cargaEstrutural_tf_custom: estaca.cargaEstrutural_tf_custom ?? null,
      modosCalculados,
      comparativoEntreModos,
    };
  });

  return {
    _schema: 'geospt-auditoria',
    _schemaVersao: '1.0.0',
    _engineVersao: GeoSPT.versao,
    _geradoEm: new Date().toISOString(),
    _criterioCotaSugerida:
      'Cota mais rasa onde DQ e AV atendem simultaneamente a carga prevista (Cenário canônico). Se nenhuma cota atende ambos, cotaSugerida_m = null.',
    obra: {
      nome: obra.identificacao?.nome ?? '—',
      localizacao: obra.identificacao?.localizacao ?? '—',
    },
    referenciaEntrada: {
      inputHash: payloadObra?._inputHash ?? null,
      exportHash: payloadObra?._exportHash ?? null,
      schemaObra: payloadObra?._schemaVersao ?? null,
    },
    estacas: estacasAuditadas,
  };
}
