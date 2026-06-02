/* ============================================================================
 * ConteudoModoPorFuro — Modo 3 (cálculo individual por furo)
 *
 * Calcula cada furo isoladamente, monta tabela comparativa de Q_adm por furo
 * (Cenário B conservador), identifica o furo crítico (pior caso entre DQ e AV),
 * e detalha o furo selecionado (card + curva + memorial).
 *
 * Extraído fielmente das linhas 7235-7369 do geospt_app.jsx. Mudanças:
 *   - text-xxs → text-[10px]
 *   - cores de divergência via mapa estático (JIT)
 *   - imports locais
 * ============================================================================ */

import React, { useState } from 'react';
import Banner from '@/components/ui/Banner';
import CardResumoCalculo from './CardResumoCalculo';
import CurvaQxCotaSVG from './CurvaQxCotaSVG';
import MemorialCalculo from './MemorialCalculo';
import AvisosModo from './AvisosModo';
import {
  classificarDivergencia,
  encontrarCotaSugeridaConservadora,
} from './calculoHelpers';

// Mapa estático de cor de texto da divergência (JIT precisa de classes literais)
const DIV_TEXT = {
  green: 'text-green-700',
  amber: 'text-amber-700',
  red: 'text-red-700',
  slate: 'text-slate-700',
};

