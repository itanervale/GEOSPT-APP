/* ============================================================================
 * DiagramaTransferenciaSVG — desenho vertical da estaca + curva N(z) + curva σ(z),
 * compartilhando o MESMO eixo de profundidade/cota (z cresce para baixo).
 *
 * Recebe um "pacote de cenário" (montarCenario) já calculado pelos helpers PUROS.
 * Não faz cálculo geotécnico — só plota. Engine intocada.
 *
 * CP-15c (correções pós-revisão):
 *   - Identificação da estaca em LINHA SIMPLES ao lado do desenho
 *     (E-01 · Hélice Contínua · Ø40cm · L=14m) — substitui o bloco-tabela.
 *   - RENDERIZAÇÃO DEFENSIVA: qualquer N/σ/posição não-finita é descartada da
 *     série e dos rótulos (nunca desenha "NaN"). Se a série útil ficar vazia,
 *     mostra aviso em vez de eixos quebrados.
 *   - Cota dupla (absoluta │ relativa) e rótulos por metro mantidos.
 *   - Altura dinâmica (scroll no modal para estacas longas).
 * ============================================================================ */

import React from 'react';
import { kNparaTf } from './transferenciaHelpers';
import { formatoDe, dimensaoDe, labelTipoEstaca } from '@/domain/estacas';

const LEFT = 12;
const COL_EIXO = 46;
const COL_ID = 26; // faixa vertical estreita p/ a identificação (ao lado da estaca)
const COL_ESTACA = 84;
const COL_N = 320;
const COL_SIGMA = 320;
const GAP = 26;

const TOP = 56;
const BOT = 52;
const PX_POR_METRO = 30;
const ALTURA_MIN = 360;

const COR = {
  DQ: { forte: '#1d4ed8', claro: '#bfdbfe', bgCurva: 'rgba(29,78,216,0.10)' },
  AV: { forte: '#15803d', claro: '#bbf7d0', bgCurva: 'rgba(21,128,61,0.10)' },
};

const finito = (v) => typeof v === 'number' && Number.isFinite(v);

