/* ============================================================================
 * App — raiz do GeoSPT
 *
 * Estrutura (CP-6.3 — layout fixo):
 *   EngineGuard         ← protege contra engine indisponível
 *     ObraProvider      ← context global do estado
 *       <div h-screen flex flex-col overflow-hidden>
 *         Header        ← topo fixo (shrink-0)
 *         Tabs          ← topo fixo (shrink-0)
 *         <main flex-1 overflow-auto>  ← ÚNICA área que rola
 *           ConteudoAba
 *         </main>
 *         Disclaimer    ← rodapé fixo (shrink-0)
 *
 * Garante que ao rolar uma aba longa (Aba 2 com SPT-01 + perfil),
 * o cabeçalho, navegação e disclaimer permaneçam visíveis.
 *
 * Mudança de min-h-screen → h-screen: força altura igual à viewport e
 * habilita o flex layout (sem isso o `flex-1 overflow-auto` no main não
 * delimita altura, e o overflow rola na página inteira).
 * ============================================================================ */

import React from 'react';
import EngineGuard from '@/components/EngineGuard';
import ErrorBoundary from '@/components/ErrorBoundary';
import RecuperacaoAutosave from '@/components/RecuperacaoAutosave';
import { ObraProvider } from '@/state/ObraProvider';
import Header from '@/layout/Header';
import Tabs from '@/layout/Tabs';
import ConteudoAba from '@/abas/ConteudoAba';
import Disclaimer from '@/components/ui/Disclaimer';

export default function App() {
  return (
    <EngineGuard>
      <ObraProvider>
        <RecuperacaoAutosave />
        <div className="h-screen flex flex-col bg-slate-50 text-slate-900 overflow-hidden">
          <div className="shrink-0">
            <Header />
            <Tabs />
          </div>
          <main className="flex-1 overflow-auto">
            <ErrorBoundary titulo="Erro ao exibir esta aba">
              <ConteudoAba />
            </ErrorBoundary>
          </main>
          <div className="shrink-0">
            <Disclaimer />
          </div>
        </div>
      </ObraProvider>
    </EngineGuard>
  );
}
