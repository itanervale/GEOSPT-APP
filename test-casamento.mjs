/* ============================================================================
 * Testes do algoritmo de casamento de camadas (CP-13b)
 *
 * Função PURA — testável sem UI. Rode com:
 *   node test-casamento.mjs   (a partir de geospt-vite/)
 *
 * Como casamentoCamadas.js usa o alias @/ (que o Node não resolve), este
 * runner injeta GeoSPT como global e importa uma cópia com o import trocado.
 * ============================================================================ */

import { GeoSPT } from './src/engine/geospt-engine.js';
import { BALSAS } from './src/engine/dataset-balsas.js';
import fs from 'fs';

let src = fs.readFileSync('./src/abas/AbaCorteEsquematico/casamentoCamadas.js', 'utf8');
src = src.replace(
  "import { GeoSPT } from '@/engine/geospt-engine';",
  'const GeoSPT = globalThis.__GeoSPT;'
);
globalThis.__GeoSPT = GeoSPT;
fs.writeFileSync('/tmp/_casamento_test.mjs', src);
const {
  derivarFamilia,
  tipoTransicao,
  agruparEmBlocos,
  casarBlocos,
  processarSequenciaFuros,
  classificarBordaOuMeio,
  classificarCunha,
} = await import('/tmp/_casamento_test.mjs');

let pass = 0,
  fail = 0;
const ok = (c, m) => {
  if (c) pass++;
  else {
    fail++;
    console.log('  ✗ ' + m);
  }
};

// 1. derivarFamilia
ok(derivarFamilia('Argila') === 'Coesivo', 'Argila→Coesivo');
ok(derivarFamilia('Areia') === 'Granular', 'Areia→Granular');
ok(derivarFamilia('Silte') === 'Intermediário', 'Silte→Intermediário');
ok(derivarFamilia(null) === null, 'null→null');

// 2. tipoTransicao (decisão A)
ok(tipoTransicao('Granular', 'Granular') === 'gradiente', 'Gran↔Gran=gradiente');
ok(tipoTransicao('Coesivo', 'Coesivo') === 'gradiente', 'Coes↔Coes=gradiente');
ok(tipoTransicao('Intermediário', 'Granular') === 'gradiente', 'Interm ponte=gradiente');
ok(tipoTransicao('Granular', 'Coesivo') === 'brusca', 'Gran↔Coes=brusca');

// 3. agruparEmBlocos — NSPT não separa blocos
const fA = {
  nome: 'A',
  cotaTopo_m: 250,
  leituras: [
    { prof: 1, nspt: 5, solo: 'Areia' },
    { prof: 2, nspt: 8, solo: 'Areia' },
    { prof: 3, nspt: 10, solo: 'Areia Siltosa' },
    { prof: 4, nspt: 6, solo: 'Argila' },
    { prof: 5, nspt: 7, solo: 'Argila Siltosa' },
    { prof: 6, nspt: 30, solo: 'Areia' },
  ],
};
const bA = agruparEmBlocos(fA);
ok(bA.length === 3, '3 blocos Areia/Argila/Areia');
ok(bA[0].espessura_m === 3 && bA[0].familia === 'Granular', 'bloco1 Granular 3m');
ok(bA[0].leituras.length === 3, 'bloco1 agrupa 3 leituras (NSPT varia, não separa)');

// 4. casamento "5m de A casa com 3m de B em desnível"
const cas4 = casarBlocos(
  agruparEmBlocos({
    nome: 'A',
    cotaTopo_m: 250,
    leituras: [1, 2, 3, 4, 5].map((p) => ({ prof: p, nspt: p, solo: 'Areia' })),
  }),
  agruparEmBlocos({
    nome: 'B',
    cotaTopo_m: 248,
    leituras: [1, 2, 3].map((p) => ({ prof: p, nspt: p, solo: 'Areia' })),
  })
);
ok(cas4.conexoes.length === 1, '1 conexão areia↔areia');
ok(cas4.conexoes[0].mergulhoTopo_m === 2, 'mergulho topo 2m (250-248)');
ok(cas4.conexoes[0].mergulhoBase_m === 0, 'mergulho base 0 (245-245)');

