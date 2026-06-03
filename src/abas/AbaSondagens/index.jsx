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
    moverSondagem,
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

  // Baixa o protocolo de extração de NSPT (FORMATO_EXTRACAO_NSPT.md), servido
  // de /public. O usuário leva esse arquivo à sua IA, que devolve um JSON no
  // schema geospt-obra para o botão Importar. Não embute IA no app: mantém a
  // conferência humana e o app 100% local.
  const handleBaixarFormatoPdf = () => {
    const url = import.meta.env.BASE_URL + 'FORMATO_EXTRACAO_NSPT.md';
    const a = document.createElement('a');
    a.href = url;
    a.download = 'FORMATO_EXTRACAO_NSPT.md';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
          <div className="mt-3">
            <BotaoPrim tipo="secundario" onClick={handleBaixarFormatoPdf}>
              + Adicionar sondagem a partir de um PDF com IA
            </BotaoPrim>
            <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto">
              Baixa o protocolo de extração. Leve o arquivo e o PDF do laudo a
              uma IA para gerar o JSON da obra; depois use{' '}
              <strong>📥 Importar</strong> no header. Confira sempre os valores
              antes de importar.
            </p>
          </div>
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
          {nomes.map((n, i) => {
            const ativa = n === nomeAtivo;
            const s = sondagens[n];
            const nLeit = s.leituras?.length || 0;
            const corIcone = ativa
              ? 'text-blue-100 hover:text-white'
              : 'text-slate-400 hover:text-slate-700';
            return (
              <li
                key={n}
                className={
                  'border-b border-slate-200 transition-colors ' +
                  (ativa ? 'bg-blue-600' : 'hover:bg-slate-200')
                }
              >
                <button
                  onClick={() => setUi('sondagemSelecionada', n)}
                  className={
                    'w-full text-left px-3 pt-2 pb-1 text-sm ' +
                    (ativa ? 'text-white font-medium' : 'text-slate-700')
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
                <div className="flex items-center gap-1 px-3 pb-1.5">
                  <button
                    onClick={() => moverSondagem(n, -1)}
                    disabled={i === 0}
                    className={
                      corIcone + ' text-sm disabled:opacity-30 disabled:cursor-default'
                    }
                    title="Mover para cima"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moverSondagem(n, 1)}
                    disabled={i === nomes.length - 1}
                    className={
                      corIcone + ' text-sm disabled:opacity-30 disabled:cursor-default'
                    }
                    title="Mover para baixo"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => duplicarSondagem(n)}
                    className={corIcone + ' text-sm'}
                    title="Duplicar furo"
                  >
                    ⧉
                  </button>
                  <button
                    onClick={() => handleRemover(n)}
                    className={
                      (ativa
                        ? 'text-red-200 hover:text-white'
                        : 'text-red-500 hover:text-red-700') + ' text-sm ml-auto'
                    }
                    title="Remover furo"
                  >
                    ✕
                  </button>
                </div>
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
