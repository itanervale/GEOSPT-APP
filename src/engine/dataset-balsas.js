/* ============================================================================
 * Dataset Balsas — wrapper ES module sobre o IIFE original
 *
 * O conteúdo abaixo é o `dataset_balsas.js` original, intacto. O IIFE auto-
 * executável popula `globalThis.BALSAS` como side-effect; o export ES module
 * abaixo apenas re-expõe esse valor de forma idiomática.
 * ============================================================================ */

/* ============================================================================
 * Caso Balsas — dataset completo embarcado para validação da engine GeoSPT
 *
 * Fonte: exemplosaidabalsasv2.xlsx (terreno Balsas/MA)
 * 5 furos SPT (SPT-01 a SPT-05)
 * Ground truth da compatibilização também embarcado (20 cotas)
 * ============================================================================ */
(function (global) {
  'use strict';

  const BALSAS = {
    obra: {
      nome: 'Obra de Referência — Balsas',
      localizacao: 'Balsas/MA',
      observacao: 'Cota de boca em altímetro absoluto; coordenadas inferidas para teste de interpolação'
    },

    sondagens: {
      'SPT-01': {
        cotaTopo_m: 254.485,
        profundidadeFinal_m: 20.00,
        criterioParalisacao: 'impenetravel',
        naInicial_m: null,
        naFinal_m: null,
        dominioGeotecnico: null,
        coordenadas: { x: 0.0,  y: 0.0 },
        leituras: [
          { profundidade_m: 1,  nspt_real: 3,  nspt_calculo: 3,  impenetravel: false, solo: 'Areia Silto-Argilosa', familia: 'Granular' },
          { profundidade_m: 2,  nspt_real: 4,  nspt_calculo: 4,  impenetravel: false, solo: 'Areia Silto-Argilosa', familia: 'Granular' },
          { profundidade_m: 3,  nspt_real: 5,  nspt_calculo: 5,  impenetravel: false, solo: 'Argila Siltosa',       familia: 'Coesivo' },
          { profundidade_m: 4,  nspt_real: 6,  nspt_calculo: 6,  impenetravel: false, solo: 'Argila Siltosa',       familia: 'Coesivo' },
          { profundidade_m: 5,  nspt_real: 6,  nspt_calculo: 6,  impenetravel: false, solo: 'Argila Siltosa',       familia: 'Coesivo' },
          { profundidade_m: 6,  nspt_real: 8,  nspt_calculo: 8,  impenetravel: false, solo: 'Argila Siltosa',       familia: 'Coesivo' },
          { profundidade_m: 7,  nspt_real: 9,  nspt_calculo: 9,  impenetravel: false, solo: 'Argila Siltosa',       familia: 'Coesivo' },
          { profundidade_m: 8,  nspt_real: 12, nspt_calculo: 12, impenetravel: false, solo: 'Argila Siltosa',       familia: 'Coesivo' },
          { profundidade_m: 9,  nspt_real: 14, nspt_calculo: 14, impenetravel: false, solo: 'Argila Siltosa',       familia: 'Coesivo' },
          { profundidade_m: 10, nspt_real: 17, nspt_calculo: 17, impenetravel: false, solo: 'Argila Siltosa',       familia: 'Coesivo' },
          { profundidade_m: 11, nspt_real: 15, nspt_calculo: 15, impenetravel: false, solo: 'Argila Silto-Arenosa', familia: 'Coesivo' },
          { profundidade_m: 12, nspt_real: 12, nspt_calculo: 12, impenetravel: false, solo: 'Argila Silto-Arenosa', familia: 'Coesivo' },
          { profundidade_m: 13, nspt_real: 12, nspt_calculo: 12, impenetravel: false, solo: 'Argila Silto-Arenosa', familia: 'Coesivo' },
          { profundidade_m: 14, nspt_real: 22, nspt_calculo: 22, impenetravel: false, solo: 'Argila Silto-Arenosa', familia: 'Coesivo' },
          { profundidade_m: 15, nspt_real: 35, nspt_calculo: 35, impenetravel: false, solo: 'Argila Silto-Arenosa', familia: 'Coesivo' },
          { profundidade_m: 16, nspt_real: 35, nspt_calculo: 35, impenetravel: false, solo: 'Argila Silto-Arenosa', familia: 'Coesivo' },
          { profundidade_m: 17, nspt_real: 42, nspt_calculo: 42, impenetravel: false, solo: 'Argila Silto-Arenosa', familia: 'Coesivo' },
          { profundidade_m: 18, nspt_real: 43, nspt_calculo: 43, impenetravel: false, solo: 'Argila Silto-Arenosa', familia: 'Coesivo' },
          { profundidade_m: 19, nspt_real: 42, nspt_calculo: 42, impenetravel: false, solo: 'Argila Silto-Arenosa', familia: 'Coesivo' }
        ]
      },

      'SPT-02': {
        cotaTopo_m: 254.088,
        profundidadeFinal_m: 19.00,
        criterioParalisacao: 'impenetravel',
        naInicial_m: null,
        naFinal_m: null,
        dominioGeotecnico: null,
        coordenadas: { x: 25.0, y: 0.0 },
        leituras: [
          { profundidade_m: 1,  nspt_real: 6,  nspt_calculo: 6,  impenetravel: false, solo: 'Argila Areno-Siltosa', familia: 'Coesivo' },
          { profundidade_m: 2,  nspt_real: 6,  nspt_calculo: 6,  impenetravel: false, solo: 'Argila Areno-Siltosa', familia: 'Coesivo' },
          { profundidade_m: 3,  nspt_real: 6,  nspt_calculo: 6,  impenetravel: false, solo: 'Argila Areno-Siltosa', familia: 'Coesivo' },
          { profundidade_m: 4,  nspt_real: 11, nspt_calculo: 11, impenetravel: false, solo: 'Argila Areno-Siltosa', familia: 'Coesivo' },
          { profundidade_m: 5,  nspt_real: 12, nspt_calculo: 12, impenetravel: false, solo: 'Argila Areno-Siltosa', familia: 'Coesivo' },
          { profundidade_m: 6,  nspt_real: 13, nspt_calculo: 13, impenetravel: false, solo: 'Argila Areno-Siltosa', familia: 'Coesivo' },
          { profundidade_m: 7,  nspt_real: 12, nspt_calculo: 12, impenetravel: false, solo: 'Argila Areno-Siltosa', familia: 'Coesivo' },
          { profundidade_m: 8,  nspt_real: 12, nspt_calculo: 12, impenetravel: false, solo: 'Areia Argilo-Siltosa', familia: 'Granular' },
          { profundidade_m: 9,  nspt_real: 14, nspt_calculo: 14, impenetravel: false, solo: 'Areia Argilo-Siltosa', familia: 'Granular' },
          { profundidade_m: 10, nspt_real: 21, nspt_calculo: 21, impenetravel: false, solo: 'Areia Argilo-Siltosa', familia: 'Granular' },
          { profundidade_m: 11, nspt_real: 16, nspt_calculo: 16, impenetravel: false, solo: 'Areia Argilo-Siltosa', familia: 'Granular' },
          { profundidade_m: 12, nspt_real: 25, nspt_calculo: 25, impenetravel: false, solo: 'Areia Argilo-Siltosa', familia: 'Granular' },
          { profundidade_m: 13, nspt_real: 26, nspt_calculo: 26, impenetravel: false, solo: 'Areia Argilo-Siltosa', familia: 'Granular' },
          { profundidade_m: 14, nspt_real: 38, nspt_calculo: 38, impenetravel: false, solo: 'Areia Argilo-Siltosa', familia: 'Granular' },
          { profundidade_m: 15, nspt_real: 40, nspt_calculo: 40, impenetravel: false, solo: 'Areia Argilo-Siltosa', familia: 'Granular' },
          { profundidade_m: 16, nspt_real: 44, nspt_calculo: 44, impenetravel: false, solo: 'Areia Argilo-Siltosa', familia: 'Granular' },
          { profundidade_m: 17, nspt_real: 36, nspt_calculo: 36, impenetravel: false, solo: 'Areia Argilo-Siltosa', familia: 'Granular' },
          { profundidade_m: 18, nspt_real: 38, nspt_calculo: 38, impenetravel: false, solo: 'Areia Argilo-Siltosa', familia: 'Granular' }
        ]
      },

      'SPT-03': {
        cotaTopo_m: 254.885,
        profundidadeFinal_m: 15.00,
        criterioParalisacao: 'impenetravel',
        naInicial_m: null,
        naFinal_m: null,
        dominioGeotecnico: null,
        coordenadas: { x: 0.0,  y: 25.0 },
        leituras: [
          { profundidade_m: 1,  nspt_real: 7,  nspt_calculo: 7,  impenetravel: false, solo: 'Areia Argilosa',       familia: 'Granular' },
          { profundidade_m: 2,  nspt_real: 6,  nspt_calculo: 6,  impenetravel: false, solo: 'Areia Argilosa',       familia: 'Granular' },
          { profundidade_m: 3,  nspt_real: 7,  nspt_calculo: 7,  impenetravel: false, solo: 'Areia Argilosa',       familia: 'Granular' },
          { profundidade_m: 4,  nspt_real: 10, nspt_calculo: 10, impenetravel: false, solo: 'Areia Argilosa',       familia: 'Granular' },
          { profundidade_m: 5,  nspt_real: 16, nspt_calculo: 16, impenetravel: false, solo: 'Areia Argilosa',       familia: 'Granular' },
          { profundidade_m: 6,  nspt_real: 15, nspt_calculo: 15, impenetravel: false, solo: 'Areia Argilosa',       familia: 'Granular' },
          { profundidade_m: 7,  nspt_real: 18, nspt_calculo: 18, impenetravel: false, solo: 'Argila Areno-Siltosa', familia: 'Coesivo' },
          { profundidade_m: 8,  nspt_real: 15, nspt_calculo: 15, impenetravel: false, solo: 'Argila Areno-Siltosa', familia: 'Coesivo' },
          { profundidade_m: 9,  nspt_real: 20, nspt_calculo: 20, impenetravel: false, solo: 'Argila Areno-Siltosa', familia: 'Coesivo' },
          { profundidade_m: 10, nspt_real: 18, nspt_calculo: 18, impenetravel: false, solo: 'Argila Areno-Siltosa', familia: 'Coesivo' },
          { profundidade_m: 11, nspt_real: 26, nspt_calculo: 26, impenetravel: false, solo: 'Argila Areno-Siltosa', familia: 'Coesivo' },
          { profundidade_m: 12, nspt_real: 29, nspt_calculo: 29, impenetravel: false, solo: 'Argila Areno-Siltosa', familia: 'Coesivo' },
          { profundidade_m: 13, nspt_real: 34, nspt_calculo: 34, impenetravel: false, solo: 'Argila Areno-Siltosa', familia: 'Coesivo' },
          { profundidade_m: 14, nspt_real: 43, nspt_calculo: 43, impenetravel: false, solo: 'Areia Argilo-Siltosa', familia: 'Granular' }
        ]
      },

      'SPT-04': {
        cotaTopo_m: 254.819,
        profundidadeFinal_m: 15.00,
        criterioParalisacao: 'impenetravel',
        naInicial_m: null,
        naFinal_m: null,
        dominioGeotecnico: null,
        coordenadas: { x: 25.0, y: 25.0 },
        leituras: [
          { profundidade_m: 1,  nspt_real: 6,  nspt_calculo: 6,  impenetravel: false, solo: 'Areia Argilo-Siltosa', familia: 'Granular' },
          { profundidade_m: 2,  nspt_real: 4,  nspt_calculo: 4,  impenetravel: false, solo: 'Areia Argilo-Siltosa', familia: 'Granular' },
          { profundidade_m: 3,  nspt_real: 4,  nspt_calculo: 4,  impenetravel: false, solo: 'Areia Argilo-Siltosa', familia: 'Granular' },
          { profundidade_m: 4,  nspt_real: 9,  nspt_calculo: 9,  impenetravel: false, solo: 'Areia Argilo-Siltosa', familia: 'Granular' },
          { profundidade_m: 5,  nspt_real: 10, nspt_calculo: 10, impenetravel: false, solo: 'Argila Silto-Arenosa', familia: 'Coesivo' },
          { profundidade_m: 6,  nspt_real: 14, nspt_calculo: 14, impenetravel: false, solo: 'Argila Silto-Arenosa', familia: 'Coesivo' },
          { profundidade_m: 7,  nspt_real: 15, nspt_calculo: 15, impenetravel: false, solo: 'Argila Silto-Arenosa', familia: 'Coesivo' },
          { profundidade_m: 8,  nspt_real: 14, nspt_calculo: 14, impenetravel: false, solo: 'Argila Silto-Arenosa', familia: 'Coesivo' },
          { profundidade_m: 9,  nspt_real: 18, nspt_calculo: 18, impenetravel: false, solo: 'Argila Silto-Arenosa', familia: 'Coesivo' },
          { profundidade_m: 10, nspt_real: 21, nspt_calculo: 21, impenetravel: false, solo: 'Argila Silto-Arenosa', familia: 'Coesivo' },
          { profundidade_m: 11, nspt_real: 26, nspt_calculo: 26, impenetravel: false, solo: 'Argila Silto-Arenosa', familia: 'Coesivo' },
          { profundidade_m: 12, nspt_real: 26, nspt_calculo: 26, impenetravel: false, solo: 'Argila Silto-Arenosa', familia: 'Coesivo' },
          { profundidade_m: 13, nspt_real: 32, nspt_calculo: 32, impenetravel: false, solo: 'Argila Silto-Arenosa', familia: 'Coesivo' },
          { profundidade_m: 14, nspt_real: 34, nspt_calculo: 34, impenetravel: false, solo: 'Areia Argilo-Siltosa', familia: 'Granular' }
        ]
      },

      'SPT-05': {
        cotaTopo_m: 253.75,
        profundidadeFinal_m: 15.00,
        criterioParalisacao: 'impenetravel',
        naInicial_m: null,
        naFinal_m: null,
        dominioGeotecnico: null,
        coordenadas: { x: 12.5, y: 12.5 },
        leituras: [
          { profundidade_m: 1,  nspt_real: 4,  nspt_calculo: 4,  impenetravel: false, solo: 'Argila Silto-Arenosa', familia: 'Coesivo' },
          { profundidade_m: 2,  nspt_real: 6,  nspt_calculo: 6,  impenetravel: false, solo: 'Argila Silto-Arenosa', familia: 'Coesivo' },
          { profundidade_m: 3,  nspt_real: 7,  nspt_calculo: 7,  impenetravel: false, solo: 'Argila Silto-Arenosa', familia: 'Coesivo' },
          { profundidade_m: 4,  nspt_real: 7,  nspt_calculo: 7,  impenetravel: false, solo: 'Argila Silto-Arenosa', familia: 'Coesivo' },
          { profundidade_m: 5,  nspt_real: 9,  nspt_calculo: 9,  impenetravel: false, solo: 'Argila Silto-Arenosa', familia: 'Coesivo' },
          { profundidade_m: 6,  nspt_real: 14, nspt_calculo: 14, impenetravel: false, solo: 'Argila Silto-Arenosa', familia: 'Coesivo' },
          { profundidade_m: 7,  nspt_real: 13, nspt_calculo: 13, impenetravel: false, solo: 'Argila Silto-Arenosa', familia: 'Coesivo' },
          { profundidade_m: 8,  nspt_real: 17, nspt_calculo: 17, impenetravel: false, solo: 'Areia Silto-Argilosa', familia: 'Granular' },
          { profundidade_m: 9,  nspt_real: 24, nspt_calculo: 24, impenetravel: false, solo: 'Areia Silto-Argilosa', familia: 'Granular' },
          { profundidade_m: 10, nspt_real: 24, nspt_calculo: 24, impenetravel: false, solo: 'Areia Silto-Argilosa', familia: 'Granular' },
          { profundidade_m: 11, nspt_real: 29, nspt_calculo: 29, impenetravel: false, solo: 'Areia Silto-Argilosa', familia: 'Granular' },
          { profundidade_m: 12, nspt_real: 26, nspt_calculo: 26, impenetravel: false, solo: 'Areia Silto-Argilosa', familia: 'Granular' },
          { profundidade_m: 13, nspt_real: 26, nspt_calculo: 26, impenetravel: false, solo: 'Areia Silto-Argilosa', familia: 'Granular' },
          { profundidade_m: 14, nspt_real: 34, nspt_calculo: 34, impenetravel: false, solo: 'Areia Silto-Argilosa', familia: 'Granular' }
        ]
      }
    },

    // GROUND TRUTH — Tabela da aba "Compatibilização" do XLSX
    groundTruthCompatibilizacao: [
      { cota: 254, nFuros: 2, env_nspt: 6,  env_furo: 'SPT-04', familia: 'Granular',     solo: 'Areia Argilosa',       heterogeneo: false },
      { cota: 253, nFuros: 5, env_nspt: 3,  env_furo: 'SPT-01', familia: 'Granular',     solo: 'Areia Silto-Argilosa', heterogeneo: false },
      { cota: 252, nFuros: 5, env_nspt: 4,  env_furo: 'SPT-01', familia: 'Granular',     solo: 'Areia Silto-Argilosa', heterogeneo: false },
      { cota: 251, nFuros: 5, env_nspt: 5,  env_furo: 'SPT-01', familia: 'Coesivo',      solo: 'Argila Siltosa',       heterogeneo: false },
      { cota: 250, nFuros: 5, env_nspt: 6,  env_furo: 'SPT-01', familia: 'Coesivo',      solo: 'Argila Silto-Arenosa', heterogeneo: false },
      { cota: 249, nFuros: 5, env_nspt: 6,  env_furo: 'SPT-01', familia: 'Coesivo',      solo: 'Argila Silto-Arenosa', heterogeneo: false },
      { cota: 248, nFuros: 5, env_nspt: 8,  env_furo: 'SPT-01', familia: 'Coesivo',      solo: 'Argila Areno-Siltosa', heterogeneo: false },
      { cota: 247, nFuros: 5, env_nspt: 9,  env_furo: 'SPT-01', familia: 'Coesivo',      solo: 'Argila Areno-Siltosa', heterogeneo: false },
      { cota: 246, nFuros: 5, env_nspt: 12, env_furo: 'SPT-01', familia: 'Coesivo',      solo: 'Argila Siltosa',       heterogeneo: false },
      { cota: 245, nFuros: 5, env_nspt: 14, env_furo: 'SPT-01', familia: 'Coesivo',      solo: 'Argila Siltosa',       heterogeneo: false },
      { cota: 244, nFuros: 5, env_nspt: 17, env_furo: 'SPT-01', familia: 'Coesivo',      solo: 'Argila Siltosa',       heterogeneo: false },
      { cota: 243, nFuros: 5, env_nspt: 15, env_furo: 'SPT-01', familia: 'Coesivo',      solo: 'Argila Silto-Arenosa', heterogeneo: false },
      { cota: 242, nFuros: 5, env_nspt: 12, env_furo: 'SPT-01', familia: 'Coesivo',      solo: 'Argila Silto-Arenosa', heterogeneo: false },
      { cota: 241, nFuros: 5, env_nspt: 12, env_furo: 'SPT-01', familia: 'Granular',     solo: 'Areia Argilo-Siltosa', heterogeneo: false },
      { cota: 240, nFuros: 3, env_nspt: 22, env_furo: 'SPT-01', familia: 'Granular',     solo: 'Areia Argilo-Siltosa', heterogeneo: false },
      { cota: 239, nFuros: 2, env_nspt: 35, env_furo: 'SPT-01', familia: 'HETEROGENEO',  solo: 'C: Argila Silto-Arenosa | G: Areia Argilo-Siltosa', heterogeneo: true },
      { cota: 238, nFuros: 2, env_nspt: 35, env_furo: 'SPT-01', familia: 'HETEROGENEO',  solo: 'C: Argila Silto-Arenosa | G: Areia Argilo-Siltosa', heterogeneo: true },
      { cota: 237, nFuros: 2, env_nspt: 36, env_furo: 'SPT-02', familia: 'HETEROGENEO',  solo: 'C: Argila Silto-Arenosa | G: Areia Argilo-Siltosa', heterogeneo: true },
      { cota: 236, nFuros: 2, env_nspt: 38, env_furo: 'SPT-02', familia: 'HETEROGENEO',  solo: 'C: Argila Silto-Arenosa | G: Areia Argilo-Siltosa', heterogeneo: true },
      { cota: 235, nFuros: 1, env_nspt: 42, env_furo: 'SPT-01', familia: 'Coesivo',      solo: 'Argila Silto-Arenosa', heterogeneo: false }
    ]
  };

  global.BALSAS = BALSAS;
})(typeof window !== 'undefined' ? window : globalThis);


// Export ES module
export const BALSAS = globalThis.BALSAS;
export default BALSAS;
