/* ============================================================================
 * ConteudoComparativoModos — Aba 6.5 (comparativo entre os 4 modos)
 *
 * Executa os 4 modos em paralelo (mesma estaca/config/carga), identifica o
 * mais conservador, calcula dispersão entre métodos e tabula tudo. Instrumento
 * de auditoria — a escolha final é do projetista.
 *
 * Extraído fielmente das linhas 9013-9200 do geospt_app.jsx. Mudanças:
 *   - window.GeoSPT → GeoSPT (import)
 *   - cor de divergência via mapa estático (JIT)
 *   - imports locais
 * ============================================================================ */

import React, { useMemo } from 'react';
import { GeoSPT } from '@/engine/geospt-engine';
import Banner from '@/components/ui/Banner';
import { prepararPerfilCalculo } from './prepararPerfilCalculo';
import {
  classificarDivergencia,
  construirOpcoesCalculo,
  encontrarCotaSugeridaConservadora,
} from './calculoHelpers';
import { resolverFurosParaCalculo } from '@/state/dominiosHelper';
import BadgeFiltroDominio from './BadgeFiltroDominio';

const DIV_TEXT = {
  green: 'text-green-700',
  amber: 'text-amber-700',
  red: 'text-red-700',
  slate: 'text-slate-700',
};

