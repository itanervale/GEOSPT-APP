/* ============================================================================
 * CardResumoCalculo — card de resumo do cálculo (DQ × AV + divergência)
 *
 * Mostra 3 colunas: Décourt-Quaresma | Aoki-Velloso | Divergência, na cota
 * de ponta CONSERVADORA (Cenário B). Inclui:
 *   - Q_adm de cada método na cota escolhida
 *   - R_l_rup / R_p_rup (valores de ruptura)
 *   - badge de regência (estr = limitado pela carga estrutural)
 *   - % de divergência classificada (verde/âmbar/vermelho)
 *   - atendimento à carga prevista (DQ e AV)
 *   - aviso de fuste fora do perfil
 *   - cota de ponta sugerida (conservadora), com tratamento de edge cases
 *
 * A cota EXIBIDA no topo é a CONSERVADORA — sincroniza com a sugestão final.
 * (Correção de bug do artifact: antes usava sugDq, que mostrava cota onde AV
 * podia não atender.)
 *
 * Extraído fielmente das linhas 6526-6695 do geospt_app.jsx. Mudanças:
 *   - text-xxs → text-[10px]
 *   - imports via @/ + calculoHelpers
 * ============================================================================ */

import React, { useState } from 'react';
import Banner from '@/components/ui/Banner';
import {
  classificarDivergencia,
  encontrarCotaSugeridaConservadora,
} from './calculoHelpers';
import ModalTransferenciaCarga from './TransferenciaCarga/ModalTransferenciaCarga';
import { lerFSg } from './TransferenciaCarga/transferenciaHelpers';

