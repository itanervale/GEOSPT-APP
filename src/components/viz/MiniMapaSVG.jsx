/* ============================================================================
 * MiniMapaSVG v2 (CP-8a.1) — mapa 2D profissional com aspect ratio real
 *
 * Itens entregues neste refactor (do plano CP-8a.1):
 *   3  Símbolos diferenciados: furo=círculo cheio, estaca=losango,
 *      furo crítico=círculo com anel externo + ícone ⚠
 *   4  Tooltip rico (X, Y, cota topo, prof. final, domínio) via <title> SVG
 *   5  Legenda fixa + resumo (furos plotados, estacas plotadas,
 *      sem coordenadas, furo crítico se passado)
 *   6  Grade leve + ticks com unidades + escala gráfica (0—5—10m)
 *   8  Aspect ratio REAL (escala única para X e Y; mapa retangular permanece
 *      retangular). Implementação: escolho o menor de fatorX/fatorY e centralizo
 *      o desenho no SVG.
 *  11  Bolhas translúcidas de domínio (envoltória aproximada — circle centrado
 *      no centroide com raio até o furo mais distante do domínio)
 *  14  Furo crítico destacado: anel vermelho + ⚠ + tooltip com "X% das cotas"
 *
 * Itens deixados para CPs futuros (não tente implementar agora):
 *   1, 2, 12, 13, 4-completo (Q_adm) — dependem do CP-9
 *   17 — depende do CP-10
 *   9, 10, 15, 16 — backlog pós-CP-13
 *
 * Props:
 *   sondagens       — objeto { nome → sondagem }
 *   estacas         — array de estacas
 *   furoCritico     — string (nome) ou null. Quando presente, destaca o furo
 *                     correspondente (item 14)
 *   furoCriticoPct  — número 0-1 (fração de cotas dominadas). Opcional.
 *
 * Observação técnica importante: o eixo Y aqui é o Y do MAPA TOPOGRÁFICO
 * (cresce para cima — Norte). O SVG tem Y crescendo para baixo, então faço
 * o flip em yScale. NÃO confundir com cota geotécnica (z) — aqui Y é planimétrico.
 * ============================================================================ */

import React, { useMemo, useState } from 'react';

const CORES_DOMINIO = ['#2563EB', '#DC2626', '#16A34A', '#9333EA', '#EA580C'];
const COR_FURO_PADRAO = '#475569'; // slate-600 (mais escuro que antes — melhor contraste)
const COR_FURO_SEM_DOMINIO = '#94A3B8'; // slate-400
const COR_ESTACA = '#DC2626';
const COR_ESTACA_BORDA = '#7F1D1D';
const COR_FURO_CRITICO = '#DC2626';
const COR_SELECAO = '#2563EB'; // blue-600 — destaque do elemento selecionado

// Para a escala gráfica: encontra um "passo redondo" próximo do alvo
function passoRedondo(alvo) {
  const ordem = Math.pow(10, Math.floor(Math.log10(alvo)));
  const candidatos = [1, 2, 5, 10].map((m) => m * ordem);
  return candidatos.reduce(
    (best, c) => (Math.abs(c - alvo) < Math.abs(best - alvo) ? c : best),
    candidatos[0]
  );
}

