/* ============================================================================
 * test-persistencia.mjs — valida a camada de autosave (CP-17).
 *
 * Roda em Node com um mock de window.localStorage. Como persistenciaObra.js
 * importa estadoInicial.js sem extensão (Vite resolve, Node não), o teste lê o
 * fonte e injeta a extensão num arquivo temporário antes de importar.
 *
 * Uso: node test-persistencia.mjs
 * ========================================================================== */

import { readFileSync, writeFileSync, unlinkSync } from 'fs';

// --- Mock de localStorage (com simulação opcional de quota) ---
const store = {};
let limiteBytes = Infinity;
global.window = {
  localStorage: {
    setItem: (k, v) => {
      const total = Object.values({ ...store, [k]: v }).join('').length;
      if (total > limiteBytes) {
        const e = new Error('quota');
        e.name = 'QuotaExceededError';
        throw e;
      }
      store[k] = v;
    },
    getItem: (k) => (k in store ? store[k] : null),
    removeItem: (k) => {
      delete store[k];
    },
  },
};

// --- Carregar o módulo com import resolvível no Node ---
const TMP = './src/state/__persist_test_tmp.mjs';
const src = readFileSync('./src/state/persistenciaObra.js', 'utf8').replace(
  "from './estadoInicial'",
  "from './estadoInicial.js'"
);
writeFileSync(TMP, src);

let ok = 0;
let fail = 0;
const t = (n, c) => {
  if (c) ok++;
  else {
    fail++;
    console.log('❌', n);
  }
};

try {
  const m = await import('./src/state/__persist_test_tmp.mjs');
  const {
    salvarObra,
    carregarObraSalva,
    limparObraSalva,
    obraTemConteudo,
    localStorageDisponivel,
    existeAutosave,
  } = m;

  // 1. Disponibilidade
  t('localStorage disponível (mock)', localStorageDisponivel() === true);

  // 2. Obra vazia não persiste
  const vazio = { obra: { identificacao: { nome: '' }, sondagens: {}, estacas: [] } };
  t('obra vazia → obraTemConteudo false', obraTemConteudo(vazio) === false);
  const rv = salvarObra(vazio);
  t('salvar vazia → ok + flag vazia', rv.ok && rv.vazia === true);
  t('nada persistido após salvar vazia', carregarObraSalva() === null);
  t('existeAutosave false quando vazio', existeAutosave() === false);

  // 3. Obra com conteúdo: salva e recupera
  const obra = {
    obra: {
      identificacao: { nome: 'Balsas' },
      sondagens: { 'SPT-01': { cotaTopo_m: 254 } },
      estacas: [{ nome: 'E-01' }],
      parametros: { janelaCompatibilizacao_m: 0.5 },
      dominios: [],
      corteEsquematico: { sequencia: [] },
      resultadosCalculo: { algo: 'pesado' },
    },
    ui: { abaAtiva: 'capacidade', estacaSelecionada: 0, modoCalculoSelecionado: 'envoltoria' },
  };
  const rs = salvarObra(obra);
  t('salvar com conteúdo → ok', rs.ok && rs.bytes > 0);
  const c = carregarObraSalva();
  t('carregar retorna payload', !!(c && c.payload));
  t('nome preservado', c.nome === 'Balsas');
  t('sondagens preservadas', c.payload.obra.sondagens['SPT-01'].cotaTopo_m === 254);
  t('estacas preservadas', c.payload.obra.estacas[0].nome === 'E-01');
  t('UI resumida preservada', c.payload.ui.abaAtiva === 'capacidade');
  t('resultadosCalculo OMITIDO (enxuto)', c.payload.obra.resultadosCalculo === undefined);
  t('existeAutosave true com conteúdo', existeAutosave() === true);

  // 4. Limpar
  limparObraSalva();
  t('após limpar → null', carregarObraSalva() === null);

  // 5. Schema incompatível (versão diferente)
  window.localStorage.setItem(
    'geospt:autosave:v1',
    JSON.stringify({ _schema: 'geospt-autosave', _schemaVersao: '0.0.1', obra: {}, ui: {} })
  );
  const ci = carregarObraSalva();
  t('schema de versão diferente → incompativel', !!(ci && ci.incompativel === true));

  // 6. JSON corrompido não quebra
  window.localStorage.setItem('geospt:autosave:v1', '{lixo!!');
  t('JSON corrompido → null (sem exceção)', carregarObraSalva() === null);

  // 7. Quota estourada → ok:false, motivo:'quota'
  limparObraSalva();
  limiteBytes = 50; // força estouro no próximo set
  const rq = salvarObra(obra);
  t('quota estourada → ok:false motivo quota', rq.ok === false && rq.motivo === 'quota');
  limiteBytes = Infinity;
} finally {
  try {
    unlinkSync(TMP);
  } catch {
    /* ignore */
  }
}

console.log(`\n=== Persistência (autosave): ${ok} ok / ${fail} fail ===`);
process.exit(fail ? 1 : 0);
