/* ============================================================================
 * Tabs — navegação entre as 7 abas do app
 *
 * Lê estado.ui.abaAtiva e dispara setUi('abaAtiva', id) ao clicar.
 * Extraído idêntico das linhas 3046-3068 do geospt_app.jsx.
 * ============================================================================ */

import React from 'react';
import { useObra } from '@/state/ObraProvider';
import { ABAS } from './abas';

export default function Tabs() {
  const { estado, setUi } = useObra();
  return (
    <nav className="bg-slate-100 border-b border-slate-300 px-2 flex gap-0.5 overflow-x-auto">
      {ABAS.map((a) => {
        const ativa = estado.ui.abaAtiva === a.id;
        return (
          <button
            key={a.id}
            onClick={() => setUi('abaAtiva', a.id)}
            className={
              'px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ' +
              (ativa
                ? 'bg-white text-blue-700 border-blue-600'
                : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-50')
            }
          >
            {a.rotulo}
          </button>
        );
      })}
    </nav>
  );
}
