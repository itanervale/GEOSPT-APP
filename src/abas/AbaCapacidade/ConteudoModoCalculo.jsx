/* ============================================================================
 * ConteudoModoCalculo — roteador por modo de cálculo
 *
 * Prepara o perfil (useMemo) e delega ao componente do modo:
 *   - por_furo        → ConteudoModoPorFuro       (CP-9c — stub no 9a)
 *   - interpolacao    → ConteudoModoInterpolacao  (CP-9c — stub no 9a)
 *   - perfil_medio 2.3 → ConteudoModoPerfisParalelos (CP-9c — stub no 9a)
 *   - envoltoria, perfil_medio 2.1/2.2 → ConteudoPerfilUnico (ATIVO no 9a)
 *
 * Extraído fielmente das linhas 6303-6327 do geospt_app.jsx.
 * ============================================================================ */

import React, { useMemo } from 'react';
import Banner from '@/components/ui/Banner';
import { prepararPerfilCalculo } from './prepararPerfilCalculo';
import ConteudoPerfilUnico from './ConteudoPerfilUnico';
import ConteudoModoPorFuro from './ConteudoModoPorFuro';
import ConteudoModoInterpolacao from './ConteudoModoInterpolacao';
import ConteudoModoPerfisParalelos from './ConteudoModoPerfisParalelos';
import { resolverFurosParaCalculo } from '@/state/dominiosHelper';
import BadgeFiltroDominio from './BadgeFiltroDominio';

export default function ConteudoModoCalculo({
  modo,
  submodo,
  sondagens,
  estaca,
  params,
  obra,
}) {
  // CP-12c — resolve furos do domínio da estaca (ou todos, se sem domínio).
  const filtro = useMemo(
    () =>
      obra && estaca
        ? resolverFurosParaCalculo(estaca, obra)
        : { sondagens, dominio: null, temFiltro: false, modo4Disponivel: true },
    [estaca, obra, sondagens]
  );

  const resultado = useMemo(() => {
    return prepararPerfilCalculo({
      modo,
      submodo,
      sondagens: filtro.sondagens,
      estaca,
      params,
      filtroDominio: filtro,
    });
  }, [modo, submodo, filtro, estaca, params]);

  if (resultado.erro) {
    return (
      <>
        <BadgeFiltroDominio filtro={filtro} />
        <Banner tipo="erro">Erro: {resultado.erro}</Banner>
      </>
    );
  }

  let conteudo;
  if (modo === 'por_furo') {
    conteudo = (
      <ConteudoModoPorFuro resultado={resultado} estaca={estaca} params={params} />
    );
  } else if (modo === 'interpolacao') {
    conteudo = (
      <ConteudoModoInterpolacao
        resultado={resultado}
        estaca={estaca}
        params={params}
      />
    );
  } else if (modo === 'perfil_medio' && submodo === '2.3_dois_paralelos') {
    conteudo = (
      <ConteudoModoPerfisParalelos
        resultado={resultado}
        estaca={estaca}
        params={params}
      />
    );
  } else {
    // Modo 1 (envoltória) e Modo 2 submodos 2.1/2.2: perfil único
    conteudo = (
      <ConteudoPerfilUnico resultado={resultado} estaca={estaca} params={params} />
    );
  }

  return (
    <>
      <BadgeFiltroDominio filtro={filtro} />
      {conteudo}
    </>
  );
}
