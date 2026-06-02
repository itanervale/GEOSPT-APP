/* ============================================================================
 * Disclaimer — rodapé persistente com aviso técnico
 *
 * Texto não modificado. Versão exata das linhas 9203-9213 do geospt_app.jsx.
 * Renderizado em todas as abas, sempre visível.
 * ============================================================================ */

import React from 'react';

export default function Disclaimer() {
  return (
    <footer className="bg-slate-50 border-t border-slate-300 px-4 py-2 text-xs text-slate-700 leading-snug">
      <strong className="text-slate-900">⚠ Aviso técnico:</strong> O GeoSPT
      realiza estimativas semiempíricas de capacidade de carga geotécnica com
      base em dados de sondagem SPT e coeficientes selecionados pelo usuário.
      Os resultados <strong>não substituem</strong> o projeto executivo de
      fundações, a análise de recalques, a verificação estrutural da estaca,
      a avaliação de grupo, o controle tecnológico e a responsabilidade técnica
      do projetista.
    </footer>
  );
}
