/* ============================================================================
 * SoloPatterns — patterns SVG de hachura por tipo de solo (NBR 6502)
 *
 * Convenção:
 *   - Areia/Granular → pontos (mais ou menos densos conforme grau)
 *   - Silte/Intermediário → traços horizontais
 *   - Argila/Coesivo → ondulação horizontal
 *   - Solos compostos → combinação dos elementos componentes
 *
 * Patterns são definidos uma única vez em <defs> e referenciados por url(#id).
 * Cada componente que precisa de fills pode incluir <SoloPatternsDefs/> uma vez.
 *
 * IDs gerados: solo-areia, solo-areia-siltosa, solo-areia-argilo-siltosa, etc.
 * Mapping em PATTERN_ID (slugify do nome do solo).
 *
 * Convenção de cor de fundo (por família, fundo da hachura):
 *   - Granular: amber-50  (#FFFBEB)
 *   - Intermediário: purple-50  (#FAF5FF)
 *   - Coesivo: blue-50  (#EFF6FF)
 * ============================================================================ */

import React from 'react';

// Cor de fundo da hachura por família
export const BG_FAMILIA = {
  Granular: '#FEF3C7',       // amber-100 — um pouco mais saturado para destacar do fundo da página
  Intermediário: '#EDE9FE',  // purple-100
  Coesivo: '#DBEAFE',        // blue-100
};

// Cor dos elementos da hachura
const CORES = {
  Granular: '#92400E',       // amber-800
  Intermediário: '#6B21A8',  // purple-800
  Coesivo: '#1E40AF',        // blue-800
};

/**
 * Mapeamento solo → id do pattern (slug seguro para uso em url(#...))
 */
export const PATTERN_ID = {
  Areia: 'solo-areia',
  'Areia Siltosa': 'solo-areia-siltosa',
  'Areia Silto-Argilosa': 'solo-areia-silto-argilosa',
  'Areia Argilo-Siltosa': 'solo-areia-argilo-siltosa',
  'Areia Argilosa': 'solo-areia-argilosa',
  'Silte Arenoso': 'solo-silte-arenoso',
  'Silte Areno-Argiloso': 'solo-silte-areno-argiloso',
  Silte: 'solo-silte',
  'Silte Argilo-Arenoso': 'solo-silte-argilo-arenoso',
  'Silte Argiloso': 'solo-silte-argiloso',
  'Argila Arenosa': 'solo-argila-arenosa',
  'Argila Areno-Siltosa': 'solo-argila-areno-siltosa',
  'Argila Silto-Arenosa': 'solo-argila-silto-arenosa',
  'Argila Siltosa': 'solo-argila-siltosa',
  Argila: 'solo-argila',
};

/**
 * Devolve a URL CSS de um pattern para usar como fill, dado o solo.
 * Ex.: fill={fillPattern('Areia Siltosa')} → fill="url(#solo-areia-siltosa)"
 */
export function fillPattern(solo, prefix = '') {
  const id = PATTERN_ID[solo];
  if (!id) return null;
  return `url(#${prefix}${id})`;
}

/**
 * Devolve a cor de fundo da família (fallback quando hachura está desligada).
 */
export function bgColorFamilia(familia) {
  return BG_FAMILIA[familia] || '#F8FAFC'; // slate-50 fallback
}

/* ============================================================================
 * Os 15 patterns SVG, agrupados por família.
 *
 * Tamanho padrão: 12×12 px. Pattern aplica-se em userSpaceOnUse com tile.
 * Cada pattern tem retângulo de fundo (cor da família) + elementos gráficos.
 *
 * Densidade de elementos:
 *   - Solo puro (Areia, Silte, Argila): elementos densos
 *   - Solo com adjetivo (ex.: Areia Siltosa): elementos do dominante + traço
 *     leve do componente secundário
 *   - Solo com 2 adjetivos: 3 elementos sobrepostos
 * ============================================================================ */

function CirculoAreia({ x, y, r = 0.8 }) {
  return <circle cx={x} cy={y} r={r} fill={CORES.Granular} />;
}

function TracoSilte({ x, y, w = 3, op = 1 }) {
  return (
    <line
      x1={x}
      y1={y}
      x2={x + w}
      y2={y}
      stroke={CORES.Intermediário}
      strokeWidth="0.7"
      opacity={op}
    />
  );
}

function OndaArgila({ x, y, w = 6, op = 1 }) {
  // Pequena ondulação senoidal aproximada por curva quadrática
  const mid = x + w / 2;
  return (
    <path
      d={`M ${x} ${y} Q ${mid} ${y - 1.2} ${x + w} ${y}`}
      fill="none"
      stroke={CORES.Coesivo}
      strokeWidth="0.7"
      opacity={op}
    />
  );
}

function SoloPattern({ id, familia, children }) {
  return (
    <pattern id={id} x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
      <rect width="12" height="12" fill={BG_FAMILIA[familia]} />
      {children}
    </pattern>
  );
}

/**
 * Componente <defs> com TODOS os patterns. Inserir uma vez por <svg>.
 *
 * Aceita prefix opcional para IDs únicos quando múltiplos SVGs aparecem na
 * mesma página com a mesma definição (ex.: 5 perfis lado a lado na Aba 3).
 */
