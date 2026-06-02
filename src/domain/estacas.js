/* ============================================================================
 * Estacas — constantes e funções auxiliares
 *
 * Extraído das linhas 4789-4810 do geospt_app.jsx.
 *
 * Mudanças mínimas: window.GeoSPT → GeoSPT (import explícito).
 *
 * Os 5 tipos cobrem o universo dos métodos Décourt-Quaresma e Aoki-Velloso
 * para estacas brasileiras. Pré-moldada inclui as variantes de concreto e
 * metálica (a engine internamente trata na tabela de F1/F2 do Aoki-Velloso).
 *
 * DIAMETROS_CM é a lista de diâmetros padrão comercializáveis. Nem todos os
 * tipos atendem todos os diâmetros — diametrosValidosPara filtra pela tabela
 * de carga estrutural permissível (NBR 6122 + tabelas internas da engine).
 * ============================================================================ */

import { GeoSPT } from '@/engine/geospt-engine';

export const TIPOS_ESTACA = [
  { id: 'helice_continua', label: 'Hélice contínua' },
  { id: 'escavada_seco', label: 'Escavada (a seco)' },
  { id: 'escavada_fluido', label: 'Escavada (com fluido bentonítico)' },
  { id: 'premoldada', label: 'Pré-moldada cravada' },
  { id: 'raiz', label: 'Raiz' },
];

export const DIAMETROS_CM = [20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 100];

/**
 * Lista de diâmetros válidos para o tipo de estaca conforme tabela da engine.
 * @param {string} tipoEstaca
 * @returns {number[]} diâmetros em cm
 */
export function diametrosValidosPara(tipoEstaca) {
  if (!GeoSPT || !tipoEstaca) return DIAMETROS_CM;
  const tabela = GeoSPT.domain.coefficients.cargaEstrutural_tf;
  return DIAMETROS_CM.filter(
    (d) => tabela[d] && tabela[d][tipoEstaca] !== null && tabela[d][tipoEstaca] !== undefined
  );
}

/**
 * Carga estrutural admissível (tf) para o par (tipo, diâmetro).
 * @param {string} tipoEstaca
 * @param {number} diametro_m  — diâmetro em metros
 * @returns {number|null}
 */
export function cargaEstruturalDe(tipoEstaca, diametro_m) {
  if (!GeoSPT || !tipoEstaca || !diametro_m) return null;
  const diametro_cm = Math.round(diametro_m * 100);
  const tabela = GeoSPT.domain.coefficients.cargaEstrutural_tf;
  return tabela[diametro_cm]?.[tipoEstaca] ?? null;
}

/**
 * Label legível do tipo de estaca, dado o id.
 */
export function labelTipoEstaca(id) {
  const t = TIPOS_ESTACA.find((t) => t.id === id);
  return t ? t.label : id;
}
