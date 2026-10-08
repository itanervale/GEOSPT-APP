/* ============================================================================
 * test-detalhamento.mjs — valida a exportação para detalhamento de estacas.
 *
 * Cobre: (1) Balsas completo; (2) obra sem coordenadas e sem domínio;
 * (3) domínio com subconjunto de furos; (4) domínio vazio / inválido;
 * (5) cor do solo (esquema 1.1.0): envoltória, média, heterogênea, sem cor,
 *     grafias equivalentes, e a cor não altera nenhum valor numérico.
 * Confere que envoltória, média e cotas sugeridas BATEM com as Abas 3 e 6
 * (mesmas funções, calculadas de forma independente aqui).
 *
 * O gerador usa o alias '@/' do Vite; o teste empacota com esbuild (já presente
 * como dependência do Vite) para um arquivo temporário e importa de lá.
 *
 * Uso: node test-detalhamento.mjs
 * ========================================================================== */

import { build } from 'esbuild';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { pathToFileURL } from 'url';
import { BALSAS } from './src/engine/dataset-balsas.js';

// --- Empacotar o gerador + helpers das Abas 3/6 ---
const dirTmp = mkdtempSync(join(tmpdir(), 'geospt-detal-'));
const saida = join(dirTmp, 'bundle.mjs');
await build({
  stdin: {
    contents: `
      export * from '@/abas/AbaSaidas/gerarDetalhamentoJSON';
      export { prepararPerfilCalculo } from '@/abas/AbaCapacidade/prepararPerfilCalculo';
      export { construirOpcoesCalculo, encontrarCotaSugeridaConservadora } from '@/abas/AbaCapacidade/calculoHelpers';
      export { GeoSPT } from '@/engine/geospt-engine';
      export { resumirCores, chaveCor } from '@/domain/cores';
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
  gerarDetalhamentoJSON,
  DETALHAMENTO_SCHEMA,
  DETALHAMENTO_SCHEMA_VERSAO,
  prepararPerfilCalculo,
  construirOpcoesCalculo,
  encontrarCotaSugeridaConservadora,
  GeoSPT,
  resumirCores,
  chaveCor,
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
const clone = (o) => JSON.parse(JSON.stringify(o));

// --- Obras de teste ---
// Estacas idênticas às do botão "Balsas (demo)" (src/layout/Header.jsx).
const estacasBalsas = () => [
  { nome: 'E-01', tipoEstaca: 'helice_continua', diametro_m: 0.4, cotaArrasamento_m: 253, cargaPrevista_tf: 50, coordenadas: { x: 12.5, y: 12.5 }, dominioGeotecnico: null },
  { nome: 'E-02', tipoEstaca: 'helice_continua', diametro_m: 0.4, cotaArrasamento_m: 250, cargaPrevista_tf: 40, coordenadas: { x: 5, y: 5 }, dominioGeotecnico: null },
  { nome: 'E-03', tipoEstaca: 'raiz', diametro_m: 0.3, cotaArrasamento_m: 250, cargaPrevista_tf: 110, coordenadas: { x: 5, y: 16 }, dominioGeotecnico: null },
  { nome: 'E-04', tipoEstaca: 'premoldada', diametro_m: 0.3, cotaArrasamento_m: 257, cargaPrevista_tf: 45, coordenadas: { x: 16, y: 5 }, dominioGeotecnico: null },
];
const obraBalsas = () => ({
  identificacao: { nome: BALSAS.obra.nome, localizacao: BALSAS.obra.localizacao, sistemaCoordenadas: 'xy_local', responsavelTecnico: '' },
  sondagens: clone(BALSAS.sondagens),
  estacas: estacasBalsas(),
  parametros: { janelaCompatibilizacao_m: 0.5, coeficientesCustomizados: null },
  dominios: [],
});

const CHAVES_ESTACA = ['nome', 'tipoEstaca', 'formato', 'dimensao_m', 'cotaArrasamento_m', 'cargaPrevista_tf', 'coordenadas', 'dominioId', 'dominioNome', 'furosConsiderados', 'sondagensPorDistancia', 'sondagemMaisProxima', 'cotaPontaSugerida_m', 'avisos', 'perfis'];
const CHAVES_SONDAGEM = ['nome', 'cotaBoca_m', 'profundidadeFinal_m', 'criterioParalisacao', 'naInicial_m', 'naFinal_m', 'naInicialCota_m', 'naFinalCota_m', 'coordenadas', 'dominioId', 'leituras'];
const CHAVES_LEITURA = ['profundidade_m', 'cota_m', 'nspt_real', 'nspt_calculo', 'impenetravel', 'solo', 'familia', 'cor'];
const CHAVES_ENV = ['cota_m', 'nspt', 'nspt_real', 'impenetravel', 'solo', 'familia', 'furo', 'nFuros', 'cor'];
const CHAVES_MEDIA = ['cota_m', 'nspt', 'nspt_real', 'solo', 'familia', 'heterogeneo', 'soloDetalhe', 'nFuros', 'origem', 'cor', 'corDetalhe'];
const tem = (o, chaves) => chaves.every((k) => Object.prototype.hasOwnProperty.call(o, k));

function validarEstrutura(rotulo, j) {
  // JSON válido (ida e volta) e sem `undefined`
  const s = JSON.stringify(j);
  t(rotulo + ': serializa', typeof s === 'string' && s.length > 10);
  const volta = JSON.parse(s);
  t(rotulo + ': _schema', volta._schema === DETALHAMENTO_SCHEMA && volta._schemaVersao === DETALHAMENTO_SCHEMA_VERSAO && volta._schemaVersao === '1.1.0');
  t(rotulo + ': _engineVersao', volta._engineVersao === GeoSPT.versao);
  t(rotulo + ': _geradoEm ISO', !Number.isNaN(Date.parse(volta._geradoEm)));
  t(rotulo + ': blocos raiz', tem(volta, ['obra', 'referencialCotas', 'parametros', 'avisos', 'dominios', 'sondagens', 'estacas']));
  t(rotulo + ': obra', tem(volta.obra, ['nome', 'localizacao', 'responsavelTecnico', 'sistemaCoordenadas']));
  t(rotulo + ': parametros', tem(volta.parametros, ['janelaCompatibilizacao_m', 'submodoPerfilMedio', 'nsptLimiteCalculo']) && volta.parametros.nsptLimiteCalculo === 50);
  t(rotulo + ': listas são arrays', Array.isArray(volta.avisos) && Array.isArray(volta.dominios) && Array.isArray(volta.sondagens) && Array.isArray(volta.estacas));
  volta.sondagens.forEach((s) => {
    t(rotulo + ': sondagem ' + s.nome + ' campos', tem(s, CHAVES_SONDAGEM) && tem(s.coordenadas, ['x', 'y']));
    t(rotulo + ': sondagem ' + s.nome + ' leituras', Array.isArray(s.leituras) && s.leituras.every((l) => tem(l, CHAVES_LEITURA)));
  });
  volta.estacas.forEach((e) => {
    t(rotulo + ': estaca ' + e.nome + ' campos', tem(e, CHAVES_ESTACA) && tem(e.coordenadas, ['x', 'y']));
    t(rotulo + ': estaca ' + e.nome + ' cotaPontaSugerida', tem(e.cotaPontaSugerida_m, ['envoltoria', 'perfil_medio', 'por_furo', 'interpolacao']));
    t(rotulo + ': estaca ' + e.nome + ' perfis', tem(e.perfis, ['envoltoria', 'media', 'mediaPorSubmodo']) && tem(e.perfis.media, ['submodo', 'camadas']) && tem(e.perfis.mediaPorSubmodo, ['2.1_predominante', '2.2_conservador', '2.3_dois_paralelos']) && tem(e.perfis.mediaPorSubmodo['2.3_dois_paralelos'], ['coesivo', 'granular', 'intermediario']));
    t(rotulo + ': estaca ' + e.nome + ' camadas', e.perfis.envoltoria.every((c) => tem(c, CHAVES_ENV)) && e.perfis.media.camadas.every((c) => tem(c, CHAVES_MEDIA)));
    const ramos23 = e.perfis.mediaPorSubmodo['2.3_dois_paralelos'];
    t(rotulo + ': estaca ' + e.nome + ' camadas 2.1/2.3', e.perfis.mediaPorSubmodo['2.1_predominante'].every((c) => tem(c, CHAVES_MEDIA)) && ['coesivo', 'granular', 'intermediario'].every((k) => ramos23[k].every((c) => tem(c, CHAVES_MEDIA))));
  });
}

/* ============================ 1) BALSAS ============================ */
{
  const obra = obraBalsas();
  const j = gerarDetalhamentoJSON(obra, { submodoPerfilMedio: '2.2_conservador' });
  validarEstrutura('Balsas', j);

  t('Balsas: 5 sondagens', j.sondagens.length === 5);
  t('Balsas: 4 estacas', j.estacas.length === 4);
  t('Balsas: obra.nome', j.obra.nome === 'Obra de Referência — Balsas');

  // Sondagem bruta: cota = boca − profundidade; NA null
  const s1 = j.sondagens.find((s) => s.nome === 'SPT-01');
  t('SPT-01 cotaBoca', s1.cotaBoca_m === 254.485);
  t('SPT-01 cota da leitura 1', s1.leituras[0].cota_m === 253.485 && s1.leituras[0].profundidade_m === 1);
  t('SPT-01 NA null', s1.naInicial_m === null && s1.naFinalCota_m === null);
  t('SPT-01 coordenadas', s1.coordenadas.x === 0 && s1.coordenadas.y === 0);
  t('SPT-01 dominioId null (sem domínios)', s1.dominioId === null);

  // Envoltória e média contra a engine, independente do gerador (= Aba 3 / Aba 6)
  const janela = 0.5;
  const compat = GeoSPT.engine.compatibilizar(obra.sondagens, { janela_m: janela });
  const envEsperada = compat.resultados.filter((r) => r.envoltoria.nspt != null);

  j.estacas.forEach((e) => {
    t(e.nome + ': furosConsiderados = todos', e.furosConsiderados.length === 5);
    const env = e.perfis.envoltoria;
    t(e.nome + ': envoltória tem as mesmas cotas da Aba 3', env.length === envEsperada.length && env.every((c, i) => c.cota_m === envEsperada[i].cotaRef_m));
    t(
      e.nome + ': envoltória bate com a Aba 3 (nspt, solo, família, furo, nFuros)',
      env.every((c, i) => {
        const r = envEsperada[i];
        return c.nspt === r.envoltoria.nspt && c.nspt_real === r.envoltoria.nspt_real && c.impenetravel === r.envoltoria.impenetravel && c.solo === r.envoltoria.solo && c.familia === r.envoltoria.familia && c.furo === r.envoltoria.furo && c.nFuros === r.nFuros;
      })
    );

    ['2.1_predominante', '2.2_conservador'].forEach((sm) => {
      const r = GeoSPT.engine.montarPerfilMedio(compat, sm);
      const med = e.perfis.mediaPorSubmodo[sm];
      t(e.nome + ': média ' + sm + ' mesmas cotas', med.length === r.perfil.length && med.every((c, i) => c.cota_m === r.perfil[i].cota_m));
      t(
        e.nome + ': média ' + sm + ' bate com montarPerfilMedio',
        med.every((c, i) => {
          const p = r.perfil[i];
          const cr = compat.resultados.find((x) => x.cotaRef_m === p.cota_m);
          return c.nspt === p.nspt && c.nspt_real === p.nspt_real && c.solo === p.solo && c.familia === p.familia && c.origem === p.origemFuro && c.heterogeneo === cr.heterogeneo && c.soloDetalhe === cr.soloPred && c.nFuros === cr.nFuros;
        })
      );
    });
    t(e.nome + ': media.camadas = 2.2 (selecionado)', e.perfis.media.submodo === '2.2_conservador' && JSON.stringify(e.perfis.media.camadas) === JSON.stringify(e.perfis.mediaPorSubmodo['2.2_conservador']));

    const r23 = GeoSPT.engine.montarPerfilMedio(compat, '2.3_dois_paralelos');
    const p23 = e.perfis.mediaPorSubmodo['2.3_dois_paralelos'];
    t(e.nome + ': média 2.3 coesivo/granular/intermediario', p23.coesivo.length === r23.perfilCoesivo.length && p23.granular.length === r23.perfilGranular.length && p23.intermediario.length === r23.perfilIntermediario.length && p23.coesivo.every((c, i) => c.nspt === r23.perfilCoesivo[i].nspt && c.cota_m === r23.perfilCoesivo[i].cota_m));
  });

  // Soloheterogêneo: cota 239 em Balsas é heterogênea (dataset) → soloDetalhe "C: ... | G: ..."
  const e1 = j.estacas.find((e) => e.nome === 'E-01');
  const c239 = e1.perfis.mediaPorSubmodo['2.2_conservador'].find((c) => c.cota_m === 239);
  t('Balsas cota 239: heterogênea', c239 && c239.heterogeneo === true && /^C: .* \| G: /.test(c239.soloDetalhe));

  // Cotas sugeridas = auditoria/Aba 6 (cálculo independente)
  j.estacas.forEach((e) => {
    const estaca = obra.estacas.find((x) => x.nome === e.nome);
    const opcoes = construirOpcoesCalculo(estaca, obra.parametros);
    const sug = (modo, submodo) => {
      const r = prepararPerfilCalculo({ modo, submodo, sondagens: obra.sondagens, estaca, params: obra.parametros, filtroDominio: null });
      if (r.erro || !r.perfilParaCalculo) return null;
      const dq = GeoSPT.engine.calcularDQ(r.perfilParaCalculo, opcoes);
      const av = GeoSPT.engine.calcularAV(r.perfilParaCalculo, opcoes);
      return encontrarCotaSugeridaConservadora(dq.memorial, av.memorial, estaca.cargaPrevista_tf)?.cota_m ?? null;
    };
    t(e.nome + ': cota sugerida envoltória = Aba 6', e.cotaPontaSugerida_m.envoltoria === sug('envoltoria', null), e.cotaPontaSugerida_m.envoltoria + ' vs ' + sug('envoltoria', null));
    t(e.nome + ': cota sugerida perfil médio 2.2 = Aba 6', e.cotaPontaSugerida_m.perfil_medio === sug('perfil_medio', '2.2_conservador'));
  });
  t('E-01 envoltória sugere 239 m (STATUS.md / CP-9a)', e1.cotaPontaSugerida_m.envoltoria === 239);

  // Distâncias 2D, ordenadas, e sondagem mais próxima
  const e1d = e1.sondagensPorDistancia;
  t('E-01 distâncias: 5 furos ordenados', e1d.length === 5 && e1d.every((d, i) => i === 0 || e1d[i - 1].distancia_m <= d.distancia_m));
  const esperada = (a, b) => Math.round(Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2) * 100) / 100;
  t('E-01 distância ao SPT-01', e1d.find((d) => d.nome === 'SPT-01').distancia_m === esperada({ x: 12.5, y: 12.5 }, { x: 0, y: 0 }));
  t('E-01 sondagemMaisProxima = 1º da lista', e1.sondagemMaisProxima === e1d[0].nome);
  t('E-04 mais próxima = SPT-02 (25,0) ou 04?', j.estacas.find((e) => e.nome === 'E-04').sondagensPorDistancia.length === 5);

  // Estaca E-04 arrasamento acima do topo: sem falhar; E-03 etc. formato
  t('E-01 formato/dimensão', e1.formato === 'circular' && e1.dimensao_m === 0.4 && e1.tipoEstaca === 'helice_continua');
  t('E-01 sem domínio', e1.dominioId === null && e1.dominioNome === null);

  // Submodo selecionado pela UI
  const j21 = gerarDetalhamentoJSON(obra, { submodoPerfilMedio: '2.1_predominante' });
  t('submodo 2.1 selecionado', j21.parametros.submodoPerfilMedio === '2.1_predominante' && j21.estacas[0].perfis.media.submodo === '2.1_predominante');
  t('submodo 2.1: aviso de cotas bloqueadas', j21.estacas[0].avisos.some((a) => /Submodo 2\.1/.test(a)));
  const j23 = gerarDetalhamentoJSON(obra, { submodoPerfilMedio: '2.3_dois_paralelos' });
  t('submodo 2.3: media.camadas vazio + aviso', j23.estacas[0].perfis.media.camadas.length === 0 && j23.estacas[0].avisos.some((a) => /2\.3/.test(a)));
  const jPadrao = gerarDetalhamentoJSON(obra, undefined);
  t('sem ui → padrão 2.2_conservador', jPadrao.parametros.submodoPerfilMedio === '2.2_conservador');

  // A obra não é mutada
  t('obra de entrada intacta', JSON.stringify(obra) === JSON.stringify(obraBalsas()));
}

/* ====================== 2) SEM COORDENADAS / SEM DOMÍNIO ====================== */
{
  const obra = obraBalsas();
  Object.values(obra.sondagens).forEach((s) => delete s.coordenadas);
  obra.estacas.forEach((e) => {
    delete e.coordenadas;
  });
  obra.estacas[1].cotaArrasamento_m = null; // E-02 sem arrasamento
  obra.estacas[3].cargaPrevista_tf = null; // E-04 sem carga
  obra.identificacao = { nome: '', localizacao: '', sistemaCoordenadas: 'xy_local' };

  let j;
  try {
    j = gerarDetalhamentoJSON(obra, { submodoPerfilMedio: '2.2_conservador' });
  } catch (e) {
    t('sem coords: não lança', false, e.message);
  }
  if (j) {
    validarEstrutura('SemCoord', j);
    t('sem coords: obra.nome null', j.obra.nome === null && j.obra.localizacao === null && j.obra.responsavelTecnico === null);
    t('sem coords: aviso global de sondagens', j.avisos.some((a) => /sem coordenadas/.test(a)));
    j.sondagens.forEach((s) => t('sem coords: ' + s.nome + ' x/y null', s.coordenadas.x === null && s.coordenadas.y === null));
    j.estacas.forEach((e) => {
      t('sem coords: ' + e.nome + ' coordenadas null', e.coordenadas.x === null && e.coordenadas.y === null);
      t('sem coords: ' + e.nome + ' sondagensPorDistancia []', Array.isArray(e.sondagensPorDistancia) && e.sondagensPorDistancia.length === 0);
      t('sem coords: ' + e.nome + ' sondagemMaisProxima null', e.sondagemMaisProxima === null);
      t('sem coords: ' + e.nome + ' avisa coordenadas', e.avisos.some((a) => /sem coordenadas/.test(a)));
      t('sem coords: ' + e.nome + ' envoltória ainda calculada', e.perfis.envoltoria.length > 0 && e.perfis.media.camadas.length > 0);
      t('sem coords: ' + e.nome + ' interpolação null', e.cotaPontaSugerida_m.interpolacao === null);
      t('sem coords: ' + e.nome + ' domínio null, todos os furos', e.dominioId === null && e.furosConsiderados.length === 5);
    });
    const e2 = j.estacas.find((e) => e.nome === 'E-02');
    t('E-02 sem arrasamento: null + aviso', e2.cotaArrasamento_m === null && e2.avisos.some((a) => /arrasamento/.test(a)));
    t('E-02 sem arrasamento: cotas sugeridas null', Object.values(e2.cotaPontaSugerida_m).every((v) => v === null));
    const e4 = j.estacas.find((e) => e.nome === 'E-04');
    t('E-04 sem carga: null + aviso', e4.cargaPrevista_tf === null && e4.avisos.some((a) => /carga prevista/.test(a)));
    t('E-04 sem carga: cotas sugeridas null', Object.values(e4.cotaPontaSugerida_m).every((v) => v === null));
  }
}

/* ====================== 3) DOMÍNIO COM SUBCONJUNTO ====================== */
{
  const obra = obraBalsas();
  obra.dominios = [{ id: 'g1', nome: 'Domínio Norte', cor: 'blue', furos: ['SPT-01', 'SPT-02', 'SPT-05'] }];
  obra.estacas[0].dominioId = 'g1'; // E-01 filtrada
  const j = gerarDetalhamentoJSON(obra, { submodoPerfilMedio: '2.2_conservador' });
  validarEstrutura('Dominio', j);

  t('domínio: dominios exportados', j.dominios.length === 1 && j.dominios[0].id === 'g1' && j.dominios[0].nome === 'Domínio Norte' && JSON.stringify(j.dominios[0].furos) === JSON.stringify(['SPT-01', 'SPT-02', 'SPT-05']));
  t('domínio: sondagem.dominioId', j.sondagens.find((s) => s.nome === 'SPT-02').dominioId === 'g1' && j.sondagens.find((s) => s.nome === 'SPT-03').dominioId === null);

  const e1 = j.estacas.find((e) => e.nome === 'E-01');
  t('domínio: furosConsiderados do domínio', JSON.stringify(e1.furosConsiderados.sort()) === JSON.stringify(['SPT-01', 'SPT-02', 'SPT-05']));
  t('domínio: dominioId/dominioNome', e1.dominioId === 'g1' && e1.dominioNome === 'Domínio Norte');
  t('domínio: distâncias só dos furos do domínio', e1.sondagensPorDistancia.length === 3 && e1.sondagensPorDistancia.every((d) => ['SPT-01', 'SPT-02', 'SPT-05'].includes(d.nome)));

  const sub = {};
  ['SPT-01', 'SPT-02', 'SPT-05'].forEach((n) => (sub[n] = obra.sondagens[n]));
  const compat = GeoSPT.engine.compatibilizar(sub, { janela_m: 0.5 });
  const envEsp = compat.resultados.filter((r) => r.envoltoria.nspt != null);
  t('domínio: envoltória = compatibilização do subconjunto', e1.perfis.envoltoria.length === envEsp.length && e1.perfis.envoltoria.every((c, i) => c.cota_m === envEsp[i].cotaRef_m && c.nspt === envEsp[i].envoltoria.nspt && c.furo === envEsp[i].envoltoria.furo && c.nFuros === envEsp[i].nFuros));
  t('domínio: nFuros ≤ 3', e1.perfis.envoltoria.every((c) => c.nFuros <= 3));
  const r22 = GeoSPT.engine.montarPerfilMedio(compat, '2.2_conservador');
  t('domínio: média = subconjunto', e1.perfis.media.camadas.length === r22.perfil.length && e1.perfis.media.camadas.every((c, i) => c.nspt === r22.perfil[i].nspt && c.cota_m === r22.perfil[i].cota_m));
  // Estaca sem domínio na mesma obra continua usando todos
  t('domínio: E-02 (sem domínio) usa os 5 furos', j.estacas.find((e) => e.nome === 'E-02').furosConsiderados.length === 5);
}

/* ====================== 4) DOMÍNIO VAZIO / INVÁLIDO ====================== */
{
  const obra = obraBalsas();
  obra.dominios = [{ id: 'g9', nome: 'Vazio', cor: 'red', furos: [] }];
  obra.estacas[0].dominioId = 'g9'; // domínio vazio
  obra.estacas[1].dominioId = 'inexistente'; // domínio inválido
  let j;
  try {
    j = gerarDetalhamentoJSON(obra, { submodoPerfilMedio: '2.2_conservador' });
  } catch (e) {
    t('domínio vazio: não lança', false, e.message);
  }
  if (j) {
    validarEstrutura('DominioVazio', j);
    const e1 = j.estacas[0];
    t('domínio vazio: sem furos e perfis []', e1.furosConsiderados.length === 0 && e1.perfis.envoltoria.length === 0 && e1.perfis.media.camadas.length === 0);
    t('domínio vazio: aviso', e1.avisos.some((a) => /vazio/.test(a)));
    t('domínio vazio: cotas sugeridas null', Object.values(e1.cotaPontaSugerida_m).every((v) => v === null));
    t('domínio vazio: dominioId preservado', e1.dominioId === 'g9' && e1.dominioNome === 'Vazio');
    const e2 = j.estacas[1];
    t('domínio inválido: aviso + todos os furos', e2.avisos.some((a) => /não existe/.test(a)) && e2.furosConsiderados.length === 5);
  }
}

/* ============================ 5) COR DO SOLO ============================ */
{
  // Sem cor (Balsas não tem): todos os campos de cor saem null.
  const jSem = gerarDetalhamentoJSON(obraBalsas(), {});
  t('sem cor: leituras null', jSem.sondagens.every((s) => s.leituras.every((l) => l.cor === null)));
  t('sem cor: camadas null', jSem.estacas.every((e) => e.perfis.envoltoria.every((c) => c.cor === null) && e.perfis.media.camadas.every((c) => c.cor === null && c.corDetalhe === null)));

  // Cores por furo e família. Grafias equivalentes variando em maiúscula/acento/espaço.
  const corDe = (furo, l) => {
    if (furo === 'SPT-04' && l.profundidade_m <= 2) return null; // laudo sem cor
    if (l.familia === 'Granular') return furo === 'SPT-01' ? '  Amarela ' : 'amarela';
    if (l.familia === 'Coesivo') return furo === 'SPT-02' ? 'cinza' : furo === 'SPT-01' ? 'Vermélha' : 'vermelha';
    return 'marrom';
  };
  const obraCor = obraBalsas();
  Object.entries(obraCor.sondagens).forEach(([n, s]) => s.leituras.forEach((l) => (l.cor = corDe(n, l))));
  const j = gerarDetalhamentoJSON(obraCor, { submodoPerfilMedio: '2.2_conservador' });
  validarEstrutura('Cor', j);

  // Leitura bruta: texto preservado (só espaços colapsados)
  const l1 = j.sondagens.find((s) => s.nome === 'SPT-01').leituras[0];
  t('cor: leitura preserva grafia do laudo', l1.cor === 'Amarela', l1.cor);

  // A cor não altera nenhum número: perfis idênticos ao Balsas sem cor, removendo cor/corDetalhe
  const semCor = (e) => JSON.stringify(e.perfis, (k, v) => (k === 'cor' || k === 'corDetalhe' ? undefined : v));
  t('cor: não altera envoltória/média/cotas', j.estacas.every((e, i) => semCor(e) === semCor(jSem.estacas[i]) && JSON.stringify(e.cotaPontaSugerida_m) === JSON.stringify(jSem.estacas[i].cotaPontaSugerida_m)));

  // Envoltória: cor da MESMA leitura (furo + profundidade) que deu o NSPT mínimo
  const compat = GeoSPT.engine.compatibilizar(obraCor.sondagens, { janela_m: 0.5 });
  const e1 = j.estacas.find((e) => e.nome === 'E-01');
  t(
    'cor: envoltória = cor da leitura do furo de origem',
    e1.perfis.envoltoria.every((c) => {
      const r = compat.resultados.find((x) => x.cotaRef_m === c.cota_m);
      const prof = r.profPorSondagem_m[c.furo];
      const l = obraCor.sondagens[c.furo].leituras.find((x) => x.profundidade_m === prof);
      const esperado = l.cor == null ? null : l.cor.replace(/\s+/g, ' ').trim();
      return c.cor === esperado;
    })
  );

  // Média em cota homogênea coesiva: 'Vermélha' (SPT-01) ≡ 'vermelha' (agrupadas); SPT-02 'cinza'
  const homog = e1.perfis.media.camadas.filter((c) => !c.heterogeneo && c.familia === 'Coesivo');
  t('cor: existem cotas homogêneas coesivas', homog.length > 0);
  homog.forEach((c) => {
    const r = compat.resultados.find((x) => x.cotaRef_m === c.cota_m);
    const furos = Object.keys(r.nsptPorSondagem).filter((n) => r.nsptPorSondagem[n] != null && r.familiaPorSondagem[n] === 'Coesivo');
    const cores = furos.map((n) => corDe(n, obraCor.sondagens[n].leituras.find((x) => x.profundidade_m === r.profPorSondagem_m[n])));
    const nVerm = cores.filter((x) => x && chaveCor(x) === 'vermelha').length;
    const nCinza = cores.filter((x) => x === 'cinza').length;
    const esperadaChave = nVerm === 0 && nCinza === 0 ? null : nVerm >= nCinza ? (nVerm === nCinza ? chaveCor(cores.find((x) => x != null)) : 'vermelha') : 'cinza';
    t('cor: média cota ' + c.cota_m + ' = mais frequente', chaveCor(c.cor) === esperadaChave, c.cor + ' / ' + cores.join(','));
    if (nVerm > 0 && nCinza > 0) {
      t('cor: média cota ' + c.cota_m + ' detalhe com contagem', c.corDetalhe.includes('(' + nVerm + ')') && c.corDetalhe.includes('cinza (' + nCinza + ')'), c.corDetalhe);
    }
  });

  // Média heterogênea (cota 239 de Balsas): corDetalhe por família, cor = família escolhida pelo 2.2
  const c239 = e1.perfis.media.camadas.find((c) => c.cota_m === 239);
  t('cor: cota 239 heterogênea — corDetalhe "C: … | G: …"', !!c239 && c239.heterogeneo && /C: .+ \| G: .+/.test(c239.corDetalhe), c239 && c239.corDetalhe);
  const chaveEsperada239 = c239 && c239.familia === 'Granular' ? 'amarela' : null;
  t('cor: cota 239 — cor da família escolhida pelo 2.2', !!c239 && c239.cor != null && (chaveEsperada239 == null || chaveCor(c239.cor) === chaveEsperada239), c239 && c239.familia + ' ' + c239.cor);

  // 2.3: cada ramo leva a cor da própria família
  const r23 = e1.perfis.mediaPorSubmodo['2.3_dois_paralelos'];
  t('cor: ramo granular do 2.3 = amarela', r23.granular.length > 0 && r23.granular.every((c) => c.cor == null || chaveCor(c.cor) === 'amarela'));
  t('cor: ramo coesivo do 2.3 = vermelha/cinza', r23.coesivo.length > 0 && r23.coesivo.every((c) => c.cor == null || ['vermelha', 'cinza'].includes(chaveCor(c.cor))));

  // Unidades do helper
  const rc = resumirCores(['vermelha', 'Vermelha ', 'cinza', null, '', 'vermelha']);
  t('resumirCores: moda e detalhe', rc.cor === 'vermelha' && rc.detalhe === 'vermelha (3) | cinza (1)', JSON.stringify(rc));
  t('resumirCores: vazio', resumirCores([null, '  ']).cor === null && resumirCores([]).detalhe === null);
  t('resumirCores: empate → a primeira que apareceu', resumirCores(['cinza', 'vermelha']).cor === 'cinza');
  t('chaveCor: acento/maiúscula/espaços', chaveCor('  Vermélha   Escura ') === 'vermelha escura');
}

rmSync(dirTmp, { recursive: true, force: true });
console.log('\n' + ok + ' asserções OK · ' + fail + ' falhas');
process.exit(fail === 0 ? 0 : 1);
