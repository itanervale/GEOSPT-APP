/* ============================================================================
 * persistenciaObra — autosave da obra no localStorage (CP-17).
 *
 * RESPONSABILIDADE: salvar/carregar/limpar a obra no armazenamento local do
 * navegador, de forma ROBUSTA (nunca derruba o app) e VERSIONADA (nunca carrega
 * um schema incompatível de uma versão antiga do app).
 *
 * Decisões do CP-17:
 *   - Decisão 3: salva uma versão ENXUTA — sondagens, estacas, parâmetros,
 *     domínios, identificação, corte esquemático e um resumo da UI. NÃO salva
 *     resultadosCalculo (são derivados e recalculáveis ao reabrir → mantém o
 *     payload pequeno, longe do limite de ~5 MB do localStorage).
 *   - Decisão 6: TODO acesso ao localStorage é protegido por try/catch. Em
 *     navegador anônimo ou storage bloqueado, as funções degradam graciosamente
 *     (retornam false/null) e o app segue funcionando sem autosave.
 *   - Versionamento: grava _schemaVersao; ao carregar, recusa schema de versão
 *     diferente (evita reintroduzir crash ao atualizar o app no futuro).
 * ========================================================================== */

import { SCHEMA_VERSAO } from './estadoInicial';

const CHAVE = 'geospt:autosave:v1';

/** Detecta se o localStorage está disponível e gravável (incognito-safe). */
export function localStorageDisponivel() {
  try {
    const k = '__geospt_probe__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

/**
 * Monta o payload ENXUTO a salvar a partir do estado completo.
 * Exclui resultadosCalculo (recalculável). Preserva o essencial para retomar.
 */
function montarPayloadEnxuto(estado) {
  const o = estado?.obra || {};
  return {
    _schema: 'geospt-autosave',
    _schemaVersao: SCHEMA_VERSAO,
    _salvoEm: new Date().toISOString(),
    obra: {
      identificacao: o.identificacao,
      sondagens: o.sondagens,
      estacas: o.estacas,
      parametros: o.parametros,
      dominios: o.dominios,
      corteEsquematico: o.corteEsquematico,
      // resultadosCalculo OMITIDO de propósito (Decisão 3) — recalculado ao abrir.
    },
    ui: {
      abaAtiva: estado?.ui?.abaAtiva ?? null,
      estacaSelecionada: estado?.ui?.estacaSelecionada ?? null,
      modoCalculoSelecionado: estado?.ui?.modoCalculoSelecionado ?? null,
      submodoPerfilMedio: estado?.ui?.submodoPerfilMedio ?? null,
    },
  };
}

/** Heurística: a obra tem conteúdo que valha a pena salvar/recuperar? */
export function obraTemConteudo(estado) {
  const o = estado?.obra || {};
  const temSond = o.sondagens && Object.keys(o.sondagens).length > 0;
  const temEst = Array.isArray(o.estacas) && o.estacas.length > 0;
  const temNome = !!o.identificacao?.nome;
  return Boolean(temSond || temEst || temNome);
}

/**
 * Salva a obra. Retorna { ok, motivo? }.
 * Não salva (e limpa) se a obra estiver vazia, para não "ressuscitar" um app
 * recém-zerado com lixo.
 */
export function salvarObra(estado) {
  if (!localStorageDisponivel()) return { ok: false, motivo: 'indisponivel' };
  try {
    if (!obraTemConteudo(estado)) {
      // Obra vazia → remove qualquer autosave anterior (coerência com "Novo projeto").
      window.localStorage.removeItem(CHAVE);
      return { ok: true, vazia: true };
    }
    const payload = montarPayloadEnxuto(estado);
    const texto = JSON.stringify(payload);
    window.localStorage.setItem(CHAVE, texto);
    return { ok: true, bytes: texto.length, salvoEm: payload._salvoEm };
  } catch (e) {
    // QuotaExceededError ou storage bloqueado: degrada sem quebrar o app.
    const motivo =
      e && (e.name === 'QuotaExceededError' || /quota/i.test(String(e)))
        ? 'quota'
        : 'erro';
    return { ok: false, motivo };
  }
}

/**
 * Carrega a obra salva, se houver e for compatível.
 * @returns {{ payload, salvoEm, nome }|null}
 *   null se: storage indisponível, nada salvo, JSON inválido, ou schema de
 *   VERSÃO DIFERENTE (recusa migrar automaticamente — evita crash silencioso).
 */
export function carregarObraSalva() {
  if (!localStorageDisponivel()) return null;
  try {
    const texto = window.localStorage.getItem(CHAVE);
    if (!texto) return null;
    const payload = JSON.parse(texto);
    if (!payload || payload._schema !== 'geospt-autosave') return null;
    // Versionamento: recusa schema de versão diferente. (Migração explícita
    // poderia ser adicionada aqui no futuro; por ora, segurança em 1º lugar.)
    if (payload._schemaVersao !== SCHEMA_VERSAO) {
      return {
        incompativel: true,
        versaoSalva: payload._schemaVersao,
        versaoApp: SCHEMA_VERSAO,
        salvoEm: payload._salvoEm ?? null,
      };
    }
    return {
      payload,
      salvoEm: payload._salvoEm ?? null,
      nome: payload.obra?.identificacao?.nome || '(obra sem nome)',
    };
  } catch {
    return null;
  }
}

/** Remove o autosave (usado por "Novo projeto" e ao descartar recuperação). */
export function limparObraSalva() {
  if (!localStorageDisponivel()) return false;
  try {
    window.localStorage.removeItem(CHAVE);
    return true;
  } catch {
    return false;
  }
}

/** Há um autosave compatível disponível para recuperar? (uso rápido na inicialização) */
export function existeAutosave() {
  const r = carregarObraSalva();
  return Boolean(r && r.payload);
}
