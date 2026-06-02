/* ============================================================================
 * AbaSaidas — Aba 7 (Saídas / Exportações)
 *
 * CP-10a: XLSX (SheetJS via npm) e JSON de auditoria funcionais.
 *         PDF compacto e completo entram nos CP-10b / CP-10c (stubs por ora).
 *
 * Portado de AbaSaidas (linhas 8807-8988 do geospt_app.jsx). Mudanças:
 *   - XLSX importado via npm (import * as XLSX), não CDN
 *   - gerarWorkbookXLSX importado do módulo local
 *   - slugify local (não havia util compartilhado)
 *   - PDFs desabilitados com aviso de roadmap até CP-10b/c
 * ============================================================================ */

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { useObra } from '@/state/ObraProvider';
import { gerarWorkbookXLSX } from './gerarWorkbookXLSX';
import { gerarAuditoriaJSON } from './gerarAuditoriaJSON';
import { gerarPDFCompacto } from './gerarPDFCompacto';
import { gerarPDFCompleto } from './gerarPDFCompleto';

function slugify(s) {
  return String(s || 'obra')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60) || 'obra';
}

export default function AbaSaidas() {
  const { estado, exportarObra } = useObra();
  const obra = estado.obra;
  const [statusXLSX, setStatusXLSX] = useState({ tipo: 'idle', msg: '' });
  const [statusJSON, setStatusJSON] = useState({ tipo: 'idle', msg: '' });
  const [statusAudit, setStatusAudit] = useState({ tipo: 'idle', msg: '' });
  const [statusPDFc, setStatusPDFc] = useState({ tipo: 'idle', msg: '' });
  const [statusPDFf, setStatusPDFf] = useState({ tipo: 'idle', msg: '' });

  const nomeObra = obra.identificacao?.nome || 'obra';
  const slug = slugify(nomeObra);
  const dataIso = new Date().toISOString().slice(0, 10);

  const handleExportXLSX = async () => {
    setStatusXLSX({ tipo: 'loading', msg: 'Gerando workbook...' });
    try {
      const payload = await exportarObra();
      const wb = gerarWorkbookXLSX(XLSX, obra, payload);
      const fname = `geospt_${slug}_${dataIso}.xlsx`;
      XLSX.writeFile(wb, fname);
      setStatusXLSX({ tipo: 'ok', msg: 'Arquivo gerado: ' + fname });
    } catch (e) {
      setStatusXLSX({ tipo: 'erro', msg: 'Erro: ' + e.message });
    }
  };

  const handleExportJSON = async () => {
    setStatusJSON({ tipo: 'loading', msg: 'Gerando JSON...' });
    try {
      const payload = await exportarObra();
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `geospt_${slug}_${dataIso}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusJSON({ tipo: 'ok', msg: 'JSON baixado.' });
    } catch (e) {
      setStatusJSON({ tipo: 'erro', msg: 'Erro: ' + e.message });
    }
  };

  const handleExportAuditoria = async () => {
    setStatusAudit({ tipo: 'loading', msg: 'Calculando modos de todas as estacas...' });
    try {
      const payloadObra = await exportarObra();
      const auditoria = gerarAuditoriaJSON(obra, payloadObra);
      const blob = new Blob([JSON.stringify(auditoria, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `geospt_auditoria_${slug}_${dataIso}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusAudit({
        tipo: 'ok',
        msg: `Auditoria gerada (${auditoria.estacas.length} estaca(s)).`,
      });
    } catch (e) {
      setStatusAudit({ tipo: 'erro', msg: 'Erro: ' + e.message });
    }
  };

  const handleExportPDFCompacto = async () => {
    setStatusPDFc({ tipo: 'loading', msg: 'Gerando relatório...' });
    try {
      const payload = await exportarObra();
      const html = gerarPDFCompacto(obra, payload);
      const win = window.open('', '_blank');
      if (!win) {
        setStatusPDFc({
          tipo: 'erro',
          msg: 'Pop-up bloqueado. Permita pop-ups para este site.',
        });
        return;
      }
      win.document.open();
      win.document.write(html);
      win.document.close();
      setStatusPDFc({
        tipo: 'ok',
        msg: 'Aberto em nova aba — use "Imprimir / Salvar como PDF".',
      });
    } catch (e) {
      setStatusPDFc({ tipo: 'erro', msg: 'Erro: ' + e.message });
    }
  };

  const handleExportPDFCompleto = async () => {
    setStatusPDFf({ tipo: 'loading', msg: 'Gerando relatório completo...' });
    try {
      const payload = await exportarObra();
      const html = gerarPDFCompleto(obra, payload);
      const win = window.open('', '_blank');
      if (!win) {
        setStatusPDFf({
          tipo: 'erro',
          msg: 'Pop-up bloqueado. Permita pop-ups para este site.',
        });
        return;
      }
      win.document.open();
      win.document.write(html);
      win.document.close();
      setStatusPDFf({
        tipo: 'ok',
        msg: 'Aberto em nova aba — use "Imprimir / Salvar como PDF".',
      });
    } catch (e) {
      setStatusPDFf({ tipo: 'erro', msg: 'Erro: ' + e.message });
    }
  };

  const statusCls = (s) =>
    s.tipo === 'ok'
      ? 'text-green-700'
      : s.tipo === 'erro'
        ? 'text-red-700'
        : s.tipo === 'loading'
          ? 'text-blue-700'
          : 'text-slate-500';

  const podeExportar =
    Object.keys(obra.sondagens || {}).length >= 1 &&
    (obra.estacas || []).length >= 1;

  return (
    <div className="p-4 max-w-full">
      <h2 className="text-lg font-bold text-slate-800 mb-1">7. Saídas</h2>
      <p className="text-sm text-slate-600 mb-4">
        Exportação do projeto. JSON serve para reabertura no app; XLSX para
        análises técnicas; PDF/HTML para documento de entrega.
      </p>

      {!podeExportar && (
        <div className="mb-4 px-3 py-2 bg-amber-50 border-l-4 border-amber-400 text-sm text-amber-900">
          ⚠ Para exportar, é necessário pelo menos 1 sondagem (Aba 2) e 1 estaca
          (Aba 5).
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* XLSX */}
        <div className="bg-white border border-slate-300 rounded p-4">
          <div className="text-lg font-bold text-emerald-700 mb-2">
            📊 XLSX
          </div>
          <div className="text-xs text-slate-600 mb-3">
            Planilha com até 9 abas: identificação, sondagens, estacas,
            compatibilização, modos de cálculo (estaca selecionada) e auditoria.
          </div>
          <button
            disabled={!podeExportar || statusXLSX.tipo === 'loading'}
            onClick={handleExportXLSX}
            className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors"
          >
            Baixar XLSX
          </button>
          {statusXLSX.msg && (
            <div className={'mt-2 text-xs ' + statusCls(statusXLSX)}>
              {statusXLSX.msg}
            </div>
          )}
        </div>

        {/* JSON */}
        <div className="bg-white border border-slate-300 rounded p-4">
          <div className="text-lg font-bold text-slate-700 mb-2">💾 JSON</div>
          <div className="text-xs text-slate-600 mb-3">
            Arquivo completo da obra com hashes de integridade. Pode ser
            reaberto no app (botão "Carregar obra" no cabeçalho).
          </div>
          <button
            disabled={!podeExportar || statusJSON.tipo === 'loading'}
            onClick={handleExportJSON}
            className="w-full px-3 py-2 bg-slate-600 hover:bg-slate-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors"
          >
            Baixar JSON
          </button>
          {statusJSON.msg && (
            <div className={'mt-2 text-xs ' + statusCls(statusJSON)}>
              {statusJSON.msg}
            </div>
          )}
        </div>

        {/* JSON Auditoria */}
        <div className="bg-white border border-slate-300 rounded p-4">
          <div className="text-lg font-bold text-violet-700 mb-2">
            🔎 JSON Auditoria
          </div>
          <div className="text-xs text-slate-600 mb-3">
            Registro datado dos resultados: cada estaca nos 4 modos + comparativo,
            com a cota sugerida (critério: mais rasa onde DQ e AV atendem). Para
            perícia/registro — não reabre no app.
          </div>
          <button
            disabled={!podeExportar || statusAudit.tipo === 'loading'}
            onClick={handleExportAuditoria}
            className="w-full px-3 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors"
          >
            Baixar JSON Auditoria
          </button>
          {statusAudit.msg && (
            <div className={'mt-2 text-xs ' + statusCls(statusAudit)}>
              {statusAudit.msg}
            </div>
          )}
        </div>

        {/* PDF Compacto */}
        <div className="bg-white border border-slate-300 rounded p-4">
          <div className="text-lg font-bold text-blue-700 mb-2">
            📄 PDF Compacto
          </div>
          <div className="text-xs text-slate-600 mb-3">
            Memorial enxuto da estaca selecionada: resumo dos 4 modos + memorial
            cota a cota do Modo 1. Abre em nova aba para imprimir/salvar como PDF.
          </div>
          <button
            disabled={!podeExportar || statusPDFc.tipo === 'loading'}
            onClick={handleExportPDFCompacto}
            className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors"
          >
            Gerar PDF Compacto
          </button>
          {statusPDFc.msg && (
            <div className={'mt-2 text-xs ' + statusCls(statusPDFc)}>
              {statusPDFc.msg}
            </div>
          )}
        </div>

        {/* PDF Completo */}
        <div className="bg-white border border-slate-300 rounded p-4">
          <div className="text-lg font-bold text-indigo-700 mb-2">
            📑 PDF Completo
          </div>
          <div className="text-xs text-slate-600 mb-3">
            Relatório técnico de todas as estacas em todos os modos (1, 2.1,
            2.2, 2.3, 3, 4) + auditoria com as 7 tabelas de coeficientes. Abre em
            nova aba.
          </div>
          <button
            disabled={!podeExportar || statusPDFf.tipo === 'loading'}
            onClick={handleExportPDFCompleto}
            className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors"
          >
            Gerar PDF Completo
          </button>
          {statusPDFf.msg && (
            <div className={'mt-2 text-xs ' + statusCls(statusPDFf)}>
              {statusPDFf.msg}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600">
        O XLSX usa a estaca selecionada na Aba 6:{' '}
        <strong>
          {estado.ui?.estacaSelecionada || obra.estacas?.[0]?.nome || '—'}
        </strong>{' '}
        para as abas de memorial por modo.
      </div>
    </div>
  );
}
