/* ============================================================================
 * CurvaQxCotaSVG — curva Q_adm × cota de ponta
 *
 * Plota duas curvas (DQ azul sólida, AV verde tracejada) de Q_adm em função
 * da cota de ponta, com linha vertical vermelha da carga prevista.
 *
 * Eixos: X = Q_adm (tf, crescente), Y = cota de ponta (m, descendente).
 *
 * Extraído idêntico das linhas 6700-6818 do geospt_app.jsx.
 * ============================================================================ */

import React from 'react';

export default function CurvaQxCotaSVG({ dq, av, estaca }) {
  const memDq = dq?.memorial || [];
  const memAv = av?.memorial || [];
  if (memDq.length === 0 && memAv.length === 0) return null;

  const W = 720,
    H = 320;
  const padL = 50,
    padR = 16,
    padT = 18,
    padB = 36;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const todasCotas = [
    ...memDq.map((m) => m.cotaPonta_m),
    ...memAv.map((m) => m.cotaPonta_m),
  ];
  const todasQ = [
    ...memDq.map((m) => m.Qadm_final_tf).filter((v) => v != null),
    ...memAv.map((m) => m.Qadm_final_tf).filter((v) => v != null),
  ];
  if (todasCotas.length === 0 || todasQ.length === 0) return null;

  const cotaMin = Math.min(...todasCotas);
  const cotaMax = Math.max(...todasCotas);
  const qMax = Math.max(...todasQ, estaca.cargaPrevista_tf ?? 0) * 1.1;

  const xScale = (q) => padL + (q / qMax) * plotW;
  const yScale = (c) =>
    padT + ((cotaMax - c) / (cotaMax - cotaMin || 1)) * plotH;

  const pathStr = (mem) =>
    mem
      .filter((m) => m.Qadm_final_tf != null)
      .map(
        (m, i) =>
          (i === 0 ? 'M' : 'L') +
          xScale(m.Qadm_final_tf) +
          ' ' +
          yScale(m.cotaPonta_m)
      )
      .join(' ');

  const yTicks = [];
  const stepY = Math.max(1, Math.ceil((cotaMax - cotaMin) / 8));
  for (let c = Math.ceil(cotaMin); c <= cotaMax; c += stepY) yTicks.push(c);

  const xTicks = [];
  const stepX = qMax > 100 ? 20 : qMax > 50 ? 10 : qMax > 20 ? 5 : 2;
  for (let q = 0; q <= qMax; q += stepX) xTicks.push(q);

  return (
    <div className="bg-white border border-slate-300 rounded p-2 mb-3">
      <div className="text-xs font-bold text-slate-700 mb-1 px-1">
        Curva Q_adm × cota de ponta (tf × m)
      </div>
      <svg
        viewBox={'0 0 ' + W + ' ' + H}
        className="w-full"
        style={{ maxHeight: '340px' }}
      >
        {xTicks.map((t) => (
          <line
            key={'gx' + t}
            x1={xScale(t)}
            x2={xScale(t)}
            y1={padT}
            y2={padT + plotH}
            stroke="#E2E8F0"
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
          />
        ))}
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
          y={H - 4}
          textAnchor="middle"
          fontSize="10"
          fill="#334155"
          fontWeight="bold"
        >
          Q_adm (tf)
        </text>
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
          x={12}
          y={padT + plotH / 2}
          textAnchor="middle"
          fontSize="10"
          fill="#334155"
          fontWeight="bold"
          transform={'rotate(-90, 12, ' + (padT + plotH / 2) + ')'}
        >
          Cota ponta (m)
        </text>

        {estaca.cargaPrevista_tf != null && estaca.cargaPrevista_tf > 0 && (
          <g>
            <line
              x1={xScale(estaca.cargaPrevista_tf)}
              x2={xScale(estaca.cargaPrevista_tf)}
              y1={padT}
              y2={padT + plotH}
              stroke="#DC2626"
              strokeWidth="1"
              strokeDasharray="5 3"
            />
            <text
              x={xScale(estaca.cargaPrevista_tf) + 3}
              y={padT + 10}
              fontSize="9"
              fill="#DC2626"
              fontWeight="bold"
            >
              Carga prevista ({estaca.cargaPrevista_tf} tf)
            </text>
          </g>
        )}

        {memDq.length > 1 && (
          <path d={pathStr(memDq)} fill="none" stroke="#2563EB" strokeWidth="2" />
        )}
        {memDq
          .filter((m) => m.Qadm_final_tf != null)
          .map((m, i) => (
            <circle
              key={'dq' + i}
              cx={xScale(m.Qadm_final_tf)}
              cy={yScale(m.cotaPonta_m)}
              r="2.5"
              fill="#2563EB"
            >
              <title>
                DQ ponta {m.cotaPonta_m}m: {m.Qadm_final_tf.toFixed(2)} tf (
                {m.rege})
              </title>
            </circle>
          ))}
        {memAv.length > 1 && (
          <path
            d={pathStr(memAv)}
            fill="none"
            stroke="#16A34A"
            strokeWidth="2"
            strokeDasharray="4 2"
          />
        )}
        {memAv
          .filter((m) => m.Qadm_final_tf != null)
          .map((m, i) => (
            <circle
              key={'av' + i}
              cx={xScale(m.Qadm_final_tf)}
              cy={yScale(m.cotaPonta_m)}
              r="2.5"
              fill="#16A34A"
            >
              <title>
                AV ponta {m.cotaPonta_m}m: {m.Qadm_final_tf.toFixed(2)} tf (
                {m.rege})
              </title>
            </circle>
          ))}

        <g transform={'translate(' + (padL + plotW - 130) + ', ' + (padT + 6) + ')'}>
          <rect
            x="-2"
            y="-2"
            width="128"
            height="44"
            fill="white"
            fillOpacity="0.9"
            stroke="#CBD5E1"
            strokeWidth="0.5"
            rx="2"
          />
          <line x1="0" y1="6" x2="14" y2="6" stroke="#2563EB" strokeWidth="2" />
          <text x="18" y="9" fontSize="9" fill="#334155">
            Décourt-Quaresma
          </text>
          <line
            x1="0"
            y1="20"
            x2="14"
            y2="20"
            stroke="#16A34A"
            strokeWidth="2"
            strokeDasharray="4 2"
          />
          <text x="18" y="23" fontSize="9" fill="#334155">
            Aoki-Velloso
          </text>
          <line
            x1="0"
            y1="34"
            x2="14"
            y2="34"
            stroke="#DC2626"
            strokeWidth="1"
            strokeDasharray="5 3"
          />
          <text x="18" y="37" fontSize="9" fill="#334155">
            Carga prev.
          </text>
        </g>
      </svg>
    </div>
  );
}
