/* ============================================================================
 * PainelConfigCalculo — configurações globais de cálculo
 *
 * Controla os flags de cálculo aplicados a TODAS as estacas:
 *   - desprezaUltimoMetroAtrito (default: true)
 *   - aplicaFatorRedutorPonta   (default: false)
 *   - limitaRpRl                (default: false)
 *   - tratamentoPonta           ('calculado' | 'sem_contato' | 'contato_ressalva')
 *
 * Inclui o EditorCoeficientesCompleto (CP-8b) — editor célula-a-célula de
 * todas as tabelas DQ e AV. Por default fica colapsado.
 *
 * Cópia funcional das linhas 5001-5059 do geospt_app.jsx.
 *
 * Props:
 *   config           — objeto de configuração atual (estado.obra.parametros.configCalculo)
 *   setConfigGlobal  — fn(campo, valor) → atualiza um campo da config
 * ============================================================================ */

import React from 'react';
import EditorCoeficientesCompleto from './EditorCoeficientesCompleto';

export default function PainelConfigCalculo({ config, setConfigGlobal }) {
  // Helper para checkbox
  const cb = (campo, label, hint = null) => (
    <label className="flex items-start gap-2 text-sm cursor-pointer py-0.5">
      <input
        type="checkbox"
        checked={config[campo]}
        onChange={(e) => setConfigGlobal(campo, e.target.checked)}
        className="mt-0.5"
      />
      <div>
        <div className="text-slate-800">{label}</div>
        {hint && <div className="text-xs text-slate-500">{hint}</div>}
      </div>
    </label>
  );

  // Helper para radio (tratamento de ponta)
  const radio = (valor, label, hint = null) => (
    <label className="flex items-start gap-2 text-sm cursor-pointer py-0.5">
      <input
        type="radio"
        name="tratamentoPonta"
        checked={config.tratamentoPonta === valor}
        onChange={() => setConfigGlobal('tratamentoPonta', valor)}
        className="mt-0.5"
      />
      <div>
        <div className="text-slate-800">{label}</div>
        {hint && <div className="text-xs text-slate-500">{hint}</div>}
      </div>
    </label>
  );

  return (
    <div className="bg-white border border-slate-300 rounded">
      <div className="p-2 border-b border-slate-300 bg-slate-50">
        <h3 className="text-sm font-bold text-slate-700">
          ⚙ Configurações globais de cálculo
        </h3>
      </div>
      <div className="p-3 space-y-2">
        {cb(
          'desprezaUltimoMetroAtrito',
          'Desprezar atrito do último 1 m (bulbo)',
          'Default: ☑ — prática usual'
        )}
        {cb(
          'aplicaFatorRedutorPonta',
          'Aplicar fator redutor de ponta (Tabela 1.9)',
          'Default: ☐'
        )}
        {cb(
          'limitaRpRl',
          'Limitar R_p ≤ R_l (regra Décourt adicional)',
          'Default: ☐ — independente do tratamento de ponta abaixo'
        )}

        <div className="border-t border-slate-200 pt-2 mt-2">
          <div className="text-sm font-bold text-slate-700 mb-1">
            Tratamento de ponta (exclusivo):
          </div>
          {radio('calculado', 'R_p = calculado (padrão)')}
          {radio(
            'sem_contato',
            'R_p = 0 e P_adm = R_l/2',
            'NBR 6122:2022 item 8.2.1.2 — sem contato garantido'
          )}
          {radio(
            'contato_ressalva',
            'R_p = min(R_p, R_l) e P_adm = min(parcial, global)',
            'NBR 6122:2022 item 8.2.1.2 — contato com ressalva'
          )}
          <div className="mt-1.5 p-2 bg-amber-50 border-l-2 border-amber-400 text-xs text-amber-900">
            ⚠ Estes modos <strong>não substituem</strong> o checkbox "Limitar
            R_p ≤ R_l" acima. O checkbox aplica-se ao R_p após o tratamento
            escolhido aqui.
          </div>
        </div>

        {/* Editor de coeficientes completo (CP-8b) */}
        <EditorCoeficientesCompleto
          config={config}
          setConfigGlobal={setConfigGlobal}
        />
      </div>
    </div>
  );
}
