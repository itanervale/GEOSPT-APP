/* ============================================================================
 * Aba 5 — Locação de Estacas (orquestrador)
 *
 * Layout: 2 colunas em telas xl
 *   Esquerda: tabela de estacas + painel de configurações globais
 *   Direita:  mini-mapa SVG com furos e estacas
 *
 * Operações:
 *   - Adicionar estaca: gera próximo nome E-XX livre, abre modal vazio
 *   - Editar estaca: clica no ✎ → abre modal com cópia dos dados
 *   - Remover estaca: clica no ✕ → modal de confirmação
 *
 * Estado local: editandoEstaca = { idx: -1|n, dados } | null
 *   - idx === -1 indica criação (push no array)
 *   - idx >= 0  indica edição (substitui posição)
 *
 * Defaults da configuração global (idempotentes com o estado existente):
 *   desprezaUltimoMetroAtrito: true
 *   aplicaFatorRedutorPonta:   false
 *   limitaRpRl:                false
 *   tratamentoPonta:           'calculado'
 *
 * Extraído fielmente das linhas 4812-4996 do geospt_app.jsx. Mudanças:
 *   - window.GeoSPT → GeoSPT (import explícito)
 *   - imports via @/ aliases
 *   - PainelConfigCalculo agora exibe placeholder para EditorCoeficientesCompleto
 *     (que vem no CP-8b)
 * ============================================================================ */

import React, { useMemo, useState } from 'react';
import { useObra } from '@/state/ObraProvider';
import { GeoSPT } from '@/engine/geospt-engine';
import BotaoPrim from '@/components/ui/BotaoPrim';
import ModalConfirmar from '@/components/ui/ModalConfirmar';
import MiniMapaSVG from '@/components/viz/MiniMapaSVG';
import {
  labelTipoEstaca,
  rotuloDimensaoCurto,
  avaliarAlertaA6,
} from '@/domain/estacas';
import ModalEditarEstaca from './ModalEditarEstaca';
import PainelConfigCalculo from './PainelConfigCalculo';
import { classesCor } from '@/state/dominiosHelper';
import ModalCorteEsquematico from '@/abas/AbaCorteEsquematico/ModalCorteEsquematico';

