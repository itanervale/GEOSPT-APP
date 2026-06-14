/* ============================================================================
 * test-transferencia.mjs — valida a lógica de transferenciaHelpers contra a
 * engine real. Espelha as funções (o Node não resolve o alias '@/'); qualquer
 * divergência aqui denuncia divergência no helper.
 * Rodar: node test-transferencia.mjs
 * ========================================================================== */
import { GeoSPT } from './src/engine/geospt-engine.js';

const U = GeoSPT.engine;
const kNtf = (kn) => GeoSPT.util.kNparaTf(kn);
const tfkN = (tf) => GeoSPT.util.tfParaKn(tf);
const tensaoMPa = (N, Ap) => N / 1000 / Ap;

function construirPLz(linha) {
  const desp = linha.camada_desprezada;
  const camadas = linha.camadasAtrito.filter(
    (c) => !(desp && c.cotaTopo_m === desp.cotaTopo_m && c.cotaBase_m === desp.cotaBase_m)
  );
  const PL = linha.Ql_total_kN, PP = linha.Rp_final_kN, PR = linha.Rrup_kN;
  const cotaArr = camadas[0].cotaTopo_m, cotaPonta = linha.cotaPonta_m;
  const camAtrito = camadas.filter((c) => typeof c.Ql_camada_kN === 'number' && Number.isFinite(c.Ql_camada_kN));
  const cotaTopoSolo = camAtrito.length ? camAtrito[0].cotaTopo_m : cotaArr;
  const PLz = (cota) => {
    if (cota >= cotaTopoSolo) return 0;
    let ac = 0;
    for (const c of camAtrito) {
      if (cota >= c.cotaBase_m && cota < c.cotaTopo_m) {
        const frac = (c.cotaTopo_m - cota) / (c.cotaTopo_m - c.cotaBase_m);
        return ac + frac * c.Ql_camada_kN;
      }
      if (cota < c.cotaBase_m) ac += c.Ql_camada_kN;
    }
    return ac;
  };
  return { PL, PP, PR, Ap: linha.Ap_m2, cotaArr, cotaPonta, cotaTopoSolo, PLz };
}
const serieRuptura = (info) => {
  const out = [];
  for (let cota = info.cotaArr; cota >= info.cotaPonta; cota -= 0.25) {
    const N = info.PR - info.PLz(cota);
    out.push({ cota, N, sigma: tensaoMPa(N, info.Ap) });
  }
  return out;
};
const serieModelo = (info, P, modelo) => {
  const out = [];
  for (let cota = info.cotaArr; cota >= info.cotaPonta; cota -= 0.25) {
    const plz = info.PLz(cota);
    let N;
    if (modelo === 'A') N = Math.max(P - plz, 0);
    else N = P <= info.PL ? P * (1 - plz / info.PL) : P - plz; // dois regimes
    if (N < 0) N = 0;
    out.push({ cota, N, sigma: tensaoMPa(N, info.Ap) });
  }
  return out;
};
const plotavel = (info, P) =>
  P == null || !(P > 0)
    ? { ok: false, motivo: 'carga não informada' }
    : P > info.PR
      ? { ok: false, motivo: 'P > PR' }
      : { ok: true };

let ok = 0, fail = 0;
const t = (nome, cond) => { cond ? ok++ : (fail++, console.log('❌', nome)); };
const near = (a, b, tol = 1e-6) => Math.abs(a - b) < tol;

const perfil = [];
for (let cota = 100, n = 5; cota >= 86; cota--, n += 2)
  perfil.push({ cota_m: cota, nspt: Math.min(n, 50), nspt_real: n, impenetravel: false, solo: 'Areia Siltosa', familia: 'Granular' });
const r = U.calcularDQ(perfil, { cotaArrasamento_m: 99, tipoEstaca: 'helice_continua', diametro_m: 0.40 });
const L = r.memorial.find((m) => m.cotaPonta_m === 90);
const info = construirPLz(L);

t('PL = Ql_total_kN', near(info.PL, L.Ql_total_kN));
t('PR = PL + PP', near(info.PR, info.PL + info.PP));
const somaIngenua = L.camadasAtrito.reduce((s, c) => s + c.Ql_camada_kN, 0);
t('PL != soma ingênua (bulbo excluído)', !near(info.PL, somaIngenua) && somaIngenua > info.PL);

t('PL(topo) = 0', near(info.PLz(info.cotaArr), 0));
t('PL(ponta) = PL', near(info.PLz(info.cotaPonta), info.PL, 1e-6));

const sr = serieRuptura(info);
t('ruptura N_topo = PR', near(sr[0].N, info.PR, 1e-6));
t('ruptura N_base = PP', near(sr[sr.length - 1].N, info.PP, 1e-6));
t('ruptura σ = N/Ap', near(sr[0].sigma, info.PR / 1000 / info.Ap, 1e-9));

