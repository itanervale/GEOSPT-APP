import { GeoSPT } from './src/engine/geospt-engine.js';
import { BALSAS } from './src/engine/dataset-balsas.js';
import fs from 'fs';
let src = fs.readFileSync('./src/abas/AbaCorteEsquematico/casamentoCamadas.js', 'utf8');
src = src.replace("import { GeoSPT } from '@/engine/geospt-engine';", 'const GeoSPT = globalThis.__GeoSPT;');
globalThis.__GeoSPT = GeoSPT;
fs.writeFileSync('/tmp/_cas.mjs', src);
const M = await import('/tmp/_cas.mjs');

const f2 = (n) => Number(n).toFixed(2);
const mk = (nome) => {
  const s = BALSAS.sondagens[nome];
  return { nome, cotaTopo_m: s.cotaTopo_m, leituras: s.leituras };
};
const furos = ['SPT-01', 'SPT-05', 'SPT-04'].map(mk);

console.log('===== BLOCOS POR FURO =====');
for (const f of furos) {
  const b = M.agruparEmBlocos(f);
  console.log('\n' + f.nome + ' (topo ' + f2(f.cotaTopo_m) + '):');
  b.forEach((x) => {
    const centro = (x.cotaTopo_m + x.cotaBase_m) / 2;
    console.log('  ' + x.familia.padEnd(14) + ' topo=' + f2(x.cotaTopo_m) + ' base=' + f2(x.cotaBase_m) + ' centro=' + f2(centro) + ' esp=' + x.espessura_m + 'm  ' + x.solo);
  });
}

console.log('\n===== CONEXOES (algoritmo atual) =====');
const res = M.processarSequenciaFuros(furos);
res.paresAdjacentes.forEach((par) => {
  console.log('\n--- ' + par.aNome + ' <-> ' + par.bNome + ' ---');
  par.conexoes.forEach((c) => {
    console.log('  [' + c.familia + '] A(topo ' + f2(c.topoA) + '/base ' + f2(c.baseA) + ') -> B(topo ' + f2(c.topoB) + '/base ' + f2(c.baseB) + ')  mergTopo=' + c.mergulhoTopo_m + ' mergBase=' + c.mergulhoBase_m);
  });
  (par.cunhasA || []).forEach((k) => console.log('  cunhaA[' + k.tipoCunha + '] ' + k.bloco.familia + ' -> alvo ' + f2(k.cotaAlvo)));
  (par.cunhasB || []).forEach((k) => console.log('  cunhaB[' + k.tipoCunha + '] ' + k.bloco.familia + ' -> alvo ' + f2(k.cotaAlvo)));
});

console.log('\n===== DETECCAO DE CRUZAMENTO =====');
res.paresAdjacentes.forEach((par) => {
  const cs = [...par.conexoes];
  const cenA = (c) => (c.topoA + c.baseA) / 2;
  const cenB = (c) => (c.topoB + c.baseB) / 2;
  cs.sort((p, q) => cenA(q) - cenA(p)); // topo -> base em A
  let cruza = false;
  for (let i = 0; i < cs.length - 1; i++) {
    if (cenB(cs[i]) < cenB(cs[i + 1])) cruza = true; // inverteu a ordem em B
  }
  const ordemA = cs.map((c) => c.familia[0]).join(',');
  const cenosB = cs.map((c) => f2(cenB(c))).join(',');
  console.log('  ' + par.aNome + '<->' + par.bNome + ': ordemA=[' + ordemA + '] centrosB=[' + cenosB + '] -> ' + (cruza ? 'CRUZA' : 'ok'));
});