export default function AbaEstacas() {
  const { estado, setEstado, selecionarElemento, setCorteEsquematico } = useObra();
  const estacas = estado.obra.estacas;
  const sondagens = estado.obra.sondagens;
  const dominios = estado.obra.dominios || [];
  const params = estado.obra.parametros;

  const [editandoEstaca, setEditandoEstaca] = useState(null);
  // editandoEstaca: { idx, dados } | null
  // idx === -1 → criação | idx >= 0 → edição

  const [confirmarRemover, setConfirmarRemover] = useState(null); // idx
  const [mostrarCorte, setMostrarCorte] = useState(false); // CP-13c

  // -------- Furo crítico (derivado da compatibilização) --------
  // Usado pelo MiniMapaSVG para destacar (item 14 do CP-8a.1).
  // Compatibilização cacheada; falha silenciosamente se < 2 furos ou erro.
  const { furoCritico, furoCriticoPct } = useMemo(() => {
    if (Object.keys(sondagens).length < 2 || !GeoSPT) {
      return { furoCritico: null, furoCriticoPct: null };
    }
    try {
      const compat = GeoSPT.engine.compatibilizar(sondagens, {
        janela_m: params.janelaCompatibilizacao_m ?? 0.5,
      });
      return {
        furoCritico: compat.metadata.furoCritico ?? null,
        furoCriticoPct: compat.metadata.furoCriticoPct ?? null,
      };
    } catch {
      return { furoCritico: null, furoCriticoPct: null };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sondagens, params.janelaCompatibilizacao_m]);

  // -------- Operações --------

  const adicionarEstaca = () => {
    // Gera próximo nome livre: E-01, E-02...
    let i = 1;
    let candidato;
    do {
      candidato = 'E-' + String(i).padStart(2, '0');
      i++;
    } while (estacas.some((e) => e.nome === candidato));

    setEditandoEstaca({
      idx: -1,
      dados: {
        nome: candidato,
        coordenadas: { x: null, y: null },
        tipoEstaca: 'helice_continua',
        formato: 'circular',
        dimensao_m: 0.4,
        diametro_m: 0.4, // espelho retrocompatível de dimensao_m (CP-14)
        cotaArrasamento_m: null,
        cargaPrevista_tf: null,
        dominioId: null,
      },
    });
  };

  const salvarEstaca = (dados) => {
    setEstado((s) => {
      const novas = [...s.obra.estacas];
      if (editandoEstaca.idx === -1) {
        novas.push(dados);
      } else {
        novas[editandoEstaca.idx] = dados;
      }
      return { ...s, obra: { ...s.obra, estacas: novas } };
    });
    setEditandoEstaca(null);
  };

  const removerEstaca = (idx) => {
    setEstado((s) => ({
      ...s,
      obra: { ...s.obra, estacas: s.obra.estacas.filter((_, i) => i !== idx) },
    }));
    setConfirmarRemover(null);
  };

  // -------- Configurações globais --------

  const setConfigGlobal = (campo, valor) => {
    setEstado((s) => ({
      ...s,
      obra: {
        ...s.obra,
        parametros: { ...s.obra.parametros, [campo]: valor },
      },
    }));
  };

  // Aplica defaults sem mutar o estado (idempotente)
  const config = {
    desprezaUltimoMetroAtrito: params.desprezaUltimoMetroAtrito ?? true,
    aplicaFatorRedutorPonta: params.aplicaFatorRedutorPonta ?? false,
    limitaRpRl: params.limitaRpRl ?? false,
    tratamentoPonta: params.tratamentoPonta ?? 'calculado',
    coeficientesCustomizados: params.coeficientesCustomizados ?? null,
  };

  // Fallback se GeoSPT não exportar pileTypesLabel — uso função local
  const obterLabelTipo = (id) => {
    if (GeoSPT?.domain?.pileTypesLabel?.[id]) {
      return GeoSPT.domain.pileTypesLabel[id];
    }
    return labelTipoEstaca(id);
  };

  return (
    <div className="p-4 max-w-full">
      <h2 className="text-lg font-bold text-slate-800 mb-1">
        5. Locação de Estacas
      </h2>
      <p className="text-sm text-slate-600 mb-3">
        Cadastro das estacas + configurações globais de cálculo.
      </p>

      <div className="flex flex-col xl:flex-row gap-3">
        {/* Coluna esquerda: tabela + configs */}
        <div className="flex-1 space-y-3 min-w-0">
          {/* Tabela de estacas */}
          <div className="bg-white border border-slate-300 rounded">
            <div className="flex items-center justify-between p-2 border-b border-slate-300 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-700">
                Estacas cadastradas ({estacas.length})
              </h3>
              <BotaoPrim onClick={adicionarEstaca}>+ Adicionar estaca</BotaoPrim>
            </div>
            {estacas.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">
                Nenhuma estaca cadastrada.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-[10px] text-slate-700 uppercase tracking-wide">
                    <tr>
                      <th className="px-1.5 py-1.5 text-left">Nome</th>
                      <th className="px-1 py-1.5 text-right">X</th>
                      <th className="px-1 py-1.5 text-right">Y</th>
                      <th className="px-1.5 py-1.5 text-left">Tipo</th>
                      <th className="px-1 py-1.5 text-right" title="Dimensão: Ø diâmetro (circular) ou □ lado (quadrada), em cm">
                        Dim.
                      </th>
                      <th className="px-1 py-1.5 text-right" title="Cota de arrasamento (m)">
                        Arr. (m)
                      </th>
                      <th className="px-1 py-1.5 text-right" title="Carga prevista (tf)">
                        Carga (tf)
                      </th>
                      <th className="px-1.5 py-1.5 text-left">Domínio</th>
                      <th className="px-1 py-1.5 w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {estacas.map((e, idx) => (
                      <tr
                        key={idx}
                        className="border-t border-slate-200 hover:bg-slate-50"
                      >
                        <td className="px-1.5 py-1 font-mono font-bold">
                          {e.nome}
                        </td>
                        <td className="px-1 py-1 font-mono text-right text-[11px]">
                          {e.coordenadas?.x ?? '—'}
                        </td>
                        <td className="px-1 py-1 font-mono text-right text-[11px]">
                          {e.coordenadas?.y ?? '—'}
                        </td>
                        <td
                          className="px-1.5 py-1 text-[11px] truncate"
                          style={{ maxWidth: '140px' }}
                          title={obterLabelTipo(e.tipoEstaca)}
                        >
                          {obterLabelTipo(e.tipoEstaca)}
                        </td>
                        <td className="px-1 py-1 font-mono text-right whitespace-nowrap">
                          {rotuloDimensaoCurto(e) || '—'}
                          {avaliarAlertaA6(e) && (
                            <span
                              className="ml-1 text-amber-600 cursor-help"
                              title={avaliarAlertaA6(e).mensagem}
                            >
                              ⚠A6
                            </span>
                          )}
                        </td>
                        <td className="px-1 py-1 font-mono text-right">
                          {e.cotaArrasamento_m ?? '—'}
                        </td>
                        <td className="px-1 py-1 font-mono text-right">
                          {e.cargaPrevista_tf ?? '—'}
                        </td>
                        <td
                          className="px-1.5 py-1 text-[11px]"
                          style={{ maxWidth: '110px' }}
                        >
                          {(() => {
                            const dom = dominios.find(
                              (x) => x.id === e.dominioId
                            );
                            if (!dom)
                              return <span className="text-slate-400">—</span>;
                            const c = classesCor(dom.cor);
                            return (
                              <span
                                className={
                                  'inline-flex items-center gap-1 px-1.5 py-0.5 rounded ' +
                                  c.bg +
                                  ' ' +
                                  c.text
                                }
                                title={
                                  dom.nome +
                                  ' (' +
                                  (dom.furos || []).length +
                                  ' furos)'
                                }
                              >
                                <span
                                  className={'w-2 h-2 rounded-full ' + c.dot}
                                />
                                {dom.nome}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-1 py-1 text-right whitespace-nowrap">
                          <button
                            onClick={() =>
                              setEditandoEstaca({ idx, dados: { ...e } })
                            }
                            className="text-blue-600 hover:text-blue-800 mr-1.5"
                            title="Editar"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => setConfirmarRemover(idx)}
                            className="text-red-500 hover:text-red-700"
                            title="Remover"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* CP-14 — Avisos A6 (dimensão fora da faixa usual). Informativo:
              NÃO impede a verificação da capacidade de carga. */}
          {(() => {
            const avisosA6 = estacas
              .map((e) => avaliarAlertaA6(e))
              .filter(Boolean);
            if (avisosA6.length === 0) return null;
            return (
              <div className="bg-amber-50 border border-amber-300 rounded p-2">
                <div className="text-xs font-bold text-amber-800 mb-1">
                  ⚠ Alerta A6 — dimensão de estaca fora da faixa usual (15–120 cm)
                </div>
                <ul className="text-xs text-amber-800 space-y-0.5">
                  {avisosA6.map((a, i) => (
                    <li key={i}>
                      <span className="font-mono font-bold">{a.estaca}</span>:{' '}
                      {a.mensagem}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })()}

          {/* Configurações globais de cálculo */}
          <PainelConfigCalculo
            config={config}
            setConfigGlobal={setConfigGlobal}
          />
        </div>

        {/* Coluna direita: mini-mapa (item 7 — espaço aumentado) */}
        <div className="xl:w-[520px] shrink-0 bg-white border border-slate-300 rounded">
          <div className="p-2 border-b border-slate-300 bg-slate-50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700">
              🗺 Mini-mapa de locação
            </h3>
            <button
              onClick={() => setMostrarCorte(true)}
              disabled={Object.keys(sondagens).length < 2 || estacas.length < 1}
              className="text-xs px-2 py-1 border border-slate-300 rounded bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              title={
                Object.keys(sondagens).length < 2 || estacas.length < 1
                  ? 'Requer ao menos 2 sondagens e 1 estaca'
                  : 'Abrir corte esquemático'
              }
            >
              📐 Corte esquemático
            </button>
          </div>
          <div className="p-2">
            <MiniMapaSVG
              sondagens={sondagens}
              estacas={estacas}
              furoCritico={furoCritico}
              furoCriticoPct={furoCriticoPct}
              elementoSelecionado={estado.ui?.elementoSelecionado ?? null}
              onSelecionar={selecionarElemento}
              dominiosObra={dominios}
            />
          </div>
        </div>
      </div>

      {/* Modal de edição/criação de estaca */}
      {editandoEstaca && (
        <ModalEditarEstaca
          dados={editandoEstaca.dados}
          isNovo={editandoEstaca.idx === -1}
          sondagens={sondagens}
          dominios={dominios}
          onSalvar={salvarEstaca}
          onCancelar={() => setEditandoEstaca(null)}
        />
      )}

      {/* Modal de confirmação de remoção */}
      {confirmarRemover !== null && (
        <ModalConfirmar
          titulo="Remover estaca"
          mensagem={
            <>
              Confirma a remoção da estaca{' '}
              <strong className="font-mono">
                {estacas[confirmarRemover]?.nome}
              </strong>
              ? Esta ação não pode ser desfeita.
            </>
          }
          rotuloConfirmar="Sim, remover"
          tipoConfirmar="perigo"
          onConfirmar={() => removerEstaca(confirmarRemover)}
          onCancelar={() => setConfirmarRemover(null)}
        />
      )}

      {/* Modal do corte esquemático (CP-13c) */}
      {mostrarCorte && (
        <ModalCorteEsquematico
          sondagens={sondagens}
          estacas={estacas}
          params={params}
          corteInicial={estado.obra.corteEsquematico}
          onPersistir={setCorteEsquematico}
          onFechar={() => setMostrarCorte(false)}
        />
      )}
    </div>
  );
}
