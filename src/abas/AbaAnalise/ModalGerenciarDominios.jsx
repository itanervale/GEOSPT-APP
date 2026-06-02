/* ============================================================================
 * ModalGerenciarDominios — gerência de domínios geotécnicos (CP-12b, SPEC 7-B)
 *
 * Layout 2 colunas:
 *   Esquerda (40%): lista de domínios (cards coloridos) + "Novo domínio"
 *   Direita (60%): edição do domínio selecionado (nome, cor, furos)
 *
 * Estado LOCAL (rascunho): só persiste em obra.dominios ao clicar "Salvar".
 * Cancelar descarta. Não permite furo em múltiplos domínios (SPEC R-C7B-2):
 * ao marcar um furo num domínio, ele é removido de qualquer outro.
 *
 * NÃO altera cálculo (isso é CP-12c). Apenas edita o schema obra.dominios[].
 *
 * Props:
 *   sondagens     — obj { nome → sondagem } (para listar furos disponíveis)
 *   dominios      — array atual de domínios (obra.dominios)
 *   onSalvar(novosDominios)
 *   onCancelar()
 * ============================================================================ */

import React, { useState } from 'react';
import BotaoPrim from '@/components/ui/BotaoPrim';
import {
  CORES_DOMINIO,
  classesCor,
  novoIdDominio,
} from '@/state/dominiosHelper';

