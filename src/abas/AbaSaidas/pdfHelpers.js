/* ============================================================================
 * pdfHelpers — infra compartilhada dos relatórios HTML/PDF (compacto e completo)
 *
 * Funções puras de string: CSS, toolbar (imprimir/baixar), escapes e seções
 * comuns (identificação, sondagens, compatibilização, análise crítica).
 *
 * Portado das linhas 7899-8050 + 8795-8805 do geospt_app.jsx, sem mudança de
 * lógica (são geradores de HTML). escHtml/slugify incluídos aqui.
 * ============================================================================ */

export function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function slugify(s) {
  return (
    String(s || 'obra')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 60) || 'obra'
  );
}

export function cssRelatorio() {
  return `
    @media print {
      body { margin: 0; }
      .no-print { display: none !important; }
      .page-break { page-break-before: always; }
      h2 { page-break-after: avoid; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; page-break-after: auto; }
    }
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #1e293b; max-width: 21cm; margin: 0 auto; padding: 1.5cm; font-size: 10pt; line-height: 1.35; }
    h1 { color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 4px; font-size: 17pt; margin-top: 0; }
    h2 { color: #1e40af; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; font-size: 12pt; margin-top: 18px; }
    h3 { color: #475569; font-size: 11pt; margin-top: 12px; margin-bottom: 6px; }
    h4 { color: #64748b; font-size: 10pt; margin-top: 10px; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 8.5pt; }
    th, td { padding: 2px 5px; border: 1px solid #cbd5e1; text-align: left; }
    th { background: #f1f5f9; font-weight: 600; }
    .label { color: #64748b; font-size: 9pt; }
    .value { font-family: monospace; font-weight: 600; }
    .badge { display: inline-block; padding: 1px 5px; border-radius: 3px; font-size: 8pt; }
    .badge-ok    { background: #dcfce7; color: #166534; }
    .badge-warn  { background: #fef3c7; color: #92400e; }
    .badge-err   { background: #fee2e2; color: #991b1b; }
    .badge-dq    { background: #dbeafe; color: #1e40af; }
    .badge-av    { background: #d1fae5; color: #065f46; }
    .toolbar { position: sticky; top: 0; background: white; padding: 8px 0; border-bottom: 1px solid #cbd5e1; margin-bottom: 14px; display: flex; gap: 8px; flex-wrap: wrap; }
    button { padding: 6px 14px; cursor: pointer; border: 1px solid #475569; background: #1e40af; color: white; border-radius: 4px; font-size: 10pt; }
    button:hover { background: #1e3a8a; }
    button.secondary { background: white; color: #1e40af; }
    .footer { margin-top: 24px; padding-top: 8px; border-top: 1px solid #cbd5e1; font-size: 8pt; color: #64748b; }
    .text-right { text-align: right; }
    .text-mono { font-family: monospace; }
    .small { font-size: 8.5pt; color: #64748b; }
    .destacada { background:#fef9c3; font-weight: 600; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
    .grid-3 table th { font-size: 8pt; }
    .info-box { background: #f8fafc; border-left: 3px solid #94a3b8; padding: 6px 10px; font-size: 9pt; margin: 6px 0; }
  `;
}

export function toolbarHTML(nomeArqHtml) {
  return `<div class="toolbar no-print">
  <button onclick="window.print()">🖨 Imprimir / Salvar como PDF</button>
  <button class="secondary" onclick="downloadHTML()">📄 Baixar como HTML</button>
  <button class="secondary" onclick="window.close()">Fechar</button>
</div>
<script>
function downloadHTML() {
  const blob = new Blob(['<!DOCTYPE html>' + document.documentElement.outerHTML], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = '${nomeArqHtml}';
  a.click(); URL.revokeObjectURL(url);
}
</script>`;
}

