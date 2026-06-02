/* ============================================================================
 * pdfGraficos — geradores de SVG (como string) para embutir nos relatórios PDF
 *
 * Caminho A da discussão CP-10d: funções puras que produzem <svg>...</svg> como
 * texto, espelhando a lógica visual dos componentes React equivalentes
 * (MiniMapaSVG, PerfilCompatibilizadoSVG, CurvaQxCotaSVG). SVG nativo imprime
 * nítido em PDF (vetorial), mantém texto selecionável e não pesa como imagem.
 *
 * NÃO importam React. Recebem dados já calculados e devolvem string.
 * escHtml é reusado de pdfHelpers para textos dinâmicos (nomes de furo/estaca).
 * ============================================================================ */

import { escHtml } from './pdfHelpers';

// Passo redondo para ticks (espelha passoRedondo do MiniMapaSVG)
function passoRedondo(alvo) {
  if (alvo <= 0 || !Number.isFinite(alvo)) return 1;
  const exp = Math.floor(Math.log10(alvo));
  const base = Math.pow(10, exp);
  const norm = alvo / base;
  let mult;
  if (norm < 1.5) mult = 1;
  else if (norm < 3) mult = 2;
  else if (norm < 7) mult = 5;
  else mult = 10;
  return mult * base;
}

/* ----------------------------------------------------------------------------
 * 1. Mini-mapa de locação (furos + estacas + domínios, escala real)
 * Espelha MiniMapaSVG mas estático (sem tooltip/seleção). item 17 do CP-8a.1.
 * -------------------------------------------------------------------------- */
const CORES_DOMINIO = ['#2563EB', '#DC2626', '#16A34A', '#9333EA', '#EA580C'];
const COR_SEM_DOMINIO = '#94A3B8';

