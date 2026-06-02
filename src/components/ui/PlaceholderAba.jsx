/* ============================================================================
 * PlaceholderAba — placeholder para abas ainda não construídas
 *
 * Props:
 *   titulo: cabeçalho da aba
 *   descricao: texto explicativo
 *   commitFuturo: identificador do CP onde a aba será implementada (ex.: "CP-5")
 *   dadosResumo: opcional — string para mostrar o que está no Context
 *
 * Extraído das linhas 3071-3087 do geospt_app.jsx. Adaptação textual:
 * "Commit 1 — esqueleto" → "Checkpoint atual: CP-3 (UI base)" para alinhar
 * com a nova nomenclatura de checkpoints da migração Vite.
 * ============================================================================ */

import React from 'react';
import Banner from './Banner';

export default function PlaceholderAba({
  titulo,
  descricao,
  commitFuturo,
  dadosResumo,
}) {
  return (
    <div className="p-6 max-w-5xl">
      <h2 className="text-lg font-bold text-slate-800 mb-1">{titulo}</h2>
      <p className="text-sm text-slate-600 mb-4">{descricao}</p>
      <Banner tipo="info">
        <strong>CP-3 — UI base.</strong> Esta aba será construída em{' '}
        <strong>{commitFuturo}</strong>.
      </Banner>
      {dadosResumo && (
        <div className="mt-4 bg-slate-50 border border-slate-200 rounded p-3 text-sm">
          <div className="text-xs text-slate-500 mb-1 uppercase tracking-wide font-mono">
            Dados disponíveis no Context:
          </div>
          <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-all font-mono">
            {dadosResumo}
          </pre>
        </div>
      )}
    </div>
  );
}
