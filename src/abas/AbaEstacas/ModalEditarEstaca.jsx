/* ============================================================================
 * ModalEditarEstaca — modal de adição/edição de estaca
 *
 * Props:
 *   dados     — objeto estaca em edição (cópia local, isolada do Context)
 *   isNovo    — boolean: true se cadastro novo, false se edição
 *   sondagens — para popular dropdown de domínios disponíveis
 *   onSalvar(d)  — callback com a estaca atualizada (após validação OK)
 *   onCancelar() — callback sem mudanças
 *
 * Validação:
 *   - Nome obrigatório
 *   - Tipo + Diâmetro obrigatórios
 *   - Diâmetro deve estar na lista válida para o tipo (engine valida tabela
 *     de carga estrutural)
 *   - Cota de arrasamento (se preenchida) passa por
 *     GeoSPT.validation.validarCotaArrasamento — engine valida regras como
 *     valor inteiro, presença na grade SPT etc.
 *
 * Importante:
 *   - Trocar tipo automaticamente ajusta diâmetro para 1º válido (evita ficar
 *     com diâmetro inválido após mudar o tipo)
 *   - Cota de arrasamento é INTEIRA (engine usa grade inteira). Decimal será
 *     adicionado no Commit 8 do roadmap original (CP-13).
 *
 * Extraído idêntico das linhas 5643-5823 do geospt_app.jsx. Mudanças:
 *   - window.GeoSPT → GeoSPT (import explícito)
 *   - Imports via @/ aliases
 * ============================================================================ */

import React, { useState } from 'react';
import { GeoSPT } from '@/engine/geospt-engine';
import {
  TIPOS_ESTACA,
  DIAMETROS_CM,
  diametrosValidosPara,
  cargaEstruturalDe,
} from '@/domain/estacas';
import BotaoPrim from '@/components/ui/BotaoPrim';
import { classesCor } from '@/state/dominiosHelper';

