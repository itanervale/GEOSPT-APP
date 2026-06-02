/* ============================================================================
 * ModalCorteEsquematico — corte esquemático estaca + sondagens (CP-13c/d)
 * SPEC commit 8.
 *
 * CP-13c (esta entrega): FLUXO DE SELEÇÃO apenas.
 *   - Modal fullscreen, 2 colunas (40% mini-mapa de seleção / 60% sequência)
 *   - Clicar em furo/estaca no mini-mapa adiciona ao fim da sequência (ordem)
 *   - Lista ordenável: subir / descer / remover
 *   - Botões: "Selecionar todos os furos", "todas as estacas", "Limpar tudo"
 *   - Validação: mínimo 1 estaca + 2 sondagens; máximo 10 itens
 *   - Onde entrará o SVG do corte (CP-13d): placeholder
 *
 * CP-13d: desenho do corte + 5 toggles + exportar SVG, consumindo
 *   exportar SVG, consumindo casamentoCamadas.processarSequenciaFuros.
 *
 * Props:
 *   sondagens — { nome → sondagem }
 *   estacas   — [estaca]
 *   onFechar  — () => void
 * ============================================================================ */

import React, { useState, useMemo } from 'react';
import BotaoPrim from '@/components/ui/BotaoPrim';
import MiniMapaSelecao from './MiniMapaSelecao';
import CorteEsquematicoSVG from './CorteEsquematicoSVG';
import { prepararPerfilCalculo } from '@/abas/AbaCapacidade/prepararPerfilCalculo';
import {
  encontrarCotaSugeridaConservadora,
  construirOpcoesCalculo,
} from '@/abas/AbaCapacidade/calculoHelpers';
import { GeoSPT } from '@/engine/geospt-engine';

const MAX_ITENS = 10;
const MIN_ESTACAS = 1;
const MIN_FUROS = 2;

