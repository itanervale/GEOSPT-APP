/* ============================================================================
 * ModalLimparDominios — confirmação para limpar domínios geotécnicos
 *
 * O usuário escolhe via checkboxes o que deve ser limpo:
 *   - Sondagens (sondagens[*].dominioGeotecnico = null)
 *   - Estacas (estacas[*].dominioGeotecnico = null)
 *
 * Default: ambos marcados.
 *
 * Operação destrutiva — Banner âmbar de aviso. Botão "Limpar" desabilita
 * quando ambos checkboxes estão desmarcados (nada a fazer).
 *
 * Props:
 *   contadores: { sondagensComDominio: n, estacasComDominio: n }
 *   onConfirmar({ sondagens: bool, estacas: bool })
 *   onCancelar()
 * ============================================================================ */

import React, { useState } from 'react';
import BotaoPrim from '@/components/ui/BotaoPrim';

export default function ModalLimparDominios({
  contadores,
  onConfirmar,
  onCancelar,
}) {
  const [limparSondagens, setLimparSondagens] = useState(true);
  const [limparEstacas, setLimparEstacas] = useState(true);

  const nadaSelecionado = !limparSondagens && !limparEstacas;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onCancelar}
    >
      <div
        className="bg-white rounded-lg shadow-2xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-slate-300 bg-slate-50">
          <h3 className="font-bold text-slate-800">Limpar domínios geotécnicos</h3>
        </div>

        <div className="p-4 space-y-3">
          <div className="bg-amber-50 border-l-4 border-amber-500 px-3 py-2 text-xs text-amber-900">
            ⚠ Operação destrutiva. Os domínios geotécnicos atualmente atribuídos
            serão removidos. Esta ação não pode ser desfeita.
          </div>

          <div className="space-y-2">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={limparSondagens}
                onChange={(e) => setLimparSondagens(e.target.checked)}
                className="mt-0.5"
              />
              <div className="text-sm">
                <div className="font-medium text-slate-800">
                  Excluir todos os domínios
                </div>
                <div className="text-xs text-slate-600">
                  {contadores.sondagensComDominio > 0
                    ? `${contadores.sondagensComDominio} furo(s) deixarão de pertencer a algum domínio.`
                    : 'Nenhum domínio cadastrado atualmente.'}
                </div>
              </div>
            </label>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={limparEstacas}
                onChange={(e) => setLimparEstacas(e.target.checked)}
                className="mt-0.5"
              />
              <div className="text-sm">
                <div className="font-medium text-slate-800">
                  Desvincular domínio das estacas
                </div>
                <div className="text-xs text-slate-600">
                  {contadores.estacasComDominio > 0
                    ? `${contadores.estacasComDominio} estaca(s) voltarão a usar todos os furos.`
                    : 'Nenhuma estaca tem domínio atribuído atualmente.'}
                </div>
              </div>
            </label>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-slate-300 bg-slate-50 flex justify-end gap-2">
          <BotaoPrim tipo="secundario" onClick={onCancelar}>
            Cancelar
          </BotaoPrim>
          <BotaoPrim
            disabled={nadaSelecionado}
            tipo={nadaSelecionado ? 'secundario' : 'perigo'}
            onClick={() =>
              onConfirmar({
                sondagens: limparSondagens,
                estacas: limparEstacas,
              })
            }
          >
            Limpar selecionados
          </BotaoPrim>
        </div>
      </div>
    </div>
  );
}
