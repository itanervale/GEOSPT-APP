/* ============================================================================
 * ModalNsptImpenetravel — confirma registro de impenetrabilidade quando NSPT > 50
 *
 * Conforme NBR 6484:2020 item 5.2.4.2, NSPT > 50 indica impenetrabilidade.
 * Para preservar auditoria, o app guarda:
 *   - nspt_real: valor bruto digitado (ex.: 52, 60, 80)
 *   - nspt_calculo: clampado a 50 (usado nas fórmulas DQ/AV)
 *   - impenetravel: true
 *
 * Extraído idêntico das linhas 3874-3911 do geospt_app.jsx.
 * ============================================================================ */

import React from 'react';
import BotaoPrim from '@/components/ui/BotaoPrim';

export default function ModalNsptImpenetravel({
  valor,
  profundidade_m,
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
        <div className="px-4 py-3 border-b border-slate-300 bg-amber-50">
          <h3 className="font-bold text-amber-900">
            ⚠ Confirmar impenetrabilidade ao SPT
          </h3>
        </div>
        <div className="p-4 text-sm text-slate-800 space-y-2">
          <p>
            Valor <strong className="font-mono">{valor}</strong> na profundidade{' '}
            <strong>{profundidade_m} m</strong> indica impenetrabilidade ao SPT
            (NBR 6484:2020 item 5.2.4.2).
          </p>
          <p>Confirma registro como impenetrável?</p>
          <ul className="text-xs bg-slate-50 border border-slate-200 rounded p-2 space-y-0.5 font-mono">
            <li>
              • <code>nspt_real</code> preservado: <strong>{valor}</strong>
            </li>
            <li>
              • <code>nspt_calculo</code> (usado nas fórmulas):{' '}
              <strong>50</strong>
            </li>
            <li>
              • <code>impenetravel</code> registrado: <strong>true</strong>
            </li>
          </ul>
          <p className="text-xs text-slate-600">
            O valor bruto é preservado em todas as exportações; nas fórmulas, é
            truncado para 50.
          </p>
        </div>
        <div className="px-4 py-3 border-t border-slate-300 flex justify-end gap-2 bg-slate-50">
          <BotaoPrim tipo="secundario" onClick={onCancelar}>
            Cancelar e ajustar
          </BotaoPrim>
          <BotaoPrim onClick={onConfirmar}>
            ✓ Confirmar impenetrabilidade
          </BotaoPrim>
        </div>
      </div>
    </div>
  );
}
