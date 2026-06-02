/* ============================================================================
 * Testes da geometria do corte esquemático (CP-13d)
 * Função PURA — rode com: node test-geometria-corte.mjs (de geospt-vite/)
 * ============================================================================ */

import { GeoSPT } from './src/engine/geospt-engine.js';
import { BALSAS } from './src/engine/dataset-balsas.js';
import fs from 'fs';

let cc = fs
  .readFileSync('./src/abas/AbaCorteEsquematico/casamentoCamadas.js', 'utf8')
  .replace(
    "import { GeoSPT } from '@/engine/geospt-engine';",
    'const GeoSPT = globalThis.__GeoSPT;'
  );
globalThis.__GeoSPT = GeoSPT;
fs.writeFileSync('/tmp/_cc_geo_test.mjs', cc);
const { agruparEmBlocos, processarSequenciaFuros } = await import('/tmp/_cc_geo_test.mjs');
const geoMod = await import('./src/abas/AbaCorteEsquematico/geometriaCorte.js');

let pass = 0,
  fail = 0;
const ok = (c, m) => {
  if (c) pass++;
  else {
    fail++;
    console.log('  ✗ ' + m);
  }
};

const furo = (nome) => {
  const s = BALSAS.sondagens[nome];
  return {
    tipo: 'furo',
    nome,
    cotaTopo_m: s.cotaTopo_m,
    x: s.coordenadas.x,
    y: s.coordenadas.y,
    blocos: agruparEmBlocos({ nome, cotaTopo_m: s.cotaTopo_m, leituras: s.leituras }),
  };
};
const estaca = { tipo: 'estaca', nome: 'E-02', cotaArrasamento_m: 250, diametro_m: 0.4, x: 5, y: 5 };
const itens = [furo('SPT-01'), estaca, furo('SPT-05')];

// Domínio de cotas
const dom = geoMod.calcularDominioCotas(itens);
ok(dom.cotaMax > 254 && dom.cotaMax < 256, 'cotaMax ~255 (topo SPT-01 + folga)');
ok(dom.cotaMin < 236, 'cotaMin < 236');

// Geometria
const geo = geoMod.construirGeometria(itens, { W: 900, H: 600, padL: 64, padR: 220, padT: 54, padB: 96, colW: 150 });
ok(geo.xColuna(1) - geo.xColuna(0) === 150, 'espaçamento uniforme = colW');
ok(geo.yDe(geo.cotaMax) < geo.yDe(geo.cotaMin), 'cota maior = y menor (topo)');
ok(geo.yDe(250) < geo.yDe(240), 'cota 250 acima de 240');
ok(Math.abs(geo.yDe(240) - geo.yDe(250) - 10 * geo.escalaY) < 0.01, 'escala real: 10m = 10·escalaY');

// Ticks
const ticks = geoMod.ticksEixoY(geo, 1);
ok(ticks.length > 15, 'ticks a cada 1m (~20)');

// Distância 2D
const d = geoMod.distancia2D(furo('SPT-01'), furo('SPT-05'));
ok(Math.abs(d - 17.678) < 0.01, 'dist SPT-01↔SPT-05 = 17.68m');

// Estaca atravessa
const atr = geoMod.estacaAtravessa(estaca, itens.filter((i) => i.tipo === 'furo'));
ok(atr.furoRef === 'SPT-01', 'E-02 (5,5) ref = SPT-01 (mais próximo)');
ok(atr.texto.length > 0, 'texto de atravessamento gerado');

// Casamento da sequência (mergulho)
const proc = processarSequenciaFuros([furo('SPT-01'), furo('SPT-02')].map((f) => ({ nome: f.nome, cotaTopo_m: f.cotaTopo_m, leituras: BALSAS.sondagens[f.nome].leituras })));
ok(proc.paresAdjacentes.length === 1, '1 par adjacente');
const con = proc.paresAdjacentes[0].conexoes[0];
ok(con.topoA !== con.topoB, 'mergulho real: topoA ≠ topoB');

console.log('\n=== Geometria do corte: ' + pass + ' ok / ' + fail + ' fail ===');
fs.unlinkSync('/tmp/_cc_geo_test.mjs');
process.exit(fail > 0 ? 1 : 0);
