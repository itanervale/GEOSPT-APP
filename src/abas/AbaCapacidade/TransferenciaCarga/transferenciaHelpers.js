/* ============================================================================
 * transferenciaHelpers — Diagrama de transferência de carga estaca-solo
 * Modelos de AOKI (1979), conforme documento de referência TQS (Fig. 10.1–10.3).
 *
 * FUNÇÕES PURAS — sem React, testáveis em Node (ver test-transferencia.mjs).
 *
 * ───────────────────────────────────────────────────────────────────────────
 * REGRA DE OURO: a engine (geospt-engine.js) NÃO é tocada. Tudo aqui deriva do
 * memorial que a engine já produz. Em particular:
 *   - PL = linha.Ql_total_kN  (atrito lateral último total — JÁ exclui a camada
 *     do "último metro desprezado"/bulbo; NUNCA somar camadasAtrito p/ obter PL)
 *   - PP = linha.Rp_final_kN  (ponta última)
 *   - PR = linha.Rrup_kN      (= PL + PP, validado bit a bit)
 *   - Ap = linha.Ap_m2        (área da seção — respeita formato circular/quadrada
 *     do CP-14)
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Teoria (z = profundidade desde a cota de arrasamento; a cota DECRESCE com z):
 *   PL(z) = atrito lateral acumulado do topo até a profundidade z (interpolado
 *           linearmente dentro do metro corrente, usando SÓ as camadas que contam
 *           para PL, i.e., EXCLUINDO a camada_desprezada).
 *   N(z)  = esforço normal (carga remanescente).
 *   σ(z)  = N(z) / Ap  (tensão axial no material da estaca).
 *
 * Cenários:
 *   (1) RUPTURA   P = PR → N(z) = PR − PL(z); base = PP. (não usa Modelo A/B)
 *   (2) PREVISTA  P = P_prev (carga prevista do usuário)
 *   (3) ÚLTIMA    P = P_prev × FSg
 *   Cenários 2 e 3 usam um dos dois modelos de AOKI:
 *     Modelo A: N(z) = max(P − PL(z), 0)        (resistência local; trava em 0
 *               abaixo do "ponto B" onde P−PL(z)=0)
 *     Modelo B: P ≤ PL → N(z) = P·(1 − PL(z)/PL)  (redistribuição proporcional)
 *               P > PL → N(z) = P − PL(z)         (atrito saturado: ponta recebe
 *               P−PL; nesse regime B ≡ A — decisão validada com o eng. responsável,
 *               coerente com a Fig. 10.1 do documento, onde PL<P<PR ⇒ Pp=P−PL).
 *   Ponta nos cenários 2/3: Pp = max(P − PL, 0). Nunca PP (ponta última).
 * ========================================================================== */

import { GeoSPT } from '@/engine/geospt-engine';

/** tf → kN usando a constante CANÔNICA da engine (KN_POR_TF = 9.80665). */
export function tfParaKn(tf) {
  if (tf == null) return null;
  return GeoSPT.util.tfParaKn(tf);
}

/** kN → tf usando a constante CANÔNICA da engine. */
export function kNparaTf(kN) {
  if (kN == null) return null;
  return GeoSPT.util.kNparaTf(kN);
}

/** Tensão axial σ = N/Ap. N em kN, Ap em m² → retorna MPa (= MN/m²). */
export function tensaoMPa(N_kN, Ap_m2) {
  if (N_kN == null || !Ap_m2) return null;
  return N_kN / 1000 / Ap_m2; // kN→MN ; MN/m² = MPa
}

/**
 * Constrói o "info de PL(z)" a partir de uma linha de memorial da engine.
 * @returns {Object|null} { PL, PP, PR, Ap, cotaArr, cotaPonta, Lfuste, camadas, PLz }
 */
