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

/* ============================================================================
 * CP-14 — Formato da estaca (circular | quadrada) e dimensão livre
 *
 * Modelo retrocompatível:
 *   - estaca.formato     : 'circular' (padrão) | 'quadrada' (só pré-moldada)
 *   - estaca.dimensao_m  : diâmetro (circular) ou lado (quadrada), em metros
 *   - estaca.diametro_m  : ESPELHO de dimensao_m, mantido SEMPRE preenchido
 *     para retrocompatibilidade (engine, desenho do corte, mini-mapa e obras
 *     antigas continuam lendo diametro_m sem alteração).
 *
 * Geometria passada à engine (campos opcionais — engine v2.0.7+):
 *   - circular: Ap = π·D²/4 ; U = π·D
 *   - quadrada: Ap = L²     ; U = 4·L
 * ============================================================================ */

export const FORMATOS_ESTACA = [
  { id: 'circular', label: 'Circular' },
  { id: 'quadrada', label: 'Quadrada' },
];

/** Formato efetivo da estaca ('circular' se ausente — obras antigas). */
export function formatoDe(estaca) {
  if (!estaca) return 'circular';
  return estaca.formato === 'quadrada' ? 'quadrada' : 'circular';
}

/** Dimensão transversal (m): dimensao_m se houver; senão diametro_m (legado). */
export function dimensaoDe(estaca) {
  if (!estaca) return null;
  return estaca.dimensao_m ?? estaca.diametro_m ?? null;
}

/** Rótulo do campo de dimensão conforme o formato. */
export function labelDimensao(formato) {
  return formato === 'quadrada' ? 'Lado' : 'Diâmetro';
}

/** Rótulo curto "Ø 40 cm" / "□ 40 cm" para listas, corte e mini-mapa. */
export function rotuloDimensaoCurto(estaca) {
  const dim = dimensaoDe(estaca);
  if (dim == null) return '';
  const cm = Math.round(dim * 100);
  return (formatoDe(estaca) === 'quadrada' ? '□ ' : 'Ø ') + cm + ' cm';
}

/**
 * Geometria da seção conforme formato (para passar à engine).
 * @returns {{area_ponta_m2:number, perimetro_m:number, dimensaoTransversal_m:number}|null}
 */
export function geometriaEstaca(formato, dimensao_m) {
  if (dimensao_m == null || !(dimensao_m > 0)) return null;
  if (formato === 'quadrada') {
    return {
      area_ponta_m2: dimensao_m * dimensao_m,
      perimetro_m: 4 * dimensao_m,
      dimensaoTransversal_m: dimensao_m,
    };
  }
  return {
    area_ponta_m2: (Math.PI * dimensao_m * dimensao_m) / 4,
    perimetro_m: Math.PI * dimensao_m,
    dimensaoTransversal_m: dimensao_m,
  };
}

/* ----------------------------------------------------------------------------
 * Alerta A6 — Dimensão da estaca fora da faixa usual
 *
 * A numeração A6 preenche a lacuna histórica da série A1–A10 (A6 havia sido
 * pulado). Diferente dos demais (que analisam SONDAGENS, Aba 4), o A6 analisa
 * a ESTACA e é exibido na Aba 5 e registrado no JSON de auditoria.
 *
 * Limites: < 0,15 m (15 cm) ou > 1,20 m (120 cm), para diâmetro OU lado.
 * O alerta é INFORMATIVO — nunca impede o cálculo de capacidade de carga.
 * -------------------------------------------------------------------------- */

export const A6_DIMENSAO_MIN_M = 0.15;
export const A6_DIMENSAO_MAX_M = 1.2;

/**
 * Avalia o alerta A6 para uma estaca.
 * @returns {{id:'A6', severidade:'aviso', estaca:string, mensagem:string}|null}
 */
export function avaliarAlertaA6(estaca) {
  const dim = dimensaoDe(estaca);
  if (dim == null || !(dim > 0)) return null;
  const fmt = formatoDe(estaca);
  const rotulo = labelDimensao(fmt).toLowerCase();
  const cm = Math.round(dim * 100);
  if (dim < A6_DIMENSAO_MIN_M) {
    return {
      id: 'A6',
      severidade: 'aviso',
      estaca: estaca.nome || '',
      mensagem:
        `A6 — ${rotulo} de ${cm} cm é menor que 15 cm (dimensão muito pequena). ` +
        'Verifique se a dimensão foi digitada corretamente. O cálculo NÃO é bloqueado.',
    };
  }
  if (dim > A6_DIMENSAO_MAX_M) {
    return {
      id: 'A6',
      severidade: 'aviso',
      estaca: estaca.nome || '',
      mensagem:
        `A6 — ${rotulo} de ${cm} cm é maior que 120 cm (dimensão muito grande). ` +
        'Verifique se a dimensão foi digitada corretamente. O cálculo NÃO é bloqueado.',
    };
  }
  return null;
}

/**
 * Normaliza os campos de formato/dimensão de uma estaca (migração de obras
 * antigas que só têm diametro_m). Mantém diametro_m espelhado.
 */
export function normalizarEstacaFormato(estaca) {
  if (!estaca) return estaca;
  const formato =
    estaca.tipoEstaca === 'premoldada' && estaca.formato === 'quadrada'
      ? 'quadrada'
      : 'circular';
  const dimensao_m = estaca.dimensao_m ?? estaca.diametro_m ?? null;
  return {
    ...estaca,
    formato,
    dimensao_m,
    diametro_m: dimensao_m, // espelho retrocompatível
  };
}

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
 * Carga estrutural admissível (tf) para o par (tipo, dimensão).
 * CP-14: a tabela da engine é indexada por DIÂMETRO de seção CIRCULAR.
 * Para a QUADRADA, o lado_cm é usado como chave equivalente — decisão
 * CONSERVADORA (A_quadrada = L² > π·L²/4 = A_circular, logo a capacidade
 * estrutural real da quadrada é MAIOR que a tabelada para o círculo de
 * mesma dimensão). Isso espelha exatamente o que a engine faz via
 * diametro_m espelhado. O override por estaca tem precedência e é o
 * caminho recomendado para o valor do fabricante. Dimensão sem entrada
 * na tabela → null (nenhum valor é inventado).
 * @param {string} tipoEstaca
 * @param {number} dimensao_m — diâmetro ou lado, em metros
 * @param {string} [formato='circular'] — informativo (mesma chave de busca)
 * @returns {number|null}
 */
export function cargaEstruturalDe(tipoEstaca, dimensao_m, formato = 'circular') {
  if (!GeoSPT || !tipoEstaca || !dimensao_m) return null;
  const chave_cm = Math.round(dimensao_m * 100);
  const tabela = GeoSPT.domain.coefficients.cargaEstrutural_tf;
  return tabela[chave_cm]?.[tipoEstaca] ?? null;
}

/**
 * Label legível do tipo de estaca, dado o id.
 */
export function labelTipoEstaca(id) {
  const t = TIPOS_ESTACA.find((t) => t.id === id);
  return t ? t.label : id;
}
