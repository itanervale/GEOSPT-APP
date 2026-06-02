/* ============================================================================
 * Aba 3 — Compatibilização (orquestrador)
 *
 * Funcionalidades:
 *   - Slider de janela de compatibilização (modo draft, commit explícito)
 *   - Seletor de domínio (filtrar furos por dominioGeotecnico)
 *   - Botão "Recalcular" — aplica os drafts e dispara nova compatibilização
 *   - Layout em 2 colunas em telas largas: tabela densa + perfil SVG
 *
 * Empty state quando < 2 sondagens. Erro state se engine falhar.
 *
 * Cópia funcional das linhas 3917-4075 do geospt_app.jsx. Mudanças:
 *   - window.GeoSPT → GeoSPT (import explícito)
 *   - imports via @/ aliases
 * ============================================================================ */

import React, { useEffect, useMemo, useState } from 'react';
import { useObra } from '@/state/ObraProvider';
import { GeoSPT } from '@/engine/geospt-engine';
import Banner from '@/components/ui/Banner';
import BotaoPrim from '@/components/ui/BotaoPrim';
import PerfilCompatibilizadoSVG from '@/components/viz/PerfilCompatibilizadoSVG';
import TabelaCompatibilizacao from './TabelaCompatibilizacao';
import { obterFurosDoDominio, classesCor } from '@/state/dominiosHelper';

