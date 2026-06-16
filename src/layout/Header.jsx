/* ============================================================================
 * Header — barra superior com nome da obra e ações globais
 *
 * Ações: Carregar Balsas demo, Importar JSON, Exportar JSON (com dropdown:
 * Baixar arquivo ou Visualizar em modal).
 *
 * Extraído das linhas 2771-2979 do geospt_app.jsx. Mudanças mínimas:
 * - `window.GeoSPT.versao` → `GeoSPT.versao` (import explícito)
 * - `BALSAS_DEMO_DATA` (duplicado no app) → `BALSAS` (do dataset externo)
 * - Imports relativos via alias `@/`
 *
 * Toda a lógica de fluxo (toast, fileInput, dropdown export) é idêntica.
 * ============================================================================ */

import React, { useRef, useState } from 'react';
import { useObra } from '@/state/ObraProvider';
import { SCHEMA_VERSAO } from '@/state/estadoInicial';
import { GeoSPT } from '@/engine/geospt-engine';
import { BALSAS } from '@/engine/dataset-balsas';
import Banner from '@/components/ui/Banner';
import BotaoPrim from '@/components/ui/BotaoPrim';
import ModalExportar from '@/components/ui/ModalExportar';
import ModalConfirmar from '@/components/ui/ModalConfirmar';