export function secaoIdentificacao(ident) {
  return `<h2>1. Identificação</h2>
<table>
  <tr><th style="width:30%">Obra</th><td>${escHtml(ident.nome || '—')}</td></tr>
  <tr><th>Município/UF</th><td>${escHtml(ident.localizacao || '—')}</td></tr>
  <tr><th>Data de cadastro</th><td>${escHtml(ident.dataCadastro || '—')}</td></tr>
  <tr><th>Responsável técnico</th><td>${escHtml(ident.responsavelTecnico || '—')}</td></tr>
  ${ident.observacoes ? `<tr><th>Observações</th><td>${escHtml(ident.observacoes)}</td></tr>` : ''}
</table>`;
}

export function secaoSondagensResumida(sondagens) {
  return `<h2>2. Sondagens (${Object.keys(sondagens).length} furos)</h2>
<table>
  <thead><tr><th>Furo</th><th>Cota topo (m)</th><th>Prof. final (m)</th><th>NA inicial (m)</th><th>NA final (m)</th><th>Critério paralisação</th></tr></thead>
  <tbody>
    ${Object.entries(sondagens)
      .map(
        ([n, s]) =>
          `<tr><td><strong>${escHtml(n)}</strong></td><td class="text-mono text-right">${s.cotaTopo_m ?? '—'}</td><td class="text-mono text-right">${s.profundidadeFinal_m ?? '—'}</td><td class="text-mono text-right">${s.naInicial_m ?? '—'}</td><td class="text-mono text-right">${s.naFinal_m ?? '—'}</td><td>${escHtml(s.criterioParalisacao || '—')}</td></tr>`
      )
      .join('\n')}
  </tbody>
</table>`;
}

export function secaoCompatibilizacaoResumo(compatV) {
  return `<h2>3. Compatibilização</h2>
<table>
  <tr><th style="width:40%">Cotas processadas</th><td class="value">${compatV.cotasProcessadas ?? '—'}</td></tr>
  <tr><th>Furo crítico</th><td>${escHtml(compatV.furoCritico || '—')} ${compatV.furoCriticoPct ? '(' + (compatV.furoCriticoPct * 100).toFixed(0) + '%)' : ''}</td></tr>
  <tr><th>Cotas heterogêneas</th><td>${(compatV.cotasHeterogeneas_m || []).length} cota(s)</td></tr>
  <tr><th>Cotas subamostradas</th><td>${(compatV.cotasSubamostradas_m || []).length} cota(s)</td></tr>
  <tr><th># inversões NSPT</th><td>${compatV.n_inversoes ?? 0}</td></tr>
</table>`;
}

export function secaoAnaliseCritica(aterroV) {
  return `<h2>4. Análise Crítica (alertas)</h2>
<table>
  <tr><th style="width:40%">Média dos topos das sondagens</th><td class="value">${aterroV.mediaTopos_m?.toFixed(2) ?? '—'} m</td></tr>
  <tr><th>Limite aterro/corte adotado</th><td class="value">±${aterroV.limite_m ?? '2.5'} m</td></tr>
  <tr><th>Estacas com aterro espesso</th><td>${(aterroV.estacasComAterroEspesso || []).map((e) => `<span class="badge badge-warn">${escHtml(e.nome)} (+${e.delta?.toFixed(2)} m)</span>`).join(' ') || '<em>nenhuma</em>'}</td></tr>
  <tr><th>Estacas com corte elevado</th><td>${(aterroV.estacasComCorteElevado || []).map((e) => `<span class="badge badge-warn">${escHtml(e.nome)} (${e.delta?.toFixed(2)} m)</span>`).join(' ') || '<em>nenhuma</em>'}</td></tr>
</table>`;
}

