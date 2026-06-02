/* ============================================================================
 * MemorialCalculo — tabela cota a cota com DQ + AV lado a lado
 *
 * Dois modos (toggle): Simples (R_l, R_p, Q_geo, Q_final, rege) e Detalhado
 * (adiciona Solo/N_p/NSPTs na ponta, C/α no DQ, K/α/F1/F2 no AV).
 * Cada linha é clicável → expande DetalhamentoLinha (passo-a-passo da cota).
 * Linha sugerida (cota conservadora) destacada em amarelo com ★.
 *
 * Extraído fielmente das linhas 6824-7014 do geospt_app.jsx. Mudanças:
 *   - text-xxs → text-[10px]
 *   - SOLO_PARA_CODIGO importado de @/domain/solos
 *   - encontrarCotaSugeridaConservadora de ./calculoHelpers
 *   - DetalhamentoLinha componente local
 * ============================================================================ */

import React, { useState } from 'react';
import { SOLO_PARA_CODIGO } from '@/domain/solos';
import { encontrarCotaSugeridaConservadora } from './calculoHelpers';
import DetalhamentoLinha from './DetalhamentoLinha';

export default function MemorialCalculo({ dq, av, estaca, compacto = false }) {
  const memDq = dq?.memorial || [];
  const memAv = av?.memorial || [];
  const [modoDetalhado, setModoDetalhado] = useState(false);
  const [linhaExpandida, setLinhaExpandida] = useState(null);

  if (memDq.length === 0 && memAv.length === 0) {
    return <div className="text-sm text-slate-500">Memorial indisponível.</div>;
  }

  const avPorCota = {};
  memAv.forEach((m) => {
    avPorCota[m.cotaPonta_m] = m;
  });

  const cargaPrev = estaca.cargaPrevista_tf;
  const sugConservadora = encontrarCotaSugeridaConservadora(
    memDq,
    memAv,
    cargaPrev
  );
  const cotaSugerida =
    sugConservadora && !sugConservadora.motivoNaoAmbos
      ? sugConservadora.cota_m
      : sugConservadora?.regente !== 'NENHUM'
        ? sugConservadora?.cota_m
        : null;

  const codigoSolo = (nomeSolo) => SOLO_PARA_CODIGO[nomeSolo] || '?';

  const f2MedioAv = (linhaAv) => {
    if (!linhaAv?.camadasAtrito || linhaAv.camadasAtrito.length === 0)
      return null;
    const camadasComF2 = linhaAv.camadasAtrito.filter((c) => c.parametros?.F2);
    if (camadasComF2.length === 0) return null;
    const f2s = [...new Set(camadasComF2.map((c) => c.parametros.F2))];
    if (f2s.length === 1) return f2s[0];
    return f2s.reduce((s, v) => s + v, 0) / f2s.length;
  };

  return (
    <div
      className={
        'bg-white border border-slate-300 rounded overflow-x-auto ' +
        (compacto ? '' : 'mb-3')
      }
    >
      <div className="px-2 py-1 bg-slate-50 border-b border-slate-300 flex items-center justify-between">
        <div className="text-xs font-bold text-slate-700">
          Memorial cota a cota — {memDq.length} cotas (DQ) × {memAv.length}{' '}
          cotas (AV)
          {cotaSugerida != null && <> · linha sugerida destacada</>}
        </div>
        <button
          onClick={() => setModoDetalhado(!modoDetalhado)}
          className="px-2 py-0.5 text-[10px] font-medium bg-slate-200 hover:bg-slate-300 text-slate-800 rounded transition-colors"
          title="Alternar entre visão simples e detalhada"
        >
          {modoDetalhado ? '📋 Simples' : '🔬 Detalhado'}
        </button>
      </div>
      <table className="w-full text-[10px]">
        <thead className="bg-slate-50 text-slate-600 uppercase tracking-wide">
          {!modoDetalhado ? (
            <>
              <tr>
                <th className="px-1.5 py-1 text-right" rowSpan="2">
                  Cota ponta (m)
                </th>
                <th className="px-1.5 py-1 text-right" rowSpan="2">
                  Prof. (m)
                </th>
                <th className="px-1.5 py-1 text-center bg-blue-50" colSpan="5">
                  Décourt-Quaresma
                </th>
                <th className="px-1.5 py-1 text-center bg-green-50" colSpan="5">
                  Aoki-Velloso
                </th>
              </tr>
              <tr className="bg-slate-100 text-slate-600">
                <th className="px-1.5 py-0.5 text-right bg-blue-50 text-[10px]">
                  R_l (tf)
                </th>
                <th className="px-1.5 py-0.5 text-right bg-blue-50 text-[10px]">
                  R_p (tf)
                </th>
                <th className="px-1.5 py-0.5 text-right bg-blue-50 text-[10px]">
                  Q_geo (tf)
                </th>
                <th className="px-1.5 py-0.5 text-right bg-blue-50 text-[10px]">
                  Q_final (tf)
                </th>
                <th className="px-1.5 py-0.5 text-center bg-blue-50 text-[10px]">
                  rege
                </th>
                <th className="px-1.5 py-0.5 text-right bg-green-50 text-[10px]">
                  R_l (tf)
                </th>
                <th className="px-1.5 py-0.5 text-right bg-green-50 text-[10px]">
                  R_p (tf)
                </th>
                <th className="px-1.5 py-0.5 text-right bg-green-50 text-[10px]">
                  Q_geo (tf)
                </th>
                <th className="px-1.5 py-0.5 text-right bg-green-50 text-[10px]">
                  Q_final (tf)
                </th>
                <th className="px-1.5 py-0.5 text-center bg-green-50 text-[10px]">
                  rege
                </th>
              </tr>
            </>
          ) : (
            <>
              <tr>
                <th className="px-1.5 py-1 text-right" rowSpan="2">
                  Cota ponta (m)
                </th>
                <th className="px-1.5 py-1 text-right" rowSpan="2">
                  Prof. (m)
                </th>
                <th className="px-1.5 py-1 text-center bg-slate-200" colSpan="3">
                  Ponta
                </th>
                <th className="px-1.5 py-1 text-center bg-blue-50" colSpan="7">
                  Décourt-Quaresma
                </th>
                <th className="px-1.5 py-1 text-center bg-green-50" colSpan="9">
                  Aoki-Velloso
                </th>
              </tr>
              <tr className="bg-slate-100 text-slate-600">
                <th
                  className="px-1.5 py-0.5 text-center bg-slate-200 text-[10px]"
                  title="Solo da camada de ponta (código)"
                >
                  Solo
                </th>
                <th
                  className="px-1.5 py-0.5 text-center bg-slate-200 text-[10px]"
                  title="NSPT médio das 3 cotas ao redor da ponta (clampado em 50)"
                >
                  N_p
                </th>
                <th
                  className="px-1.5 py-0.5 text-center bg-slate-200 text-[10px]"
                  title="NSPTs reais (sem clamp) das 3 cotas ao redor da ponta"
                >
                  NSPTs reais
                </th>
                <th className="px-1.5 py-0.5 text-right bg-blue-50 text-[10px]">
                  R_l (tf)
                </th>
                <th className="px-1.5 py-0.5 text-right bg-blue-50 text-[10px]">
                  R_p (tf)
                </th>
                <th
                  className="px-1.5 py-0.5 text-center bg-blue-50 text-[10px]"
                  title="Coeficiente C de Décourt-Quaresma (kPa)"
                >
                  C (kPa)
                </th>
                <th
                  className="px-1.5 py-0.5 text-center bg-blue-50 text-[10px] normal-case"
                  title="Coeficiente α de Décourt-Quaresma (corrige tipo de estaca)"
                >
                  α
                </th>
                <th className="px-1.5 py-0.5 text-right bg-blue-50 text-[10px]">
                  Q_geo (tf)
                </th>
                <th className="px-1.5 py-0.5 text-right bg-blue-50 text-[10px]">
                  Q_final (tf)
                </th>
                <th className="px-1.5 py-0.5 text-center bg-blue-50 text-[10px]">
                  rege
                </th>
                <th className="px-1.5 py-0.5 text-right bg-green-50 text-[10px]">
                  R_l (tf)
                </th>
                <th className="px-1.5 py-0.5 text-right bg-green-50 text-[10px]">
                  R_p (tf)
                </th>
                <th
                  className="px-1.5 py-0.5 text-center bg-green-50 text-[10px]"
                  title="Coeficiente K de Aoki-Velloso (kPa)"
                >
                  K (kPa)
                </th>
                <th
                  className="px-1.5 py-0.5 text-center bg-green-50 text-[10px] normal-case"
                  title="Coeficiente α de Aoki-Velloso (%)"
                >
                  α (%)
                </th>
                <th
                  className="px-1.5 py-0.5 text-center bg-green-50 text-[10px]"
                  title="Fator F1 de Aoki-Velloso (aplicado na ponta)"
                >
                  F1
                </th>
                <th
                  className="px-1.5 py-0.5 text-center bg-green-50 text-[10px]"
                  title="Fator F2 de Aoki-Velloso (aplicado no atrito lateral)"
                >
                  F2
                </th>
                <th className="px-1.5 py-0.5 text-right bg-green-50 text-[10px]">
                  Q_geo (tf)
                </th>
                <th className="px-1.5 py-0.5 text-right bg-green-50 text-[10px]">
                  Q_final (tf)
                </th>
                <th className="px-1.5 py-0.5 text-center bg-green-50 text-[10px]">
                  rege
                </th>
              </tr>
            </>
          )}
        </thead>
        <tbody>
          {memDq.map((d, i) => {
            const a = avPorCota[d.cotaPonta_m];
            const ehSugerida = d.cotaPonta_m === cotaSugerida;
            const ehExpandida = d.cotaPonta_m === linhaExpandida;
            const atendeDq =
              cargaPrev != null && d.Qadm_final_tf != null
                ? d.Qadm_final_tf >= cargaPrev
                : null;
            const camadaPonta =
              d.camadasAtrito && d.camadasAtrito.length > 0
                ? d.camadasAtrito[d.camadasAtrito.length - 1]
                : null;
            const soloPonta = camadaPonta?.solo || '—';
            const codPonta = soloPonta !== '—' ? codigoSolo(soloPonta) : '—';
            const f2 = f2MedioAv(a);

            return (
              <React.Fragment key={i}>
                <tr
                  className={
                    'border-t border-slate-100 cursor-pointer ' +
                    (ehSugerida
                      ? 'bg-yellow-100 font-medium'
                      : 'hover:bg-slate-50')
                  }
                  onClick={() =>
                    setLinhaExpandida(ehExpandida ? null : d.cotaPonta_m)
                  }
                  title="Clique para expandir detalhes de ponta, atrito e fatores de segurança"
                >
                  <td className="px-1.5 py-0.5 font-mono text-right">
                    {ehExpandida ? '▼' : '▶'} {d.cotaPonta_m}
                    {ehSugerida && (
                      <span className="ml-0.5 text-yellow-700">★</span>
                    )}
                  </td>
                  <td className="px-1.5 py-0.5 font-mono text-right text-slate-500">
                    {d.profDesdeArrasamento_m}
                  </td>
                  {modoDetalhado && (
                    <>
                      <td
                        className="px-1.5 py-0.5 font-mono text-center bg-slate-50"
                        title={soloPonta}
                      >
                        {codPonta}
                      </td>
                      <td className="px-1.5 py-0.5 font-mono text-center bg-slate-50">
                        {d.np_calc ?? '—'}
                      </td>
                      <td className="px-1.5 py-0.5 font-mono text-center bg-slate-50 text-[10px]">
                        {Array.isArray(d.np_nspts_reais)
                          ? d.np_nspts_reais.join('/')
                          : '—'}
                      </td>
                    </>
                  )}
                  <td className="px-1.5 py-0.5 font-mono text-right">
                    {(d.Ql_total_kN / 9.81).toFixed(2)}
                  </td>
                  <td className="px-1.5 py-0.5 font-mono text-right">
                    {(d.Rp_final_kN / 9.81).toFixed(2)}
                  </td>
                  {modoDetalhado && (
                    <>
                      <td className="px-1.5 py-0.5 font-mono text-center bg-blue-50">
                        {d.C_kPa?.toFixed(0) ?? '—'}
                      </td>
                      <td className="px-1.5 py-0.5 font-mono text-center bg-blue-50">
                        {d.alpha_dq?.toFixed(2) ?? '—'}
                      </td>
                    </>
                  )}
                  <td className="px-1.5 py-0.5 font-mono text-right">
                    {d.Qadm_geo_tf?.toFixed(2) ?? '—'}
                  </td>
                  <td
                    className={
                      'px-1.5 py-0.5 font-mono text-right font-bold ' +
                      (atendeDq === true
                        ? 'text-green-700'
                        : atendeDq === false
                          ? 'text-red-700'
                          : '')
                    }
                  >
                    {d.Qadm_final_tf?.toFixed(2) ?? '—'}
                  </td>
                  <td className="px-1.5 py-0.5 text-center text-[10px]">
                    <span
                      className={
                        'px-1 rounded ' +
                        (d.rege === 'estr'
                          ? 'bg-amber-200 text-amber-900'
                          : 'bg-slate-200 text-slate-700')
                      }
                    >
                      {d.rege}
                    </span>
                  </td>
                  {a ? (
                    <>
                      <td className="px-1.5 py-0.5 font-mono text-right">
                        {(a.Ql_total_kN / 9.81).toFixed(2)}
                      </td>
                      <td className="px-1.5 py-0.5 font-mono text-right">
                        {(a.Rp_final_kN / 9.81).toFixed(2)}
                      </td>
                      {modoDetalhado && (
                        <>
                          <td className="px-1.5 py-0.5 font-mono text-center bg-green-50">
                            {a.K_kPa?.toFixed(0) ?? '—'}
                          </td>
                          <td className="px-1.5 py-0.5 font-mono text-center bg-green-50">
                            {a.alpha_av_pct?.toFixed(1) ?? '—'}
                          </td>
                          <td className="px-1.5 py-0.5 font-mono text-center bg-green-50">
                            {a.F1_av?.toFixed(2) ?? '—'}
                          </td>
                          <td className="px-1.5 py-0.5 font-mono text-center bg-green-50">
                            {f2?.toFixed(2) ?? '—'}
                          </td>
                        </>
                      )}
                      <td className="px-1.5 py-0.5 font-mono text-right">
                        {a.Qadm_geo_tf?.toFixed(2) ?? '—'}
                      </td>
                      <td className="px-1.5 py-0.5 font-mono text-right font-bold">
                        {a.Qadm_final_tf?.toFixed(2) ?? '—'}
                      </td>
                      <td className="px-1.5 py-0.5 text-center text-[10px]">
                        <span
                          className={
                            'px-1 rounded ' +
                            (a.rege === 'estr'
                              ? 'bg-amber-200 text-amber-900'
                              : 'bg-slate-200 text-slate-700')
                          }
                        >
                          {a.rege}
                        </span>
                      </td>
                    </>
                  ) : (
                    <td
                      colSpan={modoDetalhado ? 9 : 5}
                      className="text-slate-400 text-center"
                    >
                      —
                    </td>
                  )}
                </tr>

                {ehExpandida && (
                  <tr className="bg-slate-50">
                    <td colSpan={modoDetalhado ? 20 : 12} className="px-2 py-2">
                      <DetalhamentoLinha dq={d} av={a} estaca={estaca} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
