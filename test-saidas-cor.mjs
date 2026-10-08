/* ============================================================================
 * test-saidas-cor.mjs — cor do solo no XLSX e nos PDFs (compacto e completo).
 *
 * Gera as saídas com o Balsas (com e sem cores) e confere: colunas de cor nas
 * leituras e na compatibilização (XLSX e PDF completo), tabela de camadas
 * solo/cor no PDF compacto, e as colunas # furos / Heterogêneo / Subamostrado
 * (antes lidas de um campo `metricas` que a engine não devolve).
 *
 * Empacota com esbuild (alias '@/'), como test-detalhamento.mjs.
 * Uso: node test-saidas-cor.mjs
 * ========================================================================== */

import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { pathToFileURL } from 'url';
import * as XLSX from 'xlsx';
import { BALSAS } from './src/engine/dataset-balsas.js';

const dirTmp = mkdtempSync(join(tmpdir(), 'geospt-cor-'));
const saida = join(dirTmp, 'bundle.mjs');
await build({
  stdin: {
    contents: `
      export { gerarWorkbookXLSX } from '@/abas/AbaSaidas/gerarWorkbookXLSX';
      export { gerarPDFCompacto } from '@/abas/AbaSaidas/gerarPDFCompacto';
      export { gerarPDFCompleto } from '@/abas/AbaSaidas/gerarPDFCompleto';
      export { GeoSPT } from '@/engine/geospt-engine';
    `,
    resolveDir: resolve('.'),
    loader: 'js',
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  alias: { '@': resolve('./src') },
  outfile: saida,
  logLevel: 'error',
});
const { gerarWorkbookXLSX, gerarPDFCompacto, gerarPDFCompleto, GeoSPT } = await import(
  pathToFileURL(saida).href
);

let ok = 0;
let fail = 0;
const t = (nome, cond, extra) => {
  if (cond) ok++;
  else {
    fail++;
    console.log('❌ ' + nome + (extra ? '  → ' + extra : ''));
  }
};

const obraBalsas = (comCor) => {
  const sondagens = JSON.parse(JSON.stringify(BALSAS.sondagens));
  if (comCor) {
    Object.entries(sondagens).forEach(([n, s]) =>
      s.leituras.forEach((l) => {
        l.cor =
          n === 'SPT-04' && l.profundidade_m <= 2
            ? null
            : l.familia === 'Granular'
              ? 'amarela'
              : n === 'SPT-02'
                ? 'cinza'
                : 'vermelha';
      })
    );
  }
  return {
    identificacao: { nome: 'Balsas', localizacao: 'Balsas/MA', sistemaCoordenadas: 'xy_local' },
    sondagens,
    estacas: [
      { nome: 'E-01', tipoEstaca: 'helice_continua', diametro_m: 0.4, cotaArrasamento_m: 253, cargaPrevista_tf: 50, coordenadas: { x: 12.5, y: 12.5 } },
    ],
    parametros: { janelaCompatibilizacao_m: 0.5, coeficientesCustomizados: null },
    dominios: [],
  };
};
const payload = { _schemaVersao: '2.0.7', _engineVersao: '2.0.7', ui: { estacaSelecionada: 'E-01' } };

// Referência independente (engine): cotas heterogêneas e subamostradas
const compatRef = GeoSPT.engine.compatibilizar(BALSAS.sondagens, {});
const nHetero = compatRef.resultados.filter((r) => r.heterogeneo).length;
const nSub = compatRef.metadata.cotasSubamostradas.length;

/* ================================ XLSX ================================ */
{
  const wb = gerarWorkbookXLSX(XLSX, obraBalsas(true), payload);
  const linhas = (aba) => XLSX.utils.sheet_to_json(wb.Sheets[aba], { header: 1, defval: '' });

  // Sondagens: cabeçalho das leituras com "Cor" após "Solo"
  const sond = linhas('Sondagens');
  const iCab = sond.findIndex((r) => r[0] === 'Furo' && r.includes('Profundidade (m)'));
  const cab = sond[iCab];
  t('XLSX Sondagens: coluna Cor após Solo', cab.indexOf('Cor') === cab.indexOf('Solo') + 1);
  const leit = sond.slice(iCab + 1).filter((r) => r[0]);
  const iCor = cab.indexOf('Cor');
  t('XLSX Sondagens: cor das leituras', leit.find((r) => r[0] === 'SPT-01' && r[1] === 3)[iCor] === 'vermelha');
  t('XLSX Sondagens: cor ausente vazia', leit.find((r) => r[0] === 'SPT-04' && r[1] === 1)[iCor] === '');

  // Compatibilização
  const comp = linhas('Compatibilização');
  const h = comp[0];
  ['Furo (envoltória)', 'Cor (envoltória)', 'Cor (média)', 'Cores na cota', '# furos', 'Heterogêneo', 'Subamostrado'].forEach((c) =>
    t('XLSX Compat: coluna ' + c, h.includes(c))
  );
  const corpo = comp.slice(1);
  const col = (n) => h.indexOf(n);
  t('XLSX Compat: # furos preenchido (= engine)', corpo.every((r, i) => r[col('# furos')] === compatRef.resultados[i].nFuros));
  t('XLSX Compat: heterogêneas = engine (' + nHetero + ')', corpo.filter((r) => r[col('Heterogêneo')] === 'sim').length === nHetero && nHetero > 0);
  t('XLSX Compat: subamostradas = engine (' + nSub + ')', corpo.filter((r) => r[col('Subamostrado')] === 'sim').length === nSub);
  const r251 = corpo.find((r) => r[0] === 251);
  t('XLSX Compat: cor da envoltória (SPT-01, coesivo)', r251[col('Furo (envoltória)')] === 'SPT-01' && r251[col('Cor (envoltória)')] === 'vermelha');
  t('XLSX Compat: cor da média (mais frequente)', r251[col('Cor (média)')] === 'vermelha' && /vermelha \(\d\) \| cinza \(1\)/.test(r251[col('Cores na cota')]), r251[col('Cores na cota')]);
  const r239 = corpo.find((r) => r[0] === 239);
  t('XLSX Compat: heterogênea → cor por família', /^C: .+ \| G: amarela$/.test(r239[col('Cor (média)')]), r239[col('Cor (média)')]);

  // Sem cor: colunas vazias, nada quebra
  const wb0 = gerarWorkbookXLSX(XLSX, obraBalsas(false), payload);
  const comp0 = XLSX.utils.sheet_to_json(wb0.Sheets['Compatibilização'], { header: 1, defval: '' });
  t('XLSX sem cor: colunas de cor vazias', comp0.slice(1).every((r) => r[col('Cor (envoltória)')] === '' && r[col('Cor (média)')] === '' && r[col('Cores na cota')] === ''));
  // XLSX gravável (sem erro de estrutura)
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  t('XLSX serializa', buf.length > 1000);
}

/* ============================ PDF COMPLETO ============================ */
{
  const html = gerarPDFCompleto(obraBalsas(true), payload);
  t('PDF completo: leituras com coluna Cor', html.includes('<th>Solo</th><th>Cor</th></tr>'));
  t('PDF completo: compat com Cor (envoltória) e Cor (média)', html.includes('<th>Cor (envoltória)</th>') && html.includes('<th>Cor (média)</th>'));
  t('PDF completo: cores presentes', html.includes('vermelha') && html.includes('amarela') && html.includes('cinza'));
  t('PDF completo: heterogênea por família', /C: vermelha \| G: amarela|C: cinza \| G: amarela/.test(html));
  t('PDF completo: heterog. marcado (= engine)', (html.match(/badge badge-warn">sim</g) || []).length === nHetero);
  t('PDF completo: # furos preenchido', !/<td class="text-mono text-right">undefined<\/td>/.test(html));
  const html0 = gerarPDFCompleto(obraBalsas(false), payload);
  t('PDF completo sem cor: gera, sem cor nas células', html0.includes('Cor (envoltória)') && !/<td(?: class="small")?>(vermelha|amarela|cinza)<\/td>/.test(html0));
}

/* ============================ PDF COMPACTO ============================ */
{
  const html = gerarPDFCompacto(obraBalsas(true), payload);
  t('PDF compacto: seção camadas solo e cor', html.includes('3.2. Camadas: solo e cor'));
  const tab = html.slice(html.indexOf('3.2. Camadas'), html.indexOf('4. Análise'));
  const linhas = (tab.match(/<tr><td class="text-mono text-right">/g) || []).length;
  t('PDF compacto: camadas agrupadas (menos linhas que cotas)', linhas > 0 && linhas < compatRef.resultados.length, String(linhas));
  t('PDF compacto: faixa de cotas agrupada', /\d+ a \d+/.test(tab));
  t('PDF compacto: cores', tab.includes('vermelha') && tab.includes('amarela'));
  const html0 = gerarPDFCompacto(obraBalsas(false), payload);
  t('PDF compacto sem cor: gera com "—"', html0.includes('3.2. Camadas') && !/<td>(vermelha|amarela|cinza)<\/td>/.test(html0));
}

rmSync(dirTmp, { recursive: true, force: true });
console.log('\n=== Cor nas saídas (XLSX/PDF): ' + ok + ' ok / ' + fail + ' fail ===');
process.exit(fail === 0 ? 0 : 1);
