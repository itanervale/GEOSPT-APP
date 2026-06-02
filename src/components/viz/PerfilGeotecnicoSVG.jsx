/* ============================================================================
 * PerfilGeotecnicoSVG — perfil individual de 1 sondagem
 *
 * Conteúdo:
 *   - Eixo Y duplo: cota absoluta (esquerda) + profundidade (direita)
 *   - Coluna estratigráfica com hachura por tipo de solo (15 patterns)
 *   - Camadas agrupadas por solo consecutivo (rotuladas)
 *   - Curva NSPT vermelha sobre escala 0-50
 *   - Valores NSPT numéricos ao lado de cada ponto
 *   - Marcação NA (linha azul-ciano) se presente
 *   - Marcação ★ em impenetráveis
 *   - Toggle de hachuras (controlado externamente via prop `mostrarHachuras`)
 *
 * Layout horizontal (largura padrão 320px):
 *   +-------+---------------------+-----+------------+
 *   | Cota  | Estratigrafia       |NSPT | Descrição  |
 *   | (esq) | (hachura)           |(0-50)|            |
 *   +-------+---------------------+-----+------------+
 *
 * Eixo Y descendente (cotas maiores no topo).
 *
 * NÃO é o mesmo componente do artifact original — o do artifact consome o
 * resultado da compatibilização (envoltória/média). Este consome as LEITURAS
 * brutas de 1 furo. Para a Aba 3 ver PerfilCompatibilizadoSVG.
 * ============================================================================ */

import React from 'react';
import SoloPatternsDefs, { fillPattern, bgColorFamilia } from './SoloPatterns';
import { familiaDoSolo } from '@/domain/solos';

const NSPT_MAX = 50;

/**
 * Agrupa leituras consecutivas com mesmo solo em camadas.
 * Retorna [{ solo, familia, profTopo_m, profBase_m, leituras: [...] }, ...]
 */
function agruparCamadas(leituras) {
  if (!leituras || leituras.length === 0) return [];
  // Ordenar por profundidade ascendente (boca → fundo)
  const ord = [...leituras].sort((a, b) => a.profundidade_m - b.profundidade_m);
  const camadas = [];
  let atual = null;
  ord.forEach((l) => {
    if (!atual || atual.solo !== l.solo) {
      if (atual) camadas.push(atual);
      atual = {
        solo: l.solo,
        familia: l.familia || familiaDoSolo(l.solo),
        profTopo_m: l.profundidade_m - 0.5, // a leitura é o ensaio no metro X, camada é centrada
        profBase_m: l.profundidade_m + 0.5,
        leituras: [l],
      };
    } else {
      atual.profBase_m = l.profundidade_m + 0.5;
      atual.leituras.push(l);
    }
  });
  if (atual) camadas.push(atual);
  // Ajustar topo da primeira camada para 0 (boca do furo)
  if (camadas.length > 0) camadas[0].profTopo_m = 0;
  return camadas;
}

