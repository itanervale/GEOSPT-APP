/* ============================================================================
 * gerarDetalhamentoJSON — exportação para o app de detalhamento de estacas
 *
 * Gera o arquivo lido por `estaca_geospt.ler_exportacao` (TQS-PYTHON, app
 * EstacaEscavada), que desenha o perfil das sondagens ao lado da estaca.
 * Esquema próprio: `geospt-detalhamento-estacas` — independente do
 * SCHEMA_VERSAO da obra. 1.1.0 acrescenta a cor do solo (texto do laudo,
 * informativa): `cor` nas leituras e nas camadas, `corDetalhe` na média.
 *
 * O app consumidor NÃO calcula geotecnia: compatibilização, envoltória,
 * sondagem média, domínio e furo mais próximo saem prontos daqui, pelas mesmas
 * funções das Abas 3 e 6 (prepararPerfilCalculo / engine / calcularModosDaEstaca
 * da auditoria). A engine não é alterada.
 *
 * Convenções: cotas e profundidades em metros (profundidade da boca do furo,
 * positiva para baixo); campos sem valor saem `null`, listas vazias `[]`.
 * Estaca sem coordenadas / cota de arrasamento / domínio vazio NÃO impede a
 * exportação — o motivo vai para `avisos` da estaca.
 * ============================================================================ */

import { GeoSPT } from '@/engine/geospt-engine';
import { prepararPerfilCalculo } from '@/abas/AbaCapacidade/prepararPerfilCalculo';
import { resolverFurosParaCalculo, furoParaDominio } from '@/state/dominiosHelper';
import { formatoDe, dimensaoDe } from '@/domain/estacas';
import { coresDaCota, limparCor } from '@/domain/cores';
import { calcularModosDaEstaca } from './gerarAuditoriaJSON';

export const DETALHAMENTO_SCHEMA = 'geospt-detalhamento-estacas';
export const DETALHAMENTO_SCHEMA_VERSAO = '1.1.0';

const SUBMODO_PADRAO = '2.2_conservador';
const SUBMODOS = ['2.1_predominante', '2.2_conservador', '2.3_dois_paralelos'];

// Arredonda a 3 casas (remove ruído de ponto flutuante em cota = boca − prof.).
const r3 = (v) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 1000) / 1000);
const r2 = (v) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 100) / 100);
const num = (v) => (v == null || !Number.isFinite(v) ? null : v);
const txt = (v) => (v == null || String(v).trim() === '' ? null : String(v));

const temXY = (c) => !!c && Number.isFinite(c.x) && Number.isFinite(c.y);
const coordSaida = (c) => ({ x: num(c?.x), y: num(c?.y) });

// ----- sondagens (dado bruto) ------------------------------------------------
function montarSondagem(nome, s, obra) {
  const boca = num(s.cotaTopo_m);
  const cotaDe = (prof) => (boca == null || prof == null ? null : r3(boca - prof));
  const limite = GeoSPT.domain.constants.NSPT_LIMITE_CALCULO;
  const dom = furoParaDominio(nome, obra);
  return {
    nome,
    cotaBoca_m: boca,
    profundidadeFinal_m: num(s.profundidadeFinal_m),
    criterioParalisacao: txt(s.criterioParalisacao),
    naInicial_m: num(s.naInicial_m),
    naFinal_m: num(s.naFinal_m),
    naInicialCota_m: cotaDe(num(s.naInicial_m)),
    naFinalCota_m: cotaDe(num(s.naFinal_m)),
    coordenadas: coordSaida(s.coordenadas),
    dominioId: dom ? dom.id : null,
    leituras: (s.leituras || []).map((l) => ({
      profundidade_m: num(l.profundidade_m),
      cota_m: cotaDe(num(l.profundidade_m)),
      nspt_real: num(l.nspt_real),
      nspt_calculo:
        l.nspt_calculo != null
          ? num(l.nspt_calculo)
          : l.nspt_real != null
            ? Math.min(l.nspt_real, limite)
            : null,
      impenetravel: !!l.impenetravel,
      solo: txt(l.solo),
      familia: txt(l.familia),
      cor: limparCor(l.cor),
    })),
  };
}

