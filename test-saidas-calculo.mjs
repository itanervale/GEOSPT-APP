/* ============================================================================
 * test-saidas-calculo.mjs — XLSX e PDFs calculam igual à Aba 6.
 *
 * Antes, XLSX e PDFs recalculavam por conta própria com a janela padrão
 * (0,5 m), todos os furos (sem filtro de domínio) e o arrasamento decimal no
 * por furo. Agora usam calculoSaidas → prepararPerfilCalculo (a abstração da
 * Aba 6). Este teste compara as saídas com prepararPerfilCalculo calculado de
 * forma independente, em 4 cenários: padrão (regressão 32,84), janela 1,0 m,
 * domínio e arrasamento decimal.
 *
 * Uso: node test-saidas-calculo.mjs
 * ========================================================================== */

import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { pathToFileURL } from 'url';
import * as XLSX from 'xlsx';
import { BALSAS } from './src/engine/dataset-balsas.js';

const dirTmp = mkdtempSync(join(tmpdir(), 'geospt-calc-'));
const saida = join(dirTmp, 'bundle.mjs');
await build({
  stdin: {
    contents: `
      export { gerarWorkbookXLSX } from '@/abas/AbaSaidas/gerarWorkbookXLSX';
      export { gerarPDFCompacto } from '@/abas/AbaSaidas/gerarPDFCompacto';
      export { gerarPDFCompleto } from '@/abas/AbaSaidas/gerarPDFCompleto';
      export { calcularModosSaida } from '@/abas/AbaSaidas/calculoSaidas';
      export { prepararPerfilCalculo } from '@/abas/AbaCapacidade/prepararPerfilCalculo';
      export { construirOpcoesCalculo } from '@/abas/AbaCapacidade/calculoHelpers';
      export { resolverFurosParaCalculo } from '@/state/dominiosHelper';
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
const M = await import(pathToFileURL(saida).href);
const {
  gerarWorkbookXLSX,
  gerarPDFCompacto,
  gerarPDFCompleto,
  calcularModosSaida,
  prepararPerfilCalculo,
  construirOpcoesCalculo,
  resolverFurosParaCalculo,
  GeoSPT,
} = M;

let ok = 0;
let fail = 0;
const t = (nome, cond, extra) => {
  if (cond) ok++;
  else {
    fail++;
    console.log('❌ ' + nome + (extra ? '  → ' + extra : ''));
  }
};

const obraBase = (ajuste) => {
  const obra = {
    identificacao: { nome: 'Balsas', localizacao: 'Balsas/MA', sistemaCoordenadas: 'xy_local' },
    sondagens: JSON.parse(JSON.stringify(BALSAS.sondagens)),
    estacas: [
      { nome: 'E-01', tipoEstaca: 'helice_continua', diametro_m: 0.4, cotaArrasamento_m: 253, cargaPrevista_tf: 50, coordenadas: { x: 12.5, y: 12.5 } },
    ],
    parametros: { janelaCompatibilizacao_m: 0.5, coeficientesCustomizados: null },
    dominios: [],
  };
  if (ajuste) ajuste(obra);
  return obra;
};
const payload = { _schemaVersao: '2.0.7', _engineVersao: '2.0.7', ui: { estacaSelecionada: 'E-01' } };

// Referência independente: o que a Aba 6 calcula (prepararPerfilCalculo + DQ/AV)
function aba6(obra, modo, submodo) {
  const estaca = obra.estacas[0];
  const filtro = resolverFurosParaCalculo(estaca, obra);
  const r = prepararPerfilCalculo({ modo, submodo, sondagens: filtro.sondagens, estaca, params: obra.parametros, filtroDominio: filtro });
  if (r.erro) return { erro: r.erro };
  if (modo === 'por_furo') return r.porFuro;
  if (modo === 'interpolacao') return r.interpolacao;
  const opc = construirOpcoesCalculo(estaca, obra.parametros);
  return {
    dq: GeoSPT.engine.calcularDQ(r.perfilParaCalculo, opc).memorial,
    av: GeoSPT.engine.calcularAV(r.perfilParaCalculo, opc).memorial,
  };
}

// Memorial Modo 1 do XLSX → { cota: { dq, av } } (Q_adm final, 2 casas)
function xlsxModo1(wb) {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets['Modo 1 - Envoltória'], { header: 1, defval: '' });
  const ih = rows.findIndex((r) => r[0] === 'Cota ponta (m)');
  const h = rows[ih];
  const m = {};
  rows.slice(ih + 1).forEach((r) => {
    if (r[0] !== '') m[r[0]] = { dq: r[h.indexOf('DQ Q_adm final (tf)')], av: r[h.indexOf('AV Q_adm final (tf)')] };
  });
  return { m, linhas: rows };
}
const fx = (v) => (v == null ? '' : v.toFixed(2));
const igualModo1 = (wb, ref) => {
  const { m } = xlsxModo1(wb);
  const avMap = Object.fromEntries(ref.av.map((x) => [x.cotaPonta_m, x]));
  return ref.dq.length > 0 && ref.dq.every((d) => m[d.cotaPonta_m] && m[d.cotaPonta_m].dq === fx(d.Qadm_final_tf) && m[d.cotaPonta_m].av === fx(avMap[d.cotaPonta_m]?.Qadm_final_tf));
};
const furosModo3 = (wb) => {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets['Modo 3 - Por Furo'], { header: 1, defval: '' });
  const ih = rows.findIndex((r) => r[0] === 'Furo');
  return rows.slice(ih + 1).filter((r) => r[0]).map((r) => ({ furo: r[0], cota: r[1] }));
};

/* ===================== 1) Padrão — regressão 32,84 ===================== */
{
  const obra = obraBase();
  const wb = gerarWorkbookXLSX(XLSX, obra, payload);
  t('padrão: XLSX Modo 1 = Aba 6', igualModo1(wb, aba6(obra, 'envoltoria', null)));
  t('padrão: XLSX Modo 1 cota 242 DQ = 32.84 tf', xlsxModo1(wb).m[242]?.dq === '32.84', xlsxModo1(wb).m[242]?.dq);
  const txt = xlsxModo1(wb).linhas.find((r) => String(r[0]).startsWith('Furos considerados'));
  t('padrão: XLSX informa furos e janela', !!txt && /todos os furos da obra \(5\)/.test(txt[0]) && /janela de compatibilização = 0.5 m/.test(txt[0]), txt && txt[0]);
}

/* ===================== 2) Janela 1,0 m ===================== */
{
  const obra = obraBase((o) => (o.parametros.janelaCompatibilizacao_m = 1.0));
  const ref05 = aba6(obraBase(), 'envoltoria', null);
  const ref10 = aba6(obra, 'envoltoria', null);
  const difere = JSON.stringify(ref05.dq.map((x) => x.Qadm_final_tf)) !== JSON.stringify(ref10.dq.map((x) => x.Qadm_final_tf));
  t('janela 1,0: muda o resultado da Aba 6 (cenário significativo)', difere);
  const wb = gerarWorkbookXLSX(XLSX, obra, payload);
  t('janela 1,0: XLSX Modo 1 = Aba 6', igualModo1(wb, ref10));
  // Aba Compatibilização = compatibilizar com janela 1,0
  const comp = XLSX.utils.sheet_to_json(wb.Sheets['Compatibilização'], { header: 1, defval: '' });
  const c10 = GeoSPT.engine.compatibilizar(obra.sondagens, { janela_m: 1.0 }).resultados;
  const h = comp[0];
  t('janela 1,0: XLSX Compatibilização = compatibilizar(1,0)', comp.length - 1 === c10.length && comp.slice(1).every((r, i) => r[0] === c10[i].cotaRef_m && r[h.indexOf('NSPT envoltória')] === (c10[i].envoltoria.nspt ?? '') && r[h.indexOf('# furos')] === c10[i].nFuros));
  // Modo 2.2 / por furo / interpolação via helper = Aba 6
  const calc = calcularModosSaida(obra.estacas[0], obra, obra.parametros, { incluir23: true });
  const r22 = aba6(obra, 'perfil_medio', '2.2_conservador');
  t('janela 1,0: modo 2.2 = Aba 6', JSON.stringify(calc.modo2_2.memDq) === JSON.stringify(r22.dq));
  const r3 = aba6(obra, 'por_furo', null);
  t('janela 1,0: por furo = Aba 6', JSON.stringify(calc.modo3.resultados.map((f) => f.dq?.memorial)) === JSON.stringify(r3.resultados.map((f) => f.dq?.memorial)));
  const r4 = aba6(obra, 'interpolacao', null);
  t('janela 1,0: interpolação = Aba 6', JSON.stringify(calc.modo4.memorial) === JSON.stringify(r4.memorial));
  // PDFs: cabeçalho informa janela 1 m
  const pc = gerarPDFCompleto(obra, payload);
  t('janela 1,0: PDF completo informa janela', pc.includes('janela de compatibilização 1 m'));
}

/* ===================== 3) Domínio ===================== */
{
  const dom = (furos) => (o) => {
    o.dominios = [{ id: 'g1', nome: 'Norte', cor: 'blue', furos }];
    o.estacas[0].dominioId = 'g1';
  };
  const obra = obraBase(dom(['SPT-02', 'SPT-03', 'SPT-04']));
  const refDom = aba6(obra, 'envoltoria', null);
  const refTodos = aba6(obraBase(), 'envoltoria', null);
  t('domínio: muda o resultado da Aba 6 (cenário significativo)', JSON.stringify(refDom.dq.map((x) => x.Qadm_final_tf)) !== JSON.stringify(refTodos.dq.map((x) => x.Qadm_final_tf)));
  const wb = gerarWorkbookXLSX(XLSX, obra, payload);
  t('domínio: XLSX Modo 1 = Aba 6 (furos do domínio)', igualModo1(wb, refDom));
  const f3 = furosModo3(wb).map((r) => r.furo).sort();
  t('domínio: XLSX Modo 3 só furos do domínio', JSON.stringify(f3) === JSON.stringify(['SPT-02', 'SPT-03', 'SPT-04']), f3.join(','));
  const pc = gerarPDFCompacto(obra, payload);
  t('domínio: PDF compacto informa o domínio', pc.includes('domínio &quot;Norte&quot;: SPT-02, SPT-03, SPT-04'));
  const pf = gerarPDFCompleto(obra, payload);
  t('domínio: PDF completo informa o domínio', pf.includes('domínio &quot;Norte&quot;: SPT-02, SPT-03, SPT-04'));

  // Domínio com 2 furos → Modo 4 bloqueado (como na Aba 6)
  const obra2 = obraBase(dom(['SPT-01', 'SPT-02']));
  const calc2 = calcularModosSaida(obra2.estacas[0], obra2, obra2.parametros);
  t('domínio <3 furos: Modo 4 bloqueado', /menos de 3 furos/.test(calc2.modo4.erro || ''), calc2.modo4.erro);
  const wb2 = gerarWorkbookXLSX(XLSX, obra2, payload);
  t('domínio <3 furos: XLSX sem aba Modo 4', !wb2.SheetNames.includes('Modo 4 - Interpolação'));
  const pc2 = gerarPDFCompacto(obra2, payload);
  t('domínio <3 furos: PDF compacto mostra o bloqueio', /Não calculado: <em>Domínio &quot;Norte&quot; tem menos de 3 furos/.test(pc2));
}

/* ===================== 4) Arrasamento decimal ===================== */
{
  const obra = obraBase((o) => (o.estacas[0].cotaArrasamento_m = 253.7));
  const calc = calcularModosSaida(obra.estacas[0], obra, obra.parametros);
  const refFloor = aba6(obraBase(), 'por_furo', null); // arrasamento 253 (inteiro)
  t('decimal 253,7: por furo usa floor (= 253)', JSON.stringify(calc.modo3.resultados.map((f) => f.dq?.memorial)) === JSON.stringify(refFloor.resultados.map((f) => f.dq?.memorial)));
  const wb = gerarWorkbookXLSX(XLSX, obra, payload);
  const wbInt = gerarWorkbookXLSX(XLSX, obraBase(), payload);
  t('decimal 253,7: XLSX Modo 3 = inteiro 253', JSON.stringify(furosModo3(wb)) === JSON.stringify(furosModo3(wbInt)));
}

/* ============ 5) Aba 6 — por furo com opções completas; interpolação com janela ============ */
{
  const comE = (e, ajuste) => obraBase((o) => { o.estacas = [e]; if (ajuste) ajuste(o); });
  const E04 = { nome: 'E-04', tipoEstaca: 'premoldada', diametro_m: 0.3, cotaArrasamento_m: 257, cargaPrevista_tf: 45, coordenadas: { x: 16, y: 5 } };
  const dqEm = (pf, furo, cota) => pf.resultados.find((f) => f.furo === furo)?.dq?.memorial.find((m) => m.cotaPonta_m === cota)?.Qadm_final_tf;

  // Carga estrutural efetiva (CP-16) — antes o por furo usava a tabela antiga (50,00 tf)
  const pf = aba6(comE(E04), 'por_furo', null);
  t('por furo: E-04 SPT-02 @242 usa limite estrutural CP-16 (51,10)', dqEm(pf, 'SPT-02', 242)?.toFixed(2) === '51.10', dqEm(pf, 'SPT-02', 242));
  t('por furo: E-04 SPT-05 @242 usa limite estrutural CP-16 (57,66)', dqEm(pf, 'SPT-05', 242)?.toFixed(2) === '57.66', dqEm(pf, 'SPT-05', 242));
  // = envoltória? Para o furo que domina a envoltória, por furo e Modo 1 coincidem na cota 242 (E-01, SPT-01)
  const pf01 = aba6(obraBase(), 'por_furo', null);
  t('por furo: E-01 SPT-01 @242 = 32,84 (regressão)', dqEm(pf01, 'SPT-01', 242)?.toFixed(2) === '32.84');

  // Coeficientes customizados passam a valer no por furo
  const custom = (o) => { o.parametros.coeficientesCustomizados = JSON.parse(JSON.stringify(GeoSPT.domain.coefficients)); o.parametros.coeficientesCustomizados.DQ_C['Argila Silto-Arenosa'] = 300; };
  const pfC = aba6(comE(obraBase().estacas[0], custom), 'por_furo', null);
  t('por furo: coeficiente customizado altera o resultado', dqEm(pfC, 'SPT-01', 242) !== dqEm(pf01, 'SPT-01', 242), dqEm(pfC, 'SPT-01', 242) + ' vs ' + dqEm(pf01, 'SPT-01', 242));

  // Flag "despreza último metro" desligada passa a valer no por furo
  const pfF = aba6(comE(obraBase().estacas[0], (o) => (o.parametros.desprezaUltimoMetroAtrito = false)), 'por_furo', null);
  t('por furo: flag de atrito altera o resultado', dqEm(pfF, 'SPT-01', 242) > dqEm(pf01, 'SPT-01', 242));

  // Formato quadrado (pré-moldada) passa a valer no por furo
  const pfQ = aba6(comE({ ...E04, formato: 'quadrada', dimensao_m: 0.3 }), 'por_furo', null);
  const pfCirc = aba6(comE(E04), 'por_furo', null);
  t('por furo: seção quadrada altera o resultado', dqEm(pfQ, 'SPT-03', 242) !== dqEm(pfCirc, 'SPT-03', 242), dqEm(pfQ, 'SPT-03', 242) + ' vs ' + dqEm(pfCirc, 'SPT-03', 242));

  // Interpolação passa a usar a janela da obra
  const i05 = aba6(obraBase(), 'interpolacao', null);
  const i10 = aba6(obraBase((o) => (o.parametros.janelaCompatibilizacao_m = 1.0)), 'interpolacao', null);
  t('interpolação: janela 1,0 altera o resultado', JSON.stringify(i05.memorial.map((m) => m.dq?.Qadm_interpolado_tf)) !== JSON.stringify(i10.memorial.map((m) => m.dq?.Qadm_interpolado_tf)));

  // Saídas acompanham (XLSX Modo 3 da E-04 = Aba 6)
  const wb = gerarWorkbookXLSX(XLSX, comE(E04), { ...payload, ui: { estacaSelecionada: 'E-04' } });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets['Modo 3 - Por Furo'], { header: 1, defval: '' });
  const ih = rows.findIndex((r) => r[0] === 'Furo');
  const h = rows[ih];
  const ok3 = pf.resultados.every((f) => {
    const r = rows.slice(ih + 1).find((x) => x[0] === f.furo);
    const s2 = r && r[h.indexOf('Cota sugerida (m)')];
    return r != null && s2 !== undefined;
  });
  t('XLSX Modo 3 da E-04 lista os furos calculados pela Aba 6', ok3);
}

rmSync(dirTmp, { recursive: true, force: true });
console.log('\n=== Saídas = Aba 6 (XLSX/PDF): ' + ok + ' ok / ' + fail + ' fail ===');
process.exit(fail === 0 ? 0 : 1);
