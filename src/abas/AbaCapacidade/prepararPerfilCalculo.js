/* ============================================================================
 * prepararPerfilCalculo — abstração única consumida por TODOS os modos
 *
 * Recebe { modo, submodo, sondagens, estaca, params } e devolve formato
 * uniforme: { modo, submodo, descricaoModo, perfilParaCalculo, avisos,
 *             compatibilizacao, ramos, ... } ou { erro }.
 *
 * Os 4 modos:
 *   - envoltoria  → compatibiliza e extrai NSPT mínimo cota a cota
 *   - perfil_medio (2.1 / 2.2 / 2.3) → engine.montarPerfilMedio
 *   - por_furo    → engine.calcularPorFuroIndividual
 *   - interpolacao → engine.calcularPorInterpolacao (precisa de coordenadas)
 *
 * O LEIA_ME exige esta função única ANTES da Aba 6. No CP-9a, apenas o modo
 * 'envoltoria' (e 'perfil_medio' 2.1/2.2) é renderizado; os demais retornam
 * dados que serão consumidos pelos componentes do CP-9c.
 *
 * Extraído fielmente das linhas 5980-6114 do geospt_app.jsx. Mudança:
 *   window.GeoSPT → GeoSPT (import explícito).
 * ============================================================================ */

import { GeoSPT } from '@/engine/geospt-engine';
import { construirOpcoesCalculo } from './calculoHelpers';

