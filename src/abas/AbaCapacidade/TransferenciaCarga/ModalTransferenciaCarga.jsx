/* ============================================================================
 * ModalTransferenciaCarga — modal tela cheia do diagrama de transferência de
 * carga estaca-solo (AOKI 1979). Orquestra seletores e o SVG; cálculo nos
 * helpers PUROS. Engine intocada.
 *
 * Props:
 *   memorialLinha — item de memorial (por cota de ponta) do método escolhido
 *   estaca        — estaca (carga prevista, carga estrutural, formato/dimensão)
 *   metodo        — 'DQ' | 'AV'
 *   FSg           — fator de segurança global (lido do estado)
 *   naProf_m      — profundidade do NA desde o arrasamento (m) ou null
 *   onFechar      — () => void
 * ============================================================================ */

import React, { useState, useMemo } from 'react';
import DiagramaTransferenciaSVG from './DiagramaTransferenciaSVG';
import ErrorBoundary from '@/components/ErrorBoundary';
import {
  construirPLz,
  montarCenario,
  plotavel,
  kNparaTf,
  tfParaKn,
  CENARIOS,
  MODELOS_AOKI,
} from './transferenciaHelpers';
import { cargaEstruturalEfetiva, tensaoAdmissivelDe, formatoDe, dimensaoDe } from '@/domain/estacas';

const NOME_METODO = { DQ: 'Décourt-Quaresma', AV: 'Aoki-Velloso' };