export default function DiagramaTransferenciaSVG({
  info,
  pacote,
  estaca,
  naProf_m = null,
  metodo = 'DQ',
  sigmaLimite_MPa = null,
  sigmaLimiteRotulo = 'σ_e',
}) {
  if (!info || !pacote || !pacote.ok || !pacote.serie || pacote.serie.length === 0) {
    return null;
  }
  const cor = COR[metodo] || COR.DQ;

  // RENDERIZAÇÃO DEFENSIVA: só pontos com cota, N e σ finitos.
  const serie = pacote.serie.filter(
    (p) => finito(p.cota) && finito(p.N_kN) && finito(p.sigma_MPa)
  );

  // Geometria horizontal
  const x0Eixo = LEFT;
  const x0Id = x0Eixo + COL_EIXO;
  const x0Estaca = x0Id + COL_ID;
  const x0N = x0Estaca + COL_ESTACA + GAP;
  const x0Sigma = x0N + COL_N + GAP;
  const W = x0Sigma + COL_SIGMA + 110; // folga p/ rótulos de σ no extremo direito

  const cotaArrOk = finito(info.cotaArr) ? info.cotaArr : 0;
  const cotaPontaOk = finito(info.cotaPonta) ? info.cotaPonta : cotaArrOk - 1;
  const zMax = Math.max(cotaArrOk - cotaPontaOk, 1);
  const alturaUtil = Math.max(ALTURA_MIN, zMax * PX_POR_METRO);
  const H = TOP + alturaUtil + BOT;
  const yTop = TOP;
  const yBot = TOP + alturaUtil;
  const yDeZ = (z) => yTop + (z / zMax) * (yBot - yTop);
  const yDeCota = (cota) => yDeZ(cotaArrOk - cota);

  const formato = formatoDe(estaca);
  const dim_m = dimensaoDe(estaca) || 0.4;
  const larguraEstacaPx = Math.min(52, Math.max(24, dim_m * 80));
  const xEstacaCentro = x0Estaca + COL_ESTACA / 2;
  const xEstacaEsq = xEstacaCentro - larguraEstacaPx / 2;

  // Identificação em linha simples
  const idTexto =
    `${estaca?.nome || '—'} · ` +
    `${labelTipoEstaca(estaca?.tipoEstaca) || estaca?.tipoEstaca || '—'} · ` +
    `${formato === 'quadrada' ? '□' : 'Ø'}${Math.round(dim_m * 100)}cm · ` +
    `L=${zMax}m`;

  // Se a série útil ficou vazia (dados inconsistentes), avisa em vez de quebrar.
  if (serie.length < 2) {
    return (
      <svg viewBox={`0 0 ${W} 220`} width={W} height={220} xmlns="http://www.w3.org/2000/svg">
        <text x={W / 2} y={90} textAnchor="middle" fontSize="13" fontWeight="bold" fill="#b45309">
          Não foi possível traçar as curvas para esta estaca.
        </text>
        <text x={W / 2} y={114} textAnchor="middle" fontSize="11" fill="#92400e">
          Os valores de N(z)/σ(z) resultaram inconsistentes (dados de cálculo incompletos nesta cota).
        </text>
        <text x={W / 2} y={138} textAnchor="middle" fontSize="11" fill="#64748b">
          Verifique o memorial desta estaca na Aba 6 e as sondagens que cobrem o fuste.
        </text>
      </svg>
    );
  }

  const Nmax = Math.max(...serie.map((p) => p.N_kN), 1);
  const finitoLimite = typeof sigmaLimite_MPa === 'number' && Number.isFinite(sigmaLimite_MPa) && sigmaLimite_MPa > 0;
  // A escala de σ inclui o limite, para a linha-limite caber mesmo quando a curva
  // não o atinge (ou quando o ultrapassa muito).
  const sigMax = Math.max(
    ...serie.map((p) => p.sigma_MPa),
    finitoLimite ? sigmaLimite_MPa : 0,
    0.001
  );
  const xDeN = (N) => x0N + (N / Nmax) * COL_N;
  const xDeSigma = (s) => x0Sigma + (s / sigMax) * COL_SIGMA;

  const pathDe = (pts, xFn, vKey) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFn(p[vKey]).toFixed(1)} ${yDeCota(p.cota).toFixed(1)}`).join(' ');
  const pathN = pathDe(serie, (v) => xDeN(v), 'N_kN');
  const pathSigma = pathDe(serie, (v) => xDeSigma(v), 'sigma_MPa');

  // CP-16 — segmentos da curva σ: vermelho onde σ(z) > limite, normal abaixo.
  // Constrói sub-paths consecutivos por faixa, inserindo o ponto de cruzamento
  // exato com a linha-limite para a transição de cor não "pular".
  const COR_EXCEDE = '#dc2626';
  const segmentosSigma = (() => {
    if (!finitoLimite) return [{ acima: false, d: pathSigma }];
    const segs = [];
    let atual = null;
    const yInterp = (a, b) => {
      // cota onde σ cruza o limite, interpolando linearmente entre a e b
      const t = (sigmaLimite_MPa - a.sigma_MPa) / (b.sigma_MPa - a.sigma_MPa);
      return a.cota + t * (b.cota - a.cota);
    };
    const ptStr = (cota, sigma) => `${xDeSigma(sigma).toFixed(1)} ${yDeCota(cota).toFixed(1)}`;
    for (let i = 0; i < serie.length; i++) {
      const p = serie[i];
      const acima = p.sigma_MPa > sigmaLimite_MPa + 1e-9;
      if (atual == null) {
        atual = { acima, pts: [ptStr(p.cota, p.sigma_MPa)] };
      } else if (acima === atual.acima) {
        atual.pts.push(ptStr(p.cota, p.sigma_MPa));
      } else {
        // cruzou o limite entre o ponto anterior e este → ponto de cruzamento
        const ant = serie[i - 1];
        const cotaCruz = yInterp(ant, p);
        const cruzStr = ptStr(cotaCruz, sigmaLimite_MPa);
        atual.pts.push(cruzStr);
        segs.push({ acima: atual.acima, d: 'M ' + atual.pts.join(' L ') });
        atual = { acima, pts: [cruzStr, ptStr(p.cota, p.sigma_MPa)] };
      }
    }
    if (atual) segs.push({ acima: atual.acima, d: 'M ' + atual.pts.join(' L ') });
    return segs;
  })();
  const areaN =
    `M ${x0N} ${yDeCota(serie[0].cota).toFixed(1)} ` +
    serie.map((p) => `L ${xDeN(p.N_kN).toFixed(1)} ${yDeCota(p.cota).toFixed(1)}`).join(' ') +
    ` L ${x0N} ${yDeCota(serie[serie.length - 1].cota).toFixed(1)} Z`;

  const cotasInteiras = [];
  for (let c = Math.ceil(cotaPontaOk); c <= Math.floor(cotaArrOk); c++) cotasInteiras.push(c);

  const valorNaCota = (cota) => {
    let best = null, dist = Infinity;
    for (const p of serie) {
      const d = Math.abs(p.cota - cota);
      if (d < dist) { dist = d; best = p; }
    }
    return best;
  };

  const N_topo = serie[0];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ maxWidth: 'none' }} xmlns="http://www.w3.org/2000/svg">
      <text x={xEstacaCentro} y={26} textAnchor="middle" fontSize="13" fontWeight="bold" fill="#334155">Estaca</text>
      <text x={x0N + COL_N / 2} y={26} textAnchor="middle" fontSize="13" fontWeight="bold" fill="#334155">Esforço normal N(z)</text>
      <text x={x0Sigma + COL_SIGMA / 2} y={26} textAnchor="middle" fontSize="13" fontWeight="bold" fill="#334155">Tensão axial σ(z)</text>

      {/* ===== IDENTIFICAÇÃO (linha simples, vertical, colada à estaca) ===== */}
      <g>
        <text
          x={x0Id + COL_ID / 2 + 3}
          y={(yTop + yBot) / 2}
          fontSize="10.5"
          fontWeight="bold"
          fill={cor.forte}
          transform={`rotate(-90 ${x0Id + COL_ID / 2 + 3} ${(yTop + yBot) / 2})`}
          textAnchor="middle"
        >
          {idTexto}
        </text>
      </g>

      {/* ===== EIXO Y — COTA DUPLA ===== */}
      <g>
        <text x={x0Eixo + 2} y={yTop - 6} fontSize="7.5" fill="#94a3b8">abs.</text>
        <text x={x0Eixo + COL_EIXO - 2} y={yTop - 6} textAnchor="end" fontSize="7.5" fill="#94a3b8">rel.</text>
        <line x1={x0Eixo + COL_EIXO / 2} y1={yTop} x2={x0Eixo + COL_EIXO / 2} y2={yBot} stroke="#e2e8f0" strokeWidth="1" />
        {cotasInteiras.map((c) => {
          const y = yDeCota(c);
          const rel = cotaArrOk - c;
          return (
            <g key={c}>
              <line x1={x0Estaca} y1={y} x2={x0Sigma + COL_SIGMA} y2={y} stroke="#eef2f7" strokeWidth="1" />
              <text x={x0Eixo + COL_EIXO / 2 - 3} y={y + 3} textAnchor="end" fontSize="9" fill="#475569">{c}</text>
              <text x={x0Eixo + COL_EIXO - 2} y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8">{rel}</text>
            </g>
          );
        })}
      </g>

      {/* ===== PAINEL 1 — DESENHO DA ESTACA ===== */}
      <g>
        <rect x={xEstacaEsq} y={yDeCota(cotaArrOk)} width={larguraEstacaPx} height={yDeCota(cotaPontaOk) - yDeCota(cotaArrOk)} fill={cor.claro} stroke={cor.forte} strokeWidth="1.5" />
        {formato === 'quadrada' ? (
          <line x1={xEstacaEsq} y1={yDeCota(cotaArrOk)} x2={xEstacaEsq + larguraEstacaPx} y2={yDeCota(cotaArrOk)} stroke={cor.forte} strokeWidth="1.5" />
        ) : (
          <ellipse cx={xEstacaCentro} cy={yDeCota(cotaArrOk)} rx={larguraEstacaPx / 2} ry={4} fill={cor.claro} stroke={cor.forte} strokeWidth="1.5" />
        )}
        <path d={`M ${xEstacaEsq} ${yDeCota(cotaPontaOk)} L ${xEstacaCentro} ${yDeCota(cotaPontaOk) + 12} L ${xEstacaEsq + larguraEstacaPx} ${yDeCota(cotaPontaOk)} Z`} fill={cor.claro} stroke={cor.forte} strokeWidth="1.5" />
        {/* Topo do solo (quando o fuste tem trecho de aterro acima das sondagens):
            acima desta linha o atrito é nulo e N(z) permanece constante. */}
        {finito(info.cotaTopoSolo) && info.cotaTopoSolo < cotaArrOk - 0.01 && (
          <g>
            <line x1={xEstacaEsq - 8} y1={yDeCota(info.cotaTopoSolo)} x2={x0Sigma + COL_SIGMA} y2={yDeCota(info.cotaTopoSolo)} stroke="#a16207" strokeWidth="1" strokeDasharray="2 2" />
            <text x={xEstacaEsq - 10} y={yDeCota(info.cotaTopoSolo) - 2} textAnchor="end" fontSize="7.5" fill="#a16207">topo do solo</text>
          </g>
        )}
        {finito(naProf_m) && naProf_m >= 0 && naProf_m <= zMax && (
          <g>
            <line x1={xEstacaEsq - 6} y1={yDeZ(naProf_m)} x2={xEstacaEsq + larguraEstacaPx + 6} y2={yDeZ(naProf_m)} stroke="#0ea5e9" strokeWidth="1" strokeDasharray="4 2" />
            <text x={xEstacaEsq + larguraEstacaPx + 8} y={yDeZ(naProf_m) - 2} fontSize="8" fill="#0ea5e9">▽ NA</text>
          </g>
        )}
      </g>

      {/* ===== PAINEL 2 — N(z) ===== */}
      <g>
        <line x1={x0N} y1={yTop} x2={x0N} y2={yBot} stroke="#cbd5e1" strokeWidth="1" />
        <path d={areaN} fill={cor.bgCurva} />
        <path d={pathN} fill="none" stroke={cor.forte} strokeWidth="2" />
        {pacote.usaModelo && pacote.modelo === 'A' && finito(pacote.pontoB_cota) && pacote.pontoB_cota > cotaPontaOk && (
          <g>
            <line x1={x0N} y1={yDeCota(pacote.pontoB_cota)} x2={x0N + COL_N} y2={yDeCota(pacote.pontoB_cota)} stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 2" />
            <text x={x0N + COL_N - 2} y={yDeCota(pacote.pontoB_cota) - 2} textAnchor="end" fontSize="8" fill="#b45309">ponto B (atrito esgota)</text>
          </g>
        )}
        {cotasInteiras.map((c) => {
          const p = valorNaCota(c);
          if (!p) return null;
          return (
            <g key={c}>
              <circle cx={xDeN(p.N_kN)} cy={yDeCota(c)} r="2.4" fill={cor.forte} />
              <text x={xDeN(p.N_kN) + 5} y={yDeCota(c) + 3} fontSize="8.5" fill="#334155">{kNparaTf(p.N_kN).toFixed(1)}</text>
            </g>
          );
        })}
        <text x={xDeN(N_topo.N_kN) + 5} y={yDeCota(N_topo.cota) - 5} fontSize="9" fontWeight="bold" fill={cor.forte}>P = {kNparaTf(N_topo.N_kN).toFixed(1)} tf</text>
        {[0, 0.5, 1].map((f) => (
          <text key={f} x={xDeN(Nmax * f)} y={yBot + 14} textAnchor="middle" fontSize="8" fill="#94a3b8">{kNparaTf(Nmax * f).toFixed(0)}</text>
        ))}
        <text x={x0N + COL_N / 2} y={yBot + 30} textAnchor="middle" fontSize="9" fill="#64748b">carga (tf)</text>
      </g>

      {/* ===== PAINEL 3 — σ(z) ===== */}
      <g>
        <line x1={x0Sigma} y1={yTop} x2={x0Sigma} y2={yBot} stroke="#cbd5e1" strokeWidth="1" />

        {/* Linha-limite vertical (σ_e no serviço; σ_e×FS no estado-limite último) */}
        {finitoLimite && (
          <g>
            <line
              x1={xDeSigma(sigmaLimite_MPa)}
              y1={yTop - 16}
              x2={xDeSigma(sigmaLimite_MPa)}
              y2={yBot}
              stroke={COR_EXCEDE}
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
            <text
              x={xDeSigma(sigmaLimite_MPa)}
              y={yTop - 20}
              textAnchor="middle"
              fontSize="8.5"
              fontWeight="bold"
              fill={COR_EXCEDE}
            >
              {sigmaLimiteRotulo} = {sigmaLimite_MPa.toFixed(1)}
            </text>
          </g>
        )}

        {/* Curva σ(z) em segmentos: vermelho onde excede o limite */}
        {segmentosSigma.map((seg, i) => (
          <path
            key={i}
            d={seg.d}
            fill="none"
            stroke={seg.acima ? COR_EXCEDE : cor.forte}
            strokeWidth={seg.acima ? 2.5 : 2}
            strokeDasharray="5 3"
          />
        ))}

        {cotasInteiras.map((c) => {
          const p = valorNaCota(c);
          if (!p) return null;
          const excede = finitoLimite && p.sigma_MPa > sigmaLimite_MPa + 1e-9;
          return (
            <g key={c}>
              <circle cx={xDeSigma(p.sigma_MPa)} cy={yDeCota(c)} r="2.4" fill={excede ? COR_EXCEDE : cor.forte} />
              <text x={xDeSigma(p.sigma_MPa) + 5} y={yDeCota(c) + 3} fontSize="8.5" fontWeight={excede ? 'bold' : 'normal'} fill={excede ? COR_EXCEDE : '#334155'}>{p.sigma_MPa.toFixed(2)}</text>
            </g>
          );
        })}
        {(() => {
          const xσ = xDeSigma(serie[0].sigma_MPa);
          const perto = xσ > x0Sigma + COL_SIGMA - 60;
          return (
            <text
              x={perto ? xσ - 5 : xσ + 5}
              y={yDeCota(serie[0].cota) - 5}
              textAnchor={perto ? 'end' : 'start'}
              fontSize="9"
              fontWeight="bold"
              fill={cor.forte}
            >
              σ_topo = {serie[0].sigma_MPa.toFixed(2)} MPa
            </text>
          );
        })()}
        {[0, 0.5, 1].map((f) => (
          <text key={f} x={xDeSigma(sigMax * f)} y={yBot + 14} textAnchor="middle" fontSize="8" fill="#94a3b8">{(sigMax * f).toFixed(1)}</text>
        ))}
        <text x={x0Sigma + COL_SIGMA / 2} y={yBot + 30} textAnchor="middle" fontSize="9" fill="#64748b">tensão (MPa)</text>
      </g>
    </svg>
  );
}
