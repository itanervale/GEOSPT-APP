/* ============================================================================
 * Aba 1 — Identificação da Obra
 *
 * Formulário de cabeçalho que alimenta o memorial técnico. Reativo ao Context:
 * cada digitação dispara setIdentificacao(campo, valor) e o Header re-renderiza
 * com o novo nome.
 *
 * Cópia funcional das linhas 3107-3207 do geospt_app.jsx. Mudanças mínimas:
 * - placeholder "Sede COEA — Balsas" → "Edifício Comercial — Centro" (termo
 *   institucional MPMA/COEA não deve aparecer em UI; ver prompt de migração)
 * - Diagnóstico de engine (smoke test do CP-2) preservado como <details> no
 *   rodapé da aba, conforme decisão do CP-4: link discreto, expande ao clicar
 * ============================================================================ */

import React, { useState } from 'react';
import { useObra } from '@/state/ObraProvider';
import { GeoSPT } from '@/engine/geospt-engine';
import { BALSAS } from '@/engine/dataset-balsas';
import Banner from '@/components/ui/Banner';
import Campo from '@/components/ui/Campo';

const inputCls =
  'w-full px-2 py-1.5 text-sm border border-slate-300 rounded ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

export default function AbaIdentificacao() {
  const { estado, setIdentificacao } = useObra();
  const i = estado.obra.identificacao;

  return (
    <div className="p-6 max-w-3xl space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-1">
          1. Identificação da Obra
        </h2>
        <p className="text-sm text-slate-600 mb-4">
          Dados de cabeçalho para o memorial técnico. Apenas o{' '}
          <strong>nome</strong> é obrigatório.
        </p>
      </div>

      <Banner tipo="alerta">
        Dados são mantidos apenas em memória. Use <strong>Exportar</strong> para
        salvar antes de fechar a aba.
      </Banner>

      <div className="bg-white border border-slate-300 rounded p-4 shadow-sm">
        <Campo label="Nome da obra" obrig>
          <input
            type="text"
            value={i.nome}
            onChange={(e) => setIdentificacao('nome', e.target.value)}
            placeholder="Ex: Edifício Comercial — Centro"
            className={inputCls}
          />
        </Campo>

        <div className="grid grid-cols-2 gap-3">
          <Campo label="Localização">
            <input
              type="text"
              value={i.localizacao}
              onChange={(e) => setIdentificacao('localizacao', e.target.value)}
              placeholder="Município/UF"
              className={inputCls}
            />
          </Campo>

          <Campo label="Data de cadastro">
            <input
              type="date"
              value={i.dataCadastro}
              onChange={(e) => setIdentificacao('dataCadastro', e.target.value)}
              className={inputCls}
            />
          </Campo>
        </div>

        <Campo
          label="Sistema de coordenadas"
          hint="Local (x, y): origem arbitrária do terreno. UTM: coordenadas projetadas."
        >
          <div className="flex gap-4 mt-1">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                checked={i.sistemaCoordenadas === 'xy_local'}
                onChange={() => setIdentificacao('sistemaCoordenadas', 'xy_local')}
              />
              Local (x, y)
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                checked={i.sistemaCoordenadas === 'utm'}
                onChange={() => setIdentificacao('sistemaCoordenadas', 'utm')}
              />
              UTM (E, N)
            </label>
          </div>
        </Campo>

        <Campo
          label="Responsável técnico"
          hint="Engenheiro projetista — aparecerá no memorial."
        >
          <input
            type="text"
            value={i.responsavelTecnico}
            onChange={(e) => setIdentificacao('responsavelTecnico', e.target.value)}
            placeholder="Nome / CREA"
            className={inputCls}
          />
        </Campo>

        <Campo label="Observações">
          <textarea
            value={i.observacoes}
            onChange={(e) => setIdentificacao('observacoes', e.target.value)}
            rows="3"
            placeholder="Notas livres sobre a obra, sondagens, restrições do terreno..."
            className={inputCls + ' resize-y'}
          />
        </Campo>
      </div>

      {!i.nome && (
        <Banner tipo="alerta">
          ⚠ Sem nome da obra, o arquivo de exportação ficará genérico (
          <code>geospt_obra_*</code>).
        </Banner>
      )}

      <DiagnosticoEngine />
    </div>
  );
}