export function secaoSondagensCompleta(sondagens) {
  let html = `<h2>2. Sondagens (${Object.keys(sondagens).length} furos)</h2>
<table>
  <thead><tr><th>Furo</th><th>Cota topo (m)</th><th>Prof. final (m)</th><th>NA inicial (m)</th><th>NA final (m)</th><th>Critério paralisação</th><th>Coord X</th><th>Coord Y</th></tr></thead>
  <tbody>
    ${Object.entries(sondagens)
      .map(
        ([n, s]) =>
          `<tr><td><strong>${escHtml(n)}</strong></td><td class="text-mono text-right">${s.cotaTopo_m ?? '—'}</td><td class="text-mono text-right">${s.profundidadeFinal_m ?? '—'}</td><td class="text-mono text-right">${s.naInicial_m ?? '—'}</td><td class="text-mono text-right">${s.naFinal_m ?? '—'}</td><td>${escHtml(s.criterioParalisacao || '—')}</td><td class="text-mono text-right">${s.coordenadas?.x ?? '—'}</td><td class="text-mono text-right">${s.coordenadas?.y ?? '—'}</td></tr>`
      )
      .join('\n')}
  </tbody>
</table>

<h3>2.1. Leituras SPT por furo</h3>`;
  html += '<div class="grid-2">';
  Object.entries(sondagens).forEach(([n, s]) => {
    const cotaTopo = s.cotaTopo_m;
    html += `<div><h4>${escHtml(n)} (cota topo ${cotaTopo ?? '—'} m)</h4>
<table>
  <thead><tr><th>Prof. (m)</th><th>Cota abs. (m)</th><th>NSPT</th><th>Solo</th></tr></thead>
  <tbody>
    ${(s.leituras || [])
      .map((L) => {
        const cotaAbs =
          Number.isFinite(cotaTopo) && Number.isFinite(L.profundidade_m)
            ? (cotaTopo - L.profundidade_m).toFixed(2)
            : '—';
        const nsptDisplay = L.impenetravel
          ? `${L.nspt_calculo} <span class="badge badge-warn">imp.</span>`
          : (L.nspt_calculo ?? '—');
        return `<tr><td class="text-mono text-right">${L.profundidade_m ?? '—'}</td><td class="text-mono text-right">${cotaAbs}</td><td class="text-mono text-right">${nsptDisplay}</td><td class="small">${escHtml(L.solo || '—')}</td></tr>`;
      })
      .join('\n')}
  </tbody>
</table></div>`;
  });
  html += '</div>';
  return html;
}

export function secaoCompatibilizacaoCompleta(compat, compatV) {
  let html =
    `<h2>3. Compatibilização (envoltória inferior, cota a cota)</h2>` +
    secaoCompatibilizacaoResumo(compatV).replace(/^<h2>[^<]+<\/h2>/, '');
  html += '<h3>3.1. Tabela cota a cota</h3>';
  html += `<table>
<thead><tr><th>Cota (m)</th><th>NSPT envoltória</th><th>Solo</th><th>Família</th><th>NSPT real</th><th>Impen.</th><th># furos</th><th>Heterog.</th></tr></thead>
<tbody>
${(compat?.resultados || [])
  .map((r) => {
    const hh = r.metricas?.heterogeneo;
    return `<tr><td class="text-mono text-right">${r.cotaRef_m}</td><td class="text-mono text-right">${r.envoltoria.nspt ?? '—'}</td><td>${escHtml(r.envoltoria.solo || '—')}</td><td>${escHtml(r.envoltoria.familia || '—')}</td><td class="text-mono text-right">${r.envoltoria.nspt_real ?? '—'}</td><td class="text-mono text-right">${r.envoltoria.impenetravel ? 'sim' : ''}</td><td class="text-mono text-right">${r.metricas?.n_furos_amostrados ?? '—'}</td><td>${hh ? '<span class="badge badge-warn">sim</span>' : ''}</td></tr>`;
  })
  .join('\n')}
</tbody>
</table>`;
  return html;
}