export default function ModalGerenciarDominios({
  sondagens,
  dominios,
  onSalvar,
  onCancelar,
}) {
  // Rascunho local — cópia profunda simples (arrays de furos são primitivos)
  const [rascunho, setRascunho] = useState(() =>
    (dominios || []).map((d) => ({ ...d, furos: [...(d.furos || [])] }))
  );
  const [selId, setSelId] = useState(
    dominios && dominios.length > 0 ? dominios[0].id : null
  );
  const [houveMudanca, setHouveMudanca] = useState(false);

  const nomesFuros = Object.keys(sondagens || {}).sort();
  const selecionado = rascunho.find((d) => d.id === selId) || null;

  const marcar = (fn) => {
    fn();
    setHouveMudanca(true);
  };

  const adicionarDominio = () => {
    marcar(() => {
      const id = novoIdDominio(rascunho);
      const corIdx = rascunho.length % CORES_DOMINIO.length;
      const novo = {
        id,
        nome: 'Grupo ' + id.replace('g', ''),
        cor: CORES_DOMINIO[corIdx],
        furos: [],
        origem: 'manual',
      };
      setRascunho((r) => [...r, novo]);
      setSelId(id);
    });
  };

  const excluirDominio = (id) => {
    marcar(() => {
      setRascunho((r) => r.filter((d) => d.id !== id));
      if (selId === id) setSelId(null);
    });
  };

  const editarSelecionado = (patch) => {
    marcar(() => {
      setRascunho((r) =>
        r.map((d) => (d.id === selId ? { ...d, ...patch } : d))
      );
    });
  };

  // Alterna um furo no domínio selecionado. Regra SPEC: furo em 1 domínio só —
  // ao adicionar aqui, remove de qualquer outro domínio.
  const toggleFuro = (nomeFuro) => {
    if (!selecionado) return;
    marcar(() => {
      setRascunho((r) =>
        r.map((d) => {
          if (d.id === selId) {
            const tem = d.furos.includes(nomeFuro);
            return {
              ...d,
              furos: tem
                ? d.furos.filter((f) => f !== nomeFuro)
                : [...d.furos, nomeFuro],
            };
          }
          // Remove o furo de outros domínios (exclusividade)
          if (d.furos.includes(nomeFuro)) {
            return { ...d, furos: d.furos.filter((f) => f !== nomeFuro) };
          }
          return d;
        })
      );
    });
  };

  // Qual domínio (de outro) contém o furo — para mostrar aviso de realocação
  const donoDoFuro = (nomeFuro) =>
    rascunho.find((d) => d.id !== selId && d.furos.includes(nomeFuro));

  const handleSalvar = () => {
    // Limpa domínios sem furos? Não — permite domínio vazio (engenheiro decide).
    onSalvar(rascunho);
  };

  const handleCancelar = () => {
    if (houveMudanca) {
      if (!window.confirm('Descartar alterações nos domínios?')) return;
    }
    onCancelar();
  };

  const furosSemDominio = nomesFuros.filter(
    (f) => !rascunho.some((d) => d.furos.includes(f))
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={handleCancelar}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800">
            🎯 Gerenciar domínios geotécnicos
          </h3>
          <span className="text-xs text-slate-500">
            {furosSemDominio.length > 0
              ? furosSemDominio.length + ' furo(s) sem domínio'
              : 'todos os furos atribuídos'}
          </span>
        </div>

        {/* Corpo 2 colunas */}
        <div className="flex-1 flex overflow-hidden">
          {/* Esquerda: lista */}
          <div className="w-2/5 border-r border-slate-200 overflow-y-auto p-3 space-y-2">
            {rascunho.length === 0 && (
              <p className="text-xs text-slate-500 py-4 text-center">
                Nenhum domínio. Crie o primeiro abaixo.
              </p>
            )}
            {rascunho.map((d) => {
              const c = classesCor(d.cor);
              const ehSel = d.id === selId;
              return (
                <div
                  key={d.id}
                  onClick={() => setSelId(d.id)}
                  className={
                    'rounded border p-2 cursor-pointer transition ' +
                    (ehSel
                      ? c.bg + ' ' + c.border + ' ring-2 ring-offset-1 ' + c.border
                      : 'bg-white border-slate-200 hover:border-slate-300')
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={'w-3 h-3 rounded-full shrink-0 ' + c.dot}
                      />
                      <span className="font-semibold text-sm text-slate-800 truncate">
                        {d.nome}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        excluirDominio(d.id);
                      }}
                      className="text-slate-400 hover:text-red-600 text-sm px-1"
                      title="Excluir domínio"
                    >
                      🗑
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {d.furos.length} furo(s)
                    {d.furos.length > 0 && ': ' + d.furos.join(', ')}
                  </div>
                </div>
              );
            })}
            <button
              onClick={adicionarDominio}
              className="w-full mt-2 py-2 text-sm border border-dashed border-slate-300 rounded text-slate-600 hover:bg-slate-50 hover:border-slate-400"
            >
              + Novo domínio
            </button>
          </div>

          {/* Direita: edição */}
          <div className="w-3/5 overflow-y-auto p-4">
            {!selecionado ? (
              <p className="text-sm text-slate-500 text-center py-8">
                Selecione um domínio à esquerda ou crie um novo.
              </p>
            ) : (
              <div className="space-y-4">
                {/* Nome */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Nome do domínio
                  </label>
                  <input
                    type="text"
                    value={selecionado.nome}
                    onChange={(e) => editarSelecionado({ nome: e.target.value })}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                    placeholder="Ex: Grupo Norte"
                  />
                </div>

                {/* Cor */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Cor
                  </label>
                  <div className="flex gap-2">
                    {CORES_DOMINIO.map((cor) => {
                      const c = classesCor(cor);
                      const ativa = selecionado.cor === cor;
                      return (
                        <button
                          key={cor}
                          onClick={() => editarSelecionado({ cor })}
                          className={
                            'w-7 h-7 rounded-full ' +
                            c.dot +
                            (ativa
                              ? ' ring-2 ring-offset-2 ring-slate-700'
                              : ' opacity-60 hover:opacity-100')
                          }
                          title={cor}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Furos */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Furos no domínio ({selecionado.furos.length})
                  </label>
                  {nomesFuros.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      Nenhuma sondagem cadastrada.
                    </p>
                  ) : (
                    <div className="border border-slate-200 rounded divide-y divide-slate-100 max-h-64 overflow-y-auto">
                      {nomesFuros.map((nomeFuro) => {
                        const incluso = selecionado.furos.includes(nomeFuro);
                        const outroDono = donoDoFuro(nomeFuro);
                        return (
                          <label
                            key={nomeFuro}
                            className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-slate-50"
                          >
                            <input
                              type="checkbox"
                              checked={incluso}
                              onChange={() => toggleFuro(nomeFuro)}
                              className="w-3.5 h-3.5"
                            />
                            <span className="text-slate-700">{nomeFuro}</span>
                            {!incluso && outroDono && (
                              <span className="text-[10px] text-amber-600 ml-auto">
                                em "{outroDono.nome}" — marcar move p/ cá
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé */}
        <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            onClick={handleCancelar}
            className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800"
          >
            Cancelar
          </button>
          <BotaoPrim onClick={handleSalvar}>Salvar domínios</BotaoPrim>
        </div>
      </div>
    </div>
  );
}
