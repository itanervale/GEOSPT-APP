/* ============================================================================
 * Campo — wrapper de label + input
 *
 * Props:
 *   label: texto do rótulo
 *   children: o input/select/textarea de verdade
 *   obrig: marca asterisco vermelho
 *   hint: texto auxiliar abaixo do campo
 *
 * IMPORTANTE: este componente DEVE ser definido fora dos componentes que o
 * consomem, para não ser recriado a cada render (o que destrói o foco do
 * input). Comentário copiado do artifact original (linha 3093).
 *
 * Extraído idêntico das linhas 3095-3105 do geospt_app.jsx.
 * ============================================================================ */

import React from 'react';

export default function Campo({ label, children, obrig = false, hint = null }) {
  return (
    <div className="mb-3">
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label} {obrig && <span className="text-red-600">*</span>}
      </label>
      {children}
      {hint && <div className="text-xs text-slate-500 mt-0.5">{hint}</div>}
    </div>
  );
}