export default function ConteudoComparativoModos({ sondagens, estaca, params, obra }) {
  // CP-12c — filtra furos pelo domínio da estaca (ou todos, se sem domínio).
  const filtro = useMemo(
    () =>
      obra && estaca
        ? resolverFurosParaCalculo(estaca, obra)
        : { sondagens, dominio: null, temFiltro: false, modo4Disponivel: true, nFuros: Object.keys(sondagens || {}).length },
    [estaca, obra, sondagens]
  );
  const sondagensFiltradas = filtro.sondagens;

  const resultados = useMemo(() => {
    if (!GeoSPT) return null;
    const engine = GeoSPT.engine;
    const opcoes = construirOpcoesCalculo(estaca, params);
    const cargaPrev = estaca.cargaPrevista_tf;

    const out = {};

    // Helper: dado par de memoriais (DQ+AV), retorna resumo no Cenário B
    // (conservador) — mesma lógica das abas individuais. O "pior caso"
    // min(Q_DQ, Q_AV) na cota conservadora é a métrica de conservadorismo.
    const resumoConservador = (memDq, memAv) => {
      const sug = encontrarCotaSugeridaConservadora(memDq, memAv, cargaPrev);
      if (!sug) return null;
      const dqNa = (memDq || []).find((m) => m.cotaPonta_m === sug.cota_m) || null;
      const avNa = (memAv || []).find((m) => m.cotaPonta_m === sug.cota_m) || null;
      const qDq = dqNa?.Qadm_final_tf ?? null;
      const qAv = avNa?.Qadm_final_tf ?? null;
      // Pior caso entre os dois métodos disponíveis
      const candidatos = [qDq, qAv].filter((v) => v != null);
      const pior = candidatos.length ? Math.min(...candidatos) : null;
      return {
        cota: sug.cota_m,
        regente: sug.regente,
        qDq,
        qAv,
        pior,
        ambosAtendem: sug.ambosAtendem,
      };
    };

    // Modo 1 — Envoltória
    try {
      const rEnv = prepararPerfilCalculo({
        modo: 'envoltoria',
        submodo: null,
        sondagens: sondagensFiltradas,
        estaca,
        params,
        filtroDominio: filtro,
      });
      if (!rEnv.erro && rEnv.perfilParaCalculo) {
        const dq = engine.calcularDQ(rEnv.perfilParaCalculo, opcoes);
        const av = engine.calcularAV(rEnv.perfilParaCalculo, opcoes);
        const res = resumoConservador(dq.memorial, av.memorial);
        out.envoltoria = res
          ? {
              qDq: res.qDq,
              qAv: res.qAv,
              pior: res.pior,
              cota: res.cota,
              regente: res.regente,
              ambosAtendem: res.ambosAtendem,
            }
          : { erro: 'Memorial vazio' };
      } else {
        out.envoltoria = { erro: rEnv.erro || 'Falha desconhecida' };
      }
    } catch (e) {
      out.envoltoria = { erro: e.message };
    }

    // Modo 2 — Perfil médio 2.2 conservador
    try {
      const rMed = prepararPerfilCalculo({
        modo: 'perfil_medio',
        submodo: '2.2_conservador',
        sondagens: sondagensFiltradas,
        estaca,
        params,
        filtroDominio: filtro,
      });
      if (!rMed.erro && rMed.perfilParaCalculo) {
        const dq = engine.calcularDQ(rMed.perfilParaCalculo, opcoes);
        const av = engine.calcularAV(rMed.perfilParaCalculo, opcoes);
        const res = resumoConservador(dq.memorial, av.memorial);
        out.perfil_medio = res
          ? {
              qDq: res.qDq,
              qAv: res.qAv,
              pior: res.pior,
              cota: res.cota,
              regente: res.regente,
              ambosAtendem: res.ambosAtendem,
            }
          : { erro: 'Memorial vazio' };
      } else {
        out.perfil_medio = { erro: rMed.erro || 'Falha desconhecida' };
      }
    } catch (e) {
      out.perfil_medio = { erro: e.message };
    }

    // Modo 3 — Por furo (furo crítico pelo PIOR CASO conservador,
    // idêntico ao critério da aba "Por furo individual")
    try {
      const rPF = prepararPerfilCalculo({
        modo: 'por_furo',
        submodo: null,
        sondagens: sondagensFiltradas,
        estaca,
        params,
        filtroDominio: filtro,
      });
      if (!rPF.erro && rPF.porFuro && rPF.porFuro.resultados) {
        let furoCritico = null,
          piorCrit = Infinity,
          resCrit = null;
        rPF.porFuro.resultados.forEach((f) => {
          if (f.erro) return;
          const res = resumoConservador(f.dq?.memorial || [], f.av?.memorial || []);
          if (res && res.pior != null && res.pior < piorCrit) {
            piorCrit = res.pior;
            furoCritico = f.furo;
            resCrit = res;
          }
        });
        out.por_furo = resCrit
          ? {
              furoCritico,
              qDq: resCrit.qDq,
              qAv: resCrit.qAv,
              pior: resCrit.pior,
              cota: resCrit.cota,
              regente: resCrit.regente,
              ambosAtendem: resCrit.ambosAtendem,
            }
          : { erro: 'Nenhum furo elegível' };
      } else {
        out.por_furo = { erro: rPF.erro || 'Falha desconhecida' };
      }
    } catch (e) {
      out.por_furo = { erro: e.message };
    }

    // Modo 4 — Interpolação (Cenário B: cota mais profunda onde AMBOS
    // os métodos atendem; pior caso como métrica de conservadorismo)
    try {
      const rI = prepararPerfilCalculo({
        modo: 'interpolacao',
        submodo: null,
        sondagens: sondagensFiltradas,
        estaca,
        params,
        filtroDominio: filtro,
      });
      if (!rI.erro && rI.interpolacao) {
        const curva = rI.interpolacao.curva || [];
        let sug = null;
        if (cargaPrev != null && cargaPrev > 0) {
          // Cota mais RASA (numericamente maior) onde DQ E AV atendem
          const atendAmbos = curva.filter(
            (c) =>
              (c.Qadm_DQ_tf ?? 0) >= cargaPrev &&
              (c.Qadm_AV_tf ?? 0) >= cargaPrev
          );
          if (atendAmbos.length > 0) {
            // mais rasa = maior cotaPonta_m entre as que atendem ambos
            sug = atendAmbos.reduce((b, c) =>
              c.cotaPonta_m > b.cotaPonta_m ? c : b
            );
          }
          // Sem fallback só-DQ: se ninguém atende ambos, sug fica null
          // (a regra de projeto exige atendimento simultâneo dos 2 métodos)
        }
        if (!sug && (cargaPrev == null || cargaPrev <= 0) && curva.length > 0) {
          // Apenas SEM carga prevista: referência neutra (maior Q_adm DQ)
          sug = curva.reduce((b, c) =>
            (c.Qadm_DQ_tf ?? -Infinity) > (b.Qadm_DQ_tf ?? -Infinity) ? c : b
          );
        }
        const qDq = sug?.Qadm_DQ_tf ?? null;
        const qAv = sug?.Qadm_AV_tf ?? null;
        const cand = [qDq, qAv].filter((v) => v != null);
        out.interpolacao = {
          qDq,
          qAv,
          pior: cand.length ? Math.min(...cand) : null,
          cota: sug?.cotaPonta_m ?? null,
          ambosAtendem:
            cargaPrev > 0 && qDq != null && qAv != null
              ? qDq >= cargaPrev && qAv >= cargaPrev
              : false,
          nenhumaAtendeAmbos:
            cargaPrev > 0 && !sug,
          metadataInterp: rI.interpolacao.metadata,
        };
      } else {
        out.interpolacao = { erro: rI.erro || 'Falha desconhecida' };
      }
    } catch (e) {
      out.interpolacao = { erro: e.message };
    }

    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro, estaca, params]);

  if (!resultados) {
    return <Banner tipo="erro">Engine indisponível.</Banner>;
  }

  const modosOk = Object.entries(resultados).filter(
    ([_, r]) => !r.erro && r.pior != null
  );
  // Mais conservador = menor "pior caso" min(Q_DQ, Q_AV) na cota conservadora
  let modoMaisConservador = null,
    qMinConservador = Infinity;
  modosOk.forEach(([id, r]) => {
    if (r.pior < qMinConservador) {
      qMinConservador = r.pior;
      modoMaisConservador = id;
    }
  });

  // Dispersão calculada sobre o pior caso de cada modo
  const piores = modosOk.map(([_, r]) => r.pior).filter((q) => q != null);
  const qMaxP = piores.length > 0 ? Math.max(...piores) : null;
  const qMinP = piores.length > 0 ? Math.min(...piores) : null;
  const spreadPct =
    qMaxP && qMinP && qMaxP > 0 ? ((qMaxP - qMinP) / qMaxP) * 100 : 0;

  const labelModo = {
    envoltoria: 'Envoltória inferior',
    perfil_medio: 'Perfil médio (2.2 conservador)',
    por_furo: 'Por furo individual (crítico)',
    interpolacao: 'Interpolação por locação',
  };

  return (
    <div>
      <BadgeFiltroDominio filtro={filtro} />
      <Banner tipo="info">
        <strong>Aba 6.5 — Comparativo entre Modos.</strong> Os 4 modos são
        executados em paralelo com a mesma estaca, configurações e carga
        prevista, para fundamentar a escolha do modo mais conservador.
      </Banner>

      {modoMaisConservador && (
        <div className="bg-purple-50 border-l-4 border-purple-500 rounded p-3 my-3">
          <div className="text-sm text-purple-900">
            <strong>Modo mais conservador:</strong>{' '}
            <span className="font-medium">
              {labelModo[modoMaisConservador]}
            </span>{' '}
            (Q_adm ={' '}
            <strong className="font-mono">
              {qMinConservador.toFixed(2)} tf
            </strong>{' '}
            — pior caso entre DQ e AV, Cenário B)
          </div>
          <div className="text-xs text-purple-700 mt-1">
            Dispersão entre modos: <strong>{spreadPct.toFixed(0)}%</strong>
            {spreadPct < 15 ? (
              <span className="ml-1 text-green-700">
                — boa convergência entre métodos
              </span>
            ) : spreadPct < 35 ? (
              <span className="ml-1 text-amber-700">
                — dispersão moderada, auditar diferenças
              </span>
            ) : (
              <span className="ml-1 text-red-700">
                — dispersão alta, investigar premissas
              </span>
            )}
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-300 rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-xs text-slate-700 uppercase tracking-wide">
            <tr>
              <th className="px-2 py-2 text-left">Modo</th>
              <th className="px-2 py-2 text-right">Cota ponta (m)</th>
              <th className="px-2 py-2 text-right">Q_adm DQ (tf)</th>
              <th className="px-2 py-2 text-right">Q_adm AV (tf)</th>
              <th
                className="px-2 py-2 text-right"
                title="min(Q_adm DQ, Q_adm AV) na cota conservadora — métrica de conservadorismo"
              >
                Pior caso (tf)
              </th>
              <th className="px-2 py-2 text-center">Divergência DQ × AV</th>
              <th className="px-2 py-2 text-left">Observações</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(resultados).map(([id, r]) => {
              const isConserv = id === modoMaisConservador;
              const div = classificarDivergencia(r.qDq, r.qAv);
              return (
                <tr
                  key={id}
                  className={
                    'border-t border-slate-200 ' +
                    (isConserv ? 'bg-purple-50 font-medium' : 'hover:bg-slate-50')
                  }
                >
                  <td className="px-2 py-1">
                    {labelModo[id]}
                    {isConserv && (
                      <span className="ml-1 text-xs text-purple-700">
                        ★ mais conservador
                      </span>
                    )}
                  </td>
                  {r.erro ? (
                    <td colSpan="6" className="px-2 py-1 text-xs text-red-700">
                      ⛔ {r.erro}
                    </td>
                  ) : (
                    <>
                      <td className="px-2 py-1 font-mono text-right">
                        {r.cota ?? '—'}
                      </td>
                      <td
                        className={
                          'px-2 py-1 font-mono text-right ' +
                          (r.regente === 'DQ' ? 'font-bold' : '')
                        }
                      >
                        {r.qDq?.toFixed(2) ?? '—'}
                      </td>
                      <td
                        className={
                          'px-2 py-1 font-mono text-right ' +
                          (r.regente === 'AV' ? 'font-bold' : '')
                        }
                      >
                        {r.qAv?.toFixed(2) ?? '—'}
                      </td>
                      <td className="px-2 py-1 font-mono text-right font-bold text-slate-900">
                        {r.pior?.toFixed(2) ?? '—'}
                        {r.regente && (
                          <span
                            className={
                              'ml-1 text-[10px] px-1 rounded ' +
                              (r.regente === 'DQ'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-green-100 text-green-800')
                            }
                          >
                            {r.regente}
                          </span>
                        )}
                      </td>
                      <td
                        className={
                          'px-2 py-1 text-xs text-center ' +
                          (DIV_TEXT[div.cor] || DIV_TEXT.slate)
                        }
                      >
                        {div.pct !== null
                          ? (div.pct * 100).toFixed(0) + '% — ' + div.label
                          : '—'}
                      </td>
                      <td className="px-2 py-1 text-xs text-slate-600">
                        {r.nenhumaAtendeAmbos && (
                          <span className="text-red-700">
                            nenhuma cota atende ambos
                          </span>
                        )}
                        {id === 'por_furo' && r.furoCritico && (
                          <>
                            Crítico:{' '}
                            <span className="font-mono">{r.furoCritico}</span>
                          </>
                        )}
                        {id === 'interpolacao' &&
                          !r.nenhumaAtendeAmbos &&
                          r.metadataInterp?.n_cotas && (
                            <>
                              {r.metadataInterp.n_cotas} cotas interpoladas
                            </>
                          )}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 bg-amber-50 border border-amber-200 rounded p-3 text-sm">
        <div className="font-bold text-amber-900 mb-1">
          Sobre a escolha do modo para o projeto:
        </div>
        <ul className="text-xs text-amber-900 space-y-0.5 list-disc list-inside">
          <li>
            <strong>Envoltória inferior:</strong> defensivo — NSPT mínimo cota a
            cota.
          </li>
          <li>
            <strong>Perfil médio 2.2:</strong> família com menor NSPT em cotas
            heterogêneas.
          </li>
          <li>
            <strong>Por furo individual:</strong> revela variabilidade espacial;
            furo crítico mostra pior cenário.
          </li>
          <li>
            <strong>Interpolação por locação:</strong> ponderada pelos 3 furos
            mais próximos da estaca.
          </li>
        </ul>
        <div className="text-xs text-amber-900 mt-2 italic">
          A recomendação final é decisão do engenheiro projetista. O comparativo
          é instrumento de auditoria.
        </div>
      </div>
    </div>
  );
}
