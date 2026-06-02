/* ============================================================================
 * EditorCoeficientesCompleto — editor célula-a-célula de coeficientes DQ e AV
 *
 * Permite ao usuário sobrescrever (com persistência via JSON exportado):
 *   - Tabela 1.3 (DQ_C, kPa por solo)
 *   - Tabela 1.4 (DQ_alpha, adimensional por família × tipo de estaca)
 *   - Tabela 1.5 (DQ_beta, adimensional por família × tipo de estaca)
 *   - Tabela 1.6 (DQ_FS — Fl, Fp, FSg)
 *   - Tabela 1.7 (AV_K_alpha — K em kPa e alpha em % por solo)
 *   - Tabela 1.8 (AV_F1_F2_params — base/divisor da pré-moldada + F1/F2 dos outros)
 *   - Tabela 1.9 (reducaoP — fator redutor de ponta por tipo de estaca)
 *
 * Arquitetura:
 *   - Defaults da engine cacheados em `defaultsEngine` (useMemo, criado uma vez)
 *   - Customização vive em `config.coeficientesCustomizados` (estado global)
 *   - Setters preservam funções da engine (AV_F1_F2_fn é RECONSTRUÍDA a partir
 *     dos params via construirF1F2fn — única função armazenada no estado)
 *   - "Restaurar TODOS aos padrões" = setar coeficientesCustomizados a null
 *
 * Cuidado especial — funções no estado:
 *   AV_F1_F2_fn é uma função JS que não pode ser serializada em JSON. O
 *   carregarObra() em ObraProvider reconstrói essa fn a partir de
 *   AV_F1_F2_params no momento da importação. Por isso o estado armazena os
 *   parâmetros (base/divisor/F1/F2), e a fn é reconstruída sempre que muda.
 *
 * Preset DQ_alpha hélice contínua:
 *   - "original" → 0.30 para todas famílias (Décourt 1996)
 *   - "modificada" → 0.85/0.60/0.50 (Coesivo/Intermediário/Granular) — prática
 *     brasileira moderna com controle executivo rigoroso
 *
 * Extraído idêntico das linhas 5072-5638 do geospt_app.jsx. Mudanças:
 *   - window.GeoSPT → GeoSPT (import explícito)
 *   - text-xxs → text-[10px] (text-xxs não é classe Tailwind padrão)
 *   - InputCoef e TIPOS_ESTACA importados via @/ aliases
 *
 * Props:
 *   config           — objeto config global (estado.obra.parametros.*)
 *   setConfigGlobal  — fn(campo, valor) → atualiza um campo da config
 * ============================================================================ */

import React, { useMemo, useState } from 'react';
import { GeoSPT } from '@/engine/geospt-engine';
import { TIPOS_ESTACA } from '@/domain/estacas';
import InputCoef from '@/components/inputs/InputCoef';

// ----- Ranges plausíveis (avisos, não bloqueio — InputCoef pisca âmbar fora) -----
const RANGE_C_KPA = [50, 800];
const RANGE_DQ_ALPHA = [0.3, 1.2];
const RANGE_DQ_BETA = [0.3, 2.0];
const RANGE_AV_K = [100, 1500];
const RANGE_AV_ALPHA = [0.5, 8.0];
const RANGE_REDUCAO_P = [0.3, 1.0];
const RANGE_FS_FL = [1.0, 3.0];
const RANGE_FS_FP = [2.0, 6.0];
const RANGE_FS_FSG = [1.5, 3.0];

// Famílias DQ (ordem importa — segue tabelas Décourt-Quaresma)
const FAMILIAS_DQ = ['Coesivo', 'Intermediário', 'Granular'];

// Listas de solos (mesma ordem das tabelas brasileiras canônicas)
const SOLOS_AREIA = [
  'Areia',
  'Areia Siltosa',
  'Areia Silto-Argilosa',
  'Areia Argilo-Siltosa',
  'Areia Argilosa',
];
const SOLOS_SILTE = [
  'Silte Arenoso',
  'Silte Areno-Argiloso',
  'Silte',
  'Silte Argilo-Arenoso',
  'Silte Argiloso',
];
const SOLOS_ARGILA = [
  'Argila Arenosa',
  'Argila Areno-Siltosa',
  'Argila Silto-Arenosa',
  'Argila Siltosa',
  'Argila',
];