// ----- perfis por estaca -----------------------------------------------------
// Índice cota → { r: linha da compatibilização (nFuros, heterogeneo, soloPred),
// cores: cores da cota (domain/cores, derivadas sem alterar a compatibilização) }.
function indexarCompat(compat, sondagens) {
  const m = new Map();
  ((compat && compat.resultados) || []).forEach((r) =>
    m.set(r.cotaRef_m, { r, cores: coresDaCota(r, sondagens) })
  );
  return m;
}

function camadaMedia(c, idx) {
  const linha = idx.get(c.cota_m);
  const cr = linha ? linha.r : null;
  return {
    cota_m: c.cota_m,
    nspt: num(c.nspt),
    nspt_real: num(c.nspt_real),
    solo: txt(c.solo),
    familia: txt(c.familia),
    heterogeneo: cr ? !!cr.heterogeneo : false,
    soloDetalhe: cr ? txt(cr.soloPred) : txt(c.solo),
    nFuros: cr ? cr.nFuros : null,
    origem: txt(c.origemFuro),
    // Cor mais frequente entre os furos da família desta camada (em cota
    // heterogênea, a família escolhida pelo submodo / o ramo do 2.3).
    cor: linha ? linha.cores.porFamilia[c.familia]?.cor ?? null : null,
    corDetalhe: linha ? linha.cores.detalhe : null,
  };
}

function perfilEnvoltoria(estaca, filtro, params) {
  const r = prepararPerfilCalculo({
    modo: 'envoltoria',
    submodo: null,
    sondagens: filtro.sondagens,
    estaca,
    params,
    filtroDominio: filtro,
  });
  if (r.erro || !r.compatibilizacao) return { erro: r.erro || 'sem compatibilização', camadas: [] };
  const idx = indexarCompat(r.compatibilizacao, filtro.sondagens);
  const camadas = (r.perfilParaCalculo || []).map((c) => ({
    cota_m: c.cota_m,
    nspt: num(c.nspt),
    nspt_real: num(c.nspt_real),
    impenetravel: !!c.impenetravel,
    solo: txt(c.solo),
    familia: txt(c.familia),
    furo: txt(c.origemFuro),
    nFuros: idx.get(c.cota_m)?.r.nFuros ?? null,
    // Cor da mesma leitura (mesmo furo) que deu o NSPT mínimo.
    cor: idx.get(c.cota_m)?.cores.envoltoria ?? null,
  }));
  return { camadas };
}

// Retorna { camadas } (2.1/2.2), { ramos } (2.3) ou { erro }.
function perfilMedio(estaca, filtro, params, submodo) {
  const r = prepararPerfilCalculo({
    modo: 'perfil_medio',
    submodo,
    sondagens: filtro.sondagens,
    estaca,
    params,
    filtroDominio: filtro,
  });
  if (r.erro) return { erro: r.erro };
  const idx = indexarCompat(r.compatibilizacao, filtro.sondagens);
  if (submodo === '2.3_dois_paralelos') {
    const mapa = (arr) => (arr || []).map((c) => camadaMedia(c, idx));
    return {
      ramos: {
        coesivo: mapa(r.ramos?.coesivo),
        granular: mapa(r.ramos?.granular),
        intermediario: mapa(r.ramos?.intermediario),
      },
    };
  }
  return {
    camadas: (r.perfilParaCalculo || []).map((c) => camadaMedia(c, idx)),
    cotasBloqueadas_m: r.cotasBloqueadas || [],
  };
}

