/* ============================================================================
 * casamentoCamadas — algoritmo de casamento de camadas entre furos (CP-13b)
 * SPEC commit 8, decisões A + H + algoritmo de casamento.
 *
 * NÚCLEO GEOTÉCNICO do corte esquemático. Função PURA (sem React, sem DOM):
 * dada uma lista de furos, agrupa leituras em blocos de família e decide as
 * conexões entre furos adjacentes (gradiente / interrupção brusca).
 *
 * REGRA CENTRAL (decisão do usuário): o casamento usa SOMENTE a família do
 * solo (Coesivo / Granular / Intermediário). O NSPT NÃO governa conexão nem
 * gradiente — é puramente informativo (renderizado ao lado da coluna no 13d).
 *
 * Famílias e ponte (decisão A):
 *   - Granular ↔ Granular  → gradiente
 *   - Coesivo  ↔ Coesivo   → gradiente
 *   - Intermediário ↔ qualquer → gradiente (Silte é ponte universal)
 *   - Granular ↔ Coesivo direto → interrupção brusca
 *
 * Bloco (decisão usuário): leituras CONSECUTIVAS de mesma família agrupadas.
 * Casamento (decisão usuário): liga BLOCO de A ao bloco de mesma família de B,
 *   topo↔topo e base↔base; espessuras/cotas diferentes → linhas inclinadas
 *   (mergulho). Se B tem vários blocos da mesma família, casa com o de cotaTopo
 *   mais próxima (minimiza |cotaTopo_A − cotaTopo_B|). Bloco sem par no vizinho
 *   → interrupção brusca no ponto médio horizontal.
 *
 * Cota absoluta de uma leitura: cotaBase = furo.cotaTopo_m − prof.
 * Topo da leitura prof p: furo.cotaTopo_m − (p − 1).
 * Campos de leitura aceitos: `profundidade_m` (dataset) ou `prof` (testes);
 * `familia` (se já computada no dado) ou derivada de `solo` via engine.
 * ============================================================================ */

import { GeoSPT } from '@/engine/geospt-engine';

// Famílias canônicas
export const FAMILIAS = ['Coesivo', 'Granular', 'Intermediário'];

/**
 * Deriva a família de um solo a partir da tabela canônica da engine
 * (GeoSPT.domain.soilTypes). Reusa a MESMA fonte que o resto do app — não
 * duplica classificação. Retorna 'Coesivo' | 'Granular' | 'Intermediário' | null.
 */
export function derivarFamilia(solo) {
  if (!solo) return null;
  const tabela = GeoSPT?.domain?.soilTypes || {};
  const entry = tabela[solo];
  return entry ? entry.familia : null;
}

/**
 * Decide o tipo de transição entre duas famílias (decisão A).
 * @returns 'gradiente' | 'brusca'
 */
export function tipoTransicao(familiaA, familiaB) {
  if (!familiaA || !familiaB) return 'brusca';
  if (familiaA === familiaB) return 'gradiente';
  // Intermediário é ponte universal
  if (familiaA === 'Intermediário' || familiaB === 'Intermediário') {
    return 'gradiente';
  }
  // Granular ↔ Coesivo direto
  return 'brusca';
}

/**
 * Agrupa as leituras SPT de um furo em blocos de família consecutiva.
 *
 * @param {object} furo — { cotaTopo_m, leituras: [{ prof, nspt, solo, impenetravel? }] }
 * @returns {Array} blocos: [{
 *            familia, solo (do topo do bloco), cotaTopo_m, cotaBase_m,
 *            espessura_m, profTopo, profBase, leituras: [...], temImpenetravel
 *          }]
 *
 * cotaTopo_m do bloco = cota absoluta do topo da primeira leitura do bloco.
 * cotaBase_m do bloco = cota absoluta da base da última leitura do bloco.
 * Topo da leitura prof p: furo.cotaTopo_m − (p − 1). Base: furo.cotaTopo_m − p.
 */
