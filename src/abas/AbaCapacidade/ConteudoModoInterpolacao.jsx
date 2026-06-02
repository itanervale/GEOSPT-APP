/* ============================================================================
 * ConteudoModoInterpolacao — Modo 4 (interpolação por locação)
 *
 * Para cada cota de ponta, Q_adm é interpolado dos 3 furos mais próximos da
 * estaca (peso linear normalizado). Mostra card na cota sugerida, distribuição
 * de influência dos furos e tabela de pesos por cota (auditoria — exigida pelo
 * LEIA_ME com fórmula validável peso × valor).
 *
 * Extraído fielmente das linhas 7394-7528 do geospt_app.jsx. Mudanças:
 *   - text-xxs → text-[10px]
 *   - cores de divergência via mapa estático (JIT)
 *   - imports locais
 * ============================================================================ */

import React from 'react';
import Banner from '@/components/ui/Banner';
import { classificarDivergencia } from './calculoHelpers';

// Mapa estático de classes da divergência (JIT precisa de literais)
const DIV_CLASSES = {
  green: { bg: 'bg-green-50', text: 'text-green-700', textBold: 'text-green-900' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', textBold: 'text-amber-900' },
  red: { bg: 'bg-red-50', text: 'text-red-700', textBold: 'text-red-900' },
  slate: { bg: 'bg-slate-50', text: 'text-slate-700', textBold: 'text-slate-900' },
};

export default function ConteudoModoInterpolacao({ resultado, estaca, params }) {
  const r = resultado.interpolacao;
  if (!r || !r.curva || r.curva.length === 0) {
    return (
      <Banner tipo="alerta">
        Curva de interpolação vazia. Verifique coordenadas dos furos e da
        estaca.
      </Banner>
    );
  }

  const cargaPrev = estaca.cargaPrevista_tf;
  // CRITÉRIO CANÔNICO: cota mais profunda onde DQ E AV atendem simultaneamente.
  let sugerida = null;
  let nenhumaAtendeAmbos = false;
  if (cargaPrev != null && cargaPrev > 0) {
    const atendAmbos = r.curva.filter(
      (c) =>
        (c.Qadm_DQ_tf ?? 0) >= cargaPrev && (c.Qadm_AV_tf ?? 0) >= cargaPrev
    );
    if (atendAmbos.length > 0) {
      // mais rasa = maior cotaPonta_m
      sugerida = atendAmbos.reduce((b, c) =>
        c.cotaPonta_m > b.cotaPonta_m ? c : b
      );
    } else {
      nenhumaAtendeAmbos = true;
    }
  } else {
    // Sem carga prevista: cota com maior Q DQ (referência neutra)
    sugerida = r.curva.reduce((b, c) =>
      (c.Qadm_DQ_tf ?? -Infinity) > (b.Qadm_DQ_tf ?? -Infinity) ? c : b
    );
  }

  // Cota para exibir os números quando ninguém atende ambos: mais profunda
  const cotaExibicao =
    sugerida ||
    r.curva.reduce((b, c) => (c.cotaPonta_m > b.cotaPonta_m ? c : b));

  const usoFuros = {};
  r.memorial.forEach((m) => {
    (m.dq?.furosUsados || []).forEach((f) => {
      usoFuros[f.nome] = (usoFuros[f.nome] || 0) + 1;
    });
  });

  const div = classificarDivergencia(
    cotaExibicao.Qadm_DQ_tf,
    cotaExibicao.Qadm_AV_tf
  );
  const cc = DIV_CLASSES[div.cor] || DIV_CLASSES.slate;

  return (
    <div>
      <Banner tipo="info">
        <strong>Modo 4 — Interpolação por locação.</strong> Cada cota de ponta
        tem Q_adm interpolado a partir dos 3 furos mais próximos (peso linear
        normalizado). Coordenadas da estaca: ({estaca.coordenadas.x},{' '}
        {estaca.coordenadas.y}).
      </Banner>

      <div className="bg-white border border-slate-300 rounded p-3 my-3">
        <div className="text-xs text-slate-500 mb-2 uppercase tracking-wide">
          {resultado.descricaoModo}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-blue-50 rounded p-2">
            <div className="text-xs text-blue-700 uppercase tracking-wide">
              Q_adm DQ (interpolado)
            </div>
            <div className="text-lg font-mono font-bold text-blue-900 mt-1">
              {cotaExibicao.Qadm_DQ_tf?.toFixed(2)}{' '}
              <span className="text-xs">tf</span>
            </div>
            <div className="text-xs text-blue-700 mt-0.5">
              ponta {cotaExibicao.cotaPonta_m} m
            </div>
          </div>
          <div className="bg-green-50 rounded p-2">
            <div className="text-xs text-green-700 uppercase tracking-wide">
              Q_adm AV (interpolado)
            </div>
            <div className="text-lg font-mono font-bold text-green-900 mt-1">
              {cotaExibicao.Qadm_AV_tf?.toFixed(2)}{' '}
              <span className="text-xs">tf</span>
            </div>
            <div className="text-xs text-green-700 mt-0.5">
              ponta {cotaExibicao.cotaPonta_m} m
            </div>
          </div>
          <div className={cc.bg + ' rounded p-2'}>
            <div className={'text-xs ' + cc.text + ' uppercase tracking-wide'}>
              Divergência
            </div>
            <div className={'text-lg font-mono font-bold ' + cc.textBold + ' mt-1'}>
              {div.pct !== null ? (div.pct * 100).toFixed(0) + '%' : '—'}
            </div>
            <div className={'text-xs ' + cc.text + ' mt-0.5'}>{div.label}</div>
          </div>
        </div>
        {cargaPrev != null && cargaPrev > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-200 text-xs">
            {nenhumaAtendeAmbos ? (
              <span className="text-red-700">
                <strong>⛔ Nenhuma cota atende ambos os métodos</strong> para{' '}
                {cargaPrev} tf — DQ e AV não atingem a carga na mesma
                profundidade. Nenhuma cota é sugerida.
              </span>
            ) : (
              <span className="text-slate-600">
                Alvo: <strong>{cargaPrev} tf</strong> → cota sugerida
                (ambos atendem):{' '}
                <strong className="font-mono">
                  {sugerida.cotaPonta_m} m
                </strong>
                <span className="ml-2 text-green-700">
                  ✓ DQ e AV atendem
                </span>
              </span>
            )}
          </div>
        )}
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded p-2 mb-3">
        <div className="text-xs font-bold text-slate-700 mb-1">
          Influência dos furos (% das cotas em que cada furo entrou na
          ponderação):
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(usoFuros)
            .sort((a, b) => b[1] - a[1])
            .map(([nome, n]) => (
              <span
                key={nome}
                className="font-mono bg-white border border-slate-300 px-2 py-0.5 rounded"
              >
                <strong>{nome}</strong>:{' '}
                {((n / r.curva.length) * 100).toFixed(0)}%
              </span>
            ))}
        </div>
      </div>

      <details className="bg-white border border-slate-300 rounded">
        <summary className="px-2 py-2 bg-slate-50 border-b border-slate-300 text-sm font-bold text-slate-700 cursor-pointer hover:bg-slate-100">
          Tabela de pesos por cota — auditoria completa ({r.memorial.length}{' '}
          cotas)
        </summary>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wide">
              <tr>
                <th className="px-1.5 py-1 text-right">Cota ponta (m)</th>
                <th className="px-1.5 py-1 text-left">Método</th>
                <th className="px-1.5 py-1 text-left">
                  Furos usados (peso × valor)
                </th>
                <th className="px-1.5 py-1 text-right">Q_adm DQ (tf)</th>
                <th className="px-1.5 py-1 text-right">Q_adm AV (tf)</th>
              </tr>
            </thead>
            <tbody>
              {r.memorial.map((m, i) => {
                const ehSugerida =
                  sugerida && m.cotaPonta_m === sugerida.cotaPonta_m;
                return (
                  <tr
                    key={i}
                    className={
                      'border-t border-slate-100 ' +
                      (ehSugerida
                        ? 'bg-yellow-100 font-medium'
                        : 'hover:bg-slate-50')
                    }
                  >
                    <td className="px-1.5 py-0.5 font-mono text-right">
                      {m.cotaPonta_m}
                      {ehSugerida && (
                        <span className="ml-0.5 text-yellow-700">★</span>
                      )}
                    </td>
                    <td className="px-1.5 py-0.5 text-[10px] text-slate-600">
                      {m.dq?.metodo}
                    </td>
                    <td className="px-1.5 py-0.5 text-[10px]">
                      {(m.dq?.furosUsados || []).map((f) => (
                        <span
                          key={f.nome}
                          className="inline-block mr-2 font-mono"
                        >
                          {f.nome}: {(f.peso * 100).toFixed(0)}%×
                          {f.valor.toFixed(2)}
                        </span>
                      ))}
                    </td>
                    <td className="px-1.5 py-0.5 font-mono text-right font-bold">
                      {m.dq?.Qadm_interpolado_tf?.toFixed(2) ?? '—'}
                    </td>
                    <td className="px-1.5 py-0.5 font-mono text-right font-bold">
                      {m.av?.Qadm_interpolado_tf?.toFixed(2) ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
