import { GeoSPT } from './src/engine/geospt-engine.js';
import { BALSAS } from './src/engine/dataset-balsas.js';

console.log('=== TESTE ES MODULE — GeoSPT engine + dataset Balsas ===\n');
console.log('Engine versao:', GeoSPT.versao, '| tabelas:', GeoSPT.versaoTabelas);
console.log('Furos Balsas:', Object.keys(BALSAS.sondagens).sort().join(', '));

const compat = GeoSPT.engine.compatibilizar(BALSAS.sondagens, { janela_m: 0.5 });
console.log('Compat: ' + compat.metadata.cotasProcessadas + ' cotas, furo crítico ' + compat.metadata.furoCritico);

const perfil = compat.resultados
  .filter(r => r.envoltoria.nspt !== null)
  .map(r => ({
    cota_m: r.cotaRef_m, nspt: r.envoltoria.nspt, nspt_real: r.envoltoria.nspt_real,
    impenetravel: r.envoltoria.impenetravel, solo: r.envoltoria.solo, familia: r.envoltoria.familia,
  }));

const opcoes = {
  tipoEstaca: 'helice_continua', diametro_m: 0.40, cotaArrasamento_m: 253,
  coeficientesCustomizados: GeoSPT.domain.coefficients,
};
const r = GeoSPT.engine.calcularDQ(perfil, opcoes);
const linha242 = r.memorial.find(m => m.cotaPonta_m === 242);

console.log('\nCota 242m | hélice contínua D=0.40m | arr=253m');
console.log('Q_adm = ' + linha242?.Qadm_final_tf?.toFixed(2) + ' tf (esperado: 32.84 tf)');

if (linha242 && Math.abs(linha242.Qadm_final_tf - 32.84) < 0.05) {
  console.log('\n✅ REGRESSÃO CANÔNICA PRESERVADA');
  process.exit(0);
} else {
  console.log('\n❌ FALHA');
  process.exit(1);
}