export function agruparEmBlocos(furo) {
  if (!furo || !Array.isArray(furo.leituras) || furo.leituras.length === 0) {
    return [];
  }
  const cotaTopoFuro = furo.cotaTopo_m;
  // Normaliza o acesso aos campos: o dataset usa `profundidade_m` e já traz
  // `familia` pré-computada; aceitamos também `prof` (formato simplificado de
  // teste). Família: usa a do dado se presente, senão deriva do solo.
  const prof = (l) => (l.profundidade_m != null ? l.profundidade_m : l.prof);
  const fam = (l) => l.familia || derivarFamilia(l.solo);

  // Ordena por profundidade crescente (topo → base)
  const leituras = [...furo.leituras]
    .filter((l) => l && prof(l) != null)
    .sort((a, b) => prof(a) - prof(b));

  const blocos = [];
  let atual = null;

  for (const l of leituras) {
    const familia = fam(l);
    const p = prof(l);
    const topoLeitura = cotaTopoFuro - (p - 1);
    const baseLeitura = cotaTopoFuro - p;

    if (atual && atual.familia === familia) {
      // Estende o bloco atual
      atual.cotaBase_m = baseLeitura;
      atual.profBase = p;
      atual.espessura_m = +(atual.cotaTopo_m - atual.cotaBase_m).toFixed(3);
      atual.leituras.push(l);
      if (l.impenetravel) atual.temImpenetravel = true;
    } else {
      // Fecha o anterior e abre um novo bloco
      atual = {
        familia,
        solo: l.solo,
        cotaTopo_m: topoLeitura,
        cotaBase_m: baseLeitura,
        profTopo: p,
        profBase: p,
        espessura_m: +(topoLeitura - baseLeitura).toFixed(3),
        leituras: [l],
        temImpenetravel: !!l.impenetravel,
      };
      blocos.push(atual);
    }
  }
  return blocos;
}

/**
 * Liga blocos de MESMA família entre A e B cujas faixas de cota se sobreponham
 * (ou toquem), 1-para-1, rejeitando pares que cruzariam outro já aceito (regra
 * do "solo em frente"). Blocos sem correspondente → cunha (acunhamento).
 *
 * @returns {object} {
 *   conexoes: [{
 *     familia, tipo: 'gradiente'|'brusca',
 *     topoA, baseA, topoB, baseB,        // cotas absolutas (para desenhar)
 *     blocoA, blocoB,                    // referências aos blocos
 *     mergulhoTopo_m, mergulhoBase_m,    // desnível topo/base (A − B); ≠0 = inclinado
 *     soloA, soloB
 *   }],
 *   semParA: [blocos de A sem equivalente em B],   // interrupção brusca à direita
 *   semParB: [blocos de B sem equivalente em A]    // interrupção brusca à esquerda
 * }
 */