// Cota sugerida por modo — a mesma da auditoria (calcularModosDaEstaca).
// por_furo: cota sugerida do furo crítico (menor pior caso), como na auditoria.
function cotasSugeridas(estaca, obra, params) {
  const vazio = { envoltoria: null, perfil_medio: null, por_furo: null, interpolacao: null };
  // Sem carga prevista a Aba 6 mostra a cota mais profunda só como "referência
  // neutra" (sem_alvo) — não é sugestão; sem arrasamento não há cálculo.
  if (!(estaca.cargaPrevista_tf > 0) || estaca.cotaArrasamento_m == null) return vazio;
  let modos;
  try {
    modos = calcularModosDaEstaca(estaca, obra.sondagens || {}, params, obra);
  } catch (e) {
    return vazio;
  }
  const porFuro = modos.por_furo;
  const critico =
    porFuro && !porFuro.erro && porFuro.furoCritico
      ? (porFuro.furos || []).find((f) => f.furo === porFuro.furoCritico)
      : null;
  return {
    envoltoria: modos.envoltoria?.cotaSugerida_m ?? null,
    perfil_medio: modos.perfil_medio_2_2?.cotaSugerida_m ?? null,
    por_furo: critico?.cotaSugerida_m ?? null,
    interpolacao: modos.interpolacao?.cotaSugerida_m ?? null,
  };
}

// ----- estaca ----------------------------------------------------------------
function montarEstaca(estaca, obra, params, submodoSel) {
  const avisos = [];
  const filtro = resolverFurosParaCalculo(estaca, obra);
  const furosConsiderados = Object.keys(filtro.sondagens);

  if (estaca.dominioId && !filtro.dominio) {
    avisos.push(
      'Domínio "' + estaca.dominioId + '" não existe na obra — usados todos os furos.'
    );
  }
  if (filtro.dominio && furosConsiderados.length === 0) {
    avisos.push('Domínio "' + filtro.dominio.nome + '" está vazio — sem furos para o perfil.');
  }
  if (!temXY(estaca.coordenadas)) {
    avisos.push('Estaca sem coordenadas (x, y): distâncias e sondagem mais próxima indisponíveis.');
  }
  if (estaca.cotaArrasamento_m == null) {
    avisos.push('Estaca sem cota de arrasamento: cotas sugeridas indisponíveis.');
  } else if (!Number.isInteger(estaca.cotaArrasamento_m)) {
    avisos.push(
      'Cota de arrasamento decimal: o cálculo de capacidade usa Math.floor (' +
        Math.floor(estaca.cotaArrasamento_m) +
        ').'
    );
  }
  if (estaca.cargaPrevista_tf == null || !(estaca.cargaPrevista_tf > 0)) {
    avisos.push('Estaca sem carga prevista: cotas sugeridas indisponíveis.');
  }

  // Distância 2D até cada furo considerado que tenha coordenadas.
  let sondagensPorDistancia = [];
  if (temXY(estaca.coordenadas)) {
    sondagensPorDistancia = furosConsiderados
      .filter((n) => temXY(filtro.sondagens[n].coordenadas))
      .map((n) => ({
        nome: n,
        distancia_m: r2(
          GeoSPT.util.distanciaEuclidiana(estaca.coordenadas, filtro.sondagens[n].coordenadas)
        ),
      }))
      .sort((a, b) => a.distancia_m - b.distancia_m || a.nome.localeCompare(b.nome));
  }

  // Perfis (cada bloco falha isoladamente, sem derrubar a exportação).
  let env = { camadas: [] };
  let med = { camadas: [] };
  const porSubmodo = {};
  try {
    env = perfilEnvoltoria(estaca, filtro, params);
  } catch (e) {
    env = { erro: e.message, camadas: [] };
  }
  if (env.erro && furosConsiderados.length > 0) avisos.push('Envoltória: ' + env.erro);

  SUBMODOS.forEach((sm) => {
    try {
      porSubmodo[sm] = perfilMedio(estaca, filtro, params, sm);
    } catch (e) {
      porSubmodo[sm] = { erro: e.message };
    }
  });
  med = porSubmodo[submodoSel] || { camadas: [] };

  if (furosConsiderados.length > 0) {
    if (med.erro) avisos.push('Sondagem média (' + submodoSel + '): ' + med.erro);
    if (submodoSel === '2.3_dois_paralelos') {
      avisos.push(
        'Submodo 2.3 não gera perfil único: `media.camadas` vazio; use `mediaPorSubmodo["2.3_dois_paralelos"]`.'
      );
    }
    const b21 = porSubmodo['2.1_predominante']?.cotasBloqueadas_m;
    if (submodoSel === '2.1_predominante' && b21 && b21.length > 0) {
      avisos.push(
        'Submodo 2.1: cotas heterogêneas omitidas da média (exigem decisão do projetista): ' +
          b21.join(', ') +
          '.'
      );
    }
  }

  const listaOuVazia = (p) => (p && p.camadas ? p.camadas : []);
  return {
    nome: estaca.nome,
    tipoEstaca: txt(estaca.tipoEstaca),
    formato: formatoDe(estaca),
    dimensao_m: num(dimensaoDe(estaca)),
    cotaArrasamento_m: num(estaca.cotaArrasamento_m),
    cargaPrevista_tf: num(estaca.cargaPrevista_tf),
    coordenadas: coordSaida(estaca.coordenadas),
    dominioId: filtro.dominio ? filtro.dominio.id : null,
    dominioNome: filtro.dominio ? txt(filtro.dominio.nome) : null,
    furosConsiderados,
    sondagensPorDistancia,
    sondagemMaisProxima: sondagensPorDistancia.length ? sondagensPorDistancia[0].nome : null,
    cotaPontaSugerida_m: cotasSugeridas(estaca, obra, params),
    avisos,
    perfis: {
      envoltoria: listaOuVazia(env),
      media: {
        submodo: submodoSel,
        camadas: listaOuVazia(med),
      },
      mediaPorSubmodo: {
        '2.1_predominante': listaOuVazia(porSubmodo['2.1_predominante']),
        '2.2_conservador': listaOuVazia(porSubmodo['2.2_conservador']),
        '2.3_dois_paralelos': porSubmodo['2.3_dois_paralelos']?.ramos || {
          coesivo: [],
          granular: [],
          intermediario: [],
        },
      },
    },
  };
}