// Tabela do memorial Modo 1 / 2.x (cota a cota com DQ + AV)
export function tabelaMemorialModoComEnvoltoria(memDq, memAv, cotaSug) {
  const avMap = {};
  (memAv || []).forEach((m) => {
    avMap[m.cotaPonta_m] = m;
  });
  return `<table>
<thead><tr><th>Cota ponta (m)</th><th>Prof. (m)</th><th>DQ R_l (tf)</th><th>DQ R_p (tf)</th><th>DQ Q_adm (tf)</th><th>AV R_l (tf)</th><th>AV R_p (tf)</th><th>AV Q_adm (tf)</th></tr></thead>
<tbody>
${(memDq || [])
  .map((d) => {
    const a = avMap[d.cotaPonta_m];
    const destacar = d.cotaPonta_m === cotaSug;
    return `<tr${destacar ? ' class="destacada"' : ''}>
    <td class="text-mono text-right">${destacar ? '★ ' : ''}${d.cotaPonta_m}</td>
    <td class="text-mono text-right">${d.profDesdeArrasamento_m}</td>
    <td class="text-mono text-right">${(d.Ql_total_kN / 9.81).toFixed(2)}</td>
    <td class="text-mono text-right">${(d.Rp_final_kN / 9.81).toFixed(2)}</td>
    <td class="text-mono text-right">${d.Qadm_final_tf?.toFixed(2) ?? '—'}</td>
    <td class="text-mono text-right">${a ? (a.Ql_total_kN / 9.81).toFixed(2) : '—'}</td>
    <td class="text-mono text-right">${a ? (a.Rp_final_kN / 9.81).toFixed(2) : '—'}</td>
    <td class="text-mono text-right">${a?.Qadm_final_tf?.toFixed(2) ?? '—'}</td>
  </tr>`;
  })
  .join('\n')}
</tbody></table>`;
}

// Bloco de identificação + cota sugerida para uma estaca
export function blocoEstacaCabecalho(estaca, params, cotaConsM1, temAlvo, carga) {
  return `<table>
  <tr><th style="width:25%">Tipo de estaca</th><td>${escHtml(estaca.tipoEstaca)}</td>
      <th style="width:25%">Diâmetro</th><td class="value">${estaca.diametro_m} m</td></tr>
  <tr><th>Cota de arrasamento</th><td class="value">${estaca.cotaArrasamento_m} m</td>
      <th>Carga prevista</th><td class="value">${temAlvo ? carga + ' tf' : '<em>não definida</em>'}</td></tr>
  <tr><th>Coordenadas</th><td>${estaca.coordenadas ? `(${estaca.coordenadas.x ?? '—'}, ${estaca.coordenadas.y ?? '—'})` : '—'}</td>
      <th>Tratamento de ponta</th><td>${escHtml(params.tratamentoPonta || 'calculado')}</td></tr>
  <tr><th>Capacidade estrutural</th><td>${estaca.cargaEstrutural_tf_custom != null ? `<span class="badge badge-warn">${estaca.cargaEstrutural_tf_custom} tf (custom)</span>` : 'tabela'}</td>
      <th>Limita R_p ≤ R_l</th><td>${params.limitaRpRl ? 'Sim' : 'Não'}</td></tr>
  <tr><th>Despreza atrito último 1 m</th><td>${(params.desprezaUltimoMetroAtrito ?? true) ? 'Sim' : 'Não'}</td>
      <th>Coeficientes</th><td>${params.coeficientesCustomizados ? '<span class="badge badge-warn">CUSTOMIZADOS</span>' : 'padrão'}</td></tr>
  ${cotaConsM1 && cotaConsM1.cota_m != null ? `<tr><th>Cota sugerida (Modo 1)</th><td class="value">${cotaConsM1.cota_m} m (limitante ${cotaConsM1.regente})</td>
      <th>Q_adm DQ / AV na cota</th><td class="value">${cotaConsM1.dq?.Qadm_final_tf?.toFixed(2) ?? '—'} / ${cotaConsM1.av?.Qadm_final_tf?.toFixed(2) ?? '—'} tf</td></tr>` : ''}
</table>`;
}