export function construirPLz(linha) {
  if (!linha || !Array.isArray(linha.camadasAtrito) || linha.camadasAtrito.length === 0) {
    return null;
  }
  const desp = linha.camada_desprezada;
  const camadas = linha.camadasAtrito.filter(
    (c) =>
      !(
        desp &&
        c.cotaTopo_m === desp.cotaTopo_m &&
        c.cotaBase_m === desp.cotaBase_m
      )
  );
  if (camadas.length === 0) return null;

  const PL = linha.Ql_total_kN;
  const PP = linha.Rp_final_kN;
  const PR = linha.Rrup_kN;
  const Ap = linha.Ap_m2;
  const cotaArr = camadas[0].cotaTopo_m;
  const cotaPonta = linha.cotaPonta_m;
  const Lfuste = cotaArr - cotaPonta;

  // Topo REAL do solo com atrito: primeira camada (de cima p/ baixo) que tem
  // Ql_camada_kN válido. Acima dela (fuste em aterro/acima das sondagens) não há
  // atrito mobilizável — N(z) permanece CONSTANTE = P (solução física correta;
  // o memorial da engine já exclui essas camadas de Ql_total_kN).
  const camadasComAtrito = camadas.filter(
    (c) => typeof c.Ql_camada_kN === 'number' && Number.isFinite(c.Ql_camada_kN)
  );
  const cotaTopoSolo = camadasComAtrito.length > 0 ? camadasComAtrito[0].cotaTopo_m : cotaArr;

  /**
   * Atrito acumulado do topo do SOLO até a cota dada (kN), interpolação linear no
   * metro. Acima do topo do solo (trecho sem atrito) → 0. Camadas sem
   * Ql_camada_kN válido são ignoradas (não somam NaN). Abaixo de todas → PL total.
   */
  const PLz = (cota) => {
    if (cota >= cotaTopoSolo) return 0; // trecho sem atrito (aterro/acima do perfil)
    let ac = 0;
    for (const c of camadasComAtrito) {
      if (cota >= c.cotaBase_m && cota < c.cotaTopo_m) {
        const frac = (c.cotaTopo_m - cota) / (c.cotaTopo_m - c.cotaBase_m);
        return ac + frac * c.Ql_camada_kN;
      }
      if (cota < c.cotaBase_m) ac += c.Ql_camada_kN;
    }
    return ac; // = PL
  };

  return { PL, PP, PR, Ap, cotaArr, cotaPonta, cotaTopoSolo, Lfuste, camadas, PLz };
}

/** Amostra cotas do topo à ponta, passo `passo` m (default 0,25) + ponta exata. */
function amostrarCotas(info, passo = 0.25) {
  const cotas = [];
  const n = Math.round((info.cotaArr - info.cotaPonta) / passo);
  for (let i = 0; i <= n; i++) cotas.push(Number((info.cotaArr - i * passo).toFixed(4)));
  if (cotas[cotas.length - 1] !== info.cotaPonta) cotas.push(info.cotaPonta);
  return cotas;
}

function linhaSerie(info, cota, N_kN) {
  return {
    cota,
    z: Number((info.cotaArr - cota).toFixed(4)),
    N_kN,
    N_tf: kNparaTf(N_kN),
    sigma_MPa: tensaoMPa(N_kN, info.Ap),
  };
}

/** Cenário 1 — RUPTURA: N(z) = PR − PL(z), base = PP. */
export function serieRuptura(info, passo = 0.25) {
  return amostrarCotas(info, passo).map((cota) => linhaSerie(info, cota, info.PR - info.PLz(cota)));
}

/** Cenários 2/3 — Modelo A ou B (dois regimes para B). */
export function serieModelo(info, P_kN, modelo, passo = 0.25) {
  return amostrarCotas(info, passo).map((cota) => {
    const plz = info.PLz(cota);
    let N;
    if (modelo === 'A') {
      N = Math.max(P_kN - plz, 0);
    } else {
      // Modelo B — dois regimes (ver cabeçalho).
      if (P_kN <= info.PL) {
        N = info.PL > 0 ? P_kN * (1 - plz / info.PL) : 0;
      } else {
        N = P_kN - plz; // atrito saturado: ponta recebe P−PL
      }
    }
    if (N < 0) N = 0;
    return linhaSerie(info, cota, N);
  });
}