// 5. interrupção brusca: 2ª areia separada sem par
const cas5 = casarBlocos(
  agruparEmBlocos({ nome: 'A', cotaTopo_m: 250, leituras: [{ prof: 1, nspt: 5, solo: 'Areia' }] }),
  agruparEmBlocos({
    nome: 'B',
    cotaTopo_m: 250,
    leituras: [
      { prof: 1, nspt: 5, solo: 'Areia' },
      { prof: 2, nspt: 6, solo: 'Argila' },
      { prof: 3, nspt: 30, solo: 'Areia' },
    ],
  })
);
ok(cas5.conexoes.length === 1, 'só a 1ª areia casa');
ok(cas5.semParB.length === 2, '2 blocos de B sem par (argila + 2ª areia)');

// 6. CP-13h: casa por SOBREPOSIÇÃO/CONTATO de cota (mesma família). A areia de A
// (248→247) só toca a 2ª areia de B (247→246), não a 1ª (250→249, separada por
// argila) — então casa com a 2ª. A 1ª areia de B (250) fica sem par (vira cunha).
const cas6 = casarBlocos(
  agruparEmBlocos({ nome: 'A', cotaTopo_m: 248, leituras: [{ prof: 1, nspt: 5, solo: 'Areia' }] }),
  agruparEmBlocos({
    nome: 'B',
    cotaTopo_m: 250,
    leituras: [
      { prof: 1, nspt: 5, solo: 'Areia' },
      { prof: 2, nspt: 6, solo: 'Argila' },
      { prof: 3, nspt: 7, solo: 'Argila' },
      { prof: 4, nspt: 8, solo: 'Areia' },
    ],
  })
);
const conA = cas6.conexoes.find((c) => c.familia === 'Granular');
ok(conA && conA.topoB === 247, 'areia de A (248) casa com areia de B mais próxima em cota (247) não a 1ª');
ok(cas6.semParB.some((b) => b.cotaTopo_m === 250), '1ª areia de B (topo 250) fica sem par (vira cunha)');

// 7. Balsas real (formato profundidade_m + familia pré-computada)
// CP-13h: SPT-01 (areia rasa 2m + argila 17m) × SPT-02 (argila 7m + areia 11m).
// As areias estão em PROFUNDIDADES OPOSTAS (rasa em 01, profunda em 02) e NÃO se
// sobrepõem → não casam (cada uma acunha). Só as argilas (que se sobrepõem) se
// ligam. ATENÇÃO: a versão antiga deste teste exigia 2 conexões — isso codificava
// o BUG, pois ligava as duas areias atravessando 17m de argila (o mesmo defeito
// do cruzamento, só que menos visível). O correto é 1 conexão (Coesiva).
const furoBalsas = (nome) => {
  const s = BALSAS.sondagens[nome];
  return { nome, cotaTopo_m: s.cotaTopo_m, leituras: s.leituras };
};
const b01 = agruparEmBlocos(furoBalsas('SPT-01'));
ok(b01.length === 2, 'SPT-01 real: 2 blocos (Areia 2m + Argila 17m)');
ok(b01[0].familia === 'Granular' && b01[1].familia === 'Coesivo', 'SPT-01: Granular→Coesivo');
const casB = casarBlocos(b01, agruparEmBlocos(furoBalsas('SPT-02')));
ok(casB.conexoes.length === 1, 'SPT-01↔SPT-02: 1 conexão (só argila↔argila se sobrepõe)');
ok(
  casB.conexoes[0].familia === 'Coesivo' && casB.conexoes[0].tipo === 'gradiente',
  'SPT-01↔SPT-02: a conexão é Coesiva (gradiente)'
);
ok(
  casB.semParA.some((b) => b.familia === 'Granular') &&
    casB.semParB.some((b) => b.familia === 'Granular'),
  'SPT-01↔SPT-02: as areias (rasa×profunda, sem sobreposição) ficam sem par → cunha'
);

// 8. processarSequenciaFuros
const seq = processarSequenciaFuros([furoBalsas('SPT-01'), furoBalsas('SPT-02'), furoBalsas('SPT-03')]);
ok(seq.blocosPorFuro.length === 3, '3 furos processados');
ok(seq.paresAdjacentes.length === 2, '2 pares adjacentes (01-02, 02-03)');

