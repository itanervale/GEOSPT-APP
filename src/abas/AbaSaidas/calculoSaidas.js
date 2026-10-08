/* ============================================================================
 * calculoSaidas — cálculo dos modos de UMA estaca para o XLSX e os PDFs
 *
 * Usa a mesma abstração da Aba 6 (prepararPerfilCalculo) e o mesmo filtro por
 * domínio (resolverFurosParaCalculo), para que os memoriais exportados batam
 * com o que o usuário vê no app:
 *   - janela de compatibilização = parametros.janelaCompatibilizacao_m;
 *   - furos do domínio da estaca (todos, se a estaca não tem domínio);
 *   - cota de arrasamento decimal → Math.floor também no por furo/interpolação;
 *   - Modo 4 bloqueado em domínio com menos de 3 furos.
 * Antes, XLSX e PDFs recalculavam por conta própria com a janela padrão (0,5 m),
 * todos os furos e o arrasamento decimal.
 *
 * Formato de saída (o que os geradores já consumiam):
 *   { filtro,
 *     modo1:   { memDq, memAv, erro },
 *     modo2_1: { memDq, memAv, erro, bloqueado, motivo },
 *     modo2_2: { memDq, memAv, erro, bloqueado, motivo },
 *     modo2_3: { ramos: { Coesivo|Granular|Intermediário: { perfilRamo, memDq, memAv } }, erro, avisos },
 *     modo3:   resultado de calcularPorFuroIndividual ({ resultados, ... }) ou { resultados: [], erro },
 *     modo4:   { memorial, metadata, erro } }
 * ============================================================================ */

import { GeoSPT } from '@/engine/geospt-engine';
import { prepararPerfilCalculo } from '@/abas/AbaCapacidade/prepararPerfilCalculo';
import { construirOpcoesCalculo } from '@/abas/AbaCapacidade/calculoHelpers';
import { resolverFurosParaCalculo } from '@/state/dominiosHelper';

const RAMOS_2_3 = [
  ['Coesivo', 'coesivo'],
  ['Granular', 'granular'],
  ['Intermediário', 'intermediario'],
];

export function calcularModosSaida(estaca, obra, params, opcoes) {
  const incluir23 = !!(opcoes && opcoes.incluir23);
  const engine = GeoSPT?.engine;
  const filtro = resolverFurosParaCalculo(estaca, obra);
  const out = {
    filtro,
    modo1: { memDq: [], memAv: [], erro: null },
    modo2_1: { memDq: [], memAv: [], erro: null, bloqueado: false },
    modo2_2: { memDq: [], memAv: [], erro: null, bloqueado: false },
    modo2_3: { ramos: null, erro: null, avisos: [] },
    modo3: { resultados: [], erro: null },
    modo4: { memorial: [], metadata: null, erro: null },
  };
  if (!engine) {
    out.modo1.erro = 'Engine GeoSPT indisponível';
    return out;
  }
  const opc = construirOpcoesCalculo(estaca, params);
  const preparar = (modo, submodo) =>
    prepararPerfilCalculo({
      modo,
      submodo,
      sondagens: filtro.sondagens,
      estaca,
      params,
      filtroDominio: filtro,
    });
  const calcularPerfil = (destino, r) => {
    if (r.erro || !r.perfilParaCalculo) {
      destino.erro = r.erro || 'sem perfil';
      return;
    }
    try {
      destino.memDq = engine.calcularDQ(r.perfilParaCalculo, opc).memorial || [];
      destino.memAv = engine.calcularAV(r.perfilParaCalculo, opc).memorial || [];
    } catch (e) {
      destino.erro = e.message;
    }
  };

  calcularPerfil(out.modo1, preparar('envoltoria', null));
  calcularPerfil(out.modo2_1, preparar('perfil_medio', '2.1_predominante'));
  calcularPerfil(out.modo2_2, preparar('perfil_medio', '2.2_conservador'));

  if (incluir23) {
    const r23 = preparar('perfil_medio', '2.3_dois_paralelos');
    if (r23.erro || !r23.ramos) {
      out.modo2_3.erro = r23.erro || 'sem ramos';
    } else {
      out.modo2_3.ramos = {};
      RAMOS_2_3.forEach(([familia, chave]) => {
        const perfilRamo = r23.ramos[chave] || [];
        if (perfilRamo.length === 0) return;
        try {
          out.modo2_3.ramos[familia] = {
            perfilRamo,
            memDq: engine.calcularDQ(perfilRamo, opc).memorial || [],
            memAv: engine.calcularAV(perfilRamo, opc).memorial || [],
          };
        } catch (e) {
          out.modo2_3.ramos[familia] = { erro: e.message };
        }
      });
      out.modo2_3.avisos = r23.avisos || [];
    }
  }

  const r3 = preparar('por_furo', null);
  out.modo3 = r3.erro || !r3.porFuro ? { resultados: [], erro: r3.erro || 'sem resultados' } : r3.porFuro;

  const r4 = preparar('interpolacao', null);
  if (r4.erro || !r4.interpolacao) {
    out.modo4.erro = r4.erro || 'sem resultado';
  } else {
    out.modo4.memorial = r4.interpolacao.memorial || [];
    out.modo4.metadata = r4.interpolacao.metadata || null;
  }
  return out;
}

/** Texto curto dos furos usados no cálculo (para os cabeçalhos dos relatórios). */
export function descreverFiltro(filtro) {
  if (!filtro) return '—';
  const nomes = Object.keys(filtro.sondagens || {});
  if (!filtro.temFiltro) return 'todos os furos da obra (' + nomes.length + ')';
  return (
    'domínio "' + (filtro.dominio?.nome || '?') + '": ' + (nomes.length ? nomes.join(', ') : 'nenhum furo')
  );
}
