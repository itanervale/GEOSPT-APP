/* ============================================================================
 * geometriaCorte — cálculo de coordenadas do corte esquemático (CP-13d)
 * SPEC commit 8, §4.
 *
 * Função PURA (sem React): converte a sequência de itens + blocos (do
 * casamentoCamadas) em coordenadas SVG. Separada do JSX para ser TESTÁVEL no
 * Node — provamos que as posições estão corretas antes de renderizar.
 *
 * Sistema de coordenadas:
 *   - Y = cota absoluta (m), escala real, eixo à esquerda. Cota MAIOR em cima.
 *   - X = posição na sequência (i-ésimo item), espaçamento uniforme.
 *
 * O SVG é desenhado em px; o mapeamento cota→y é linear e único (escala real).
 * ============================================================================ */

// Cores por família (SPEC §4): Coesivo=azul, Granular=âmbar, Intermediário=púrpura
export const COR_FAMILIA = {
  Coesivo: '#3B82F6',
  Granular: '#D97706',
  Intermediário: '#9333EA',
};
export const COR_FAMILIA_FRACA = {
  Coesivo: '#BFDBFE',
  Granular: '#FDE68A',
  Intermediário: '#E9D5FF',
};

export function corFamilia(familia) {
  return COR_FAMILIA[familia] || '#94A3B8';
}
export function corFamiliaFraca(familia) {
  return COR_FAMILIA_FRACA[familia] || '#E2E8F0';
}

/**
 * Calcula o domínio de cotas (min/max) de toda a sequência, considerando
 * sondagens (topo → base das leituras) e estacas (cota de arrasamento).
 * Retorna { cotaMax, cotaMin } com uma folga.
 */
export function calcularDominioCotas(itensResolvidos) {
  let cotaMax = -Infinity;
  let cotaMin = Infinity;

  for (const it of itensResolvidos) {
    if (it.tipo === 'furo') {
      // topo do furo
      if (it.cotaTopo_m != null) cotaMax = Math.max(cotaMax, it.cotaTopo_m);
      // base = topo - profundidade da última leitura
      for (const b of it.blocos) {
        cotaMax = Math.max(cotaMax, b.cotaTopo_m);
        cotaMin = Math.min(cotaMin, b.cotaBase_m);
      }
    } else if (it.tipo === 'estaca') {
      // estaca vai da cota de arrasamento para baixo (comprimento estimado)
      if (it.cotaArrasamento_m != null) {
        cotaMax = Math.max(cotaMax, it.cotaArrasamento_m);
        // a ponta da estaca: usa a menor cota conhecida ou arrasamento - 1
        const pontaEstimada =
          it.cotaPonta_m != null ? it.cotaPonta_m : it.cotaArrasamento_m - 1;
        cotaMin = Math.min(cotaMin, pontaEstimada);
      }
    }
  }

  if (!isFinite(cotaMax) || !isFinite(cotaMin)) {
    return { cotaMax: 0, cotaMin: 0 };
  }
  // Folga de 1m em cima e embaixo
  return { cotaMax: cotaMax + 1, cotaMin: cotaMin - 1 };
}

/**
 * Constrói o mapeamento de coordenadas para o SVG.
 *
 * @param itensResolvidos — sequência [{ tipo, nome, cotaTopo_m?, blocos?,
 *                            cotaArrasamento_m?, diametro_m?, x, y, ... }]
 * @param layout — { W, H, padL, padR, padT, padB, colW }
 * @returns {
 *   yDe(cota) → px,            // mapeia cota absoluta → y em px
 *   xColuna(indice) → px,      // centro x da coluna i
 *   escalaY,                   // px por metro
 *   cotaMax, cotaMin,
 *   plotTop, plotBottom, plotH,
 *   colunas: [{ indice, tipo, nome, xCentro, ... }]
 * }
 */
