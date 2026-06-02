/* ============================================================================
 * BotaoPrim — botão padrão do app
 *
 * Variantes (tipo): primario | secundario | perigo
 * Extraído idêntico das linhas 2753-2768 do geospt_app.jsx.
 * ============================================================================ */

import React from 'react';

export default function BotaoPrim({
  children,
  onClick,
  disabled = false,
  tipo = 'primario',
}) {
  const cls = {
    primario: 'bg-blue-600 hover:bg-blue-700 text-white',
    secundario: 'bg-slate-200 hover:bg-slate-300 text-slate-800',
    perigo: 'bg-red-600 hover:bg-red-700 text-white',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={
        'px-3 py-1.5 text-sm font-medium rounded transition-colors ' +
        cls[tipo] +
        (disabled ? ' opacity-50 cursor-not-allowed' : ' cursor-pointer')
      }
    >
      {children}
    </button>
  );
}
