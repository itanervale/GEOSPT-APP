/* ============================================================================
 * CardAlerta — card visual de 1 alerta
 *
 * Props:
 *   alerta: {
 *     id: 'A1' | 'A2' | ...   identificador para auditoria
 *     icone: '🚨' | '⚠' | 'ℹ' símbolo curto
 *     severidade: 'critico' | 'moderado' | 'info'
 *     titulo: string
 *     descricao: ReactNode    pode conter JSX (lista, ênfase, etc.)
 *     implicacao: string      texto consultivo sobre o que isso significa
 *   }
 *
 * Extraído idêntico das linhas 4757-4783 do geospt_app.jsx.
 * ============================================================================ */

import React from 'react';

const CORES_FUNDO = {
  critico: 'border-red-500 bg-red-50',
  moderado: 'border-amber-500 bg-amber-50',
  info: 'border-blue-500 bg-blue-50',
};

const COR_TITULO = {
  critico: 'text-red-900',
  moderado: 'text-amber-900',
  info: 'text-blue-900',
};

export default function CardAlerta({ alerta }) {
  return (
    <div className={'border-l-4 rounded px-3 py-2 ' + CORES_FUNDO[alerta.severidade]}>
      <div className="flex items-baseline gap-2">
        <span className="text-lg shrink-0">{alerta.icone}</span>
        <div className="flex-1 min-w-0">
          <div className={'font-bold text-sm ' + COR_TITULO[alerta.severidade]}>
            <span className="font-mono text-xs mr-1">[{alerta.id}]</span>
            {alerta.titulo}
          </div>
          <div className="text-sm text-slate-700 mt-0.5">{alerta.descricao}</div>
          <div className="text-xs text-slate-600 mt-1 italic">
            {alerta.implicacao}
          </div>
        </div>
      </div>
    </div>
  );
}