export function casarBlocos(blocosA, blocosB) {
  const conexoes = [];

  // CP-13h — PAREAMENTO POR SOBREPOSIÇÃO DE COTA + MESMA FAMÍLIA + SEM CRUZAMENTO.
  //
  // Decisão do usuário (regra do "solo em frente"): dois blocos só se ligam por
  // trapézio se forem da MESMA família E se suas faixas de cota se sobrepuserem
  // (ou ao menos se tocarem). "O solo que o bloco encontra do outro lado" é o
  // que está na MESMA cota no furo vizinho — não uma camada de mesma família em
  // qualquer profundidade. Assim, uma areia rasa de um furo NÃO atravessa uma
  // espessa argila para casar com uma areia profunda do vizinho: ela acunha.
  //
  // Algoritmo: monta candidatos (mesma família, sobreposição ≥ 0), ordena por
  // MAIOR sobreposição (e, no empate, menor distância de centro) e consome de
  // forma greedy 1-para-1 REJEITANDO qualquer par que cruze um já aceito. O
  // teste de cruzamento usa a ordem vertical (índice topo→base) dos blocos:
  // dois pares (Ai↔Bi) e (Aj↔Bj) cruzam sse a ordem se inverte entre os furos.
  // Blocos sem par → cunha (acunhamento), classificada por classificarCunha.

  const centro = (b) => (b.cotaTopo_m + b.cotaBase_m) / 2;
  const sobreposicao = (a, b) =>
    Math.min(a.cotaTopo_m, b.cotaTopo_m) - Math.max(a.cotaBase_m, b.cotaBase_m);

  const candidatos = [];
  blocosA.forEach((ba, ia) => {
    blocosB.forEach((bb, ib) => {
      if (ba.familia !== bb.familia) return; // só mesma família
      const ov = sobreposicao(ba, bb);
      if (ov < 0) return; // precisa sobrepor ou tocar (ov ≥ 0)
      candidatos.push({ ia, ib, ba, bb, ov, dist: Math.abs(centro(ba) - centro(bb)) });
    });
  });
  // Maior sobreposição primeiro; empate → menor distância de centro.
  candidatos.sort((p, q) => q.ov - p.ov || p.dist - q.dist);

  const usadosIA = new Set();
  const usadosIB = new Set();
  const aceitos = []; // pares já aceitos: { ia, ib }
  // Cruza se a ordem vertical (índice) se inverte entre A e B.
  const cruza = (ia, ib) => aceitos.some((c) => (ia < c.ia) !== (ib < c.ib));

  for (const c of candidatos) {
    if (usadosIA.has(c.ia) || usadosIB.has(c.ib)) continue;
    if (cruza(c.ia, c.ib)) continue; // rejeita pares que cruzariam
    usadosIA.add(c.ia);
    usadosIB.add(c.ib);
    aceitos.push({ ia: c.ia, ib: c.ib });
    conexoes.push({
      familia: c.ba.familia,
      tipo: tipoTransicao(c.ba.familia, c.bb.familia), // mesma família → 'gradiente'
      topoA: c.ba.cotaTopo_m,
      baseA: c.ba.cotaBase_m,
      topoB: c.bb.cotaTopo_m,
      baseB: c.bb.cotaBase_m,
      blocoA: c.ba,
      blocoB: c.bb,
      mergulhoTopo_m: +(c.ba.cotaTopo_m - c.bb.cotaTopo_m).toFixed(3),
      mergulhoBase_m: +(c.ba.cotaBase_m - c.bb.cotaBase_m).toFixed(3),
      soloA: c.ba.solo,
      soloB: c.bb.solo,
    });
  }

  // Blocos não pareados (sem família correspondente em frente, ou excedentes)
  // → cunha de acunhamento.
  const semParA = blocosA.filter((b, i) => !usadosIA.has(i));
  const semParB = blocosB.filter((b, i) => !usadosIB.has(i));

  // CP-13h.1 — FAN-OUT (leque). Quando um bloco contínuo de um furo está em
  // frente a VÁRIOS blocos da MESMA família no vizinho (porque uma camada de
  // outra família — ex.: lente de areia — os separa e acunha entre os furos), o
  // bloco contínuo deve se LIGAR A TODOS eles, partindo sua aresta nos pontos
  // médios dos vãos. Sem isso, o 1-para-1 deixava o(s) bloco(s) excedente(s) do
  // vizinho órfão(s), gerando cunha(s) espúria(s) (ex.: a argila de cima de
  // SPT-05 virava uma cunha que não existe geologicamente). A família é
  // contínua; a camada intercalada é que pinça. Não cruza: as sub-faixas de A
  // ficam empilhadas na mesma ordem vertical dos alvos de B.
  const sobrepoeCota = (t1, b1, t2, b2) =>
    Math.min(t1, t2) - Math.max(b1, b2) >= 0;

  const ramificar = (orfaosVizinho, ladoQueRamifica) => {
    // ladoQueRamifica = 'A' → um bloco A se ramifica para vários B (rescata órfãos de B)
    //                 = 'B' → um bloco B se ramifica para vários A (rescata órfãos de A)
    for (let ci = 0; ci < conexoes.length; ci++) {
      const c = conexoes[ci];
      const blocoFixo = ladoQueRamifica === 'A' ? c.blocoA : c.blocoB;
      const extras = orfaosVizinho.filter(
        (b) =>
          b.familia === c.familia &&
          sobrepoeCota(blocoFixo.cotaTopo_m, blocoFixo.cotaBase_m, b.cotaTopo_m, b.cotaBase_m)
      );
      if (extras.length === 0) continue;

      const blocoVizOrig = ladoQueRamifica === 'A' ? c.blocoB : c.blocoA;
      const alvos = [blocoVizOrig, ...extras].sort((x, y) => y.cotaTopo_m - x.cotaTopo_m);

      // Cortes da aresta do bloco fixo nos pontos médios dos vãos entre alvos.
      const fTopo = blocoFixo.cotaTopo_m;
      const fBase = blocoFixo.cotaBase_m;
      const cortes = [fTopo];
      for (let i = 0; i < alvos.length - 1; i++) {
        let m = (alvos[i].cotaBase_m + alvos[i + 1].cotaTopo_m) / 2;
        m = Math.max(fBase, Math.min(fTopo, m)); // clamp ao intervalo do bloco fixo
        cortes.push(m);
      }
      cortes.push(fBase);

      const novas = alvos.map((bv, i) => {
        const fixoTopo = cortes[i];
        const fixoBase = cortes[i + 1];
        if (ladoQueRamifica === 'A') {
          return {
            ...c,
            topoA: fixoTopo, baseA: fixoBase,
            topoB: bv.cotaTopo_m, baseB: bv.cotaBase_m,
            blocoB: bv,
            mergulhoTopo_m: +(fixoTopo - bv.cotaTopo_m).toFixed(3),
            mergulhoBase_m: +(fixoBase - bv.cotaBase_m).toFixed(3),
            soloB: bv.solo,
            ramificado: true,
          };
        }
        return {
          ...c,
          topoB: fixoTopo, baseB: fixoBase,
          topoA: bv.cotaTopo_m, baseA: bv.cotaBase_m,
          blocoA: bv,
          mergulhoTopo_m: +(bv.cotaTopo_m - fixoTopo).toFixed(3),
          mergulhoBase_m: +(bv.cotaBase_m - fixoBase).toFixed(3),
          soloA: bv.solo,
          ramificado: true,
        };
      });
      conexoes.splice(ci, 1, ...novas);
      ci += novas.length - 1;
      extras.forEach((b) => {
        const idx = orfaosVizinho.indexOf(b);
        if (idx >= 0) orfaosVizinho.splice(idx, 1);
      });
    }
  };

  ramificar(semParB, 'A'); // bloco A contínuo → vários B
  ramificar(semParA, 'B'); // bloco B contínuo → vários A

  // CP-13h.4 — SEGUNDA PASSADA (mergulho forte). Liga órfãos remanescentes de
  // MESMA família que NÃO cruzem os pares já estabelecidos. Captura camadas
  // correspondentes que se afastaram tanto em cota que deixaram de se sobrepor
  // (mergulho acentuado) — p.ex. a única argila de cada furo, entre a mesma
  // areia e o mesmo silte, mas em cotas distintas. NÃO reabilita atravessamento:
  // a regra de não-cruzamento barra pares que invertem a ordem vertical (uma
  // areia rasa × uma areia profunda separadas por argila continuam acunhando). A
  // sobreposição segue sendo a prioridade — esta passada só age sobre o que
  // sobrou da principal e do leque.
  const idxA = (b) => blocosA.indexOf(b);
  const idxB = (b) => blocosB.indexOf(b);
  const paresFirmados = conexoes
    .map((c) => ({ ia: idxA(c.blocoA), ib: idxB(c.blocoB) }))
    .filter((p) => p.ia >= 0 && p.ib >= 0);
  const cruzaFirmado = (ia, ib) =>
    paresFirmados.some((p) => (ia < p.ia) !== (ib < p.ib));

  const candidatos2 = [];
  semParA.forEach((ba) => {
    semParB.forEach((bb) => {
      if (ba.familia !== bb.familia) return; // só mesma família
      const ia = idxA(ba);
      const ib = idxB(bb);
      if (ia < 0 || ib < 0) return;
      candidatos2.push({ ba, bb, ia, ib, dist: Math.abs(centro(ba) - centro(bb)) });
    });
  });
  candidatos2.sort((p, q) => p.dist - q.dist); // mais próximos em cota primeiro

  const usados2A = new Set();
  const usados2B = new Set();
  for (const c of candidatos2) {
    if (usados2A.has(c.ia) || usados2B.has(c.ib)) continue;
    if (cruzaFirmado(c.ia, c.ib)) continue; // rejeita o que cruzaria os já firmados
    usados2A.add(c.ia);
    usados2B.add(c.ib);
    paresFirmados.push({ ia: c.ia, ib: c.ib }); // passa a contar para o cruzamento
    conexoes.push({
      familia: c.ba.familia,
      tipo: tipoTransicao(c.ba.familia, c.bb.familia), // mesma família → 'gradiente'
      topoA: c.ba.cotaTopo_m,
      baseA: c.ba.cotaBase_m,
      topoB: c.bb.cotaTopo_m,
      baseB: c.bb.cotaBase_m,
      blocoA: c.ba,
      blocoB: c.bb,
      mergulhoTopo_m: +(c.ba.cotaTopo_m - c.bb.cotaTopo_m).toFixed(3),
      mergulhoBase_m: +(c.ba.cotaBase_m - c.bb.cotaBase_m).toFixed(3),
      soloA: c.ba.solo,
      soloB: c.bb.solo,
      mergulhoForte: true, // ligado sem sobreposição de cota (mergulho acentuado)
    });
  }
  if (usados2A.size > 0) {
    const restA = semParA.filter((b) => !usados2A.has(idxA(b)));
    semParA.length = 0;
    semParA.push(...restA);
  }
  if (usados2B.size > 0) {
    const restB = semParB.filter((b) => !usados2B.has(idxB(b)));
    semParB.length = 0;
    semParB.push(...restB);
  }

  // Mantém as conexões na ordem vertical de A (topo→base) para desenho estável.
  conexoes.sort((c1, c2) => c2.topoA - c1.topoA);

  return { conexoes, semParA, semParB };
}