export default function SoloPatternsDefs({ prefix = '' }) {
  const pid = (id) => prefix + id;
  return (
    <defs>
      {/* === GRANULAR (Areia + variantes) === */}
      <SoloPattern id={pid('solo-areia')} familia="Granular">
        <CirculoAreia x={3} y={3} />
        <CirculoAreia x={9} y={3} />
        <CirculoAreia x={6} y={6} />
        <CirculoAreia x={3} y={9} />
        <CirculoAreia x={9} y={9} />
      </SoloPattern>

      <SoloPattern id={pid('solo-areia-siltosa')} familia="Granular">
        <CirculoAreia x={3} y={3} />
        <CirculoAreia x={9} y={3} />
        <CirculoAreia x={3} y={9} />
        <CirculoAreia x={9} y={9} />
        <TracoSilte x={0} y={6} w={12} op={0.6} />
      </SoloPattern>

      <SoloPattern id={pid('solo-areia-silto-argilosa')} familia="Granular">
        <CirculoAreia x={3} y={3} />
        <CirculoAreia x={9} y={3} />
        <CirculoAreia x={6} y={9} />
        <TracoSilte x={0} y={6} w={12} op={0.5} />
        <OndaArgila x={3} y={11} w={6} op={0.4} />
      </SoloPattern>

      <SoloPattern id={pid('solo-areia-argilo-siltosa')} familia="Granular">
        <CirculoAreia x={3} y={3} />
        <CirculoAreia x={9} y={3} />
        <CirculoAreia x={6} y={9} />
        <OndaArgila x={3} y={6} w={6} op={0.55} />
        <TracoSilte x={0} y={11} w={12} op={0.4} />
      </SoloPattern>

      <SoloPattern id={pid('solo-areia-argilosa')} familia="Granular">
        <CirculoAreia x={3} y={3} />
        <CirculoAreia x={9} y={3} />
        <CirculoAreia x={3} y={9} />
        <CirculoAreia x={9} y={9} />
        <OndaArgila x={3} y={6} w={6} op={0.6} />
      </SoloPattern>

      {/* === INTERMEDIÁRIO (Silte + variantes) === */}
      <SoloPattern id={pid('solo-silte')} familia="Intermediário">
        <TracoSilte x={0} y={3} w={12} />
        <TracoSilte x={0} y={6} w={12} />
        <TracoSilte x={0} y={9} w={12} />
      </SoloPattern>

      <SoloPattern id={pid('solo-silte-arenoso')} familia="Intermediário">
        <TracoSilte x={0} y={3} w={12} />
        <TracoSilte x={0} y={9} w={12} />
        <CirculoAreia x={3} y={6} r={0.7} />
        <CirculoAreia x={9} y={6} r={0.7} />
      </SoloPattern>

      <SoloPattern id={pid('solo-silte-areno-argiloso')} familia="Intermediário">
        <TracoSilte x={0} y={2} w={12} />
        <TracoSilte x={0} y={10} w={12} />
        <CirculoAreia x={3} y={6} r={0.7} />
        <CirculoAreia x={9} y={6} r={0.7} />
        <OndaArgila x={3} y={8} w={6} op={0.5} />
      </SoloPattern>

      <SoloPattern id={pid('solo-silte-argilo-arenoso')} familia="Intermediário">
        <TracoSilte x={0} y={2} w={12} />
        <TracoSilte x={0} y={10} w={12} />
        <OndaArgila x={3} y={5} w={6} op={0.7} />
        <CirculoAreia x={3} y={8} r={0.6} />
        <CirculoAreia x={9} y={8} r={0.6} />
      </SoloPattern>

      <SoloPattern id={pid('solo-silte-argiloso')} familia="Intermediário">
        <TracoSilte x={0} y={2} w={12} />
        <TracoSilte x={0} y={10} w={12} />
        <OndaArgila x={3} y={6} w={6} op={0.7} />
      </SoloPattern>

      {/* === COESIVO (Argila + variantes) === */}
      <SoloPattern id={pid('solo-argila')} familia="Coesivo">
        <OndaArgila x={0} y={3} w={6} />
        <OndaArgila x={6} y={3} w={6} />
        <OndaArgila x={0} y={6} w={6} />
        <OndaArgila x={6} y={6} w={6} />
        <OndaArgila x={0} y={9} w={6} />
        <OndaArgila x={6} y={9} w={6} />
      </SoloPattern>

      <SoloPattern id={pid('solo-argila-siltosa')} familia="Coesivo">
        <OndaArgila x={0} y={3} w={6} />
        <OndaArgila x={6} y={3} w={6} />
        <OndaArgila x={0} y={9} w={6} />
        <OndaArgila x={6} y={9} w={6} />
        <TracoSilte x={0} y={6} w={12} op={0.6} />
      </SoloPattern>

      <SoloPattern id={pid('solo-argila-silto-arenosa')} familia="Coesivo">
        <OndaArgila x={0} y={3} w={6} />
        <OndaArgila x={6} y={3} w={6} />
        <OndaArgila x={0} y={9} w={6} />
        <OndaArgila x={6} y={9} w={6} />
        <TracoSilte x={0} y={6} w={12} op={0.5} />
        <CirculoAreia x={6} y={11} r={0.6} />
      </SoloPattern>

      <SoloPattern id={pid('solo-argila-areno-siltosa')} familia="Coesivo">
        <OndaArgila x={0} y={3} w={6} />
        <OndaArgila x={6} y={3} w={6} />
        <OndaArgila x={0} y={9} w={6} />
        <OndaArgila x={6} y={9} w={6} />
        <CirculoAreia x={3} y={6} r={0.65} />
        <CirculoAreia x={9} y={6} r={0.65} />
        <TracoSilte x={0} y={11} w={12} op={0.4} />
      </SoloPattern>

      <SoloPattern id={pid('solo-argila-arenosa')} familia="Coesivo">
        <OndaArgila x={0} y={3} w={6} />
        <OndaArgila x={6} y={3} w={6} />
        <OndaArgila x={0} y={9} w={6} />
        <OndaArgila x={6} y={9} w={6} />
        <CirculoAreia x={3} y={6} r={0.7} />
        <CirculoAreia x={9} y={6} r={0.7} />
      </SoloPattern>
    </defs>
  );
}