// 8b. CP-13f.1 (correção) — CASO REAL SPT-05↔SPT-04: a areia de SPT-05 (base)
// deve casar com a areia de SPT-04 mais próxima em cota (a de BAIXO), não a do
// topo. Assim a faixa Granular não cruza a Coesiva.
const seq0504 = processarSequenciaFuros([
  furoBalsas('SPT-05'),
  furoBalsas('SPT-04'),
]);
const par0504 = seq0504.paresAdjacentes[0];
const gran0504 = par0504.conexoes.find((c) => c.familia === 'Granular');
// A areia de SPT-04 de baixo tem topo ~241.8; a do topo ~254.8. Proximidade
// deve escolher a de baixo (cota mais próxima da areia de SPT-05 em ~246→239).
ok(
  gran0504 && gran0504.topoB < 245,
  'SPT-05↔SPT-04: areia casa com a de BAIXO de SPT-04 (topoB<245), não a do topo'
);
// Não-cruzamento: faixa Granular e Coesiva não invertem ordem vertical
const coe0504 = par0504.conexoes.find((c) => c.familia === 'Coesivo');
if (gran0504 && coe0504) {
  const cGranA = (gran0504.topoA + gran0504.baseA) / 2;
  const cCoeA = (coe0504.topoA + coe0504.baseA) / 2;
  const cGranB = (gran0504.topoB + gran0504.baseB) / 2;
  const cCoeB = (coe0504.topoB + coe0504.baseB) / 2;
  ok(
    (cGranA > cCoeA) === (cGranB > cCoeB),
    'SPT-05↔SPT-04: Granular e Coesivo preservam ordem vertical → SEM cruzamento'
  );
}

// 9. CP-13f — ANTI-CRUZAMENTO: caso patológico onde a regra antiga cruzaria.
// A tem Areia(254-252) e Areia(248-246); B tem Areia(253-251) e Areia(250-248).
// Por proximidade de cota, a 2ª areia de A (248) ficaria mais perto da 2ª de B
// (250→248) e a 1ª de A (254) da 1ª de B — mas as faixas se sobreporiam/cruzariam
// se as cotas se invertessem. Por ORDEM: 1ªA↔1ªB, 2ªA↔2ªB, sempre sem cruzar.
const casX = casarBlocos(
  agruparEmBlocos({
    nome: 'A', cotaTopo_m: 254,
    leituras: [
      { prof: 1, nspt: 5, solo: 'Areia' }, { prof: 2, nspt: 6, solo: 'Areia' },
      { prof: 3, nspt: 7, solo: 'Argila' }, { prof: 4, nspt: 8, solo: 'Argila' },
      { prof: 5, nspt: 9, solo: 'Areia' }, { prof: 6, nspt: 10, solo: 'Areia' },
    ],
  }),
  agruparEmBlocos({
    nome: 'B', cotaTopo_m: 253,
    leituras: [
      { prof: 1, nspt: 5, solo: 'Areia' }, { prof: 2, nspt: 6, solo: 'Areia' },
      { prof: 3, nspt: 7, solo: 'Argila' }, { prof: 4, nspt: 8, solo: 'Argila' },
      { prof: 5, nspt: 9, solo: 'Areia' }, { prof: 6, nspt: 10, solo: 'Areia' },
    ],
  })
);
// Conexões da família Granular ordenadas por topoA decrescente
const granX = casX.conexoes.filter((c) => c.familia === 'Granular');
ok(granX.length === 2, 'duas conexões de areia (1ªA↔1ªB, 2ªA↔2ªB)');
// Prova de não-cruzamento: se topoA da conexão 1 > topoA da conexão 2,
// então topoB da conexão 1 também deve ser > topoB da conexão 2 (mesma ordem).
const semCruzamento =
  granX.length < 2 ||
  (granX[0].topoA > granX[1].topoA && granX[0].topoB > granX[1].topoB) ||
  (granX[0].topoA < granX[1].topoA && granX[0].topoB < granX[1].topoB);
ok(semCruzamento, 'conexões preservam ordem vertical (topoA e topoB na mesma ordem) → SEM cruzamento');