const inputCls =
  'px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function ModalEditarEstaca({
  dados,
  isNovo,
  sondagens,
  dominios = [],
  onSalvar,
  onCancelar,
}) {
  const [d, setD] = useState(dados);
  const [erros, setErros] = useState([]);

  const setCampo = (campo, valor) =>
    setD((prev) => ({ ...prev, [campo]: valor }));
  const setCoord = (eixo, valor) =>
    setD((prev) => ({
      ...prev,
      coordenadas: { ...(prev.coordenadas || {}), [eixo]: valor },
    }));

  const diametrosValidos = diametrosValidosPara(d.tipoEstaca);
  const diametroCm = d.diametro_m ? Math.round(d.diametro_m * 100) : null;
  const cargaEstr = cargaEstruturalDe(d.tipoEstaca, d.diametro_m);

  // CP-12b — domínio via schema novo (obra.dominios + estaca.dominioId)
  const dominioSelecionado = dominios.find((dom) => dom.id === d.dominioId) || null;
  const dominioPoucosFuros =
    dominioSelecionado && (dominioSelecionado.furos || []).length < 3;

  const validarESalvar = () => {
    const novosErros = [];
    if (!d.nome || d.nome.trim() === '') novosErros.push('Nome obrigatório');
    if (!d.tipoEstaca) novosErros.push('Tipo de estaca obrigatório');
    if (!d.diametro_m) novosErros.push('Diâmetro obrigatório');
    if (d.diametro_m && diametrosValidos.indexOf(diametroCm) === -1) {
      novosErros.push('Diâmetro inválido para este tipo de estaca');
    }
    if (
      d.cotaArrasamento_m !== null &&
      d.cotaArrasamento_m !== undefined &&
      GeoSPT
    ) {
      // CP-13a revisado — campo único decimal. A engine valida sobre o inteiro
      // (floor) que será efetivamente usado no cálculo.
      const v = GeoSPT.validation.validarCotaArrasamento(
        Math.floor(d.cotaArrasamento_m)
      );
      if (!v.valido) novosErros.push('Cota de arrasamento: ' + v.motivo);
    }
    setErros(novosErros);
    if (novosErros.length === 0) onSalvar(d);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onCancelar}
    >
      <div
        className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-slate-300 flex items-center justify-between bg-slate-50">
          <h3 className="font-bold text-slate-800">
            {isNovo ? 'Nova estaca' : 'Editar estaca'}
          </h3>
          <button
            onClick={onCancelar}
            className="text-slate-400 hover:text-slate-700 text-2xl leading-none w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Nome */}
          <div>
            <label className="block text-xs text-slate-600 mb-0.5">
              Nome <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={d.nome}
              onChange={(e) => setCampo('nome', e.target.value)}
              className={inputCls + ' w-full font-mono'}
            />
          </div>

          {/* Coordenadas */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-600 mb-0.5">X (m)</label>
              <input
                type="number"
                step="0.1"
                value={d.coordenadas?.x ?? ''}
                onChange={(e) =>
                  setCoord('x', e.target.value === '' ? null : parseFloat(e.target.value))
                }
                className={inputCls + ' w-full'}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-0.5">Y (m)</label>
              <input
                type="number"
                step="0.1"
                value={d.coordenadas?.y ?? ''}
                onChange={(e) =>
                  setCoord('y', e.target.value === '' ? null : parseFloat(e.target.value))
                }
                className={inputCls + ' w-full'}
              />
            </div>
          </div>

          {/* Tipo + Diâmetro */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-600 mb-0.5">
                Tipo de estaca <span className="text-red-600">*</span>
              </label>
              <select
                value={d.tipoEstaca}
                onChange={(e) => {
                  const novo = e.target.value;
                  setCampo('tipoEstaca', novo);
                  // Se o diâmetro atual não é válido para o novo tipo, troca para o primeiro válido
                  const valids = diametrosValidosPara(novo);
                  if (valids.indexOf(diametroCm) === -1) {
                    setCampo('diametro_m', valids[0] / 100);
                  }
                }}
                className={inputCls + ' w-full'}
              >
                {TIPOS_ESTACA.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-0.5">
                Diâmetro (cm) <span className="text-red-600">*</span>
              </label>
              <select
                value={diametroCm ?? ''}
                onChange={(e) =>
                  setCampo(
                    'diametro_m',
                    e.target.value ? parseInt(e.target.value, 10) / 100 : null
                  )
                }
                className={inputCls + ' w-full'}
              >
                {DIAMETROS_CM.map((cm) => {
                  const valido = diametrosValidos.indexOf(cm) !== -1;
                  return (
                    <option key={cm} value={cm} disabled={!valido}>
                      {cm} cm {!valido && '(não usual)'}
                    </option>
                  );
                })}
              </select>
              {cargaEstr !== null && (
                <div className="text-xs text-slate-600 mt-0.5">
                  Carga estrutural (tabela):{' '}
                  <strong>{cargaEstr} tf</strong>
                </div>
              )}
            </div>
          </div>

          {/* Carga estrutural editável (override) */}
          <div>
            <label className="block text-xs text-slate-600 mb-0.5">
              Capacidade estrutural admissível (tf)
            </label>
            <input
              type="number"
              step="1"
              min="0"
              value={d.cargaEstrutural_tf_custom ?? ''}
              onChange={(e) =>
                setCampo(
                  'cargaEstrutural_tf_custom',
                  e.target.value === '' ? null : parseFloat(e.target.value)
                )
              }
              className={inputCls + ' w-full font-mono'}
              placeholder={
                cargaEstr !== null
                  ? `tabela: ${cargaEstr} tf (deixe vazio para usar)`
                  : 'sem valor de tabela para este tipo/diâmetro'
              }
            />
            {(() => {
              const override = d.cargaEstrutural_tf_custom;
              if (override == null || override === '') {
                return (
                  <div className="text-xs text-slate-500 mt-0.5">
                    Vazio → usa o valor da tabela
                    {cargaEstr !== null ? ` (${cargaEstr} tf)` : ''}.
                  </div>
                );
              }
              if (cargaEstr !== null && cargaEstr > 0) {
                const div = Math.abs(override - cargaEstr) / cargaEstr;
                if (div > 0.3) {
                  return (
                    <div className="text-xs text-amber-700 bg-amber-50 border-l-2 border-amber-400 px-1.5 py-1 mt-0.5">
                      ⚠ Valor diverge {(div * 100).toFixed(0)}% da tabela (
                      {cargaEstr} tf). Confirme se o dimensionamento estrutural
                      da estaca justifica este valor.
                    </div>
                  );
                }
                return (
                  <div className="text-xs text-green-700 mt-0.5">
                    ✓ Override de {override} tf (tabela: {cargaEstr} tf).
                  </div>
                );
              }
              return (
                <div className="text-xs text-blue-700 mt-0.5">
                  Override de {override} tf (sem valor de tabela para comparar).
                </div>
              );
            })()}
          </div>

          {/* Cota arrasamento + carga prevista */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-600 mb-0.5">
                Cota de arrasamento (m)
              </label>
              <input
                type="number"
                step="0.001"
                value={d.cotaArrasamento_m ?? ''}
                onChange={(e) =>
                  setCampo(
                    'cotaArrasamento_m',
                    e.target.value === '' ? null : parseFloat(e.target.value)
                  )
                }
                className={inputCls + ' w-full font-mono'}
                placeholder="ex.: 254.485"
              />
              <div className="text-xs text-slate-500 mt-0.5">
                {d.cotaArrasamento_m != null &&
                !Number.isInteger(d.cotaArrasamento_m) ? (
                  <span className="text-amber-700">
                    Cálculo usará {Math.floor(d.cotaArrasamento_m)} m
                    (arredondado para baixo, a favor da segurança).
                  </span>
                ) : (
                  'Pode ser decimal. O cálculo arredonda para baixo (grade SPT em metros).'
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-0.5">
                Carga prevista (tf)
              </label>
              <input
                type="number"
                step="1"
                value={d.cargaPrevista_tf ?? ''}
                onChange={(e) =>
                  setCampo(
                    'cargaPrevista_tf',
                    e.target.value === '' ? null : parseFloat(e.target.value)
                  )
                }
                className={inputCls + ' w-full font-mono'}
              />
            </div>
          </div>

          {/* Domínio geotécnico (CP-12b — schema obra.dominios) */}
          <div>
            <label className="block text-xs text-slate-600 mb-0.5">
              Domínio geotécnico (opcional)
            </label>
            <select
              value={d.dominioId || ''}
              onChange={(e) => setCampo('dominioId', e.target.value || null)}
              className={inputCls + ' w-full'}
            >
              <option value="">— nenhum (usar todos os furos) —</option>
              {dominios.map((dom) => (
                <option key={dom.id} value={dom.id}>
                  {dom.nome} ({(dom.furos || []).length} furo
                  {(dom.furos || []).length === 1 ? '' : 's'})
                </option>
              ))}
            </select>
            {dominios.length === 0 && (
              <div className="text-xs text-slate-500 mt-0.5">
                Nenhum domínio cadastrado. Use a Aba 4 → "Gerenciar domínios".
              </div>
            )}
            {dominioSelecionado && (
              <div className="mt-1 flex items-center gap-2 text-xs">
                <span
                  className={
                    'inline-flex items-center gap-1 px-1.5 py-0.5 rounded ' +
                    classesCor(dominioSelecionado.cor).bg +
                    ' ' +
                    classesCor(dominioSelecionado.cor).text
                  }
                >
                  <span
                    className={
                      'w-2 h-2 rounded-full ' +
                      classesCor(dominioSelecionado.cor).dot
                    }
                  />
                  {dominioSelecionado.nome}
                </span>
                <span className="text-slate-500">
                  furos: {(dominioSelecionado.furos || []).join(', ') || '—'}
                </span>
              </div>
            )}
            {dominioPoucosFuros && (
              <div className="mt-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                ⚠ Domínio com menos de 3 furos — Modo 4 (interpolação) ficará
                indisponível para esta estaca.
              </div>
            )}
          </div>

          {/* Erros de validação */}
          {erros.length > 0 && (
            <div className="bg-red-50 border-l-4 border-red-500 p-2 space-y-0.5">
              {erros.map((er, i) => (
                <div key={i} className="text-xs text-red-900">
                  ⛔ {er}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-slate-300 bg-slate-50 flex justify-end gap-2">
          <BotaoPrim tipo="secundario" onClick={onCancelar}>
            Cancelar
          </BotaoPrim>
          <BotaoPrim onClick={validarESalvar}>
            {isNovo ? 'Criar estaca' : 'Salvar alterações'}
          </BotaoPrim>
        </div>
      </div>
    </div>
  );
}