export default function MiniMapaSVG({
  sondagens,
  estacas,
  furoCritico = null,
  furoCriticoPct = null,
  elementoSelecionado = null, // { tipo: 'furo'|'estaca', nome: string } | null
  onSelecionar = null, // (tipo, nome) => void — clicar de novo no mesmo desseleciona
  dominiosObra = null, // CP-12b: array obra.dominios[] (schema novo)
}) {
  // CP-12b — domínios via schema novo (obra.dominios[]). Quando dominiosObra é
  // passado, a cor/nome do domínio de cada furo vem dele (via furoParaDominio).
  // Mapa nomeFuro → nome do domínio, derivado do array obra.dominios.
  const mapaFuroDominio = useMemo(() => {
    const m = {};
    (dominiosObra || []).forEach((d) => {
      (d.furos || []).forEach((nf) => {
        m[nf] = d.nome;
      });
    });
    return m;
  }, [dominiosObra]);
  // ============================================================================
  // Camadas ligáveis/desligáveis (item 10 — backlog CP-8a.1)
  // Regra: o nome de um elemento só aparece se a camada do elemento
  // (Furos/Estacas) E a camada "Nomes" estiverem ambas ligadas.
  // ============================================================================
  const [camadas, setCamadas] = useState({
    furos: true,
    estacas: true,
    nomes: true,
    grade: true,
    dominios: true,
  });
  const toggleCamada = (chave) =>
    setCamadas((c) => ({ ...c, [chave]: !c[chave] }));

  // ============================================================================
  // 1. Filtrar itens com coordenadas (e quantificar os sem)
  // ============================================================================
  const furosArr = useMemo(
    () =>
      Object.entries(sondagens)
        .filter(
          ([_, s]) =>
            s.coordenadas &&
            s.coordenadas.x !== null &&
            s.coordenadas.x !== undefined &&
            s.coordenadas.y !== null &&
            s.coordenadas.y !== undefined
        )
        .map(([nome, s]) => ({
          nome,
          x: s.coordenadas.x,
          y: s.coordenadas.y,
          // CP-12b: domínio vem do schema novo (mapaFuroDominio) quando há
          // dominiosObra; senão cai no campo antigo s.dominioGeotecnico.
          dominio: mapaFuroDominio[nome] ?? s.dominioGeotecnico,
          cotaTopo_m: s.cotaTopo_m,
          profundidadeFinal_m: s.profundidadeFinal_m,
        })),
    [sondagens, mapaFuroDominio]
  );

  const estacasArr = useMemo(
    () =>
      estacas.filter(
        (e) =>
          e.coordenadas &&
          e.coordenadas.x !== null &&
          e.coordenadas.x !== undefined &&
          e.coordenadas.y !== null &&
          e.coordenadas.y !== undefined
      ),
    [estacas]
  );

  const furosSemCoord = Object.keys(sondagens).length - furosArr.length;
  const estacasSemCoord = estacas.length - estacasArr.length;

  // Domínios identificados (preservando ordem de aparição)
  const dominios = useMemo(() => {
    const set = new Set();
    furosArr.forEach((f) => f.dominio && set.add(f.dominio));
    return Array.from(set);
  }, [furosArr]);

  const corDominio = (d) => {
    if (!d) return COR_FURO_SEM_DOMINIO;
    const idx = dominios.indexOf(d);
    return CORES_DOMINIO[idx % CORES_DOMINIO.length];
  };

  // Bolhas de domínio (item 11) — circle envolvendo furos do mesmo domínio.
  // DEVE ficar antes de qualquer return condicional (regra dos Hooks): este
  // useMemo precisa rodar em todos os renders, com ou sem furos/estacas.
  const bolhasDominio = useMemo(() => {
    return dominios
      .map((d) => {
        const furosDoDominio = furosArr.filter((f) => f.dominio === d);
        if (furosDoDominio.length < 2) return null; // 1 furo: bolha não faz sentido visual
        const cx =
          furosDoDominio.reduce((s, f) => s + f.x, 0) / furosDoDominio.length;
        const cy =
          furosDoDominio.reduce((s, f) => s + f.y, 0) / furosDoDominio.length;
        const rMax = Math.max(
          ...furosDoDominio.map((f) => Math.hypot(f.x - cx, f.y - cy))
        );
        const r_m = rMax + 1.5; // 1.5 m de margem visual
        return { nome: d, cx, cy, r_m, cor: corDominio(d), n: furosDoDominio.length };
      })
      .filter(Boolean);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dominios, furosArr]);

  // ============================================================================
  // 2. Dimensões e escala REAL (mesma escala para X e Y — item 8)
  // ============================================================================
  const W = 460;
  const H = 460;
  const pad = 34;

  // Empty state
  if (furosArr.length === 0 && estacasArr.length === 0) {
    return (
      <div className="text-sm text-slate-500 p-4 text-center">
        <div>Nenhum furo ou estaca tem coordenadas (x, y) cadastradas.</div>
        <div className="text-xs mt-1">
          Cadastre coordenadas na Aba 2 (sondagens) ou no modal de edição de
          estacas.
        </div>
      </div>
    );
  }

  const todosX = [
    ...furosArr.map((f) => f.x),
    ...estacasArr.map((e) => e.coordenadas.x),
  ];
  const todosY = [
    ...furosArr.map((f) => f.y),
    ...estacasArr.map((e) => e.coordenadas.y),
  ];

  let xMin = Math.min(...todosX);
  let xMax = Math.max(...todosX);
  let yMin = Math.min(...todosY);
  let yMax = Math.max(...todosY);

  // Margem 15% (mínimo 1m em cada lado)
  const xRange = Math.max(xMax - xMin, 1);
  const yRange = Math.max(yMax - yMin, 1);
  const xMargem = xRange * 0.15;
  const yMargem = yRange * 0.15;
  xMin -= xMargem;
  xMax += xMargem;
  yMin -= yMargem;
  yMax += yMargem;

  const dx = xMax - xMin;
  const dy = yMax - yMin;

  // ESCALA ÚNICA: usar o menor fator entre fatorX e fatorY (item 8)
  // Isso garante que 1 metro em X = 1 metro em Y no SVG (aspect ratio real)
  const plotW = W - 2 * pad;
  const plotH = H - 2 * pad;
  const fatorX = plotW / dx;
  const fatorY = plotH / dy;
  const fator = Math.min(fatorX, fatorY); // m → px

  // Dimensões reais do desenho (em px)
  const desenhoW = dx * fator;
  const desenhoH = dy * fator;

  // Offsets para CENTRALIZAR o desenho no plot area
  const offsetX = pad + (plotW - desenhoW) / 2;
  const offsetY = pad + (plotH - desenhoH) / 2;

  const xScale = (x) => offsetX + (x - xMin) * fator;
  // Flip Y (mapa topográfico: Y cresce para cima)
  const yScale = (y) => offsetY + desenhoH - (y - yMin) * fator;

  // Bbox real do desenho no SVG (para grade, escala, eixos)
  const plotX0 = offsetX;
  const plotX1 = offsetX + desenhoW;
  const plotY0 = offsetY;
  const plotY1 = offsetY + desenhoH;

  // ============================================================================
  // 3. Grade e ticks (item 6) — usa passos redondos em metros
  // ============================================================================
  // Espaçamento alvo: ~70px entre ticks (zona de conforto visual)
  const passoX = passoRedondo(70 / fator);
  const passoY = passoRedondo(70 / fator);

  const ticksX = [];
  const xStartTick = Math.ceil(xMin / passoX) * passoX;
  for (let x = xStartTick; x <= xMax; x += passoX) ticksX.push(x);

  const ticksY = [];
  const yStartTick = Math.ceil(yMin / passoY) * passoY;
  for (let y = yStartTick; y <= yMax; y += passoY) ticksY.push(y);

  // ============================================================================
  // 4. Escala gráfica (item 6) — barra 0—N metros no canto inf. esquerdo
  // ============================================================================
  // Quero uma barra com largura entre 50-100px
  const passoEscala = passoRedondo(75 / fator);
  const larguraEscalaPx = passoEscala * fator;
  const escalaX0 = plotX0 + 8;
  const escalaY0 = plotY1 - 12;

  // ============================================================================
  // 5. Bolhas de domínio (item 11) — calculado ANTES do early return (regra dos
  // Hooks: todo Hook deve rodar em todo render, na mesma ordem).
  // ============================================================================
  // (movido para antes do empty state — ver bloco logo após os useMemo iniciais)

  // ============================================================================
  // 6. Seleção (CP-8a.2): clique seleciona/desseleciona; destaque visual
  // ============================================================================
  const ehSelecionado = (tipo, nome) =>
    elementoSelecionado &&
    elementoSelecionado.tipo === tipo &&
    elementoSelecionado.nome === nome;

  const handleClickElemento = (tipo, nome) => {
    if (!onSelecionar) return;
    // Clicar no mesmo desseleciona
    if (ehSelecionado(tipo, nome)) {
      onSelecionar(null, null);
    } else {
      onSelecionar(tipo, nome);
    }
  };

  // Detalhes do elemento selecionado (para painel acima do resumo)
  const detalheSelecionado = (() => {
    if (!elementoSelecionado) return null;
    if (elementoSelecionado.tipo === 'furo') {
      const f = furosArr.find((x) => x.nome === elementoSelecionado.nome);
      if (!f) return null;
      const ehCritico = furoCritico === f.nome;
      return {
        tipo: 'furo',
        nome: f.nome,
        linhas: [
          { rotulo: 'Coordenadas', valor: `(${f.x.toFixed(2)}, ${f.y.toFixed(2)}) m` },
          f.cotaTopo_m != null
            ? { rotulo: 'Cota topo', valor: `${f.cotaTopo_m.toFixed(3)} m` }
            : null,
          f.profundidadeFinal_m != null
            ? { rotulo: 'Prof. final', valor: `${f.profundidadeFinal_m.toFixed(2)} m` }
            : null,
          { rotulo: 'Domínio', valor: f.dominio || '— sem domínio' },
          ehCritico && furoCriticoPct != null
            ? {
                rotulo: 'Status',
                valor: `⚠ Furo crítico (${(furoCriticoPct * 100).toFixed(0)}% das cotas)`,
                destaque: 'critico',
              }
            : null,
        ].filter(Boolean),
      };
    }
    if (elementoSelecionado.tipo === 'estaca') {
      const e = estacasArr.find((x) => x.nome === elementoSelecionado.nome);
      if (!e) return null;
      return {
        tipo: 'estaca',
        nome: e.nome,
        linhas: [
          {
            rotulo: 'Coordenadas',
            valor: `(${e.coordenadas.x.toFixed(2)}, ${e.coordenadas.y.toFixed(2)}) m`,
          },
          e.tipoEstaca ? { rotulo: 'Tipo', valor: e.tipoEstaca } : null,
          e.diametro_m
            ? {
                rotulo: e.formato === 'quadrada' ? 'Lado' : 'Diâmetro',
                valor: `${Math.round((e.dimensao_m ?? e.diametro_m) * 100)} cm`,
              }
            : null,
          e.cotaArrasamento_m != null
            ? { rotulo: 'Cota arrasamento', valor: `${e.cotaArrasamento_m} m` }
            : null,
          e.cargaPrevista_tf != null
            ? { rotulo: 'Carga prevista', valor: `${e.cargaPrevista_tf} tf` }
            : null,
          (() => {
            // CP-12b: nome do domínio via dominioId no schema novo
            const dom = (dominiosObra || []).find((x) => x.id === e.dominioId);
            const nome = dom ? dom.nome : e.dominioGeotecnico;
            return nome ? { rotulo: 'Domínio', valor: nome } : null;
          })(),
        ].filter(Boolean),
      };
    }
    return null;
  })();

  return (
    <div>
      {/* === Painel de camadas (item 10) === */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-[11px]">
        <span className="font-semibold text-slate-600 mr-1">Camadas:</span>
        {[
          ['furos', 'Furos SPT'],
          ['estacas', 'Estacas'],
          ['nomes', 'Nomes'],
          ['grade', 'Grade'],
          ['dominios', 'Domínios'],
        ].map(([chave, rotulo]) => (
          <label
            key={chave}
            className="inline-flex items-center gap-1 cursor-pointer select-none text-slate-700 hover:text-slate-900"
          >
            <input
              type="checkbox"
              checked={camadas[chave]}
              onChange={() => toggleCamada(chave)}
              className="w-3 h-3 cursor-pointer"
            />
            {rotulo}
          </label>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ maxHeight: '560px', background: '#FAFAFA' }}
        role="img"
        aria-label="Mini-mapa de locação de furos e estacas"
      >
        {/* === Grade leve (item 6) === */}
        {camadas.grade &&
          ticksX.map((x) => (
          <line
            key={'gx' + x}
            x1={xScale(x)}
            y1={plotY0}
            x2={xScale(x)}
            y2={plotY1}
            stroke="#E2E8F0"
            strokeWidth="0.6"
          />
        ))}
        {camadas.grade &&
          ticksY.map((y) => (
          <line
            key={'gy' + y}
            x1={plotX0}
            y1={yScale(y)}
            x2={plotX1}
            y2={yScale(y)}
            stroke="#E2E8F0"
            strokeWidth="0.6"
          />
        ))}

        {/* === Bolhas de domínio (item 11) === */}
        {camadas.dominios &&
          bolhasDominio.map((b) => (
          <g key={'dom_' + b.nome}>
            <circle
              cx={xScale(b.cx)}
              cy={yScale(b.cy)}
              r={b.r_m * fator}
              fill={b.cor}
              fillOpacity="0.10"
              stroke={b.cor}
              strokeWidth="1"
              strokeDasharray="4 3"
              strokeOpacity="0.6"
            />
          </g>
        ))}

        {/* === Eixos === */}
        <line
          x1={plotX0}
          y1={plotY1}
          x2={plotX1}
          y2={plotY1}
          stroke="#475569"
          strokeWidth="1.5"
        />
        <line
          x1={plotX0}
          y1={plotY0}
          x2={plotX0}
          y2={plotY1}
          stroke="#475569"
          strokeWidth="1.5"
        />

        {/* Ticks com labels — eixo X (item 6) */}
        {ticksX.map((x) => (
          <g key={'tx' + x}>
            <line
              x1={xScale(x)}
              y1={plotY1}
              x2={xScale(x)}
              y2={plotY1 + 4}
              stroke="#475569"
            />
            <text
              x={xScale(x)}
              y={plotY1 + 14}
              textAnchor="middle"
              fontSize="9"
              fill="#475569"
              fontFamily="monospace"
            >
              {Number.isInteger(passoX) ? x.toFixed(0) : x.toFixed(1)}
            </text>
          </g>
        ))}

        {/* Ticks com labels — eixo Y (item 6) */}
        {ticksY.map((y) => (
          <g key={'ty' + y}>
            <line
              x1={plotX0 - 4}
              y1={yScale(y)}
              x2={plotX0}
              y2={yScale(y)}
              stroke="#475569"
            />
            <text
              x={plotX0 - 6}
              y={yScale(y) + 3}
              textAnchor="end"
              fontSize="9"
              fill="#475569"
              fontFamily="monospace"
            >
              {Number.isInteger(passoY) ? y.toFixed(0) : y.toFixed(1)}
            </text>
          </g>
        ))}

        {/* Labels dos eixos */}
        <text
          x={(plotX0 + plotX1) / 2}
          y={H - 6}
          textAnchor="middle"
          fontSize="10"
          fill="#334155"
          fontWeight="bold"
        >
          X (m)
        </text>
        <text
          x={10}
          y={(plotY0 + plotY1) / 2}
          textAnchor="middle"
          fontSize="10"
          fill="#334155"
          fontWeight="bold"
          transform={`rotate(-90, 10, ${(plotY0 + plotY1) / 2})`}
        >
          Y (m)
        </text>

        {/* === Escala gráfica (item 6) === */}
        <g>
          <line
            x1={escalaX0}
            y1={escalaY0}
            x2={escalaX0 + larguraEscalaPx}
            y2={escalaY0}
            stroke="#1E293B"
            strokeWidth="2"
          />
          <line
            x1={escalaX0}
            y1={escalaY0 - 3}
            x2={escalaX0}
            y2={escalaY0 + 3}
            stroke="#1E293B"
            strokeWidth="2"
          />
          <line
            x1={escalaX0 + larguraEscalaPx}
            y1={escalaY0 - 3}
            x2={escalaX0 + larguraEscalaPx}
            y2={escalaY0 + 3}
            stroke="#1E293B"
            strokeWidth="2"
          />
          <text
            x={escalaX0 + larguraEscalaPx / 2}
            y={escalaY0 - 5}
            textAnchor="middle"
            fontSize="9"
            fill="#1E293B"
            fontWeight="bold"
          >
            {passoEscala} m
          </text>
        </g>

        {/* === Furos (círculos cheios; furo crítico tem anel + ⚠) (itens 3, 14) === */}
        {camadas.furos &&
          furosArr.map((f) => {
          const cor = corDominio(f.dominio);
          const cx = xScale(f.x);
          const cy = yScale(f.y);
          const ehCritico = furoCritico && f.nome === furoCritico;
          const ehSel = ehSelecionado('furo', f.nome);
          // Tooltip rico (item 4-parcial)
          const tooltipLinhas = [
            f.nome,
            `X: ${f.x.toFixed(2)} m   Y: ${f.y.toFixed(2)} m`,
            f.cotaTopo_m != null
              ? `Cota topo: ${f.cotaTopo_m.toFixed(3)} m`
              : null,
            f.profundidadeFinal_m != null
              ? `Prof. final: ${f.profundidadeFinal_m.toFixed(2)} m`
              : null,
            f.dominio ? `Domínio: ${f.dominio}` : 'Domínio: (não atribuído)',
            ehCritico && furoCriticoPct != null
              ? `⚠ Furo crítico — ${(furoCriticoPct * 100).toFixed(0)}% das cotas`
              : null,
            onSelecionar ? '(clique para selecionar)' : null,
          ].filter(Boolean);
          return (
            <g
              key={'f_' + f.nome}
              onClick={() => handleClickElemento('furo', f.nome)}
              style={{ cursor: onSelecionar ? 'pointer' : 'default' }}
            >
              {/* Anel de seleção (azul, externo a tudo) — CP-8a.2 */}
              {ehSel && (
                <circle
                  cx={cx}
                  cy={cy}
                  r="14"
                  fill="none"
                  stroke={COR_SELECAO}
                  strokeWidth="2.5"
                  opacity="0.85"
                />
              )}
              {/* Anel externo do furo crítico (item 14) */}
              {ehCritico && (
                <circle
                  cx={cx}
                  cy={cy}
                  r="11"
                  fill="none"
                  stroke={COR_FURO_CRITICO}
                  strokeWidth="1.8"
                  strokeDasharray="3 2"
                  opacity="0.85"
                >
                  <title>{tooltipLinhas.join('\n')}</title>
                </circle>
              )}
              {/* Círculo cheio do furo (item 3) */}
              <circle
                cx={cx}
                cy={cy}
                r="6"
                fill={cor}
                stroke="white"
                strokeWidth="1.5"
              >
                <title>{tooltipLinhas.join('\n')}</title>
              </circle>
              {/* Ícone ⚠ ao lado do furo crítico (item 14) */}
              {ehCritico && (
                <text
                  x={cx + 14}
                  y={cy - 10}
                  fontSize="13"
                  fill={COR_FURO_CRITICO}
                  fontWeight="bold"
                >
                  ⚠
                </text>
              )}
              {camadas.nomes && (
                <text
                  x={cx + 10}
                  y={cy + 3}
                  fontSize="10"
                  fill={ehSel ? COR_SELECAO : '#1E293B'}
                  fontWeight="bold"
                >
                  {f.nome}
                </text>
              )}
            </g>
          );
        })}

        {/* === Estacas (losangos) (item 3) === */}
        {camadas.estacas &&
          estacasArr.map((e, i) => {
          const cx = xScale(e.coordenadas.x);
          const cy = yScale(e.coordenadas.y);
          const r = 7; // raio do losango
          // Losango = rotação 45° do quadrado (pontos N, E, S, W)
          const pontos = `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`;
          const ehSel = ehSelecionado('estaca', e.nome);
          const tooltipLinhas = [
            e.nome,
            `X: ${e.coordenadas.x.toFixed(2)} m   Y: ${e.coordenadas.y.toFixed(2)} m`,
            e.tipoEstaca ? `Tipo: ${e.tipoEstaca}` : null,
            e.diametro_m
              ? `${e.formato === 'quadrada' ? 'Lado' : 'Diâmetro'}: ${Math.round(
                  (e.dimensao_m ?? e.diametro_m) * 100
                )} cm`
              : null,
            e.cotaArrasamento_m != null
              ? `Cota arrasamento: ${e.cotaArrasamento_m} m`
              : null,
            e.cargaPrevista_tf != null
              ? `Carga prevista: ${e.cargaPrevista_tf} tf`
              : null,
            e.dominioGeotecnico ? `Domínio: ${e.dominioGeotecnico}` : null,
            onSelecionar ? '(clique para selecionar)' : null,
          ].filter(Boolean);
          return (
            <g
              key={'e_' + i}
              onClick={() => handleClickElemento('estaca', e.nome)}
              style={{ cursor: onSelecionar ? 'pointer' : 'default' }}
            >
              {/* Anel de seleção (azul) — CP-8a.2 */}
              {ehSel && (
                <circle
                  cx={cx}
                  cy={cy}
                  r="14"
                  fill="none"
                  stroke={COR_SELECAO}
                  strokeWidth="2.5"
                  opacity="0.85"
                />
              )}
              <polygon
                points={pontos}
                fill={COR_ESTACA}
                stroke="white"
                strokeWidth="1.5"
              >
                <title>{tooltipLinhas.join('\n')}</title>
              </polygon>
              {camadas.nomes && (
                <text
                  x={cx - 10}
                  y={cy + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill={ehSel ? COR_SELECAO : COR_ESTACA_BORDA}
                  fontWeight="bold"
                >
                  {e.nome}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* === Painel "Elemento selecionado" (CP-8a.2) === */}
      {detalheSelecionado && (
        <div className="mt-2 px-2 py-2 bg-blue-50 border-l-4 border-blue-500 rounded">
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm font-bold text-blue-900 flex items-center gap-2">
              <span className="text-xs uppercase tracking-wide text-blue-700">
                {detalheSelecionado.tipo === 'furo' ? '● Furo' : '◆ Estaca'}
              </span>
              <span className="font-mono">{detalheSelecionado.nome}</span>
            </div>
            <button
              onClick={() => onSelecionar && onSelecionar(null, null)}
              className="text-xs text-blue-700 hover:text-blue-900 underline"
              title="Limpar seleção"
            >
              limpar
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
            {detalheSelecionado.linhas.map((linha, i) => (
              <div
                key={i}
                className={
                  linha.destaque === 'critico'
                    ? 'col-span-2 text-red-700 font-medium'
                    : ''
                }
              >
                <span className="text-slate-500">{linha.rotulo}:</span>{' '}
                <span className="font-mono text-slate-800">{linha.valor}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === Legenda + resumo (item 5-parcial) === */}
      <div className="text-xs text-slate-700 mt-2 px-1 space-y-1.5">
        {/* Linha 1: legenda de símbolos */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 items-center">
          <span className="flex items-center gap-1">
            <svg width="14" height="14" className="inline-block align-middle">
              <circle cx="7" cy="7" r="5" fill={COR_FURO_PADRAO} stroke="white" strokeWidth="1.2" />
            </svg>
            Furo SPT
          </span>
          <span className="flex items-center gap-1">
            <svg width="14" height="14" className="inline-block align-middle">
              <polygon
                points="7,2 12,7 7,12 2,7"
                fill={COR_ESTACA}
                stroke="white"
                strokeWidth="1.2"
              />
            </svg>
            Estaca
          </span>
          {furoCritico && (
            <span className="flex items-center gap-1">
              <svg width="14" height="14" className="inline-block align-middle">
                <circle cx="7" cy="7" r="6" fill="none" stroke={COR_FURO_CRITICO} strokeWidth="1.2" strokeDasharray="2 1.5" />
                <circle cx="7" cy="7" r="3.5" fill={COR_FURO_PADRAO} stroke="white" strokeWidth="0.8" />
              </svg>
              Furo crítico
            </span>
          )}
        </div>

        {/* Linha 2: domínios identificados */}
        {dominios.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 items-center">
            <span className="text-slate-500">Domínios:</span>
            {dominios.map((d) => (
              <span key={d} className="flex items-center gap-1">
                <span
                  className="inline-block w-3 h-3 rounded-full align-middle"
                  style={{ background: corDominio(d), opacity: 0.85 }}
                ></span>
                {d}
              </span>
            ))}
          </div>
        )}

        {/* Linha 3: resumo de quantidades */}
        <div className="border-t border-slate-200 pt-1.5 text-slate-600">
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
            <div>
              Furos plotados:{' '}
              <strong>
                {furosArr.length} / {Object.keys(sondagens).length}
              </strong>
            </div>
            <div>
              Estacas plotadas:{' '}
              <strong>
                {estacasArr.length} / {estacas.length}
              </strong>
            </div>
            {furoCritico && (
              <div className="col-span-2 text-red-700">
                Furo crítico: <strong className="font-mono">{furoCritico}</strong>
                {furoCriticoPct != null && (
                  <> ({(furoCriticoPct * 100).toFixed(0)}% das cotas)</>
                )}
              </div>
            )}
            {dominios.length > 0 && (
              <div className="col-span-2">
                Domínios geotécnicos: <strong>{dominios.length}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Linha 4: alertas de itens sem coordenada */}
        {(furosSemCoord > 0 || estacasSemCoord > 0) && (
          <div className="text-amber-700 pt-1">
            ⚠
            {furosSemCoord > 0 && <> {furosSemCoord} furo(s)</>}
            {furosSemCoord > 0 && estacasSemCoord > 0 && ' e'}
            {estacasSemCoord > 0 && <> {estacasSemCoord} estaca(s)</>} sem
            coordenadas — não plotados.
          </div>
        )}
      </div>
    </div>
  );
}