/** Ponta efetiva (kN) nos cenários de trabalho (2/3): Pp = max(P − PL, 0). */
export function pontaTrabalho(info, P_kN) {
  return Math.max(P_kN - info.PL, 0);
}

/** Cota do "ponto B" do Modelo A (P − PL(z) = 0), só quando P < PL; senão null. */
export function pontoB_ModeloA(info, P_kN) {
  if (P_kN >= info.PL) return null;
  const passo = 0.01;
  for (let cota = info.cotaArr; cota >= info.cotaPonta; cota -= passo) {
    if (info.PLz(cota) >= P_kN) return Number(cota.toFixed(2));
  }
  return info.cotaPonta;
}

/** Regra de plotabilidade. P_kN null/0 = carga não informada. */
export function plotavel(info, P_kN) {
  if (!info) return { ok: false, motivo: 'Sem memorial nesta cota — nada a plotar.' };
  if (P_kN == null || !(P_kN > 0)) {
    return { ok: false, motivo: 'Carga prevista não informada na estaca.' };
  }
  if (P_kN > info.PR) {
    return {
      ok: false,
      motivo:
        `A carga (${kNparaTf(P_kN).toFixed(1)} tf) excede a ruptura geotécnica do ` +
        `método nesta cota (${kNparaTf(info.PR).toFixed(1)} tf). Reduza a carga, ` +
        'aprofunde a ponta ou reveja o método.',
    };
  }
  return { ok: true };
}

/** Lê o FS global (FSg) customizado, com fallback ao default da engine. */
export function lerFSg(coeficientesCustomizados) {
  const custom = coeficientesCustomizados?.DQ_FS?.FSg;
  if (custom != null && custom > 0) return custom;
  return GeoSPT.domain.coefficients.DQ_FS.FSg;
}

export const CENARIOS = [
  {
    id: 'ruptura',
    rotulo: 'Ruptura geotécnica',
    descricao: 'Carga de ruptura do método (R_rup = R_l + R_p). Distribuição pelos valores do método.',
  },
  {
    id: 'prevista',
    rotulo: 'Carga prevista',
    descricao: 'Carga prevista informada na estaca (carga de trabalho de projeto).',
  },
  {
    id: 'ultima',
    rotulo: 'Prevista × FS',
    descricao: 'Carga prevista multiplicada pelo fator de segurança global.',
  },
];

export const MODELOS_AOKI = [
  { id: 'A', rotulo: 'Modelo A', descricao: 'Resistência local mobilizada (N = P − PL(z)).' },
  { id: 'B', rotulo: 'Modelo B', descricao: 'Redistribuição proporcional (N = P·[1 − PL(z)/PL]).' },
];

/**
 * Monta o pacote de um cenário pronto para plotagem.
 * @param {string} cenarioId 'ruptura' | 'prevista' | 'ultima'
 * @param {'A'|'B'} modelo
 * @param {number|null} Pprev_kN
 * @param {number} FSg
 */
export function montarCenario(info, cenarioId, modelo, Pprev_kN, FSg) {
  if (!info) return { ok: false, motivo: 'Sem memorial nesta cota.' };

  if (cenarioId === 'ruptura') {
    return {
      ok: true,
      cenarioId,
      P_kN: info.PR,
      ponta_kN: info.PP,
      usaModelo: false,
      serie: serieRuptura(info),
    };
  }

  const P = cenarioId === 'ultima' ? (Pprev_kN != null ? Pprev_kN * FSg : null) : Pprev_kN;
  const verif = plotavel(info, P);
  if (!verif.ok) return { ok: false, cenarioId, ...verif };

  return {
    ok: true,
    cenarioId,
    P_kN: P,
    ponta_kN: pontaTrabalho(info, P),
    usaModelo: true,
    modelo,
    pontoB_cota: modelo === 'A' ? pontoB_ModeloA(info, P) : null,
    serie: serieModelo(info, P, modelo),
  };
}
