/* ============================================================================
 * ConteudoModoPerfisParalelos — Submodo 2.3 (perfis paralelos por família)
 *
 * Calcula até 3 ramos (Coesivo, Intermediário, Granular) independentemente e
 * exibe cards lado a lado. O engenheiro escolhe qual aplicar como projeto.
 *
 * Extraído fielmente das linhas 7177-7230 do geospt_app.jsx. Mudanças:
 *   - window.GeoSPT → GeoSPT (import)
 *   - cores por ramo via mapa estático (JIT não detecta border-${cor}-500)
 *   - imports locais
 * ============================================================================ */

import React from 'react';
import { GeoSPT } from '@/engine/geospt-engine';
import Banner from '@/components/ui/Banner';
import CardResumoCalculo from './CardResumoCalculo';
import MemorialCalculo from './MemorialCalculo';
import AvisosModo from './AvisosModo';
import { construirOpcoesCalculo } from './calculoHelpers';

// Mapa estático de classes por ramo (JIT precisa de literais, não template strings)
const RAMO_CLASSES = {
  Coesivo: { borda: 'border-blue-500', bg: 'bg-blue-50', titulo: 'text-blue-900' },
  Intermediário: {
    borda: 'border-purple-500',
    bg: 'bg-purple-50',
    titulo: 'text-purple-900',
  },
  Granular: {
    borda: 'border-amber-500',
    bg: 'bg-amber-50',
    titulo: 'text-amber-900',
  },
};

export default function ConteudoModoPerfisParalelos({
  resultado,
  estaca,
  params,
}) {
  const ramos = resultado.ramos;
  const opcoes = construirOpcoesCalculo(estaca, params);
  const engine = GeoSPT?.engine;

  const calcularRamo = (perfil) => {
    if (!perfil || perfil.length === 0) return null;
    try {
      return {
        dq: engine.calcularDQ(perfil, opcoes),
        av: engine.calcularAV(perfil, opcoes),
      };
    } catch (e) {
      return { erro: e.message };
    }
  };

  const ramosCalculados = [
    { nome: 'Coesivo', perfil: ramos.coesivo, calc: calcularRamo(ramos.coesivo) },
    {
      nome: 'Intermediário',
      perfil: ramos.intermediario,
      calc: calcularRamo(ramos.intermediario),
    },
    {
      nome: 'Granular',
      perfil: ramos.granular,
      calc: calcularRamo(ramos.granular),
    },
  ].filter((r) => r.perfil && r.perfil.length > 0);

  if (ramosCalculados.length === 0) {
    return (
      <Banner tipo="alerta">
        Nenhum ramo de família tem perfil válido neste cenário.
      </Banner>
    );
  }

  return (
    <div>
      <Banner tipo="info">
        Submodo 2.3 —{' '}
        <strong>{ramosCalculados.length} ramos paralelos</strong> calculados
        independentemente. O engenheiro escolhe qual aplicar como projeto final.
      </Banner>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 mt-3">
        {ramosCalculados.map((r) => {
          const cls = RAMO_CLASSES[r.nome] || RAMO_CLASSES.Coesivo;
          return (
            <div
              key={r.nome}
              className={'border-l-4 ' + cls.borda + ' ' + cls.bg + ' rounded p-2'}
            >
              <h3 className={'font-bold ' + cls.titulo + ' mb-2'}>
                Ramo {r.nome}
              </h3>
              {r.calc?.erro ? (
                <div className="text-xs text-red-700">Erro: {r.calc.erro}</div>
              ) : (
                <>
                  <CardResumoCalculo
                    dq={r.calc.dq}
                    av={r.calc.av}
                    estaca={estaca}
                    descricaoModo={'Perfil ' + r.nome}
                    compacto
                  />
                  <details className="mt-2">
                    <summary className="text-xs text-slate-600 cursor-pointer hover:text-slate-900">
                      Memorial detalhado
                    </summary>
                    <MemorialCalculo
                      dq={r.calc.dq}
                      av={r.calc.av}
                      estaca={estaca}
                      compacto
                    />
                  </details>
                </>
              )}
            </div>
          );
        })}
      </div>
      <AvisosModo avisos={resultado.avisos} />
    </div>
  );
}
