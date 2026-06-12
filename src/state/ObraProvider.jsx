/* ============================================================================
 * GeoSPT — ObraProvider
 *
 * Context global do estado da obra + ações imutáveis (sondagens, identificação,
 * import/export). Cópia funcional das linhas 2391-2660 do geospt_app.jsx, com
 * uma única mudança técnica: as referências a `window.GeoSPT` foram trocadas
 * por `import { GeoSPT } from '@/engine/geospt-engine'`.
 *
 * useObra() lança se chamado fora do Provider — sinaliza bug, não fallback.
 * ============================================================================ */

import React, { createContext, useContext, useState } from 'react';
import { GeoSPT } from '@/engine/geospt-engine';
import { ESTADO_INICIAL, SCHEMA_VERSAO } from './estadoInicial';
import { migrarDominios } from './dominiosHelper';
import { normalizarEstacaFormato } from '@/domain/estacas';

const ObraContext = createContext(null);

export function useObra() {
  const ctx = useContext(ObraContext);
  if (!ctx) throw new Error('useObra fora de Provider');
  return ctx;
}

export function ObraProvider({ children }) {
  const [estado, setEstado] = useState(ESTADO_INICIAL);

  const setUi = (key, value) => {
    setEstado((s) => ({ ...s, ui: { ...s.ui, [key]: value } }));
  };

  const setIdentificacao = (campo, valor) => {
    setEstado((s) => ({
      ...s,
      obra: {
        ...s.obra,
        identificacao: { ...s.obra.identificacao, [campo]: valor },
      },
    }));
  };

  // ------- Sondagens: add / remove / rename / update / duplicate -------
  const adicionarSondagem = (nome, dados = {}) => {
    setEstado((s) => {
      if (s.obra.sondagens[nome]) return s; // não sobrescreve
      const novaSondagem = {
        cotaTopo_m: null,
        profundidadeFinal_m: null,
        criterioParalisacao: 'impenetravel',
        naInicial_m: null,
        naFinal_m: null,
        coordenadas: null,
        dominioGeotecnico: null,
        leituras: [],
        ...dados,
      };
      return {
        ...s,
        obra: {
          ...s.obra,
          sondagens: { ...s.obra.sondagens, [nome]: novaSondagem },
        },
        ui: { ...s.ui, sondagemSelecionada: nome },
      };
    });
  };

  const removerSondagem = (nome) => {
    setEstado((s) => {
      const novas = { ...s.obra.sondagens };
      delete novas[nome];
      const restantes = Object.keys(novas);
      return {
        ...s,
        obra: { ...s.obra, sondagens: novas },
        ui: {
          ...s.ui,
          sondagemSelecionada:
            s.ui.sondagemSelecionada === nome
              ? restantes[0] || null
              : s.ui.sondagemSelecionada,
        },
      };
    });
  };

  const atualizarSondagem = (nome, patcher) => {
    setEstado((s) => {
      const atual = s.obra.sondagens[nome];
      if (!atual) return s;
      const atualizada =
        typeof patcher === 'function' ? patcher(atual) : { ...atual, ...patcher };
      return {
        ...s,
        obra: {
          ...s.obra,
          sondagens: { ...s.obra.sondagens, [nome]: atualizada },
        },
      };
    });
  };

  const renomearSondagem = (nomeAntigo, nomeNovo) => {
    if (nomeAntigo === nomeNovo) return;
    setEstado((s) => {
      if (s.obra.sondagens[nomeNovo]) return s;
      const novas = {};
      for (const k of Object.keys(s.obra.sondagens)) {
        novas[k === nomeAntigo ? nomeNovo : k] = s.obra.sondagens[k];
      }
      return {
        ...s,
        obra: { ...s.obra, sondagens: novas },
        ui: {
          ...s.ui,
          sondagemSelecionada:
            s.ui.sondagemSelecionada === nomeAntigo
              ? nomeNovo
              : s.ui.sondagemSelecionada,
        },
      };
    });
  };

  const duplicarSondagem = (nome) => {
    setEstado((s) => {
      const original = s.obra.sondagens[nome];
      if (!original) return s;
      let i = 2;
      let candidato;
      do {
        candidato = nome + ' (' + i + ')';
        i++;
      } while (s.obra.sondagens[candidato]);
      const copia = JSON.parse(JSON.stringify(original));
      return {
        ...s,
        obra: {
          ...s.obra,
          sondagens: { ...s.obra.sondagens, [candidato]: copia },
        },
        ui: { ...s.ui, sondagemSelecionada: candidato },
      };
    });
  };

  // Move um furo na ORDEM da lista (troca de posição com o vizinho). dir: -1
  // sobe, +1 desce. sondagens é um objeto; a ordem é a das chaves, então
  // reconstruímos o objeto com as chaves na nova ordem.
  const moverSondagem = (nome, dir) => {
    setEstado((s) => {
      const chaves = Object.keys(s.obra.sondagens);
      const idx = chaves.indexOf(nome);
      const alvo = idx + dir;
      if (idx < 0 || alvo < 0 || alvo >= chaves.length) return s;
      [chaves[idx], chaves[alvo]] = [chaves[alvo], chaves[idx]];
      const novas = {};
      for (const k of chaves) novas[k] = s.obra.sondagens[k];
      return { ...s, obra: { ...s.obra, sondagens: novas } };
    });
  };

  // ------- Corte esquemático (CP-13d) -------
  /** Persiste a seleção + toggles do corte no estado da obra (e no JSON). */
  const setCorteEsquematico = (corte) => {
    setEstado((s) => ({
      ...s,
      obra: { ...s.obra, corteEsquematico: corte },
    }));
  };

  // ------- Domínios geotécnicos (CP-12b) -------
  /**
   * Substitui a lista completa de domínios da obra.
   * @param {Array} dominios — array de { id, nome, cor, furos[], origem }
   */
  const setDominios = (dominios) => {
    setEstado((s) => ({
      ...s,
      obra: { ...s.obra, dominios: Array.isArray(dominios) ? dominios : [] },
    }));
  };

  // ------- Seleção cruzada (mini-mapa, perfis) -------
  /**
   * Seleciona/desseleciona um elemento visual.
   * @param {'furo'|'estaca'|null} tipo
   * @param {string|null} nome
   * Passar tipo=null desseleciona.
   */
  const selecionarElemento = (tipo, nome) => {
    if (!tipo || !nome) {
      setUi('elementoSelecionado', null);
      return;
    }
    setUi('elementoSelecionado', { tipo, nome });
  };

  // ------- Limpeza em massa -------
  /**
   * Remove o campo dominioGeotecnico de todas as sondagens e/ou estacas.
   * @param {{sondagens: boolean, estacas: boolean}} opcoes
   */
  const limparDominios = ({ sondagens = true, estacas = false }) => {
    setEstado((s) => {
      const obra = { ...s.obra };
      if (sondagens) {
        const novasSond = {};
        Object.entries(obra.sondagens).forEach(([nome, sd]) => {
          novasSond[nome] = { ...sd, dominioGeotecnico: null };
        });
        obra.sondagens = novasSond;
      }
      if (estacas) {
        obra.estacas = obra.estacas.map((e) => ({
          ...e,
          dominioGeotecnico: null,
        }));
      }
      return { ...s, obra };
    });
  };

  // ------- Import / Export de obra inteira -------
  const carregarObra = (obraCompleta) => {
    const obraMigrada = { ...ESTADO_INICIAL.obra, ...obraCompleta };
    if (!obraMigrada.resultadosCalculo) obraMigrada.resultadosCalculo = {};

    // CP-12a — Migração de domínios geotécnicos (schema antigo → novo).
    // JSON pré-7B tinha furo.dominioGeotecnico (string); migramos para
    // obra.dominios[]. Se já houver dominios[] populado, mantém como está.
    obraMigrada.dominios = migrarDominios(obraMigrada);

    // CP-14 — Migração de estacas: obras antigas só têm diametro_m.
    // Normaliza para { formato: 'circular', dimensao_m = diametro_m },
    // mantendo diametro_m espelhado (retrocompatibilidade total).
    if (Array.isArray(obraMigrada.estacas)) {
      obraMigrada.estacas = obraMigrada.estacas.map(normalizarEstacaFormato);
    }

    // CP-13d — corteEsquematico: JSON pré-13d não tem o campo. Cria o default.
    if (!obraMigrada.corteEsquematico) {
      obraMigrada.corteEsquematico = {
        sequencia: [],
        limiarLente_m: 2,
        toggles: {
          mostrarNspt: true,
          ligarCamadas: false,
          ligarHachuras: false,
          preservarMergulho: true,
          mostrarMediaTopos: true,
          perfilInterpretado: false,
          mostrarTerreno: true,
          mostrarNA: true,
          mostrarSemSPT: true,
        },
      };
    }

    // Reidratar coeficientesCustomizados ao importar JSON:
    // 1. Funções não sobrevivem ao JSON (AV_F1_F2_fn vira undefined)
    // 2. Todos os campos editáveis do Commit 7 precisam ser preservados do JSON
    // 3. Demais campos não-editáveis (cargaEstrutural_tf, etc.) vêm da engine atual
    const custom = obraMigrada.parametros?.coeficientesCustomizados;
    if (custom && typeof custom === 'object' && GeoSPT) {
      const orig = GeoSPT.domain.coefficients;

      // Reconstruir AV_F1_F2_fn a partir de AV_F1_F2_params (Opção B do Commit 7)
      const params = custom.AV_F1_F2_params || {
        premoldada: { base: 1, divisor: 0.80 },
        outros: { F1: 2.00, F2: 4.00 },
      };
      const av_f1_f2_fn = function (tipoEstaca, diametro_m, B_m) {
        if (tipoEstaca === 'premoldada') {
          const p = params.premoldada;
          // CP-14: dimensão transversal explícita (lado da quadrada) tem
          // precedência; sem ela, deriva do diâmetro como sempre.
          const dimTransversal = B_m != null ? B_m : diametro_m;
          const F1 = p.base + dimTransversal / p.divisor;
          return { F1: F1, F2: 2 * F1 };
        }
        return { F1: params.outros.F1, F2: params.outros.F2 };
      };

      obraMigrada.parametros.coeficientesCustomizados = {
        ...orig, // referencia tudo (inclusive funções não editáveis)
        // Campos editáveis do Commit 6:
        reducaoP: custom.reducaoP || orig.reducaoP,
        DQ_FS: custom.DQ_FS || orig.DQ_FS,
        // Campos editáveis do Commit 7:
        DQ_C: custom.DQ_C || orig.DQ_C,
        DQ_alpha: custom.DQ_alpha || orig.DQ_alpha,
        DQ_beta: custom.DQ_beta || orig.DQ_beta,
        AV_K_alpha: custom.AV_K_alpha || orig.AV_K_alpha,
        AV_F1_F2_params: params,
        AV_F1_F2_fn: av_f1_f2_fn, // função reconstruída
      };
    }

    setEstado({ ...ESTADO_INICIAL, obra: obraMigrada });
  };

  const exportarObra = async () => {
    if (!GeoSPT) throw new Error('Engine GeoSPT não carregada');

    // Snapshot da UI: estaca selecionada, modo, submodo
    const uiSnapshot = {
      estacaSelecionada: estado.ui?.estacaSelecionada ?? null,
      modoCalculoSelecionado: estado.ui?.modoCalculoSelecionado ?? null,
      submodoPerfilMedio: estado.ui?.submodoPerfilMedio ?? null,
    };

    // Snapshot de validação: rodar compatibilizar + alertas e capturar o estado atual
    // (não inclui cálculos pesados da Aba 6 — apenas alertas A1-A10 e métricas)
    const validacaoSnapshot = {};
    try {
      const sondagens = estado.obra.sondagens;
      const estacas = estado.obra.estacas || [];
      const nSond = Object.keys(sondagens).length;
      if (nSond >= 2) {
        const compat = GeoSPT.engine.compatibilizar(sondagens, {
          janela_m: estado.obra.parametros?.janelaCompatibilizacao_m ?? 0.5,
        });
        validacaoSnapshot.compatibilizacao = {
          cotasProcessadas: compat.metadata.cotasProcessadas,
          furoCritico: compat.metadata.furoCritico,
          furoCriticoPct: compat.metadata.furoCriticoPct,
          cotasHeterogeneas_m: compat.metadata.cotasHeterogeneas_m,
          cotasSubamostradas_m: compat.metadata.cotasSubamostradas,
          n_inversoes: (compat.metadata.inversoes || []).length,
        };

        // Aterro/corte se há estacas
        if (estacas.length > 0) {
          const topos = Object.values(sondagens)
            .map((s) => s.cotaTopo_m)
            .filter((c) => Number.isFinite(c));
          const mediaTopos =
            topos.length > 0
              ? topos.reduce((s, v) => s + v, 0) / topos.length
              : null;
          const LIMITE = 2.5;
          const aterro = [];
          const corte = [];
          estacas.forEach((e) => {
            const c = e.cotaArrasamento_m;
            if (!Number.isFinite(c) || mediaTopos == null) return;
            const delta = c - mediaTopos;
            if (delta > LIMITE) aterro.push({ nome: e.nome, cota: c, delta });
            else if (delta < -LIMITE) corte.push({ nome: e.nome, cota: c, delta });
          });
          validacaoSnapshot.aterroCorte = {
            mediaTopos_m: mediaTopos,
            limite_m: LIMITE,
            estacasComAterroEspesso: aterro,
            estacasComCorteElevado: corte,
          };
        }
      }
      validacaoSnapshot.timestamp = new Date().toISOString();
    } catch (e) {
      validacaoSnapshot.erro = e.message;
    }

    const payload = {
      _schema: 'geospt-obra',
      _schemaVersao: SCHEMA_VERSAO,
      _engineVersao: GeoSPT.versao,
      _exportadoEm: new Date().toISOString(),
      obra: estado.obra,
      ui: uiSnapshot,
      _validacao: validacaoSnapshot,
    };

    // Input hash (estado da obra como dados de entrada)
    try {
      payload._inputHash = await GeoSPT.export.calcularInputHash(
        estado.obra,
        GeoSPT.domain.coefficients
      );
    } catch (e) {
      payload._inputHash = null;
    }

    // Export hash (hash do payload completo, incluindo metadados e ui state)
    try {
      payload._exportHash = await GeoSPT.export.calcularExportHash(payload);
    } catch (e) {
      payload._exportHash = null;
    }

    return payload;
  };

  return (
    <ObraContext.Provider
      value={{
        estado,
        setEstado,
        setUi,
        setIdentificacao,
        adicionarSondagem,
        removerSondagem,
        atualizarSondagem,
        renomearSondagem,
        duplicarSondagem,
        moverSondagem,
        selecionarElemento,
        setDominios,
        setCorteEsquematico,
        limparDominios,
        carregarObra,
        exportarObra,
      }}
    >
      {children}
    </ObraContext.Provider>
  );
}
