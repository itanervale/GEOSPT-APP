/* ============================================================================
 * CorteEsquematicoSVG — desenho do corte em React (CP-13d)
 * SPEC commit 8, §4. Consome a geometria pura (geometriaCorte) e o casamento
 * (casamentoCamadas). Reativo aos 6 toggles.
 *
 * 3 PROTEÇÕES contra falsa continuidade (decisão do usuário — máxima):
 *   (a) disclaimer DENTRO do SVG (vai junto na exportação, não só no rodapé)
 *   (b) conexões inferidas mais FRACAS que as colunas de dado (cor clara,
 *       tracejado, opacidade) — distingue "medido" de "interpretado"
 *   (c) aviso visual em conexões entre furos muito distantes (> limiar)
 *
 * REGRA CENTRAL: casamento por FAMÍLIA apenas; NSPT é informativo (números ao
 * lado da coluna), nunca governa conexão.
 * ============================================================================ */

import React, { useMemo } from 'react';
import {
  construirGeometria,
  ticksEixoY,
  corFamilia,
  distancia2D,
} from './geometriaCorte';
import { processarSequenciaFuros } from './casamentoCamadas';

// Limiar de distância para o aviso de furos distantes (proteção c)
const LIMIAR_DISTANCIA_M = 25;

const COR_ESTACA_CONTORNO = '#475569';
const COR_ESTACA_FILL = '#E2E8F0';
const COR_NA = '#06B6D4';

