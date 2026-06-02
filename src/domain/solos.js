/* ============================================================================
 * Solos — constantes e funções utilitárias relacionadas à classificação
 *
 * Extraído das linhas 2663-2740 do geospt_app.jsx.
 *
 * Codificação 1/2/3 + adjetivos (padrão brasileiro NBR 6502 / IPT):
 *   1 = Areia    (granular dominante)
 *   2 = Silte    (intermediário dominante)
 *   3 = Argila   (coesivo dominante)
 *
 * Composições:
 *   1   = Areia
 *   12  = Areia Siltosa            (areia + adjetivo silte)
 *   123 = Areia Silto-Argilosa     (areia + adjetivos silte e argila)
 *   132 = Areia Argilo-Siltosa     (areia + adjetivos argila e silte)
 *   ... regras: dígitos só 1/2/3; primeiro dígito ≠ outros.
 *
 * familiaDoSolo agora consome GeoSPT por import explícito (era window.GeoSPT).
 * ============================================================================ */

import { GeoSPT } from '@/engine/geospt-engine';

export const SOLOS_PADRAO = [
  'Areia',
  'Areia Siltosa',
  'Areia Silto-Argilosa',
  'Areia Argilo-Siltosa',
  'Areia Argilosa',
  'Silte Arenoso',
  'Silte Areno-Argiloso',
  'Silte',
  'Silte Argilo-Arenoso',
  'Silte Argiloso',
  'Argila Arenosa',
  'Argila Areno-Siltosa',
  'Argila Silto-Arenosa',
  'Argila Siltosa',
  'Argila',
];

export const SOLO_PARA_CODIGO = {
  Areia: '1',
  'Areia Siltosa': '12',
  'Areia Silto-Argilosa': '123',
  'Areia Argilo-Siltosa': '132',
  'Areia Argilosa': '13',
  'Silte Arenoso': '21',
  'Silte Areno-Argiloso': '213',
  Silte: '2',
  'Silte Argilo-Arenoso': '231',
  'Silte Argiloso': '23',
  'Argila Arenosa': '31',
  'Argila Areno-Siltosa': '312',
  'Argila Silto-Arenosa': '321',
  'Argila Siltosa': '32',
  Argila: '3',
};

export const CODIGO_PARA_SOLO = {};
Object.keys(SOLO_PARA_CODIGO).forEach((s) => {
  CODIGO_PARA_SOLO[SOLO_PARA_CODIGO[s]] = s;
});

/**
 * Validação progressiva de código numérico de solo.
 * @returns {{valido: boolean, solo: string|null, motivo: string|null}}
 *   - valido true: o código completo casa com um solo
 *   - valido false: motivo descreve o problema
 */
export function validarCodigoSolo(codigo) {
  if (!codigo || codigo === '')
    return { valido: false, solo: null, motivo: 'vazio' };
  if (!/^[123]+$/.test(codigo))
    return { valido: false, solo: null, motivo: 'Use apenas 1, 2 ou 3' };
  if (codigo.length > 3)
    return { valido: false, solo: null, motivo: 'Máximo 3 dígitos' };
  const primeiro = codigo[0];
  for (let i = 1; i < codigo.length; i++) {
    if (codigo[i] === primeiro) {
      return {
        valido: false,
        solo: null,
        motivo: 'Primeiro dígito não pode repetir',
      };
    }
  }
  if (codigo.length === 3 && codigo[1] === codigo[2]) {
    return {
      valido: false,
      solo: null,
      motivo: '2º e 3º dígitos não podem ser iguais',
    };
  }
  const solo = CODIGO_PARA_SOLO[codigo];
  if (!solo)
    return { valido: false, solo: null, motivo: 'Combinação inválida' };
  return { valido: true, solo: solo, motivo: null };
}

/**
 * Família do solo conforme domain.soilTypes da engine.
 * @returns {string|null} 'Coesivo' | 'Granular' | 'Intermediário' | null
 */
export function familiaDoSolo(solo) {
  if (!GeoSPT) return null;
  const info = GeoSPT.domain.soilTypes[solo];
  return info ? info.familia : null;
}

/**
 * Classe Tailwind de cor de fundo por família.
 */
export function bgClassPorFamilia(familia) {
  if (familia === 'Coesivo') return 'bg-blue-50';
  if (familia === 'Granular') return 'bg-yellow-50';
  if (familia === 'Intermediário') return 'bg-purple-50';
  return '';
}
