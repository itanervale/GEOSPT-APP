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

/* ============================================================================
 * CP-16 — Carga estrutural admissível: hierarquia e catálogos
 *
 * Fonte de verdade (Opção A): a carga estrutural admissível é σ_e × A_seção,
 * onde σ_e vem da Tabela 1.10 (editável). Catálogos comerciais (abaixo) servem
 * como SUGESTÃO para dimensões padronizadas. Hierarquia do valor efetivo:
 *   1. override do usuário (cargaEstrutural_tf_custom) — precedência absoluta;
 *   2. catálogo (se a dimensão é padronizada para o tipo);
 *   3. cálculo σ_e × A (qualquer dimensão).
 *
 * IMPORTANTE: os valores de catálogo vêm de tabelas comerciais em kN e são
 * convertidos a tf DIVIDINDO POR 10 (decisão do projetista, p/ valores redondos
 * comerciais) — esta conversão ÷10 vale EXCLUSIVAMENTE aqui; todo o resto do app
 * usa a constante canônica (÷9,80665).
 * ========================================================================== */

/**
 * Catálogos comerciais por tipo: { dimensao_cm: carga_tf }.
 * Valores = (kN das tabelas de catálogo) ÷ 10. Raiz usa o LIMITE SUPERIOR da
 * faixa. Pré-moldada circular usa a estaca VIBRADA. Quadrada tem catálogo
 * próprio (Tab. 2.2, por lado em cm).
 */
export const CATALOGO_CARGA_TF = {
  helice_continua: {
    27.5: 35, 30: 45, 35: 60, 40: 80, 42.5: 90, 50: 125,
    60: 180, 70: 245, 80: 320, 90: 400, 100: 500,
  },
  escavada_seco: { 25: 25, 30: 36, 35: 49, 40: 64, 45: 81, 50: 100 },
  escavada_fluido: {
    60: 110, 70: 150, 80: 200, 100: 310, 120: 450, 140: 620,
    150: 710, 160: 820, 180: 1010, 200: 1250,
  },
  // Pré-moldada CIRCULAR (vibrada): Ø em cm
  premoldada_circular: { 20: 40, 29: 60, 33: 80 },
  // Pré-moldada QUADRADA (Tab. 2.2): lado em cm
  premoldada_quadrada: { 20: 40, 25: 60, 30: 90, 35: 120 },
  // Raiz: limite SUPERIOR da faixa (kN) ÷ 10
  raiz: {
    10: 15, 12: 25, 15: 35, 16: 45, 20: 60, 25: 80, 31: 110, 41: 150,
  },
};

/** Tensão admissível σ_e (MPa) da Tabela 1.10, com override de coeficientes. */
export function tensaoAdmissivelDe(tipoEstaca, coeficientesCustomizados) {
  const custom = coeficientesCustomizados?.tensaoAdmissivel_MPa?.[tipoEstaca];
  if (custom != null && custom > 0) return custom;
  return GeoSPT?.domain?.coefficients?.tensaoAdmissivel_MPa?.[tipoEstaca] ?? null;
}

/** Chave de catálogo conforme tipo e formato (pré-moldada distingue circular/quadrada). */
function chaveCatalogo(tipoEstaca, formato) {
  if (tipoEstaca === 'premoldada') {
    return formato === 'quadrada' ? 'premoldada_quadrada' : 'premoldada_circular';
  }
  return tipoEstaca;
}

/**
 * Valor de catálogo (tf) para a dimensão dada, se houver entrada padronizada.
 * @returns {number|null}
 */
export function catalogoCargaDe(tipoEstaca, dimensao_m, formato = 'circular') {
  if (!tipoEstaca || dimensao_m == null) return null;
  const cat = CATALOGO_CARGA_TF[chaveCatalogo(tipoEstaca, formato)];
  if (!cat) return null;
  const cm = Math.round(dimensao_m * 1000) / 10; // cm com 1 casa (ex.: 42.5)
  // match exato (após arredondar a 1 casa) — catálogo é por dimensão padronizada
  return cat[cm] ?? cat[Math.round(cm)] ?? null;
}

/** Carga estrutural de NORMA (tf) = σ_e × A, usando a Tabela 1.10. */
export function cargaNormaDe(tipoEstaca, dimensao_m, formato, coeficientesCustomizados) {
  const sigma = tensaoAdmissivelDe(tipoEstaca, coeficientesCustomizados);
  const geo = geometriaEstaca(formato, dimensao_m);
  if (sigma == null || !geo) return null;
  return GeoSPT.util.cargaEstruturalNorma_tf(sigma, geo.area_ponta_m2);
}

/**
 * Carga estrutural admissível EFETIVA (tf), pela hierarquia do CP-16.
 * @returns {{ valor:number|null, origem:'override'|'catalogo'|'norma'|null,
 *             catalogo:number|null, norma:number|null, sigma_MPa:number|null }}
 */
export function cargaEstruturalEfetiva(estaca, coeficientesCustomizados) {
  const tipo = estaca?.tipoEstaca;
  const dim = dimensaoDe(estaca);
  const formato = formatoDe(estaca);
  const sigma = tensaoAdmissivelDe(tipo, coeficientesCustomizados);
  const catalogo = catalogoCargaDe(tipo, dim, formato);
  const norma = cargaNormaDe(tipo, dim, formato, coeficientesCustomizados);
  const override = estaca?.cargaEstrutural_tf_custom;

  let valor, origem;
  if (override != null && override > 0) {
    valor = override; origem = 'override';
  } else if (catalogo != null) {
    valor = catalogo; origem = 'catalogo';
  } else if (norma != null) {
    valor = norma; origem = 'norma';
  } else {
    valor = null; origem = null;
  }
  return { valor, origem, catalogo, norma, sigma_MPa: sigma };
}

/* ----------------------------------------------------------------------------
 * Alerta A-11 — carga estrutural em uso acima do valor de norma (σ_e × A).
 * Dispara quando a carga efetiva (catálogo ou override) excede a carga de norma.
 * Informa o valor que seria o de norma. Não bloqueia o cálculo.
 * -------------------------------------------------------------------------- */
export function avaliarAlertaA11(estaca, coeficientesCustomizados) {
  const { valor, origem, norma } = cargaEstruturalEfetiva(estaca, coeficientesCustomizados);
  if (valor == null || norma == null) return null;
  if (valor > norma + 1e-6) {
    const origemTxt = origem === 'override' ? 'informada' : 'de catálogo';
    return {
      id: 'A11',
      severidade: 'aviso',
      estaca: estaca?.nome || '',
      mensagem:
        `A11 — carga estrutural ${origemTxt} (${valor.toFixed(1)} tf) é maior que o ` +
        `valor de norma σ_e×A (${norma.toFixed(1)} tf). O cálculo usa o valor ${origemTxt}, ` +
        'mas a norma admitiria menos. Verifique o dimensionamento estrutural. O cálculo NÃO é bloqueado.',
    };
  }
  return null;
}

/**
 * Label legível do tipo de estaca, dado o id.
 */
export function labelTipoEstaca(id) {
  const t = TIPOS_ESTACA.find((t) => t.id === id);
  return t ? t.label : id;
}