export default function AbaCompatibilizacao() {
  const { estado, setEstado } = useObra();
  const sondagens = estado.obra.sondagens;
  const dominios = estado.obra.dominios || [];
  const nSond = Object.keys(sondagens).length;
  const janelaCommitada = estado.obra.parametros.janelaCompatibilizacao_m;

  // Estado de UI: valor do slider em edição (não dispara cálculo)
  const [janelaDraft, setJanelaDraft] = useState(janelaCommitada);

  // CP-12c+ — visualização por domínio (toggle + seletor). Default OFF:
  // a Aba 3 continua mostrando a obra inteira (respeita decisão F da SPEC como
  // comportamento-padrão). Isto é VISUALIZAÇÃO, não filtro de cálculo.
  const [verPorDominio, setVerPorDominio] = useState(false);
  const [dominioSelId, setDominioSelId] = useState('global');

  // Sincroniza draft quando o committed muda externamente (ex.: importar obra)
  useEffect(() => {
    setJanelaDraft(janelaCommitada);
  }, [janelaCommitada]);

  // Se os domínios sumirem (limpar/importar), volta ao global e desliga toggle.
  useEffect(() => {
    if (dominios.length === 0) {
      setVerPorDominio(false);
      setDominioSelId('global');
    }
  }, [dominios.length]);

  const draftDiverge = Math.abs(janelaDraft - janelaCommitada) > 1e-6;

  // Domínio efetivamente selecionado para visualização (null = global)
  const dominioAtivo =
    verPorDominio && dominioSelId !== 'global'
      ? dominios.find((d) => d.id === dominioSelId) || null
      : null;

  // Sondagens efetivas para a VISUALIZAÇÃO: subset do domínio ativo ou todas.
  const sondagensVisiveis = useMemo(() => {
    if (!dominioAtivo) return sondagens;
    return obterFurosDoDominio({ dominioId: dominioAtivo.id }, estado.obra);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dominioAtivo, sondagens]);

  const nVisiveis = Object.keys(sondagensVisiveis).length;

  // Recomputa quando muda o conjunto visível OU a janela committed.
  const resultado = useMemo(() => {
    if (nVisiveis < 1 || !GeoSPT) return null;
    try {
      return GeoSPT.engine.compatibilizar(sondagensVisiveis, {
        janela_m: janelaCommitada,
      });
    } catch (e) {
      return { erro: e.message };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sondagensVisiveis, janelaCommitada]);

  const aplicarRecalculo = () => {
    setEstado((s) => ({
      ...s,
      obra: {
        ...s.obra,
        parametros: {
          ...s.obra.parametros,
          janelaCompatibilizacao_m: janelaDraft,
        },
      },
    }));
  };

  // Empty state
  if (nSond < 2) {
    return (
      <div className="p-6 max-w-3xl">
        <h2 className="text-lg font-bold text-slate-800 mb-1">
          3. Compatibilização
        </h2>
        <p className="text-sm text-slate-600 mb-4">
          Grade por cota absoluta · envoltória inferior · média da família
          predominante.
        </p>
        <Banner tipo="alerta">
          São necessárias <strong>pelo menos 2 sondagens</strong> para
          compatibilizar. Você tem {nSond}. Adicione mais sondagens na Aba 2 ou
          carregue o dataset Balsas.
        </Banner>
      </div>
    );
  }

  if (!resultado || resultado.erro) {
    return (
      <div className="p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-3">
          3. Compatibilização
        </h2>
        <Banner tipo="erro">
          Erro ao compatibilizar: {resultado?.erro || 'engine indisponível'}.
        </Banner>
      </div>
    );
  }

  const { resultados, metadata } = resultado;
  const nomesSond = metadata.nomesSondagens;

  return (
    <div className="p-4 max-w-full">
      <div className="mb-3">
        <h2 className="text-lg font-bold text-slate-800">3. Compatibilização</h2>
        <p className="text-sm text-slate-600">
          {metadata.cotasProcessadas} cotas processadas
          {' · '}grade {metadata.cotaTopoGrade} → {metadata.cotaBaseGrade} m
          {metadata.furoCritico && (
            <>
              {' '}
              · furo crítico{' '}
              <strong className="text-red-700 font-mono">
                {metadata.furoCritico}
              </strong>{' '}
              ({(metadata.furoCriticoPct * 100).toFixed(0)}% das cotas)
            </>
          )}
          {metadata.cotasHeterogeneas_m.length > 0 && (
            <>
              {' '}
              ·{' '}
              <span className="text-amber-700">
                {metadata.cotasHeterogeneas_m.length} cotas heterogêneas
              </span>
            </>
          )}
        </p>
      </div>

      {/* Controles */}
      <div className="bg-slate-50 border border-slate-200 rounded p-3 mb-3 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-700 font-medium">Janela ±</label>
          <input
            type="range"
            min="0.30"
            max="1.00"
            step="0.05"
            value={janelaDraft}
            onChange={(e) => setJanelaDraft(parseFloat(e.target.value))}
            className="w-32"
          />
          <span className="text-sm font-mono w-12">
            {janelaDraft.toFixed(2)}m
          </span>
          {Math.abs(janelaDraft - janelaCommitada) > 1e-6 && (
            <span className="text-xs text-amber-700">
              (commitado: {janelaCommitada.toFixed(2)}m)
            </span>
          )}
        </div>
        <BotaoPrim
          onClick={aplicarRecalculo}
          disabled={!draftDiverge}
          tipo={draftDiverge ? 'primario' : 'secundario'}
        >
          🔄 Recalcular{draftDiverge ? ' →' : ''}
        </BotaoPrim>
        {!draftDiverge && (
          <span className="text-xs text-slate-500">
            Mexa no slider e clique Recalcular
          </span>
        )}
      </div>

      {/* Visualização por domínio (CP-12c+) — só se houver domínios */}
      {dominios.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-3 px-3 py-2 bg-slate-50 border border-slate-200 rounded">
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={verPorDominio}
              onChange={(e) => {
                setVerPorDominio(e.target.checked);
                if (!e.target.checked) setDominioSelId('global');
              }}
            />
            <span className="font-medium">Ver por domínio</span>
          </label>
          {verPorDominio && (
            <div className="flex items-center gap-2">
              <select
                value={dominioSelId}
                onChange={(e) => setDominioSelId(e.target.value)}
                className="px-2 py-1 text-sm border border-slate-300 rounded"
              >
                <option value="global">Global (todos os furos)</option>
                {dominios.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nome} ({(d.furos || []).length} furo
                    {(d.furos || []).length === 1 ? '' : 's'})
                  </option>
                ))}
              </select>
              {dominioAtivo && (
                <span
                  className={
                    'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ' +
                    classesCor(dominioAtivo.cor).bg +
                    ' ' +
                    classesCor(dominioAtivo.cor).text
                  }
                >
                  <span
                    className={
                      'w-2 h-2 rounded-full ' + classesCor(dominioAtivo.cor).dot
                    }
                  />
                  {dominioAtivo.nome}
                </span>
              )}
            </div>
          )}
          <span className="text-xs text-slate-500 italic">
            Visualização — não altera o cálculo das estacas
          </span>
        </div>
      )}

      {/* Layout: tabela + SVG lado a lado em telas largas */}
      <div className="flex flex-col xl:flex-row gap-3">
        {/* Tabela compatibilizada */}
        <div className="flex-1 overflow-x-auto bg-white border border-slate-300 rounded">
          <TabelaCompatibilizacao
            resultados={resultados}
            nomesSond={nomesSond}
          />
        </div>

        {/* Perfil compatibilizado SVG */}
        <div className="xl:w-[480px] shrink-0 bg-white border border-slate-300 rounded p-2">
          <h3 className="text-sm font-bold text-slate-700 mb-2 px-1">
            Perfil compatibilizado
          </h3>
          <PerfilCompatibilizadoSVG resultados={resultados} />
        </div>
      </div>
    </div>
  );
}
