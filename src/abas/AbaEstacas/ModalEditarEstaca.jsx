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
 *   - Tipo + Formato (pré-moldada) + Dimensão obrigatórios
 *   - Dimensão é campo LIVRE em cm (CP-14); A6 avisa fora de 15–120 cm sem
 *     bloquear salvamento nem cálculo
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
  FORMATOS_ESTACA,
  cargaEstruturalEfetiva,
  catalogoCargaDe,
  cargaNormaDe,
  tensaoAdmissivelDe,
  formatoDe,
  dimensaoDe,
  labelDimensao,
  avaliarAlertaA6,
  normalizarEstacaFormato,
  geometriaEstaca,
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
  coeficientesCustomizados = null,
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

  // CP-14 — formato (circular/quadrada) e dimensão livre em cm
  const formato = formatoDe(d);
  const dimensao_m = dimensaoDe(d);
  const dimensaoCm = dimensao_m != null ? Math.round(dimensao_m * 1000) / 10 : null;
  const cargaEstrInfo = cargaEstruturalEfetiva(
    { ...d, formato, dimensao_m },
    coeficientesCustomizados
  );
  const cargaCatalogo = cargaEstrInfo.catalogo;
  const cargaNorma = cargaEstrInfo.norma;
  const sigmaE = cargaEstrInfo.sigma_MPa;
  const alertaA6 = avaliarAlertaA6({ ...d, formato, dimensao_m });

  const setDimensao = (valorCm) => {
    const v = valorCm === '' || valorCm == null ? null : parseFloat(valorCm) / 100;
    // diametro_m espelha dimensao_m (retrocompatibilidade: engine, corte, mini-mapa)
    setD((prev) => ({ ...prev, dimensao_m: v, diametro_m: v }));
  };

  const setFormato = (novoFormato) => {
    setD((prev) => ({ ...prev, formato: novoFormato }));
  };

  // CP-12b — domínio via schema novo (obra.dominios + estaca.dominioId)
  const dominioSelecionado = dominios.find((dom) => dom.id === d.dominioId) || null;
  const dominioPoucosFuros =
    dominioSelecionado && (dominioSelecionado.furos || []).length < 3;

  const validarESalvar = () => {
    const novosErros = [];
    if (!d.nome || d.nome.trim() === '') novosErros.push('Nome obrigatório');
    if (!d.tipoEstaca) novosErros.push('Tipo de estaca obrigatório');
    if (dimensao_m == null || !(dimensao_m > 0)) {
      novosErros.push(
        `${labelDimensao(formato)} obrigatório (valor em cm, maior que zero)`
      );
    }
    // A6 (dimensão fora da faixa usual) é AVISO, nunca bloqueia o salvamento
    // nem o cálculo de capacidade — exibido inline e na Aba 5.
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
    // Normaliza formato/dimensão e espelha diametro_m antes de salvar
    if (novosErros.length === 0) onSalvar(normalizarEstacaFormato(d));
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

          {/* Tipo + Formato + Dimensão (CP-14) */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-600 mb-0.5">
                Tipo de estaca <span className="text-red-600">*</span>
              </label>
              <select
                value={d.tipoEstaca}
                onChange={(e) => {
                  const novo = e.target.value;
                  // Formato 'quadrada' só existe para pré-moldada; demais tipos
                  // (hélice, escavadas, raiz) são circulares por execução.
                  setD((prev) => ({
                    ...prev,
                    tipoEstaca: novo,
                    formato:
                      novo === 'premoldada' && prev.formato === 'quadrada'
                        ? 'quadrada'
                        : 'circular',
                  }));
                }}
                className={inputCls + ' w-full'}
              >
                {TIPOS_ESTACA.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              {d.tipoEstaca === 'premoldada' && (
                <div className="mt-1.5">
                  <label className="block text-xs text-slate-600 mb-0.5">
                    Formato da seção <span className="text-red-600">*</span>
                  </label>
                  <div className="flex gap-3">
                    {FORMATOS_ESTACA.map((f) => (
                      <label
                        key={f.id}
                        className="flex items-center gap-1 text-sm text-slate-700 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="formatoEstaca"
                          checked={formato === f.id}
                          onChange={() => setFormato(f.id)}
                        />
                        {f.id === 'circular' ? '● ' : '■ '}
                        {f.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-0.5">
                {labelDimensao(formato)} (cm){' '}
                <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                step="1"
                min="1"
                value={dimensaoCm ?? ''}
                onChange={(e) => setDimensao(e.target.value)}
                className={inputCls + ' w-full font-mono'}
                placeholder={
                  formato === 'quadrada' ? 'lado em cm (ex.: 30)' : 'diâmetro em cm (ex.: 40)'
                }
              />
              {dimensao_m != null && dimensao_m > 0 && (() => {
                const g = geometriaEstaca(formato, dimensao_m);
                return (
                  <div className="text-xs text-slate-500 mt-0.5 font-mono">
                    A_p = {g.area_ponta_m2.toFixed(4)} m² · U ={' '}
                    {g.perimetro_m.toFixed(4)} m
                  </div>
                );
              })()}
              {alertaA6 && (
                <div className="text-xs text-amber-700 bg-amber-50 border-l-2 border-amber-400 px-1.5 py-1 mt-0.5">
                  ⚠ {alertaA6.mensagem}
                </div>
              )}
              {/* CP-16 — referências de carga estrutural (catálogo e norma σₑ×A) */}
              {dimensao_m != null && (sigmaE != null || cargaCatalogo != null) && (
                <div className="text-xs text-slate-600 mt-0.5 space-y-0.5">
                  {sigmaE != null && cargaNorma != null && (
                    <div>
                      Norma (σ<sub>e</sub> = {sigmaE} MPa × A):{' '}
                      <strong>{cargaNorma.toFixed(1)} tf</strong>
                    </div>
                  )}
                  {cargaCatalogo != null && (
                    <div>
                      Catálogo comercial:{' '}
                      <strong>{cargaCatalogo} tf</strong>
                      {cargaNorma != null && cargaCatalogo > cargaNorma + 0.05 && (
                        <span className="text-amber-700">
                          {' '}— acima da norma ({cargaNorma.toFixed(1)} tf); ver alerta A11.
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Carga estrutural admissível — hierarquia CP-16 (override → catálogo → norma) */}
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
                cargaEstrInfo.valor != null
                  ? `vazio → ${cargaEstrInfo.valor.toFixed(1)} tf (${
                      cargaEstrInfo.origem === 'catalogo' ? 'catálogo' : 'norma'
                    })`
                  : 'informe a carga estrutural admissível'
              }
            />
            {/* Botões de sugestão (clicáveis) — catálogo e/ou norma */}
            {(cargaCatalogo != null || cargaNorma != null) && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {cargaCatalogo != null && (
                  <button
                    type="button"
                    onClick={() => setCampo('cargaEstrutural_tf_custom', cargaCatalogo)}
                    className="text-[11px] px-2 py-0.5 rounded border border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    usar catálogo: {cargaCatalogo} tf
                  </button>
                )}
                {cargaNorma != null && (
                  <button
                    type="button"
                    onClick={() => setCampo('cargaEstrutural_tf_custom', Math.round(cargaNorma * 10) / 10)}
                    className="text-[11px] px-2 py-0.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    usar norma: {cargaNorma.toFixed(1)} tf
                  </button>
                )}
              </div>
            )}
            {(() => {
              const override = d.cargaEstrutural_tf_custom;
              if (override == null || override === '') {
                // Sem override → mostra o que a hierarquia usará
                if (cargaEstrInfo.valor == null) {
                  return (
                    <div className="text-xs text-blue-700 mt-0.5">
                      Sem catálogo nem σ<sub>e</sub> para este tipo/dimensão — informe o valor.
                    </div>
                  );
                }
                return (
                  <div className="text-xs text-slate-500 mt-0.5">
                    Vazio → o cálculo usa{' '}
                    <strong>{cargaEstrInfo.valor.toFixed(1)} tf</strong>{' '}
                    ({cargaEstrInfo.origem === 'catalogo' ? 'catálogo comercial' : 'norma σₑ×A'}).
                  </div>
                );
              }
              // Com override → A-11 se exceder a norma
              if (cargaNorma != null && override > cargaNorma + 0.05) {
                return (
                  <div className="text-xs text-amber-700 bg-amber-50 border-l-2 border-amber-400 px-1.5 py-1 mt-0.5">
                    ⚠ A11 — valor informado ({override} tf) acima da norma σ<sub>e</sub>×A (
                    {cargaNorma.toFixed(1)} tf). O cálculo usa o valor informado; a norma
                    admitiria menos. Verifique o dimensionamento estrutural.
                  </div>
                );
              }
              return (
                <div className="text-xs text-green-700 mt-0.5">
                  ✓ Valor informado: {override} tf
                  {cargaNorma != null ? ` (norma: ${cargaNorma.toFixed(1)} tf)` : ''}.
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