export default function ConteudoModoPorFuro({ resultado, estaca, params }) {
  const r = resultado.porFuro;
  const [furoSelecionado, setFuroSelecionado] = useState(null);

  if (!r || !r.resultados || r.resultados.length === 0) {
    return (
      <Banner tipo="alerta">
        Nenhum furo elegível para cálculo individual.
      </Banner>
    );
  }

  const cargaPrev = estaca.cargaPrevista_tf;

  const linhasFuro = r.resultados.map((f) => {
    if (f.erro) return { furo: f.furo, erro: f.erro };
    const memDq = f.dq?.memorial || [];
    const memAv = f.av?.memorial || [];
    const sugCons = encontrarCotaSugeridaConservadora(memDq, memAv, cargaPrev);
    const cotaSug = sugCons?.cota_m ?? null;
    const dqNa =
      cotaSug != null ? memDq.find((m) => m.cotaPonta_m === cotaSug) : null;
    const avNa =
      cotaSug != null ? memAv.find((m) => m.cotaPonta_m === cotaSug) : null;
    return {
      furo: f.furo,
      sugDq: dqNa,
      sugAv: avNa,
      cotaSug,
      regente: sugCons?.regente,
      qDq: dqNa?.Qadm_final_tf ?? null,
      qAv: avNa?.Qadm_final_tf ?? null,
      ambosAtendem: sugCons?.ambosAtendem ?? false,
      motivoNaoAmbos: sugCons?.motivoNaoAmbos ?? null,
      alertaAterroEspesso: f.alertaAterroEspesso,
      alertaCorteElevado: f.alertaCorteElevado,
      dadosCompletos: f,
    };
  });

  const furosOk = linhasFuro.filter(
    (l) => !l.erro && l.qDq != null && l.qAv != null
  );
  let furoCritico = null,
    qMinAdm = Infinity;
  furosOk.forEach((l) => {
    const piorDoFuro = Math.min(l.qDq, l.qAv);
    if (piorDoFuro < qMinAdm) {
      qMinAdm = piorDoFuro;
      furoCritico = l.furo;
    }
  });

  const nomeAtivo = furoSelecionado || furoCritico || furosOk[0]?.furo || null;
  const ativo = linhasFuro.find((l) => l.furo === nomeAtivo);
  const dqAtivo = ativo?.dadosCompletos?.dq;
  const avAtivo = ativo?.dadosCompletos?.av;

  return (
    <div>
      <Banner tipo="info">
        <strong>Modo 3 — Por furo individual.</strong> Cada furo calculado
        isoladamente com seu próprio perfil. Critério:{' '}
        <strong>Cenário B (conservador)</strong> — cota mais profunda entre DQ e
        AV. Furo mais desfavorável (pior caso entre DQ e AV):{' '}
        <strong className="font-mono">{furoCritico || '—'}</strong>
        {furoCritico && (
          <>
            {' '}
            (Q_adm = <strong>{qMinAdm.toFixed(2)} tf</strong>)
          </>
        )}
        .
      </Banner>

      <div className="overflow-x-auto bg-white border border-slate-300 rounded mt-3 mb-3">
        <div className="px-2 py-1 bg-slate-50 border-b border-slate-300 text-xs font-bold text-slate-700">
          Visão geral — Q_adm por furo
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-xs text-slate-700 uppercase tracking-wide">
            <tr>
              <th className="px-2 py-2 text-left">Furo</th>
              <th className="px-2 py-2 text-right">Cota ponta sugerida (m)</th>
              <th className="px-2 py-2 text-right">Q_adm DQ (tf)</th>
              <th className="px-2 py-2 text-right">Q_adm AV (tf)</th>
              <th className="px-2 py-2 text-center">Divergência</th>
              <th className="px-2 py-2 text-left">Observações</th>
              <th className="px-2 py-2 text-center w-20"></th>
            </tr>
          </thead>
          <tbody>
            {linhasFuro.map((l) => {
              const isCrit = l.furo === furoCritico;
              const isAtivo = l.furo === nomeAtivo;
              const div = classificarDivergencia(l.qDq, l.qAv);
              const atendeDq =
                cargaPrev != null && cargaPrev > 0 && l.qDq != null
                  ? l.qDq >= cargaPrev
                  : null;
              const atendeAv =
                cargaPrev != null && cargaPrev > 0 && l.qAv != null
                  ? l.qAv >= cargaPrev
                  : null;
              return (
                <tr
                  key={l.furo}
                  className={
                    'border-t border-slate-200 cursor-pointer ' +
                    (isAtivo
                      ? 'bg-blue-100'
                      : isCrit
                        ? 'bg-red-50'
                        : 'hover:bg-slate-50')
                  }
                  onClick={() => setFuroSelecionado(l.furo)}
                >
                  <td className="px-2 py-1 font-mono font-bold">
                    {l.furo}
                    {isCrit && (
                      <span className="ml-1 text-xs text-red-700">
                        ★ crítico
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1 font-mono text-right">
                    {l.cotaSug ?? '—'}
                    {l.regente && (
                      <span
                        className={
                          'ml-1 text-[10px] px-1 rounded ' +
                          (l.regente === 'DQ'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800')
                        }
                      >
                        {l.regente}
                      </span>
                    )}
                  </td>
                  <td
                    className={
                      'px-2 py-1 font-mono text-right font-bold ' +
                      (atendeDq === true
                        ? 'text-green-700'
                        : atendeDq === false
                          ? 'text-red-700'
                          : '')
                    }
                  >
                    {l.qDq?.toFixed(2) ?? '—'}
                  </td>
                  <td
                    className={
                      'px-2 py-1 font-mono text-right ' +
                      (atendeAv === true
                        ? 'text-green-700'
                        : atendeAv === false
                          ? 'text-red-700'
                          : '')
                    }
                  >
                    {l.qAv?.toFixed(2) ?? '—'}
                  </td>
                  <td
                    className={
                      'px-2 py-1 text-xs text-center ' +
                      (DIV_TEXT[div.cor] || DIV_TEXT.slate)
                    }
                  >
                    {div.pct !== null ? (div.pct * 100).toFixed(0) + '%' : '—'}
                  </td>
                  <td className="px-2 py-1 text-xs text-slate-600">
                    {l.erro && <span className="text-red-700">⛔ {l.erro}</span>}
                    {l.alertaAterroEspesso && (
                      <span
                        className="text-amber-700 text-[10px]"
                        title={l.alertaAterroEspesso}
                      >
                        ⚠ aterro espesso{' '}
                      </span>
                    )}
                    {l.alertaCorteElevado && (
                      <span
                        className="text-amber-700 text-[10px]"
                        title={l.alertaCorteElevado}
                      >
                        ⚠ corte elevado
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1 text-center">
                    {isAtivo ? (
                      <span className="text-[10px] text-blue-700">
                        ▼ exibido
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">
                        click p/ ver
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {ativo && dqAtivo && avAtivo && (
        <div className="bg-slate-50 border border-blue-300 rounded p-2 mb-3">
          <div className="text-xs font-bold text-blue-900 mb-2">
            🔍 Detalhamento do furo{' '}
            <span className="font-mono">{ativo.furo}</span>
            {ativo.furo === furoCritico && (
              <span className="ml-2 text-red-700">★ furo crítico</span>
            )}
          </div>
          <CardResumoCalculo
            dq={dqAtivo}
            av={avAtivo}
            estaca={estaca}
            descricaoModo={'Modo 3 — Furo ' + ativo.furo}
          />
          <CurvaQxCotaSVG dq={dqAtivo} av={avAtivo} estaca={estaca} />
          <MemorialCalculo dq={dqAtivo} av={avAtivo} estaca={estaca} />
        </div>
      )}

      <AvisosModo avisos={resultado.avisos} />
    </div>
  );
}
