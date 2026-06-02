/* ============================================================================
 * ModalConfirmar — diálogo de confirmação genérico
 *
 * Props:
 *   titulo, mensagem: texto principal
 *   rotuloConfirmar: texto do botão de ação (default "Confirmar")
 *   tipoConfirmar: variante do botão (primario | secundario | perigo)
 *   onConfirmar, onCancelar: callbacks
 *
 * Extraído idêntico das linhas 3347-3364 do geospt_app.jsx.
 * Fechar pelo backdrop (clicar fora) chama onCancelar.
 * ============================================================================ */

import React from 'react';
import BotaoPrim from './BotaoPrim';

export default function ModalConfirmar({
  titulo,
  mensagem,
  rotuloConfirmar = 'Confirmar',
  tipoConfirmar = 'primario',
  onConfirmar,
  onCancelar,
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onCancelar}
    >
      <div
        className="bg-white rounded-lg shadow-2xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-slate-300">
          <h3 className="font-bold text-slate-800">{titulo}</h3>
        </div>
        <div className="p-4 text-sm text-slate-800">{mensagem}</div>
        <div className="px-4 py-3 border-t border-slate-300 flex justify-end gap-2 bg-slate-50">
          <BotaoPrim tipo="secundario" onClick={onCancelar}>
            Cancelar
          </BotaoPrim>
          <BotaoPrim tipo={tipoConfirmar} onClick={onConfirmar}>
            {rotuloConfirmar}
          </BotaoPrim>
        </div>
      </div>
    </div>
  );
}