// 10. classificarBordaOuMeio — fixture com 3 camadas (Areia / Argila / Areia)
const furoTresCamadas = {
  nome: 'F', cotaTopo_m: 254,
  leituras: [
    { prof: 1, nspt: 5, solo: 'Areia' }, { prof: 2, nspt: 6, solo: 'Areia' }, { prof: 3, nspt: 7, solo: 'Areia' },
    { prof: 4, nspt: 8, solo: 'Argila' },
    { prof: 5, nspt: 9, solo: 'Areia' }, { prof: 6, nspt: 10, solo: 'Areia' }, { prof: 7, nspt: 11, solo: 'Areia' },
  ],
};
const bbb = agruparEmBlocos(furoTresCamadas); // Areia(borda), Argila(meio), Areia(borda)
ok(classificarBordaOuMeio(bbb[0], bbb) === 'borda', '10: 1º bloco = borda');
ok(classificarBordaOuMeio(bbb[1], bbb) === 'meio', '10: bloco interno = meio');
ok(classificarBordaOuMeio(bbb[2], bbb) === 'borda', '10: último bloco = borda');

// 11. CP-13h — classificarCunha: geometria do acunhamento
// Furo: Areia(borda-topo 2m), Argila ESPESSA 9m(meio), Areia(borda-base 1m)
const furoCunha = {
  nome: 'C', cotaTopo_m: 254,
  leituras: [
    { prof: 1, nspt: 5, solo: 'Areia' }, { prof: 2, nspt: 6, solo: 'Areia' },
    { prof: 3, nspt: 7, solo: 'Argila' }, { prof: 4, nspt: 7, solo: 'Argila' },
    { prof: 5, nspt: 7, solo: 'Argila' }, { prof: 6, nspt: 7, solo: 'Argila' },
    { prof: 7, nspt: 7, solo: 'Argila' }, { prof: 8, nspt: 7, solo: 'Argila' },
    { prof: 9, nspt: 7, solo: 'Argila' }, { prof: 10, nspt: 7, solo: 'Argila' },
    { prof: 11, nspt: 7, solo: 'Argila' },
    { prof: 12, nspt: 9, solo: 'Areia' },
  ],
};
const bCun = agruparEmBlocos(furoCunha); // [Areia 254-252, Argila 252-243 (9m), Areia 243-242]
const vizinho = [{ familia: 'Granular', solo: 'Areia', cotaTopo_m: 256, cotaBase_m: 240, espessura_m: 16 }];
// 11a. bloco do topo = borda, frac 1.0, alvo = topo do vizinho (256)
const cTopo = classificarCunha(bCun[0], bCun, vizinho, 'A', 2);
ok(cTopo.tipoCunha === 'borda' && cTopo.frac === 1.0, '11a: bloco topo = cunha borda (frac 1.0)');
ok(cTopo.cotaAlvo === 256, '11a: cunha de topo mira o TOPO do vizinho (256)');
// 11b. bloco de baixo = borda, alvo = base do vizinho (240)
const cBase = classificarCunha(bCun[2], bCun, vizinho, 'A', 2);
ok(cBase.tipoCunha === 'borda' && cBase.cotaAlvo === 240, '11b: cunha de base mira a BASE do vizinho (240)');
// 11c. argila 9m no meio = interior, frac 1.0, alvo = próprio centro
const cMeio = classificarCunha(bCun[1], bCun, vizinho, 'A');
const centroArgila = (bCun[1].cotaTopo_m + bCun[1].cotaBase_m) / 2;
ok(cMeio.tipoCunha === 'interior' && cMeio.frac === 1.0, '11c: bloco interior = cunha interior (frac 1.0, atravessa o vão)');
ok(Math.abs(cMeio.cotaAlvo - centroArgila) < 1e-6, '11c: cunha interior mira o próprio nível médio');
// 11d. CP-13h.2 — interior FINO agora também atravessa o vão (frac 1.0, SEM lente).
// Decisão do usuário: não há mais "lente" que some no meio; toda camada é solo
// real e o triângulo sempre alcança a face do furo oposto.
const furoFino = {
  nome: 'D', cotaTopo_m: 254,
  leituras: [
    { prof: 1, nspt: 5, solo: 'Areia' }, { prof: 2, nspt: 6, solo: 'Areia' },
    { prof: 3, nspt: 7, solo: 'Silte' },                 // intermediário fino entre areia e argila
    { prof: 4, nspt: 8, solo: 'Argila' }, { prof: 5, nspt: 8, solo: 'Argila' },
  ],
};
const bFino = agruparEmBlocos(furoFino); // [Areia 2m, Silte 1m(meio), Argila 2m]
const cFino = classificarCunha(bFino[1], bFino, vizinho, 'A');
ok(cFino.tipoCunha === 'interior' && cFino.frac === 1.0, '11d: interior fino (1m) agora também atravessa o vão (frac 1.0, SEM lente)');

