/* ============================================================================
 * Aba 4 — Análise Crítica (orquestrador)
 *
 * Áreas:
 *   1. Cabeçalho com contagem por severidade (críticos/moderados/info)
 *   2. Lista de alertas A1-A11 como cards
 *   3. Card de sugestão de agrupamento de domínios (k-means simplificado)
 *
 * Cálculos derivados (useMemo):
 *   - compat: GeoSPT.engine.compatibilizar(...) cacheado
 *   - aterroCorteInfo: comparação entre cota arrasamento e média dos topos
 *     (limite ±2.5m — alimenta A9/A10)
 *
 * Sugestão de domínio NÃO roda automaticamente — só ao clicar em "Calcular".
 * Aplicar a sugestão grava `dominioGeotecnico` em cada sondagem.
 *
 * Empty state quando < 2 sondagens compatibilizáveis.
 *
 * Cópia funcional das linhas 4384-4566 do geospt_app.jsx. Mudanças:
 *   - window.GeoSPT → GeoSPT (import explícito)
 *   - imports via @/ aliases
 *   - Pasta + index.jsx (orquestrador) + arquivos separados (CardAlerta,
 *     construirAlertas) — padrão dos CPs anteriores
 * ============================================================================ */

import React, { useMemo, useState } from 'react';
import { useObra } from '@/state/ObraProvider';
import { GeoSPT } from '@/engine/geospt-engine';
import Banner from '@/components/ui/Banner';
import BotaoPrim from '@/components/ui/BotaoPrim';
import CardAlerta from './CardAlerta';
import { construirAlertas } from './construirAlertas';
import ModalLimparDominios from './ModalLimparDominios';
import ModalGerenciarDominios from './ModalGerenciarDominios';
import { novoIdDominio, CORES_DOMINIO } from '@/state/dominiosHelper';

