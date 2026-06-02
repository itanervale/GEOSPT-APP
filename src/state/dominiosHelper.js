/* ============================================================================
 * dominiosHelper — utilidades de domínios geotécnicos (CP-12a, SPEC commit 7-B)
 *
 * Centraliza:
 *   - migração de schema antigo (furo.dominioGeotecnico string) → obra.dominios[]
 *   - geração de id curto
 *   - paleta de cores válidas + classes Tailwind estáticas
 *   - obterFurosDoDominio(estaca, obra) → subconjunto de sondagens
 *   - furoParaDominio(nomeFuro, obra) → domínio que contém o furo (p/ visual)
 *
 * Mantém compatibilidade: JSONs pré-7B com `furo.dominioGeotecnico` são migrados
 * na importação; o campo antigo deixa de ser fonte da verdade.
 * ============================================================================ */

// Paleta de 6 cores (SPEC decisão H). Classes Tailwind ESTÁTICAS (JIT do Vite
// não resolve classes montadas dinamicamente como bg-${cor}-100).
export const CORES_DOMINIO = ['blue', 'amber', 'red', 'purple', 'green', 'pink'];

export const CLASSES_COR_DOMINIO = {
  blue: { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-800', dot: 'bg-blue-500' },
  amber: { bg: 'bg-amber-100', border: 'border-amber-400', text: 'text-amber-800', dot: 'bg-amber-500' },
  red: { bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-800', dot: 'bg-red-500' },
  purple: { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-800', dot: 'bg-purple-500' },
  green: { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-800', dot: 'bg-green-500' },
  pink: { bg: 'bg-pink-100', border: 'border-pink-400', text: 'text-pink-800', dot: 'bg-pink-500' },
};

// Hex correspondente (para SVG — mini-mapa). Espelha CORES_DOMINIO em ordem.
export const HEX_COR_DOMINIO = {
  blue: '#2563EB',
  amber: '#D97706',
  red: '#DC2626',
  purple: '#9333EA',
  green: '#16A34A',
  pink: '#DB2777',
};

export function classesCor(cor) {
  return CLASSES_COR_DOMINIO[cor] || CLASSES_COR_DOMINIO.blue;
}

export function hexCor(cor) {
  return HEX_COR_DOMINIO[cor] || HEX_COR_DOMINIO.blue;
}

// id curto único entre os existentes (g1, g2, ...). Determinístico e legível.
export function novoIdDominio(dominiosExistentes) {
  const usados = new Set((dominiosExistentes || []).map((d) => d.id));
  let i = 1;
  while (usados.has('g' + i)) i++;
  return 'g' + i;
}

/* ----------------------------------------------------------------------------
 * Migração: schema antigo → novo
 * Pré-7B: cada sondagem tinha `dominioGeotecnico` (string com o nome do grupo).
 * Pós-7B: obra.dominios[] = [{ id, nome, cor, furos:[], origem }].
 *
 * Regra: se a obra NÃO tem dominios[] (ou está vazio) MAS há furos com
 * dominioGeotecnico, agrupar furos por esse nome e construir dominios[].
 * Retorna SEMPRE um array (vazio se não há nada a migrar).
 * -------------------------------------------------------------------------- */
export function migrarDominios(obra) {
  // Já tem schema novo populado → não mexer
  if (Array.isArray(obra.dominios) && obra.dominios.length > 0) {
    return obra.dominios;
  }

  const sondagens = obra.sondagens || {};
  const grupos = new Map(); // nome do domínio → [nomes de furos]
  for (const [nomeFuro, s] of Object.entries(sondagens)) {
    const nomeDom = s && s.dominioGeotecnico;
    if (nomeDom) {
      if (!grupos.has(nomeDom)) grupos.set(nomeDom, []);
      grupos.get(nomeDom).push(nomeFuro);
    }
  }

  if (grupos.size === 0) return []; // nada a migrar

  const dominios = [];
  let i = 0;
  for (const [nome, furos] of grupos.entries()) {
    dominios.push({
      id: 'g' + (i + 1),
      nome: nome,
      cor: CORES_DOMINIO[i % CORES_DOMINIO.length],
      furos: furos,
      origem: 'migrado',
    });
    i++;
  }
  return dominios;
}

/* ----------------------------------------------------------------------------
 * obterFurosDoDominio(estaca, obra) → objeto { nomeFuro → sondagem }
 * (SPEC algoritmo). Estaca sem dominioId → todos os furos (comportamento atual).
 * dominioId inválido → fallback para todos + warning.
 * -------------------------------------------------------------------------- */
export function obterFurosDoDominio(estaca, obra) {
  const sondagens = obra.sondagens || {};
  if (!estaca || !estaca.dominioId) {
    return sondagens; // todos
  }
  const dominio = (obra.dominios || []).find((d) => d.id === estaca.dominioId);
  if (!dominio) {
    console.warn(
      'Estaca ' + (estaca.nome || '?') + ' tem dominioId inválido: ' + estaca.dominioId
    );
    return sondagens;
  }
  const filtrados = {};
  (dominio.furos || []).forEach((nomeFuro) => {
    if (sondagens[nomeFuro]) filtrados[nomeFuro] = sondagens[nomeFuro];
  });
  return filtrados;
}

/* ----------------------------------------------------------------------------
 * furoParaDominio(nomeFuro, obra) → o domínio que contém o furo, ou null.
 * Usado por visualizações (mini-mapa) que antes liam furo.dominioGeotecnico.
 * Camada de derivação: lê do schema NOVO sem precisar do campo antigo.
 * -------------------------------------------------------------------------- */
export function furoParaDominio(nomeFuro, obra) {
  return (obra.dominios || []).find((d) => (d.furos || []).includes(nomeFuro)) || null;
}

// Conveniência: nome do domínio de um furo (string) ou null.
export function nomeDominioDoFuro(nomeFuro, obra) {
  const d = furoParaDominio(nomeFuro, obra);
  return d ? d.nome : null;
}

/* ----------------------------------------------------------------------------
 * resolverFurosParaCalculo(estaca, obra) — CP-12c
 * Resolve o conjunto de furos que os modos de cálculo devem usar para a estaca,
 * com metadados para a UI (badge de filtro, bloqueio do Modo 4).
 *
 * Retorna:
 *   {
 *     sondagens,        // subset { nomeFuro → sondagem } (ou todas, se sem domínio)
 *     dominio,          // objeto do domínio aplicado, ou null
 *     temFiltro,        // bool — true se a estaca tem domínio válido
 *     nFuros,           // nº de furos no conjunto resultante
 *     modo4Disponivel,  // bool — false se filtrado e < 3 furos
 *   }
 * -------------------------------------------------------------------------- */
export function resolverFurosParaCalculo(estaca, obra) {
  const todas = obra.sondagens || {};
  const dominio =
    estaca && estaca.dominioId
      ? (obra.dominios || []).find((d) => d.id === estaca.dominioId) || null
      : null;

  if (!dominio) {
    return {
      sondagens: todas,
      dominio: null,
      temFiltro: false,
      nFuros: Object.keys(todas).length,
      modo4Disponivel: Object.keys(todas).length >= 3,
    };
  }

  const subset = obterFurosDoDominio(estaca, obra);
  const nFuros = Object.keys(subset).length;
  return {
    sondagens: subset,
    dominio,
    temFiltro: true,
    nFuros,
    modo4Disponivel: nFuros >= 3,
  };
}