export default function CorteEsquematicoSVG({ itens, toggles }) {
  const {
    mostrarNspt = true,
    ligarCamadas = false,
    ligarHachuras = false,
    preservarMergulho = true,
    mostrarMediaTopos = true,
    perfilInterpretado = false,
    mostrarTerreno = true,
    mostrarNA = true,
    mostrarSemSPT = true,
  } = toggles || {};

  const dados = useMemo(() => {
    // Separa furos (para casamento) e mantém a ordem da sequência
    const furos = itens.filter((it) => it.tipo === 'furo');
    const proc = processarSequenciaFuros(furos);

    // Mapa nome→blocos para enriquecer os itens-furo
    const blocosPorNome = {};
    proc.blocosPorFuro.forEach((f) => {
      blocosPorNome[f.nome] = f.blocos;
    });

    // Itens resolvidos (furos com blocos; estacas como estão)
    const itensResolvidos = itens.map((it) =>
      it.tipo === 'furo'
        ? { ...it, blocos: blocosPorNome[it.nome] || [] }
        : it
    );

    const layout = { W: 900, H: 600, padL: 64, padR: 220, padT: 54, padB: 96, colW: 150 };
    const geo = construirGeometria(itensResolvidos, layout);

    // Média dos topos das sondagens (linha tracejada)
    const topos = furos.map((f) => f.cotaTopo_m).filter((c) => c != null);
    const mediaTopos =
      topos.length > 0 ? topos.reduce((a, b) => a + b, 0) / topos.length : null;

    return { itensResolvidos, geo, proc, blocosPorNome, mediaTopos, furos };
  }, [itens]);

  const { itensResolvidos, geo, proc, mediaTopos, furos } = dados;

  if (!itensResolvidos.length || !isFinite(geo.escalaY)) {
    return (
      <div className="text-sm text-slate-400 p-4 text-center">
        Sem dados suficientes para desenhar o corte.
      </div>
    );
  }

  const ticks = ticksEixoY(geo, 1);
  const W = geo.Wfinal;
  const H = 600;

  // índice de cada furo na sequência (para desenhar conexões entre furos adjacentes)
  const indicePorNome = {};
  itensResolvidos.forEach((it, i) => {
    indicePorNome[it.nome] = i;
  });

  // ---- Construção dos elementos ----
  const elementos = [];

  // (1) Eixo Y: grade + ticks de cota
  ticks.forEach((t) => {
    elementos.push(
      <g key={'tick-' + t.cota}>
        <line
          x1={geo.padL}
          y1={t.y}
          x2={W - geo.padR}
          y2={t.y}
          stroke="#F1F5F9"
          strokeWidth="1"
        />
        <text x={geo.padL - 6} y={t.y + 3} textAnchor="end" fontSize="9" fill="#94A3B8">
          {t.cota}
        </text>
      </g>
    );
  });
  // rótulo do eixo Y
  elementos.push(
    <text
      key="ylabel"
      x={14}
      y={geo.plotTop + geo.plotH / 2}
      textAnchor="middle"
      fontSize="11"
      fill="#475569"
      fontWeight="bold"
      transform={`rotate(-90, 14, ${geo.plotTop + geo.plotH / 2})`}
    >
      Cota absoluta (m)
    </text>
  );

  // (2) Linha de média dos topos (toggle)
  if (mostrarMediaTopos && mediaTopos != null) {
    const yMed = geo.yDe(mediaTopos);
    elementos.push(
      <g key="media-topos">
        <line
          x1={geo.padL}
          y1={yMed}
          x2={W - geo.padR}
          y2={yMed}
          stroke="#64748B"
          strokeWidth="1"
          strokeDasharray="6 3"
        />
        <text x={W - geo.padR - 2} y={yMed - 3} textAnchor="end" fontSize="9" fill="#64748B">
          média topos {mediaTopos.toFixed(2)} m
        </text>
      </g>
    );
  }

  // Largura das colunas (estreita no modo perfil interpretado). Definida AQUI
  // (antes das conexões) porque tanto o "ligar camadas" quanto o "perfil"
  // precisam dela para sair da borda da coluna — assim as linhas tracejadas
  // coincidem com as bordas dos preenchimentos quando ambos os modos estão ON.
  const larguraCol = geo.colW * (perfilInterpretado ? 0.18 : 0.42);

  // (3) CONEXÕES entre furos adjacentes (proteção b: mais fracas que os dados)
  // Desenhadas ANTES das colunas para ficarem atrás.
  if (ligarCamadas || ligarHachuras) {
    proc.paresAdjacentes.forEach((par, k) => {
      const iA = indicePorNome[par.aNome];
      const iB = indicePorNome[par.bNome];
      if (iA == null || iB == null) return;
      const xA = geo.xColuna(iA);
      const xB = geo.xColuna(iB);

      // proteção (c): distância entre os furos
      const fA = furos.find((f) => f.nome === par.aNome);
      const fB = furos.find((f) => f.nome === par.bNome);
      const dist = distancia2D(fA, fB);
      const distante = dist != null && dist > LIMIAR_DISTANCIA_M;

      par.conexoes.forEach((con, ci) => {
        // mergulho real (on) → liga cotas reais; off → liga cotas médias (horizontais)
        const yTopoA = geo.yDe(preservarMergulho ? con.topoA : (con.topoA + con.topoB) / 2);
        const yTopoB = geo.yDe(preservarMergulho ? con.topoB : (con.topoA + con.topoB) / 2);
        const yBaseA = geo.yDe(preservarMergulho ? con.baseA : (con.baseA + con.baseB) / 2);
        const yBaseB = geo.yDe(preservarMergulho ? con.baseB : (con.baseA + con.baseB) / 2);

        // largura de meia-coluna — MESMA borda que o perfil interpretado usa,
        // para que as linhas tracejadas coincidam com as faixas preenchidas.
        const meia = larguraCol / 2;
        const xAr = xA + meia;
        const xBl = xB - meia;

        // (b) hachura: pattern DIAGONAL real (mesmo das colunas) entre as bordas,
        // para o trecho interpolado ler como um corte geológico hachurado.
        if (ligarHachuras && con.tipo === 'gradiente') {
          elementos.push(
            <polygon
              key={`hach-${k}-${ci}`}
              points={`${xAr},${yTopoA} ${xBl},${yTopoB} ${xBl},${yBaseB} ${xAr},${yBaseA}`}
              fill={`url(#hatch-${con.familia})`}
              fillOpacity="0.55"
              stroke="none"
            />
          );
        }
        // brusca: marca de interrupção no ponto médio (não preenche)
        if (ligarHachuras && con.tipo === 'brusca') {
          const xm = (xAr + xBl) / 2;
          const ym = (yTopoA + yTopoB) / 2;
          elementos.push(
            <text key={`brusca-${k}-${ci}`} x={xm} y={ym} textAnchor="middle" fontSize="14" fill="#DC2626">
              ⚡
            </text>
          );
        }

        // (b) linhas: tracejadas e finas (mais fracas que as colunas de dado)
        if (ligarCamadas) {
          const corLinha = distante ? '#DC2626' : corFamilia(con.familia);
          elementos.push(
            <g key={`lig-${k}-${ci}`}>
              <line
                x1={xAr}
                y1={yTopoA}
                x2={xBl}
                y2={yTopoB}
                stroke={corLinha}
                strokeWidth="1"
                strokeDasharray="3 2"
                opacity="0.6"
              />
              <line
                x1={xAr}
                y1={yBaseA}
                x2={xBl}
                y2={yBaseB}
                stroke={corLinha}
                strokeWidth="1"
                strokeDasharray="3 2"
                opacity="0.6"
              />
            </g>
          );
        }
      });

      // (b2) CUNHAS em forma de LINHA — espelha as cunhas preenchidas do perfil
      // interpretado, para que "ligar camadas" conte a MESMA história (camadas
      // que acunham aparecem como duas linhas convergindo até a ponta, em vez de
      // sumirem). Mesma geometria (frac, cotaAlvo) que o perfil usa.
      if (ligarCamadas) {
        const meia = larguraCol / 2;
        const xAr = xA + meia;
        const xBl = xB - meia;
        const linhaCunha = (x1, y1, x2, y2, fam, idKey) => (
          <g key={idKey}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={corFamilia(fam)} strokeWidth="1" strokeDasharray="3 2" opacity="0.6" />
          </g>
        );
        (par.cunhasA || []).forEach((cunha, si) => {
          const b = cunha.bloco;
          const yTopo = geo.yDe(b.cotaTopo_m);
          const yBase = geo.yDe(b.cotaBase_m);
          const frac = cunha.frac != null ? cunha.frac : (cunha.tipoCunha === 'borda' ? 1.0 : 0.5);
          const xPonta = xAr + (xBl - xAr) * frac;
          const yPonta = geo.yDe(cunha.cotaAlvo);
          elementos.push(linhaCunha(xAr, yTopo, xPonta, yPonta, b.familia, `ligcunhaAt-${k}-${si}`));
          elementos.push(linhaCunha(xAr, yBase, xPonta, yPonta, b.familia, `ligcunhaAb-${k}-${si}`));
        });
        (par.cunhasB || []).forEach((cunha, si) => {
          const b = cunha.bloco;
          const yTopo = geo.yDe(b.cotaTopo_m);
          const yBase = geo.yDe(b.cotaBase_m);
          const frac = cunha.frac != null ? cunha.frac : (cunha.tipoCunha === 'borda' ? 1.0 : 0.5);
          const xPonta = xBl - (xBl - xAr) * frac;
          const yPonta = geo.yDe(cunha.cotaAlvo);
          elementos.push(linhaCunha(xBl, yTopo, xPonta, yPonta, b.familia, `ligcunhaBt-${k}-${si}`));
          elementos.push(linhaCunha(xBl, yBase, xPonta, yPonta, b.familia, `ligcunhaBb-${k}-${si}`));
        });
      }

      // (b3) CUNHAS hachuradas — espelha as cunhas do perfil interpretado, mas
      // preenchidas com o pattern diagonal, para que o acunhamento NÃO fique
      // como buraco branco no modo hachura. Mesma geometria (frac, cotaAlvo).
      if (ligarHachuras) {
        const meia = larguraCol / 2;
        const xAr = xA + meia;
        const xBl = xB - meia;
        (par.cunhasA || []).forEach((cunha, si) => {
          const b = cunha.bloco;
          const frac = cunha.frac != null ? cunha.frac : 1.0;
          const xPonta = xAr + (xBl - xAr) * frac;
          elementos.push(
            <polygon
              key={`hachcunhaA-${k}-${si}`}
              points={`${xAr},${geo.yDe(b.cotaTopo_m)} ${xAr},${geo.yDe(b.cotaBase_m)} ${xPonta},${geo.yDe(cunha.cotaAlvo)}`}
              fill={`url(#hatch-${b.familia})`}
              fillOpacity="0.55"
              stroke="none"
            />
          );
        });
        (par.cunhasB || []).forEach((cunha, si) => {
          const b = cunha.bloco;
          const frac = cunha.frac != null ? cunha.frac : 1.0;
          const xPonta = xBl - (xBl - xAr) * frac;
          elementos.push(
            <polygon
              key={`hachcunhaB-${k}-${si}`}
              points={`${xBl},${geo.yDe(b.cotaTopo_m)} ${xBl},${geo.yDe(b.cotaBase_m)} ${xPonta},${geo.yDe(cunha.cotaAlvo)}`}
              fill={`url(#hatch-${b.familia})`}
              fillOpacity="0.55"
              stroke="none"
            />
          );
        });
      }

      // (c) aviso de distância no meio do par
      if (distante && (ligarCamadas || ligarHachuras)) {
        const xm = (xA + xB) / 2;
        elementos.push(
          <text key={`dist-${k}`} x={xm} y={geo.plotTop + 12} textAnchor="middle" fontSize="8" fill="#DC2626">
            ⚠ {dist.toFixed(0)}m entre furos
          </text>
        );
      }
    });
  }

  // (3b) PERFIL INTERPRETADO (CP-13f) — polígonos preenchidos entre furos.
  // Toggle default OFF. Liga os blocos casados (topo↔topo, base↔base) formando
  // faixas de família que atravessam o vão, como num corte geológico. Cor da
  // família em opacidade BAIXA (~0.30) — "isto é interpolação, não medição".
  // O casamento por ordem (Parte 1) garante que NÃO há cruzamento. Blocos sem
  // par (semParA/semParB) recebem símbolo de alerta de interrupção.
  if (perfilInterpretado) {
    proc.paresAdjacentes.forEach((par, k) => {
      const iA = indicePorNome[par.aNome];
      const iB = indicePorNome[par.bNome];
      if (iA == null || iB == null) return;
      const xA = geo.xColuna(iA);
      const xB = geo.xColuna(iB);
      // O polígono vai da borda direita da coluna A à borda esquerda da B
      const xAr = xA + larguraCol / 2;
      const xBl = xB - larguraCol / 2;

      par.conexoes.forEach((con, ci) => {
        const yTopoA = geo.yDe(con.topoA);
        const yTopoB = geo.yDe(con.topoB);
        const yBaseA = geo.yDe(con.baseA);
        const yBaseB = geo.yDe(con.baseB);
        // Polígono trapezoidal: topoA → topoB → baseB → baseA
        elementos.push(
          <polygon
            key={`perfil-${k}-${ci}`}
            points={`${xAr},${yTopoA} ${xBl},${yTopoB} ${xBl},${yBaseB} ${xAr},${yBaseA}`}
            fill={corFamilia(con.familia)}
            fillOpacity="0.30"
            stroke={corFamilia(con.familia)}
            strokeOpacity="0.25"
            strokeWidth="0.5"
          />
        );
        // Transição brusca (Granular↔Coesivo): linha de fronteira nítida no meio
        if (con.tipo === 'brusca') {
          const xm = (xAr + xBl) / 2;
          const ym = (yTopoA + yTopoB) / 2;
          elementos.push(
            <text key={`perfbrusca-${k}-${ci}`} x={xm} y={ym} textAnchor="middle" fontSize="10" fill="#DC2626">
              ⚡
            </text>
          );
        }
      });

      // CP-13f.1 — CUNHAS de borda: blocos sem-par afinam (acunham) até o furo
      // vizinho. Borda (topo/base do furo) → vão 100%; meio → 50%. A ponta
      // (espessura 0) aponta para a cota da família correspondente no vizinho.
      // Triângulo: [topo na borda, base na borda, ponta no vão].
      (par.cunhasA || []).forEach((cunha, si) => {
        const b = cunha.bloco;
        const yTopo = geo.yDe(b.cotaTopo_m);
        const yBase = geo.yDe(b.cotaBase_m);
        const frac = cunha.frac != null ? cunha.frac : (cunha.tipoCunha === 'borda' ? 1.0 : 0.5);
        const xPonta = xAr + (xBl - xAr) * frac;
        const yPonta = geo.yDe(cunha.cotaAlvo);
        elementos.push(
          <polygon
            key={`cunhaA-${k}-${si}`}
            points={`${xAr},${yTopo} ${xAr},${yBase} ${xPonta},${yPonta}`}
            fill={corFamilia(b.familia)}
            fillOpacity="0.30"
            stroke={corFamilia(b.familia)}
            strokeOpacity="0.25"
            strokeWidth="0.5"
          />
        );
      });
      (par.cunhasB || []).forEach((cunha, si) => {
        const b = cunha.bloco;
        const yTopo = geo.yDe(b.cotaTopo_m);
        const yBase = geo.yDe(b.cotaBase_m);
        const frac = cunha.frac != null ? cunha.frac : (cunha.tipoCunha === 'borda' ? 1.0 : 0.5);
        const xPonta = xBl - (xBl - xAr) * frac;
        const yPonta = geo.yDe(cunha.cotaAlvo);
        elementos.push(
          <polygon
            key={`cunhaB-${k}-${si}`}
            points={`${xBl},${yTopo} ${xBl},${yBase} ${xPonta},${yPonta}`}
            fill={corFamilia(b.familia)}
            fillOpacity="0.30"
            stroke={corFamilia(b.familia)}
            strokeOpacity="0.25"
            strokeWidth="0.5"
          />
        );
      });
    });
  }

  // CP-13f.1 — TRIÂNGULOS DE LENTE: lentes solitárias (inclusões locais) são
  // desenhadas como triângulo afinando até 50% do vão, em ambas as direções
  // (some no meio do caminho). Cor da família da lente, mais marcada que o
  // preenchimento (é um dado pontual, não interpolação difusa).
  // Preenchidas no perfil interpretado; em LINHA no "ligar camadas" (consistência).
  if (perfilInterpretado || ligarCamadas) {
    proc.blocosPorFuro.forEach((furo, fi) => {
      const xF = geo.xColuna(indicePorNome[furo.nome]);
      (furo.lentes || []).forEach((lente, li) => {
        const yTopo = geo.yDe(lente.cotaTopo_m);
        const yBase = geo.yDe(lente.cotaBase_m);
        const yMeio = geo.yDe((lente.cotaTopo_m + lente.cotaBase_m) / 2);
        const larguraMeia = larguraCol / 2;
        // Triângulo para a direita (se houver furo à direita)
        const temDir = indicePorNome[furo.nome] < itensResolvidos.length - 1;
        const temEsq = indicePorNome[furo.nome] > 0;
        const alcance = geo.colW * 0.5; // 50% do vão
        const cor = corFamilia(lente.familia);
        const desenhaLado = (sinal, sufixo) => {
          const xBorda = xF + sinal * larguraMeia;
          const xPonta = xF + sinal * (larguraMeia + alcance);
          if (perfilInterpretado) {
            elementos.push(
              <polygon
                key={`lente${sufixo}-${fi}-${li}`}
                points={`${xBorda},${yTopo} ${xBorda},${yBase} ${xPonta},${yMeio}`}
                fill={cor}
                fillOpacity="0.45"
                stroke={cor}
                strokeOpacity="0.4"
                strokeWidth="0.5"
              />
            );
          }
          if (ligarCamadas) {
            elementos.push(
              <g key={`ligLente${sufixo}-${fi}-${li}`}>
                <line x1={xBorda} y1={yTopo} x2={xPonta} y2={yMeio} stroke={cor} strokeWidth="1" strokeDasharray="3 2" opacity="0.6" />
                <line x1={xBorda} y1={yBase} x2={xPonta} y2={yMeio} stroke={cor} strokeWidth="1" strokeDasharray="3 2" opacity="0.6" />
              </g>
            );
          }
        };
        if (temDir) desenhaLado(+1, 'R');
        if (temEsq) desenhaLado(-1, 'L');
      });
    });
  }

  // (4) COLUNAS: sondagens e estacas (dados — desenhadas por cima das conexões)
  // No modo perfil interpretado, as colunas ficam ESTREITAS (~18%, como nas
  // referências geológicas) para dar lugar ao preenchimento entre furos; o furo
  // vira quase uma linha com os NSPTs. Fora desse modo, largura normal (~42%).
  itensResolvidos.forEach((it, i) => {
    const x = geo.xColuna(i);

    if (it.tipo === 'furo') {
      // nome + topo
      elementos.push(
        <text key={`fnome-${i}`} x={x} y={geo.plotTop - 24} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#0F172A">
          {it.nome}
        </text>
      );
      // tick de cota de topo
      if (it.cotaTopo_m != null) {
        const yt = geo.yDe(it.cotaTopo_m);
        elementos.push(
          <text key={`ftopo-${i}`} x={x} y={geo.plotTop - 10} textAnchor="middle" fontSize="8" fill="#64748B">
            topo {it.cotaTopo_m.toFixed(2)}
          </text>
        );
        elementos.push(
          <line key={`ftick-${i}`} x1={x - larguraCol / 2} y1={yt} x2={x + larguraCol / 2} y2={yt} stroke="#0F172A" strokeWidth="1.5" />
        );
      }
      // blocos de família (dados — cor cheia + hachura sutil)
      it.blocos.forEach((b, bi) => {
        const yTopo = geo.yDe(b.cotaTopo_m);
        const yBase = geo.yDe(b.cotaBase_m);
        const altura = Math.max(yBase - yTopo, 1);
        elementos.push(
          <g key={`bloco-${i}-${bi}`}>
            <rect
              x={x - larguraCol / 2}
              y={yTopo}
              width={larguraCol}
              height={altura}
              fill={corFamilia(b.familia)}
              fillOpacity="0.55"
              stroke={corFamilia(b.familia)}
              strokeWidth="1"
            />
            {/* hachura sutil */}
            <rect
              x={x - larguraCol / 2}
              y={yTopo}
              width={larguraCol}
              height={altura}
              fill={`url(#hatch-${b.familia})`}
              opacity="0.25"
            />
            {/* nome do solo dentro do bloco (se couber em altura) */}
            {altura > 16 && b.solo && (
              <text
                x={x}
                y={yTopo + altura / 2 + 3}
                textAnchor="middle"
                fontSize="8"
                fill="#1E293B"
                style={{ pointerEvents: 'none' }}
              >
                {b.solo}
              </text>
            )}
            {/* cota da base à esquerda */}
            <text x={x - larguraCol / 2 - 3} y={yBase + 3} textAnchor="end" fontSize="7" fill="#94A3B8">
              {b.cotaBase_m.toFixed(1)}
            </text>
            {/* ★ impenetrável */}
            {b.temImpenetravel && (
              <text x={x} y={yBase - 2} textAnchor="middle" fontSize="11" fill="#B45309" fontWeight="bold">
                ★
              </text>
            )}
          </g>
        );
        // NSPT à direita (toggle) — informativo, não governa nada
        if (mostrarNspt) {
          b.leituras.forEach((l) => {
            const p = l.profundidade_m != null ? l.profundidade_m : l.prof;
            const nspt = l.nspt_calculo != null ? l.nspt_calculo : (l.nspt_real != null ? l.nspt_real : l.nspt);
            const yL = geo.yDe(it.cotaTopo_m - p + 0.5); // meio da leitura
            elementos.push(
              <text key={`nspt-${i}-${p}`} x={x + larguraCol / 2 + 3} y={yL + 2} textAnchor="start" fontSize="7" fill="#475569">
                {nspt}
              </text>
            );
          });
        }
      });
    } else {
      // ESTACA: pilar cinza com hachura diagonal
      const wEstaca = Math.max((it.diametro_m || 0.3) * 80, 10);
      const yTopo = geo.yDe(it.cotaArrasamento_m);
      // CP-13d.2 — ponta pela cota sugerida do MODO 1 (resolvida no modal).
      // Sem solução (temSolucao false) → desenha até o fundo do plot + marca.
      const temSolucao = it.temSolucao === true && it.cotaPonta_m != null;
      const cotaPonta = temSolucao ? it.cotaPonta_m : geo.cotaMin;
      const yPonta = geo.yDe(cotaPonta);
      const altura = Math.max(yPonta - yTopo, 4);

      elementos.push(
        <text key={`enome-${i}`} x={x} y={geo.plotTop - 24} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#0F172A">
          {it.nome}
        </text>
      );
      elementos.push(
        <text key={`earr-${i}`} x={x} y={geo.plotTop - 10} textAnchor="middle" fontSize="8" fill="#64748B">
          arras. {it.cotaArrasamento_m != null ? it.cotaArrasamento_m.toFixed(2) : '?'}
        </text>
      );
      // pilar — cor por categoria de estado:
      //   ok → cinza (dado normal); dado incompleto (sem_carga/sem_perfil) →
      //   âmbar (não é falha); falha técnica/erro (sem_cota/erro) → vermelho.
      const incompleto = it.estado === 'sem_carga' || it.estado === 'sem_perfil';
      const fillEstaca = temSolucao
        ? COR_ESTACA_FILL
        : incompleto
        ? '#FEF3C7'
        : '#FEE2E2';
      const strokeEstaca = temSolucao
        ? COR_ESTACA_CONTORNO
        : incompleto
        ? '#B45309'
        : '#DC2626';
      elementos.push(
        <g key={`estaca-${i}`}>
          <rect
            x={x - wEstaca / 2}
            y={yTopo}
            width={wEstaca}
            height={altura}
            fill={fillEstaca}
            stroke={strokeEstaca}
            strokeWidth="3"
            strokeDasharray={temSolucao ? 'none' : '5 3'}
          />
          <rect x={x - wEstaca / 2} y={yTopo} width={wEstaca} height={altura} fill="url(#hatch-estaca)" opacity="0.4" />
        </g>
      );
      // marca da ponta (cota) quando há solução
      if (temSolucao) {
        elementos.push(
          <g key={`ponta-${i}`}>
            <line x1={x - wEstaca / 2 - 4} y1={yPonta} x2={x + wEstaca / 2 + 4} y2={yPonta} stroke="#0F172A" strokeWidth="1.5" />
            <text x={x - wEstaca / 2 - 6} y={yPonta + 3} textAnchor="end" fontSize="7" fill="#0F172A" fontWeight="bold">
              {cotaPonta.toFixed(1)}
            </text>
          </g>
        );
      }
      // (4)/(#5) Info da estaca à direita: dados + resultados (Qadm, margem) ou
      // mensagem específica do estado (sem carga / sem perfil / sem cota / erro).
      const infoLinhas = [];
      if (it.tipoEstaca) infoLinhas.push({ t: it.tipoEstaca });
      if (it.diametro_m != null)
        infoLinhas.push({
          t:
            (it.formato === 'quadrada' ? '\u25A1 ' : '\u00D8 ') +
            Math.round((it.dimensao_m ?? it.diametro_m) * 100) +
            ' cm',
        });
      if (temSolucao) {
        infoLinhas.push({ t: 'ponta ' + cotaPonta.toFixed(2) + ' m' });
        if (it.regente) infoLinhas.push({ t: it.regente + ' rege' });
        if (it.qAdm_tf != null)
          infoLinhas.push({ t: 'Qadm ' + it.qAdm_tf.toFixed(1) + ' tf' });
        if (it.carga_tf != null || it.cargaPrevista_tf != null)
          infoLinhas.push({
            t: 'carga ' + (it.cargaPrevista_tf ?? 0).toFixed(1) + ' tf',
          });
        if (it.margem_tf != null) {
          const folga = it.margem_tf >= 0;
          infoLinhas.push({
            t: 'margem ' + (folga ? '+' : '') + it.margem_tf.toFixed(1) + ' tf',
            cor: folga ? '#15803D' : '#DC2626',
          });
        }
      } else {
        // Mensagem por estado (decisão do usuário — 4 estados distintos)
        const MSG = {
          sem_carga: { t: 'sem carga prevista', cor: '#B45309' },
          sem_perfil: { t: 'dados insuficientes', cor: '#B45309' },
          sem_cota: { t: 'NENHUMA COTA ATENDE', cor: '#DC2626', bold: true },
          erro: { t: 'erro de cálculo', cor: '#DC2626' },
        };
        infoLinhas.push(MSG[it.estado] || { t: 'sem solução', cor: '#DC2626', bold: true });
      }
      const xInfo = x + wEstaca / 2 + 6;
      const yInfo = yTopo + altura / 2 - (infoLinhas.length * 9) / 2;
      infoLinhas.forEach((linha, li) => {
        elementos.push(
          <text
            key={`einfo-${i}-${li}`}
            x={xInfo}
            y={yInfo + li * 9 + 6}
            textAnchor="start"
            fontSize="8"
            fontWeight={linha.bold ? 'bold' : 'normal'}
            fill={linha.cor || '#475569'}
          >
            {linha.t}
          </text>
        );
      });
      // texto explicativo abaixo da estaca (só nos estados de falha técnica/erro)
      if (!temSolucao && (it.estado === 'sem_cota' || it.estado === 'erro')) {
        elementos.push(
          <text key={`semsol-${i}`} x={x} y={yPonta + 12} textAnchor="middle" fontSize="7" fill="#DC2626">
            {it.estado === 'sem_cota'
              ? 'nenhuma cota atende a carga prevista'
              : it.motivoSemSolucao || 'erro'}
          </text>
        );
      }
    }

    // (5) Eixo X: rótulo + distância 2D ao anterior
    let sub = '';
    if (i > 0) {
      const d = distancia2D(itensResolvidos[i - 1], it);
      if (d != null) sub = `${d.toFixed(1)}m ←`;
    }
    elementos.push(
      <text key={`xlabel-${i}`} x={x} y={geo.plotBottom + 16} textAnchor="middle" fontSize="8" fill="#94A3B8">
        {sub}
      </text>
    );
  });

  // ===== CP-13g — Sobreposições ao perfil =====
  // Lista de furos resolvidos na ordem da sequência (com índice de coluna)
  const furosSeq = itensResolvidos
    .map((it, i) => ({ it, i }))
    .filter((o) => o.it.tipo === 'furo');

  // (#3) SUPERFÍCIE DO TERRENO: polilinha ligando os topos dos furos. Nas
  // estacas, marca a cota de arrasamento como ponto do terreno local.
  if (mostrarTerreno && furosSeq.length >= 2) {
    const pontos = furosSeq
      .filter((o) => o.it.cotaTopo_m != null)
      .map((o) => `${geo.xColuna(o.i)},${geo.yDe(o.it.cotaTopo_m)}`);
    if (pontos.length >= 2) {
      elementos.push(
        <polyline
          key="terreno"
          points={pontos.join(' ')}
          fill="none"
          stroke="#78350F"
          strokeWidth="1.5"
          opacity="0.7"
        />
      );
      // marca de terreno (pequeno tracinho) em cada topo de furo
      furosSeq.forEach((o) => {
        if (o.it.cotaTopo_m == null) return;
        const xx = geo.xColuna(o.i);
        const yy = geo.yDe(o.it.cotaTopo_m);
        elementos.push(
          <text key={`terr-${o.i}`} x={xx} y={yy - 4} textAnchor="middle" fontSize="7" fill="#78350F">
            ▽
          </text>
        );
      });
    }
  }

  // (#1) NÍVEL D'ÁGUA: por furo, desenha o símbolo de NA na cota medida
  // (cotaTopo - naFinal). Só desenha onde há dado (naFinal_m preenchido) — a
  // Balsas tem null, então nada aparece até o usuário informar. Liga os NAs
  // entre furos com linha azul tracejada.
  if (mostrarNA) {
    const pontosNA = [];
    furosSeq.forEach((o) => {
      const na = o.it.naFinal_m != null ? o.it.naFinal_m : o.it.naInicial_m;
      if (na == null || o.it.cotaTopo_m == null) return;
      const cotaNA = o.it.cotaTopo_m - na;
      const xx = geo.xColuna(o.i);
      const yy = geo.yDe(cotaNA);
      pontosNA.push({ x: xx, y: yy });
      // símbolo de NA (triângulo invertido azul + linha)
      const larguraCol = geo.colW * (perfilInterpretado ? 0.18 : 0.42);
      elementos.push(
        <g key={`na-${o.i}`}>
          <line x1={xx - larguraCol / 2 - 3} y1={yy} x2={xx + larguraCol / 2 + 3} y2={yy} stroke={COR_NA} strokeWidth="1.5" />
          <text x={xx + larguraCol / 2 + 5} y={yy + 3} textAnchor="start" fontSize="8" fill={COR_NA}>
            ▽ NA
          </text>
        </g>
      );
    });
    // liga os NAs entre furos (linha azul tracejada)
    if (pontosNA.length >= 2) {
      elementos.push(
        <polyline
          key="na-linha"
          points={pontosNA.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke={COR_NA}
          strokeWidth="1"
          strokeDasharray="4 3"
          opacity="0.7"
        />
      );
    }
  }

  // (#6) TRECHO SEM SPT: quando a cota de arrasamento de uma estaca está ACIMA
  // da 1ª leitura do furo de referência (ou acima do perfil amostrado), o trecho
  // entre o arrasamento e o topo do perfil é "sem SPT" — a engine trata como sem
  // atrito. Marca com hachura cinza clara + rótulo.
  if (mostrarSemSPT) {
    itensResolvidos.forEach((it, i) => {
      if (it.tipo !== 'estaca' || it.cotaArrasamento_m == null) return;
      // topo do perfil amostrado = maior cotaTopo entre os furos da sequência
      const topoPerfil = Math.max(
        ...furosSeq.map((o) => o.it.cotaTopo_m).filter((c) => c != null)
      );
      if (!isFinite(topoPerfil)) return;
      // se arrasamento acima do topo do perfil → trecho sem SPT
      if (it.cotaArrasamento_m > topoPerfil + 0.01) {
        const x = geo.xColuna(i);
        const wEstaca = Math.max((it.diametro_m || 0.3) * 80, 10);
        const yArr = geo.yDe(it.cotaArrasamento_m);
        const yTopoPerfil = geo.yDe(topoPerfil);
        const hSem = Math.max(yTopoPerfil - yArr, 2);
        const xL = x - wEstaca / 2;
        // O trecho "sem SPT" é desenhado DEPOIS da coluna da estaca, então o
        // cobrimos: (1) fundo branco opaco para apagar o cinza do pilar ali;
        // (2) crosshatch âmbar (textura de atenção, distinta da estaca);
        // (3) borda âmbar tracejada; (4) rótulo âmbar. Resultado: o trecho não
        // investigado fica visivelmente diferente do corpo da estaca.
        elementos.push(
          <g key={`semspt-${i}`}>
            <rect x={xL} y={yArr} width={wEstaca} height={hSem} fill="white" stroke="none" />
            <rect x={xL} y={yArr} width={wEstaca} height={hSem} fill="url(#hatch-semspt)" stroke="none" />
            <rect
              x={xL}
              y={yArr}
              width={wEstaca}
              height={hSem}
              fill="none"
              stroke="#D97706"
              strokeWidth="1"
              strokeDasharray="3 2"
            />
            <text
              x={x}
              y={(yArr + yTopoPerfil) / 2}
              textAnchor="middle"
              fontSize="7"
              fontWeight="bold"
              fill="#B45309"
              transform={`rotate(-90, ${x}, ${(yArr + yTopoPerfil) / 2})`}
            >
              sem SPT
            </text>
          </g>
        );
      }
    });
  }

  // (a) DISCLAIMER dentro do SVG (vai junto na exportação)
  const disclaimerY = H - 40;

  return (
    <svg
      id="corte-esquematico-svg"
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ background: 'white', maxHeight: '70vh' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Hachuras por família */}
        {['Coesivo', 'Granular', 'Intermediário'].map((fam) => (
          <pattern key={fam} id={`hatch-${fam}`} patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke={corFamilia(fam)} strokeWidth="0.8" />
          </pattern>
        ))}
        <pattern id="hatch-estaca" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="5" stroke={COR_ESTACA_CONTORNO} strokeWidth="0.6" />
        </pattern>
        {/* "Sem SPT": crosshatch ÂMBAR — textura cruzada (não diagonal simples
            como a da estaca) numa cor de atenção, para o trecho não investigado
            saltar aos olhos e não se confundir com o corpo da estaca. */}
        <pattern id="hatch-semspt" patternUnits="userSpaceOnUse" width="6" height="6">
          <line x1="0" y1="0" x2="6" y2="6" stroke="#D97706" strokeWidth="0.7" />
          <line x1="6" y1="0" x2="0" y2="6" stroke="#D97706" strokeWidth="0.7" />
        </pattern>
      </defs>

      {/* moldura do plot */}
      <rect x={geo.padL} y={geo.plotTop} width={W - geo.padL - geo.padR} height={geo.plotH} fill="none" stroke="#E2E8F0" strokeWidth="1" />

      {elementos}

      {/* (a) Disclaimer EMBUTIDO no SVG */}
      <line x1="0" y1={disclaimerY - 10} x2={W} y2={disclaimerY - 10} stroke="#E2E8F0" strokeWidth="1" />
      <text x={geo.padL} y={disclaimerY + 4} fontSize="9" fill="#B45309" fontWeight="bold">
        ⚠ Perfil interpretado automaticamente por similaridade de famílias de solo.
      </text>
      <text x={geo.padL} y={disclaimerY + 16} fontSize="8" fill="#94A3B8">
        Conexões entre furos são inferência (linhas tracejadas/hachuras fracas), não dados medidos. Revise técnica e geologicamente.
      </text>
    </svg>
  );
}
