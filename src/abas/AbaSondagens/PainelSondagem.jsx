/* ============================================================================
 * PainelSondagem — edição completa de 1 sondagem
 *
 * Áreas:
 *   1. Cabeçalho (nome editável inline + status de validação + ações)
 *   2. Identificação do furo (cota topo, prof. final, critério, NA, coords)
 *   3. Tabela de leituras NSPT (profundidade, NSPT, solo, família)
 *   4. Modal de impenetrabilidade (quando NSPT > 50)
 *
 * Cópia funcional das linhas 3446-3868 do geospt_app.jsx. Mudanças:
 *   - `window.GeoSPT.validation.validarSondagem` → import explícito
 *   - SOLOS_PADRAO, SOLO_PARA_CODIGO, familiaDoSolo, validarCodigoSolo,
 *     bgClassPorFamilia, InputSoloCodigo via @/ aliases
 *   - Estrutura visual e comportamento: IDÊNTICOS
 *
 * Comentário crítico preservado: `digitandoSolo` é estado de digitação
 * SEPARADO do solo aplicado — permite digitar progressivamente "1" → "12" →
 * "123" sem aplicar prematuramente. Aplicação no onBlur/Enter/Tab.
 * ============================================================================ */

import React, { useState } from 'react';
import { useObra } from '@/state/ObraProvider';
import { GeoSPT } from '@/engine/geospt-engine';
import {
  SOLOS_PADRAO,
  SOLO_PARA_CODIGO,
  validarCodigoSolo,
  familiaDoSolo,
  bgClassPorFamilia,
} from '@/domain/solos';
import Banner from '@/components/ui/Banner';
import BotaoPrim from '@/components/ui/BotaoPrim';
import InputSoloCodigo from '@/components/inputs/InputSoloCodigo';
import PerfilGeotecnicoSVG from '@/components/viz/PerfilGeotecnicoSVG';
import ModalNsptImpenetravel from './ModalNsptImpenetravel';