export default function CardResumoCalculo({
  dq,
  av,
  estaca,
  descricaoModo,
  params,
  naProf_m = null,
  compacto = false,
}) {
  // CP-15 — modal de transferência de carga (por método)
  const [transf, setTransf] = useState(null); // null | { metodo, linha }
  const FSg = lerFSg(params?.coeficientesCustomizados);

  const memDq = dq?.memorial || [];
  const memAv = av?.memorial || [];

  if (memDq.length === 0 && memAv.length === 0) {
    const arrasamento = estaca.cotaArrasamento_m;
    return (
      <Banner tipo="alerta">
        <strong>Memorial vazio — nenhuma cota de ponta foi calculada.</strong>
        {arrasamento != null && (
          <div className="mt-2 text-sm">
            Cota de arrasamento da estaca:{' '}
            <strong className="font-mono">{arrasamento} m</strong>.
          </div>
        )}
        <div className="mt-1 text-sm">
          Possíveis causas:
          <ul className="list-disc list-inside mt-1 space-y-0.5">
            <li>
              A cota de arrasamento está <strong>abaixo</strong> do perfil
              amostrado — a ponta cairia em região sem dado SPT.
            </li>
            <li>
              O perfil compatibilizado é <strong>curto demais</strong> para
              acomodar pelo menos 1 m de embedment.
            </li>
          </ul>
        </div>
        <div className="mt-2 text-xs italic">
          Verifique a cota de arrasamento na Aba 5, ou avalie estender as
          sondagens.
        </div>
      </Banner>
    );
  }

  const fusteForaDq = dq?.fusteForaDoPerfil_m || 0;
  const fusteForaAv = av?.fusteForaDoPerfil_m || 0;
  const fusteFora = Math.max(fusteForaDq, fusteForaAv);

  const cargaPrev = estaca.cargaPrevista_tf;
  const sugConservadora = encontrarCotaSugeridaConservadora(
    memDq,
    memAv,
    cargaPrev
  );

  // Cota para EXIBIR os números nas 3 colunas:
  // - se há cota aceitável (ambos atendem) → usa ela
  // - senão → cota mais profunda calculada (referência neutra, só para mostrar
  //   os valores; a seção de sugestão deixará claro que não atende ambos)
  const cotaMaisProfunda =
    memDq.length > 0
      ? memDq.reduce((min, m) => (m.cotaPonta_m < min ? m.cotaPonta_m : min), memDq[0].cotaPonta_m)
      : memAv.length > 0
        ? memAv.reduce((min, m) => (m.cotaPonta_m < min ? m.cotaPonta_m : min), memAv[0].cotaPonta_m)
        : undefined;
  const cotaPicada = sugConservadora?.cota_m ?? cotaMaisProfunda;

  const dqNaCota =
    cotaPicada !== undefined
      ? memDq.find((m) => m.cotaPonta_m === cotaPicada)
      : null;
  const avNaMesmaCota =
    cotaPicada !== undefined
      ? memAv.find((m) => m.cotaPonta_m === cotaPicada)
      : null;

  const qDqNaCota = dqNaCota?.Qadm_final_tf ?? null;
  const qAvNaCota = avNaMesmaCota?.Qadm_final_tf ?? null;
  const div = classificarDivergencia(qDqNaCota, qAvNaCota);

  const atendeDq =
    cargaPrev != null && qDqNaCota != null ? qDqNaCota >= cargaPrev : null;
  const atendeAv =
    cargaPrev != null && qAvNaCota != null ? qAvNaCota >= cargaPrev : null;

  // Mapeamento de cores estático (Tailwind JIT precisa de classes literais)
  const corClasses = {
    green: { bg: 'bg-green-50', text: 'text-green-700', textBold: 'text-green-900' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', textBold: 'text-amber-900' },
    red: { bg: 'bg-red-50', text: 'text-red-700', textBold: 'text-red-900' },
    slate: { bg: 'bg-slate-50', text: 'text-slate-700', textBold: 'text-slate-900' },
  };
  const cc = corClasses[div.cor] || corClasses.slate;

  return (
    <div
      className={
        'bg-white border border-slate-300 rounded ' +
        (compacto ? 'p-2' : 'p-3') +
        ' mb-3'
      }
    >
      {!compacto && (
        <div className="text-xs text-slate-500 mb-2 uppercase tracking-wide">
          {descricaoModo}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {/* Coluna DQ */}
        <div className="bg-blue-50 rounded p-2">
          <div className="text-xs text-blue-700 uppercase tracking-wide">
            Décourt-Quaresma
          </div>
          <div className="text-lg font-mono font-bold text-blue-900 mt-1">
            {qDqNaCota?.toFixed(2) ?? '—'} <span className="text-xs">tf</span>
          </div>
          {dqNaCota && (
            <div className="text-xs text-blue-700 mt-0.5">
              ponta {dqNaCota.cotaPonta_m} m · prof.{' '}
              {dqNaCota.profDesdeArrasamento_m} m
            </div>
          )}
          {dqNaCota && (
            <div
              className="text-[10px] text-blue-600 mt-0.5"
              title="Valores de ruptura (sem fator de segurança). Q_adm = (R_l + R_p) / FS_global."
            >
              R_l_rup={(dqNaCota.Ql_total_kN / 9.81).toFixed(1)} · R_p_rup=
              {(dqNaCota.Rp_final_kN / 9.81).toFixed(1)} tf
              <span
                className={
                  'ml-1 px-1 rounded ' +
                  (dqNaCota.rege === 'estr' ? 'bg-amber-200' : 'bg-blue-200')
                }
              >
                {dqNaCota.rege}
              </span>
            </div>
          )}
          {dqNaCota && (
            <button
              onClick={() => setTransf({ metodo: 'DQ', linha: dqNaCota })}
              className="mt-1.5 text-[10px] px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-700 text-white"
              title="Diagrama de transferência de carga estaca-solo (AOKI 1979)"
            >
              📉 Transferência de carga
            </button>
          )}
        </div>

        {/* Coluna AV */}
        <div className="bg-green-50 rounded p-2">
          <div className="text-xs text-green-700 uppercase tracking-wide">
            Aoki-Velloso
          </div>
          <div className="text-lg font-mono font-bold text-green-900 mt-1">
            {qAvNaCota?.toFixed(2) ?? '—'} <span className="text-xs">tf</span>
          </div>
          {avNaMesmaCota && (
            <div className="text-xs text-green-700 mt-0.5">
              ponta {avNaMesmaCota.cotaPonta_m} m · prof.{' '}
              {avNaMesmaCota.profDesdeArrasamento_m} m
            </div>
          )}
          {avNaMesmaCota && (
            <div
              className="text-[10px] text-green-600 mt-0.5"
              title="Valores de ruptura (sem fator de segurança). Q_adm = (R_l + R_p) / FS_global."
            >
              R_l_rup={(avNaMesmaCota.Ql_total_kN / 9.81).toFixed(1)} · R_p_rup=
              {(avNaMesmaCota.Rp_final_kN / 9.81).toFixed(1)} tf
              <span
                className={
                  'ml-1 px-1 rounded ' +
                  (avNaMesmaCota.rege === 'estr'
                    ? 'bg-amber-200'
                    : 'bg-green-200')
                }
              >
                {avNaMesmaCota.rege}
              </span>
            </div>
          )}
          {avNaMesmaCota && (
            <button
              onClick={() => setTransf({ metodo: 'AV', linha: avNaMesmaCota })}
              className="mt-1.5 text-[10px] px-2 py-0.5 rounded bg-green-600 hover:bg-green-700 text-white"
              title="Diagrama de transferência de carga estaca-solo (AOKI 1979)"
            >
              📉 Transferência de carga
            </button>
          )}
        </div>

        {/* Coluna Divergência */}
        <div className={cc.bg + ' rounded p-2'}>
          <div className={'text-xs ' + cc.text + ' uppercase tracking-wide'}>
            Divergência DQ × AV
          </div>
          <div className={'text-lg font-mono font-bold ' + cc.textBold + ' mt-1'}>
            {div.pct !== null ? (div.pct * 100).toFixed(0) + '%' : '—'}
          </div>
          <div className={'text-xs ' + cc.text + ' mt-0.5'}>{div.label}</div>
          {cargaPrev !== null && cargaPrev !== undefined && cargaPrev > 0 && (
            <div className="text-[10px] mt-1 space-y-0.5">
              <div>Alvo: {cargaPrev} tf</div>
              <div>
                DQ{' '}
                {atendeDq ? (
                  <span className="text-green-700">✓ atende</span>
                ) : (
                  <span className="text-red-700">⛔ não atende</span>
                )}
                {' / '}
                AV{' '}
                {atendeAv ? (
                  <span className="text-green-700">✓ atende</span>
                ) : (
                  <span className="text-red-700">⛔ não atende</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {fusteFora > 0 && (
        <div className="mt-2 pt-2 border-t border-amber-200 text-xs bg-amber-50 rounded px-2 py-1.5">
          <strong className="text-amber-900">⚠ Fuste fora do perfil:</strong>{' '}
          <span className="text-amber-900">
            trecho de <strong>{fusteFora.toFixed(2)} m</strong> está acima do
            topo do perfil compatibilizado. O atrito lateral desse trecho foi{' '}
            <strong>desprezado</strong> (camadas sem dado SPT).
          </span>
        </div>
      )}

      {sugConservadora && (
        <div className="mt-2 pt-2 border-t border-slate-200 text-xs text-slate-600">
          {sugConservadora.motivoNaoAmbos === 'nenhuma_cota_atende_ambos' ? (
            <>
              <strong className="text-red-700">
                ⛔ Nenhuma cota atende ambos os métodos:
              </strong>{' '}
              <span className="text-red-700">
                não há profundidade onde DQ e AV atendam {cargaPrev} tf
                simultaneamente.
              </span>{' '}
              Nenhuma cota é sugerida. Considere aumentar diâmetro, alongar a
              estaca ou revisar a carga prevista.
              {(sugConservadora.sugDq_individual ||
                sugConservadora.sugAv_individual) && (
                <div className="text-[10px] text-slate-500 mt-1">
                  Atendimento individual:{' '}
                  {sugConservadora.sugDq_individual ? (
                    <>
                      DQ atende a partir de{' '}
                      {sugConservadora.sugDq_individual.cotaPonta_m} m
                    </>
                  ) : (
                    <>DQ não atende em nenhuma cota</>
                  )}{' '}
                  ·{' '}
                  {sugConservadora.sugAv_individual ? (
                    <>
                      AV atende a partir de{' '}
                      {sugConservadora.sugAv_individual.cotaPonta_m} m
                    </>
                  ) : (
                    <>AV não atende em nenhuma cota</>
                  )}
                </div>
              )}
            </>
          ) : sugConservadora.sem_alvo ? (
            <>
              <strong>Cota de referência (sem carga prevista):</strong>{' '}
              <strong className="font-mono">{sugConservadora.cota_m} m</strong>
              <span className="text-slate-500">
                {' '}
                · maior Q_adm individual em cada método
              </span>
            </>
          ) : (
            <>
              <strong>Cota de ponta sugerida (conservadora):</strong>{' '}
              <strong className="font-mono">{sugConservadora.cota_m} m</strong>{' '}
              <span
                className={
                  'px-1.5 py-0.5 rounded text-[10px] ' +
                  (sugConservadora.regente === 'DQ'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-green-100 text-green-800')
                }
              >
                limitante: {sugConservadora.regente}
              </span>
              <span className="ml-1 text-green-700">
                ✓ ambos atendem {cargaPrev} tf
              </span>
              {sugConservadora.sugDq_individual &&
                sugConservadora.sugAv_individual &&
                sugConservadora.sugDq_individual.cotaPonta_m !==
                  sugConservadora.sugAv_individual.cotaPonta_m && (
                  <div className="text-[10px] text-slate-500 mt-1">
                    Individuais: DQ atende em{' '}
                    {sugConservadora.sugDq_individual.cotaPonta_m} m · AV atende
                    em {sugConservadora.sugAv_individual.cotaPonta_m} m
                  </div>
                )}
            </>
          )}
        </div>
      )}

      {/* CP-15 — Modal de transferência de carga (por método) */}
      {transf && (
        <ModalTransferenciaCarga
          memorialLinha={transf.linha}
          estaca={estaca}
          metodo={transf.metodo}
          FSg={FSg}
          naProf_m={naProf_m}
          onFechar={() => setTransf(null)}
        />
      )}
    </div>
  );
}
