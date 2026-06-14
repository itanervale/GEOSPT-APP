/* ============================================================================
 * ConteudoPerfilUnico — render dos modos de perfil único
 *   (Modo 1 envoltória + Modo 2 submodos 2.1 / 2.2)
 *
 * Executa calcularDQ e calcularAV via engine sobre o perfilParaCalculo, e
 * monta: CardResumoCalculo + CurvaQxCotaSVG + MemorialCalculo + AvisosModo.
 *
 * No CP-9a, CurvaQxCotaSVG e MemorialCalculo são stubs (chegam no CP-9b).
 *
 * Extraído fielmente das linhas 6332-6379 do geospt_app.jsx. Mudanças:
 *   - window.GeoSPT → GeoSPT
 *   - CurvaQxCotaSVG / MemorialCalculo → stubs temporários (CP-9b)
 * ============================================================================ */

import React, { useMemo } from 'react';
import { GeoSPT } from '@/engine/geospt-engine';
import Banner from '@/components/ui/Banner';
import CardResumoCalculo from './CardResumoCalculo';
import AvisosModo from './AvisosModo';
import { construirOpcoesCalculo } from './calculoHelpers';
import CurvaQxCotaSVG from './CurvaQxCotaSVG';
import MemorialCalculo from './MemorialCalculo';

export default function ConteudoPerfilUnico({ resultado, estaca, params }) {
  const perfil = resultado.perfilParaCalculo;

  // Executar DQ e AV via engine (hooks sempre no topo — antes de qualquer return)
  const calculos = useMemo(() => {
    if (!perfil || perfil.length === 0) return { vazio: true };
    if (!GeoSPT) return { erro: 'Engine indisponível' };
    const opcoes = construirOpcoesCalculo(estaca, params);
    try {
      const dq = GeoSPT.engine.calcularDQ(perfil, opcoes);
      const av = GeoSPT.engine.calcularAV(perfil, opcoes);
      return { dq, av };
    } catch (e) {
      return { erro: e.message };
    }
  }, [perfil, estaca, params]);

  if (!perfil || perfil.length === 0) {
    return (
      <Banner tipo="alerta">
        Perfil de cálculo vazio. Verifique sondagens e parâmetros.
      </Banner>
    );
  }

  if (calculos.erro) {
    return <Banner tipo="erro">Falha no cálculo: {calculos.erro}</Banner>;
  }

  return (
    <div>
      {resultado.divergenciaModo2 && (
        <Banner tipo="alerta">
          <strong>Modo 2.1 bloqueado:</strong> {resultado.divergenciaModo2}
        </Banner>
      )}
      {resultado.cotasBloqueadas && resultado.cotasBloqueadas.length > 0 && (
        <Banner tipo="alerta">
          <strong>
            Submodo 2.1 — {resultado.cotasBloqueadas.length} cota(s) sem NSPT:
          </strong>{' '}
          <span className="font-mono text-xs">
            {resultado.cotasBloqueadas.join(', ')} m
          </span>
          <div className="text-xs mt-1">
            Cotas heterogêneas (famílias distintas entre furos) são bloqueadas
            neste submodo por design metodológico — a engine não escolhe família
            automaticamente. Use o submodo <strong>2.2 (conservador)</strong> ou{' '}
            <strong>2.3 (perfis paralelos)</strong> para tratar essas cotas.
          </div>
        </Banner>
      )}
      <CardResumoCalculo
        dq={calculos.dq}
        av={calculos.av}
        estaca={estaca}
        descricaoModo={resultado.descricaoModo}
        params={params}
      />
      <CurvaQxCotaSVG dq={calculos.dq} av={calculos.av} estaca={estaca} />
      <MemorialCalculo dq={calculos.dq} av={calculos.av} estaca={estaca} />
      <AvisosModo avisos={resultado.avisos} />
    </div>
  );
}