export default function ModalTransferenciaCarga({
  memorialLinha,
  estaca,
  metodo = 'DQ',
  FSg = 2.0,
  naProf_m = null,
  coeficientesCustomizados = null,
  onFechar,
}) {
  const [cenarioId, setCenarioId] = useState('prevista');
  const [modelo, setModelo] = useState('A');

  const info = useMemo(() => construirPLz(memorialLinha), [memorialLinha]);

  const Pprev_tf = estaca?.cargaPrevista_tf ?? null;
  const Pprev_kN = Pprev_tf != null && Pprev_tf > 0 ? tfParaKn(Pprev_tf) : null;
  // CP-16 — carga estrutural admissível pela hierarquia (override→catálogo→norma)
  const cargaEstrInfo = cargaEstruturalEfetiva(estaca, coeficientesCustomizados);
  const cargaEstrEfetiva_tf = cargaEstrInfo.valor;
  const cargaEstrOverride_tf = estaca?.cargaEstrutural_tf_custom ?? null;
  // Tensão admissível σₑ (MPa) da Tabela 1.10 — base da linha-limite no diagrama
  const sigmaE_MPa = tensaoAdmissivelDe(estaca?.tipoEstaca, coeficientesCustomizados);

  const pacote = useMemo(
    () => (info ? montarCenario(info, cenarioId, modelo, Pprev_kN, FSg) : null),
    [info, cenarioId, modelo, Pprev_kN, FSg]
  );

  const statusCenario = useMemo(() => {
    if (!info) return {};
    return {
      ruptura: { ok: true },
      prevista: plotavel(info, Pprev_kN),
      ultima: plotavel(info, Pprev_kN != null ? Pprev_kN * FSg : null),
    };
  }, [info, Pprev_kN, FSg]);

  if (!info) {
    return (
      <Overlay onFechar={onFechar} titulo="Transferência de carga" metodo={metodo}>
        <div className="p-6 text-sm text-slate-600">
          Não há memorial nesta cota para o método {NOME_METODO[metodo]}. Selecione
          uma cota com solução de cálculo.
        </div>
      </Overlay>
    );
  }

  const P_atual_kN = pacote?.ok ? pacote.P_kN : null;
  // ── Regra 3 (CP-15d) — comparação estrutural por ESTADO-LIMITE ──────────────
  // A carga estrutural da tabela é ADMISSÍVEL (serviço, com FS embutido — NBR 6122).
  // Para comparar no MESMO estado-limite da carga do cenário:
  //   • "Carga prevista" (serviço): compara P_prev  vs  C_adm.
  //   • "Prevista × FS" e "Ruptura" (último): compara a carga  vs  C_adm × FSg,
  //     elevando a admissível ao estado-limite último (referência ao projetista).
  // Nunca se compara serviço com último (estados-limite distintos).
  const refEstrutural_tf =
    cargaEstrEfetiva_tf == null
      ? null
      : cenarioId === 'prevista'
        ? cargaEstrEfetiva_tf
        : cargaEstrEfetiva_tf * FSg;
  const refEstruturalRotulo =
    cenarioId === 'prevista'
      ? 'Carga estrutural admissível de referência'
      : `Carga estrutural admissível × FS (= ${cargaEstrEfetiva_tf} × ${FSg.toFixed(2)}) de referência`;
  const cargaSuperaEstrutural =
    refEstrutural_tf != null && P_atual_kN != null
      ? kNparaTf(P_atual_kN) > refEstrutural_tf
      : false;

  const corAtiva = metodo === 'AV' ? 'bg-green-600' : 'bg-blue-600';

  return (
    <Overlay onFechar={onFechar} titulo={`Transferência de carga — ${NOME_METODO[metodo]}`} metodo={metodo}>
      {/* Faixa superior: seletores */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Cenário</span>
            <div className="flex rounded overflow-hidden border border-slate-300">
              {CENARIOS.map((c) => {
                const st = statusCenario[c.id];
                const ativo = cenarioId === c.id;
                const desabilitado = st && !st.ok && c.id !== 'ruptura';
                return (
                  <button
                    key={c.id}
                    onClick={() => setCenarioId(c.id)}
                    disabled={desabilitado}
                    title={desabilitado ? st.motivo : c.descricao}
                    className={
                      'px-3 py-1 text-xs ' +
                      (ativo
                        ? corAtiva + ' text-white'
                        : desabilitado
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-white text-slate-700 hover:bg-slate-100')
                    }
                  >
                    {c.rotulo}{desabilitado && ' ⚠'}
                  </button>
                );
              })}
            </div>
          </div>

          {cenarioId !== 'ruptura' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase">Modelo AOKI</span>
              <div className="flex rounded overflow-hidden border border-slate-300">
                {MODELOS_AOKI.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setModelo(m.id)}
                    title={m.descricao}
                    className={
                      'px-3 py-1 text-xs ' +
                      (modelo === m.id ? 'bg-slate-700 text-white' : 'bg-white text-slate-700 hover:bg-slate-100')
                    }
                  >
                    {m.rotulo}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-[11px] font-mono text-slate-600">
          <span>P<sub>L</sub> = {kNparaTf(info.PL).toFixed(1)} tf</span>
          <span>P<sub>P</sub> = {kNparaTf(info.PP).toFixed(1)} tf</span>
          <span>P<sub>R</sub> (ruptura) = {kNparaTf(info.PR).toFixed(1)} tf</span>
          <span>FS<sub>g</sub> = {FSg.toFixed(2)}</span>
          <span>cota ponta = {info.cotaPonta} m</span>
          <span>L<sub>fuste</sub> = {info.Lfuste} m</span>
          {Pprev_tf != null && <span>carga prevista = {Pprev_tf} tf</span>}
          {pacote?.ok && (
            <span className="text-slate-900 font-bold">P (topo) = {kNparaTf(pacote.P_kN).toFixed(1)} tf</span>
          )}
        </div>
      </div>

      {/* Área central */}
      <div className="flex-1 overflow-auto p-4">
        {pacote?.ok ? (
          <ErrorBoundary titulo="Erro ao desenhar o diagrama">
            <DiagramaTransferenciaSVG
              info={info}
              pacote={pacote}
              estaca={estaca}
              naProf_m={naProf_m}
              metodo={metodo}
              sigmaLimite_MPa={
                sigmaE_MPa == null
                  ? null
                  : cenarioId === 'prevista'
                    ? sigmaE_MPa
                    : sigmaE_MPa * FSg
              }
              sigmaLimiteRotulo={
                cenarioId === 'prevista' ? 'σ_e (norma)' : 'σ_e × FS'
              }
            />
          </ErrorBoundary>
        ) : (
          <div className="max-w-2xl mx-auto mt-8 bg-red-50 border border-red-300 rounded p-4">
            <div className="text-sm font-bold text-red-800 mb-1">Não é possível plotar este cenário</div>
            <div className="text-sm text-red-700">{pacote?.motivo}</div>
            <div className="text-xs text-red-600 mt-2">Os demais cenários plotáveis continuam disponíveis nos botões acima.</div>
          </div>
        )}
      </div>

      {/* Faixa inferior: avisos */}
      <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 space-y-2">
        {cargaEstrEfetiva_tf != null && (
          <div
            className={
              'text-xs px-2 py-1 rounded ' +
              (cargaSuperaEstrutural
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'bg-slate-100 text-slate-600')
            }
          >
            {cargaSuperaEstrutural ? '⚠ ' : 'ℹ '}
            {refEstruturalRotulo}:{' '}
            <strong>{refEstrutural_tf.toFixed(1)} tf</strong>
            {cargaEstrOverride_tf != null && ' (estrutural informada)'}
            {cargaSuperaEstrutural ? (
              <> — a carga no topo ({kNparaTf(P_atual_kN).toFixed(1)} tf) <strong>supera</strong> esta referência estrutural; nesse caso a estrutural rege o dimensionamento.</>
            ) : (
              <> — a carga no topo ({kNparaTf(P_atual_kN).toFixed(1)} tf) está dentro desta referência estrutural.</>
            )}
            {sigmaE_MPa != null && (
              <span className="block mt-0.5">
                No painel de tensão, a linha tracejada marca{' '}
                {cenarioId === 'prevista'
                  ? `σ_e = ${sigmaE_MPa} MPa`
                  : `σ_e × FS = ${(sigmaE_MPa * FSg).toFixed(1)} MPa`}
                ; o trecho da curva em vermelho indica onde a tensão axial excede esse limite.
              </span>
            )}
          </div>
        )}
        <div className="text-[11px] text-slate-500 leading-snug">
          ⚠️ Diagrama de transferência de carga obtido por modelo simplificado
          (AOKI, 1979), a partir do diagrama de ruptura estaca-solo do método.
          Representa uma estimativa do comportamento estaca-solo, não medições. Para
          verificação definitiva, recomenda-se prova de carga estática (NBR 16903) ou
          análise numérica com curvas de transferência (t-z). A escolha entre os
          Modelos A e B só pode ser confirmada experimentalmente.
        </div>
      </div>
    </Overlay>
  );
}

function Overlay({ titulo, metodo = 'DQ', onFechar, children }) {
  const corBarra = metodo === 'AV' ? 'bg-green-700' : 'bg-blue-700';
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-stretch justify-center p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl flex flex-col overflow-hidden">
        <div className={'flex items-center justify-between px-4 py-2 ' + corBarra}>
          <h2 className="text-white font-semibold text-sm">📉 {titulo}</h2>
          <button onClick={onFechar} className="text-white/90 hover:text-white text-xl leading-none px-2" title="Fechar">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
