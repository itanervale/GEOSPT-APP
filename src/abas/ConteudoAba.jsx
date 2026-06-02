/* ============================================================================
 * ConteudoAba — roteador entre as 7 abas
 *
 * Lê estado.ui.abaAtiva e renderiza a aba correspondente. Extraído idêntico
 * das linhas 9215-9228 do geospt_app.jsx.
 * ============================================================================ */

import React from 'react';
import { useObra } from '@/state/ObraProvider';
import AbaIdentificacao from './AbaIdentificacao';
import AbaSondagens from './AbaSondagens';
import AbaCompatibilizacao from './AbaCompatibilizacao';
import AbaAnalise from './AbaAnalise';
import AbaEstacas from './AbaEstacas';
import AbaCapacidade from './AbaCapacidade';
import AbaSaidas from './AbaSaidas';
import PlaceholderAba from '@/components/ui/PlaceholderAba';

export default function ConteudoAba() {
  const { estado } = useObra();
  switch (estado.ui.abaAtiva) {
    case 'identificacao':
      return <AbaIdentificacao />;
    case 'sondagens':
      return <AbaSondagens />;
    case 'compatibilizacao':
      return <AbaCompatibilizacao />;
    case 'analise':
      return <AbaAnalise />;
    case 'estacas':
      return <AbaEstacas />;
    case 'capacidade':
      return <AbaCapacidade />;
    case 'saidas':
      return <AbaSaidas />;
    default:
      return (
        <PlaceholderAba
          titulo="?"
          descricao="Aba desconhecida."
          commitFuturo="?"
        />
      );
  }
}
