/* ============================================================================
 * MiniMapaSelecao — mini-mapa clicável para o corte esquemático (CP-13c)
 *
 * DEDICADO (não reusa o MiniMapaSVG compartilhado, que faz seleção ÚNICA para
 * destaque). Aqui a seleção é MÚLTIPLA e ORDENADA: clicar num furo/estaca o
 * adiciona ao fim da sequência; o item recebe um número de ordem (1, 2, 3...).
 * Clicar de novo num item já selecionado o remove da sequência.
 *
 * Escala real (1m em X = 1m em Y), como o mini-mapa principal.
 *
 * Props:
 *   sondagens   — { nome → sondagem }
 *   estacas     — [estaca]
 *   sequencia   — [{ tipo:'furo'|'estaca', nome }] (ordem atual)
 *   onToggle    — (tipo, nome) => void  (adiciona ao fim / remove)
 * ============================================================================ */

import React, { useMemo } from 'react';

const COR_FURO = '#0EA5E9';
const COR_ESTACA = '#334155';
const COR_SEL = '#16A34A'; // verde para itens na sequência

export default function MiniMapaSelecao({ sondagens, estacas, sequencia, onToggle }) {
  const W = 400;
  const H = 300;

  // Itens com coordenadas válidas
  const { furos, ests, semCoord } = useMemo(() => {
    const furos = [];
    let semCoord = 0;
    Object.entries(sondagens || {}).forEach(([nome, s]) => {
      if (
        s.coordenadas &&
        s.coordenadas.x != null &&
        s.coordenadas.y != null
      ) {
        furos.push({ nome, x: s.coordenadas.x, y: s.coordenadas.y });
      } else {
        semCoord++;
      }
    });
    const ests = [];
    (estacas || []).forEach((e) => {
      if (e.coordenadas && e.coordenadas.x != null && e.coordenadas.y != null) {
        ests.push({ nome: e.nome, x: e.coordenadas.x, y: e.coordenadas.y });
      } else {
        semCoord++;
      }
    });
    return { furos, ests, semCoord };
  }, [sondagens, estacas]);

  const todos = [...furos, ...ests];

  // Escala real (única para X e Y), preservando aspecto. Margens laterais
  // MAIORES que topo/base: os rótulos saem para os lados (estaca à esquerda,
  // furo à direita), então precisam de folga horizontal para não vazar do SVG.
  const margemLateral = 70;
  const margemVert = 40;
  const escala = useMemo(() => {
    if (todos.length === 0) return null;
    const xs = todos.map((p) => p.x);
    const ys = todos.map((p) => p.y);
    const minX = Math.min(...xs),
      maxX = Math.max(...xs);
    const minY = Math.min(...ys),
      maxY = Math.max(...ys);
    const spanX = maxX - minX || 1;
    const spanY = maxY - minY || 1;
    const plotW = W - 2 * margemLateral;
    const plotH = H - 2 * margemVert;
    const s = Math.min(plotW / spanX, plotH / spanY);
    // Centraliza
    const offX = margemLateral + (plotW - spanX * s) / 2;
    const offY = margemVert + (plotH - spanY * s) / 2;
    return {
      px: (x) => offX + (x - minX) * s,
      // Y invertido (norte para cima)
      py: (y) => H - (offY + (y - minY) * s),
    };
  }, [todos]);

  // Índice de ordem na sequência (1-based) para um item, ou 0 se ausente
  const ordemDe = (tipo, nome) => {
    const i = (sequencia || []).findIndex(
      (it) => it.tipo === tipo && it.nome === nome
    );
    return i === -1 ? 0 : i + 1;
  };

  // CP-13e (#7) — pontos da polilinha do corte A–A', na ordem da sequência.
  // Resolve cada item da sequência para sua coordenada (x,y).
  const coordDe = (it) => {
    if (it.tipo === 'furo') {
      const s = sondagens[it.nome];
      return s?.coordenadas?.x != null
        ? { x: s.coordenadas.x, y: s.coordenadas.y }
        : null;
    }
    const e = (estacas || []).find((x) => x.nome === it.nome);
    return e?.coordenadas?.x != null
      ? { x: e.coordenadas.x, y: e.coordenadas.y }
      : null;
  };
  const pontosLinha = (sequencia || [])
    .map((it) => coordDe(it))
    .filter(Boolean);

  // Detecta "sequência estranha": ângulo agudo (< 60°) em algum vértice interno,
  // indicando que a ordem vai-e-volta no espaço (não é um alinhamento limpo).
  const sequenciaEstranha = (() => {
    if (pontosLinha.length < 3) return false;
    for (let i = 1; i < pontosLinha.length - 1; i++) {
      const a = pontosLinha[i - 1];
      const b = pontosLinha[i];
      const c = pontosLinha[i + 1];
      const v1x = a.x - b.x,
        v1y = a.y - b.y;
      const v2x = c.x - b.x,
        v2y = c.y - b.y;
      const n1 = Math.hypot(v1x, v1y),
        n2 = Math.hypot(v2x, v2y);
      if (n1 < 1e-6 || n2 < 1e-6) continue;
      const cos = (v1x * v2x + v1y * v2y) / (n1 * n2);
      const ang = (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
      if (ang < 60) return true; // curva fechada → ordem espacialmente estranha
    }
    return false;
  })();

  if (!escala) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-slate-500 p-4 text-center">
        Nenhum furo ou estaca com coordenadas (x, y). Cadastre coordenadas na
        Aba 2 (sondagens) e Aba 5 (estacas).
      </div>
    );
  }

  const renderPonto = (p, tipo) => {
    const ordem = ordemDe(tipo, p.nome);
    const sel = ordem > 0;
    const cx = escala.px(p.x);
    const cy = escala.py(p.y);
    const corBase = tipo === 'furo' ? COR_FURO : COR_ESTACA;
    const cor = sel ? COR_SEL : corBase;

    // Lateralidade do rótulo (pedido do usuário): estaca → à ESQUERDA do ícone;
    // furo → à DIREITA. Além de organizar, reduz sobreposição quando um furo e
    // uma estaca caem em coordenadas próximas (ex.: SPT-05/E-01 no Balsas).
    const ehFuro = tipo === 'furo';
    const labelX = ehFuro ? cx + 11 : cx - 11;
    const labelAnchor = ehFuro ? 'start' : 'end';
    // Badge de ordem no lado OPOSTO ao rótulo, para não colidir com o texto.
    const badgeX = ehFuro ? cx - 11 : cx + 11;

    return (
      <g
        key={tipo + ':' + p.nome}
        style={{ cursor: 'pointer' }}
        onClick={() => onToggle(tipo, p.nome)}
      >
        {tipo === 'furo' ? (
          // Triângulo para furo (maior, para legibilidade após compressão)
          <polygon
            points={`${cx},${cy - 11} ${cx - 9},${cy + 8} ${cx + 9},${cy + 8}`}
            fill={cor}
            stroke="white"
            strokeWidth="1.5"
          />
        ) : (
          // Losango para estaca (maior)
          <rect
            x={cx - 9}
            y={cy - 9}
            width="18"
            height="18"
            transform={`rotate(45, ${cx}, ${cy})`}
            fill={cor}
            stroke="white"
            strokeWidth="1.5"
          />
        )}
        {/* Número de ordem (se selecionado) — no lado oposto ao rótulo */}
        {sel && (
          <>
            <circle cx={badgeX} cy={cy - 11} r="9" fill={COR_SEL} stroke="white" strokeWidth="1.5" />
            <text
              x={badgeX}
              y={cy - 7}
              textAnchor="middle"
              fontSize="12"
              fontWeight="bold"
              fill="white"
            >
              {ordem}
            </text>
          </>
        )}
        {/* Nome — lateralizado (estaca à esquerda, furo à direita), centrado
            verticalmente no ícone */}
        <text
          x={labelX}
          y={cy + 4}
          textAnchor={labelAnchor}
          fontSize="13"
          fontWeight="500"
          fill="#334155"
        >
          {p.nome}
        </text>
      </g>
    );
  };

  return (
    <div className="flex flex-col">
      <div className="w-full">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', height: 'auto', display: 'block' }}
        >
          <rect x="0" y="0" width={W} height={H} fill="#F8FAFC" rx="4" />
          {/* CP-13e (#7) — polilinha do corte A–A' na ordem da sequência */}
          {pontosLinha.length >= 2 && (
            <>
              <polyline
                points={pontosLinha
                  .map((p) => `${escala.px(p.x)},${escala.py(p.y)}`)
                  .join(' ')}
                fill="none"
                stroke={sequenciaEstranha ? '#DC2626' : '#0EA5E9'}
                strokeWidth="1.5"
                strokeDasharray="5 3"
                opacity="0.8"
              />
              {/* Rótulos A e A' nas pontas */}
              <text
                x={escala.px(pontosLinha[0].x) - 8}
                y={escala.py(pontosLinha[0].y) - 8}
                fontSize="11"
                fontWeight="bold"
                fill="#0369A1"
              >
                A
              </text>
              <text
                x={escala.px(pontosLinha[pontosLinha.length - 1].x) + 6}
                y={escala.py(pontosLinha[pontosLinha.length - 1].y) - 8}
                fontSize="11"
                fontWeight="bold"
                fill="#0369A1"
              >
                A'
              </text>
            </>
          )}
          {furos.map((p) => renderPonto(p, 'furo'))}
          {ests.map((p) => renderPonto(p, 'estaca'))}
        </svg>
      </div>
      <div className="mt-4 flex items-center gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span
            className="inline-block w-0 h-0"
            style={{
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderBottom: '7px solid ' + COR_FURO,
            }}
          />
          furo
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block w-2.5 h-2.5"
            style={{ background: COR_ESTACA, transform: 'rotate(45deg)' }}
          />
          estaca
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: COR_SEL }} />
          na sequência
        </span>
        {semCoord > 0 && (
          <span className="text-amber-600 ml-auto">
            {semCoord} sem coordenadas
          </span>
        )}
      </div>
      {/* CP-13e (#7) — alerta de sequência espacialmente estranha */}
      {sequenciaEstranha && (
        <div className="mt-1 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
          ⚠ A linha do corte (A–A') faz curvas fechadas — a ordem da sequência
          pode não corresponder a um alinhamento espacial coerente. Revise a
          ordem dos itens.
        </div>
      )}
    </div>
  );
}
