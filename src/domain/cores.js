/* ============================================================================
 * cores — cor do solo (texto livre do laudo), informativa
 *
 * A cor NÃO entra em nenhum cálculo: serve para a obra conferir em campo se o
 * solo escavado corresponde ao da sondagem. Fica em `leitura.cor` (string ou
 * null), digitada na Aba 2 ou trazida pela extração do PDF.
 *
 * A compatibilização da engine NÃO é alterada. As cores das cotas
 * compatibilizadas são derivadas aqui, por fora, a partir do que a engine já
 * devolve por cota e por furo (profPorSondagem_m, familiaPorSondagem,
 * nsptPorSondagem):
 *   - envoltória → cor da MESMA leitura (mesmo furo) que deu o NSPT mínimo,
 *     como o solo e a família da envoltória;
 *   - média → por família, a cor mais frequente entre os furos que entram na
 *     média daquela família (mesma regra do solo predominante, que é a moda);
 *     cotas heterogêneas listam por família, como o soloPred ("C: … | G: …").
 *
 * Cores iguais são agrupadas ignorando maiúsculas, acentos e espaços extras; a
 * grafia exibida é a da primeira ocorrência (o laudo costuma ser consistente).
 * ============================================================================ */

const FAMILIAS = ['Coesivo', 'Granular', 'Intermediário'];
const SIGLA = { Coesivo: 'C', Granular: 'G', 'Intermediário': 'I' };

/** Texto exibível da cor, ou null se vazio. */
export function limparCor(cor) {
  if (cor == null) return null;
  const s = String(cor).replace(/\s+/g, ' ').trim();
  return s === '' ? null : s;
}

/** Chave para agrupar cores iguais (minúsculas, sem acento, espaços colapsados). */
export function chaveCor(cor) {
  const s = limparCor(cor);
  if (s == null) return null;
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** Cor da leitura do furo na profundidade dada (null se não houver). */
export function corDaLeitura(sondagem, profundidade_m) {
  if (!sondagem || profundidade_m == null) return null;
  const l = (sondagem.leituras || []).find((x) => x.profundidade_m === profundidade_m);
  return l ? limparCor(l.cor) : null;
}

/**
 * Agrupa cores (na ordem recebida) → { cor, detalhe }.
 * cor = mais frequente (empate: a que apareceu primeiro); detalhe lista todas
 * com contagem quando há mais de uma ("vermelha (3) | cinza (1)").
 */
export function resumirCores(cores) {
  const grupos = new Map(); // chave → { cor, n, ordem }
  cores.forEach((c) => {
    const k = chaveCor(c);
    if (k == null) return;
    if (!grupos.has(k)) grupos.set(k, { cor: limparCor(c), n: 0, ordem: grupos.size });
    grupos.get(k).n++;
  });
  if (grupos.size === 0) return { cor: null, detalhe: null };
  const lista = [...grupos.values()].sort((a, b) => b.n - a.n || a.ordem - b.ordem);
  return {
    cor: lista[0].cor,
    detalhe:
      lista.length === 1 ? lista[0].cor : lista.map((g) => g.cor + ' (' + g.n + ')').join(' | '),
  };
}

/**
 * Cores de uma cota da compatibilização (linha de engine.compatibilizar().resultados).
 * @param {object} r - linha da compatibilização
 * @param {object} sondagens - { nome → sondagem } usado na compatibilização
 * @returns {{
 *   envoltoria: string|null,
 *   porFamilia: { [familia]: { cor, detalhe } },
 *   predominante: string|null,   // cor da média em cota homogênea
 *   detalhe: string|null         // resumo da cota (como soloPred)
 * }}
 */
export function coresDaCota(r, sondagens) {
  const nomes = Object.keys(r.nsptPorSondagem || {});
  const furoEnv = r.envoltoria ? r.envoltoria.furo : null;
  const envoltoria = furoEnv
    ? corDaLeitura(sondagens[furoEnv], r.profPorSondagem_m?.[furoEnv])
    : null;

  // Mesmos furos que entram na média de cada família (NSPT presente na cota).
  const coresPorFamilia = {};
  FAMILIAS.forEach((f) => (coresPorFamilia[f] = []));
  nomes.forEach((n) => {
    if (r.nsptPorSondagem[n] == null) return;
    const fam = r.familiaPorSondagem?.[n];
    if (!coresPorFamilia[fam]) return;
    coresPorFamilia[fam].push(corDaLeitura(sondagens[n], r.profPorSondagem_m?.[n]));
  });
  const porFamilia = {};
  FAMILIAS.forEach((f) => (porFamilia[f] = resumirCores(coresPorFamilia[f])));

  let predominante = null;
  let detalhe = null;
  if (r.heterogeneo) {
    const partes = FAMILIAS.filter((f) => coresPorFamilia[f].length > 0).map(
      (f) => SIGLA[f] + ': ' + (porFamilia[f].cor || '—')
    );
    detalhe = partes.some((p) => !p.endsWith('—')) ? partes.join(' | ') : null;
  } else if (porFamilia[r.familiaPred]) {
    predominante = porFamilia[r.familiaPred].cor;
    detalhe = porFamilia[r.familiaPred].detalhe;
  }
  return { envoltoria, porFamilia, predominante, detalhe };
}