/**
 * Processa uma sequência ordenada de furos, produzindo blocos por furo e as
 * conexões entre cada par adjacente. É a função que o SVG (CP-13d) consome.
 *
 * @param {Array} furos — sequência [{ nome, cotaTopo_m, leituras: [...] }, ...]
 * @returns {object} {
 *   blocosPorFuro: [{ nome, blocos }],
 *   paresAdjacentes: [{ aNome, bNome, ...resultado de casarBlocos }]
 * }
 */
export function processarSequenciaFuros(furos, opcoes = {}) {
  // CP-13h.2 — DECISÃO DO USUÁRIO: não há mais "lente". Toda camada é SOLO REAL
  // (bloco normal), qualquer que seja a espessura. Não se colapsa nada e o
  // triângulo de acunhamento sempre alcança a FACE do furo oposto (frac 1.0).
  // Isso elimina a dependência do limiar: a topologia passa a ser idêntica para
  // qualquer valor (antes, uma areia fina virava lente em um limiar e não em
  // outro, mudando o desenho — o "0,5 ≠ 1,5" relatado). O parâmetro de limiar
  // foi descontinuado (mantido na assinatura por compatibilidade, mas ignorado);
  // o array `lentes` de cada furo fica sempre vazio.
  void opcoes; // limiar descontinuado

  const blocosPorFuro = furos.map((f) => {
    const blocos = agruparEmBlocos(f);
    return {
      nome: f.nome,
      cotaTopo_m: f.cotaTopo_m,
      blocos,
      blocosParaCasar: blocos,
      lentes: [],
    };
  });

  // Conexões entre pares adjacentes. Cada bloco sem-par vira cunha de
  // acunhamento (classificarCunha → sempre frac 1.0, alcança a face oposta).
  const paresAdjacentes = [];
  for (let i = 0; i < blocosPorFuro.length - 1; i++) {
    const A = blocosPorFuro[i];
    const B = blocosPorFuro[i + 1];
    const casamento = casarBlocos(A.blocosParaCasar, B.blocosParaCasar);
    casamento.cunhasA = (casamento.semParA || []).map((b) =>
      classificarCunha(b, A.blocosParaCasar, B.blocosParaCasar, 'A')
    );
    casamento.cunhasB = (casamento.semParB || []).map((b) =>
      classificarCunha(b, B.blocosParaCasar, A.blocosParaCasar, 'B')
    );
    paresAdjacentes.push({ aNome: A.nome, bNome: B.nome, ...casamento });
  }

  return { blocosPorFuro, paresAdjacentes };
}

