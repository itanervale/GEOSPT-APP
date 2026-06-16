/* ============================================================================
 * RecuperacaoAutosave — ao abrir o app, se houver uma obra salva automaticamente
 * e compatível, pergunta ao usuário se deseja restaurá-la (Decisão 2 do CP-17).
 *
 * Aparece UMA vez por carregamento, antes de o usuário começar a trabalhar.
 * Decisões:
 *   - Restaurar → aplica o autosave ao estado.
 *   - Começar nova → descarta o autosave (limpa o storage).
 *   - Schema incompatível (app atualizado) → avisa e oferece só descartar.
 * Degrada a nada se o storage estiver indisponível.
 * ========================================================================== */

import React, { useEffect, useState } from 'react';
import { useObra } from '@/state/ObraProvider';
import { carregarObraSalva, limparObraSalva } from '@/state/persistenciaObra';

function formatarData(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return '';
  }
}

export default function RecuperacaoAutosave() {
  const { restaurarAutosave } = useObra();
  const [info, setInfo] = useState(null); // { payload?, nome?, salvoEm? } | { incompativel }
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const r = carregarObraSalva();
    if (r && (r.payload || r.incompativel)) {
      setInfo(r);
      setVisivel(true);
    }
  }, []);

  if (!visivel || !info) return null;

  const fechar = () => setVisivel(false);

  // Caso schema incompatível (app foi atualizado): não restaura, só permite limpar.
  if (info.incompativel) {
    return (
      <Overlay>
        <div className="text-base font-bold text-slate-800 mb-1">
          Salvamento automático de versão anterior
        </div>
        <p className="text-sm text-slate-600 mb-3">
          Há uma obra salva automaticamente por uma versão anterior do GeoSPT
          {info.salvoEm ? ` (${formatarData(info.salvoEm)})` : ''}. Para evitar
          incompatibilidades, ela não será restaurada automaticamente. Se você tem
          o arquivo exportado (JSON), use <strong>Importar</strong>.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => {
              limparObraSalva();
              fechar();
            }}
            className="text-sm px-3 py-1.5 rounded bg-slate-600 hover:bg-slate-700 text-white"
          >
            Entendi, começar do zero
          </button>
        </div>
      </Overlay>
    );
  }

  return (
    <Overlay>
      <div className="text-base font-bold text-slate-800 mb-1">
        Recuperar trabalho anterior?
      </div>
      <p className="text-sm text-slate-600 mb-1">
        Encontramos uma obra salva automaticamente neste navegador:
      </p>
      <div className="text-sm bg-slate-50 border border-slate-200 rounded px-3 py-2 mb-3">
        <div>
          <span className="text-slate-500">Obra:</span>{' '}
          <strong>{info.nome}</strong>
        </div>
        {info.salvoEm && (
          <div className="text-xs text-slate-500 mt-0.5">
            Salvo em {formatarData(info.salvoEm)}
          </div>
        )}
      </div>
      <p className="text-xs text-slate-500 mb-3">
        Restaurar carrega as sondagens, estacas e parâmetros. Os cálculos serão
        refeitos ao abrir a aba de capacidade.
      </p>
      <div className="flex justify-end gap-2">
        <button
          onClick={() => {
            limparObraSalva();
            fechar();
          }}
          className="text-sm px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
        >
          Começar nova
        </button>
        <button
          onClick={() => {
            restaurarAutosave(info.payload);
            fechar();
          }}
          className="text-sm px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium"
        >
          ↩ Restaurar
        </button>
      </div>
    </Overlay>
  );
}

function Overlay({ children }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-4">
        {children}
      </div>
    </div>
  );
}
