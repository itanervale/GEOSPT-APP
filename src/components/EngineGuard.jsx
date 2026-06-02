/* ============================================================================
 * GeoSPT — EngineGuard
 *
 * Componente de proteção: renderiza children apenas se a engine GeoSPT estiver
 * carregada e expor os campos mínimos. Caso contrário, mostra mensagem de
 * diagnóstico em vez de tela branca ou stack trace.
 *
 * Em Vite com engine como ES module síncrono, esse guard deve sempre passar.
 * Mas mantemos a checagem para detectar regressões silenciosas (engine
 * quebrada, crypto.subtle indisponível em contexto não-seguro, etc.).
 * ============================================================================ */

import React from 'react';
import { GeoSPT } from '@/engine/geospt-engine';

const CAMPOS_OBRIGATORIOS = ['versao', 'domain', 'engine', 'validation', 'export', 'util'];

function diagnosticar() {
  if (!GeoSPT) {
    return { ok: false, motivo: 'GeoSPT é null/undefined (import falhou)' };
  }
  const faltando = CAMPOS_OBRIGATORIOS.filter((c) => !GeoSPT[c]);
  if (faltando.length > 0) {
    return { ok: false, motivo: 'Campos obrigatórios ausentes: ' + faltando.join(', ') };
  }
  if (typeof globalThis !== 'undefined' && !globalThis.crypto?.subtle) {
    return {
      ok: false,
      motivo:
        'globalThis.crypto.subtle indisponível — abrir o app em http://localhost ou https://, não em file://',
    };
  }
  return { ok: true };
}

export default function EngineGuard({ children }) {
  const diag = diagnosticar();
  if (diag.ok) return children;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-lg bg-white border-2 border-red-300 rounded-lg shadow-md p-6">
        <h1 className="text-lg font-semibold text-red-700 mb-2">
          ⚠ Engine GeoSPT não carregou
        </h1>
        <p className="text-sm text-slate-700 mb-3">{diag.motivo}</p>
        <p className="text-xs text-slate-500">
          Cenários comuns: arquivo de engine corrompido, conflito de
          importação, ou ambiente sem <code>crypto.subtle</code> disponível.
          Verificar console do navegador para mais detalhes.
        </p>
      </div>
    </div>
  );
}