export function prepararPerfilCalculo({ modo, submodo, sondagens, estaca, params, filtroDominio }) {
  if (!GeoSPT) {
    return { erro: 'Engine GeoSPT não carregada' };
  }
  const engine = GeoSPT.engine;
  const janela = params.janelaCompatibilizacao_m || 0.5;

  // CP-12c — bloqueio do Modo 4 quando domínio tem < 3 furos (SPEC decisão E).
  // filtroDominio (opcional): { temFiltro, dominio, nFuros, modo4Disponivel }.
  if (
    modo === 'interpolacao' &&
    filtroDominio &&
    filtroDominio.temFiltro &&
    !filtroDominio.modo4Disponivel
  ) {
    return {
      erro:
        'Domínio "' +
        (filtroDominio.dominio?.nome || '?') +
        '" tem menos de 3 furos (' +
        filtroDominio.nFuros +
        ') — Modo 4 (interpolação) indisponível. Use outro modo ou adicione furos ao domínio.',
    };
  }

  // CP-13a revisado — cota de arrasamento aceita decimal, mas o CÁLCULO sempre
  // usa Math.floor (conservador). Os modos por_furo e interpolacao leem
  // estaca.cotaArrasamento_m DIRETO (a engine não passa por construirOpcoesCalculo
  // para esse campo), então normalizamos a estaca aqui, na borda, antes de
  // entregá-la à engine. Engine permanece inalterada.
  const estacaCalc =
    estaca && estaca.cotaArrasamento_m != null
      ? { ...estaca, cotaArrasamento_m: Math.floor(estaca.cotaArrasamento_m) }
      : estaca;

  try {
    if (modo === 'envoltoria') {
      const compat = engine.compatibilizar(sondagens, { janela_m: janela });
      const perfil = compat.resultados
        .filter((r) => r.envoltoria.nspt !== null && r.envoltoria.nspt !== undefined)
        .map((r) => ({
          cota_m: r.cotaRef_m,
          nspt: r.envoltoria.nspt,
          nspt_real: r.envoltoria.nspt_real,
          impenetravel: r.envoltoria.impenetravel,
          solo: r.envoltoria.solo,
          familia: r.envoltoria.familia,
          origemFuro: r.envoltoria.furo,
        }));
      return {
        modo,
        submodo: null,
        descricaoModo: 'Envoltória inferior — NSPT mínimo cota a cota',
        perfilParaCalculo: perfil,
        avisos: [],
        compatibilizacao: compat,
        ramos: null,
      };
    }

    if (modo === 'perfil_medio') {
      const compat = engine.compatibilizar(sondagens, { janela_m: janela });
      const r = engine.montarPerfilMedio(compat, submodo);
      if (r.erro) return { erro: r.erro };

      if (submodo === '2.3_dois_paralelos') {
        // v2.0.5: avisos é array. Fallback p/ JSON antigo (v2.0.4) objeto → array.
        let avisosNorm = [];
        if (Array.isArray(r.avisos)) {
          avisosNorm = r.avisos;
        } else if (r.avisos && typeof r.avisos === 'object') {
          ['Coesivo', 'Granular', 'Intermediario'].forEach((ramo) => {
            const key = 'camadasSemDado' + ramo + '_m';
            const cotas = r.avisos[key] || [];
            cotas.forEach((cota) => {
              avisosNorm.push({
                cota_m: cota,
                tipo: 'camada_sem_dado',
                ramo: ramo === 'Intermediario' ? 'Intermediário' : ramo,
                justificativa:
                  'Cota não tem furo da família ' +
                  (ramo === 'Intermediario' ? 'Intermediário' : ramo) +
                  ' — ramo paralelo não cobre esta cota',
              });
            });
          });
        }
        return {
          modo,
          submodo,
          descricaoModo:
            'Perfil médio — submodo 2.3 (perfis paralelos por família)',
          perfilParaCalculo: null,
          ramos: {
            coesivo: r.perfilCoesivo || [],
            granular: r.perfilGranular || [],
            intermediario: r.perfilIntermediario || [],
          },
          avisos: avisosNorm,
          compatibilizacao: compat,
        };
      }

      // 2.1 e 2.2: perfil único
      return {
        modo,
        submodo,
        descricaoModo: 'Perfil médio — submodo ' + submodo,
        perfilParaCalculo: r.perfil || [],
        avisos: Array.isArray(r.avisos) ? r.avisos : [],
        cotasBloqueadas: r.cotasHeterogeneasBloqueadas_m || [],
        compatibilizacao: compat,
        ramos: null,
        divergenciaModo2: r.bloqueado ? r.bloqueado : null,
      };
    }

    if (modo === 'por_furo') {
      const r = engine.calcularPorFuroIndividual(sondagens, estacaCalc, {
        janela_m: janela,
      });
      return {
        modo,
        submodo: null,
        descricaoModo: 'Por furo individual — sensibilidade espacial',
        perfilParaCalculo: null,
        porFuro: r,
        ramos: null,
        avisos: r.avisos || [],
      };
    }

    if (modo === 'interpolacao') {
      if (
        !estaca.coordenadas ||
        estaca.coordenadas.x === null ||
        estaca.coordenadas.x === undefined ||
        estaca.coordenadas.y === null ||
        estaca.coordenadas.y === undefined
      ) {
        return { erro: 'Estaca sem coordenadas (x, y). Edite a estaca na Aba 5.' };
      }
      const furosSemCoord = Object.entries(sondagens)
        .filter(
          ([_, s]) =>
            !s.coordenadas ||
            s.coordenadas.x === null ||
            s.coordenadas.x === undefined ||
            s.coordenadas.y === null ||
            s.coordenadas.y === undefined
        )
        .map(([n]) => n);
      if (furosSemCoord.length > 0) {
        return {
          erro:
            'Furos sem coordenadas: ' +
            furosSemCoord.join(', ') +
            '. Cadastre coordenadas na Aba 2.',
        };
      }
      const sondagensConv = {};
      Object.entries(sondagens).forEach(([n, s]) => {
        sondagensConv[n] = { ...s, x: s.coordenadas.x, y: s.coordenadas.y };
      });
      const estacaConv = {
        ...estacaCalc,
        x: estaca.coordenadas.x,
        y: estaca.coordenadas.y,
      };
      const opcoes = construirOpcoesCalculo(estacaConv, params);
      const r = engine.calcularPorInterpolacao(sondagensConv, estacaConv, opcoes);
      if (r.metadata && r.metadata.erro) {
        return { erro: 'Engine: ' + r.metadata.erro };
      }
      return {
        modo,
        submodo: null,
        descricaoModo:
          'Interpolação por locação — 3 furos mais próximos (peso linear normalizado)',
        perfilParaCalculo: null,
        interpolacao: r,
        ramos: null,
        avisos: [],
      };
    }

    return { erro: 'Modo desconhecido: ' + modo };
  } catch (e) {
    return { erro: e.message };
  }
}