export function svgMiniMapa(sondagens, estacas) {
  const furos = Object.entries(sondagens || {})
    .filter(
      ([, s]) =>
        s.coordenadas &&
        s.coordenadas.x != null &&
        s.coordenadas.y != null
    )
    .map(([nome, s]) => ({
      nome,
      x: s.coordenadas.x,
      y: s.coordenadas.y,
      dominio: s.dominioGeotecnico,
    }));
  const ests = (estacas || []).filter(
    (e) => e.coordenadas && e.coordenadas.x != null && e.coordenadas.y != null
  );

  if (furos.length === 0 && ests.length === 0) {
    return '<div class="info-box small">Sem coordenadas (x, y) cadastradas — mini-mapa indisponível.</div>';
  }

  const W = 440,
    H = 380,
    pad = 34;
  const todosX = [...furos.map((f) => f.x), ...ests.map((e) => e.coordenadas.x)];
  const todosY = [...furos.map((f) => f.y), ...ests.map((e) => e.coordenadas.y)];
  let xMin = Math.min(...todosX),
    xMax = Math.max(...todosX);
  let yMin = Math.min(...todosY),
    yMax = Math.max(...todosY);
  const xRange = Math.max(xMax - xMin, 1),
    yRange = Math.max(yMax - yMin, 1);
  xMin -= xRange * 0.15;
  xMax += xRange * 0.15;
  yMin -= yRange * 0.15;
  yMax += yRange * 0.15;
  const dx = xMax - xMin,
    dy = yMax - yMin;
  const plotW = W - 2 * pad,
    plotH = H - 2 * pad;
  const fator = Math.min(plotW / dx, plotH / dy); // escala real (1m X = 1m Y)
  const desenhoW = dx * fator,
    desenhoH = dy * fator;
  const offsetX = pad + (plotW - desenhoW) / 2;
  const offsetY = pad + (plotH - desenhoH) / 2;
  const xScale = (x) => offsetX + (x - xMin) * fator;
  const yScale = (y) => offsetY + desenhoH - (y - yMin) * fator; // flip Y

  const dominios = [];
  furos.forEach((f) => {
    if (f.dominio && !dominios.includes(f.dominio)) dominios.push(f.dominio);
  });
  const corDom = (d) =>
    !d ? COR_SEM_DOMINIO : CORES_DOMINIO[dominios.indexOf(d) % CORES_DOMINIO.length];

  // Grade
  const passoX = passoRedondo(70 / fator),
    passoY = passoRedondo(70 / fator);
  let grade = '';
  for (let x = Math.ceil(xMin / passoX) * passoX; x <= xMax; x += passoX) {
    const px = xScale(x);
    grade += `<line x1="${px.toFixed(1)}" y1="${offsetY.toFixed(1)}" x2="${px.toFixed(1)}" y2="${(offsetY + desenhoH).toFixed(1)}" stroke="#E2E8F0"/>`;
    grade += `<text x="${px.toFixed(1)}" y="${(offsetY + desenhoH + 12).toFixed(1)}" text-anchor="middle" font-size="8" fill="#64748B">${x.toFixed(0)}</text>`;
  }
  for (let y = Math.ceil(yMin / passoY) * passoY; y <= yMax; y += passoY) {
    const py = yScale(y);
    grade += `<line x1="${offsetX.toFixed(1)}" y1="${py.toFixed(1)}" x2="${(offsetX + desenhoW).toFixed(1)}" y2="${py.toFixed(1)}" stroke="#E2E8F0"/>`;
    grade += `<text x="${(offsetX - 4).toFixed(1)}" y="${(py + 3).toFixed(1)}" text-anchor="end" font-size="8" fill="#64748B">${y.toFixed(0)}</text>`;
  }

  // Bolhas de domínio (centroide + raio até furo mais distante)
  let bolhas = '';
  dominios.forEach((d) => {
    const fd = furos.filter((f) => f.dominio === d);
    if (fd.length < 2) return;
    const cx = fd.reduce((s, f) => s + f.x, 0) / fd.length;
    const cy = fd.reduce((s, f) => s + f.y, 0) / fd.length;
    const raio = Math.max(
      ...fd.map((f) => Math.hypot(f.x - cx, f.y - cy))
    );
    bolhas += `<circle cx="${xScale(cx).toFixed(1)}" cy="${yScale(cy).toFixed(1)}" r="${(raio * fator).toFixed(1)}" fill="${corDom(d)}" fill-opacity="0.08" stroke="${corDom(d)}" stroke-opacity="0.3" stroke-dasharray="3 2"/>`;
  });

  // Furos (triângulo) e estacas (quadrado)
  let marcadores = '';
  furos.forEach((f) => {
    const px = xScale(f.x),
      py = yScale(f.y);
    const cor = corDom(f.dominio);
    marcadores += `<polygon points="${px.toFixed(1)},${(py - 5).toFixed(1)} ${(px - 4.5).toFixed(1)},${(py + 3).toFixed(1)} ${(px + 4.5).toFixed(1)},${(py + 3).toFixed(1)}" fill="${cor}" stroke="white" stroke-width="0.5"/>`;
    marcadores += `<text x="${(px + 6).toFixed(1)}" y="${(py + 3).toFixed(1)}" font-size="8" fill="#334155" font-weight="bold">${escHtml(f.nome)}</text>`;
  });
  ests.forEach((e) => {
    const px = xScale(e.coordenadas.x),
      py = yScale(e.coordenadas.y);
    marcadores += `<rect x="${(px - 3.5).toFixed(1)}" y="${(py - 3.5).toFixed(1)}" width="7" height="7" fill="#1E293B" stroke="white" stroke-width="0.5"/>`;
    marcadores += `<text x="${(px - 6).toFixed(1)}" y="${(py + 3).toFixed(1)}" text-anchor="end" font-size="8" fill="#1E293B">${escHtml(e.nome)}</text>`;
  });

  // Legenda de domínios
  let legenda = '';
  if (dominios.length > 0) {
    legenda += `<g transform="translate(${(W - 120).toFixed(0)}, ${(pad + 4).toFixed(0)})">`;
    legenda += `<rect x="-4" y="-4" width="118" height="${(dominios.length * 13 + 8).toFixed(0)}" fill="white" fill-opacity="0.9" stroke="#CBD5E1" stroke-width="0.5" rx="2"/>`;
    dominios.forEach((d, i) => {
      legenda += `<rect x="0" y="${(i * 13).toFixed(0)}" width="9" height="9" fill="${corDom(d)}" fill-opacity="0.5"/>`;
      legenda += `<text x="13" y="${(i * 13 + 8).toFixed(0)}" font-size="8" fill="#334155">${escHtml(d)}</text>`;
    });
    legenda += `</g>`;
  }

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:${W}px;height:auto;border:1px solid #CBD5E1;border-radius:4px;background:white;">
${grade}
<line x1="${offsetX.toFixed(1)}" y1="${offsetY.toFixed(1)}" x2="${offsetX.toFixed(1)}" y2="${(offsetY + desenhoH).toFixed(1)}" stroke="#475569" stroke-width="1.5"/>
<line x1="${offsetX.toFixed(1)}" y1="${(offsetY + desenhoH).toFixed(1)}" x2="${(offsetX + desenhoW).toFixed(1)}" y2="${(offsetY + desenhoH).toFixed(1)}" stroke="#475569" stroke-width="1.5"/>
<text x="${(offsetX + desenhoW / 2).toFixed(1)}" y="${(H - 4).toFixed(1)}" text-anchor="middle" font-size="9" fill="#334155" font-weight="bold">X (m)</text>
<text x="10" y="${(offsetY + desenhoH / 2).toFixed(1)}" text-anchor="middle" font-size="9" fill="#334155" font-weight="bold" transform="rotate(-90, 10, ${(offsetY + desenhoH / 2).toFixed(1)})">Y (m)</text>
${bolhas}
${marcadores}
${legenda}
</svg>`;
}

/* ----------------------------------------------------------------------------
 * 2. Perfil compatibilizado (NSPT × cota, envoltória + médias por família)
 * Espelha PerfilCompatibilizadoSVG.
 * -------------------------------------------------------------------------- */
export function svgPerfilCompatibilizado(resultados) {
  if (!resultados || resultados.length === 0) {
    return '<div class="info-box small">Sem dados de compatibilização.</div>';
  }
  const W = 360,
    H = 500;
  const padL = 38,
    padR = 8,
    padT = 16,
    padB = 72;
  const plotW = W - padL - padR,
    plotH = H - padT - padB;
  const cotas = resultados.map((r) => r.cotaRef_m);
  const cotaMax = Math.max(...cotas),
    cotaMin = Math.min(...cotas);
  const nsptMax = 50;
  const xScale = (n) => padL + (n / nsptMax) * plotW;
  const yScale = (c) =>
    padT + ((cotaMax - c) / (cotaMax - cotaMin || 1)) * plotH;

  const ptsEnv = resultados
    .filter((r) => r.envoltoria.nspt !== null)
    .map((r) => ({
      n: r.envoltoria.nspt,
      c: r.cotaRef_m,
      imp: r.envoltoria.impenetravel,
    }));

  const coletaMedia = (familia, chave) =>
    resultados
      .map((r) => {
        if (
          !r.heterogeneo &&
          r.familiaPred === familia &&
          r.media?.familiaPredominante != null
        )
          return { n: r.media.familiaPredominante, c: r.cotaRef_m };
        if (r.heterogeneo && r.media?.[chave] != null)
          return { n: r.media[chave], c: r.cotaRef_m };
        return null;
      })
      .filter((p) => p !== null);
  const ptsCoesivo = coletaMedia('Coesivo', 'coesivo');
  const ptsGranular = coletaMedia('Granular', 'granular');
  const ptsInterm = coletaMedia('Intermediário', 'intermediario');

  const pathStr = (pts) =>
    pts
      .map((p, i) => (i === 0 ? 'M' : 'L') + xScale(p.n).toFixed(1) + ' ' + yScale(p.c).toFixed(1))
      .join(' ');

  // Faixas de família
  const faixaW = 12;
  let faixas = '';
  resultados.forEach((r) => {
    const cor = r.heterogeneo
      ? '#FCD34D'
      : r.familiaPred === 'Coesivo'
        ? '#DBEAFE'
        : r.familiaPred === 'Granular'
          ? '#FEF3C7'
          : r.familiaPred === 'Intermediário'
            ? '#EDE9FE'
            : '#F1F5F9';
    const yTopo = yScale(r.cotaRef_m + 0.5),
      yBase = yScale(r.cotaRef_m - 0.5);
    faixas += `<rect x="${(padL - faixaW - 2).toFixed(1)}" y="${yTopo.toFixed(1)}" width="${faixaW}" height="${Math.max(2, yBase - yTopo).toFixed(1)}" fill="${cor}"/>`;
  });

  // Grid + ticks
  const xTicks = [0, 10, 20, 30, 40, 50];
  let grid = '';
  xTicks.forEach((t) => {
    grid += `<line x1="${xScale(t).toFixed(1)}" x2="${xScale(t).toFixed(1)}" y1="${padT}" y2="${padT + plotH}" stroke="#E2E8F0"/>`;
    grid += `<text x="${xScale(t).toFixed(1)}" y="${padT + plotH + 14}" text-anchor="middle" font-size="9" fill="#475569">${t}</text>`;
  });
  const yTicks = [];
  for (let c = Math.ceil(cotaMin); c <= cotaMax; c++) {
    if (cotaMax - cotaMin > 30 && c % 2 !== 0) continue;
    yTicks.push(c);
  }
  yTicks.forEach((c) => {
    grid += `<line x1="${padL}" x2="${padL + plotW}" y1="${yScale(c).toFixed(1)}" y2="${yScale(c).toFixed(1)}" stroke="#E2E8F0"/>`;
    grid += `<text x="${padL - 6}" y="${(yScale(c) + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="#475569">${c}</text>`;
  });

  const linhaMedia = (pts, cor) =>
    pts.length > 1
      ? `<path d="${pathStr(pts)}" fill="none" stroke="${cor}" stroke-width="1.5" stroke-dasharray="4 2"/>`
      : '';

  let pontosEnv = '';
  ptsEnv.forEach((p) => {
    pontosEnv += `<circle cx="${xScale(p.n).toFixed(1)}" cy="${yScale(p.c).toFixed(1)}" r="2.5" fill="#DC2626"/>`;
    if (p.imp)
      pontosEnv += `<text x="${(xScale(p.n) + 6).toFixed(1)}" y="${(yScale(p.c) + 3).toFixed(1)}" font-size="11" fill="#B45309" font-weight="bold">★</text>`;
  });

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:${W}px;height:auto;border:1px solid #CBD5E1;border-radius:4px;background:white;">
${grid}
${faixas}
<line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + plotH}" stroke="#475569" stroke-width="1.5"/>
<line x1="${padL}" y1="${padT + plotH}" x2="${padL + plotW}" y2="${padT + plotH}" stroke="#475569" stroke-width="1.5"/>
<text x="${(padL + plotW / 2).toFixed(1)}" y="${(padT + plotH + 28).toFixed(1)}" text-anchor="middle" font-size="10" fill="#334155" font-weight="bold">NSPT</text>
<text x="10" y="${(padT + plotH / 2).toFixed(1)}" text-anchor="middle" font-size="10" fill="#334155" font-weight="bold" transform="rotate(-90, 10, ${(padT + plotH / 2).toFixed(1)})">Cota (m)</text>
${linhaMedia(ptsCoesivo, '#2563EB')}
${linhaMedia(ptsInterm, '#7C3AED')}
${linhaMedia(ptsGranular, '#D97706')}
${ptsEnv.length > 1 ? `<path d="${pathStr(ptsEnv)}" fill="none" stroke="#DC2626" stroke-width="2"/>` : ''}
${pontosEnv}
<g transform="translate(${padL}, ${(padT + plotH + 40).toFixed(1)})">
<line x1="0" y1="0" x2="14" y2="0" stroke="#DC2626" stroke-width="2"/><text x="18" y="3" font-size="9" fill="#334155">Envoltória inferior</text>
<line x1="120" y1="0" x2="134" y2="0" stroke="#2563EB" stroke-width="1.5" stroke-dasharray="4 2"/><text x="138" y="3" font-size="9" fill="#334155">Médias por família</text>
<text x="0" y="15" font-size="9" fill="#B45309" font-weight="bold">★</text><text x="10" y="15" font-size="9" fill="#334155">Impenetrável</text>
</g>
</svg>`;
}

/* ----------------------------------------------------------------------------
 * 3. Curva Q_adm × cota (DQ azul cheia, AV verde tracejada, carga vermelha)
 * Espelha CurvaQxCotaSVG.
 * -------------------------------------------------------------------------- */
export function svgCurvaCapacidade(memDq, memAv, estaca) {
  memDq = memDq || [];
  memAv = memAv || [];
  if (memDq.length === 0 && memAv.length === 0) {
    return '<div class="info-box small">Sem dados para a curva de capacidade.</div>';
  }
  const W = 680,
    H = 300;
  const padL = 50,
    padR = 16,
    padT = 18,
    padB = 36;
  const plotW = W - padL - padR,
    plotH = H - padT - padB;
  const todasCotas = [
    ...memDq.map((m) => m.cotaPonta_m),
    ...memAv.map((m) => m.cotaPonta_m),
  ];
  const todasQ = [
    ...memDq.map((m) => m.Qadm_final_tf).filter((v) => v != null),
    ...memAv.map((m) => m.Qadm_final_tf).filter((v) => v != null),
  ];
  if (todasCotas.length === 0 || todasQ.length === 0) {
    return '<div class="info-box small">Sem dados para a curva de capacidade.</div>';
  }
  const cotaMin = Math.min(...todasCotas),
    cotaMax = Math.max(...todasCotas);
  const carga = estaca?.cargaPrevista_tf ?? 0;
  const qMax = Math.max(...todasQ, carga) * 1.1;
  const xScale = (q) => padL + (q / qMax) * plotW;
  const yScale = (c) =>
    padT + ((cotaMax - c) / (cotaMax - cotaMin || 1)) * plotH;
  const pathStr = (mem) =>
    mem
      .filter((m) => m.Qadm_final_tf != null)
      .map(
        (m, i) =>
          (i === 0 ? 'M' : 'L') +
          xScale(m.Qadm_final_tf).toFixed(1) +
          ' ' +
          yScale(m.cotaPonta_m).toFixed(1)
      )
      .join(' ');

  const stepY = Math.max(1, Math.ceil((cotaMax - cotaMin) / 8));
  const yTicks = [];
  for (let c = Math.ceil(cotaMin); c <= cotaMax; c += stepY) yTicks.push(c);
  const stepX = qMax > 100 ? 20 : qMax > 50 ? 10 : qMax > 20 ? 5 : 2;
  const xTicks = [];
  for (let q = 0; q <= qMax; q += stepX) xTicks.push(q);

  let grid = '';
  xTicks.forEach((t) => {
    grid += `<line x1="${xScale(t).toFixed(1)}" x2="${xScale(t).toFixed(1)}" y1="${padT}" y2="${padT + plotH}" stroke="#E2E8F0"/>`;
    grid += `<text x="${xScale(t).toFixed(1)}" y="${padT + plotH + 14}" text-anchor="middle" font-size="9" fill="#475569">${t}</text>`;
  });
  yTicks.forEach((c) => {
    grid += `<line x1="${padL}" x2="${padL + plotW}" y1="${yScale(c).toFixed(1)}" y2="${yScale(c).toFixed(1)}" stroke="#E2E8F0"/>`;
    grid += `<text x="${padL - 6}" y="${(yScale(c) + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="#475569">${c}</text>`;
  });

  let cargaLinha = '';
  if (carga > 0) {
    cargaLinha = `<line x1="${xScale(carga).toFixed(1)}" x2="${xScale(carga).toFixed(1)}" y1="${padT}" y2="${padT + plotH}" stroke="#DC2626" stroke-width="1" stroke-dasharray="5 3"/>
<text x="${(xScale(carga) + 3).toFixed(1)}" y="${padT + 10}" font-size="9" fill="#DC2626" font-weight="bold">Carga prev. (${carga} tf)</text>`;
  }

  let pontosDq = '';
  memDq
    .filter((m) => m.Qadm_final_tf != null)
    .forEach((m) => {
      pontosDq += `<circle cx="${xScale(m.Qadm_final_tf).toFixed(1)}" cy="${yScale(m.cotaPonta_m).toFixed(1)}" r="2.5" fill="#2563EB"/>`;
    });
  let pontosAv = '';
  memAv
    .filter((m) => m.Qadm_final_tf != null)
    .forEach((m) => {
      pontosAv += `<circle cx="${xScale(m.Qadm_final_tf).toFixed(1)}" cy="${yScale(m.cotaPonta_m).toFixed(1)}" r="2.5" fill="#16A34A"/>`;
    });

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:${W}px;height:auto;border:1px solid #CBD5E1;border-radius:4px;background:white;">
${grid}
<line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + plotH}" stroke="#475569" stroke-width="1.5"/>
<line x1="${padL}" y1="${padT + plotH}" x2="${padL + plotW}" y2="${padT + plotH}" stroke="#475569" stroke-width="1.5"/>
<text x="${(padL + plotW / 2).toFixed(1)}" y="${H - 4}" text-anchor="middle" font-size="10" fill="#334155" font-weight="bold">Q_adm (tf)</text>
<text x="12" y="${(padT + plotH / 2).toFixed(1)}" text-anchor="middle" font-size="10" fill="#334155" font-weight="bold" transform="rotate(-90, 12, ${(padT + plotH / 2).toFixed(1)})">Cota ponta (m)</text>
${cargaLinha}
${memDq.length > 1 ? `<path d="${pathStr(memDq)}" fill="none" stroke="#2563EB" stroke-width="2"/>` : ''}
${pontosDq}
${memAv.length > 1 ? `<path d="${pathStr(memAv)}" fill="none" stroke="#16A34A" stroke-width="2" stroke-dasharray="4 2"/>` : ''}
${pontosAv}
<g transform="translate(${padL + plotW - 130}, ${padT + 6})">
<rect x="-2" y="-2" width="128" height="44" fill="white" fill-opacity="0.9" stroke="#CBD5E1" stroke-width="0.5" rx="2"/>
<line x1="0" y1="6" x2="14" y2="6" stroke="#2563EB" stroke-width="2"/><text x="18" y="9" font-size="9" fill="#334155">Décourt-Quaresma</text>
<line x1="0" y1="20" x2="14" y2="20" stroke="#16A34A" stroke-width="2" stroke-dasharray="4 2"/><text x="18" y="23" font-size="9" fill="#334155">Aoki-Velloso</text>
<line x1="0" y1="34" x2="14" y2="34" stroke="#DC2626" stroke-width="1" stroke-dasharray="5 3"/><text x="18" y="37" font-size="9" fill="#334155">Carga prev.</text>
</g>
</svg>`;
}