const inputCls =
  'px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function PainelSondagem({ nome, sondagem, onRemover, onDuplicar }) {
  const { atualizarSondagem, renomearSondagem } = useObra();
  const [modalNspt, setModalNspt] = useState(null); // { idx, valor, profundidade_m }
  const [toastLocal, setToastLocal] = useState(null);
  const [modoSolo, setModoSolo] = useState('nome'); // 'nome' | 'codigo'
  const [mostrarHachuras, setMostrarHachuras] = useState(true);
  // Estado de digitação por linha (separado do solo aplicado, para permitir
  // digitar progressivamente "1" → "12" → "123" sem aplicar prematuramente)
  const [digitandoSolo, setDigitandoSolo] = useState({}); // { [idx]: "12" }

  const mostrarToast = (tipo, msg, durMs = 2500) => {
    setToastLocal({ tipo, msg });
    setTimeout(() => setToastLocal(null), durMs);
  };

  // Identificação
  const setCampo = (campo, valor) => {
    atualizarSondagem(nome, { [campo]: valor });
  };

  // ------- Leituras -------
  const leituras = sondagem.leituras || [];

  // Validação da sondagem (usa engine)
  const validacao = GeoSPT
    ? GeoSPT.validation.validarSondagem(sondagem, nome)
    : { erros: [], avisos: [] };

  const adicionarLeitura = () => {
    const proxProf =
      leituras.length === 0 ? 1 : leituras[leituras.length - 1].profundidade_m + 1;
    atualizarSondagem(nome, (s) => ({
      ...s,
      leituras: [
        ...(s.leituras || []),
        {
          profundidade_m: proxProf,
          nspt_real: 1,
          nspt_calculo: 1,
          impenetravel: false,
          solo: '',
          familia: null,
        },
      ],
    }));
  };

  const removerLeitura = (idx) => {
    atualizarSondagem(nome, (s) => ({
      ...s,
      leituras: s.leituras.filter((_, i) => i !== idx),
    }));
  };

  const atualizarLeitura = (idx, patch) => {
    atualizarSondagem(nome, (s) => ({
      ...s,
      leituras: s.leituras.map((l, i) => (i === idx ? { ...l, ...patch } : l)),
    }));
  };

  // Move os DADOS de uma leitura para cima/baixo, mantendo a coluna de
  // profundidade FIXA (a profundidade é a régua da sondagem; só os valores
  // — NSPT, solo, família, impenetrável — trocam de posição). dir: -1 sobe, +1 desce.
  const moverLeitura = (idx, dir) => {
    const alvo = idx + dir;
    atualizarSondagem(nome, (s) => {
      const arr = [...s.leituras];
      if (alvo < 0 || alvo >= arr.length) return s;
      const profA = arr[idx].profundidade_m;
      const profB = arr[alvo].profundidade_m;
      // troca os objetos e devolve a profundidade fixa a cada posição
      const tmp = arr[idx];
      arr[idx] = { ...arr[alvo], profundidade_m: profA };
      arr[alvo] = { ...tmp, profundidade_m: profB };
      return { ...s, leituras: arr };
    });
  };

  // Duplica uma leitura: insere uma cópia logo abaixo e renumera as
  // profundidades em sequência (1,2,3,…) para manter a régua consistente.
  const duplicarLeitura = (idx) => {
    atualizarSondagem(nome, (s) => {
      const arr = [...s.leituras];
      const copia = { ...arr[idx] };
      arr.splice(idx + 1, 0, copia);
      // renumera profundidades a partir da 1ª (mantém a régua sequencial)
      const base = arr.length > 0 ? arr[0].profundidade_m : 1;
      arr.forEach((l, i) => {
        l.profundidade_m = base + i;
      });
      return { ...s, leituras: arr };
    });
  };

  // Validação de NSPT digitado: aceita só inteiros 1-50; >50 dispara modal
  const handleNsptChange = (idx, valorStr) => {
    if (valorStr === '' || valorStr === null) {
      atualizarLeitura(idx, { nspt_real: null, nspt_calculo: null });
      return;
    }
    if (valorStr.includes('.') || valorStr.includes(',')) {
      mostrarToast('erro', 'NSPT deve ser inteiro (1 a 50).');
      return;
    }
    const n = parseInt(valorStr, 10);
    if (Number.isNaN(n)) {
      mostrarToast('erro', 'NSPT deve ser um número.');
      return;
    }
    if (n < 1) {
      mostrarToast('erro', 'NSPT mínimo é 1.');
      return;
    }
    if (n > 50) {
      setModalNspt({
        idx,
        valor: n,
        profundidade_m: leituras[idx].profundidade_m,
      });
      return;
    }
    atualizarLeitura(idx, {
      nspt_real: n,
      nspt_calculo: n,
      impenetravel: false,
    });
  };

  const confirmarImpenetravel = () => {
    if (!modalNspt) return;
    atualizarLeitura(modalNspt.idx, {
      nspt_real: modalNspt.valor,
      nspt_calculo: 50,
      impenetravel: true,
    });
    setModalNspt(null);
    mostrarToast(
      'ok',
      'Impenetrabilidade registrada (real=' +
        modalNspt.valor +
        ', cálculo=50).'
    );
  };

  return (
    <div className="p-4 max-w-7xl">
      {/* Cabeçalho do painel */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <input
              type="text"
              defaultValue={nome}
              onBlur={(e) => {
                const novo = e.target.value.trim();
                if (novo && novo !== nome) renomearSondagem(nome, novo);
                else e.target.value = nome;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.target.blur();
                if (e.key === 'Escape') {
                  e.target.value = nome;
                  e.target.blur();
                }
              }}
              className="text-lg font-bold text-slate-800 font-mono bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none px-1 rounded"
              style={{ minWidth: '120px' }}
            />
          </div>
          <div className="text-xs text-slate-500">
            {validacao.erros.length === 0 && validacao.avisos.length === 0 ? (
              <span className="text-green-700">✓ Sondagem válida</span>
            ) : (
              <span>
                {validacao.erros.length > 0 && (
                  <span className="text-red-700">
                    ⚠ {validacao.erros.length} erro(s)
                  </span>
                )}
                {validacao.erros.length > 0 && validacao.avisos.length > 0 && ' · '}
                {validacao.avisos.length > 0 && (
                  <span className="text-amber-700">
                    {validacao.avisos.length} aviso(s)
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <BotaoPrim tipo="secundario" onClick={onDuplicar}>
            Duplicar
          </BotaoPrim>
          <BotaoPrim tipo="secundario" onClick={onRemover}>
            Remover
          </BotaoPrim>
        </div>
      </div>

      {/* Identificação do furo */}
      <div className="bg-slate-50 border border-slate-200 rounded p-3 mb-3">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-slate-600 block mb-0.5">
              Cota de boca (m)
            </label>
            <input
              type="number"
              step="0.001"
              value={sondagem.cotaTopo_m ?? ''}
              onChange={(e) =>
                setCampo(
                  'cotaTopo_m',
                  e.target.value === '' ? null : parseFloat(e.target.value)
                )
              }
              className={inputCls + ' w-full'}
            />
          </div>
          <div>
            <label className="text-xs text-slate-600 block mb-0.5">
              Profundidade final (m)
            </label>
            <input
              type="number"
              step="0.1"
              value={sondagem.profundidadeFinal_m ?? ''}
              onChange={(e) =>
                setCampo(
                  'profundidadeFinal_m',
                  e.target.value === '' ? null : parseFloat(e.target.value)
                )
              }
              className={inputCls + ' w-full'}
            />
          </div>
          <div>
            <label className="text-xs text-slate-600 block mb-0.5">
              Critério de paralisação
            </label>
            <select
              value={sondagem.criterioParalisacao}
              onChange={(e) => setCampo('criterioParalisacao', e.target.value)}
              className={inputCls + ' w-full'}
            >
              <option value="impenetravel">Impenetrável</option>
              <option value="solicitacao_contratante">
                Solicitação do contratante
              </option>
              <option value="outro">Outro</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-600 block mb-0.5">
              NA inicial (m)
            </label>
            <input
              type="number"
              step="0.1"
              value={sondagem.naInicial_m ?? ''}
              onChange={(e) =>
                setCampo(
                  'naInicial_m',
                  e.target.value === '' ? null : parseFloat(e.target.value)
                )
              }
              className={inputCls + ' w-full'}
              placeholder="—"
            />
          </div>
          <div>
            <label className="text-xs text-slate-600 block mb-0.5">
              NA final (m)
            </label>
            <input
              type="number"
              step="0.1"
              value={sondagem.naFinal_m ?? ''}
              onChange={(e) =>
                setCampo(
                  'naFinal_m',
                  e.target.value === '' ? null : parseFloat(e.target.value)
                )
              }
              className={inputCls + ' w-full'}
              placeholder="—"
            />
          </div>
          <div>
            <label className="text-xs text-slate-600 block mb-0.5">
              Coordenadas (x, y)
            </label>
            <div className="flex gap-1">
              <input
                type="number"
                step="0.1"
                value={sondagem.coordenadas?.x ?? ''}
                onChange={(e) =>
                  setCampo('coordenadas', {
                    ...(sondagem.coordenadas || {}),
                    x:
                      e.target.value === ''
                        ? null
                        : parseFloat(e.target.value),
                  })
                }
                placeholder="x"
                className={inputCls + ' w-1/2'}
              />
              <input
                type="number"
                step="0.1"
                value={sondagem.coordenadas?.y ?? ''}
                onChange={(e) =>
                  setCampo('coordenadas', {
                    ...(sondagem.coordenadas || {}),
                    y:
                      e.target.value === ''
                        ? null
                        : parseFloat(e.target.value),
                  })
                }
                placeholder="y"
                className={inputCls + ' w-1/2'}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de leituras */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-slate-700">
          Leituras NSPT ({leituras.length})
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setModoSolo(modoSolo === 'nome' ? 'codigo' : 'nome')}
            className="px-2 py-1 text-xs font-medium bg-slate-200 hover:bg-slate-300 text-slate-800 rounded transition-colors flex items-center gap-1"
            title="Alternar entre nome do solo e código numérico"
          >
            ⇄ Modo: <strong>{modoSolo === 'nome' ? 'nome' : 'código'}</strong>
          </button>
          <BotaoPrim tipo="secundario" onClick={adicionarLeitura}>
            + Adicionar leitura
          </BotaoPrim>
        </div>
      </div>

      {/* Legenda dos códigos (visível em modo código) */}
      {modoSolo === 'codigo' && (
        <div className="mb-2 bg-blue-50 border border-blue-200 rounded p-2 text-xs">
          <div className="font-bold text-blue-900 mb-1">
            Códigos de solo (padrão 1/2/3):
          </div>
          <div className="text-slate-700 mb-1.5">
            <span className="font-bold text-amber-700">1</span> = Areia{' '}
            <span className="text-slate-400">(Granular)</span>
            <span className="mx-2 text-slate-400">·</span>
            <span className="font-bold text-purple-700">2</span> = Silte{' '}
            <span className="text-slate-400">(Intermediário)</span>
            <span className="mx-2 text-slate-400">·</span>
            <span className="font-bold text-blue-700">3</span> = Argila{' '}
            <span className="text-slate-400">(Coesivo)</span>
          </div>
          <div className="grid grid-cols-3 gap-x-3 gap-y-0.5 font-mono">
            {Object.keys(SOLO_PARA_CODIGO).map((solo) => {
              const cod = SOLO_PARA_CODIGO[solo];
              const fam = familiaDoSolo(solo);
              const corFam =
                fam === 'Coesivo'
                  ? 'text-blue-700'
                  : fam === 'Granular'
                  ? 'text-amber-700'
                  : 'text-purple-700';
              return (
                <div key={solo} className="flex gap-1.5 items-baseline">
                  <span className={'font-bold ' + corFam + ' w-8 text-right'}>
                    {cod}
                  </span>
                  <span className="text-slate-700">{solo}</span>
                </div>
              );
            })}
          </div>
          <div className="text-slate-500 mt-1.5 text-[10px]">
            Lógica: 1º dígito = solo dominante. Dígitos seguintes = adjetivos
            (ordem do mais relevante para o menos). Ex.:{' '}
            <span className="font-mono">321</span> ={' '}
            <strong>3</strong> argila + <strong>2</strong> silto +{' '}
            <strong>1</strong> arenosa = Argila Silto-Arenosa. O solo é
            aplicado ao sair do campo (Tab ou clique fora).
          </div>
        </div>
      )}

      <div className="flex flex-col xl:flex-row gap-3">
        {/* Tabela de leituras */}
        <div
          className="flex-1 bg-white border border-slate-300 rounded overflow-auto"
          style={{ maxHeight: '720px' }}
        >
          <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
          <thead className="bg-slate-100 sticky top-0">
            <tr className="text-left text-xs text-slate-700 uppercase tracking-wide">
              <th className="px-1.5 py-2 w-10">#</th>
              <th className="px-1.5 py-2 w-16">Prof. (m)</th>
              <th className="px-1.5 py-2 w-16">Cota (m)</th>
              <th className="px-1.5 py-2 w-16">NSPT</th>
              <th className="px-1.5 py-2 w-36">
                Solo{' '}
                {modoSolo === 'codigo' && (
                  <span className="text-slate-500 normal-case">(código)</span>
                )}
              </th>
              <th className="px-1.5 py-2 w-20">Família</th>
              <th className="px-1.5 py-2 w-28"></th>
            </tr>
          </thead>
          <tbody>
            {leituras.map((l, idx) => {
              const cota =
                sondagem.cotaTopo_m !== null && l.profundidade_m !== null
                  ? (sondagem.cotaTopo_m - l.profundidade_m).toFixed(3)
                  : '—';
              const familia = familiaDoSolo(l.solo);
              const linhaBg = !l.solo
                ? 'bg-amber-50'
                : l.nspt_real === null || l.nspt_real === undefined
                ? 'bg-red-50'
                : bgClassPorFamilia(familia);
              return (
                <tr key={idx} className={'border-t border-slate-200 ' + linhaBg}>
                  <td className="px-1.5 py-1 text-slate-500 text-xs">{idx + 1}</td>
                  <td className="px-1 py-1">
                    <input
                      type="number"
                      step="0.1"
                      value={l.profundidade_m ?? ''}
                      onChange={(e) =>
                        atualizarLeitura(idx, {
                          profundidade_m: parseFloat(e.target.value),
                        })
                      }
                      className={inputCls + ' w-full text-xs'}
                    />
                  </td>
                  <td className="px-1.5 py-1 text-slate-600 font-mono text-[11px]">
                    {cota}
                  </td>
                  <td className="px-1 py-1">
                    <div className="flex items-center gap-0.5">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={l.nspt_real ?? ''}
                        onChange={(e) => handleNsptChange(idx, e.target.value)}
                        className={
                          inputCls +
                          ' w-10 text-xs ' +
                          (l.impenetravel ? 'font-bold' : '')
                        }
                      />
                      {l.impenetravel && (
                        <span
                          className="text-amber-700 font-bold"
                          title={
                            'NSPT real=' +
                            l.nspt_real +
                            ', cálculo=50, impenetrável'
                          }
                        >
                          ★
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-1 py-1">
                    {modoSolo === 'nome' ? (
                      <select
                        value={l.solo || ''}
                        onChange={(e) => {
                          const novo = e.target.value;
                          atualizarLeitura(idx, {
                            solo: novo,
                            familia: familiaDoSolo(novo),
                          });
                        }}
                        className={inputCls + ' w-full text-xs'}
                        title={l.solo || ''}
                        style={{ textOverflow: 'ellipsis' }}
                      >
                        <option value="">— selecione —</option>
                        {SOLOS_PADRAO.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <InputSoloCodigo
                        idx={idx}
                        soloAtual={l.solo}
                        rascunho={digitandoSolo[idx]}
                        onRascunhoChange={(novoRascunho) => {
                          setDigitandoSolo((d) => ({
                            ...d,
                            [idx]: novoRascunho,
                          }));
                        }}
                        onAplicar={(codigoFinal) => {
                          const v = validarCodigoSolo(codigoFinal);
                          if (v.valido) {
                            atualizarLeitura(idx, {
                              solo: v.solo,
                              familia: familiaDoSolo(v.solo),
                            });
                          }
                          setDigitandoSolo((d) => {
                            const novo = { ...d };
                            delete novo[idx];
                            return novo;
                          });
                        }}
                        onLimpar={() => {
                          atualizarLeitura(idx, { solo: '', familia: null });
                          setDigitandoSolo((d) => {
                            const novo = { ...d };
                            delete novo[idx];
                            return novo;
                          });
                        }}
                      />
                    )}
                  </td>
                  <td
                    className="px-1.5 py-1 text-xs text-slate-700 truncate"
                    title={familia || ''}
                  >
                    {familia === 'Intermediário'
                      ? 'Intermed.'
                      : familia || <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-1.5 py-1 text-center whitespace-nowrap">
                    <div className="inline-flex items-center gap-0.5">
                      <button
                        onClick={() => moverLeitura(idx, -1)}
                        disabled={idx === 0}
                        className="text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-default text-sm px-0.5"
                        title="Mover dados para cima"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moverLeitura(idx, 1)}
                        disabled={idx === leituras.length - 1}
                        className="text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-default text-sm px-0.5"
                        title="Mover dados para baixo"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => duplicarLeitura(idx)}
                        className="text-slate-400 hover:text-blue-600 text-sm px-0.5"
                        title="Duplicar leitura"
                      >
                        ⧉
                      </button>
                      <button
                        onClick={() => removerLeitura(idx)}
                        className="text-red-500 hover:text-red-700 text-sm px-0.5"
                        title="Remover leitura"
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>

        {/* Perfil geotécnico SVG ao lado */}
        <div className="xl:w-[460px] shrink-0 bg-white border border-slate-300 rounded p-2 flex flex-col">
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="text-sm font-bold text-slate-700">Perfil geotécnico</h3>
            <label className="flex items-center gap-1 text-xs text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={mostrarHachuras}
                onChange={(e) => setMostrarHachuras(e.target.checked)}
                className="h-3 w-3"
              />
              Hachuras
            </label>
          </div>
          <div className="overflow-auto flex-1">
            <PerfilGeotecnicoSVG
              sondagem={sondagem}
              nome={nome}
              mostrarHachuras={mostrarHachuras}
              largura={440}
              prefixoPattern="aba2-"
            />
          </div>
        </div>
      </div>

      {/* Erros/avisos detalhados */}
      {(validacao.erros.length > 0 || validacao.avisos.length > 0) && (
        <div className="mt-3 space-y-1">
          {validacao.erros.map((er, i) => (
            <div
              key={'e' + i}
              className="text-xs bg-red-50 border-l-4 border-red-500 px-2 py-1 text-red-900"
            >
              ⛔ {er}
            </div>
          ))}
          {validacao.avisos.map((av, i) => (
            <div
              key={'a' + i}
              className="text-xs bg-amber-50 border-l-4 border-amber-500 px-2 py-1 text-amber-900"
            >
              ⚠ {av}
            </div>
          ))}
        </div>
      )}

      {/* Modal NSPT > 50 */}
      {modalNspt && (
        <ModalNsptImpenetravel
          valor={modalNspt.valor}
          profundidade_m={modalNspt.profundidade_m}
          onConfirmar={confirmarImpenetravel}
          onCancelar={() => setModalNspt(null)}
        />
      )}

      {/* Toast local */}
      {toastLocal && (
        <div className="fixed bottom-16 right-4 z-50 max-w-md shadow-lg">
          <Banner tipo={toastLocal.tipo}>{toastLocal.msg}</Banner>
        </div>
      )}
    </div>
  );
}
