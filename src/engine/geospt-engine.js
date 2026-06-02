/* ============================================================================
 * GeoSPT — Engine ES module wrapper
 * 
 * Esta é a engine v2.0.7 original empacotada como módulo ES.
 * O IIFE original (linhas 18-2199 do engine_v207.js) está intacto abaixo —
 * apenas seu envelope foi adaptado para coexistir com `import { GeoSPT }` no
 * Vite e simultaneamente popular `globalThis.GeoSPT` (compatibilidade com
 * código legacy que usa `window.GeoSPT.*`).
 *
 * O IIFE é auto-executável; a execução acontece no `import` (uma única vez,
 * graças à semântica de cache de módulos ES).
 *
 * Após esta linha começa o IIFE original — NÃO MODIFICAR seu corpo sem
 * rerodar a bateria de 216 testes (geospt_validacao_node_runner.js).
 * ============================================================================ */

(function (global) {
  'use strict';

  // ============================================================================
  // /domain — tabelas, constantes e tipologias
  // ============================================================================

  const domain = {
    // Tabela 1.1 — 15 tipos de solo
    soilTypes: {
      'Areia':                  { codigo: 11,  familia: 'Granular',     nbr_decourt: 'Areia' },
      'Areia Siltosa':          { codigo: 12,  familia: 'Granular',     nbr_decourt: 'Areia' },
      'Areia Silto-Argilosa':   { codigo: 121, familia: 'Granular',     nbr_decourt: 'Areia' },
      'Areia Argilo-Siltosa':   { codigo: 131, familia: 'Granular',     nbr_decourt: 'Areia' },
      'Areia Argilosa':         { codigo: 13,  familia: 'Granular',     nbr_decourt: 'Areia' },
      'Silte Arenoso':          { codigo: 211, familia: 'Intermediário', nbr_decourt: 'Solos intermediários' },
      'Silte Areno-Argiloso':   { codigo: 212, familia: 'Intermediário', nbr_decourt: 'Solos intermediários' },
      'Silte':                  { codigo: 2,   familia: 'Intermediário', nbr_decourt: 'Solos intermediários' },
      'Silte Argilo-Arenoso':   { codigo: 232, familia: 'Intermediário', nbr_decourt: 'Solos intermediários' },
      'Silte Argiloso':         { codigo: 23,  familia: 'Intermediário', nbr_decourt: 'Solos intermediários' },
      'Argila Arenosa':         { codigo: 31,  familia: 'Coesivo',      nbr_decourt: 'Argilas' },
      'Argila Areno-Siltosa':   { codigo: 312, familia: 'Coesivo',      nbr_decourt: 'Argilas' },
      'Argila Silto-Arenosa':   { codigo: 321, familia: 'Coesivo',      nbr_decourt: 'Argilas' },
      'Argila Siltosa':         { codigo: 32,  familia: 'Coesivo',      nbr_decourt: 'Argilas' },
      'Argila':                 { codigo: 3,   familia: 'Coesivo',      nbr_decourt: 'Argilas' }
    },

    pileTypes: ['helice_continua', 'escavada_seco', 'escavada_fluido', 'premoldada', 'raiz'],

    pileTypesLabel: {
      helice_continua: 'Hélice contínua',
      escavada_seco:   'Escavada (a seco)',
      escavada_fluido: 'Escavada (com fluido bentonítico)',
      premoldada:      'Pré-moldada cravada',
      raiz:            'Raiz'
    },

    coefficients: {
      // Tabela 1.3 — C (kPa) por solo
      DQ_C: {
        // Areias → 400
        'Areia': 400, 'Areia Siltosa': 400, 'Areia Silto-Argilosa': 400,
        'Areia Argilo-Siltosa': 400, 'Areia Argilosa': 400,
        // Intermediários — Silte Arenoso e Silte Areno-Argiloso → 250
        'Silte Arenoso': 250, 'Silte Areno-Argiloso': 250,
        // Intermediários — demais → 200
        'Silte': 200, 'Silte Argilo-Arenoso': 200, 'Silte Argiloso': 200,
        // Argilas → 120
        'Argila Arenosa': 120, 'Argila Areno-Siltosa': 120, 'Argila Silto-Arenosa': 120,
        'Argila Siltosa': 120, 'Argila': 120
      },

      // Tabela 1.4 — α DQ por família × estaca (MODIFICADA: hélice contínua = escavada)
      DQ_alpha: {
        'Coesivo': {
          escavada_seco: 0.85, escavada_fluido: 0.85, helice_continua: 0.85,
          premoldada: 1.00, raiz: 0.85
        },
        'Intermediário': {
          escavada_seco: 0.60, escavada_fluido: 0.60, helice_continua: 0.60,
          premoldada: 1.00, raiz: 0.60
        },
        'Granular': {
          escavada_seco: 0.50, escavada_fluido: 0.50, helice_continua: 0.50,
          premoldada: 1.00, raiz: 0.50
        }
      },

      // Tabela 1.5 — β DQ por família × estaca
      DQ_beta: {
        'Coesivo': {
          escavada_seco: 0.80, escavada_fluido: 0.90, helice_continua: 1.00,
          premoldada: 1.00, raiz: 1.50
        },
        'Intermediário': {
          escavada_seco: 0.65, escavada_fluido: 0.75, helice_continua: 1.00,
          premoldada: 1.00, raiz: 1.50
        },
        'Granular': {
          escavada_seco: 0.50, escavada_fluido: 0.60, helice_continua: 1.00,
          premoldada: 1.00, raiz: 1.50
        }
      },

      // Tabela 1.6
      DQ_FS: { Fl: 1.30, Fp: 4.00, FSg: 2.00 },

      // Tabela 1.7 — K (kPa) e α (PORCENTAGEM) AV
      AV_K_alpha: {
        'Areia':                { K_kPa: 1000, alpha_pct: 1.4 },
        'Areia Siltosa':        { K_kPa: 800,  alpha_pct: 2.0 },
        'Areia Silto-Argilosa': { K_kPa: 700,  alpha_pct: 2.4 },
        'Areia Argilo-Siltosa': { K_kPa: 500,  alpha_pct: 2.8 },
        'Areia Argilosa':       { K_kPa: 600,  alpha_pct: 3.0 },
        'Silte Arenoso':        { K_kPa: 550,  alpha_pct: 2.2 },
        'Silte Areno-Argiloso': { K_kPa: 450,  alpha_pct: 2.8 },
        'Silte':                { K_kPa: 400,  alpha_pct: 3.0 },
        'Silte Argilo-Arenoso': { K_kPa: 250,  alpha_pct: 3.0 },
        'Silte Argiloso':       { K_kPa: 230,  alpha_pct: 3.4 },
        'Argila Arenosa':       { K_kPa: 350,  alpha_pct: 2.4 },
        'Argila Areno-Siltosa': { K_kPa: 300,  alpha_pct: 2.8 },
        'Argila Silto-Arenosa': { K_kPa: 330,  alpha_pct: 3.0 },
        'Argila Siltosa':       { K_kPa: 220,  alpha_pct: 4.0 },
        'Argila':               { K_kPa: 200,  alpha_pct: 6.0 }
      },

      // Tabela 1.8 — F₁ e F₂ AV
      AV_F1_F2_fn: function (tipoEstaca, diametro_m) {
        if (tipoEstaca === 'premoldada') {
          const F1 = 1 + diametro_m / 0.80;
          return { F1: F1, F2: 2 * F1 };
        }
        // helice_continua, escavada_seco, escavada_fluido, raiz → F1=2.00, F2=4.00
        return { F1: 2.00, F2: 4.00 };
      },

      // Tabela 1.9 — Fator redutor de ponta (NBR 6122:2022) — OPCIONAL
      reducaoP: {
        helice_continua: 0.50,
        escavada_seco:   0.50,
        escavada_fluido: 0.60,
        premoldada:      1.00,
        raiz:            0.50
      },

      // Tabela 1.2 — Carga estrutural admissível (tf) por diâmetro × tipo
      // null = configuração não usual (bloqueada)
      cargaEstrutural_tf: {
        20: { helice_continua: 14,  escavada_seco: 14,  escavada_fluido: 14,  premoldada: 30,  raiz: 60 },
        25: { helice_continua: 25,  escavada_seco: 25,  escavada_fluido: 25,  premoldada: 40,  raiz: 80 },
        30: { helice_continua: 45,  escavada_seco: 36,  escavada_fluido: 36,  premoldada: 50,  raiz: 110 },
        35: { helice_continua: 60,  escavada_seco: 49,  escavada_fluido: 49,  premoldada: 75,  raiz: 130 },
        40: { helice_continua: 80,  escavada_seco: 64,  escavada_fluido: 64,  premoldada: 90,  raiz: 150 },
        45: { helice_continua: 100, escavada_seco: 81,  escavada_fluido: 81,  premoldada: 115, raiz: null },
        50: { helice_continua: 125, escavada_seco: 100, escavada_fluido: 100, premoldada: 170, raiz: null },
        60: { helice_continua: 180, escavada_seco: 127, escavada_fluido: 110, premoldada: 230, raiz: null },
        70: { helice_continua: 245, escavada_seco: 173, escavada_fluido: 150, premoldada: 300, raiz: null },
        80: { helice_continua: 320, escavada_seco: 226, escavada_fluido: 200, premoldada: 400, raiz: null },
        100:{ helice_continua: 500, escavada_seco: 354, escavada_fluido: 310, premoldada: null,raiz: null }
      }
    },

    constants: {
      KN_POR_TF: 9.80665,
      NSPT_LIMITE_CALCULO: 50,
      NSPT_MIN_DQ: 3,
      NSPT_MIN: 1,
      JANELA_PADRAO_M: 0.50
    },

    // Modificações documentadas em relação à fonte original
    modificacoesAplicadas: [
      {
        parametro: 'DQ alpha hélice contínua',
        valoresOriginais: { Coesivo: 0.30, Intermediário: 0.30, Granular: 0.30 },
        valoresAplicados: { Coesivo: 0.85, Intermediário: 0.60, Granular: 0.50 },
        justificativa: 'Prática brasileira moderna (controle executivo rigoroso); decisão do projetista pendente de referência bibliográfica formal.',
        referencia: 'A documentar pelo projetista responsável técnico.'
      },
      {
        parametro: 'Regra de desprezo do último metro de atrito',
        valoresOriginais: 'Sempre despreza a camada [cota_ponta+1, cota_ponta]',
        valoresAplicados: 'Despreza somente se houver pelo menos 1 camada adicional com dado no fuste (estacas curtas com 1 m de fuste útil NÃO têm o atrito zerado)',
        justificativa: 'A regra do desprezo do último metro pressupõe estaca longa onde a zona de influência da ponta é apenas uma fração do fuste. Para estacas curtas didáticas ou de pequeno comprimento útil, a aplicação literal zera o atrito completamente, o que é fisicamente irreal e contrasta com o objetivo conservador da regra.',
        referencia: 'Decisão metodológica adotada na construção do GeoSPT; carece de validação formal pelo projetista responsável.'
      }
    ]
  };

  // ============================================================================
  // /util — utilitários
  // ============================================================================

  const util = {
    /** Converte kN para tf usando KN_POR_TF = 9.80665 (NBR 5891) */
    kNparaTf: function (v_kN) { return v_kN / domain.constants.KN_POR_TF; },

    /** Converte tf para kN */
    tfParaKn: function (v_tf) { return v_tf * domain.constants.KN_POR_TF; },

    /** Arredonda para baixo (Math.floor) — usado em NSPT médio */
    arredondaBaixo: function (v) { return Math.floor(v); },

    /** Distância euclidiana 2D */
    distanciaEuclidiana: function (p1, p2) {
      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      return Math.sqrt(dx * dx + dy * dy);
    },

    /** Moda de array (primeira em caso de empate) */
    moda: function (arr) {
      if (!arr || arr.length === 0) return null;
      const contagem = {};
      let max = 0, modaVal = null;
      for (const v of arr) {
        if (v === null || v === undefined) continue;
        contagem[v] = (contagem[v] || 0) + 1;
        if (contagem[v] > max) { max = contagem[v]; modaVal = v; }
      }
      return modaVal;
    },

    /** Clamp numérico */
    clamp: function (v, min, max) {
      return Math.max(min, Math.min(max, v));
    },

    /** Clona profundamente via JSON (suficiente para nossos objetos planos) */
    cloneDeep: function (obj) {
      return JSON.parse(JSON.stringify(obj));
    },

    /** Verifica se cota é inteira (alinhada à grade SPT) */
    cotaEhInteira: function (cota) {
      return Number.isInteger(cota);
    },

    /** Conta famílias num array de famílias, retorna {familia: count, max, predominante, empate} */
    contaFamilias: function (arr) {
      const contagem = {};
      for (const f of arr) {
        if (!f) continue;
        contagem[f] = (contagem[f] || 0) + 1;
      }
      const entries = Object.entries(contagem);
      if (entries.length === 0) return { contagem, max: 0, predominante: null, empate: false };
      entries.sort((a, b) => b[1] - a[1]);
      const empate = entries.length >= 2 && entries[0][1] === entries[1][1];
      return {
        contagem,
        max: entries[0][1],
        predominante: entries[0][0],
        empate
      };
    }
  };

  // ============================================================================
  // /validation — validações
  // ============================================================================

  const validation = {
    /**
     * Valida uma sondagem individual
     * @returns {Object} { erros: [...], avisos: [...] }
     */
    validarSondagem: function (sondagem, nomeSondagem) {
      const erros = [];
      const avisos = [];
      const nome = nomeSondagem || 'sondagem';

      if (sondagem.cotaTopo_m === undefined || sondagem.cotaTopo_m === null) {
        erros.push(`${nome}: cota de topo ausente`);
      }
      if (!Array.isArray(sondagem.leituras) || sondagem.leituras.length === 0) {
        erros.push(`${nome}: sem leituras NSPT`);
        return { erros, avisos };
      }

      let profAnterior = -Infinity;
      sondagem.leituras.forEach(function (l, i) {
        // Profundidade crescente
        if (l.profundidade_m <= profAnterior) {
          erros.push(`${nome}: profundidade não crescente na leitura #${i + 1} (${l.profundidade_m} m)`);
        }
        profAnterior = l.profundidade_m;

        // NSPT
        const N = l.nspt_real;
        if (N === null || N === undefined) {
          erros.push(`${nome}: NSPT ausente na profundidade ${l.profundidade_m} m`);
        } else if (!Number.isInteger(N)) {
          erros.push(`${nome}: NSPT não inteiro (${N}) na profundidade ${l.profundidade_m} m`);
        } else if (N < domain.constants.NSPT_MIN) {
          erros.push(`${nome}: NSPT < 1 (${N}) na profundidade ${l.profundidade_m} m`);
        } else if (N > domain.constants.NSPT_LIMITE_CALCULO && !l.impenetravel) {
          erros.push(`${nome}: NSPT > 50 (${N}) sem flag de impenetrabilidade na profundidade ${l.profundidade_m} m`);
        }

        // Solo
        if (!l.solo) {
          erros.push(`${nome}: solo ausente na profundidade ${l.profundidade_m} m`);
        } else if (!domain.soilTypes[l.solo]) {
          erros.push(`${nome}: solo "${l.solo}" não padronizado na profundidade ${l.profundidade_m} m`);
        }

        // Coerência família
        if (l.solo && l.familia && domain.soilTypes[l.solo]) {
          const familiaCorreta = domain.soilTypes[l.solo].familia;
          if (l.familia !== familiaCorreta) {
            erros.push(`${nome}: família "${l.familia}" incompatível com solo "${l.solo}" (esperada "${familiaCorreta}")`);
          }
        }
      });

      // Critério de paralisação
      if (sondagem.criterioParalisacao === 'solicitacao_contratante') {
        avisos.push(`${nome}: paralisação por solicitação do contratante — verificar suficiência da profundidade investigada`);
      }

      return { erros, avisos };
    },

    /**
     * Valida estaca: tipo, diâmetro, cota de arrasamento
     */
    /**
     * CORREÇÃO #4 — valida cota de arrasamento de estaca como inteiro.
     * A grade SPT é inteira (cotas de referência inteiras); cota fracionária
     * cria ambiguidade na 1ª camada de atrito. Esta função encapsula a regra
     * de modo que a UI possa exibir mensagem normativa consistente.
     * Retorna { valido: boolean, motivo: string|null, valor: number|null }.
     */
    validarCotaArrasamento: function (cota_m) {
      if (cota_m === null || cota_m === undefined) {
        return { valido: false, motivo: 'cota_ausente', valor: null };
      }
      if (typeof cota_m !== 'number' || Number.isNaN(cota_m)) {
        return { valido: false, motivo: 'cota_nao_numerica', valor: null };
      }
      if (!Number.isFinite(cota_m)) {
        return { valido: false, motivo: 'cota_nao_finita', valor: null };
      }
      if (!util.cotaEhInteira(cota_m)) {
        return {
          valido: false,
          motivo: 'cota_fracionaria_proibida_grade_inteira',
          valor: cota_m
        };
      }
      return { valido: true, motivo: null, valor: cota_m };
    },

    validarEstaca: function (estaca, perfilDisponivel) {
      const erros = [];
      const avisos = [];

      if (!domain.pileTypes.includes(estaca.tipoEstaca)) {
        erros.push(`Tipo de estaca inválido: ${estaca.tipoEstaca}`);
      }

      const diametro_cm = Math.round(estaca.diametro_m * 100);
      const cargaEstr = domain.coefficients.cargaEstrutural_tf[diametro_cm];
      if (!cargaEstr) {
        erros.push(`Diâmetro ${diametro_cm} cm não consta na tabela de carga estrutural`);
      } else if (cargaEstr[estaca.tipoEstaca] === null || cargaEstr[estaca.tipoEstaca] === undefined) {
        erros.push(`Configuração não usual: ${diametro_cm} cm × ${estaca.tipoEstaca} (Tabela 1.2: —)`);
      }

      if (estaca.cotaArrasamento_m !== undefined && estaca.cotaArrasamento_m !== null) {
        if (!Number.isInteger(estaca.cotaArrasamento_m)) {
          erros.push(`Cota de arrasamento (${estaca.cotaArrasamento_m} m) deve ser INTEIRA, alinhada à grade SPT`);
        }
        if (perfilDisponivel && perfilDisponivel.length > 0) {
          const cotaMaxPerfil = Math.max.apply(null, perfilDisponivel.map(function (p) { return p.cota_m; }));
          const cotaMinPerfil = Math.min.apply(null, perfilDisponivel.map(function (p) { return p.cota_m; }));
          if (estaca.cotaArrasamento_m > cotaMaxPerfil + 1) {
            avisos.push(`Cota de arrasamento (${estaca.cotaArrasamento_m} m) acima do topo do perfil compatibilizado`);
          }
          if (estaca.cotaArrasamento_m < cotaMinPerfil) {
            erros.push(`Cota de arrasamento (${estaca.cotaArrasamento_m} m) abaixo do perfil disponível`);
          }
        }
      }

      return { erros, avisos };
    },

    /** Valida obra (conjunto de sondagens) */
    validarObra: function (obra) {
      const erros = [];
      const avisos = [];

      if (!obra.sondagens || Object.keys(obra.sondagens).length === 0) {
        erros.push('Obra sem sondagens');
        return { erros, avisos };
      }

      for (const nome in obra.sondagens) {
        const r = validation.validarSondagem(obra.sondagens[nome], nome);
        erros.push.apply(erros, r.erros);
        avisos.push.apply(avisos, r.avisos);
      }

      return { erros, avisos };
    }
  };

  // ============================================================================
  // /engine — núcleo de cálculo
  // ============================================================================

  const engine = {
    /**
     * Compatibiliza múltiplas sondagens por COTA ABSOLUTA, janela ±0,5 m.
     *
     * Regras:
     *  - Grade: cotas inteiras de Math.round(max(cota_leitura_1)) até cota mín.
     *    cota_leitura_1 de cada furo = cota_topo - 1 (primeira leitura SPT)
     *  - Janela: leituras com cota ∈ [X-0.5, X+0.5] participam da cota X
     *  - Envoltória inferior: MÍNIMO ABSOLUTO de NSPT entre furos da janela
     *    + solo + família do MESMO furo (fonte única)
     *  - Média: agrupada por família predominante; se empate de famílias,
     *    marca como heterogeneo e separa média coesivo × granular
     *
     * @param {Object} sondagens - {nome: {cotaTopo_m, leituras: [...], ...}}
     * @param {Object} params - {janela_m, dominio}
     * @returns {Object} {resultados: [...], metadata: {...}}
     */
    compatibilizar: function (sondagens, params) {
      params = params || {};
      const janela = params.janela_m || domain.constants.JANELA_PADRAO_M;
      const dominioFiltro = params.dominio || null;

      // 1. Filtrar sondagens pelo domínio (se informado)
      const nomes = Object.keys(sondagens).filter(function (n) {
        if (dominioFiltro === null) return true;
        return sondagens[n].dominioGeotecnico === dominioFiltro;
      });

      if (nomes.length === 0) {
        return { resultados: [], metadata: { erro: 'Nenhuma sondagem disponível para o domínio' } };
      }

      // 2. Construir mapa: para cada sondagem, leituras com cota absoluta
      const leiturasPorFuro = {};
      nomes.forEach(function (n) {
        const s = sondagens[n];
        leiturasPorFuro[n] = s.leituras.map(function (l) {
          const cota_leitura_m = s.cotaTopo_m - l.profundidade_m;
          return {
            profundidade_m: l.profundidade_m,
            cota_m: cota_leitura_m,
            nspt_real: l.nspt_real,
            nspt_calculo: l.nspt_calculo !== undefined ? l.nspt_calculo
                          : Math.min(l.nspt_real, domain.constants.NSPT_LIMITE_CALCULO),
            impenetravel: l.impenetravel || false,
            solo: l.solo,
            familia: l.familia
          };
        });
      });

      // 3. Determinar grade de cotas inteiras
      //    Teto: round da maior cota de leitura entre todos os furos
      //    Piso: floor da menor cota de leitura entre todos os furos
      let cotaLeituraMax = -Infinity;
      let cotaLeituraMin = Infinity;
      nomes.forEach(function (n) {
        leiturasPorFuro[n].forEach(function (l) {
          if (l.cota_m > cotaLeituraMax) cotaLeituraMax = l.cota_m;
          if (l.cota_m < cotaLeituraMin) cotaLeituraMin = l.cota_m;
        });
      });

      const cotaTopoGrade = Math.round(cotaLeituraMax);
      const cotaBaseGrade = Math.floor(cotaLeituraMin);

      // 4. Para cada cota inteira da grade, processar
      const resultados = [];
      const cotasHeterogeneas = [];
      const inversoes = [];
      const cotasSubamostradas = [];
      const contagemFuroCritico = {};

      // Profundidade de referência: a partir do topo da grade
      // prof_ref = cotaTopoGrade − cota_atual (≥ 1)
      for (let cota = cotaTopoGrade; cota >= cotaBaseGrade; cota--) {
        const profRef = cotaTopoGrade - cota + 1;

        // nsptPorSondagem agora carrega nspt_calculo (limitado a 50 p/ impenetráveis)
        // que é o valor canônico para envoltória, média e cálculo posterior.
        // nsptRealPorSondagem e impenetravelPorSondagem preservam o dado bruto
        // para exibição em UI/XLSX (ex: mostrar "50★" ou "≥50" quando impenetrável).
        const nsptPorSondagem = {};         // ← nspt_calculo (canônico p/ cálculo)
        const nsptRealPorSondagem = {};     // ← nspt_real (preservação/exibição)
        const impenetravelPorSondagem = {}; // ← flag por furo na cota
        const soloPorSondagem = {};
        const familiaPorSondagem = {};
        const profPorSondagem_m = {};
        const cotaLeituraPorSondagem = {};
        const familiasNaCota = [];

        let nFuros = 0;

        nomes.forEach(function (n) {
          // Achar leitura desse furo cuja cota_m está em [cota-janela, cota+janela]
          const candidatas = leiturasPorFuro[n].filter(function (l) {
            return Math.abs(l.cota_m - cota) <= janela + 1e-9;
          });
          if (candidatas.length === 0) {
            nsptPorSondagem[n] = null;
            nsptRealPorSondagem[n] = null;
            impenetravelPorSondagem[n] = null;
            soloPorSondagem[n] = null;
            familiaPorSondagem[n] = null;
            profPorSondagem_m[n] = null;
            cotaLeituraPorSondagem[n] = null;
          } else {
            // Mais próxima
            candidatas.sort(function (a, b) {
              return Math.abs(a.cota_m - cota) - Math.abs(b.cota_m - cota);
            });
            const escolhida = candidatas[0];
            // CORREÇÃO #1: valor canônico p/ cálculo é nspt_calculo (≤ 50)
            nsptPorSondagem[n] = escolhida.nspt_calculo;
            nsptRealPorSondagem[n] = escolhida.nspt_real;
            impenetravelPorSondagem[n] = escolhida.impenetravel || false;
            soloPorSondagem[n] = escolhida.solo;
            familiaPorSondagem[n] = escolhida.familia;
            profPorSondagem_m[n] = escolhida.profundidade_m;
            cotaLeituraPorSondagem[n] = escolhida.cota_m;
            familiasNaCota.push(escolhida.familia);
            nFuros++;
          }
        });

        if (nFuros === 0) continue; // cota sem cobertura, pula

        // Avaliar família predominante
        const cf = util.contaFamilias(familiasNaCota);
        const familiaPred = cf.empate ? 'HETEROGENEO' : cf.predominante;
        const heterogeneo = cf.empate;

        if (heterogeneo) cotasHeterogeneas.push(cota);
        if (nFuros < nomes.length / 2) cotasSubamostradas.push(cota);

        // Solo predominante (moda dos solos com a família predominante)
        let soloPred;
        if (heterogeneo) {
          // Listagem dual
          const solosCoesivo = [];
          const solosGranular = [];
          nomes.forEach(function (n) {
            if (familiaPorSondagem[n] === 'Coesivo') solosCoesivo.push(soloPorSondagem[n]);
            if (familiaPorSondagem[n] === 'Granular') solosGranular.push(soloPorSondagem[n]);
          });
          const sC = util.moda(solosCoesivo);
          const sG = util.moda(solosGranular);
          soloPred = `C: ${sC || '—'} | G: ${sG || '—'}`;
        } else {
          const solosFam = [];
          nomes.forEach(function (n) {
            if (familiaPorSondagem[n] === familiaPred) solosFam.push(soloPorSondagem[n]);
          });
          soloPred = util.moda(solosFam) || '—';
        }

        // ENVOLTÓRIA INFERIOR — MÍNIMO ABSOLUTO + solo/família do MESMO furo
        // CORREÇÃO #1b: envoltoria.nspt agora é nspt_calculo (canônico p/ cálculo).
        // Campos paralelos nspt_real e impenetravel preservam dado bruto p/ UI/XLSX.
        // A escolha do furo de origem usa nspt_calculo (em caso de empate entre
        // dois impenetráveis, fica o primeiro varrido — comportamento determinístico).
        let envNspt = Infinity;
        let envFuro = null;
        nomes.forEach(function (n) {
          if (nsptPorSondagem[n] !== null && nsptPorSondagem[n] < envNspt) {
            envNspt = nsptPorSondagem[n];
            envFuro = n;
          }
        });
        const envoltoria = {
          nspt: envNspt === Infinity ? null : envNspt,           // canônico p/ cálculo
          nspt_real: envFuro ? nsptRealPorSondagem[envFuro] : null, // valor bruto
          impenetravel: envFuro ? impenetravelPorSondagem[envFuro] : false,
          furo: envFuro,
          solo: envFuro ? soloPorSondagem[envFuro] : null,
          familia: envFuro ? familiaPorSondagem[envFuro] : null
        };
        if (envFuro) contagemFuroCritico[envFuro] = (contagemFuroCritico[envFuro] || 0) + 1;

        // MÉDIA por família
        // CORREÇÃO v2.0.4: até v2.0.3, em cotas heterogêneas a média
        // Intermediário era silenciosamente ignorada — NSPTs coletados mas
        // não calculados nem reportados. Agora as três famílias são tratadas
        // simetricamente (decisão D6).
        let mediaPredominante = null;
        let mediaCoesivo = null;
        let mediaGranular = null;
        let mediaIntermediario = null;
        const nsptCoesivo = [];
        const nsptGranular = [];
        const nsptIntermediario = [];

        nomes.forEach(function (n) {
          if (nsptPorSondagem[n] === null) return;
          if (familiaPorSondagem[n] === 'Coesivo')        nsptCoesivo.push(nsptPorSondagem[n]);
          else if (familiaPorSondagem[n] === 'Granular') nsptGranular.push(nsptPorSondagem[n]);
          else if (familiaPorSondagem[n] === 'Intermediário') nsptIntermediario.push(nsptPorSondagem[n]);
        });

        const mediaArr = function (a) {
          if (a.length === 0) return null;
          return Math.floor(a.reduce(function (s, v) { return s + v; }, 0) / a.length);
        };

        if (heterogeneo) {
          mediaCoesivo       = mediaArr(nsptCoesivo);
          mediaGranular      = mediaArr(nsptGranular);
          mediaIntermediario = mediaArr(nsptIntermediario);  // v2.0.4
        } else {
          if (familiaPred === 'Coesivo')        mediaPredominante = mediaArr(nsptCoesivo);
          else if (familiaPred === 'Granular') mediaPredominante = mediaArr(nsptGranular);
          else if (familiaPred === 'Intermediário') mediaPredominante = mediaArr(nsptIntermediario);
        }

        resultados.push({
          profRef_m: profRef,
          cotaRef_m: cota,
          nFuros: nFuros,
          nsptPorSondagem: nsptPorSondagem,             // canônico p/ cálculo
          nsptRealPorSondagem: nsptRealPorSondagem,     // valor bruto
          impenetravelPorSondagem: impenetravelPorSondagem,
          soloPorSondagem: soloPorSondagem,
          familiaPorSondagem: familiaPorSondagem,
          profPorSondagem_m: profPorSondagem_m,
          cotaLeituraPorSondagem: cotaLeituraPorSondagem,
          familiaPred: familiaPred,
          soloPred: soloPred,
          heterogeneo: heterogeneo,
          envoltoria: envoltoria,
          media: {
            familiaPredominante: mediaPredominante,
            coesivo: mediaCoesivo,
            granular: mediaGranular,
            intermediario: mediaIntermediario           // v2.0.4
          }
        });
      }

      // Inversões NSPT (por furo, cota acima > cota abaixo + delta)
      nomes.forEach(function (n) {
        const leituras = leiturasPorFuro[n].slice().sort(function (a, b) { return b.cota_m - a.cota_m; });
        for (let i = 1; i < leituras.length; i++) {
          const acima = leituras[i - 1];
          const abaixo = leituras[i];
          if (abaixo.nspt_real < acima.nspt_real - 5) {
            inversoes.push({
              furo: n,
              cotaAcima_m: acima.cota_m,
              cotaAbaixo_m: abaixo.cota_m,
              deltaNspt: abaixo.nspt_real - acima.nspt_real
            });
          }
        }
      });

      // Furo crítico
      const totalCotas = resultados.length;
      let furoCritico = null, furoCriticoCount = 0;
      for (const f in contagemFuroCritico) {
        if (contagemFuroCritico[f] > furoCriticoCount) {
          furoCritico = f;
          furoCriticoCount = contagemFuroCritico[f];
        }
      }

      // Domínios detectados
      const dominiosDetectados = Array.from(new Set(
        Object.values(sondagens).map(function (s) { return s.dominioGeotecnico; }).filter(function (d) { return !!d; })
      ));

      return {
        resultados: resultados,
        metadata: {
          cotasProcessadas: resultados.length,
          cotaTopoGrade: cotaTopoGrade,
          cotaBaseGrade: cotaBaseGrade,
          cotasHeterogeneas_m: cotasHeterogeneas,
          furoCritico: furoCritico,
          furoCriticoPct: totalCotas > 0 ? furoCriticoCount / totalCotas : 0,
          inversoes: inversoes,
          cotasSubamostradas: cotasSubamostradas,
          dominiosDetectados: dominiosDetectados,
          janelaUsada_m: janela,
          nomesSondagens: nomes
        }
      };
    },

    /**
     * Calcula capacidade de carga pelo método Décourt-Quaresma (1996, modificado)
     *
     * @param {Array} perfil - lista de camadas { cota_m, nspt, solo, familia, origemFuro }
     *                         ordenada da cota MAIS ALTA para a MAIS BAIXA
     * @param {Object} opcoes - {tipoEstaca, diametro_m, cotaArrasamento_m, desprezaUltimoMetroAtrito,
     *                          aplicaRedutorPonta, tratamentoPonta, limitaPontaPorAtrito,
     *                          coeficientesCustomizados}
     * @returns {Array} memorial por cota de ponta
     */
    calcularDQ: function (perfil, opcoes) {
      return engine._calcularGenerico(perfil, opcoes, 'DQ');
    },

    /**
     * Calcula capacidade de carga pelo método Aoki-Velloso (1975)
     */
    calcularAV: function (perfil, opcoes) {
      return engine._calcularGenerico(perfil, opcoes, 'AV');
    },

    /**
     * Implementação compartilhada DQ/AV
     */
    _calcularGenerico: function (perfil, opcoes, metodo) {
      const coefs = (opcoes.coeficientesCustomizados) || domain.coefficients;
      const tipo = opcoes.tipoEstaca;
      const D_m = opcoes.diametro_m;
      const cotaArr = opcoes.cotaArrasamento_m;
      const desprezaUltimo = opcoes.desprezaUltimoMetroAtrito !== false; // default true
      const aplicaRedutor = opcoes.aplicaRedutorPonta === true;
      const trat = opcoes.tratamentoPonta || 'calculado';
      const limitaP = opcoes.limitaPontaPorAtrito === true;

      // Geometria
      const Ap_m2 = Math.PI * D_m * D_m / 4;
      const U_m = Math.PI * D_m;

      // Carga estrutural
      // Override por estaca (opcoes.cargaEstrutural_tf_override) tem precedência
      // sobre a tabela. Se ausente (null/undefined), usa a tabela — retrocompatível.
      const diametro_cm = Math.round(D_m * 100);
      const cargaEstrTabela = coefs.cargaEstrutural_tf[diametro_cm];
      const Qadm_estrutural_tabela_tf = cargaEstrTabela ? cargaEstrTabela[tipo] : null;
      const Qadm_estrutural_tf =
        opcoes.cargaEstrutural_tf_override !== null &&
        opcoes.cargaEstrutural_tf_override !== undefined
          ? opcoes.cargaEstrutural_tf_override
          : Qadm_estrutural_tabela_tf;

      // Ordenar perfil decrescente por cota
      const perfilOrd = perfil.slice().sort(function (a, b) { return b.cota_m - a.cota_m; });

      // Indexar por cota
      const porCota = {};
      perfilOrd.forEach(function (c) { porCota[c.cota_m] = c; });

      // Cotas válidas de ponta: cota_arrasamento − 1 até a cota mais baixa do perfil
      const cotaMaxPerfil = perfilOrd[0].cota_m;
      const cotaMinPerfil = perfilOrd[perfilOrd.length - 1].cota_m;

      // v2.0.7 (D13 — FIX-F): arrasamento pode estar arbitrariamente acima do
      // topo do perfil compatibilizado. Quando isso ocorre, as camadas de atrito
      // entre arrasamento e topo do perfil são tratadas como "sem contribuição"
      // (caso típico: aterro espesso sem sondagem). Comportamento já tratado no
      // loop de atrito abaixo via `sem_dado: true`. A UI dispara A9 (aterro
      // espesso) sobre essa situação. Convergência metodológica D1→D10→D13.
      //
      // ATENÇÃO: cota de ponta acima do topo do perfil continua INVÁLIDA — não
      // se projeta ponta em região sem dado SPT. Mantido implicitamente pelo
      // filtro `if (porCota[c])` no loop abaixo.
      const fusteForaDoPerfil_m = Math.max(0, cotaArr - cotaMaxPerfil);

      const cotasPonta = [];
      for (let c = cotaArr - 1; c >= cotaMinPerfil; c--) {
        // Só inclui cota de ponta onde há dado para a ponta. Cotas acima do
        // topo do perfil (caso arrasamento alto) ou cotas sem dado em grade
        // descontínua são puladas — proteção defensiva.
        if (porCota[c]) {
          cotasPonta.push(c);
        }
      }

      const memorial = [];

      cotasPonta.forEach(function (cotaPonta) {
        const profDesdeArrasamento = cotaArr - cotaPonta;

        // ----- ATRITO LATERAL -----
        // Camadas: [cota_arr, cota_arr-1], [cota_arr-1, cota_arr-2], ..., [cotaPonta+1, cotaPonta]
        // NSPT da camada = NSPT da cota_topo (= cota superior da camada)
        const camadas = [];
        for (let cotaTopo = cotaArr; cotaTopo > cotaPonta; cotaTopo--) {
          const cotaBase = cotaTopo - 1;
          const dadoCamada = porCota[cotaTopo];
          if (!dadoCamada) {
            // Camada sem NSPT correspondente na grade compatibilizada:
            // tratada como camada SEM CONTRIBUIÇÃO ao atrito + nota.
            // Caso típico: arrasamento bate exatamente na cota de boca do furo,
            // primeira leitura SPT só ocorre 1 m abaixo.
            camadas.push({
              cotaTopo_m: cotaTopo,
              cotaBase_m: cotaBase,
              sem_dado: true,
              desprezada: true,
              motivoDesprezo: 'sem_leitura_spt_na_cota_topo'
            });
            continue;
          }

          // Clamp NSPT
          let NL;
          if (metodo === 'DQ') {
            NL = util.clamp(dadoCamada.nspt, domain.constants.NSPT_MIN_DQ, domain.constants.NSPT_LIMITE_CALCULO);
          } else {
            NL = util.clamp(dadoCamada.nspt, domain.constants.NSPT_MIN, domain.constants.NSPT_LIMITE_CALCULO);
          }

          let fl_kPa;
          let parametros;
          if (metodo === 'DQ') {
            const beta = coefs.DQ_beta[dadoCamada.familia][tipo];
            fl_kPa = (NL / 3 + 1) * 10 * beta;
            parametros = { beta: beta };
          } else {
            // AV
            const av = coefs.AV_K_alpha[dadoCamada.solo];
            const F1F2 = coefs.AV_F1_F2_fn(tipo, D_m);
            // ⚠️ BUG FATOR 100: α está em %, converter para decimal
            const alpha_decimal = av.alpha_pct / 100;
            fl_kPa = alpha_decimal * av.K_kPa * NL / F1F2.F2;
            parametros = { K_kPa: av.K_kPa, alpha_pct: av.alpha_pct, alpha_decimal: alpha_decimal, F2: F1F2.F2 };
          }

          const Ql_camada_kN = fl_kPa * U_m * 1.0; // ΔL = 1.0 m

          camadas.push({
            cotaTopo_m: cotaTopo,
            cotaBase_m: cotaBase,
            // CORREÇÃO #2 — auditoria completa do NSPT da camada:
            //   nspt_camada       = valor canônico p/ cálculo (nspt_calculo, ≤ 50)
            //   nspt_camada_real  = valor bruto (nspt_real, pode ser > 50 se impenetrável)
            //   impenetravel      = flag de paralisação por impenetrabilidade nesta cota
            //   nl_clampeado      = valor final após clamp DQ/AV (NSPT_MIN(_DQ), 50)
            // Os três podem coincidir quando não há impenetrabilidade. Os três campos
            // explicitam: o que veio do sondador, o que a NBR aceita, e o que a
            // fórmula usou.
            nspt_camada: dadoCamada.nspt,
            nspt_camada_real: dadoCamada.nspt_real !== undefined ? dadoCamada.nspt_real : dadoCamada.nspt,
            impenetravel: dadoCamada.impenetravel || false,
            nl_clampeado: NL,
            solo: dadoCamada.solo,
            familia: dadoCamada.familia,
            origemFuro: dadoCamada.origemFuro || null,
            parametros: parametros,
            fl_kPa: fl_kPa,
            U_m: U_m,
            Ql_camada_kN: Ql_camada_kN
          });
        }

        // Desprezar última camada [cotaPonta+1, cotaPonta]?
        // ⚠️ Regra metodológica: só despreza se houver ≥ 2 camadas COMPUTÁVEIS
        // (com dado) no fuste. Para estacas curtas (1 m de fuste útil), o atrito
        // não pode ser zerado — a regra do "último metro" pressupõe estaca longa
        // onde a zona de influência da ponta é apenas uma fração do fuste.
        let camadaDesprezada = null;
        if (desprezaUltimo && camadas.length > 0) {
          const ult = camadas[camadas.length - 1];
          // Conta camadas com dado (excluindo a candidata a desprezo)
          const camadasComDadoForaUlt = camadas.filter(function (c, i) {
            return !c.sem_dado && i !== camadas.length - 1;
          }).length;
          if (ult.cotaBase_m === cotaPonta && !ult.sem_dado && camadasComDadoForaUlt >= 1) {
            // Marca como desprezada (preserva valor calculado para auditoria)
            camadaDesprezada = util.cloneDeep(ult);
            ult.desprezada = true;
            ult.motivoDesprezo = 'ultimo_metro_antes_da_ponta';
          } else if (ult.cotaBase_m === cotaPonta && !ult.sem_dado) {
            // Não desprezada por estaca curta — registra nota no memorial mais abaixo
            ult.naoDesprezada_motivo = 'estaca_curta_unico_metro_de_atrito';
          }
        }

        const Ql_total_kN = camadas.reduce(function (s, c) {
          if (c.sem_dado || c.desprezada) return s;
          return s + (c.Ql_camada_kN || 0);
        }, 0);

        // ----- PONTA -----
        // Média trinca centrada na cota da ponta: cota+1, cota, cota-1
        // CORREÇÃO #2b: registrar valores reais e clampados em paralelo p/ auditoria
        const nsptsPonta = [];        // valores após clamp (entram na média)
        const nsptsPontaReal = [];    // valores brutos (apenas exibição)
        const cotasUsadasPonta = [];
        [cotaPonta + 1, cotaPonta, cotaPonta - 1].forEach(function (c) {
          if (porCota[c]) {
            nsptsPonta.push(util.clamp(porCota[c].nspt, 1, domain.constants.NSPT_LIMITE_CALCULO));
            nsptsPontaReal.push(porCota[c].nspt_real !== undefined ? porCota[c].nspt_real : porCota[c].nspt);
            cotasUsadasPonta.push(c);
          }
        });

        let np_calc = null;
        let notaPonta = null;
        if (nsptsPonta.length === 0) {
          notaPonta = 'sem_nspt_para_ponta';
        } else if (nsptsPonta.length < 3) {
          notaPonta = `media_parcial_${nsptsPonta.length}_cotas`;
        }
        if (nsptsPonta.length > 0) {
          np_calc = Math.floor(nsptsPonta.reduce(function (s, v) { return s + v; }, 0) / nsptsPonta.length);
        }

        const dadoPonta = porCota[cotaPonta];

        // q_p
        let qp_kPa = null;
        let C_kPa = null, alpha_dq = null, K_kPa = null, alpha_av_pct = null, F1_av = null;
        if (dadoPonta && np_calc !== null) {
          if (metodo === 'DQ') {
            C_kPa = coefs.DQ_C[dadoPonta.solo];
            alpha_dq = coefs.DQ_alpha[dadoPonta.familia][tipo];
            qp_kPa = C_kPa * np_calc * alpha_dq;
          } else {
            const av = coefs.AV_K_alpha[dadoPonta.solo];
            const F1F2 = coefs.AV_F1_F2_fn(tipo, D_m);
            K_kPa = av.K_kPa;
            alpha_av_pct = av.alpha_pct;
            F1_av = F1F2.F1;
            qp_kPa = K_kPa * np_calc / F1_av;
          }
        }

        const Rp_bruta_kN = qp_kPa !== null ? qp_kPa * Ap_m2 : 0;

        const fator_redutor = aplicaRedutor ? coefs.reducaoP[tipo] : 1.00;
        const Rp_apos_redutor_kN = Rp_bruta_kN * fator_redutor;

        // Tratamento de ponta
        let Rp_efetiva_kN;
        if (trat === 'sem_contato') {
          Rp_efetiva_kN = 0;
        } else if (trat === 'contato_com_ressalva') {
          Rp_efetiva_kN = Math.min(Rp_apos_redutor_kN, Ql_total_kN);
        } else {
          Rp_efetiva_kN = Rp_apos_redutor_kN;
        }

        // Checkbox limita_por_atrito (independente)
        let limita_aplicado = false;
        let Rp_final_kN = Rp_efetiva_kN;
        if (limitaP && Rp_efetiva_kN > Ql_total_kN) {
          Rp_final_kN = Ql_total_kN;
          limita_aplicado = true;
        }

        // ----- Q_adm geotécnico -----
        const Rrup_kN = Ql_total_kN + Rp_final_kN;

        let Qadm_parcial_kN = null;
        let Qadm_global_kN;
        let Qadm_geo_kN;

        if (metodo === 'DQ') {
          if (trat === 'sem_contato') {
            // NBR 6122 item 8.2.1.2: força caminho global com Rp=0
            Qadm_global_kN = Ql_total_kN / coefs.DQ_FS.FSg;
            Qadm_geo_kN = Qadm_global_kN;
          } else {
            Qadm_parcial_kN = Ql_total_kN / coefs.DQ_FS.Fl + Rp_final_kN / coefs.DQ_FS.Fp;
            Qadm_global_kN = (Ql_total_kN + Rp_final_kN) / coefs.DQ_FS.FSg;
            Qadm_geo_kN = Math.min(Qadm_parcial_kN, Qadm_global_kN);
          }
        } else {
          // AV não usa FS parcial
          Qadm_global_kN = (Ql_total_kN + Rp_final_kN) / coefs.DQ_FS.FSg;
          Qadm_geo_kN = Qadm_global_kN;
        }

        // Estrutural
        const Qadm_estrutural_kN = Qadm_estrutural_tf !== null && Qadm_estrutural_tf !== undefined
          ? Qadm_estrutural_tf * domain.constants.KN_POR_TF
          : Infinity;

        const Qadm_final_kN = Math.min(Qadm_geo_kN, Qadm_estrutural_kN);

        let rege;
        if (Qadm_estrutural_kN < Qadm_geo_kN) rege = 'estrutural';
        else if (metodo === 'DQ' && Qadm_parcial_kN !== null && Qadm_global_kN < Qadm_parcial_kN) rege = 'geo_global';
        else rege = (metodo === 'DQ' ? 'geo_parcial' : 'geo_global');

        const notas = [];
        if (notaPonta) notas.push(notaPonta);
        if (limita_aplicado) notas.push('Rp_limitado_por_Rl');
        if (camadaDesprezada) notas.push('atrito_ultimo_metro_desprezado');
        // Detecta caso em que regra de desprezo não foi aplicada por estaca curta
        const ultCam = camadas[camadas.length - 1];
        if (ultCam && ultCam.naoDesprezada_motivo) {
          notas.push('regra_desprezo_nao_aplicada_estaca_curta');
        }
        // v2.0.7 (D13 — FIX-F): fuste fora do perfil compatibilizado.
        // Nota redundante por design — cada linha do memorial é autocontida
        // para exportação XLSX/PDF, onde linhas podem ser visualizadas isoladas.
        if (fusteForaDoPerfil_m > 0) {
          notas.push(
            'Trecho de fuste de ' + fusteForaDoPerfil_m.toFixed(2) +
            ' m está acima do topo do perfil compatibilizado (' +
            cotaMaxPerfil + ' m). Atrito lateral nesse trecho foi DESPREZADO ' +
            '(camadas sem dado SPT).'
          );
        }

        memorial.push({
          metodo: metodo,
          cotaPonta_m: cotaPonta,
          profDesdeArrasamento_m: profDesdeArrasamento,
          camadasAtrito: camadas,
          despreza_ultimo_metro: desprezaUltimo,
          camada_desprezada: camadaDesprezada,
          Ql_total_kN: Ql_total_kN,
          np_calc: np_calc,
          np_origem_cotas_m: cotasUsadasPonta,
          np_nspts_clampados: nsptsPonta,    // valores que entraram na média
          np_nspts_reais: nsptsPontaReal,    // valores brutos (auditoria)
          C_kPa: C_kPa,
          alpha_dq: alpha_dq,
          K_kPa: K_kPa,
          alpha_av_pct: alpha_av_pct,
          alpha_av_decimal: alpha_av_pct !== null ? alpha_av_pct / 100 : null,
          F1_av: F1_av,
          qp_kPa: qp_kPa,
          Ap_m2: Ap_m2,
          U_m: U_m,
          Rp_bruta_kN: Rp_bruta_kN,
          fator_redutor_ponta: fator_redutor,
          Rp_apos_redutor_kN: Rp_apos_redutor_kN,
          tratamento_ponta: trat,
          Rp_efetiva_kN: Rp_efetiva_kN,
          limita_por_atrito_aplicado: limita_aplicado,
          Rp_final_kN: Rp_final_kN,
          Rrup_kN: Rrup_kN,
          Qadm_parcial_kN: Qadm_parcial_kN,
          Qadm_global_kN: Qadm_global_kN,
          Qadm_geo_kN: Qadm_geo_kN,
          Qadm_geo_tf: util.kNparaTf(Qadm_geo_kN),
          Qadm_estrutural_tf: Qadm_estrutural_tf,
          Qadm_estrutural_kN: Qadm_estrutural_kN === Infinity ? null : Qadm_estrutural_kN,
          Qadm_final_kN: Qadm_final_kN,
          Qadm_final_tf: util.kNparaTf(Qadm_final_kN),
          rege: rege,
          notas: notas
        });
      });

      return {
        memorial: memorial,
        fusteForaDoPerfil_m: fusteForaDoPerfil_m   // v2.0.7 (D13) — ≥0; positivo = arrasamento acima do topo amostrado
      };
    },

    /**
     * CORREÇÃO v2.0.2 — cálculo de capacidade de carga por furo individual.
     *
     * Itera sobre cada furo SPT, monta perfil isolado daquele furo, e calcula
     * DQ e AV. Resultado permite o engenheiro:
     *   1. Comparar capacidade entre furos (análise de sensibilidade espacial)
     *   2. Identificar furo crítico para cada cota de ponta
     *   3. Justificar a escolha da envoltória conservadora
     *
     * Decisões metodológicas (definidas pelo usuário):
     *   D1 — Trecho entre arrasamento e 1ª leitura SPT = camada sem dado
     *        (não extrapola, consistente com a regra de aterro espesso).
     *   D2 — Cada furo usa SEU próprio solo/família (dado real do sondador,
     *        sem compatibilização).
     *
     * @param {Object} sondagens   — mesmo formato de compatibilizar()
     * @param {Object} estaca      — { tipoEstaca, diametro_m, cotaArrasamento_m, ... }
     * @param {Object} opcoes      — mesmo formato de calcularDQ/AV
     * @returns { resultados, comparativo, metadata }
     */
    calcularPorFuroIndividual: function (sondagens, estaca, opcoes) {
      opcoes = opcoes || {};
      const nomes = Object.keys(sondagens);
      if (nomes.length === 0) {
        return { resultados: [], comparativo: null, metadata: { erro: 'sem_sondagens' } };
      }

      const resultados = [];
      const janela_m = opcoes.janela_m !== undefined ? opcoes.janela_m : 0.50;

      // v2.0.5 (D10 — AJUSTE-C): média dos topos das sondagens p/ alertas de
      // aterro espesso e corte elevado. O critério legado (gap > janela por
      // furo) era inconsistente com a Aba 4 do app, que adota:
      //   A9 (aterro espesso): cotaArrasamento - mediaTopos > +limite
      //   A10 (corte elevado): cotaArrasamento - mediaTopos < -limite
      // Limite default 2,5 m, configurável via opcoes.limiteAterroCorte_m.
      const topos = nomes
        .map(function (n) { return sondagens[n].cotaTopo_m; })
        .filter(function (c) { return c !== null && c !== undefined && Number.isFinite(c); });
      const mediaTopos = topos.length > 0
        ? topos.reduce(function (s, v) { return s + v; }, 0) / topos.length
        : null;
      const LIMITE_ATERRO_CORTE_M = (opcoes && opcoes.limiteAterroCorte_m !== undefined)
        ? opcoes.limiteAterroCorte_m
        : 2.5;

      // Para cada furo, montar perfil individual COMPATIBILIZADO em grade inteira
      // (cálculo DQ/AV exige cotas inteiras na chave porCota[cotaInteira]).
      // Usa a MESMA regra de janela ±0,50m da compatibilização principal,
      // mas restrita às leituras deste único furo.
      nomes.forEach(function (nomeFuro) {
        const s = sondagens[nomeFuro];

        // 1) Leituras com cota absoluta (pode ser fracionária)
        const leiturasComCota = s.leituras.map(function (l) {
          const nspt_calc = l.nspt_calculo !== undefined
            ? l.nspt_calculo
            : Math.min(l.nspt_real, domain.constants.NSPT_LIMITE_CALCULO);
          return {
            cota_m: s.cotaTopo_m - l.profundidade_m,
            profundidade_m: l.profundidade_m,
            nspt_calculo: nspt_calc,
            nspt_real: l.nspt_real,
            impenetravel: l.impenetravel || false,
            solo: l.solo,
            familia: l.familia
          };
        });

        // 2) Faixa de cotas inteiras cobertas pelo furo
        const cotaTopoLeit = leiturasComCota.length > 0
          ? Math.max.apply(null, leiturasComCota.map(function (l) { return l.cota_m; }))
          : null;
        const cotaBaseLeit = leiturasComCota.length > 0
          ? Math.min.apply(null, leiturasComCota.map(function (l) { return l.cota_m; }))
          : null;

        // Cotas inteiras dentro da faixa amostrada (com janela ±0,50m de tolerância
        // nos extremos). Ordem decrescente (topo → base).
        const cotaInteiraTopo = Math.floor(cotaTopoLeit + janela_m + 1e-9);
        const cotaInteiraBase = Math.ceil(cotaBaseLeit - janela_m - 1e-9);
        const perfilFuro = [];
        for (let c = cotaInteiraTopo; c >= cotaInteiraBase; c--) {
          // Busca leitura mais próxima dentro da janela
          const candidatas = leiturasComCota.filter(function (l) {
            return Math.abs(l.cota_m - c) <= janela_m + 1e-9;
          });
          if (candidatas.length === 0) continue;  // sem dado nesta cota → será marcada sem_dado quando _calcularGenerico tentar usar
          candidatas.sort(function (a, b) {
            return Math.abs(a.cota_m - c) - Math.abs(b.cota_m - c);
          });
          const esc = candidatas[0];
          perfilFuro.push({
            cota_m: c,                              // cota inteira (canônica p/ cálculo)
            nspt: esc.nspt_calculo,                 // canônico p/ cálculo (≤ 50)
            nspt_real: esc.nspt_real,               // bruto, p/ auditoria
            impenetravel: esc.impenetravel,         // flag p/ auditoria
            solo: esc.solo,
            familia: esc.familia,
            origemFuro: nomeFuro,
            cota_leitura_m: esc.cota_m              // cota real da leitura escolhida
          });
        }

        // Tentar cálculo. Pode falhar se cota de arrasamento estiver muito
        // abaixo do perfil (estaca seria atravessar terra inexistente). Capturar.
        let dq = null, av = null, erroFuro = null;
        try {
          dq = engine.calcularDQ(perfilFuro, Object.assign({}, opcoes, {
            tipoEstaca: estaca.tipoEstaca,
            diametro_m: estaca.diametro_m,
            cotaArrasamento_m: estaca.cotaArrasamento_m
          }));
        } catch (e) { erroFuro = 'DQ_falhou: ' + e.message; }
        try {
          av = engine.calcularAV(perfilFuro, Object.assign({}, opcoes, {
            tipoEstaca: estaca.tipoEstaca,
            diametro_m: estaca.diametro_m,
            cotaArrasamento_m: estaca.cotaArrasamento_m
          }));
        } catch (e) { erroFuro = (erroFuro || '') + ' AV_falhou: ' + e.message; }

        // Metadados úteis para o engenheiro decidir se este furo é aplicável
        // cotaPrimeiraLeitura_m e cotaUltimaLeitura_m: cotas REAIS das leituras
        // do furo (não as inteiras da grade). Importante para checar gap.
        const cotaPrimeiraLeitura_m = cotaTopoLeit;  // cota real da leitura mais alta
        const cotaUltimaLeitura_m = cotaBaseLeit;     // cota real da leitura mais baixa
        const arrasamento = estaca.cotaArrasamento_m;
        const gapArrasamento_m = (arrasamento !== undefined && cotaPrimeiraLeitura_m !== null)
          ? Math.max(0, arrasamento - cotaPrimeiraLeitura_m)
          : null;

        // v2.0.5 (D10 — AJUSTE-C): alertas A9/A10 baseados em mediaTopos
        const deltaVsMediaTopos_m = (mediaTopos !== null && Number.isFinite(arrasamento))
          ? arrasamento - mediaTopos
          : null;
        const alertaAterroEspesso = (deltaVsMediaTopos_m !== null && deltaVsMediaTopos_m > LIMITE_ATERRO_CORTE_M)
          ? 'Arrasamento ' + arrasamento.toFixed(2) + 'm está ' + deltaVsMediaTopos_m.toFixed(2) +
            'm acima da média dos topos das sondagens (' + mediaTopos.toFixed(2) + 'm). Aterro espesso previsto.'
          : null;
        const alertaCorteElevado = (deltaVsMediaTopos_m !== null && deltaVsMediaTopos_m < -LIMITE_ATERRO_CORTE_M)
          ? 'Arrasamento ' + arrasamento.toFixed(2) + 'm está ' + Math.abs(deltaVsMediaTopos_m).toFixed(2) +
            'm abaixo da média dos topos das sondagens (' + mediaTopos.toFixed(2) + 'm). Corte elevado previsto.'
          : null;

        resultados.push({
          furo: nomeFuro,
          cotaTopoFuro_m: s.cotaTopo_m,
          cotaPrimeiraLeitura_m: cotaPrimeiraLeitura_m,
          cotaUltimaLeitura_m: cotaUltimaLeitura_m,
          gapArrasamentoAteLeitura_m: gapArrasamento_m,        // informativo (preservado)
          // v2.0.5 (D10): alerta legado fica null daqui em diante.
          // Componentes que dependiam dele devem migrar p/ alertaAterroEspesso
          // ou alertaCorteElevado abaixo. Mantemos o campo para retrocompat.
          alertaAterroAcimaLeitura: null,
          gapVsMediaTopos_m: deltaVsMediaTopos_m,              // v2.0.5
          alertaAterroEspesso: alertaAterroEspesso,            // v2.0.5
          alertaCorteElevado: alertaCorteElevado,              // v2.0.5
          perfil: perfilFuro,
          dq: dq,
          av: av,
          erro: erroFuro
        });
      });

      // ----- COMPARATIVO entre furos -----
      // Para cada cota de ponta presente em PELO MENOS UM furo, listar Q_adm
      // de cada furo (null se aquele furo não cobre a cota).
      const todasCotasPonta = new Set();
      resultados.forEach(function (r) {
        if (r.dq && r.dq.memorial) r.dq.memorial.forEach(function (m) { todasCotasPonta.add(m.cotaPonta_m); });
        if (r.av && r.av.memorial) r.av.memorial.forEach(function (m) { todasCotasPonta.add(m.cotaPonta_m); });
      });
      const cotasPontaOrdenadas = Array.from(todasCotasPonta).sort(function (a, b) { return b - a; });

      const dq_por_furo = {};
      const av_por_furo = {};
      resultados.forEach(function (r) {
        dq_por_furo[r.furo] = {};
        av_por_furo[r.furo] = {};
        if (r.dq && r.dq.memorial) {
          r.dq.memorial.forEach(function (m) {
            dq_por_furo[r.furo][m.cotaPonta_m] = m.Qadm_final_tf;
          });
        }
        if (r.av && r.av.memorial) {
          r.av.memorial.forEach(function (m) {
            av_por_furo[r.furo][m.cotaPonta_m] = m.Qadm_final_tf;
          });
        }
      });

      // Identifica furo mais desfavorável em cada cota
      const furoMaisDesfavoravel_DQ_porCota = {};
      const furoMaisDesfavoravel_AV_porCota = {};
      const estatisticasPorCota = {};

      cotasPontaOrdenadas.forEach(function (c) {
        let menorDq = Infinity, furoMenorDq = null;
        let menorAv = Infinity, furoMenorAv = null;
        let maiorDq = -Infinity, furoMaiorDq = null;
        let maiorAv = -Infinity, furoMaiorAv = null;
        const valoresDq = [], valoresAv = [];
        resultados.forEach(function (r) {
          const vDq = dq_por_furo[r.furo][c];
          const vAv = av_por_furo[r.furo][c];
          if (vDq !== undefined && vDq !== null) {
            valoresDq.push(vDq);
            if (vDq < menorDq) { menorDq = vDq; furoMenorDq = r.furo; }
            if (vDq > maiorDq) { maiorDq = vDq; furoMaiorDq = r.furo; }
          }
          if (vAv !== undefined && vAv !== null) {
            valoresAv.push(vAv);
            if (vAv < menorAv) { menorAv = vAv; furoMenorAv = r.furo; }
            if (vAv > maiorAv) { maiorAv = vAv; furoMaiorAv = r.furo; }
          }
        });
        furoMaisDesfavoravel_DQ_porCota[c] = furoMenorDq;
        furoMaisDesfavoravel_AV_porCota[c] = furoMenorAv;
        estatisticasPorCota[c] = {
          DQ: {
            menor_tf: furoMenorDq ? menorDq : null,
            maior_tf: furoMaiorDq ? maiorDq : null,
            dispersao_tf: furoMenorDq && furoMaiorDq ? (maiorDq - menorDq) : null,
            dispersao_pct: furoMenorDq && furoMaiorDq && maiorDq > 0
              ? Math.round(((maiorDq - menorDq) / maiorDq) * 100)
              : null,
            n_furos: valoresDq.length
          },
          AV: {
            menor_tf: furoMenorAv ? menorAv : null,
            maior_tf: furoMaiorAv ? maiorAv : null,
            dispersao_tf: furoMenorAv && furoMaiorAv ? (maiorAv - menorAv) : null,
            dispersao_pct: furoMenorAv && furoMaiorAv && maiorAv > 0
              ? Math.round(((maiorAv - menorAv) / maiorAv) * 100)
              : null,
            n_furos: valoresAv.length
          }
        };
      });

      return {
        resultados: resultados,
        comparativo: {
          cotas: cotasPontaOrdenadas,
          dq_por_furo: dq_por_furo,
          av_por_furo: av_por_furo,
          furoMaisDesfavoravel_DQ_porCota: furoMaisDesfavoravel_DQ_porCota,
          furoMaisDesfavoravel_AV_porCota: furoMaisDesfavoravel_AV_porCota,
          estatisticasPorCota: estatisticasPorCota
        },
        metadata: {
          n_furos: nomes.length,
          n_furos_com_dq: resultados.filter(function (r) { return r.dq !== null; }).length,
          n_furos_com_av: resultados.filter(function (r) { return r.av !== null; }).length,
          mediaTopos_m: mediaTopos,                     // v2.0.5 (D10)
          limiteAterroCorte_m: LIMITE_ATERRO_CORTE_M,   // v2.0.5 (D10)
          decisoes: {
            D1: 'Trecho entre arrasamento e 1ª leitura = camada sem dado (não extrapola)',
            D2: 'Cada furo usa seu próprio solo/família (dado real, sem compatibilização)',
            D10: 'Alertas de aterro/corte baseados em (cotaArrasamento - mediaTopos), limite ±' + LIMITE_ATERRO_CORTE_M + 'm'
          }
        }
      };
    },

    /**
     * v2.0.3 — calcularPorInterpolacao
     *
     * Fluxo conforme decisão técnica do usuário:
     *   (a) calcular DQ/AV por furo individual (reusa calcularPorFuroIndividual)
     *   (b) para cada cota de ponta, coletar Q_adm de cada furo
     *   (c) aplicar interpolação por locação (peso linear normalizado) nos
     *       3 furos mais próximos da estaca
     *   (d) repetir para todas as cotas
     *   (e) retornar curva interpolada de Q_adm × cota
     *
     * Decisões metodológicas embutidas:
     *   - Interpola CAPACIDADES (Q_adm em tf), não NSPT/solo. Cada furo é
     *     calculado com seu próprio perfil (Decisão D2 de calcularPorFuro).
     *   - Peso = (1 - d_i/Σd) / soma. Regra `d_min < 0,5m → 100% no próximo`.
     *   - Apenas furos com Q_adm definido em uma cota entram na interpolação
     *     daquela cota (3 mais próximos cuja capacidade existe).
     *   - Memorial expõe os pesos por cota para auditoria.
     *
     * @param {Object} sondagens — { nome: {cotaTopo_m, profundidadeFinal_m, leituras, x?, y?} }
     *                             Furos precisam ter coordenadas para interpolação.
     * @param {Object} estaca    — { tipoEstaca, diametro_m, cotaArrasamento_m, x, y }
     * @param {Object} opcoes    — mesmo formato de calcularDQ/AV
     * @returns { curva, memorial, metadata }
     */
    calcularPorInterpolacao: function (sondagens, estaca, opcoes) {
      opcoes = opcoes || {};
      const raioMin = opcoes.raioMinimo_m !== undefined ? opcoes.raioMinimo_m : 0.5;

      // Pré-validação: estaca e furos precisam ter coordenadas
      if (estaca.x === undefined || estaca.y === undefined) {
        return { curva: [], memorial: [], metadata: { erro: 'estaca_sem_coordenadas' } };
      }
      const nomes = Object.keys(sondagens);
      const semCoords = nomes.filter(function (n) {
        return sondagens[n].x === undefined || sondagens[n].y === undefined;
      });
      if (semCoords.length > 0) {
        return { curva: [], memorial: [], metadata: {
          erro: 'furos_sem_coordenadas', furosAfetados: semCoords
        }};
      }

      // (a) Calcular por furo individual
      const porFuro = engine.calcularPorFuroIndividual(sondagens, estaca, opcoes);
      if (!porFuro.resultados || porFuro.resultados.length === 0) {
        return { curva: [], memorial: [], metadata: { erro: 'sem_resultados_por_furo' } };
      }

      // Montar mapa de furos com coordenadas para passar ao interpolador
      const furosCoords = {};
      nomes.forEach(function (n) {
        furosCoords[n] = { x: sondagens[n].x, y: sondagens[n].y };
      });

      // (b-d) Iterar sobre cada cota presente no comparativo
      const cotas = porFuro.comparativo.cotas; // ordem decrescente (topo → base)
      const memorial = [];

      cotas.forEach(function (cotaPonta) {
        // Para DQ
        const valoresDq = {};
        for (const n of nomes) {
          const v = porFuro.comparativo.dq_por_furo[n][cotaPonta];
          if (v !== undefined && v !== null) valoresDq[n] = v;
        }
        const interpDq = engine.interpolarValorPorFuros(
          estaca, furosCoords, valoresDq,
          { raioMinimo_m: raioMin, unidade: 'tf' }
        );

        // Para AV
        const valoresAv = {};
        for (const n of nomes) {
          const v = porFuro.comparativo.av_por_furo[n][cotaPonta];
          if (v !== undefined && v !== null) valoresAv[n] = v;
        }
        const interpAv = engine.interpolarValorPorFuros(
          estaca, furosCoords, valoresAv,
          { raioMinimo_m: raioMin, unidade: 'tf' }
        );

        memorial.push({
          cotaPonta_m: cotaPonta,
          dq: {
            Qadm_interpolado_tf: interpDq.valorInterpolado,
            metodo: interpDq.metodo,
            furosUsados: interpDq.furosUsados,
            unidade: interpDq.unidade,
            n_furos_disponiveis: Object.keys(valoresDq).length
          },
          av: {
            Qadm_interpolado_tf: interpAv.valorInterpolado,
            metodo: interpAv.metodo,
            furosUsados: interpAv.furosUsados,
            unidade: interpAv.unidade,
            n_furos_disponiveis: Object.keys(valoresAv).length
          }
        });
      });

      // (e) Curva consolidada
      const curva = memorial.map(function (m) {
        return {
          cotaPonta_m: m.cotaPonta_m,
          Qadm_DQ_tf: m.dq.Qadm_interpolado_tf,
          Qadm_AV_tf: m.av.Qadm_interpolado_tf
        };
      });

      return {
        curva: curva,
        memorial: memorial,
        metadata: {
          n_cotas: cotas.length,
          n_furos_total: nomes.length,
          coordenadasEstaca: { x: estaca.x, y: estaca.y },
          regraPeso: 'linear_normalizado',
          formulaPeso: 'peso_i = (1 - d_i/Σd) / Σ(1 - d_j/Σd)',
          raioMinimoUsado_m: raioMin,
          decisoes: {
            D3: 'Interpolar capacidades Q_adm (em tf), não NSPT/solo',
            D4: 'Peso linear normalizado. d_min < raioMin → 100% no furo mais próximo'
          }
        }
      };
    },

    /**
     * v2.0.3 — montarPerfilMedio
     *
     * Monta o perfil de NSPT médio compatibilizado para alimentar calcularDQ/AV.
     * Em cotas heterogêneas, o tratamento depende do submodo:
     *
     *   '2.1_predominante'  — Se familiaPred existe, usa a média daquela família
     *                         (com o solo predominante). Em heterogeneidade pura
     *                         (sem predominância), bloqueia.
     *
     *   '2.2_conservador'   — Em cotas heterogêneas, escolhe o ramo com MENOR
     *                         NSPT médio entre as TRÊS famílias presentes
     *                         (Coesivo, Granular, Intermediário). Proxy razoável
     *                         para menor Q_adm: o NSPT menor tende a dar menor
     *                         capacidade no DQ/AV em regime normal.
     *                         → v2.0.4 (D6): até v2.0.3, Intermediário era
     *                         ignorado nesta decisão — bug semântico corrigido.
     *
     *   '2.3_dois_paralelos' — Entrega ATÉ TRÊS perfis paralelos (coesivo,
     *                          granular, intermediário) para a UI calcular
     *                          separadamente. O nome do submodo é mantido por
     *                          retrocompatibilidade, mas conceitualmente é
     *                          "perfis paralelos por família".
     *                          Retorno: { perfilCoesivo, perfilGranular,
     *                          perfilIntermediario }. Cada perfil pode estar
     *                          vazio se nenhuma cota tem aquela família.
     *                          → v2.0.4 (D6): até v2.0.3 entregava apenas dois
     *                          perfis (coesivo e granular) — Intermediário
     *                          ignorado.
     *
     * Em cotas homogêneas, os três submodos colapsam para o mesmo resultado:
     * média da família única + solo predominante.
     *
     * NSPT médio sai como Math.floor (decisão prévia do usuário). Solo predominante
     * vem direto de compatibilizacao.resultados[i].soloPred. Família vem de
     * familiaPred.
     *
     * @param {Object} compatibilizacao — saída de engine.compatibilizar()
     * @param {string} submodo          — '2.1_predominante' | '2.2_conservador' | '2.3_dois_paralelos'
     * @returns {Object} formato depende do submodo (ver acima)
     */
    montarPerfilMedio: function (compatibilizacao, submodo) {
      submodo = submodo || '2.2_conservador';
      const submodosValidos = ['2.1_predominante', '2.2_conservador', '2.3_dois_paralelos'];
      if (submodosValidos.indexOf(submodo) === -1) {
        return { erro: 'submodo_invalido', submodosValidos: submodosValidos };
      }

      const resultados = compatibilizacao.resultados;
      if (!resultados || resultados.length === 0) {
        return { erro: 'compatibilizacao_vazia' };
      }

      const cotasHeterogeneasBloqueadas = [];
      const avisos = [];

      // ------- 2.3: perfis paralelos por família -------
      // CORREÇÃO v2.0.4 (D6): até v2.0.3 retornava apenas 2 perfis paralelos
      // (Coesivo e Granular). Intermediário era completamente ignorado, mesmo
      // quando presente na cota. Agora monta até 3 perfis paralelos.
      // Retrocompat.: o chamador antigo que olha apenas perfilCoesivo/perfilGranular
      // continua funcionando; perfilIntermediario é campo aditivo.
      if (submodo === '2.3_dois_paralelos') {
        const perfilCoesivo = [];
        const perfilGranular = [];
        const perfilIntermediario = [];
        const camadasSemCoesivo = [];
        const camadasSemGranular = [];
        const camadasSemIntermediario = [];

        resultados.forEach(function (c) {
          // Em cotas homogêneas, media.coesivo/granular/intermediario pode ser null
          // mas media.familiaPredominante traz a média da família única.
          let mediaCoesivoEfetiva = c.media.coesivo;
          let mediaGranularEfetiva = c.media.granular;
          let mediaIntermediarioEfetiva = c.media.intermediario;
          if (!c.heterogeneo && c.media.familiaPredominante !== null) {
            if (c.familiaPred === 'Coesivo')        mediaCoesivoEfetiva = c.media.familiaPredominante;
            if (c.familiaPred === 'Granular')       mediaGranularEfetiva = c.media.familiaPredominante;
            if (c.familiaPred === 'Intermediário') mediaIntermediarioEfetiva = c.media.familiaPredominante;
          }

          // Coesivo
          // CORREÇÃO v2.0.6 (D11 — FIX-D): mesma classe do BUG-A, mas no
          // submodo 2.3. Os rótulos descritivos "Argila (média família coesiva)"
          // etc. quebravam calcularDQ/AV quando a cota (heterogênea) entrava
          // como camada de ponta ou atrito. Solução simétrica à v2.0.5:
          // `solo` canônico + `solo_rotulo_auditoria` aditivo (null quando
          // não há rotulagem especial, para schema consistente).
          // Coesivo
          if (mediaCoesivoEfetiva !== null && mediaCoesivoEfetiva !== undefined) {
            perfilCoesivo.push({
              cota_m: c.cotaRef_m,
              nspt: Math.floor(mediaCoesivoEfetiva),
              nspt_real: mediaCoesivoEfetiva,
              impenetravel: false,
              solo: c.heterogeneo ? 'Argila' : c.soloPred,
              solo_rotulo_auditoria: c.heterogeneo ? 'Argila (média família coesiva)' : null,
              familia: 'Coesivo',
              origemFuro: 'media_familia_coesiva'
            });
          } else {
            camadasSemCoesivo.push(c.cotaRef_m);
          }
          // Granular
          if (mediaGranularEfetiva !== null && mediaGranularEfetiva !== undefined) {
            perfilGranular.push({
              cota_m: c.cotaRef_m,
              nspt: Math.floor(mediaGranularEfetiva),
              nspt_real: mediaGranularEfetiva,
              impenetravel: false,
              solo: c.heterogeneo ? 'Areia' : c.soloPred,
              solo_rotulo_auditoria: c.heterogeneo ? 'Areia (média família granular)' : null,
              familia: 'Granular',
              origemFuro: 'media_familia_granular'
            });
          } else {
            camadasSemGranular.push(c.cotaRef_m);
          }
          // Intermediário (v2.0.4)
          if (mediaIntermediarioEfetiva !== null && mediaIntermediarioEfetiva !== undefined) {
            perfilIntermediario.push({
              cota_m: c.cotaRef_m,
              nspt: Math.floor(mediaIntermediarioEfetiva),
              nspt_real: mediaIntermediarioEfetiva,
              impenetravel: false,
              solo: c.heterogeneo ? 'Silte' : c.soloPred,
              solo_rotulo_auditoria: c.heterogeneo ? 'Silte (média família intermediária)' : null,
              familia: 'Intermediário',
              origemFuro: 'media_familia_intermediaria'
            });
          } else {
            camadasSemIntermediario.push(c.cotaRef_m);
          }
        });

        // CORREÇÃO v2.0.5 (D9 — BUG-B): até v2.0.4, o submodo 2.3 retornava
        // `avisos` como objeto, enquanto 2.1/2.2 retornavam como array.
        // Inconsistência de tipo quebrava consumidores que faziam avisos.map(...).
        // Agora todos os submodos retornam avisos como array de objetos
        // {cota_m, tipo, ramo, justificativa}. O resumo agregado preserva-se
        // em metadata.camadasSemDado_resumo para auditoria.
        const avisosArray = [];
        camadasSemCoesivo.forEach(function (cota) {
          avisosArray.push({
            cota_m: cota,
            tipo: 'camada_sem_dado',
            ramo: 'Coesivo',
            justificativa: 'Cota não tem furo da família Coesivo — ramo paralelo não cobre esta cota'
          });
        });
        camadasSemGranular.forEach(function (cota) {
          avisosArray.push({
            cota_m: cota,
            tipo: 'camada_sem_dado',
            ramo: 'Granular',
            justificativa: 'Cota não tem furo da família Granular — ramo paralelo não cobre esta cota'
          });
        });
        camadasSemIntermediario.forEach(function (cota) {
          avisosArray.push({
            cota_m: cota,
            tipo: 'camada_sem_dado',
            ramo: 'Intermediário',
            justificativa: 'Cota não tem furo da família Intermediário — ramo paralelo não cobre esta cota'
          });
        });

        return {
          submodo: submodo,
          perfilCoesivo: perfilCoesivo,
          perfilGranular: perfilGranular,
          perfilIntermediario: perfilIntermediario,  // v2.0.4 — aditivo
          avisos: avisosArray,                       // v2.0.5 — agora array (D9)
          metadata: {
            descricao: 'Perfis paralelos por família (v2.0.4: até 3 perfis — Coesivo, Granular, Intermediário). UI deve calcular DQ/AV separadamente para cada ramo presente.',
            n_cotas_coesivo: perfilCoesivo.length,
            n_cotas_granular: perfilGranular.length,
            n_cotas_intermediario: perfilIntermediario.length,
            camadasSemDado_resumo: {                 // v2.0.5 — resumo agregado preservado em metadata
              coesivo_m: camadasSemCoesivo,
              granular_m: camadasSemGranular,
              intermediario_m: camadasSemIntermediario
            }
          }
        };
      }

      // ------- 2.1 e 2.2: perfil único -------
      const perfil = [];

      resultados.forEach(function (c) {
        if (!c.heterogeneo) {
          // Cota homogênea — usar média da família predominante
          if (c.media.familiaPredominante === null || c.media.familiaPredominante === undefined) {
            // Sem dado: pula
            return;
          }
          perfil.push({
            cota_m: c.cotaRef_m,
            nspt: Math.floor(c.media.familiaPredominante),
            nspt_real: c.media.familiaPredominante,
            impenetravel: false,
            solo: c.soloPred,
            solo_rotulo_auditoria: null,   // v2.0.6 (D11): schema consistente
            familia: c.familiaPred,
            origemFuro: 'media_compatibilizada'
          });
        } else {
          // Cota heterogênea — submodo decide
          if (submodo === '2.1_predominante') {
            // familiaPred é 'HETEROGENEO' nesse caso (sem predominância real).
            // Bloqueia ou aceita decisão do projetista; aqui registramos como
            // 'bloqueada' para a UI exigir intervenção.
            cotasHeterogeneasBloqueadas.push(c.cotaRef_m);
            return; // não inclui no perfil; a UI vai mostrar alerta
          }
          if (submodo === '2.2_conservador') {
            // Ramo conservador: escolhe a família com MENOR NSPT médio entre
            // as TRÊS famílias presentes na cota (Coesivo, Granular, Intermediário).
            // CORREÇÃO v2.0.4 (D6): até v2.0.3, Intermediário era ignorado nesta
            // decisão — bug semântico que subestimava a conservadorismo em cotas
            // com lentes de solo intermediário.
            const cN = c.media.coesivo;
            const gN = c.media.granular;
            const iN = c.media.intermediario;
            if (cN === null && gN === null && iN === null) return;

            // Construir lista de candidatos não-nulos com seus identificadores
            const candidatos = [];
            if (cN !== null) candidatos.push({ familia: 'Coesivo', nspt: cN });
            if (gN !== null) candidatos.push({ familia: 'Granular', nspt: gN });
            if (iN !== null) candidatos.push({ familia: 'Intermediário', nspt: iN });
            // Ordenar pelo menor NSPT (estável: em empate, ordem de inserção
            // acima privilegia Coesivo → Granular → Intermediário, mantendo
            // determinismo para auditoria)
            candidatos.sort(function (a, b) { return a.nspt - b.nspt; });
            const escolhido = candidatos[0];

            // CORREÇÃO v2.0.5 (D8 — BUG-A): o campo `solo` precisa ser nome
            // canônico (chave válida em AV_K_alpha, DQ_C). Até v2.0.4, o rótulo
            // descritivo "Argila (ramo conservador heterogêneo)" era atribuído
            // a `solo`, fazendo calcularAV crashar com
            // "Cannot read properties of undefined (reading 'K_kPa')" quando a
            // cota heterogênea entrava como camada de atrito. calcularDQ
            // também crasharia se a ponta caísse em cota heterogênea (latente).
            // Solução: `solo` canônico + `solo_rotulo_auditoria` aditivo.
            const soloCanonico = escolhido.familia === 'Coesivo' ? 'Argila'
                               : escolhido.familia === 'Granular' ? 'Areia'
                               : 'Silte';

            perfil.push({
              cota_m: c.cotaRef_m,
              nspt: Math.floor(escolhido.nspt),
              nspt_real: escolhido.nspt,
              impenetravel: false,
              solo: soloCanonico,
              solo_rotulo_auditoria: soloCanonico + ' (ramo conservador heterogêneo)',
              familia: escolhido.familia,
              origemFuro: 'media_conservador_heterogeneo'
            });
            avisos.push({
              cota_m: c.cotaRef_m,
              tipo: 'heterogenea_ramo_escolhido',
              ramoEscolhido: escolhido.familia,
              nspt_coesivo: cN,
              nspt_granular: gN,
              nspt_intermediario: iN,
              justificativa: 'Família ' + escolhido.familia +
                ' escolhida por ter o menor NSPT médio entre as famílias presentes na cota'
            });
          }
        }
      });

      return {
        submodo: submodo,
        perfil: perfil,
        avisos: avisos,
        cotasHeterogeneasBloqueadas_m: cotasHeterogeneasBloqueadas,
        metadata: {
          descricao: submodo === '2.1_predominante'
            ? 'Família predominante — cotas heterogêneas bloqueadas para decisão do projetista'
            : 'Ramo conservador — em cotas heterogêneas, escolhe família com menor NSPT médio',
          n_cotas: perfil.length,
          n_cotas_bloqueadas: cotasHeterogeneasBloqueadas.length
        }
      };
    },

    /**
     * Interpolação por locação: estaca não-coincidente com furo.
     *
     * v2.0.3 — refatorada para ser genérica em unidade. O chamador é
     * responsável por garantir consistência (todos os valoresPorFuro na
     * mesma unidade) e por informar o rótulo `unidade` para auditoria.
     *
     * Fórmula de peso: LINEAR NORMALIZADO (decisão técnica do usuário).
     *   peso_i = (1 - d_i / Σd) / Σ(1 - d_j / Σd)
     * com proteção `d_min < raioMinimo_m → 100% no furo mais próximo`.
     *
     * Nota técnica: o peso linear normalizado é matematicamente mais suave
     * que inverso da distância, mas TEM RESPOSTA SATURADA — furos muito
     * distantes ainda recebem peso ~1/N no limite. O memorial DEVE expor
     * a tabela de pesos para auditoria. Em cenários com d_max >> d_min,
     * considerar ajustar `raioMinimo_m` ou usar a interpretação inversa.
     *
     * @param {Object} estaca           — { x, y } ou {coordenadas: {x, y}}
     * @param {Object} furos            — { nome: { x, y } | { coordenadas: ... } }
     * @param {Object} valoresPorFuro   — { nome: valor numérico }
     * @param {Object} params           — { raioMinimo_m?, unidade? }
     * @returns { valorInterpolado, unidade, furosUsados, metodo }
     */
    interpolarValorPorFuros: function (estaca, furos, valoresPorFuro, params) {
      params = params || {};
      const raioMin = params.raioMinimo_m !== undefined ? params.raioMinimo_m : 0.5;
      const unidade = params.unidade || 'desconhecida';

      const distancias = [];
      for (const nome in furos) {
        if (valoresPorFuro[nome] === undefined || valoresPorFuro[nome] === null) continue;
        const d = util.distanciaEuclidiana(estaca, furos[nome]);
        distancias.push({ nome: nome, distancia: d, valor: valoresPorFuro[nome] });
      }
      if (distancias.length === 0) {
        return { valorInterpolado: null, unidade: unidade, furosUsados: [], metodo: 'sem_dado' };
      }
      distancias.sort(function (a, b) { return a.distancia - b.distancia; });

      // Proteção: estaca quase em cima de um furo
      if (distancias[0].distancia < raioMin) {
        return {
          valorInterpolado: distancias[0].valor,
          unidade: unidade,
          furosUsados: [{
            nome: distancias[0].nome,
            distancia_m: distancias[0].distancia,
            peso: 1.0,
            valor: distancias[0].valor
          }],
          metodo: 'furo_proximo_dminimo'
        };
      }

      // Caso degenerado: apenas 1 furo disponível (e além do raioMin).
      // A ponderação linear normalizada exige ≥ 2 furos — com 1 furo o
      // numerador (1 - d/Σd) = 0, levando a 0/0 = NaN. Aqui o único valor
      // disponível é usado integralmente (peso 1.0), sinalizando a limitação
      // pelo método 'furo_unico_disponivel'.
      if (distancias.length === 1) {
        return {
          valorInterpolado: distancias[0].valor,
          unidade: unidade,
          furosUsados: [{
            nome: distancias[0].nome,
            distancia_m: distancias[0].distancia,
            peso: 1.0,
            valor: distancias[0].valor
          }],
          metodo: 'furo_unico_disponivel'
        };
      }

      // Peso linear normalizado nos 3 furos mais próximos
      // peso_i = (1 - d_i/Σd) / Σ(1 - d_j/Σd)
      const tres = distancias.slice(0, 3);
      const sumD = tres.reduce(function (s, f) { return s + f.distancia; }, 0);
      const numeradores = tres.map(function (f) { return 1 - f.distancia / sumD; });
      const sumNum = numeradores.reduce(function (s, x) { return s + x; }, 0);
      // sumNum nunca é zero se ≥ 2 furos com distância > 0 (caso degenerado
      // de todos coincidentes em uma só posição é tratado pela proteção raioMin)
      const pesos = numeradores.map(function (x) { return x / sumNum; });
      const valor = tres.reduce(function (s, f, i) { return s + pesos[i] * f.valor; }, 0);

      return {
        valorInterpolado: valor,
        unidade: unidade,
        furosUsados: tres.map(function (f, i) {
          return {
            nome: f.nome,
            distancia_m: f.distancia,
            peso: pesos[i],
            valor: f.valor
          };
        }),
        metodo: 'ponderada_3furos_linear_normalizado'
      };
    },

    /**
     * @deprecated Usar interpolarValorPorFuros. Mantida para compatibilidade
     * com chamadas que esperam saída em kN.
     */
    interpolarEstacaPorFuros: function (estaca, furos, valoresPorFuro, params) {
      const r = engine.interpolarValorPorFuros(estaca, furos, valoresPorFuro,
        Object.assign({}, params, { unidade: 'kN' }));
      // Manter chave antiga p/ retrocompatibilidade
      return {
        valorInterpolado_kN: r.valorInterpolado,
        furosUsados: r.furosUsados.map(function (f) {
          return { nome: f.nome, distancia_m: f.distancia_m, peso: f.peso, valor_kN: f.valor };
        }),
        metodo: r.metodo
      };
    },

    /**
     * Sugere agrupamento de domínios geotécnicos por similaridade do perfil NSPT.
     * Implementação simples: k-means com k=2, vetor de assinatura = NSPT por cota inteira comum.
     */
    sugerirAgrupamentoDominios: function (furos) {
      const nomes = Object.keys(furos);
      if (nomes.length < 3) {
        return { sugestao: 'nao_agrupar', justificativa: 'Poucos furos para agrupamento (mín. 3).', silhouetteScore: null, k: null, agrupamentos: [] };
      }

      // Cotas comuns (inteiras, com leitura em todos os furos)
      // CORREÇÃO #3: usar nspt_calculo (não nspt_real) — furos que bateram em
      // impenetrabilidade em cotas distintas (75, 85, 100 golpes) devem ser
      // tratados como geotecnicamente equivalentes para fins de agrupamento.
      // O sinal de impenetrabilidade é preservado em outros lugares (envoltória,
      // alerta de inversão); aqui o objetivo é similaridade de perfil.
      const cotasPorFuro = {};
      nomes.forEach(function (n) {
        cotasPorFuro[n] = furos[n].leituras.map(function (l) {
          const nspt_calc = l.nspt_calculo !== undefined
            ? l.nspt_calculo
            : Math.min(l.nspt_real, domain.constants.NSPT_LIMITE_CALCULO);
          return { cota: Math.round(furos[n].cotaTopo_m - l.profundidade_m), nspt: nspt_calc };
        });
      });

      const cotasComuns = (function () {
        let conjunto = null;
        nomes.forEach(function (n) {
          const set = new Set(cotasPorFuro[n].map(function (c) { return c.cota; }));
          if (conjunto === null) conjunto = set;
          else conjunto = new Set(Array.from(conjunto).filter(function (c) { return set.has(c); }));
        });
        return Array.from(conjunto).sort(function (a, b) { return b - a; });
      })();

      if (cotasComuns.length < 3) {
        return { sugestao: 'nao_agrupar', justificativa: 'Cotas comuns insuficientes (mín. 3).', silhouetteScore: null, k: null, agrupamentos: [] };
      }

      // Vetor de assinatura por furo
      const vetores = {};
      nomes.forEach(function (n) {
        const mapa = {};
        cotasPorFuro[n].forEach(function (c) { mapa[c.cota] = c.nspt; });
        vetores[n] = cotasComuns.map(function (c) { return mapa[c]; });
      });

      // k-means k=2
      const km = engine._kmeans(nomes, vetores, 2);
      const sil = engine._silhouetteSimplificado(nomes, vetores, km.atribuicoes);

      // v2.0.6 (D12 — AJUSTE-E): threshold 0.50→0.30 com 3 níveis de confiança.
      // Embasamento: Rousseeuw (1987), faixas clássicas do silhouette:
      //   > 0.50  — estrutura razoável-forte
      //   0.30-0.50 — estrutura fraca mas detectável (era ignorada até v2.0.5)
      //   ≤ 0.30  — sem estrutura de grupos (ruído)
      const SIL_FORTE = 0.50;
      const SIL_FRACA = 0.30;

      if (sil <= SIL_FRACA) {
        return {
          sugestao: 'nao_agrupar',
          silhouetteScore: sil,
          k: 2,
          agrupamentos: [],
          confianca: 'nenhuma',
          justificativa: 'Silhouette score = ' + sil.toFixed(2) +
            ' ≤ 0.30: furos suficientemente similares (sem estrutura de grupos detectável).'
        };
      }

      // sil > 0.30 → sugerir agrupamento (forte ou fraco)
      const confianca = sil > SIL_FORTE ? 'forte' : 'fraca';
      const justificativa = sil > SIL_FORTE
        ? 'Silhouette score = ' + sil.toFixed(2) +
          ' > 0.50 indica boa separação entre os grupos.'
        : 'Silhouette score = ' + sil.toFixed(2) +
          ' entre 0.30 e 0.50: separação fraca mas detectável. Avalie criticamente os agrupamentos antes de aplicar.';

      const agrupamentos = [
        { nome: 'Grupo 1', furos: nomes.filter(function (n, i) { return km.atribuicoes[i] === 0; }) },
        { nome: 'Grupo 2', furos: nomes.filter(function (n, i) { return km.atribuicoes[i] === 1; }) }
      ];
      return {
        sugestao: 'agrupar',
        silhouetteScore: sil,
        k: 2,
        agrupamentos: agrupamentos,
        confianca: confianca,
        justificativa: justificativa
      };
    },

    _kmeans: function (nomes, vetores, k) {
      const dim = vetores[nomes[0]].length;
      // Centroides: primeiros k furos
      let centroides = [];
      for (let i = 0; i < k; i++) centroides.push(vetores[nomes[i]].slice());

      let atribuicoes = nomes.map(function () { return 0; });
      const distEuc = function (a, b) {
        let s = 0;
        for (let i = 0; i < dim; i++) s += (a[i] - b[i]) * (a[i] - b[i]);
        return Math.sqrt(s);
      };

      for (let iter = 0; iter < 50; iter++) {
        // Atribuir
        const novas = nomes.map(function (n) {
          let melhor = 0, distMin = distEuc(vetores[n], centroides[0]);
          for (let c = 1; c < k; c++) {
            const d = distEuc(vetores[n], centroides[c]);
            if (d < distMin) { distMin = d; melhor = c; }
          }
          return melhor;
        });
        // Convergiu?
        if (novas.every(function (v, i) { return v === atribuicoes[i]; })) {
          atribuicoes = novas;
          break;
        }
        atribuicoes = novas;
        // Recalcular centroides
        for (let c = 0; c < k; c++) {
          const grupo = nomes.filter(function (n, i) { return atribuicoes[i] === c; });
          if (grupo.length === 0) continue;
          const novoC = new Array(dim).fill(0);
          grupo.forEach(function (n) {
            for (let i = 0; i < dim; i++) novoC[i] += vetores[n][i];
          });
          for (let i = 0; i < dim; i++) novoC[i] /= grupo.length;
          centroides[c] = novoC;
        }
      }

      return { centroides: centroides, atribuicoes: atribuicoes };
    },

    _silhouetteSimplificado: function (nomes, vetores, atribuicoes) {
      const distEuc = function (a, b) {
        let s = 0;
        for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) * (a[i] - b[i]);
        return Math.sqrt(s);
      };
      const scores = [];
      for (let i = 0; i < nomes.length; i++) {
        const meuGrupo = atribuicoes[i];
        const intra = [], inter = [];
        for (let j = 0; j < nomes.length; j++) {
          if (i === j) continue;
          const d = distEuc(vetores[nomes[i]], vetores[nomes[j]]);
          if (atribuicoes[j] === meuGrupo) intra.push(d); else inter.push(d);
        }
        if (intra.length === 0 || inter.length === 0) { scores.push(0); continue; }
        const a = intra.reduce(function (s, v) { return s + v; }, 0) / intra.length;
        const b = inter.reduce(function (s, v) { return s + v; }, 0) / inter.length;
        scores.push((b - a) / Math.max(a, b));
      }
      return scores.reduce(function (s, v) { return s + v; }, 0) / scores.length;
    },

    /**
     * Calcula divergência entre DQ e AV cota a cota
     */
    calcularDivergenciaDqAv: function (resultadosDQ, resultadosAV) {
      const memDQ = resultadosDQ.memorial || [];
      const memAV = resultadosAV.memorial || [];
      const out = [];
      memDQ.forEach(function (dq) {
        const av = memAV.find(function (m) { return m.cotaPonta_m === dq.cotaPonta_m; });
        if (!av) return;
        const Qdq = dq.Qadm_final_tf;
        const Qav = av.Qadm_final_tf;
        const min = Math.min(Qdq, Qav);
        const dif = min > 0 ? Math.abs(Qdq - Qav) / min : 0;
        let cls;
        if (dif <= 0.25) cls = 'convergencia_aceitavel';
        else if (dif <= 0.50) cls = 'divergencia_moderada';
        else cls = 'divergencia_alta';
        out.push({
          cotaPonta_m: dq.cotaPonta_m,
          Qadm_DQ_tf: Qdq,
          Qadm_AV_tf: Qav,
          diferencaRelativa: dif,
          classificacao: cls
        });
      });
      return out;
    }
  };

  // ============================================================================
  // /export — auditoria e hashing
  // ============================================================================

  const exportMod = {
    /**
     * Canonicalização recursiva: ordena chaves de objetos em todos os níveis.
     * Garante hash estável independentemente da ordem de inserção.
     */
    canonicalize: function canonicalize(obj) {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(canonicalize);
      const sortedKeys = Object.keys(obj).sort();
      const out = {};
      for (let i = 0; i < sortedKeys.length; i++) {
        out[sortedKeys[i]] = canonicalize(obj[sortedKeys[i]]);
      }
      return out;
    },

    /** SHA-256 via Web Crypto (browser) ou crypto.subtle (Node 16+) */
    sha256: async function (str) {
      const enc = new TextEncoder().encode(str);
      let cryptoObj;
      if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
        cryptoObj = window.crypto.subtle;
      } else if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
        cryptoObj = globalThis.crypto.subtle;
      } else {
        // Node sem subtle: fallback ao módulo crypto
        const nodeCrypto = require('crypto');
        return nodeCrypto.createHash('sha256').update(str).digest('hex');
      }
      const hashBuffer = await cryptoObj.digest('SHA-256', enc);
      return Array.from(new Uint8Array(hashBuffer))
        .map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    },

    /** Hash dos inputs (sem timestamp) — para auditoria de reprodutibilidade */
    calcularInputHash: async function (obra, coefs) {
      const payload = exportMod.canonicalize({
        obra: obra,
        coefs: coefs,
        versaoEngine: GeoSPT.versao,
        versaoTabelas: GeoSPT.versaoTabelas
      });
      return await exportMod.sha256(JSON.stringify(payload));
    },

    /** Hash do pacote completo (com timestamp) — para identificação de export */
    calcularExportHash: async function (payloadCompleto) {
      return await exportMod.sha256(JSON.stringify(exportMod.canonicalize(payloadCompleto)));
    },

    /** Gera log de auditoria completo */
    gerarLogAuditoria: async function (obra, calculos, modificacoes) {
      const timestamp = new Date().toISOString();
      const inputHash = await exportMod.calcularInputHash(obra, domain.coefficients);

      const log = {
        metadata: {
          geradoPor: `GeoSPT v${GeoSPT.versao}`,
          timestampGeracao: timestamp,
          versaoEngine: GeoSPT.versao,
          versaoTabelas: GeoSPT.versaoTabelas,
          inputHash: inputHash,
          exportHash: null  // preenchido abaixo
        },
        obra: obra,
        premissasMetodologicas: {
          normaSondagem: 'ABNT NBR 6484:2020',
          normaFundacoes: 'ABNT NBR 6122:2022',
          metodosCalculo: ['Décourt-Quaresma 1996 (modificado)', 'Aoki-Velloso 1975'],
          janelaCompatibilizacao_m: domain.constants.JANELA_PADRAO_M,
          criterioCompatibilizacao: 'cota_absoluta',
          tratamentoCotasHeterogeneas: 'envoltoria_furo_unico (NSPT+solo+familia do mesmo furo)',
          arredondamentoNSPT: 'para_baixo (Math.floor)',
          NSPT_para_Np: 'media_trinca (cota-1, cota, cota+1) — centrada na ponta',
          NSPT_para_Nl: 'NSPT da cota = camada [cota, cota-1]',
          desprezaAtritoUltimoMetro: true,
          limiteEstrutural_aplicado: true,
          tratamentoPonta_NBR_6122_2022: 'calculado | sem_contato | contato_com_ressalva',
          fatorRedutorPonta_aplicado: false,
          limitaRpPorRl_checkbox: false,
          FS: {
            global_NBR_6122: domain.coefficients.DQ_FS.FSg,
            lateral_DQ_parcial: domain.coefficients.DQ_FS.Fl,
            ponta_DQ_parcial: domain.coefficients.DQ_FS.Fp,
            caminho_aplicado: 'Caminho 2 (FS global) tradicional + comparação com Caminho parcial'
          },
          AV_alpha_em_porcentagem: true,
          AV_alpha_decimal_conversion: 'alpha_decimal = alpha_percentual / 100'
        },
        coeficientesUsados: {
          tabela_1_3_DQ_C: domain.coefficients.DQ_C,
          tabela_1_4_DQ_alpha: domain.coefficients.DQ_alpha,
          tabela_1_5_DQ_beta: domain.coefficients.DQ_beta,
          tabela_1_7_AV_K_alpha: domain.coefficients.AV_K_alpha,
          tabela_1_8_AV_F1_F2: 'função: pré-moldada F1=1+D/0.80, demais F1=2.00',
          tabela_1_9_redutor_ponta: domain.coefficients.reducaoP,
          flag_modificado: true
        },
        modificacoesEmRelacaoAoOriginal: modificacoes || domain.modificacoesAplicadas,
        compatibilizacao: calculos.compatibilizacao || null,
        calculosPorEstaca: calculos.calculosPorEstaca || [],
        divergenciasDqAv: calculos.divergenciasDqAv || [],
        alertasGeotecnicos: calculos.alertasGeotecnicos || [],
        premissasNaoVerificadas: [
          'Recalques (imediatos e por adensamento)',
          'Efeito de grupo',
          'Atrito negativo',
          'Prova de carga estática',
          'Agressividade do solo/água ao concreto',
          'Controle executivo real (geometria final, tecnologia)',
          'Análise estrutural detalhada da estaca'
        ],
        termoResponsabilidade: 'Este log foi gerado automaticamente pelo software GeoSPT como rastreabilidade do cálculo. A interpretação e a responsabilidade técnica pelo projeto são do engenheiro projetista. Modificações em coeficientes em relação às fontes originais estão documentadas na seção "modificacoesEmRelacaoAoOriginal" e devem ser justificadas no projeto executivo.'
      };

      log.metadata.exportHash = await exportMod.calcularExportHash(log);
      return log;
    }
  };

  // ============================================================================
  // Expor
  // ============================================================================

  const GeoSPT = {
    versao: '2.0.7',
    versaoTabelas: 'v2.1',
    correcoes_2_0_1: [
      '#1 — Envoltória usa nspt_calculo p/ cálculo, preserva nspt_real e impenetravel',
      '#2 — Memorial DQ/AV expõe nspt_camada_real, nspt_camada (calculo) e nl_clampeado em paralelo',
      '#2b — Memorial expõe np_nspts_reais e np_nspts_clampados (média trinca da ponta)',
      '#3 — k-means de agrupamento de domínios usa nspt_calculo (truncado a 50)',
      '#4 — validation.validarCotaArrasamento adicionada (regra de grade inteira)'
    ],
    correcoes_2_0_2: [
      '#5 — engine.calcularPorFuroIndividual adicionada: calcula DQ+AV em cada furo separadamente, com comparativo e identificação do furo mais desfavorável por cota. Atende requisito original do usuário (perfil "todos os NSPT").'
    ],
    correcoes_2_0_3: [
      '#6 — engine.interpolarValorPorFuros adicionada (genérica em unidade). Substitui interpolarEstacaPorFuros (mantida deprecated). Bug latente de unidade kN×tf corrigido.',
      '#7 — Peso linear normalizado: peso_i = (1 - d_i/Σd) / Σ. Substitui o inverso da distância anterior. Regra d_min < raioMin → 100% no furo mais próximo mantida.',
      '#8 — engine.calcularPorInterpolacao adicionada: orquestra (a) cálculo por furo individual, (b) coleta Q_adm por cota, (c) interpolação por locação cota a cota. Atende fluxo correto solicitado pelo usuário.',
      '#9 — engine.montarPerfilMedio adicionada com 3 submodos: 2.1_predominante / 2.2_conservador / 2.3_dois_paralelos. Resolve ambiguidade do modo "perfil médio" em cotas heterogêneas (cobertura conceitual antes inexistente).',
      '#10 — Limpeza: dataset Balsas sem identificação institucional'
    ],
    correcoes_2_0_4: [
      '#11 (D6) — Família Intermediário tratada simetricamente em cotas heterogêneas. compatibilizar agora expõe media.intermediario. montarPerfilMedio submodo 2.2 considera as 3 famílias na decisão conservadora; submodo 2.3 entrega até 3 perfis paralelos. Até v2.0.3, NSPTs Intermediário eram silenciosamente perdidos em cotas heterogêneas.'
    ],
    correcoes_2_0_5: [
      '#12 (D8 — BUG-A) — Submodo 2.2 conservador agora gera solo CANÔNICO (Argila/Areia/Silte) no campo solo; rótulo descritivo migrou para campo aditivo solo_rotulo_auditoria. Até v2.0.4, calcularAV crashava com TypeError ao processar cotas heterogêneas; calcularDQ tinha crash latente equivalente quando a ponta caía em cota heterogênea.',
      '#13 (D9 — BUG-B) — Submodo 2.3 agora retorna avisos como ARRAY de objetos, padronizando com submodos 2.1/2.2. Resumo agregado preservado em metadata.camadasSemDado_resumo. Até v2.0.4, avisos era objeto no 2.3 e array nos outros — quebrava UI que iterava avisos.map(...).',
      '#14 (D10 — AJUSTE-C) — calcularPorFuroIndividual agora gera alertaAterroEspesso e alertaCorteElevado baseados em (cotaArrasamento - mediaTopos das sondagens), com limite ±2,5m configurável. O alerta legado alertaAterroAcimaLeitura é mantido para retrocompat (sempre null daqui em diante). Coerência restaurada com Aba 4 (alertas A9/A10) do app.'
    ],
    correcoes_2_0_6: [
      '#15 (D11 — FIX-D) — Submodo 2.3 do montarPerfilMedio agora gera solo CANÔNICO (Argila/Areia/Silte) em cotas heterogêneas dos 3 perfis paralelos (Coesivo, Granular, Intermediário); rótulo descritivo migrou para campo aditivo solo_rotulo_auditoria. Até v2.0.5, calcularDQ/AV crashava ao processar os perfis paralelos quando a ponta ou camada de atrito caía em cota heterogênea (mesmo bug do BUG-A, escopo distinto não coberto por D8).',
      '#16 (D11 — uniformização de schema) — Submodos 2.1 e 2.2 agora populam solo_rotulo_auditoria=null em cotas homogêneas. Schema consistente em todos os caminhos de montarPerfilMedio: o campo solo_rotulo_auditoria sempre existe, valor null quando não há rotulagem especial.',
      '#17 (D12 — AJUSTE-E) — sugerirAgrupamentoDominios reduz threshold do silhouette de 0.50 para 0.30 com 3 níveis de confiança (forte > 0.50, fraca 0.30-0.50, nenhuma ≤ 0.30). Embasamento: Rousseeuw (1987). Campo novo confianca exposto no retorno para a UI exibir badge colorido.'
    ],
    correcoes_2_0_7: [
      '#18 (D13 — FIX-F) — _calcularGenerico (motor de calcularDQ/AV) deixa de rejeitar arrasamento mais de 1m acima do topo do perfil compatibilizado. Agora calcula normalmente, despreza atrito nas camadas acima do topo (caso típico: aterro espesso sem sondagem), expõe campo aditivo fusteForaDoPerfil_m no retorno e adiciona nota explicativa em cada linha do memorial. Convergência metodológica D1 (v2.0.2: trecho sem dado não extrapola) → D10 (v2.0.5: alertas A9/A10 por mediaTopos) → D13 (v2.0.7: cálculo trunca atrito ao perfil amostrado, mantendo coerência com alerta A9 da UI).'
    ],
    domain: domain,
    engine: engine,
    validation: validation,
    export: exportMod,
    util: util
  };

  global.GeoSPT = GeoSPT;
})(typeof window !== 'undefined' ? window : globalThis);

// Export ES module (Vite/Vitest/qualquer bundler moderno)
// O IIFE acima já populou globalThis.GeoSPT como side-effect.
export const GeoSPT = globalThis.GeoSPT;
export default GeoSPT;
