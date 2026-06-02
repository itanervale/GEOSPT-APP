/* ============================================================================
 * ModalExportar — modal de visualização/cópia do JSON exportado
 *
 * Props:
 *   conteudo: texto a ser exibido (geralmente JSON.stringify do payload)
 *   filename: nome sugerido para salvar
 *   onFechar: callback
 *
 * Estratégia: à prova de bala — apresenta textarea readOnly com botão
 * "Selecionar tudo" para Ctrl+C, contornando Permissions Policy do iframe pai
 * (Clipboard API foi descartada em iteração anterior).
 *
 * Extraído idêntico das linhas 2982-3033 do geospt_app.jsx.
 * ============================================================================ */

import React, { useRef } from 'react';
import BotaoPrim from './BotaoPrim';

export default function ModalExportar({ conteudo, filename, onFechar }) {
  const textareaRef = useRef(null);
  const selecionarTudo = () => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  };
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onFechar}
    >
      <div
        className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-slate-300 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800">Exportar obra (JSON)</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Salve com o nome sugerido:{' '}
              <code className="text-slate-700">{filename}</code>
            </p>
          </div>
          <button
            onClick={onFechar}
            className="text-slate-400 hover:text-slate-700 text-2xl leading-none w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>
        <div className="p-4 flex-1 overflow-hidden flex flex-col">
          <div className="text-xs text-slate-600 mb-2">
            <strong>Como salvar:</strong> Clique em <em>"Selecionar tudo"</em> →{' '}
            <kbd className="px-1 bg-slate-200 rounded">Ctrl+C</kbd> → Cole num
            editor de texto → Salve como <code>{filename}</code>.
          </div>
          <textarea
            ref={textareaRef}
            value={conteudo}
            readOnly
            className="flex-1 w-full font-mono text-xs p-2 border border-slate-300 rounded resize-none bg-slate-50"
            style={{ minHeight: '300px' }}
          />
        </div>
        <div className="px-4 py-3 border-t border-slate-300 flex justify-end gap-2 bg-slate-50">
          <BotaoPrim tipo="secundario" onClick={selecionarTudo}>
            Selecionar tudo
          </BotaoPrim>
          <BotaoPrim onClick={onFechar}>Fechar</BotaoPrim>
        </div>
      </div>
    </div>
  );
}