export default function ModalCorteEsquematico({
  sondagens,
  estacas,
  params,
  corteInicial,
  onPersistir,
  onFechar,
}) {
  // Inicializa a sequência do estado persistido, filtrando itens que não
  // existem mais (furo/estaca removido depois de salvo).
  const sequenciaInicial = (corteInicial?.sequencia || []).filter((it) => {
    if (it.tipo === 'furo') return !!sondagens[it.nome];
    return (estacas || []).some((e) => e.nome === it.nome);
  });
  const [sequencia, setSequencia] = useState(sequenciaInicial);

  // Toggles: do estado persistido, com defaults. (bulbo removido — CP-13d ajuste)
  const [toggles, setToggles] = useState({
    mostrarNspt: true,
    ligarCamadas: false,
    ligarHachuras: false,
    preservarMergulho: true,
    mostrarMediaTopos: true,
    perfilInterpretado: false,
    mostrarTerreno: true,
    mostrarNA: true,
    mostrarSemSPT: true,
    ...(corteInicial?.toggles || {}),
  });
  const setToggle = (chave) =>
    setToggles((t) => ({ ...t, [chave]: !t[chave] }));

  // Modo de visão: 'selecao' (edita itens) | 'desenho' (corte em tela cheia)
  const [modoVisao, setModoVisao] = useState(
    sequenciaInicial.length > 0 ? 'desenho' : 'selecao'
  );

  // Fecha persistindo a seleção atual no estado da obra
  const fecharEPersistir = () => {
    if (onPersistir) {
      onPersistir({ sequencia, toggles });
    }
    onFechar();
  };

  // Índice de ordem (1-based) de um item na sequência, ou 0 se ausente.
  const ordemDe = (tipo, nome) => {
    const i = sequencia.findIndex(
      (it) => it.tipo === tipo && it.nome === nome
    );
    return i === -1 ? 0 : i + 1;
  };

  // Furos ordenados por nome (para a lista de seleção)
  const nomesFurosOrdenados = useMemo(
    () => Object.keys(sondagens || {}).sort(),
    [sondagens]
  );

  const toggle = (tipo, nome) => {
    setSequencia((seq) => {
      const i = seq.findIndex((it) => it.tipo === tipo && it.nome === nome);
      if (i !== -1) {
        // remove
        return seq.filter((_, idx) => idx !== i);
      }
      // adiciona ao fim (respeitando o máximo)
      if (seq.length >= MAX_ITENS) return seq;
      return [...seq, { tipo, nome }];
    });
  };

  const mover = (idx, delta) => {
    setSequencia((seq) => {
      const j = idx + delta;
      if (j < 0 || j >= seq.length) return seq;
      const novo = [...seq];
      [novo[idx], novo[j]] = [novo[j], novo[idx]];
      return novo;
    });
  };

  const remover = (idx) =>
    setSequencia((seq) => seq.filter((_, i) => i !== idx));

  const selecionarTodosFuros = () => {
    setSequencia((seq) => {
      const nomesFuro = Object.keys(sondagens || {});
      const jaTem = new Set(
        seq.filter((it) => it.tipo === 'furo').map((it) => it.nome)
      );
      let next = [...seq];
      for (const nome of nomesFuro) {
        if (next.length >= MAX_ITENS) break;
        if (!jaTem.has(nome)) next.push({ tipo: 'furo', nome });
      }
      return next;
    });
  };

  const selecionarTodasEstacas = () => {
    setSequencia((seq) => {
      const jaTem = new Set(
        seq.filter((it) => it.tipo === 'estaca').map((it) => it.nome)
      );
      let next = [...seq];
      for (const e of estacas || []) {
        if (next.length >= MAX_ITENS) break;
        if (!jaTem.has(e.nome)) next.push({ tipo: 'estaca', nome: e.nome });
      }
      return next;
    });
  };

  const limparTudo = () => setSequencia([]);

  // Validação
  const nFuros = sequencia.filter((it) => it.tipo === 'furo').length;
  const nEstacas = sequencia.filter((it) => it.tipo === 'estaca').length;
  const validacao = useMemo(() => {
    const erros = [];
    if (nEstacas < MIN_ESTACAS)
      erros.push('Selecione ao menos ' + MIN_ESTACAS + ' estaca.');
    if (nFuros < MIN_FUROS)
      erros.push('Selecione ao menos ' + MIN_FUROS + ' sondagens.');
    return { ok: erros.length === 0, erros };
  }, [nFuros, nEstacas]);

  const labelItem = (it) => {
    if (it.tipo === 'furo') {
      const s = sondagens[it.nome];
      const topo = s?.cotaTopo_m;
      return {
        icone: '▲',
        cor: 'text-sky-600',
        nome: it.nome,
        detalhe: topo != null ? 'topo ' + topo.toFixed(2) + ' m' : '',
      };
    }
    const e = (estacas || []).find((x) => x.nome === it.nome);
    return {
      icone: '◆',
      cor: 'text-slate-700',
      nome: it.nome,
      detalhe: e?.tipoEstaca ? e.tipoEstaca : '',
    };
  };

  // Sondagens da sequência (subset usado para o cálculo da ponta das estacas).
  // Usa os furos efetivamente selecionados; se nenhum, cai para todos.
  const sondagensDaSequencia = useMemo(() => {
    const nomesFuroSeq = sequencia
      .filter((it) => it.tipo === 'furo')
      .map((it) => it.nome);
    if (nomesFuroSeq.length === 0) return sondagens;
    const sub = {};
    nomesFuroSeq.forEach((n) => {
      if (sondagens[n]) sub[n] = sondagens[n];
    });
    return sub;
  }, [sequencia, sondagens]);

  // CP-13d.2 / CP-13e (#5) — resolve a PONTA + resultados da estaca.
  // Estados (decisão do usuário):
  //   'sem_carga'  → carga prevista ausente (dado incompleto, não é falha)
  //   'sem_perfil' → não há perfil/memorial (dado insuficiente)
  //   'sem_cota'   → nenhuma cota atende a carga (falha técnica)
  //   'erro'       → exceção no cálculo (erro operacional)
  //   'ok'         → tem solução; cotaPonta + Qadm + margem
  const resolverPontaEstaca = (estaca) => {
    // sem_carga: carga ausente, zero, negativa ou não-finita → dado incompleto
    // (NÃO é falha técnica). Cobre null, undefined, 0, '' (NaN após Number).
    const carga = Number(estaca.cargaPrevista_tf);
    if (
      estaca.cargaPrevista_tf == null ||
      estaca.cargaPrevista_tf === '' ||
      !Number.isFinite(carga) ||
      carga <= 0
    ) {
      return { estado: 'sem_carga', temSolucao: false, cotaPonta_m: null };
    }
    if (!params || !GeoSPT) {
      return { estado: 'erro', temSolucao: false, cotaPonta_m: null, motivo: 'sem parâmetros' };
    }
    try {
      const prep = prepararPerfilCalculo({
        modo: 'envoltoria',
        submodo: null,
        sondagens: sondagensDaSequencia,
        estaca,
        params,
      });
      if (prep.erro || !prep.perfilParaCalculo) {
        return { estado: 'sem_perfil', temSolucao: false, cotaPonta_m: null, motivo: prep.erro || 'sem perfil' };
      }
      const opcoes = construirOpcoesCalculo(estaca, params);
      const dq = GeoSPT.engine.calcularDQ(prep.perfilParaCalculo, opcoes);
      const av = GeoSPT.engine.calcularAV(prep.perfilParaCalculo, opcoes);
      const sug = encontrarCotaSugeridaConservadora(
        dq.memorial,
        av.memorial,
        estaca.cargaPrevista_tf
      );
      if (!sug || sug.cota_m == null || sug.ambosAtendem === false) {
        // nenhuma cota onde ambos atendem a carga → falha técnica
        return { estado: 'sem_cota', temSolucao: false, cotaPonta_m: null };
      }
      // Qadm regente = menor entre DQ e AV na cota sugerida
      const qDq = sug.dq?.Qadm_final_tf;
      const qAv = sug.av?.Qadm_final_tf;
      const qAdm =
        qDq != null && qAv != null
          ? Math.min(qDq, qAv)
          : qDq ?? qAv ?? null;
      const margem =
        qAdm != null ? qAdm - estaca.cargaPrevista_tf : null;
      return {
        estado: 'ok',
        temSolucao: true,
        cotaPonta_m: sug.cota_m,
        regente: sug.regente,
        qAdm_tf: qAdm,
        carga_tf: estaca.cargaPrevista_tf,
        margem_tf: margem,
      };
    } catch (e) {
      return { estado: 'erro', temSolucao: false, cotaPonta_m: null, motivo: e.message };
    }
  };

  // CP-13d — itens resolvidos para o SVG: enriquece a sequência com cotas e
  // coordenadas. Estacas recebem cotaPonta_m (cota sugerida do Modo 1) e
  // temSolucao (false → SVG desenha até o fundo + marca).
  const itensParaDesenho = useMemo(() => {
    return sequencia
      .map((it) => {
        if (it.tipo === 'furo') {
          const s = sondagens[it.nome];
          if (!s) return null;
          return {
            tipo: 'furo',
            nome: it.nome,
            cotaTopo_m: s.cotaTopo_m,
            x: s.coordenadas?.x,
            y: s.coordenadas?.y,
            leituras: s.leituras,
            naInicial_m: s.naInicial_m,
            naFinal_m: s.naFinal_m,
          };
        }
        const e = (estacas || []).find((x) => x.nome === it.nome);
        if (!e) return null;
        const r = resolverPontaEstaca(e);
        return {
          tipo: 'estaca',
          nome: it.nome,
          cotaArrasamento_m: e.cotaArrasamento_m,
          diametro_m: e.diametro_m,
          tipoEstaca: e.tipoEstaca,
          cargaPrevista_tf: e.cargaPrevista_tf,
          x: e.coordenadas?.x,
          y: e.coordenadas?.y,
          cotaPonta_m: r.cotaPonta_m,
          temSolucao: r.temSolucao,
          estado: r.estado,
          regente: r.regente,
          qAdm_tf: r.qAdm_tf,
          margem_tf: r.margem_tf,
          motivoSemSolucao: r.motivo,
        };
      })
      .filter(Boolean);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sequencia, sondagens, estacas, sondagensDaSequencia, params]);

  const exportarSVG = () => {
    const svgEl = document.getElementById('corte-esquematico-svg');
    if (!svgEl) return;
    const serializer = new XMLSerializer();
    let fonte = serializer.serializeToString(svgEl);
    if (!fonte.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
      fonte = fonte.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    const blob = new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n' + fonte], {
      type: 'image/svg+xml;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'corte-esquematico.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Definição dos 5 toggles (rótulo + chave)
  const TOGGLES_DEF = [
    { chave: 'perfilInterpretado', label: 'Perfil interpretado (preenchido)' },
    { chave: 'mostrarNspt', label: 'Mostrar NSPTs' },
    { chave: 'ligarCamadas', label: 'Ligar camadas' },
    { chave: 'ligarHachuras', label: 'Ligar hachuras' },
    { chave: 'preservarMergulho', label: 'Preservar mergulho real' },
    { chave: 'mostrarMediaTopos', label: 'Mostrar média dos topos' },
    { chave: 'mostrarTerreno', label: 'Superfície do terreno' },
    { chave: 'mostrarNA', label: "Nível d'água" },
    { chave: 'mostrarSemSPT', label: 'Trecho sem SPT' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-stretch justify-center p-3">
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-6xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
          <h3 className="text-base font-bold text-slate-800">
            📐 Corte esquemático
            {modoVisao === 'desenho' ? ' — desenho' : ' — seleção de itens'}
          </h3>
          <div className="flex items-center gap-2">
            {/* Alternância de modo (só quando a seleção é válida) */}
            {validacao.ok &&
              (modoVisao === 'desenho' ? (
                <button
                  onClick={() => setModoVisao('selecao')}
                  className="text-xs px-2 py-1 border border-slate-300 rounded bg-white hover:bg-slate-100"
                >
                  ✏ Editar seleção
                </button>
              ) : (
                <button
                  onClick={() => setModoVisao('desenho')}
                  className="text-xs px-2 py-1 border border-sky-400 rounded bg-sky-50 text-sky-700 hover:bg-sky-100 font-medium"
                >
                  📐 Ver corte (tela cheia) →
                </button>
              ))}
            <button
              onClick={fecharEPersistir}
              className="text-slate-400 hover:text-slate-700 text-xl leading-none px-2"
              title="Fechar (salva a seleção)"
            >
              ×
            </button>
          </div>
        </div>

        {/* Corpo: alterna entre modo seleção (2 colunas) e modo desenho (tela cheia) */}
        {modoVisao === 'desenho' && validacao.ok ? (
          /* ---- MODO DESENHO: corte em largura total ---- */
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-2 border-b border-slate-200 shrink-0">
              {/* toggles */}
              <div className="flex flex-wrap gap-3 items-center">
                {TOGGLES_DEF.map((t) => (
                  <label
                    key={t.chave}
                    className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={toggles[t.chave]}
                      onChange={() => setToggle(t.chave)}
                    />
                    {t.label}
                  </label>
                ))}
                <button
                  onClick={exportarSVG}
                  className="ml-auto text-xs px-2 py-1 border border-slate-300 rounded bg-white hover:bg-slate-100"
                >
                  ⬇ Exportar SVG
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-3">
              <CorteEsquematicoSVG
                itens={itensParaDesenho}
                toggles={toggles}
              />
            </div>
          </div>
        ) : (
        /* ---- MODO SELEÇÃO: 2 colunas ---- */
        <div className="flex-1 flex overflow-hidden">
          {/* Esquerda: mini-mapa + lista de seleção */}
          <div className="w-1/2 border-r border-slate-200 p-3 overflow-y-auto">
            <div className="text-xs font-semibold text-slate-600 mb-2">
              Clique no mini-mapa ou na lista para adicionar/remover
            </div>
            <MiniMapaSelecao
              sondagens={sondagens}
              estacas={estacas}
              sequencia={sequencia}
              onToggle={toggle}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={selecionarTodosFuros}
                className="text-xs px-2 py-1 border border-slate-300 rounded hover:bg-slate-50"
              >
                + Todos os furos
              </button>
              <button
                onClick={selecionarTodasEstacas}
                className="text-xs px-2 py-1 border border-slate-300 rounded hover:bg-slate-50"
              >
                + Todas as estacas
              </button>
              <button
                onClick={limparTudo}
                className="text-xs px-2 py-1 border border-slate-300 rounded hover:bg-slate-50 text-red-600"
              >
                Limpar tudo
              </button>
            </div>

            {/* Lista de seleção por clique (resolve sobreposição no mapa) */}
            <div className="mt-3 border-t border-slate-200 pt-2">
              <div className="text-xs font-semibold text-slate-600 mb-1">
                Ou selecione pela lista (clique para adicionar/remover)
              </div>

              {/* Grupo: Furos */}
              <div className="text-[11px] font-semibold text-sky-700 uppercase tracking-wide mt-2 mb-1">
                Furos ({nomesFurosOrdenados.length})
              </div>
              {nomesFurosOrdenados.length === 0 ? (
                <div className="text-xs text-slate-400 italic">
                  Nenhuma sondagem cadastrada.
                </div>
              ) : (
                <ul className="space-y-0.5">
                  {nomesFurosOrdenados.map((nome) => {
                    const ordem = ordemDe('furo', nome);
                    const sel = ordem > 0;
                    const topo = sondagens[nome]?.cotaTopo_m;
                    return (
                      <li key={'furo:' + nome}>
                        <button
                          onClick={() => toggle('furo', nome)}
                          className={
                            'w-full flex items-center gap-2 px-2 py-1 rounded text-sm text-left transition ' +
                            (sel
                              ? 'bg-green-50 border border-green-300'
                              : 'bg-white border border-slate-200 hover:bg-slate-50')
                          }
                        >
                          {sel ? (
                            <span className="w-5 h-5 rounded-full bg-green-600 text-white text-xs flex items-center justify-center shrink-0">
                              {ordem}
                            </span>
                          ) : (
                            <span className="w-5 h-5 shrink-0 text-sky-600 text-center">
                              ▲
                            </span>
                          )}
                          <span className="font-medium text-slate-800">
                            {nome}
                          </span>
                          {topo != null && (
                            <span className="text-xs text-slate-500 ml-auto">
                              topo {topo.toFixed(2)} m
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Grupo: Estacas */}
              <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide mt-3 mb-1">
                Estacas ({(estacas || []).length})
              </div>
              {(estacas || []).length === 0 ? (
                <div className="text-xs text-slate-400 italic">
                  Nenhuma estaca cadastrada.
                </div>
              ) : (
                <ul className="space-y-0.5">
                  {(estacas || []).map((e) => {
                    const ordem = ordemDe('estaca', e.nome);
                    const sel = ordem > 0;
                    return (
                      <li key={'estaca:' + e.nome}>
                        <button
                          onClick={() => toggle('estaca', e.nome)}
                          className={
                            'w-full flex items-center gap-2 px-2 py-1 rounded text-sm text-left transition ' +
                            (sel
                              ? 'bg-green-50 border border-green-300'
                              : 'bg-white border border-slate-200 hover:bg-slate-50')
                          }
                        >
                          {sel ? (
                            <span className="w-5 h-5 rounded-full bg-green-600 text-white text-xs flex items-center justify-center shrink-0">
                              {ordem}
                            </span>
                          ) : (
                            <span className="w-5 h-5 shrink-0 text-slate-700 text-center">
                              ◆
                            </span>
                          )}
                          <span className="font-medium text-slate-800">
                            {e.nome}
                          </span>
                          {e.tipoEstaca && (
                            <span className="text-xs text-slate-500 ml-auto">
                              {e.tipoEstaca}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Direita: sequência ordenável */}
          <div className="w-1/2 flex flex-col overflow-hidden">
            <div className="p-3 overflow-y-auto flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-600">
                  Sequência ({sequencia.length}/{MAX_ITENS}) — {nEstacas} estaca(s),{' '}
                  {nFuros} furo(s)
                </span>
              </div>

              {sequencia.length === 0 ? (
                <div className="text-sm text-slate-400 py-6 text-center border border-dashed border-slate-200 rounded">
                  Nenhum item selecionado. Clique no mini-mapa ou na lista à
                  esquerda.
                </div>
              ) : (
                <ul className="space-y-1">
                  {sequencia.map((it, idx) => {
                    const L = labelItem(it);
                    return (
                      <li
                        key={it.tipo + ':' + it.nome}
                        className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm"
                      >
                        <span className="w-5 h-5 rounded-full bg-green-600 text-white text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className={L.cor}>{L.icone}</span>
                        <span className="font-medium text-slate-800">
                          {L.nome}
                        </span>
                        <span className="text-xs text-slate-500">
                          {L.detalhe}
                        </span>
                        <div className="ml-auto flex items-center gap-1">
                          <button
                            onClick={() => mover(idx, -1)}
                            disabled={idx === 0}
                            className="px-1.5 py-0.5 text-xs border border-slate-300 rounded disabled:opacity-30 hover:bg-white"
                            title="Subir"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => mover(idx, 1)}
                            disabled={idx === sequencia.length - 1}
                            className="px-1.5 py-0.5 text-xs border border-slate-300 rounded disabled:opacity-30 hover:bg-white"
                            title="Descer"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => remover(idx)}
                            className="px-1.5 py-0.5 text-xs border border-slate-300 rounded text-red-600 hover:bg-white"
                            title="Remover"
                          >
                            ✕
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Validação */}
              {!validacao.ok && sequencia.length > 0 && (
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-900 space-y-0.5">
                  {validacao.erros.map((er, i) => (
                    <div key={i}>⚠ {er}</div>
                  ))}
                </div>
              )}

              {/* Quando a seleção fica válida, orienta ir ao modo desenho */}
              {validacao.ok ? (
                <div className="mt-4 border border-sky-200 bg-sky-50 rounded p-4 text-center text-sm text-sky-800">
                  Seleção válida: {nEstacas} estaca(s) + {nFuros} furo(s).
                  <div className="mt-2">
                    <button
                      onClick={() => setModoVisao('desenho')}
                      className="px-3 py-1.5 border border-sky-400 rounded bg-white text-sky-700 hover:bg-sky-100 font-medium text-sm"
                    >
                      📐 Ver corte (tela cheia) →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 border-2 border-dashed border-slate-200 rounded p-6 text-center text-sm text-slate-400">
                  O corte aparecerá quando a seleção for válida (mínimo 1 estaca +
                  2 furos).
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Rodapé */}
        <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            Mínimo: {MIN_ESTACAS} estaca + {MIN_FUROS} sondagens · máximo{' '}
            {MAX_ITENS} itens · a seleção é salva ao fechar
          </span>
          <button
            onClick={fecharEPersistir}
            className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
