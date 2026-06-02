/* ============================================================================
 * InputCoef — input numérico com validação de range plausível
 *
 * Props:
 *   value        valor atual (number | null | undefined)
 *   onChange     callback ao alterar
 *   step         incremento (ex.: 0.01, 0.5)
 *   range        [min, max] do range plausível (aviso, não bloqueio)
 *   casas        casas decimais (default 2)
 *   suffix       sufixo da unidade no título (ex.: '°', 'kPa')
 *   defaultVal   valor a exibir quando value é null/undefined
 *
 * Borda âmbar + ícone ⚠ quando fora do range — aviso, não impede salvar.
 *
 * Extraído idêntico das linhas 5092-5110 do geospt_app.jsx. Mudança mínima:
 * `text-xxs` → `text-[10px]` (text-xxs não é classe Tailwind padrão).
 * ============================================================================ */

import React from 'react';

export default function InputCoef({
  value,
  onChange,
  step,
  range,
  casas = 2,
  suffix = '',
  defaultVal,
}) {
  const fora =
    value !== undefined && value !== null
      ? value < range[0] || value > range[1]
      : false;

  const valorExibido =
    value !== undefined && value !== null
      ? value.toFixed(casas)
      : defaultVal != null
      ? defaultVal.toFixed(casas)
      : '';

  return (
    <div className="flex items-center justify-end gap-1">
      <input
        type="number"
        step={step}
        value={valorExibido}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={
          'w-20 px-1 py-0.5 text-xs text-right font-mono border rounded focus:outline-none focus:ring-1 ' +
          (fora
            ? 'border-amber-400 bg-amber-50 focus:ring-amber-500'
            : 'border-slate-300 focus:ring-blue-500')
        }
        title={
          fora
            ? `Fora do range plausível [${range[0]}–${range[1]}${suffix}]`
            : undefined
        }
      />
      {fora && (
        <span
          className="text-amber-700 text-[10px]"
          title={`Fora do range [${range[0]}–${range[1]}${suffix}]`}
        >
          ⚠
        </span>
      )}
    </div>
  );
}
