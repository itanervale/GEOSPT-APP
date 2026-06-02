/* ============================================================================
 * PerfilCompatibilizadoSVG — perfil da compatibilização
 *
 * Mostra:
 *   - Faixas verticais por família predominante de cada cota
 *   - Curva NSPT da envoltória inferior (vermelha cheia)
 *   - Curvas de média por família, quando aplicável (azul/roxo/âmbar tracejadas)
 *   - ★ em pontos impenetráveis
 *
 * Consome o RESULTADO da compatibilização (engine.compatibilizar). É diferente
 * do PerfilGeotecnicoSVG (que consome leituras brutas de 1 furo).
 *
 * Extraído idêntico do PerfilGeotecnicoSVG das linhas 4193-4378 do
 * geospt_app.jsx (artifact original) — apenas renomeado para clareza.
 * ============================================================================ */

import React from 'react';

export default function PerfilCompatibilizadoSVG({ resultados }) {
  if (!resultados || resultados.length === 0) {
    return <div className="text-xs text-slate-500 p-2">Sem dados.</div>;
  }

  // Dimensões do SVG
  const W = 280,
    H = 460;
  const padL = 38,
    padR = 8,
    padT = 16,
    padB = 90;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  // Eixos: Y = cota (descendente), X = NSPT (0–50)
  const cotas = resultados.map((r) => r.cotaRef_m);
  const cotaMax = Math.max(...cotas);
  const cotaMin = Math.min(...cotas);
  const nsptMax = 50;

  const xScale = (n) => padL + (n / nsptMax) * plotW;
  const yScale = (c) =>
    padT + ((cotaMax - c) / (cotaMax - cotaMin || 1)) * plotH;

  // Pontos da envoltória
  const ptsEnv = resultados
    .filter((r) => r.envoltoria.nspt !== null)
    .map((r) => ({
      n: r.envoltoria.nspt,
      c: r.cotaRef_m,
      imp: r.envoltoria.impenetravel,
    }));

  // Médias por família (a partir da v2.0.4 considera 3 famílias)
  const ptsMediaCoesivo = resultados
    .map((r) => {
      if (
        !r.heterogeneo &&
        r.familiaPred === 'Coesivo' &&
        r.media.familiaPredominante !== null &&
        r.media.familiaPredominante !== undefined
      )
        return { n: r.media.familiaPredominante, c: r.cotaRef_m };
      if (r.heterogeneo && r.media.coesivo !== null && r.media.coesivo !== undefined)
        return { n: r.media.coesivo, c: r.cotaRef_m };
      return null;
    })
    .filter((p) => p !== null);

  const ptsMediaGranular = resultados
    .map((r) => {
      if (
        !r.heterogeneo &&
        r.familiaPred === 'Granular' &&
        r.media.familiaPredominante !== null &&
        r.media.familiaPredominante !== undefined
      )
        return { n: r.media.familiaPredominante, c: r.cotaRef_m };
      if (
        r.heterogeneo &&
        r.media.granular !== null &&
        r.media.granular !== undefined
      )
        return { n: r.media.granular, c: r.cotaRef_m };
      return null;
    })
    .filter((p) => p !== null);

  const ptsMediaIntermediario = resultados
    .map((r) => {
      if (
        !r.heterogeneo &&
        r.familiaPred === 'Intermediário' &&
        r.media.familiaPredominante !== null &&
        r.media.familiaPredominante !== undefined
      )
        return { n: r.media.familiaPredominante, c: r.cotaRef_m };
      if (
        r.heterogeneo &&
        r.media.intermediario !== null &&
        r.media.intermediario !== undefined
      )
        return { n: r.media.intermediario, c: r.cotaRef_m };
      return null;
    })
    .filter((p) => p !== null);

  const pathStr = (pts) =>
    pts.map((p, i) => (i === 0 ? 'M' : 'L') + xScale(p.n) + ' ' + yScale(p.c)).join(' ');

  // Faixas verticais coloridas por família (à esquerda)
  const faixaW = 12;
  const faixas = resultados.map((r, i) => {
    const cor = r.heterogeneo
      ? '#FCD34D' // amber-300
      : r.familiaPred === 'Coesivo'
      ? '#DBEAFE' // blue-100
      : r.familiaPred === 'Granular'
      ? '#FEF3C7' // yellow-100
      : r.familiaPred === 'Intermediário'
      ? '#EDE9FE' // purple-100
      : '#F1F5F9'; // slate-100
    const yTopo = yScale(r.cotaRef_m + 0.5);
    const yBase = yScale(r.cotaRef_m - 0.5);
    return (
      <rect
        key={i}
        x={padL - faixaW - 2}
        y={yTopo}
        width={faixaW}
        height={Math.max(2, yBase - yTopo)}
        fill={cor}
      />
    );
  });

  // Ticks Y (cotas)
  const yTicks = [];
  for (let c = Math.ceil(cotaMin); c <= cotaMax; c++) {
    if (cotaMax - cotaMin > 30 && c % 2 !== 0) continue;
    yTicks.push(c);
  }
  const xTicks = [0, 10, 20, 30, 40, 50];

  return (
    <svg viewBox={'0 0 ' + W + ' ' + H} className="w-full" style={{ maxHeight: '450px' }}>
      {/* Grid */}
      {xTicks.map((t) => (
        <line
          key={'gx' + t}
          x1={xScale(t)}
          x2={xScale(t)}
          y1={padT}
          y2={padT + plotH}
          stroke="#E2E8F0"
          strokeWidth="1"
        />
      ))}
      {yTicks.map((c) => (
        <line
          key={'gy' + c}
          x1={padL}
          x2={padL + plotW}
          y1={yScale(c)}
          y2={yScale(c)}
          stroke="#E2E8F0"
          strokeWidth="1"
        />
      ))}

      {/* Faixas de família */}
      {faixas}

      {/* Eixos */}
      <line
        x1={padL}
        y1={padT}
        x2={padL}
        y2={padT + plotH}
        stroke="#475569"
        strokeWidth="1.5"
      />
      <line
        x1={padL}
        y1={padT + plotH}
        x2={padL + plotW}
        y2={padT + plotH}
        stroke="#475569"
        strokeWidth="1.5"
      />

      {/* Ticks X (NSPT) */}
      {xTicks.map((t) => (
        <g key={'tx' + t}>
          <line
            x1={xScale(t)}
            y1={padT + plotH}
            x2={xScale(t)}
            y2={padT + plotH + 4}
            stroke="#475569"
          />
          <text
            x={xScale(t)}
            y={padT + plotH + 14}
            textAnchor="middle"
            fontSize="9"
            fill="#475569"
          >
            {t}
          </text>
        </g>
      ))}
      <text
        x={padL + plotW / 2}
        y={padT + plotH + 28}
        textAnchor="middle"
        fontSize="10"
        fill="#334155"
        fontWeight="bold"
      >
        NSPT
      </text>

      {/* Ticks Y (cota) */}
      {yTicks.map((c) => (
        <g key={'ty' + c}>
          <line
            x1={padL - 4}
            y1={yScale(c)}
            x2={padL}
            y2={yScale(c)}
            stroke="#475569"
          />
          <text
            x={padL - 6}
            y={yScale(c) + 3}
            textAnchor="end"
            fontSize="9"
            fill="#475569"
          >
            {c}
          </text>
        </g>
      ))}
      <text
        x={10}
        y={padT + plotH / 2}
        textAnchor="middle"
        fontSize="10"
        fill="#334155"
        fontWeight="bold"
        transform={'rotate(-90, 10, ' + (padT + plotH / 2) + ')'}
      >
        Cota (m)
      </text>

      {/* Linhas de média por família (até 3) */}
      {ptsMediaCoesivo.length > 1 && (
        <path
          d={pathStr(ptsMediaCoesivo)}
          fill="none"
          stroke="#2563EB"
          strokeWidth="1.5"
          strokeDasharray="4 2"
        />
      )}
      {ptsMediaGranular.length > 1 && (
        <path
          d={pathStr(ptsMediaGranular)}
          fill="none"
          stroke="#D97706"
          strokeWidth="1.5"
          strokeDasharray="4 2"
        />
      )}
      {ptsMediaIntermediario.length > 1 && (
        <path
          d={pathStr(ptsMediaIntermediario)}
          fill="none"
          stroke="#7C3AED"
          strokeWidth="1.5"
          strokeDasharray="4 2"
        />
      )}

      {/* Linha da envoltória (vermelha cheia) */}
      {ptsEnv.length > 1 && (
        <path d={pathStr(ptsEnv)} fill="none" stroke="#DC2626" strokeWidth="2" />
      )}

      {/* Pontos da envoltória + ★ em impenetráveis */}
      {ptsEnv.map((p, i) => (
        <g key={'pe' + i}>
          <circle cx={xScale(p.n)} cy={yScale(p.c)} r="2.5" fill="#DC2626" />
          {p.imp && (
            <text
              x={xScale(p.n) + 6}
              y={yScale(p.c) + 3}
              fontSize="11"
              fill="#B45309"
              fontWeight="bold"
            >
              ★
            </text>
          )}
        </g>
      ))}

      {/* Legenda — rodapé horizontal abaixo do gráfico (fora do plot) */}
      <g transform={'translate(' + padL + ', ' + (padT + plotH + 42) + ')'}>
        {/* Linha 1: Envoltória + Impenetrável */}
        <line x1="0" y1="0" x2="14" y2="0" stroke="#DC2626" strokeWidth="2" />
        <text x="18" y="3" fontSize="9" fill="#334155">
          Envoltória inferior
        </text>
        <text x="120" y="3" fontSize="9" fill="#B45309" fontWeight="bold">
          ★
        </text>
        <text x="130" y="3" fontSize="9" fill="#334155">
          Impenetrável
        </text>
        {/* Linha 2: médias por família */}
        <line x1="0" y1="15" x2="14" y2="15" stroke="#2563EB" strokeWidth="1.5" strokeDasharray="4 2" />
        <text x="18" y="18" fontSize="9" fill="#334155">
          Coesivo
        </text>
        <line x1="70" y1="15" x2="84" y2="15" stroke="#7C3AED" strokeWidth="1.5" strokeDasharray="4 2" />
        <text x="88" y="18" fontSize="9" fill="#334155">
          Interm.
        </text>
        <line x1="140" y1="15" x2="154" y2="15" stroke="#D97706" strokeWidth="1.5" strokeDasharray="4 2" />
        <text x="158" y="18" fontSize="9" fill="#334155">
          Granular
        </text>
        <text x="0" y="30" fontSize="8" fill="#94A3B8">
          (médias tracejadas por família)
        </text>
      </g>
    </svg>
  );
}
