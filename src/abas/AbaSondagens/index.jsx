/* ============================================================================
 * Aba 2 — Sondagens (orquestrador)
 *
 * Estrutura:
 *   - Sidebar com lista de sondagens cadastradas + botão "+ Adicionar"
 *   - Painel principal renderizando PainelSondagem da sondagem selecionada
 *   - Modal de confirmação para remoção
 *   - Tela vazia quando nenhuma sondagem foi cadastrada
 *
 * Cópia funcional das linhas 3213-3342 do geospt_app.jsx. Mudanças:
 *   - imports via @/ aliases
 *   - ModalConfirmar já existe em @/components/ui
 *   - PainelSondagem agora em ./PainelSondagem (mesma pasta)
 * ============================================================================ */

import React, { useState, useEffect } from 'react';
import { useObra } from '@/state/ObraProvider';
import BotaoPrim from '@/components/ui/BotaoPrim';
import ModalConfirmar from '@/components/ui/ModalConfirmar';
import PainelSondagem from './PainelSondagem';

export default function AbaSondagens() {
  const {
    estado,
    setUi,
    adicionarSondagem,
    removerSondagem,
    duplicarSondagem,
  } = useObra();

  const sondagens = estado.obra.sondagens;
  const nomes = Object.keys(sondagens);
  const nomeAtivo =
    estado.ui.sondagemSelecionada || (nomes.length > 0 ? nomes[0] : null);

  const [confirmarRemocao, setConfirmarRemocao] = useState(null);

  // Sincroniza ui.sondagemSelecionada com lista atual
  useEffect(() => {
    if (nomes.length > 0 && !estado.ui.sondagemSelecionada) {
      setUi('sondagemSelecionada', nomes[0]);
    }
    if (
      estado.ui.sondagemSelecionada &&
      !sondagens[estado.ui.sondagemSelecionada]
    ) {
      setUi('sondagemSelecionada', nomes[0] || null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nomes.length, estado.ui.sondagemSelecionada]);

  const handleAdicionar = () => {
    let i = 1,
      candidato;
    do {
      candidato = 'SPT-' + String(i).padStart(2, '0');
      i++;
    } while (sondagens[candidato]);
    adicionarSondagem(candidato, {
      cotaTopo_m: 100,
      profundidadeFinal_m: 0,
      criterioParalisacao: 'impenetravel',
    });
  };

  const handleRemover = (nome) => {
    setConfirmarRemocao(nome);
  };

  const confirmarRemocaoSim = () => {
    if (confirmarRemocao) {
      removerSondagem(confirmarRemocao);
      setConfirmarRemocao(null);
    }
  };

  if (nomes.length === 0) {
    return (
      <div className="p-6 max-w-3xl">
        <h2 className="text-lg font-bold text-slate-800 mb-1">2. Sondagens</h2>
        <p className="text-sm text-slate-600 mb-4">
          Cadastre os furos SPT da obra. Mínimo de 2 para compatibilização.
        </p>
        <div className="bg-white border border-slate-300 rounded p-8 text-center">
          <div className="text-4xl mb-2">🛠</div>
          <p className="text-slate-600 mb-4">
            Nenhuma sondagem cadastrada ainda.
          </p>
          <BotaoPrim onClick={handleAdicionar}>
            + Adicionar primeira sondagem
          </BotaoPrim>
          <p className="text-xs text-slate-500 mt-4">
            Ou use <strong>📂 Balsas (demo)</strong> no header para carregar 5
            sondagens de exemplo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-slate-100 border-r border-slate-300 overflow-y-auto">
        <div className="p-2 border-b border-slate-300">
          <BotaoPrim onClick={handleAdicionar}>+ Adicionar</BotaoPrim>
        </div>
        <ul>
          {nomes.map((n) => {
            const ativa = n === nomeAtivo;
            const s = sondagens[n];
            const nLeit = s.leituras?.length || 0;
            return (
              <li key={n}>
                <button
                  onClick={() => setUi('sondagemSelecionada', n)}
                  className={
                    'w-full text-left px-3 py-2 text-sm border-b border-slate-200 transition-colors ' +
                    (ativa
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-slate-700 hover:bg-slate-200')
                  }
                >
                  <div className="font-mono">{n}</div>
                  <div
                    className={
                      'text-xs ' + (ativa ? 'text-blue-200' : 'text-slate-500')
                    }
                  >
                    {nLeit} leituras · cota {s.cotaTopo_m ?? '—'} m
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Painel principal */}
      <div className="flex-1 overflow-auto bg-white">
        {nomeAtivo && sondagens[nomeAtivo] ? (
          <PainelSondagem
            nome={nomeAtivo}
            sondagem={sondagens[nomeAtivo]}
            onRemover={() => handleRemover(nomeAtivo)}
            onDuplicar={() => duplicarSondagem(nomeAtivo)}
          />
        ) : (
          <div className="p-6 text-slate-500">
            Selecione uma sondagem na lista lateral.
          </div>
        )}
      </div>

      {/* Modal de confirmação de remoção */}
      {confirmarRemocao && (
        <ModalConfirmar
          titulo="Remover sondagem"
          mensagem={
            <>
              Confirma a remoção da sondagem{' '}
              <strong className="font-mono">{confirmarRemocao}</strong>? Esta
              ação não pode ser desfeita (
              {sondagens[confirmarRemocao]?.leituras?.length || 0} leituras
              serão perdidas).
            </>
          }
          rotuloConfirmar="Sim, remover"
          tipoConfirmar="perigo"
          onConfirmar={confirmarRemocaoSim}
          onCancelar={() => setConfirmarRemocao(null)}
        />
      )}
    </div>
  );
}
