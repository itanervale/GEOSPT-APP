/* ============================================================================
 * TabelaCompatibilizacao — tabela densa da compatibilização
 *
 * Colunas:
 *   - Prof. ref. (m), Cota ref. (m), Nº furos
 *   - 1 coluna por sondagem com NSPT (★ se impenetrável)
 *   - Envoltória inferior: NSPT, Furo, Solo
 *   - Família predominante, Média NSPT (uma linha por família quando hetero)
 *
 * Extraído idêntico das linhas 4081-4187 do geospt_app.jsx (artifact original).
 * Pequena mudança: text-xxs removido (não é classe Tailwind padrão), trocado
 * por text-[10px] para mesmo efeito.
 * ============================================================================ */

import React from 'react';
import { bgClassPorFamilia } from '@/domain/solos';

export default function TabelaCompatibilizacao({ resultados, nomesSond }) {
  if (!resultados || resultados.length === 0) {
    return (
      <div className="p-4 text-sm text-slate-500">Sem cotas processadas.</div>
    );
  }

  return (
    <table className="text-xs min-w-full" style={{ tableLayout: 'fixed' }}>
      <thead className="bg-slate-100 sticky top-0">
        <tr className="text-left text-slate-700">
          <th className="px-1.5 py-1.5 border-b border-slate-300 w-14">Prof.</th>
          <th className="px-1.5 py-1.5 border-b border-slate-300 w-14">Cota</th>
          <th className="px-1.5 py-1.5 border-b border-slate-300 text-center w-9" title="Nº de furos amostrados nesta cota">
            Furos
          </th>
          {nomesSond.map((n) => (
            <th
              key={n}
              className="px-1 py-1.5 border-b border-slate-300 text-center font-mono w-11"
              title={n}
            >
              <span className="truncate inline-block max-w-full">{n}</span>
            </th>
          ))}
          <th
            className="px-1 py-1.5 border-b border-slate-300 bg-orange-50 text-center"
            colSpan="3"
          >
            Envoltória inferior
          </th>
          <th className="px-1 py-1.5 border-b border-slate-300 w-20">Família</th>
          <th className="px-1 py-1.5 border-b border-slate-300 text-center w-16">
            Média
          </th>
        </tr>
        <tr className="text-left text-slate-600 text-[10px] bg-slate-50">
          <th
            className="px-1 py-1 border-b border-slate-300"
            colSpan={3 + nomesSond.length}
          ></th>
          <th className="px-1 py-1 border-b border-slate-300 bg-orange-50 text-center w-11">
            NSPT
          </th>
          <th className="px-1 py-1 border-b border-slate-300 bg-orange-50 text-center w-14">
            Furo
          </th>
          <th className="px-1 py-1 border-b border-slate-300 bg-orange-50 w-40">
            Solo (envoltória)
          </th>
          <th
            className="px-1 py-1 border-b border-slate-300"
            colSpan="2"
          ></th>
        </tr>
      </thead>
      <tbody>
        {resultados.map((r, idx) => {
          const linhaBg = r.heterogeneo
            ? 'bg-amber-100'
            : bgClassPorFamilia(r.familiaPred);
          const envNspt = r.envoltoria.nspt;

          return (
            <tr key={idx} className={'border-t border-slate-200 ' + linhaBg}>
              <td className="px-1.5 py-1 font-mono">{r.profRef_m}</td>
              <td className="px-1.5 py-1 font-mono font-bold">{r.cotaRef_m}</td>
              <td className="px-1.5 py-1 text-center">{r.nFuros}</td>

              {/* NSPT por sondagem */}
              {nomesSond.map((n) => {
                const v = r.nsptPorSondagem[n];
                const vReal = r.nsptRealPorSondagem[n];
                const imp = r.impenetravelPorSondagem[n];
                const eMinimo =
                  v !== null && v === envNspt && n === r.envoltoria.furo;
                if (v === null) {
                  return (
                    <td
                      key={n}
                      className="px-1 py-1 text-center text-slate-400"
                    >
                      —
                    </td>
                  );
                }
                return (
                  <td
                    key={n}
                    className={
                      'px-1 py-1 text-center font-mono ' +
                      (eMinimo ? 'bg-orange-200 font-bold' : '')
                    }
                    title={imp ? 'Impenetrável (real=' + vReal + ', cálc=50)' : ''}
                  >
                    {imp ? (
                      <>
                        50<span className="text-amber-700">★</span>
                      </>
                    ) : (
                      v
                    )}
                  </td>
                );
              })}

              {/* Envoltória */}
              <td className="px-1 py-1 text-center font-mono font-bold bg-orange-100">
                {envNspt ?? '—'}
                {r.envoltoria.impenetravel && (
                  <span className="text-amber-700">★</span>
                )}
              </td>
              <td className="px-1 py-1 text-center font-mono bg-orange-50">
                {r.envoltoria.furo || '—'}
              </td>
              <td
                className="px-1.5 py-1 bg-orange-50 truncate"
                style={{ maxWidth: '160px' }}
                title={
                  r.envoltoria.solo
                    ? r.envoltoria.solo +
                      (r.envoltoria.familia ? ' (' + r.envoltoria.familia + ')' : '')
                    : ''
                }
              >
                {r.envoltoria.solo ? (
                  <span className="text-slate-700">{r.envoltoria.solo}</span>
                ) : (
                  '—'
                )}
              </td>

              {/* Família predominante */}
              <td className="px-1.5 py-1 truncate" title={r.heterogeneo ? 'Heterogênea' : r.familiaPred || ''}>
                {r.heterogeneo ? (
                  <span className="font-medium text-amber-900">Hetero.</span>
                ) : (
                  r.familiaPred || '—'
                )}
              </td>
              <td className="px-1 py-1 text-center font-mono">
                {r.heterogeneo ? (
                  <div className="text-[10px] leading-tight">
                    {r.media.coesivo !== null && (
                      <div>
                        <span className="text-blue-700">C:</span> {r.media.coesivo}
                      </div>
                    )}
                    {r.media.intermediario !== null &&
                      r.media.intermediario !== undefined && (
                        <div>
                          <span className="text-purple-700">I:</span>{' '}
                          {r.media.intermediario}
                        </div>
                      )}
                    {r.media.granular !== null && (
                      <div>
                        <span className="text-amber-700">G:</span>{' '}
                        {r.media.granular}
                      </div>
                    )}
                  </div>
                ) : (
                  r.media.familiaPredominante ?? '—'
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