/**
 * Gera o objeto JSON de exportação para detalhamento de estacas.
 * @param {object} obra - estado.obra
 * @param {object} [ui] - estado.ui (usa ui.submodoPerfilMedio; padrão 2.2_conservador)
 */
export function gerarDetalhamentoJSON(obra, ui) {
  const sondagens = obra.sondagens || {};
  const params = obra.parametros || {};
  const submodoSel = SUBMODOS.includes(ui?.submodoPerfilMedio)
    ? ui.submodoPerfilMedio
    : SUBMODO_PADRAO;
  const id = obra.identificacao || {};

  const avisos = [];
  const semCoord = Object.keys(sondagens).filter((n) => !temXY(sondagens[n].coordenadas));
  if (semCoord.length > 0) {
    avisos.push('Sondagens sem coordenadas (x, y): ' + semCoord.join(', ') + '.');
  }
  if (Object.keys(sondagens).length === 0) avisos.push('Obra sem sondagens.');
  if (!(obra.estacas || []).length) avisos.push('Obra sem estacas.');

  return {
    _schema: DETALHAMENTO_SCHEMA,
    _schemaVersao: DETALHAMENTO_SCHEMA_VERSAO,
    _engineVersao: GeoSPT.versao,
    _geradoEm: new Date().toISOString(),
    obra: {
      nome: txt(id.nome),
      localizacao: txt(id.localizacao),
      responsavelTecnico: txt(id.responsavelTecnico),
      sistemaCoordenadas: txt(id.sistemaCoordenadas),
    },
    referencialCotas:
      'Cotas no referencial cadastrado no GEOSPT (cota de boca dos furos e cota de arrasamento das estacas); profundidades medidas a partir da boca do furo, positivas para baixo.',
    parametros: {
      janelaCompatibilizacao_m:
        params.janelaCompatibilizacao_m || GeoSPT.domain.constants.JANELA_PADRAO_M,
      submodoPerfilMedio: submodoSel,
      nsptLimiteCalculo: GeoSPT.domain.constants.NSPT_LIMITE_CALCULO,
    },
    avisos,
    dominios: (obra.dominios || []).map((d) => ({
      id: d.id,
      nome: txt(d.nome),
      furos: [...(d.furos || [])],
    })),
    sondagens: Object.keys(sondagens).map((n) => montarSondagem(n, sondagens[n], obra)),
    estacas: (obra.estacas || []).map((e) => montarEstaca(e, obra, params, submodoSel)),
  };
}