export default function AbaAnalise() {
  const { estado, atualizarSondagem, limparDominios, setDominios, setEstado } = useObra();
  const sondagens = estado.obra.sondagens;
  const estacas = estado.obra.estacas;
  const dominios = estado.obra.dominios || [];
  const nSond = Object.keys(sondagens).length;

  // Modais de domínios
  const [mostrarModalLimpar, setMostrarModalLimpar] = useState(false);
  const [mostrarModalGerenciar, setMostrarModalGerenciar] = useState(false);
  // Contadores baseados no schema novo (obra.dominios[])
  const nFurosEmDominios = dominios.reduce(
    (acc, d) => acc + (d.furos || []).length,
    0
  );
  const contadoresDominios = {
    sondagensComDominio: nFurosEmDominios,
    estacasComDominio: estacas.filter((e) => !!e.dominioId).length,
  };
  const haDominiosAtribuidos = dominios.length > 0;

  // ----- Compatibilização (cacheada) -----
  const compat = useMemo(() => {
    if (nSond < 2 || !GeoSPT) return null;
    try {
      return GeoSPT.engine.compatibilizar(sondagens, {
        janela_m: estado.obra.parametros.janelaCompatibilizacao_m,
      });
    } catch (e) {
      return { erro: e.message };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sondagens, estado.obra.parametros.janelaCompatibilizacao_m]);

  // ----- A9/A10: Aterro espesso vs Corte elevado -----
  // Critério: cota de arrasamento ±2.5m em relação à MÉDIA DOS TOPOS DAS SONDAGENS
  const aterroCorteInfo = useMemo(() => {
    const LIMITE_M = 2.5;
    if (!compat || compat.erro || estacas.length === 0) {
      return { mediaTopos: null, aterro: [], corte: [], semCota: 0 };
    }
    const topos = Object.values(sondagens)
      .map((s) => s.cotaTopo_m)
      .filter((c) => c !== null && c !== undefined && Number.isFinite(c));
    if (topos.length === 0)
      return { mediaTopos: null, aterro: [], corte: [], semCota: 0 };
    const mediaTopos = topos.reduce((s, v) => s + v, 0) / topos.length;

    const aterro = [];
    const corte = [];
    let semCota = 0;
    estacas.forEach((e) => {
      const c = e.cotaArrasamento_m;
      if (c === null || c === undefined || !Number.isFinite(c)) {
        semCota++;
        return;
      }
      const delta = c - mediaTopos; // positivo = arrasamento acima da média (aterro)
      if (delta > LIMITE_M) {
        aterro.push({ nome: e.nome, cota: c, delta: delta });
      } else if (delta < -LIMITE_M) {
        corte.push({ nome: e.nome, cota: c, delta: delta }); // delta negativo
      }
    });
    return { mediaTopos, aterro, corte, semCota, limite: LIMITE_M };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sondagens, estacas, compat]);

  // ----- Sugestão de domínios (sob demanda) -----
  const [sugestaoDominio, setSugestaoDominio] = useState(null);
  const calcularSugestao = () => {
    if (!GeoSPT) return;
    try {
      const r = GeoSPT.engine.sugerirAgrupamentoDominios(sondagens);
      setSugestaoDominio(r);
    } catch (e) {
      setSugestaoDominio({ erro: e.message });
    }
  };

  const aplicarSugestaoDominio = () => {
    if (!sugestaoDominio || sugestaoDominio.sugestao !== 'agrupar') return;
    // CP-12b — grava no schema novo obra.dominios[] (não mais por furo).
    const novos = sugestaoDominio.agrupamentos.map((g, i) => ({
      id: 'g' + (i + 1),
      nome: g.nome || 'Grupo ' + (i + 1),
      cor: CORES_DOMINIO[i % CORES_DOMINIO.length],
      furos: [...g.furos],
      origem: 'sugestao_kmeans',
    }));
    setDominios(novos);
    setSugestaoDominio(null);
  };

  // ----- Empty state -----
  if (nSond < 2 || !compat || compat.erro) {
    return (
      <div className="p-6 max-w-3xl">
        <h2 className="text-lg font-bold text-slate-800 mb-1">
          4. Análise Crítica
        </h2>
        <p className="text-sm text-slate-600 mb-4">
          Alertas A1–A11 sobre representatividade e qualidade das sondagens.
        </p>
        <Banner tipo="alerta">
          {nSond < 2 ? (
            <>
              São necessárias <strong>pelo menos 2 sondagens</strong> para esta
              análise. Você tem {nSond}.
            </>
          ) : (
            <>
              Erro ao compatibilizar:{' '}
              {compat?.erro || 'engine indisponível'}.
            </>
          )}
        </Banner>
      </div>
    );
  }

  // Lista de alertas + contagem por severidade
  const alertas = construirAlertas(
    compat,
    sondagens,
    estacas,
    aterroCorteInfo,
    estado.obra.parametros?.coeficientesCustomizados ?? null
  );
  const cont = {
    critico: alertas.filter((a) => a.severidade === 'critico').length,
    moderado: alertas.filter((a) => a.severidade === 'moderado').length,
    info: alertas.filter((a) => a.severidade === 'info').length,
  };

  return (
    <div className="p-4 max-w-5xl">
      <div className="mb-3">
        <h2 className="text-lg font-bold text-slate-800">
          4. Análise Crítica
        </h2>
        <p className="text-sm text-slate-600">
          {alertas.length === 0 ? (
            <span className="text-green-700">
              ✓ Nenhum alerta acionado — sondagem com boa representatividade.
            </span>
          ) : (
            <>
              {cont.critico > 0 && (
                <span className="text-red-700 mr-2">
                  🚨 {cont.critico} crítico(s)
                </span>
              )}
              {cont.moderado > 0 && (
                <span className="text-amber-700 mr-2">
                  ⚠ {cont.moderado} moderado(s)
                </span>
              )}
              {cont.info > 0 && (
                <span className="text-blue-700">
                  ℹ {cont.info} informativo(s)
                </span>
              )}
            </>
          )}
        </p>
      </div>

      {/* Lista de alertas em cards */}
      <div className="space-y-2 mb-4">
        {alertas.map((a, i) => (
          <CardAlerta key={a.id + '_' + i} alerta={a} />
        ))}
      </div>

      {/* Card de sugestão de domínios */}
      <div className="bg-white border border-slate-300 rounded p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-slate-700">
            🔍 Sugestão de agrupamento de domínios geotécnicos
          </h3>
          <div className="flex gap-2">
            <BotaoPrim
              tipo="secundario"
              onClick={() => setMostrarModalGerenciar(true)}
            >
              {haDominiosAtribuidos
                ? '🎯 Gerenciar domínios (' + dominios.length + ')'
                : '+ Criar domínios'}
            </BotaoPrim>
            {haDominiosAtribuidos && (
              <BotaoPrim
                tipo="secundario"
                onClick={() => setMostrarModalLimpar(true)}
              >
                🧹 Limpar domínios
              </BotaoPrim>
            )}
            <BotaoPrim tipo="secundario" onClick={calcularSugestao}>
              Calcular
            </BotaoPrim>
          </div>
        </div>
        <p className="text-xs text-slate-600 mb-2">
          Analisa similaridade entre furos por k-means simplificado (k=2) e
          expõe o silhouette score. Não aplica automaticamente — você decide.
        </p>
        {sugestaoDominio && (
          <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded text-sm">
            {sugestaoDominio.erro ? (
              <span className="text-red-700">Erro: {sugestaoDominio.erro}</span>
            ) : sugestaoDominio.sugestao === 'nao_agrupar' ? (
              <>
                <div className="text-slate-700 mb-1">
                  <strong>Furos parecem homogêneos.</strong>
                </div>
                <div className="text-xs text-slate-600">
                  {sugestaoDominio.justificativa}
                </div>
                {sugestaoDominio.silhouetteScore !== null && (
                  <div className="text-xs text-slate-500 mt-1 font-mono">
                    Silhouette: {sugestaoDominio.silhouetteScore.toFixed(3)}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-green-700 font-medium">
                    ✓ Sugestão: agrupar em {sugestaoDominio.k} domínios
                  </span>
                  {sugestaoDominio.confianca === 'forte' && (
                    <span className="px-1.5 py-0.5 text-[10px] rounded bg-green-200 text-green-900 font-bold">
                      confiança forte
                    </span>
                  )}
                  {sugestaoDominio.confianca === 'fraca' && (
                    <span className="px-1.5 py-0.5 text-[10px] rounded bg-amber-200 text-amber-900 font-bold">
                      confiança fraca
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-600 mb-2">
                  {sugestaoDominio.justificativa}
                </div>
                <div className="text-xs space-y-1 mb-2">
                  {sugestaoDominio.agrupamentos.map((g) => (
                    <div key={g.nome} className="font-mono">
                      <strong>{g.nome}:</strong> {g.furos.join(', ')}
                    </div>
                  ))}
                </div>
                {sugestaoDominio.confianca === 'fraca' && (
                  <div className="text-xs text-amber-700 mb-2 italic">
                    ⚠ Separação fraca. Avalie criticamente antes de aplicar — a
                    evidência estatística é modesta.
                  </div>
                )}
                <BotaoPrim onClick={aplicarSugestaoDominio}>
                  Aplicar este agrupamento aos furos
                </BotaoPrim>
              </>
            )}
          </div>
        )}
      </div>

      {/* Modal de limpeza de domínios */}
      {mostrarModalLimpar && (
        <ModalLimparDominios
          contadores={contadoresDominios}
          onConfirmar={(opcoes) => {
            // CP-12b — limpar no schema novo: esvazia obra.dominios e zera
            // dominioId das estacas (conforme as opções marcadas).
            if (opcoes.sondagens) setDominios([]);
            if (opcoes.estacas) {
              setEstado((s) => ({
                ...s,
                obra: {
                  ...s.obra,
                  estacas: s.obra.estacas.map((e) => ({
                    ...e,
                    dominioId: null,
                  })),
                },
              }));
            }
            setMostrarModalLimpar(false);
          }}
          onCancelar={() => setMostrarModalLimpar(false)}
        />
      )}

      {/* Modal de gerência de domínios (CP-12b) */}
      {mostrarModalGerenciar && (
        <ModalGerenciarDominios
          sondagens={sondagens}
          dominios={dominios}
          onSalvar={(novos) => {
            setDominios(novos);
            setMostrarModalGerenciar(false);
          }}
          onCancelar={() => setMostrarModalGerenciar(false)}
        />
      )}
    </div>
  );
}