export default function Header() {
  const { estado, carregarObra, exportarObra, autosaveStatus, novaObra } = useObra();
  const fileInputRef = useRef(null);
  const [toast, setToast] = useState(null);
  const [confirmarNovo, setConfirmarNovo] = useState(false);

  const mostrarToast = (tipo, msg, durMs = 3000) => {
    setToast({ tipo, msg });
    setTimeout(() => setToast(null), durMs);
  };

  // Estado para modal de export (mostra JSON em textarea)
  const [exportarModal, setExportarModal] = useState(null);
  const [menuExportAberto, setMenuExportAberto] = useState(false);
  const fecharMenuExport = () => setMenuExportAberto(false);

  const prepararPayloadExport = async () => {
    const payload = await exportarObra();
    const conteudo = JSON.stringify(payload, null, 2);
    const nomeArq = (payload.obra.identificacao.nome || 'obra').replace(
      /[^a-zA-Z0-9_-]/g,
      '_'
    );
    const filename =
      'geospt_' + nomeArq + '_' + new Date().toISOString().slice(0, 10) + '.json';
    return { conteudo, filename };
  };

  // Estratégia 1: download via <a> (pode falhar em sandbox)
  const handleExportarDownload = async () => {
    fecharMenuExport();
    try {
      const { conteudo, filename } = await prepararPayloadExport();
      const blob = new Blob([conteudo], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      mostrarToast(
        'ok',
        'Tentou baixar "' +
          filename +
          '". Se nada apareceu, use Visualizar.',
        5000
      );
    } catch (e) {
      mostrarToast(
        'erro',
        'Falha no download: ' + e.message + '. Use Visualizar.',
        6000
      );
    }
  };

  // Estratégia 2: modal com textarea (à prova de bala)
  const handleExportarVisualizar = async () => {
    fecharMenuExport();
    try {
      const { conteudo, filename } = await prepararPayloadExport();
      setExportarModal({ conteudo, filename });
    } catch (e) {
      mostrarToast('erro', 'Falha ao gerar JSON: ' + e.message);
    }
  };

  const handleImportar = (e) => {
    const arq = e.target.files && e.target.files[0];
    if (!arq) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const dados = JSON.parse(ev.target.result);
        if (dados._schema !== 'geospt-obra') {
          throw new Error(
            'Arquivo não é uma obra GeoSPT (campo _schema inválido).'
          );
        }
        if (!dados.obra) throw new Error('Campo "obra" ausente.');
        carregarObra(dados.obra);
        const versao = dados._schemaVersao || '?';
        mostrarToast(
          versao === SCHEMA_VERSAO ? 'ok' : 'alerta',
          versao === SCHEMA_VERSAO
            ? 'Obra importada.'
            : 'Obra importada (schema ' +
                versao +
                '; atual ' +
                SCHEMA_VERSAO +
                ').',
          versao === SCHEMA_VERSAO ? 3000 : 5000
        );
      } catch (err) {
        mostrarToast('erro', 'Falha ao importar: ' + err.message, 5000);
      }
    };
    reader.readAsText(arq);
    e.target.value = '';
  };

  const handleCarregarBalsas = () => {
    if (!BALSAS) {
      mostrarToast('erro', 'Dataset Balsas não disponível.');
      return;
    }
    const obraBalsas = {
      identificacao: {
        nome: BALSAS.obra.nome,
        localizacao: BALSAS.obra.localizacao,
        dataCadastro: new Date().toISOString().slice(0, 10),
        sistemaCoordenadas: 'xy_local',
        responsavelTecnico: '',
        observacoes: '',
      },
      sondagens: BALSAS.sondagens,
      // Estacas de exemplo para validar todos os tipos e cenários de cálculo
      estacas: [
        {
          nome: 'E-01',
          tipoEstaca: 'helice_continua',
          diametro_m: 0.40,
          cotaArrasamento_m: 253,
          cargaPrevista_tf: 50,
          coordenadas: { x: 12.5, y: 12.5 },
          dominioGeotecnico: null,
        },
        {
          nome: 'E-02',
          tipoEstaca: 'helice_continua',
          diametro_m: 0.40,
          cotaArrasamento_m: 250,
          cargaPrevista_tf: 40,
          coordenadas: { x: 5, y: 5 },
          dominioGeotecnico: null,
        },
        {
          nome: 'E-03',
          tipoEstaca: 'raiz',
          diametro_m: 0.30,
          cotaArrasamento_m: 250,
          cargaPrevista_tf: 110,
          coordenadas: { x: 5, y: 16 },
          dominioGeotecnico: null,
        },
        {
          nome: 'E-04',
          tipoEstaca: 'premoldada',
          diametro_m: 0.30,
          cotaArrasamento_m: 257,
          cargaPrevista_tf: 45,
          coordenadas: { x: 16, y: 5 },
          dominioGeotecnico: null,
        },
      ],
      parametros: {
        janelaCompatibilizacao_m: 0.5,
        coeficientesCustomizados: null,
      },
      dominios: [],
      resultadosCalculo: {},
    };
    carregarObra(obraBalsas);
    mostrarToast('ok', 'Dataset Balsas (5 sondagens + 4 estacas) carregado.');
  };

  const nomeObra = estado.obra.identificacao.nome || '(sem nome)';

  return (
    <>
      <header className="bg-slate-800 text-white px-4 py-2.5 flex items-center justify-between border-b border-slate-700">
        <div className="flex items-baseline gap-3 min-w-0">
          <span className="text-base font-bold tracking-tight font-mono">
            GeoSPT
          </span>
          <span className="text-xs text-slate-400">v{GeoSPT.versao}</span>
          <span className="text-sm text-slate-300 ml-2 truncate">— {nomeObra}</span>
          <IndicadorAutosave status={autosaveStatus} />
        </div>
        <div className="flex gap-2 shrink-0">
          <BotaoPrim tipo="secundario" onClick={handleCarregarBalsas}>
            📂 Balsas (demo)
          </BotaoPrim>
          <BotaoPrim
            tipo="secundario"
            onClick={() =>
              window.open(
                import.meta.env.BASE_URL + 'manual.html',
                '_blank',
                'noopener,noreferrer'
              )
            }
          >
            📖 Manual
          </BotaoPrim>
          {/* CP-17 — Novo projeto (Decisão 4): limpa estado e autosave */}
          <BotaoPrim
            tipo="secundario"
            onClick={() => {
              const temConteudo =
                Object.keys(estado.obra.sondagens || {}).length > 0 ||
                (estado.obra.estacas || []).length > 0;
              if (!temConteudo) {
                // Nada a perder → executa direto, sem pedir confirmação.
                novaObra();
                mostrarToast('ok', '🆕 Novo projeto iniciado. Tudo limpo.', 3000);
              } else {
                setConfirmarNovo(true); // abre o modal estilizado
              }
            }}
          >
            🆕 Novo
          </BotaoPrim>
          <BotaoPrim
            tipo="secundario"
            onClick={() => fileInputRef.current?.click()}
          >
            📥 Importar
          </BotaoPrim>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportar}
            className="hidden"
          />
          <div className="relative">
            <BotaoPrim onClick={() => setMenuExportAberto(!menuExportAberto)}>
              📤 Exportar ▾
            </BotaoPrim>
            {menuExportAberto && (
              <>
                <div className="fixed inset-0 z-40" onClick={fecharMenuExport} />
                <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-slate-300 rounded shadow-lg w-64 text-slate-800">
                  <button
                    onClick={handleExportarDownload}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 border-b border-slate-200"
                  >
                    💾 <strong>Baixar arquivo</strong>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Download direto (recomendado)
                    </div>
                  </button>
                  <button
                    onClick={handleExportarVisualizar}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100"
                  >
                    👀 <strong>Visualizar JSON</strong>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Selecione e use Ctrl+C
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[70] max-w-md shadow-xl">
          <Banner tipo={toast.tipo}>{toast.msg}</Banner>
        </div>
      )}
      {confirmarNovo && (
        <ModalConfirmar
          titulo="Iniciar um novo projeto?"
          mensagem={
            <>
              A obra atual será <strong>removida da memória e do salvamento
              automático</strong>. Esta ação não pode ser desfeita.
              <br />
              <br />
              Se ainda não exportou, faça o backup (<strong>Exportar</strong>) antes
              de continuar.
            </>
          }
          rotuloConfirmar="Iniciar novo projeto"
          tipoConfirmar="perigo"
          onConfirmar={() => {
            setConfirmarNovo(false);
            novaObra();
            mostrarToast('ok', '🆕 Novo projeto iniciado. Tudo limpo.', 3000);
          }}
          onCancelar={() => setConfirmarNovo(false)}
        />
      )}
      {exportarModal && (
        <ModalExportar
          conteudo={exportarModal.conteudo}
          filename={exportarModal.filename}
          onFechar={() => setExportarModal(null)}
        />
      )}
    </>
  );
}