export function construirGeometria(itensResolvidos, layout) {
  const {
    W = 900,
    padL = 60,
    padR = 40,
    padT = 50,
    padB = 90,
    colW = 120,
  } = layout || {};

  const n = itensResolvidos.length;
  const { cotaMax, cotaMin } = calcularDominioCotas(itensResolvidos);
  const spanCota = cotaMax - cotaMin || 1;

  // Largura total depende do nº de colunas
  const plotW = n * colW;
  const larguraTotal = padL + plotW + padR;
  const Wfinal = Math.max(W, larguraTotal);

  const plotTop = padT;
  const plotH = (layout?.H || 600) - padT - padB;
  const plotBottom = plotTop + plotH;
  const escalaY = plotH / spanCota; // px por metro

  // cota absoluta → y px (cota MAIOR fica no topo = menor y)
  const yDe = (cota) => plotTop + (cotaMax - cota) * escalaY;

  // centro x da coluna i (0-based)
  const xColuna = (i) => padL + colW * i + colW / 2;

  const colunas = itensResolvidos.map((it, i) => ({
    indice: i,
    tipo: it.tipo,
    nome: it.nome,
    xCentro: xColuna(i),
  }));

  return {
    yDe,
    xColuna,
    escalaY,
    cotaMax,
    cotaMin,
    plotTop,
    plotBottom,
    plotH,
    Wfinal,
    colW,
    padL,
    padR,
    padT,
    padB,
    colunas,
  };
}

/**
 * Gera os ticks do eixo Y (cotas inteiras a cada passo).
 * @returns [{ cota, y }]
 */
export function ticksEixoY(geo, passo = 1) {
  const ticks = [];
  const ini = Math.ceil(geo.cotaMin);
  const fim = Math.floor(geo.cotaMax);
  for (let c = ini; c <= fim; c += passo) {
    ticks.push({ cota: c, y: geo.yDe(c) });
  }
  return ticks;
}

/**
 * Distância 2D entre dois itens (para o aviso de furos distantes — proteção c).
 */
export function distancia2D(itemA, itemB) {
  if (
    itemA.x == null ||
    itemA.y == null ||
    itemB.x == null ||
    itemB.y == null
  ) {
    return null;
  }
  const dx = itemA.x - itemB.x;
  const dy = itemA.y - itemB.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Para uma estaca, calcula quais blocos de família ela atravessa e a espessura
 * em cada um, usando os blocos do furo MAIS PRÓXIMO (referência geológica).
 * Texto "atravessa Coesivo (3.5m) + Granular (2.0m)".
 *
 * @param estaca — { cotaArrasamento_m, cotaPonta_m, x, y }
 * @param furosResolvidos — [{ nome, x, y, blocos }]
 * @returns { furoRef, atravessa: [{ familia, espessura_m }], texto }
 */
export function estacaAtravessa(estaca, furosResolvidos) {
  if (!furosResolvidos || furosResolvidos.length === 0) {
    return { furoRef: null, atravessa: [], texto: '' };
  }
  // Furo mais próximo da estaca (2D)
  let ref = null;
  let melhorDist = Infinity;
  for (const f of furosResolvidos) {
    const d = distancia2D(estaca, f);
    const dist = d == null ? Infinity : d;
    if (dist < melhorDist) {
      melhorDist = dist;
      ref = f;
    }
  }
  if (!ref) return { furoRef: null, atravessa: [], texto: '' };

  const topo = estaca.cotaArrasamento_m;
  const ponta =
    estaca.cotaPonta_m != null ? estaca.cotaPonta_m : topo - 1;
  if (topo == null) return { furoRef: ref.nome, atravessa: [], texto: '' };

  // Interseção [ponta, topo] com cada bloco [cotaBase, cotaTopo]
  const atravessa = [];
  for (const b of ref.blocos) {
    const sup = Math.min(topo, b.cotaTopo_m);
    const inf = Math.max(ponta, b.cotaBase_m);
    const esp = sup - inf;
    if (esp > 0.001) {
      atravessa.push({ familia: b.familia, espessura_m: +esp.toFixed(2) });
    }
  }

  // Agrupa por família (somando espessuras de blocos da mesma família)
  const porFamilia = {};
  for (const a of atravessa) {
    porFamilia[a.familia] = (porFamilia[a.familia] || 0) + a.espessura_m;
  }
  const texto = Object.entries(porFamilia)
    .map(([fam, esp]) => fam + ' (' + esp.toFixed(1) + 'm)')
    .join(' + ');

  return { furoRef: ref.nome, atravessa, texto };
}