const Pprev = tfkN(50); // < PL (~58 tf)
t('P_prev < PL (cenário de divergência)', Pprev < info.PL);
const A = serieModelo(info, Pprev, 'A');
const B = serieModelo(info, Pprev, 'B');
t('A: N_topo = P', near(A[0].N, Pprev, 1e-6));
t('B: N_topo = P', near(B[0].N, Pprev, 1e-6));
t('A: N_base = 0 (P<PL)', near(A[A.length - 1].N, 0, 1e-6));
t('B: N_base = 0 (P<PL)', near(B[B.length - 1].N, 0, 1e-6));
const algumZeroAntesA = A.slice(0, -1).some((p) => p.N === 0);
t('A: trava em 0 ANTES da base (ponto B)', algumZeroAntesA);
const meio = Math.floor(A.length / 2);
t('B >= A no meio do fuste (B mais suave)', B[meio].N >= A[meio].N - 1e-9);
t('B > A em algum ponto (curvas distintas p/ P<PL)', B.some((p, i) => p.N > A[i].N + 1e-6));

const Pgrande = tfkN(80); // > PL
const A2 = serieModelo(info, Pgrande, 'A');
const B2 = serieModelo(info, Pgrande, 'B');
const PpontaEsperada = Pgrande - info.PL;
t('A: P>PL → N_base = P−PL', near(A2[A2.length - 1].N, PpontaEsperada, 1e-6));
t('B: P>PL → N_base = P−PL', near(B2[B2.length - 1].N, PpontaEsperada, 1e-6));
t('P>PL: Modelo B ≡ Modelo A (atrito saturado)', A2.every((p, i) => near(p.N, B2[i].N, 1e-9)));

t('ponta trabalho (P<PL) = 0', near(Math.max(Pprev - info.PL, 0), 0));
t('ponta trabalho (P>PL) = P−PL', near(Math.max(Pgrande - info.PL, 0), PpontaEsperada, 1e-6));

const naoCresce = (s) => s.every((p, i) => i === 0 || p.N <= s[i - 1].N + 1e-9);
t('ruptura: N monotônica decrescente', naoCresce(sr));
t('Modelo A: N monotônica decrescente', naoCresce(A));
t('Modelo B: N monotônica decrescente', naoCresce(B));

t('plotavel: P_prev OK', plotavel(info, Pprev).ok === true);
t('plotavel: P_ult=100tf OK', plotavel(info, tfkN(100)).ok === true);
t('plotavel: P=130tf rejeita (>PR)', plotavel(info, tfkN(130)).ok === false);
t('plotavel: carga ausente rejeita', plotavel(info, null).ok === false);
t('plotavel: carga zero rejeita', plotavel(info, 0).ok === false);

// --- E-04: fuste ACIMA do topo das sondagens (aterro espesso) → N constante ---
// Reproduz a causa do bug do NaN: camadas acima do perfil têm Ql undefined.
// O helper deve tratar como atrito nulo (N const) e nunca gerar NaN.
const perfilCurto = [];
for (let cota = 100, n = 5; cota >= 86; cota--, n += 2)
  perfilCurto.push({ cota_m: cota, nspt: Math.min(n, 50), nspt_real: n, impenetravel: false, solo: 'Areia Siltosa', familia: 'Granular' });
// Arrasamento 103 (3 m ACIMA do topo do perfil em 100) → fuste fora do perfil
const rFora = U.calcularAV(perfilCurto, { cotaArrasamento_m: 103, tipoEstaca: 'premoldada', diametro_m: 0.30 });
const Lfora = rFora.memorial.find((m) => m.cotaPonta_m === 92);
if (Lfora) {
  const infoFora = construirPLz(Lfora);
  const sFora = serieRuptura(infoFora);
  t('E-04: série SEM NaN (fuste fora do perfil)', sFora.every((p) => Number.isFinite(p.N) && Number.isFinite(p.sigma)));
  // N deve ser constante (= PR) acima do topo do solo
  const acimaSolo = sFora.filter((p) => p.cota > infoFora.cotaTopoSolo + 0.01);
  t('E-04: N constante = PR no aterro acima do solo',
    acimaSolo.length === 0 || acimaSolo.every((p) => Math.abs(p.N - infoFora.PR) < 1e-6));
  t('E-04: cotaTopoSolo < cotaArr (há aterro)', infoFora.cotaTopoSolo < infoFora.cotaArr);
}

const rAV = U.calcularAV(perfil, { cotaArrasamento_m: 99, tipoEstaca: 'helice_continua', diametro_m: 0.40 });
const infoAV = construirPLz(rAV.memorial.find((m) => m.cotaPonta_m === 90));
t('AV PP > DQ PP (mesma cota)', infoAV.PP > info.PP);

console.log(`\n=== Transferência de carga: ${ok} ok / ${fail} fail ===`);
process.exit(fail ? 1 : 0);