/**
 * Classifica um bloco sem-par como 'borda' (1º ou último do furo → cunha afina
 * o vão todo) ou 'meio' (interno → afina até 50% do vão).
 */
export function classificarBordaOuMeio(bloco, blocosDoFuro) {
  const idx = blocosDoFuro.findIndex(
    (b) =>
      b === bloco ||
      (b.cotaTopo_m === bloco.cotaTopo_m && b.familia === bloco.familia)
  );
  if (idx <= 0 || idx === blocosDoFuro.length - 1) return 'borda';
  return 'meio';
}

/**
 * Encontra a cota (centro) do bloco do furo vizinho mais próxima da posição
 * vertical do bloco dado — a direção para onde a cunha "mergulha".
 */
export function cotaMaisProxima(bloco, blocosVizinho) {
  const centro = (bloco.cotaTopo_m + bloco.cotaBase_m) / 2;
  let melhor = centro;
  let dist = Infinity;
  for (const b of blocosVizinho) {
    const c = (b.cotaTopo_m + b.cotaBase_m) / 2;
    if (Math.abs(c - centro) < dist) {
      dist = Math.abs(c - centro);
      melhor = c;
    }
  }
  return melhor;
}

/**
 * CP-13h / CP-13h.2 — Classifica um bloco sem-par (órfão) como cunha de
 * acunhamento e calcula sua geometria. Decisão do usuário: o triângulo SEMPRE
 * atravessa o vão INTEIRO (frac 1.0) e alcança a FACE do furo vizinho — não há
 * mais "lente" que some no meio do vão. Dois casos quanto ao ALVO vertical:
 *
 *  - BORDA (1º ou último bloco do furo): a camada some lateralmente; a ponta
 *    termina no TOPO do vizinho (se for o bloco do topo) ou na BASE do vizinho
 *    (se for o de baixo).
 *  - INTERIOR (bloco entre dois outros): a ponta termina no nível MÉDIO do
 *    próprio bloco projetado na face do vizinho (o solo em frente é, por
 *    construção, de família diferente — se fosse igual, teria casado por
 *    trapézio, ou ramificado em leque).
 *
 * @returns {object} { bloco, lado, tipoCunha:'borda'|'interior', frac:1.0, cotaAlvo }
 */