/* ============================================================================
 * DiagnosticoEngine — smoke test contínuo em <details> colapsável
 *
 * Decisão do CP-4: o diagnóstico de engine (regressão canônica cota 242 = 32.84 tf)
 * fica disponível como link discreto no rodapé da aba. Engenheiro pode validar
 * a saúde da engine a qualquer momento sem poluir o formulário principal.
 *
 * Execução lazy: a regressão só roda quando o usuário expande o <details>
 * (controlado por useState aberto). Evita custo de ~50ms a cada render da aba.
 * ============================================================================ */

function DiagnosticoEngine() {
  const [aberto, setAberto] = useState(false);
  const [resultado, setResultado] = useState(null);

  const rodarDiagnostico = () => {
    try {
      const compat = GeoSPT.engine.compatibilizar(BALSAS.sondagens, {
        janela_m: 0.5,
      });
      const perfil = compat.resultados
        .filter((r) => r.envoltoria.nspt !== null)
        .map((r) => ({
          cota_m: r.cotaRef_m,
          nspt: r.envoltoria.nspt,
          nspt_real: r.envoltoria.nspt_real,
          impenetravel: r.envoltoria.impenetravel,
          solo: r.envoltoria.solo,
          familia: r.envoltoria.familia,
        }));
      const r = GeoSPT.engine.calcularDQ(perfil, {
        tipoEstaca: 'helice_continua',
        diametro_m: 0.40,
        cotaArrasamento_m: 253,
        coeficientesCustomizados: GeoSPT.domain.coefficients,
      });
      const l242 = r.memorial.find((m) => m.cotaPonta_m === 242);
      setResultado({
        ok: l242 && Math.abs(l242.Qadm_final_tf - 32.84) < 0.05,
        engineVersao: GeoSPT.versao,
        tabelasVersao: GeoSPT.versaoTabelas,
        cotasProcessadas: compat.metadata.cotasProcessadas,
        furoCritico: compat.metadata.furoCritico,
        furoCriticoPct: compat.metadata.furoCriticoPct, // proporção 0-1
        nInversoes: (compat.metadata.inversoes || []).length,
        qadm242: l242?.Qadm_final_tf,
      });
    } catch (e) {
      setResultado({ ok: false, erro: e.message });
    }
  };

  const onToggle = (e) => {
    const novoAberto = e.target.open;
    setAberto(novoAberto);
    // Roda diagnóstico ao abrir pela primeira vez
    if (novoAberto && !resultado) rodarDiagnostico();
  };

  return (
    <details
      open={aberto}
      onToggle={onToggle}
      className="bg-slate-50 border border-slate-200 rounded text-sm"
    >
      <summary className="cursor-pointer px-3 py-2 text-slate-700 hover:bg-slate-100 select-none">
        🩺 Validar engine{' '}
        <span className="text-xs text-slate-500 ml-2">
          (smoke test contínuo — regressão Balsas)
        </span>
      </summary>
      <div className="px-3 pb-3 pt-1 border-t border-slate-200">
        {!resultado && (
          <p className="text-xs text-slate-500 py-2">Carregando...</p>
        )}
        {resultado && resultado.ok && (
          <div className="space-y-2">
            <Banner tipo="ok">
              ✅ <strong>Engine OK:</strong> regressão canônica preservada (cota
              242m = {resultado.qadm242?.toFixed(2)} tf, esperado 32.84 tf)
            </Banner>
            <ul className="text-xs text-slate-600 space-y-0.5 font-mono pl-2">
              <li>Engine v{resultado.engineVersao} · tabelas {resultado.tabelasVersao}</li>
              <li>Compatibilização: {resultado.cotasProcessadas} cotas processadas</li>
              <li>
                Furo dominante na envoltória: {resultado.furoCritico} (
                {(resultado.furoCriticoPct * 100).toFixed(1)}% das cotas)
              </li>
              <li>Inversões detectadas: {resultado.nInversoes}</li>
            </ul>
            <button
              onClick={rodarDiagnostico}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Re-executar diagnóstico
            </button>
          </div>
        )}
        {resultado && !resultado.ok && (
          <Banner tipo="erro">
            ❌ <strong>Engine divergente:</strong>{' '}
            {resultado.erro ||
              'cota 242m = ' +
                resultado.qadm242?.toFixed(2) +
                ' tf (esperado 32.84 tf)'}
          </Banner>
        )}
      </div>
    </details>
  );
}
