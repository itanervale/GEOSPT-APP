/* ============================================================================
 * DetalhamentoLinha — detalhamento passo-a-passo de 1 cota do memorial
 *
 * Mostra: ponta DQ (q_p, R_p, redutor, tratamento, R_p final + capacidade
 * admissível com FS), ponta AV (análogo), notas técnicas humanas, e a tabela
 * de camadas de atrito DQ (incluindo camada desprezada pela regra de bulbo).
 *
 * Extraído idêntico das linhas 7023-7175 do geospt_app.jsx. Mudança:
 *   - text-xxs → text-[10px]
 *   - SOLO_PARA_CODIGO importado de @/domain/solos
 * ============================================================================ */

import React from 'react';
import { SOLO_PARA_CODIGO } from '@/domain/solos';

export default function DetalhamentoLinha({ dq, av, estaca }) {
  const codigoSolo = (nomeSolo) => SOLO_PARA_CODIGO[nomeSolo] || '?';
  const ultCamadaDq = dq.camadasAtrito?.[dq.camadasAtrito.length - 1];
  const ultCamadaAv = av?.camadasAtrito?.[av.camadasAtrito.length - 1];
  const soloPontaNome = ultCamadaDq?.solo || '—';

  // Pré-calcula o Q_l acumulado por camada, pulando a camada desprezada
  // (regra do último metro). O acumulado da camada desprezada repete o valor
  // anterior (não incrementa), de modo que o último acumulado feche com
  // R_l_total da linha. Retorna um Map cotaBase_m → { acumulado, desprezada }.
  const calcularAcumulado = (memorial) => {
    const mapa = new Map();
    let acc = 0;
    const despr = memorial.camada_desprezada;
    (memorial.camadasAtrito || []).forEach((c) => {
      const ehDesprezada =
        despr != null && c.cotaBase_m === despr.cotaBase_m;
      if (!ehDesprezada) {
        acc += c.Ql_camada_kN || 0;
      }
      mapa.set(c.cotaBase_m, { acumulado: acc, desprezada: ehDesprezada });
    });
    return mapa;
  };
  const accDq = calcularAcumulado(dq);
  const accAv = av ? calcularAcumulado(av) : new Map();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {/* Notas técnicas humanas */}
      {(() => {
        const notasHumanas = (dq.notas || []).filter(
          (n) => /\s/.test(n) && n.length > 30
        );
        if (notasHumanas.length === 0) return null;
        return (
          <div className="lg:col-span-2 bg-amber-50 border-l-4 border-amber-400 rounded px-2 py-1.5 text-[10px]">
            <strong className="text-amber-900">
              📝 Notas técnicas desta cota de ponta:
            </strong>
            <ul className="mt-1 list-disc list-inside text-amber-900 space-y-0.5">
              {notasHumanas.map((nota, ni) => (
                <li key={ni}>{nota}</li>
              ))}
            </ul>
          </div>
        );
      })()}

      {/* CP-14f — Geometria da seção (constante para a estaca nesta linha).
          lg:col-span-2: ocupa as DUAS colunas do grid (faixa fina), senão
          vira célula de 1 coluna esticada à altura do bloco DQ vizinho. */}
      <div className="lg:col-span-2 bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-[10px] font-mono">
        <span className="font-bold text-slate-700">Geometria da seção:</span>{' '}
        A_p = <strong>{dq.Ap_m2?.toFixed(4)} m²</strong> · U (perímetro) ={' '}
        <strong>{dq.U_m?.toFixed(4)} m</strong>
      </div>

      {/* Bloco DQ */}
      <div className="bg-white border border-blue-200 rounded p-2 text-[10px]">
        <div className="font-bold text-blue-900 mb-1.5 border-b border-blue-100 pb-1">
          📍 Décourt-Quaresma — Ponta (cota {dq.cotaPonta_m} m)
        </div>
        <div className="space-y-0.5 font-mono">
          <div>
            Solo da ponta: <strong>{codigoSolo(soloPontaNome)}</strong> (
            {soloPontaNome})
          </div>
          <div>
            N_p (média 3 cotas{' '}
            {Array.isArray(dq.np_origem_cotas_m)
              ? dq.np_origem_cotas_m.join(', ')
              : '?'}
            ) = <strong>{dq.np_calc}</strong>
          </div>
          <div className="text-slate-500">
            NSPTs reais (ponta):{' '}
            {Array.isArray(dq.np_nspts_reais)
              ? dq.np_nspts_reais.join(' / ')
              : '—'}
          </div>
          <div className="text-slate-500 mt-0.5">
            NSPTs do atrito lateral (topo→ponta):{' '}
            <span className="text-slate-700">
              {Array.isArray(dq.camadasAtrito) && dq.camadasAtrito.length > 0
                ? dq.camadasAtrito
                    .map((c) => c.nspt_camada_real ?? c.nl_clampeado ?? '?')
                    .join(' / ')
                : '—'}
            </span>
          </div>
          <div className="mt-1">
            C = <strong>{dq.C_kPa} kPa</strong> · α_DQ ={' '}
            <strong>{dq.alpha_dq?.toFixed(2)}</strong> · A_p ={' '}
            {dq.Ap_m2?.toFixed(4)} m²
          </div>
          <div>
            q_p = C · N_p = <strong>{dq.qp_kPa?.toFixed(2)} kPa</strong>
          </div>
          <div>
            R_p_bruta = q_p · A_p ={' '}
            <strong>{dq.Rp_bruta_kN?.toFixed(2)} kN</strong>
          </div>
          <div>
            Redutor de ponta = {dq.fator_redutor_ponta?.toFixed(2)} → R_p após
            redutor = {dq.Rp_apos_redutor_kN?.toFixed(2)} kN
          </div>
          <div>
            Tratamento ponta: <strong>{dq.tratamento_ponta}</strong> → R_p
            efetiva = {dq.Rp_efetiva_kN?.toFixed(2)} kN
          </div>
          {dq.limita_por_atrito_aplicado && (
            <div className="text-amber-700">
              ⚠ R_p limitada por atrito (regra R_p ≤ R_l): R_p final ={' '}
              {dq.Rp_final_kN?.toFixed(2)} kN
            </div>
          )}
          <div className="mt-1 text-blue-900">
            R_p final = <strong>{dq.Rp_final_kN?.toFixed(2)} kN</strong>
          </div>
        </div>

        <div className="mt-2 pt-2 border-t border-blue-100">
          <div className="font-bold text-blue-900 mb-0.5">
            ⚖ Capacidade admissível (DQ)
          </div>
          <div className="space-y-0.5 font-mono">
            <div>
              R_l_total = <strong>{dq.Ql_total_kN?.toFixed(2)} kN</strong> (
              {(dq.Ql_total_kN / 9.81).toFixed(2)} tf)
            </div>
            <div>
              R_rup = R_l + R_p = <strong>{dq.Rrup_kN?.toFixed(2)} kN</strong>
            </div>
            <div className="mt-1 text-slate-600">
              FS parcial: <strong>1.3 atrito + 4.0 ponta</strong>
            </div>
            <div>
              Q_adm_parcial = R_l/1.3 + R_p/4.0 ={' '}
              <strong>{dq.Qadm_parcial_kN?.toFixed(2)} kN</strong> (
              {(dq.Qadm_parcial_kN / 9.81).toFixed(2)} tf)
            </div>
            <div className="text-slate-600 mt-1">
              FS global: <strong>2.0</strong>
            </div>
            <div>
              Q_adm_global = R_rup/2.0 ={' '}
              <strong>{dq.Qadm_global_kN?.toFixed(2)} kN</strong> (
              {(dq.Qadm_global_kN / 9.81).toFixed(2)} tf)
            </div>
            <div className="mt-1 text-blue-900">
              Q_adm_geo = min(parcial, global) ={' '}
              <strong>{dq.Qadm_geo_tf?.toFixed(2)} tf</strong>
              <span className="ml-1 px-1 rounded bg-blue-100 text-[10px]">
                {dq.rege}
              </span>
            </div>
            <div>
              Q_adm_estrutural ={' '}
              <strong>{dq.Qadm_estrutural_tf?.toFixed(2)} tf</strong>
            </div>
            <div className="mt-1 font-bold">
              Q_adm_final = min(geo, estrutural) ={' '}
              <strong className="text-blue-900">
                {dq.Qadm_final_tf?.toFixed(2)} tf
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Bloco AV */}
      {av && (
        <div className="bg-white border border-green-200 rounded p-2 text-[10px]">
          <div className="font-bold text-green-900 mb-1.5 border-b border-green-100 pb-1">
            📍 Aoki-Velloso — Ponta (cota {av.cotaPonta_m} m)
          </div>
          <div className="space-y-0.5 font-mono">
            <div>
              Solo da ponta:{' '}
              <strong>{codigoSolo(ultCamadaAv?.solo || '—')}</strong> (
              {ultCamadaAv?.solo || '—'})
            </div>
            <div>
              N_p = <strong>{av.np_calc}</strong> (cotas{' '}
              {Array.isArray(av.np_origem_cotas_m)
                ? av.np_origem_cotas_m.join(', ')
                : '?'}
              )
            </div>
            <div className="text-slate-500">
              NSPTs reais:{' '}
              {Array.isArray(av.np_nspts_reais)
                ? av.np_nspts_reais.join(' / ')
                : '—'}
            </div>
            <div className="mt-1">
              K = <strong>{av.K_kPa} kPa</strong> · α ={' '}
              <strong>{av.alpha_av_pct?.toFixed(1)}%</strong> (decimal{' '}
              {av.alpha_av_decimal?.toFixed(4)}) · F1 ={' '}
              <strong>{av.F1_av?.toFixed(2)}</strong>
            </div>
            <div>
              q_p = K · N_p / F1 = <strong>{av.qp_kPa?.toFixed(2)} kPa</strong>
            </div>
            <div>
              R_p_bruta = q_p · A_p ={' '}
              <strong>{av.Rp_bruta_kN?.toFixed(2)} kN</strong>
            </div>
            <div>
              Redutor de ponta = {av.fator_redutor_ponta?.toFixed(2)} → R_p após
              redutor = {av.Rp_apos_redutor_kN?.toFixed(2)} kN
            </div>
            <div>
              Tratamento ponta: <strong>{av.tratamento_ponta}</strong> → R_p
              efetiva = {av.Rp_efetiva_kN?.toFixed(2)} kN
            </div>
            {av.limita_por_atrito_aplicado && (
              <div className="text-amber-700">
                ⚠ R_p limitada por atrito: R_p final ={' '}
                {av.Rp_final_kN?.toFixed(2)} kN
              </div>
            )}
            <div className="mt-1 text-green-900">
              R_p final = <strong>{av.Rp_final_kN?.toFixed(2)} kN</strong>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-green-100">
            <div className="font-bold text-green-900 mb-0.5">
              ⚖ Capacidade admissível (AV)
            </div>
            <div className="space-y-0.5 font-mono">
              <div>
                R_l_total = <strong>{av.Ql_total_kN?.toFixed(2)} kN</strong> (
                {(av.Ql_total_kN / 9.81).toFixed(2)} tf)
              </div>
              <div>
                R_rup = R_l + R_p = <strong>{av.Rrup_kN?.toFixed(2)} kN</strong>
              </div>
              <div className="mt-1 text-slate-600">
                FS global: <strong>2.0</strong> (AV não usa FS parciais)
              </div>
              <div className="text-green-900">
                Q_adm_geo = R_rup/2.0 ={' '}
                <strong>{av.Qadm_geo_tf?.toFixed(2)} tf</strong>
                <span className="ml-1 px-1 rounded bg-green-100 text-[10px]">
                  {av.rege}
                </span>
              </div>
              <div>
                Q_adm_estrutural ={' '}
                <strong>{av.Qadm_estrutural_tf?.toFixed(2)} tf</strong>
              </div>
              <div className="mt-1 font-bold">
                Q_adm_final = min(geo, estrutural) ={' '}
                <strong className="text-green-900">
                  {av.Qadm_final_tf?.toFixed(2)} tf
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Camadas de atrito DQ */}
      <div className="lg:col-span-2 bg-white border border-slate-300 rounded p-2">
        <div className="font-bold text-slate-700 text-[10px] mb-1">
          Camadas de atrito Décourt-Quaresma até cota {dq.cotaPonta_m} m (
          {dq.camadasAtrito?.length || 0} camadas) — f_l = (N_L/3 + 1) · 10 · β
        </div>
        <table className="w-full text-[10px]">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="px-1.5 py-0.5 text-right">Cota (topo→base)</th>
              <th className="px-1.5 py-0.5 text-center">Solo (cód.)</th>
              <th className="px-1.5 py-0.5 text-center">Família</th>
              <th className="px-1.5 py-0.5 text-right">NSPT (clamp)</th>
              <th className="px-1.5 py-0.5 text-right">NSPT real</th>
              <th className="px-1.5 py-0.5 text-center">β</th>
              <th className="px-1.5 py-0.5 text-right">f_l (kPa)</th>
              <th className="px-1.5 py-0.5 text-right">Q_l camada (kN)</th>
              <th
                className="px-1.5 py-0.5 text-right"
                title="Atrito lateral acumulado do topo até a base desta camada (não inclui a camada desprezada). O último valor fecha com R_l total da estaca."
              >
                Q_l acum. (tf)
              </th>
            </tr>
          </thead>
          <tbody>
            {(dq.camadasAtrito || []).map((c, ci) => {
              const accInfo = accDq.get(c.cotaBase_m);
              return (
              <tr key={ci} className="border-t border-slate-200">
                <td className="px-1.5 py-0.5 font-mono text-right">
                  {c.cotaTopo_m}→{c.cotaBase_m}
                </td>
                <td
                  className="px-1.5 py-0.5 font-mono text-center"
                  title={c.solo}
                >
                  {codigoSolo(c.solo)}
                </td>
                <td className="px-1.5 py-0.5 text-center">
                  {c.familia?.[0] || '—'}
                </td>
                <td className="px-1.5 py-0.5 font-mono text-right">
                  {c.nl_clampeado ?? '—'}
                  {c.impenetravel && <span className="text-amber-700">★</span>}
                </td>
                <td className="px-1.5 py-0.5 font-mono text-right">
                  {c.nspt_camada_real ?? '—'}
                </td>
                <td className="px-1.5 py-0.5 font-mono text-center">
                  {c.parametros?.beta?.toFixed(2) ?? '—'}
                </td>
                <td className="px-1.5 py-0.5 font-mono text-right">
                  {c.fl_kPa?.toFixed(1) ?? '—'}
                </td>
                <td className="px-1.5 py-0.5 font-mono text-right">
                  {c.Ql_camada_kN?.toFixed(2) ?? '—'}
                </td>
                <td
                  className={
                    'px-1.5 py-0.5 font-mono text-right font-semibold ' +
                    (accInfo?.desprezada ? 'text-slate-400' : 'text-slate-800')
                  }
                  title={
                    accInfo?.desprezada
                      ? 'Camada desprezada — acumulado não incrementa'
                      : 'Acumulado: ' +
                        (accInfo?.acumulado ?? 0).toFixed(1) +
                        ' kN'
                  }
                >
                  {accInfo ? (accInfo.acumulado / 9.81).toFixed(2) : '—'}
                </td>
              </tr>
              );
            })}
            {dq.camada_desprezada && (
              <tr className="border-t border-slate-200 bg-amber-50">
                <td colSpan="9" className="px-1.5 py-0.5 text-[10px] text-amber-900">
                  ⚠ Camada desprezada (último 1m, regra de bulbo): cota{' '}
                  {dq.camada_desprezada.cotaTopo_m}→
                  {dq.camada_desprezada.cotaBase_m}, NSPT=
                  {dq.camada_desprezada.nl_clampeado}, solo=
                  {codigoSolo(dq.camada_desprezada.solo)}, Q_l descartado=
                  {dq.camada_desprezada.Ql_camada_kN?.toFixed(2)} kN
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Camadas de atrito AV */}
      <div className="lg:col-span-2 bg-white border border-slate-300 rounded p-2">
        <div className="font-bold text-slate-700 text-[10px] mb-1">
          Camadas de atrito Aoki-Velloso até cota {av?.cotaPonta_m} m (
          {av?.camadasAtrito?.length || 0} camadas) — f_l = α · K · N_L / F2
        </div>
        <table className="w-full text-[10px]">
          <thead className="bg-green-50 text-slate-700">
            <tr>
              <th className="px-1.5 py-0.5 text-right">Cota (topo→base)</th>
              <th className="px-1.5 py-0.5 text-center">Solo (cód.)</th>
              <th className="px-1.5 py-0.5 text-center">Família</th>
              <th className="px-1.5 py-0.5 text-right">NSPT (clamp)</th>
              <th className="px-1.5 py-0.5 text-right">NSPT real</th>
              <th
                className="px-1.5 py-0.5 text-right"
                title="Coeficiente K de Aoki-Velloso (kPa)"
              >
                K (kPa)
              </th>
              <th
                className="px-1.5 py-0.5 text-right"
                title="Coeficiente α de Aoki-Velloso (%)"
              >
                α (%)
              </th>
              <th
                className="px-1.5 py-0.5 text-center"
                title="Fator F2 de Aoki-Velloso (aplicado ao atrito lateral)"
              >
                F2
              </th>
              <th className="px-1.5 py-0.5 text-right">f_l (kPa)</th>
              <th className="px-1.5 py-0.5 text-right">Q_l camada (kN)</th>
              <th
                className="px-1.5 py-0.5 text-right"
                title="Atrito lateral acumulado do topo até a base desta camada (não inclui a camada desprezada). O último valor fecha com R_l total da estaca."
              >
                Q_l acum. (tf)
              </th>
            </tr>
          </thead>
          <tbody>
            {(av?.camadasAtrito || []).map((c, ci) => {
              const accInfo = accAv.get(c.cotaBase_m);
              return (
              <tr key={ci} className="border-t border-slate-200">
                <td className="px-1.5 py-0.5 font-mono text-right">
                  {c.cotaTopo_m}→{c.cotaBase_m}
                </td>
                <td
                  className="px-1.5 py-0.5 font-mono text-center"
                  title={c.solo}
                >
                  {codigoSolo(c.solo)}
                </td>
                <td className="px-1.5 py-0.5 text-center">
                  {c.familia?.[0] || '—'}
                </td>
                <td className="px-1.5 py-0.5 font-mono text-right">
                  {c.nl_clampeado ?? '—'}
                  {c.impenetravel && <span className="text-amber-700">★</span>}
                </td>
                <td className="px-1.5 py-0.5 font-mono text-right">
                  {c.nspt_camada_real ?? '—'}
                </td>
                <td className="px-1.5 py-0.5 font-mono text-right">
                  {c.parametros?.K_kPa?.toFixed(0) ?? '—'}
                </td>
                <td className="px-1.5 py-0.5 font-mono text-right">
                  {c.parametros?.alpha_pct?.toFixed(1) ?? '—'}
                </td>
                <td className="px-1.5 py-0.5 font-mono text-center">
                  {c.parametros?.F2?.toFixed(2) ?? '—'}
                </td>
                <td className="px-1.5 py-0.5 font-mono text-right">
                  {c.fl_kPa?.toFixed(1) ?? '—'}
                </td>
                <td className="px-1.5 py-0.5 font-mono text-right">
                  {c.Ql_camada_kN?.toFixed(2) ?? '—'}
                </td>
                <td
                  className={
                    'px-1.5 py-0.5 font-mono text-right font-semibold ' +
                    (accInfo?.desprezada ? 'text-slate-400' : 'text-slate-800')
                  }
                  title={
                    accInfo?.desprezada
                      ? 'Camada desprezada — acumulado não incrementa'
                      : 'Acumulado: ' +
                        (accInfo?.acumulado ?? 0).toFixed(1) +
                        ' kN'
                  }
                >
                  {accInfo ? (accInfo.acumulado / 9.81).toFixed(2) : '—'}
                </td>
              </tr>
              );
            })}
            {av?.camada_desprezada && (
              <tr className="border-t border-slate-200 bg-amber-50">
                <td colSpan="11" className="px-1.5 py-0.5 text-[10px] text-amber-900">
                  ⚠ Camada desprezada (último 1m, regra de bulbo): cota{' '}
                  {av.camada_desprezada.cotaTopo_m}→
                  {av.camada_desprezada.cotaBase_m}, NSPT=
                  {av.camada_desprezada.nl_clampeado}, solo=
                  {codigoSolo(av.camada_desprezada.solo)}, Q_l descartado=
                  {av.camada_desprezada.Ql_camada_kN?.toFixed(2)} kN
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
