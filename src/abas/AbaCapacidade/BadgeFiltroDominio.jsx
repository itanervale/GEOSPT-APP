/* ============================================================================
 * BadgeFiltroDominio — indicador de filtro de domínio no cálculo (CP-12c)
 *
 * SPEC item 5: no card de cálculo, mostrar se a estaca está filtrada por
 * domínio (e qual) ou usando todos os furos. Torna explícito ao engenheiro
 * que o Q_adm pode diferir por causa do filtro (mitigação do risco R-C7B-1).
 *
 * Props:
 *   filtro — saída de resolverFurosParaCalculo:
 *            { temFiltro, dominio, nFuros, modo4Disponivel }
 * ============================================================================ */

import React from 'react';
import { classesCor } from '@/state/dominiosHelper';

export default function BadgeFiltroDominio({ filtro }) {
  if (!filtro) return null;

  if (!filtro.temFiltro) {
    return (
      <div className="mb-2 inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs bg-slate-100 text-slate-600 border border-slate-200">
        <span className="w-2 h-2 rounded-full bg-slate-400" />
        Sem filtro de domínio — usando todos os {filtro.nFuros} furos da obra
      </div>
    );
  }

  const c = classesCor(filtro.dominio.cor);
  return (
    <div
      className={
        'mb-2 inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs border ' +
        c.bg +
        ' ' +
        c.text +
        ' ' +
        c.border
      }
    >
      <span className={'w-2 h-2 rounded-full ' + c.dot} />
      Filtrado: domínio <strong>{filtro.dominio.nome}</strong> ({filtro.nFuros}{' '}
      furo{filtro.nFuros === 1 ? '' : 's'})
      {!filtro.modo4Disponivel && (
        <span className="ml-1 text-amber-700">· Modo 4 indisponível (&lt;3)</span>
      )}
    </div>
  );
}