export default function PerfilGeotecnicoSVG({
  sondagem,
  nome = '',
  mostrarHachuras = true,
  largura = 320,
  prefixoPattern = '',
}) {
  if (!sondagem || !sondagem.leituras || sondagem.leituras.length === 0) {
    return (
      <div className="text-xs text-slate-500 p-3 text-center bg-slate-50 border border-slate-200 rounded">
        Sem leituras cadastradas neste furo.
      </div>
    );
  }

  // ----- Dados -----
  const leituras = [...sondagem.leituras].sort(
    (a, b) => a.profundidade_m - b.profundidade_m
  );
  const camadas = agruparCamadas(leituras);
  const cotaTopo = sondagem.cotaTopo_m ?? 0;
  const profMax = Math.max(
    sondagem.profundidadeFinal_m ?? 0,
    ...leituras.map((l) => l.profundidade_m)
  );

  // ----- Dimensões -----
  // Layout: Cota(esq) | Estratigrafia(fixa moderada) | NSPT(toma o resto) | Prof.(dir)
  // O nome mais longo do schema é "Areia Silto-Argilosa" (20 chars × ~4.8px = ~96px).
  // Damos ~150px de estratigrafia (folga ~50% para fundos brancos + padding interno).
  // O restante vai para a escala NSPT, que precisa ser legível na escala 0-50.
  const W = largura;
  const colCota = 32;
  const colProf = 26;
  const padL = 4;
  const padR = 4;
  const padT = 28;
  const padB = 24;
  const colEstrat = Math.min(Math.max(110, W * 0.34), 160);
  const colNspt = W - colCota - colEstrat - colProf - padL - padR - 12;
  // Altura: 26px/m garante labels de cota a cada 1m sem sobreposição
  const escalaY = 26;
  const plotH = Math.max(escalaY * profMax, 260);
  const H = padT + plotH + padB;

  // Posicionamentos das colunas (X)
  const xCota = padL;
  const xEstrat = xCota + colCota;
  const xNspt = xEstrat + colEstrat + 4;
  const xProf = xNspt + colNspt + 4;

  // Escalas
  const yProf = (p) => padT + (p / profMax) * plotH;
  const yCota = (c) => yProf(cotaTopo - c); // c = cota absoluta
  const xNsptEscala = (n) => xNspt + (Math.min(n, NSPT_MAX) / NSPT_MAX) * colNspt;

  // Ticks da escala vertical: 1m se cabe (≥14px/m), 2m caso contrário.
  // Como escalaY=26 (constante), sempre cabe → mostra cada 1m.
  const tickStep = escalaY >= 14 ? 1 : 2;
  const yTicks = [];
  for (let p = 0; p <= profMax; p += tickStep) yTicks.push(p);
  if (yTicks[yTicks.length - 1] !== profMax) yTicks.push(profMax);

  // Ticks horizontais (NSPT)
  const nsptTicks = [0, 10, 20, 30, 40, 50];

  // NA (água)
  const temNA =
    sondagem.naInicial_m !== null && sondagem.naInicial_m !== undefined;
  const yNA = temNA ? yProf(sondagem.naInicial_m) : null;

  // Cor de fundo de camada (quando hachura desligada): cor da família
  const corFundoCamada = (cam) =>
    mostrarHachuras && fillPattern(cam.solo, prefixoPattern)
      ? fillPattern(cam.solo, prefixoPattern)
      : bgColorFamilia(cam.familia);

  // Pontos da curva NSPT
  const pontosNspt = leituras
    .filter((l) => l.nspt_real !== null && l.nspt_real !== undefined)
    .map((l) => ({
      x: xNsptEscala(l.nspt_real),
      y: yProf(l.profundidade_m),
      n: l.nspt_real,
      imp: l.impenetravel,
      prof: l.profundidade_m,
    }));
  const pathStr = pontosNspt
    .map((p, i) => (i === 0 ? 'M' : 'L') + p.x + ' ' + p.y)
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      style={{ maxHeight: '720px' }}
      role="img"
      aria-label={'Perfil geotécnico da sondagem ' + nome}
    >
      {mostrarHachuras && <SoloPatternsDefs prefix={prefixoPattern} />}

      {/* --- Cabeçalho das colunas --- */}
      <g fontSize="9" fill="#475569" fontWeight="bold" textAnchor="middle">
        <text x={xCota + colCota / 2} y={padT - 14}>Cota (m)</text>
        <text x={xEstrat + colEstrat / 2} y={padT - 14}>Estratigrafia</text>
        <text x={xNspt + colNspt / 2} y={padT - 14}>NSPT</text>
        <text x={xProf + colProf / 2} y={padT - 14}>Prof.</text>
      </g>

      {/* Eixo dos ticks NSPT (cabeçalho da escala 0-50) */}
      <g fontSize="8" fill="#64748B" textAnchor="middle">
        {nsptTicks.map((t) => (
          <g key={'nt' + t}>
            <line
              x1={xNsptEscala(t)}
              y1={padT - 3}
              x2={xNsptEscala(t)}
              y2={padT}
              stroke="#94A3B8"
              strokeWidth="0.5"
            />
            <text x={xNsptEscala(t)} y={padT - 4}>{t}</text>
          </g>
        ))}
      </g>

      {/* --- Camadas (background hachurado) --- */}
      {camadas.map((cam, i) => {
        const yTopo = yProf(cam.profTopo_m);
        const yBase = yProf(cam.profBase_m);
        const altura = yBase - yTopo;
        return (
          <g key={'cam' + i}>
            <rect
              x={xEstrat}
              y={yTopo}
              width={colEstrat}
              height={altura}
              fill={corFundoCamada(cam)}
              stroke="#475569"
              strokeWidth="0.5"
            />
          </g>
        );
      })}

      {/* --- Grid horizontal (cotas) --- */}
      {yTicks.map((p) => {
        const c = cotaTopo - p;
        const y = yProf(p);
        return (
          <g key={'gh' + p}>
            <line
              x1={xEstrat}
              y1={y}
              x2={xNspt + colNspt}
              y2={y}
              stroke="#E2E8F0"
              strokeWidth="0.4"
            />
            <text
              x={xCota + colCota - 2}
              y={y + 3}
              fontSize="8"
              fill="#475569"
              textAnchor="end"
              fontFamily="monospace"
            >
              {c.toFixed(c === Math.floor(c) ? 0 : 2)}
            </text>
            <text
              x={xProf + colProf - 2}
              y={y + 3}
              fontSize="8"
              fill="#475569"
              textAnchor="end"
              fontFamily="monospace"
            >
              {p}
            </text>
          </g>
        );
      })}

      {/* --- Grid vertical (escala NSPT) --- */}
      {nsptTicks.map((t) => (
        <line
          key={'gv' + t}
          x1={xNsptEscala(t)}
          y1={padT}
          x2={xNsptEscala(t)}
          y2={padT + plotH}
          stroke={t === 0 || t === 50 ? '#94A3B8' : '#E2E8F0'}
          strokeWidth={t === 0 ? '0.8' : '0.3'}
          strokeDasharray={t === 0 || t === 50 ? '' : '2 2'}
        />
      ))}

      {/* --- Box da escala NSPT --- */}
      <rect
        x={xNspt}
        y={padT}
        width={colNspt}
        height={plotH}
        fill="none"
        stroke="#475569"
        strokeWidth="0.5"
      />

      {/* --- NA (água) --- */}
      {temNA && yNA && (
        <g>
          <line
            x1={xEstrat}
            y1={yNA}
            x2={xNspt + colNspt}
            y2={yNA}
            stroke="#0891B2"
            strokeWidth="1.2"
            strokeDasharray="3 2"
          />
          <text
            x={xEstrat - 2}
            y={yNA - 2}
            fontSize="8"
            fill="#0891B2"
            textAnchor="end"
            fontWeight="bold"
          >
            ▽ NA {sondagem.naInicial_m}m
          </text>
        </g>
      )}

      {/* --- Curva NSPT --- */}
      {pontosNspt.length > 1 && (
        <path d={pathStr} fill="none" stroke="#DC2626" strokeWidth="1.5" />
      )}
      {pontosNspt.map((p, i) => (
        <g key={'p' + i}>
          <circle cx={p.x} cy={p.y} r="2.5" fill="#DC2626" />
          {/* Valor numérico ao lado do ponto */}
          <text
            x={p.x + 6}
            y={p.y + 3}
            fontSize="9"
            fill="#7F1D1D"
            fontFamily="monospace"
            fontWeight="bold"
          >
            {p.n}
            {p.imp && <tspan fill="#B45309">★</tspan>}
          </text>
        </g>
      ))}

      {/* --- Descrições das camadas (DENTRO da hachura, centralizadas) --- */}
      {camadas.map((cam, i) => {
        const yTopo = yProf(cam.profTopo_m);
        const yBase = yProf(cam.profBase_m);
        const altura = yBase - yTopo;
        const yMeio = yTopo + altura / 2;

        // Só mostra texto se a camada tem altura mínima para legibilidade
        if (altura < 14) return null;

        const textoCompleto = cam.solo || '';
        if (!textoCompleto) return null;

        // ~5px por caractere em fontSize 9
        const CHAR_W = 4.8;
        const larguraDisponivel = colEstrat - 8;
        const larguraTextoCompleto = textoCompleto.length * CHAR_W;
        const cabeEm1Linha = larguraTextoCompleto <= larguraDisponivel;

        // Decisão de layout: 1 linha, 2 linhas (quebra na palavra) ou abreviado
        let linhas; // array de strings
        let fontSize;

        if (cabeEm1Linha) {
          linhas = [textoCompleto];
          fontSize = 9;
        } else if (altura >= 28) {
          // Camada alta o suficiente para 2 linhas — quebra no espaço
          // Estratégia: dividir em palavras e empilhar de forma equilibrada
          const palavras = textoCompleto.split(' ');
          if (palavras.length >= 2) {
            // Tenta dividir aproximadamente no meio (em termos de caracteres)
            let melhorSplit = 1;
            let melhorDif = Infinity;
            for (let s = 1; s < palavras.length; s++) {
              const l1 = palavras.slice(0, s).join(' ').length;
              const l2 = palavras.slice(s).join(' ').length;
              const dif = Math.abs(l1 - l2);
              if (dif < melhorDif) {
                melhorDif = dif;
                melhorSplit = s;
              }
            }
            const l1 = palavras.slice(0, melhorSplit).join(' ');
            const l2 = palavras.slice(melhorSplit).join(' ');
            // Verifica se cada linha cabe na largura
            const maxLen = Math.max(l1.length, l2.length) * CHAR_W;
            if (maxLen <= larguraDisponivel) {
              linhas = [l1, l2];
              fontSize = 9;
            } else {
              // Mesmo quebrado não cabe → cair para abreviado
              linhas = null;
            }
          } else {
            linhas = null; // 1 palavra grande não dá pra quebrar
          }
        } else {
          linhas = null; // camada baixa → cair para abreviado
        }

        // Fallback: abreviado em 1 linha
        if (!linhas) {
          const abrev = textoCompleto
            .replace(/Areia/g, 'Ar.')
            .replace(/Argila/g, 'Arg.')
            .replace(/Silte/g, 'Si.')
            .replace(/Siltosa/g, 'silt.')
            .replace(/Silto-/g, 'sil.-')
            .replace(/Arenosa/g, 'aren.')
            .replace(/Areno-/g, 'ar.-')
            .replace(/Argilosa/g, 'arg.')
            .replace(/Argilo-/g, 'arg.-');
          linhas = [abrev];
          fontSize = 8.5;
        }

        const LH = fontSize + 2; // line height
        const blocoH = linhas.length * LH;
        const yPrimeira = yMeio - blocoH / 2 + fontSize;
        const larguraMaxima =
          Math.max(...linhas.map((l) => l.length)) * CHAR_W + 8;

        return (
          <g key={'desc' + i}>
            {/* Fundo branco semitransparente atrás do texto (legibilidade) */}
            <rect
              x={xEstrat + colEstrat / 2 - larguraMaxima / 2}
              y={yMeio - blocoH / 2 - 1}
              width={larguraMaxima}
              height={blocoH + 2}
              fill="white"
              fillOpacity="0.85"
              rx="2"
            />
            {linhas.map((linha, j) => (
              <text
                key={j}
                x={xEstrat + colEstrat / 2}
                y={yPrimeira + j * LH - 1}
                fontSize={fontSize}
                fill="#1E293B"
                textAnchor="middle"
                fontWeight="500"
              >
                {linha}
              </text>
            ))}
          </g>
        );
      })}

      {/* --- Rodapé: indicação de paralisação --- */}
      {sondagem.profundidadeFinal_m !== null &&
        sondagem.profundidadeFinal_m !== undefined && (
          <g>
            <line
              x1={xEstrat}
              y1={yProf(sondagem.profundidadeFinal_m)}
              x2={xNspt + colNspt}
              y2={yProf(sondagem.profundidadeFinal_m)}
              stroke="#1E293B"
              strokeWidth="1.2"
            />
            <text
              x={xNspt + colNspt + 2}
              y={yProf(sondagem.profundidadeFinal_m) + 11}
              fontSize="7"
              fill="#475569"
              fontStyle="italic"
            >
              {sondagem.criterioParalisacao === 'impenetravel'
                ? 'Impenetrável'
                : sondagem.criterioParalisacao === 'solicitacao_contratante'
                ? 'Sol. contrat.'
                : 'Paralisação'}
            </text>
          </g>
        )}

      {/* --- Label da escala NSPT no rodapé --- */}
      <text
        x={xNspt + colNspt / 2}
        y={padT + plotH + 14}
        fontSize="8"
        fill="#475569"
        textAnchor="middle"
      >
        NSPT (golpes/30cm)
      </text>
    </svg>
  );
}
