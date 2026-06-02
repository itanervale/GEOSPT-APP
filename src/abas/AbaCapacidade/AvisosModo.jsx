/* ============================================================================
 * AvisosModo — lista de avisos (camadas sem dado, etc.) do modo de cálculo
 * Extraído idêntico das linhas 8994-9007 do geospt_app.jsx.
 * ============================================================================ */

import React from 'react';

export default function AvisosModo({ avisos }) {
  if (!avisos || avisos.length === 0) return null;
  return (
    <div className="mt-3 space-y-1">
      {avisos.map((a, i) => (
        <div
          key={i}
          className="text-xs bg-amber-50 border-l-4 border-amber-500 px-2 py-1 text-amber-900"
        >
          ⚠ {a.tipo && <strong className="font-mono">[{a.tipo}]</strong>}{' '}
          {a.cota_m !== undefined && (
            <span className="font-mono">cota {a.cota_m}m: </span>
          )}
          {a.justificativa || a.mensagem || JSON.stringify(a)}
        </div>
      ))}
    </div>
  );
}
