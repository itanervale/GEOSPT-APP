/* ============================================================================
 * Banner — caixa colorida de mensagem informativa
 *
 * Variantes (tipo): info | alerta | erro | ok
 * Extraído idêntico das linhas 2743-2751 do geospt_app.jsx (zero alteração).
 * ============================================================================ */

import React from 'react';

export default function Banner({ tipo = 'info', children }) {
  const cores = {
    info: 'bg-slate-100 border-slate-400 text-slate-800',
    alerta: 'bg-amber-50 border-amber-500 text-amber-900',
    erro: 'bg-red-50 border-red-500 text-red-900',
    ok: 'bg-green-50 border-green-500 text-green-900',
  };
  return (
    <div className={'border-l-4 px-3 py-2 text-sm ' + cores[tipo]}>
      {children}
    </div>
  );
}
