/* ============================================================================
 * InputSoloCodigo — input numérico de código de solo (modo "código")
 *
 * Comportamento crítico: estado de digitação SEPARADO do solo aplicado. O
 * usuário pode digitar "1" → "12" → "123" sem que o solo seja aplicado
 * prematuramente. Aplicação ocorre no onBlur, Enter ou Tab. Escape cancela.
 *
 * Cores da borda:
 *   - vazio: cinza
 *   - válido: verde
 *   - inválido: vermelho
 *
 * Extraído idêntico das linhas 3376-3444 do geospt_app.jsx.
 * ============================================================================ */

import React from 'react';
import { SOLO_PARA_CODIGO, validarCodigoSolo } from '@/domain/solos';

export default function InputSoloCodigo({
  idx,
  soloAtual,
  rascunho,
  onRascunhoChange,
  onAplicar,
  onLimpar,
}) {
  // Se há rascunho em curso, mostra rascunho; senão, código do solo aplicado
  const codigoDisplay =
    rascunho !== undefined
      ? rascunho
      : soloAtual
      ? SOLO_PARA_CODIGO[soloAtual] || ''
      : '';
  const valDisplay = validarCodigoSolo(codigoDisplay);

  const handleChange = (e) => {
    // Filtra: só dígitos, máximo 3 caracteres
    const v = e.target.value.replace(/\D/g, '').slice(0, 3);
    onRascunhoChange(v);
  };

  const handleBlur = () => {
    if (codigoDisplay === '') {
      onLimpar();
    } else {
      onAplicar(codigoDisplay);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      if (codigoDisplay === '') {
        onLimpar();
      } else {
        onAplicar(codigoDisplay);
      }
    }
    if (e.key === 'Escape') {
      onRascunhoChange(undefined);
      e.target.blur();
    }
  };

  const borderCls = (() => {
    if (codigoDisplay === '') return 'border-slate-300';
    if (valDisplay.valido) return 'border-green-500';
    return 'border-red-400';
  })();

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        inputMode="numeric"
        maxLength={3}
        value={codigoDisplay}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="1/12/321..."
        className={
          'px-2 py-1 text-sm font-mono text-center rounded border focus:outline-none focus:ring-2 focus:ring-blue-500 w-20 ' +
          borderCls
        }
      />
      <span className="text-xs truncate flex-1">
        {codigoDisplay === '' ? (
          <span className="text-slate-400">—</span>
        ) : valDisplay.valido ? (
          <span className="text-slate-700">→ {valDisplay.solo}</span>
        ) : (
          <span className="text-red-600">❌ {valDisplay.motivo}</span>
        )}
      </span>
    </div>
  );
}