export function classificarCunha(bloco, blocosDoFuro, blocosVizinho, lado) {
  const idx = blocosDoFuro.findIndex(
    (b) =>
      b === bloco ||
      (b.cotaTopo_m === bloco.cotaTopo_m && b.familia === bloco.familia)
  );
  const ehTopo = idx <= 0;
  const ehBase = idx === blocosDoFuro.length - 1;
  const ehBorda = ehTopo || ehBase;
  const centroOrfao = (bloco.cotaTopo_m + bloco.cotaBase_m) / 2;

  if (ehBorda) {
    // topo do vizinho = maior cotaTopo_m; base do vizinho = menor cotaBase_m
    const temViz = Array.isArray(blocosVizinho) && blocosVizinho.length > 0;
    const topoViz = temViz ? Math.max(...blocosVizinho.map((b) => b.cotaTopo_m)) : centroOrfao;
    const baseViz = temViz ? Math.min(...blocosVizinho.map((b) => b.cotaBase_m)) : centroOrfao;
    // bloco do topo mira o topo do vizinho; bloco de baixo mira a base do vizinho.
    const cotaAlvo = ehTopo && !ehBase ? topoViz : ehBase && !ehTopo ? baseViz : topoViz;
    return { bloco, lado, tipoCunha: 'borda', frac: 1.0, cotaAlvo };
  }

  // Interior (CP-13h.3): a camada some lateralmente ENTRE duas famílias. Quando
  // os blocos imediatamente acima (P) e abaixo (Q) do órfão são de famílias
  // DIFERENTES e ambos têm correspondente no furo vizinho, a ponta da cunha deve
  // cair na JUNÇÃO desses vizinhos — onde a base do correspondente de P encontra
  // o topo do correspondente de Q —, que é exatamente onde o trapézio de cima e
  // o de baixo se encontram na face oposta. Mirar o centro do próprio bloco
  // (comportamento anterior) deixava VAZIO acima da cunha e SOBREPOSIÇÃO abaixo
  // sempre que essa junção ficava numa cota diferente do centro. Sem um par P/Q
  // bem definido (borda já tratada acima; mesma família; ou correspondente
  // ausente no vizinho), mantém o centro do órfão como fallback seguro.
  const blocoAcima = idx > 0 ? blocosDoFuro[idx - 1] : null;
  const blocoAbaixo = idx < blocosDoFuro.length - 1 ? blocosDoFuro[idx + 1] : null;
  let cotaAlvo = centroOrfao;
  if (
    blocoAcima &&
    blocoAbaixo &&
    blocoAcima.familia !== blocoAbaixo.familia &&
    Array.isArray(blocosVizinho)
  ) {
    const sobrepoe = (a, b) =>
      Math.min(a.cotaTopo_m, b.cotaTopo_m) - Math.max(a.cotaBase_m, b.cotaBase_m);
    const correspondente = (ref) =>
      blocosVizinho
        .filter((b) => b.familia === ref.familia && sobrepoe(b, ref) >= 0)
        .sort((x, y) => sobrepoe(y, ref) - sobrepoe(x, ref))[0] || null;
    const vizAcima = correspondente(blocoAcima); // mesma família que P
    const vizAbaixo = correspondente(blocoAbaixo); // mesma família que Q
    if (vizAcima && vizAbaixo) {
      cotaAlvo = (vizAcima.cotaBase_m + vizAbaixo.cotaTopo_m) / 2;
    }
  }
  return { bloco, lado, tipoCunha: 'interior', frac: 1.0, cotaAlvo };
}
