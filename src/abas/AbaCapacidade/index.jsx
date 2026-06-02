/* ============================================================================
 * Aba 6 — Capacidade de Carga (orquestrador)
 *
 * Seleciona estaca ativa + modo de cálculo (tabs) + submodo (perfil médio).
 * Empty states: < 2 sondagens, 0 estacas, estaca incompleta.
 *
 * Modos (tabs): Envoltória | Perfil médio | Por furo | Interpolação + Comparativo
 *   No CP-9a: Envoltória e Perfil médio 2.1/2.2 estão ATIVOS.
 *   Por furo, Interpolação, 2.3 e Comparativo são stubs (CP-9c).
 *
 * Estado de UI (Context): estacaSelecionada, modoCalculoSelecionado,
 * submodoPerfilMedio. Sincroniza estaca ativa quando lista muda.
 *
 * Extraído fielmente das linhas 6134-6281 do geospt_app.jsx. Mudanças:
 *   - imports via @/ + componentes locais
 *   - ConteudoComparativoModos → stub (CP-9c)
 * ============================================================================ */

import React, { useEffect } from 'react';
import { useObra } from '@/state/ObraProvider';
import Banner from '@/components/ui/Banner';
import SeletorEstaca from './SeletorEstaca';
import ConteudoModoCalculo from './ConteudoModoCalculo';
import ConteudoComparativoModos from './ConteudoComparativoModos';
import { MODOS_CALCULO, SUBMODOS_PERFIL_MEDIO } from './calculoHelpers';

export default function AbaCapacidade() {
  const { estado, setUi } = useObra();
  const estacas = estado.obra.estacas;
  const sondagens = estado.obra.sondagens;
  const nSond = Object.keys(sondagens).length;
  const params = estado.obra.parametros;

  const estacaIdAtivo = estado.ui.estacaSelecionada;
  const estacaAtiva =
    estacas.find((e) => e.nome === estacaIdAtivo) || estacas[0] || null;

  useEffect(() => {
    if (!estacaIdAtivo && estacas.length > 0) {
      setUi('estacaSelecionada', estacas[0].nome);
    }
    if (estacaIdAtivo && !estacas.some((e) => e.nome === estacaIdAtivo)) {
      setUi('estacaSelecionada', estacas[0]?.nome || null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estacas.length, estacaIdAtivo]);

  const modo = estado.ui.modoCalculoSelecionado || 'envoltoria';
  const submodo = estado.ui.submodoPerfilMedio || '2.2_conservador';

  const setModo = (m) => setUi('modoCalculoSelecionado', m);
  const setSubmodo = (s) => setUi('submodoPerfilMedio', s);

  // Empty states
  if (nSond < 2) {
    return (
      <div className="p-6 max-w-3xl">
        <h2 className="text-lg font-bold text-slate-800 mb-1">
          6. Capacidade de Carga
        </h2>
        <Banner tipo="alerta">
          São necessárias <strong>pelo menos 2 sondagens</strong> para qualquer
          modo de cálculo.
        </Banner>
      </div>
    );
  }

  if (estacas.length === 0) {
    return (
      <div className="p-6 max-w-3xl">
        <h2 className="text-lg font-bold text-slate-800 mb-1">
          6. Capacidade de Carga
        </h2>
        <Banner tipo="alerta">
          Cadastre ao menos uma estaca completa (tipo, diâmetro e cota de
          arrasamento) na <strong>Aba 5</strong>.
        </Banner>
      </div>
    );
  }

  if (
    !estacaAtiva ||
    !estacaAtiva.tipoEstaca ||
    !estacaAtiva.diametro_m ||
    estacaAtiva.cotaArrasamento_m === null ||
    estacaAtiva.cotaArrasamento_m === undefined
  ) {
    return (
      <div className="p-6 max-w-3xl">
        <h2 className="text-lg font-bold text-slate-800 mb-1">
          6. Capacidade de Carga
        </h2>
        <SeletorEstaca
          estacas={estacas}
          ativaNome={estacaIdAtivo}
          onSelecionar={(n) => setUi('estacaSelecionada', n)}
        />
        <Banner tipo="alerta">
          Estaca selecionada está <strong>incompleta</strong>: precisa de tipo,
          diâmetro e cota de arrasamento.
        </Banner>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-full">
      <div className="mb-3 flex flex-wrap items-baseline gap-3">
        <h2 className="text-lg font-bold text-slate-800">
          6. Capacidade de Carga
        </h2>
        <SeletorEstaca
          estacas={estacas}
          ativaNome={estacaIdAtivo}
          onSelecionar={(n) => setUi('estacaSelecionada', n)}
        />
        {estacaAtiva &&
          estacaAtiva.cotaArrasamento_m != null &&
          !Number.isInteger(estacaAtiva.cotaArrasamento_m) && (
            <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 inline-block">
              Cota de arrasamento informada:{' '}
              <strong className="font-mono">
                {estacaAtiva.cotaArrasamento_m} m
              </strong>{' '}
              · cálculo usando{' '}
              <strong className="font-mono">
                {Math.floor(estacaAtiva.cotaArrasamento_m)} m
              </strong>{' '}
              (arredondado para baixo, a favor da segurança)
            </div>
          )}
      </div>

      {/* Tabs de modo */}
      <div className="mb-3 border-b border-slate-300">
        <div className="flex gap-1 flex-wrap">
          {MODOS_CALCULO.map((m) => {
            const ativo = m.id === modo;
            return (
              <button
                key={m.id}
                onClick={() => setModo(m.id)}
                className={
                  'px-3 py-2 text-sm border-b-2 transition-colors text-left ' +
                  (ativo
                    ? 'border-blue-600 text-blue-700 font-medium bg-blue-50'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50')
                }
                title={m.descricao}
              >
                <div className="font-medium">{m.label}</div>
                <div className="text-xs text-slate-500">{m.descricao}</div>
              </button>
            );
          })}
          <button
            onClick={() => setModo('comparativo')}
            className={
              'px-3 py-2 text-sm border-b-2 transition-colors text-left ' +
              (modo === 'comparativo'
                ? 'border-purple-600 text-purple-700 font-medium bg-purple-50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50')
            }
          >
            <div className="font-medium">⚖ Comparativo</div>
            <div className="text-xs text-slate-500">Todos os modos lado a lado</div>
          </button>
        </div>
      </div>

      {/* Submodos do Modo 2 */}
      {modo === 'perfil_medio' && (
        <div className="mb-3 flex gap-2 items-center bg-slate-50 border border-slate-200 rounded p-2 flex-wrap">
          <span className="text-sm font-medium text-slate-700 mr-2">
            Submodo:
          </span>
          {SUBMODOS_PERFIL_MEDIO.map((sm) => {
            const ativo = sm.id === submodo;
            return (
              <button
                key={sm.id}
                onClick={() => setSubmodo(sm.id)}
                className={
                  'px-2 py-1 text-xs rounded border ' +
                  (ativo
                    ? 'bg-blue-600 text-white border-blue-700'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100')
                }
                title={sm.hint}
              >
                {sm.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Conteúdo do modo */}
      {modo === 'comparativo' ? (
        <ConteudoComparativoModos
          sondagens={sondagens}
          estaca={estacaAtiva}
          params={params}
          obra={estado.obra}
        />
      ) : (
        <ConteudoModoCalculo
          modo={modo}
          submodo={submodo}
          sondagens={sondagens}
          estaca={estacaAtiva}
          params={params}
          obra={estado.obra}
        />
      )}
    </div>
  );
}