/* CP-17 — Indicador discreto de autosave (Decisão 5). */
function IndicadorAutosave({ status }) {
  const mapa = {
    idle: { txt: '', classe: '' },
    salvando: { txt: '💾 salvando…', classe: 'bg-slate-700 text-slate-300' },
    salvo: { txt: '✓ salvo', classe: 'bg-green-900/50 text-green-300' },
    erro: { txt: '⚠ autosave falhou', classe: 'bg-amber-900/50 text-amber-200' },
    off: { txt: '⚠ autosave indisponível', classe: 'bg-amber-900/50 text-amber-200' },
  };
  const m = mapa[status] || mapa.idle;
  if (!m.txt) return null;
  const titulo =
    status === 'off'
      ? 'O navegador não permite salvamento automático (ex.: janela anônima). Exporte a obra manualmente para não perder o trabalho.'
      : status === 'erro'
        ? 'Não foi possível salvar automaticamente (armazenamento cheio?). Exporte a obra manualmente.'
        : status === 'salvo'
          ? 'Obra salva automaticamente neste navegador. Não substitui o backup por Exportar (JSON).'
          : 'Salvando automaticamente neste navegador…';
  return (
    <span
      className={
        'text-xs px-2 py-0.5 rounded-full select-none whitespace-nowrap self-center ' +
        m.classe
      }
      title={titulo}
    >
      {m.txt}
    </span>
  );
}