export default function EditorCoeficientesCompleto({ config, setConfigGlobal }) {
  const [aberto, setAberto] = useState(false);
  const [secaoAberta, setSecaoAberta] = useState(null);
  // secaoAberta: 'reducaoP' | 'FS' | 'DQ_C' | 'DQ_alpha' | 'DQ_beta' | 'AV_K_alpha' | 'AV_F1_F2' | null

  // Snapshot dos defaults (criado uma vez — defaults nunca mudam em runtime)
  const defaultsEngine = useMemo(() => {
    if (!GeoSPT) return null;
    const c = GeoSPT.domain.coefficients;
    return {
      reducaoP: { ...c.reducaoP },
      DQ_FS: { ...c.DQ_FS },
      DQ_C: { ...c.DQ_C },
      DQ_alpha: JSON.parse(JSON.stringify(c.DQ_alpha)), // objeto aninhado puro
      DQ_beta: JSON.parse(JSON.stringify(c.DQ_beta)),
      AV_K_alpha: JSON.parse(JSON.stringify(c.AV_K_alpha)),
      AV_F1_F2_params: {
        premoldada: { base: 1, divisor: 0.8 },
        outros: { F1: 2.0, F2: 4.0 },
      },
    };
  }, []);

  if (!defaultsEngine) return null;

  const personalizado = !!config.coeficientesCustomizados;
  const custom = config.coeficientesCustomizados;

  // ----- Acessores: pega customizado se houver, senão default -----
  const valReducaoP = (tipo) =>
    custom?.reducaoP?.[tipo] ?? defaultsEngine.reducaoP[tipo];
  const valFS = (campo) =>
    custom?.DQ_FS?.[campo] ?? defaultsEngine.DQ_FS[campo];
  const valDQ_C = (solo) => custom?.DQ_C?.[solo] ?? defaultsEngine.DQ_C[solo];
  const valDQ_alpha = (fam, tipo) =>
    custom?.DQ_alpha?.[fam]?.[tipo] ?? defaultsEngine.DQ_alpha[fam][tipo];
  const valDQ_beta = (fam, tipo) =>
    custom?.DQ_beta?.[fam]?.[tipo] ?? defaultsEngine.DQ_beta[fam][tipo];
  const valAV_K = (solo) =>
    custom?.AV_K_alpha?.[solo]?.K_kPa ?? defaultsEngine.AV_K_alpha[solo].K_kPa;
  const valAV_alpha = (solo) =>
    custom?.AV_K_alpha?.[solo]?.alpha_pct ??
    defaultsEngine.AV_K_alpha[solo].alpha_pct;
  const valAV_F1F2 = (campo) => {
    const p = custom?.AV_F1_F2_params;
    if (campo === 'pm_base')
      return p?.premoldada?.base ?? defaultsEngine.AV_F1_F2_params.premoldada.base;
    if (campo === 'pm_divisor')
      return (
        p?.premoldada?.divisor ?? defaultsEngine.AV_F1_F2_params.premoldada.divisor
      );
    if (campo === 'outros_F1')
      return p?.outros?.F1 ?? defaultsEngine.AV_F1_F2_params.outros.F1;
    if (campo === 'outros_F2')
      return p?.outros?.F2 ?? defaultsEngine.AV_F1_F2_params.outros.F2;
  };

  // Reconstrói AV_F1_F2_fn a partir dos params (única função armazenada)
  const construirF1F2fn = (params) => {
    return function (tipoEstaca, diametro_m) {
      if (tipoEstaca === 'premoldada') {
        const p = params.premoldada;
        const F1 = p.base + diametro_m / p.divisor;
        return { F1: F1, F2: 2 * F1 };
      }
      return { F1: params.outros.F1, F2: params.outros.F2 };
    };
  };

  // Garante estrutura completa preservando funções da engine
  const garantirCoefs = () => {
    if (config.coeficientesCustomizados) return config.coeficientesCustomizados;
    const orig = GeoSPT.domain.coefficients;
    return {
      ...orig,
      reducaoP: { ...orig.reducaoP },
      DQ_FS: { ...orig.DQ_FS },
      DQ_C: { ...orig.DQ_C },
      DQ_alpha: JSON.parse(JSON.stringify(orig.DQ_alpha)),
      DQ_beta: JSON.parse(JSON.stringify(orig.DQ_beta)),
      AV_K_alpha: JSON.parse(JSON.stringify(orig.AV_K_alpha)),
      AV_F1_F2_params: {
        premoldada: { base: 1, divisor: 0.8 },
        outros: { F1: 2.0, F2: 4.0 },
      },
      // AV_F1_F2_fn herda do orig via spread acima
    };
  };

  // ----- Setters (preservam funções da engine) -----
  const setReducaoP = (tipo, valor) => {
    const novo = garantirCoefs();
    setConfigGlobal('coeficientesCustomizados', {
      ...novo,
      reducaoP: { ...novo.reducaoP, [tipo]: valor },
    });
  };
  const setFS = (campo, valor) => {
    const novo = garantirCoefs();
    setConfigGlobal('coeficientesCustomizados', {
      ...novo,
      DQ_FS: { ...novo.DQ_FS, [campo]: valor },
    });
  };
  const setDQ_C = (solo, valor) => {
    const novo = garantirCoefs();
    setConfigGlobal('coeficientesCustomizados', {
      ...novo,
      DQ_C: { ...novo.DQ_C, [solo]: valor },
    });
  };
  const setDQ_alpha = (fam, tipo, valor) => {
    const novo = garantirCoefs();
    const novoAlpha = {
      ...novo.DQ_alpha,
      [fam]: { ...novo.DQ_alpha[fam], [tipo]: valor },
    };
    setConfigGlobal('coeficientesCustomizados', { ...novo, DQ_alpha: novoAlpha });
  };
  const setDQ_beta = (fam, tipo, valor) => {
    const novo = garantirCoefs();
    const novoBeta = {
      ...novo.DQ_beta,
      [fam]: { ...novo.DQ_beta[fam], [tipo]: valor },
    };
    setConfigGlobal('coeficientesCustomizados', { ...novo, DQ_beta: novoBeta });
  };
  const setAV_K = (solo, valor) => {
    const novo = garantirCoefs();
    const novoAV = {
      ...novo.AV_K_alpha,
      [solo]: { ...novo.AV_K_alpha[solo], K_kPa: valor },
    };
    setConfigGlobal('coeficientesCustomizados', { ...novo, AV_K_alpha: novoAV });
  };
  const setAV_alpha = (solo, valor) => {
    const novo = garantirCoefs();
    const novoAV = {
      ...novo.AV_K_alpha,
      [solo]: { ...novo.AV_K_alpha[solo], alpha_pct: valor },
    };
    setConfigGlobal('coeficientesCustomizados', { ...novo, AV_K_alpha: novoAV });
  };
  const setAV_F1F2 = (campo, valor) => {
    const novo = garantirCoefs();
    const p = novo.AV_F1_F2_params || defaultsEngine.AV_F1_F2_params;
    let novoP;
    if (campo === 'pm_base')
      novoP = { ...p, premoldada: { ...p.premoldada, base: valor } };
    if (campo === 'pm_divisor')
      novoP = { ...p, premoldada: { ...p.premoldada, divisor: valor } };
    if (campo === 'outros_F1')
      novoP = { ...p, outros: { ...p.outros, F1: valor } };
    if (campo === 'outros_F2')
      novoP = { ...p, outros: { ...p.outros, F2: valor } };
    const novaFn = construirF1F2fn(novoP);
    setConfigGlobal('coeficientesCustomizados', {
      ...novo,
      AV_F1_F2_params: novoP,
      AV_F1_F2_fn: novaFn,
    });
  };

  // ----- Restauração de tabelas individuais -----
  const restaurarTabela = (tabela) => {
    const novo = garantirCoefs();
    const orig = GeoSPT.domain.coefficients;
    let atualizado;
    if (tabela === 'reducaoP')
      atualizado = { ...novo, reducaoP: { ...orig.reducaoP } };
    if (tabela === 'DQ_FS') atualizado = { ...novo, DQ_FS: { ...orig.DQ_FS } };
    if (tabela === 'DQ_C') atualizado = { ...novo, DQ_C: { ...orig.DQ_C } };
    if (tabela === 'DQ_alpha')
      atualizado = {
        ...novo,
        DQ_alpha: JSON.parse(JSON.stringify(orig.DQ_alpha)),
      };
    if (tabela === 'DQ_beta')
      atualizado = {
        ...novo,
        DQ_beta: JSON.parse(JSON.stringify(orig.DQ_beta)),
      };
    if (tabela === 'AV_K_alpha')
      atualizado = {
        ...novo,
        AV_K_alpha: JSON.parse(JSON.stringify(orig.AV_K_alpha)),
      };
    if (tabela === 'AV_F1_F2') {
      const pPadrao = {
        premoldada: { base: 1, divisor: 0.8 },
        outros: { F1: 2.0, F2: 4.0 },
      };
      atualizado = {
        ...novo,
        AV_F1_F2_params: pPadrao,
        AV_F1_F2_fn: construirF1F2fn(pPadrao),
      };
    }
    setConfigGlobal('coeficientesCustomizados', atualizado);
  };

  // ----- Presets para DQ_alpha (hélice contínua) -----
  const aplicarPresetDQ_alpha = (preset) => {
    const novo = garantirCoefs();
    let novoAlpha;
    if (preset === 'original') {
      // Décourt 1996 original: 0.30 para todas as famílias
      novoAlpha = {
        ...novo.DQ_alpha,
        Coesivo: { ...novo.DQ_alpha['Coesivo'], helice_continua: 0.3 },
        Intermediário: {
          ...novo.DQ_alpha['Intermediário'],
          helice_continua: 0.3,
        },
        Granular: { ...novo.DQ_alpha['Granular'], helice_continua: 0.3 },
      };
    } else {
      // 'modificada' — prática brasileira moderna com controle executivo rigoroso
      novoAlpha = {
        ...novo.DQ_alpha,
        Coesivo: { ...novo.DQ_alpha['Coesivo'], helice_continua: 0.85 },
        Intermediário: {
          ...novo.DQ_alpha['Intermediário'],
          helice_continua: 0.6,
        },
        Granular: { ...novo.DQ_alpha['Granular'], helice_continua: 0.5 },
      };
    }
    setConfigGlobal('coeficientesCustomizados', { ...novo, DQ_alpha: novoAlpha });
  };

  const restaurarPadrao = () => setConfigGlobal('coeficientesCustomizados', null);

  // ----- Cabeçalho de seção (botão expandir/recolher + restaurar) -----
  const SecaoColunela = ({ id, titulo, subtitulo, tabela }) => {
    const isOpen = secaoAberta === id;
    return (
      <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1.5">
        <button
          onClick={() => setSecaoAberta(isOpen ? null : id)}
          className="text-xs font-bold text-slate-700 hover:text-slate-900 flex-1 text-left"
        >
          {isOpen ? '▼' : '▶'} {titulo}
          {subtitulo && (
            <span className="ml-2 text-[10px] text-slate-500 font-normal">
              {subtitulo}
            </span>
          )}
        </button>
        {personalizado && isOpen && (
          <button
            onClick={() => restaurarTabela(tabela)}
            className="text-[10px] text-blue-600 hover:text-blue-800 ml-2"
            title="Restaurar apenas esta tabela aos valores padrão"
          >
            ↺ restaurar tabela
          </button>
        )}
      </div>
    );
  };

  const TODOS_SOLOS = [...SOLOS_AREIA, ...SOLOS_SILTE, ...SOLOS_ARGILA];

  return (
    <div className="border-t border-slate-200 pt-2 mt-2">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setAberto(!aberto)}
          className="text-sm font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
        >
          {aberto ? '▼' : '▶'} 📋 Editor de coeficientes (completo)
          {personalizado && (
            <span className="ml-2 text-[10px] bg-amber-200 text-amber-900 px-1 rounded">
              customizado
            </span>
          )}
        </button>
        {personalizado && (
          <button
            onClick={restaurarPadrao}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            ↺ Restaurar TODOS aos padrões
          </button>
        )}
      </div>

      {aberto && (
        <div className="mt-2 space-y-3">
          <div className="text-xs text-slate-500 italic">
            Edição completa. Valores customizados afetam todos os modos de
            cálculo. Aviso âmbar (⚠) sinaliza valor fora do range plausível —
            não bloqueia, apenas registra.
          </div>

          {/* === Tabela 1.3 — C (DQ) === */}
          <div className="bg-white border border-slate-200 rounded p-2">
            <SecaoColunela
              id="DQ_C"
              titulo="Tabela 1.3 — Coeficiente C (DQ)"
              subtitulo="(kPa; resistência de ponta unitária = C × N_p)"
              tabela="DQ_C"
            />
            {secaoAberta === 'DQ_C' && (
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-1.5 py-1 text-left">Solo</th>
                    <th className="px-1.5 py-1 text-right">Padrão (kPa)</th>
                    <th className="px-1.5 py-1 text-right">
                      Valor em uso (kPa)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {TODOS_SOLOS.map((solo) => (
                    <tr key={solo} className="border-t border-slate-100">
                      <td className="px-1.5 py-1">{solo}</td>
                      <td className="px-1.5 py-1 text-right font-mono text-slate-500">
                        {defaultsEngine.DQ_C[solo]?.toFixed(0)}
                      </td>
                      <td className="px-1.5 py-1 text-right">
                        <InputCoef
                          value={valDQ_C(solo)}
                          onChange={(v) => setDQ_C(solo, v)}
                          step="10"
                          range={RANGE_C_KPA}
                          casas={0}
                          suffix=" kPa"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* === Tabela 1.4 — α DQ === */}
          <div className="bg-white border border-slate-200 rounded p-2">
            <SecaoColunela
              id="DQ_alpha"
              titulo="Tabela 1.4 — Coeficiente α (DQ)"
              subtitulo="(adimensional; ajusta R_p por família × tipo de estaca)"
              tabela="DQ_alpha"
            />
            {secaoAberta === 'DQ_alpha' && (
              <>
                {/* Presets */}
                <div className="bg-slate-50 border border-slate-200 rounded p-1.5 mb-2">
                  <div className="text-[10px] font-bold text-slate-700 mb-1">
                    Presets (hélice contínua):
                  </div>
                  <div className="flex gap-2 mb-1.5">
                    <button
                      onClick={() => aplicarPresetDQ_alpha('original')}
                      className="px-2 py-0.5 text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-800 rounded"
                    >
                      Carregar tabela DQ original
                    </button>
                    <button
                      onClick={() => aplicarPresetDQ_alpha('modificada')}
                      className="px-2 py-0.5 text-[10px] bg-blue-200 hover:bg-blue-300 text-blue-900 rounded"
                    >
                      Carregar tabela modificada
                    </button>
                  </div>
                  <div className="text-[10px] text-amber-900 bg-amber-50 border-l-2 border-amber-400 px-1.5 py-1">
                    ⚠ Tabela modificada altera α DQ para hélice contínua (0.30
                    → 0.85/0.60/0.50). Justificativa: prática brasileira
                    moderna com controle executivo rigoroso. Decisão
                    metodológica do projeto, não consenso bibliográfico
                    universal.
                  </div>
                </div>
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-1.5 py-1 text-left">Família</th>
                      {TIPOS_ESTACA.map((t) => (
                        <th
                          key={t.id}
                          className="px-1.5 py-1 text-right text-[10px]"
                        >
                          {t.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {FAMILIAS_DQ.map((fam) => (
                      <tr key={fam} className="border-t border-slate-100">
                        <td className="px-1.5 py-1 font-medium">{fam}</td>
                        {TIPOS_ESTACA.map((t) => (
                          <td
                            key={t.id}
                            className="px-1.5 py-1 text-right"
                          >
                            <InputCoef
                              value={valDQ_alpha(fam, t.id)}
                              onChange={(v) => setDQ_alpha(fam, t.id, v)}
                              step="0.05"
                              range={RANGE_DQ_ALPHA}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200 bg-slate-50 text-[10px] text-slate-500">
                      <td className="px-1.5 py-1 font-medium">Padrão:</td>
                      {TIPOS_ESTACA.map((t) => {
                        const vals = FAMILIAS_DQ.map((f) =>
                          defaultsEngine.DQ_alpha[f][t.id]?.toFixed(2)
                        ).join(' / ');
                        return (
                          <td
                            key={t.id}
                            className="px-1.5 py-1 text-right font-mono"
                          >
                            {vals}
                          </td>
                        );
                      })}
                    </tr>
                  </tfoot>
                </table>
              </>
            )}
          </div>

          {/* === Tabela 1.5 — β DQ === */}
          <div className="bg-white border border-slate-200 rounded p-2">
            <SecaoColunela
              id="DQ_beta"
              titulo="Tabela 1.5 — Coeficiente β (DQ)"
              subtitulo="(adimensional; ajusta atrito lateral por família × tipo de estaca)"
              tabela="DQ_beta"
            />
            {secaoAberta === 'DQ_beta' && (
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-1.5 py-1 text-left">Família</th>
                    {TIPOS_ESTACA.map((t) => (
                      <th
                        key={t.id}
                        className="px-1.5 py-1 text-right text-[10px]"
                      >
                        {t.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FAMILIAS_DQ.map((fam) => (
                    <tr key={fam} className="border-t border-slate-100">
                      <td className="px-1.5 py-1 font-medium">{fam}</td>
                      {TIPOS_ESTACA.map((t) => (
                        <td key={t.id} className="px-1.5 py-1 text-right">
                          <InputCoef
                            value={valDQ_beta(fam, t.id)}
                            onChange={(v) => setDQ_beta(fam, t.id, v)}
                            step="0.05"
                            range={RANGE_DQ_BETA}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50 text-[10px] text-slate-500">
                    <td className="px-1.5 py-1 font-medium">Padrão:</td>
                    {TIPOS_ESTACA.map((t) => {
                      const vals = FAMILIAS_DQ.map((f) =>
                        defaultsEngine.DQ_beta[f][t.id]?.toFixed(2)
                      ).join(' / ');
                      return (
                        <td
                          key={t.id}
                          className="px-1.5 py-1 text-right font-mono"
                        >
                          {vals}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* === Tabela 1.6 — Fatores de segurança === */}
          <div className="bg-white border border-slate-200 rounded p-2">
            <SecaoColunela
              id="FS"
              titulo="Tabela 1.6 — Fatores de segurança"
              subtitulo="(adimensional; Q_adm_parcial = R_l/F_l + R_p/F_p; Q_adm_global = R_rup/FSg)"
              tabela="DQ_FS"
            />
            {secaoAberta === 'FS' && (
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-1.5 py-1 text-left">Fator</th>
                    <th className="px-1.5 py-1 text-left">Aplicação</th>
                    <th className="px-1.5 py-1 text-right">Padrão</th>
                    <th className="px-1.5 py-1 text-right">Valor em uso</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-slate-100">
                    <td className="px-1.5 py-1 font-mono">F_l</td>
                    <td className="px-1.5 py-1 text-[10px]">
                      atrito lateral (parcial DQ)
                    </td>
                    <td className="px-1.5 py-1 text-right font-mono text-slate-500">
                      {defaultsEngine.DQ_FS.Fl.toFixed(2)}
                    </td>
                    <td className="px-1.5 py-1 text-right">
                      <InputCoef
                        value={valFS('Fl')}
                        onChange={(v) => setFS('Fl', v)}
                        step="0.05"
                        range={RANGE_FS_FL}
                      />
                    </td>
                  </tr>
                  <tr className="border-t border-slate-100">
                    <td className="px-1.5 py-1 font-mono">F_p</td>
                    <td className="px-1.5 py-1 text-[10px]">
                      ponta (parcial DQ)
                    </td>
                    <td className="px-1.5 py-1 text-right font-mono text-slate-500">
                      {defaultsEngine.DQ_FS.Fp.toFixed(2)}
                    </td>
                    <td className="px-1.5 py-1 text-right">
                      <InputCoef
                        value={valFS('Fp')}
                        onChange={(v) => setFS('Fp', v)}
                        step="0.1"
                        range={RANGE_FS_FP}
                      />
                    </td>
                  </tr>
                  <tr className="border-t border-slate-100">
                    <td className="px-1.5 py-1 font-mono">FS_g</td>
                    <td className="px-1.5 py-1 text-[10px]">
                      global (DQ + AV)
                    </td>
                    <td className="px-1.5 py-1 text-right font-mono text-slate-500">
                      {defaultsEngine.DQ_FS.FSg.toFixed(2)}
                    </td>
                    <td className="px-1.5 py-1 text-right">
                      <InputCoef
                        value={valFS('FSg')}
                        onChange={(v) => setFS('FSg', v)}
                        step="0.1"
                        range={RANGE_FS_FSG}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          {/* === Tabela 1.7 — K e α (AV) === */}
          <div className="bg-white border border-slate-200 rounded p-2">
            <SecaoColunela
              id="AV_K_alpha"
              titulo="Tabela 1.7 — K e α (Aoki-Velloso)"
              subtitulo="(K em kPa; α em %; q_p = K · N_p / F1; f_l = α · K · N_l / F2)"
              tabela="AV_K_alpha"
            />
            {secaoAberta === 'AV_K_alpha' && (
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-1.5 py-1 text-left">Solo</th>
                    <th className="px-1.5 py-1 text-right text-[10px]">
                      Padrão K (kPa)
                    </th>
                    <th className="px-1.5 py-1 text-right">K (kPa)</th>
                    <th className="px-1.5 py-1 text-right text-[10px]">
                      Padrão α (%)
                    </th>
                    <th className="px-1.5 py-1 text-right normal-case">
                      α (%)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {TODOS_SOLOS.map((solo) => (
                    <tr key={solo} className="border-t border-slate-100">
                      <td className="px-1.5 py-1">{solo}</td>
                      <td className="px-1.5 py-1 text-right font-mono text-slate-500">
                        {defaultsEngine.AV_K_alpha[solo]?.K_kPa?.toFixed(0)}
                      </td>
                      <td className="px-1.5 py-1 text-right">
                        <InputCoef
                          value={valAV_K(solo)}
                          onChange={(v) => setAV_K(solo, v)}
                          step="10"
                          range={RANGE_AV_K}
                          casas={0}
                          suffix=" kPa"
                        />
                      </td>
                      <td className="px-1.5 py-1 text-right font-mono text-slate-500">
                        {defaultsEngine.AV_K_alpha[solo]?.alpha_pct?.toFixed(1)}
                      </td>
                      <td className="px-1.5 py-1 text-right">
                        <InputCoef
                          value={valAV_alpha(solo)}
                          onChange={(v) => setAV_alpha(solo, v)}
                          step="0.1"
                          range={RANGE_AV_ALPHA}
                          casas={1}
                          suffix="%"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* === Tabela 1.8 — F1 e F2 (AV) === */}
          <div className="bg-white border border-slate-200 rounded p-2">
            <SecaoColunela
              id="AV_F1_F2"
              titulo="Tabela 1.8 — Fatores F1 e F2 (AV)"
              subtitulo="(adimensional; F1 → ponta, F2 → atrito; valor depende do tipo de estaca)"
              tabela="AV_F1_F2"
            />
            {secaoAberta === 'AV_F1_F2' && (
              <div className="space-y-3">
                <div className="bg-slate-50 border border-slate-200 rounded p-2">
                  <div className="text-[10px] font-bold text-slate-700 mb-1">
                    Pré-moldada (fórmula em função do diâmetro)
                  </div>
                  <div className="font-mono text-xs mb-2">
                    F1 = <em>base</em> + D / <em>divisor</em> &nbsp;·&nbsp; F2 =
                    2 · F1
                  </div>
                  <table className="w-full text-xs">
                    <thead className="bg-white text-slate-600">
                      <tr>
                        <th className="px-1.5 py-0.5 text-left">Parâmetro</th>
                        <th className="px-1.5 py-0.5 text-right">Padrão</th>
                        <th className="px-1.5 py-0.5 text-right">
                          Valor em uso
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-slate-200">
                        <td className="px-1.5 py-0.5 font-mono">base</td>
                        <td className="px-1.5 py-0.5 text-right font-mono text-slate-500">
                          {defaultsEngine.AV_F1_F2_params.premoldada.base.toFixed(
                            2
                          )}
                        </td>
                        <td className="px-1.5 py-0.5 text-right">
                          <InputCoef
                            value={valAV_F1F2('pm_base')}
                            onChange={(v) => setAV_F1F2('pm_base', v)}
                            step="0.1"
                            range={[0.5, 3.0]}
                          />
                        </td>
                      </tr>
                      <tr className="border-t border-slate-200">
                        <td className="px-1.5 py-0.5 font-mono">
                          divisor (m)
                        </td>
                        <td className="px-1.5 py-0.5 text-right font-mono text-slate-500">
                          {defaultsEngine.AV_F1_F2_params.premoldada.divisor.toFixed(
                            2
                          )}
                        </td>
                        <td className="px-1.5 py-0.5 text-right">
                          <InputCoef
                            value={valAV_F1F2('pm_divisor')}
                            onChange={(v) => setAV_F1F2('pm_divisor', v)}
                            step="0.05"
                            range={[0.3, 2.0]}
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded p-2">
                  <div className="text-[10px] font-bold text-slate-700 mb-1">
                    Outros tipos (hélice contínua, escavada seco/fluido, raiz)
                  </div>
                  <table className="w-full text-xs">
                    <thead className="bg-white text-slate-600">
                      <tr>
                        <th className="px-1.5 py-0.5 text-left">Fator</th>
                        <th className="px-1.5 py-0.5 text-right">Padrão</th>
                        <th className="px-1.5 py-0.5 text-right">
                          Valor em uso
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-slate-200">
                        <td className="px-1.5 py-0.5 font-mono">F1</td>
                        <td className="px-1.5 py-0.5 text-right font-mono text-slate-500">
                          {defaultsEngine.AV_F1_F2_params.outros.F1.toFixed(2)}
                        </td>
                        <td className="px-1.5 py-0.5 text-right">
                          <InputCoef
                            value={valAV_F1F2('outros_F1')}
                            onChange={(v) => setAV_F1F2('outros_F1', v)}
                            step="0.1"
                            range={[1.0, 4.0]}
                          />
                        </td>
                      </tr>
                      <tr className="border-t border-slate-200">
                        <td className="px-1.5 py-0.5 font-mono">F2</td>
                        <td className="px-1.5 py-0.5 text-right font-mono text-slate-500">
                          {defaultsEngine.AV_F1_F2_params.outros.F2.toFixed(2)}
                        </td>
                        <td className="px-1.5 py-0.5 text-right">
                          <InputCoef
                            value={valAV_F1F2('outros_F2')}
                            onChange={(v) => setAV_F1F2('outros_F2', v)}
                            step="0.1"
                            range={[2.0, 8.0]}
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* === Tabela 1.9 — Fator redutor de ponta === */}
          <div className="bg-white border border-slate-200 rounded p-2">
            <SecaoColunela
              id="reducaoP"
              titulo="Tabela 1.9 — Fator redutor de ponta"
              subtitulo="(adimensional; aplicado se checkbox marcado)"
              tabela="reducaoP"
            />
            {secaoAberta === 'reducaoP' && (
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-1.5 py-1 text-left">Tipo</th>
                    <th className="px-1.5 py-1 text-right">Padrão</th>
                    <th className="px-1.5 py-1 text-right">Valor em uso</th>
                  </tr>
                </thead>
                <tbody>
                  {TIPOS_ESTACA.map((t) => (
                    <tr key={t.id} className="border-t border-slate-100">
                      <td className="px-1.5 py-1">{t.label}</td>
                      <td className="px-1.5 py-1 text-right font-mono text-slate-500">
                        {defaultsEngine.reducaoP[t.id]?.toFixed(2)}
                      </td>
                      <td className="px-1.5 py-1 text-right">
                        <InputCoef
                          value={valReducaoP(t.id)}
                          onChange={(v) => setReducaoP(t.id, v)}
                          step="0.05"
                          range={RANGE_REDUCAO_P}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {personalizado && (
            <div className="bg-amber-50 border-l-2 border-amber-400 text-xs text-amber-900 px-2 py-1.5">
              ⚠ Valores customizados afetam <strong>todos os cálculos</strong>{' '}
              em todos os modos. Clique "↺ Restaurar TODOS aos padrões" no topo
              para reverter completamente.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