// 12. CP-13h — NÃO-CRUZAMENTO inter-família no caso REAL SPT-01↔SPT-05.
// SPT-01 = Areia(topo)/Argila(base); SPT-05 = Argila(topo)/Areia(base): famílias
// invertidas. As argilas (que se sobrepõem) casam; as areias (que NÃO se
// sobrepõem) acunham. Resultado: 1 conexão (Coesiva), 0 cruzamento.
const cas0105 = casarBlocos(agruparEmBlocos(furoBalsas('SPT-01')), agruparEmBlocos(furoBalsas('SPT-05')));
ok(
  cas0105.conexoes.length === 1 && cas0105.conexoes[0].familia === 'Coesivo',
  '12: SPT-01↔SPT-05 → só a argila casa (1 conexão Coesiva)'
);
ok(
  cas0105.semParA.some((b) => b.familia === 'Granular') &&
    cas0105.semParB.some((b) => b.familia === 'Granular'),
  '12: as duas areias (invertidas, sem sobreposição) acunham → sem cruzamento'
);

// 13. CP-13h.1 — FAN-OUT (leque). Um argilão contínuo (A) em frente a uma
// argila PARTIDA por uma areia (B) deve se RAMIFICAR em 2 conexões Coesivas
// (uma por argila de B), partindo a aresta de A no meio do vão da areia. A
// areia, sem correspondente em A, acunha. NÃO pode sobrar cunha de argila.
const aFan = [
  { familia: 'Coesivo', solo: 'Argila', cotaTopo_m: 254, cotaBase_m: 235, espessura_m: 19 },
];
const bFan = [
  { familia: 'Coesivo', solo: 'Argila', cotaTopo_m: 253, cotaBase_m: 247, espessura_m: 6 },
  { familia: 'Granular', solo: 'Areia', cotaTopo_m: 247, cotaBase_m: 245, espessura_m: 2 },
  { familia: 'Coesivo', solo: 'Argila', cotaTopo_m: 245, cotaBase_m: 239, espessura_m: 6 },
];
const casFan = casarBlocos(aFan, bFan);
const coesFan = casFan.conexoes.filter((c) => c.familia === 'Coesivo');
ok(coesFan.length === 2, '13a: argilão ramifica em 2 conexões Coesivas (leque)');
ok(coesFan.every((c) => c.ramificado === true), '13b: as 2 conexões vêm marcadas como ramificado');
ok(
  casFan.semParB.some((b) => b.familia === 'Granular'),
  '13c: a areia (sem par em A) acunha (fica em semParB)'
);
ok(
  casFan.semParB.every((b) => b.familia !== 'Coesivo') && casFan.semParA.length === 0,
  '13d: NENHUMA cunha de argila espúria (a família contínua não sobra)'
);
// split da aresta de A no centro do vão da areia (247+245)/2 = 246
const topo = coesFan.find((c) => c.topoA === 254);
const baixo = coesFan.find((c) => c.baseA === 235);
ok(
  topo && Math.abs(topo.baseA - 246) < 1e-6 && baixo && Math.abs(baixo.topoA - 246) < 1e-6,
  '13e: aresta de A parte em 246 (ponto médio do vão da areia)'
);

console.log('\n=== Casamento de camadas: ' + pass + ' ok / ' + fail + ' fail ===');
fs.unlinkSync('/tmp/_casamento_test.mjs');
process.exit(fail > 0 ? 1 : 0);
