/* ============================================================================
 * SeletorEstaca — dropdown de seleção da estaca ativa
 * Extraído idêntico das linhas 6283-6298 do geospt_app.jsx.
 * ============================================================================ */

import React from 'react';

export default function SeletorEstaca({ estacas, ativaNome, onSelecionar }) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-slate-700 font-medium">Estaca:</label>
      <select
        value={ativaNome || ''}
        onChange={(e) => onSelecionar(e.target.value)}
        className="px-2 py-1 text-sm border border-slate-300 rounded font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {estacas.map((e) => (
          <option key={e.nome} value={e.nome}>
            {e.nome} (cota {e.cotaArrasamento_m ?? '?'} m)
          </option>
        ))}
      </select>
    </div>
  );
}
