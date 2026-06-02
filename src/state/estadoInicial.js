/* ============================================================================
 * GeoSPT — Estado inicial do app
 *
 * Schema raiz idêntico ao do artifact (linhas 2370-2389 do geospt_app.jsx).
 * NÃO alterar sem migração de JSON correspondente — exports antigos devem
 * continuar carregáveis via carregarObra (em ObraProvider).
 * ============================================================================ */

export const SCHEMA_VERSAO = '2.0.7';

export const ESTADO_INICIAL = {
  obra: {
    identificacao: {
      nome: '',
      localizacao: '',
      dataCadastro: '',
      sistemaCoordenadas: 'xy_local',
      responsavelTecnico: '',
      observacoes: '',
    },
    sondagens: {},
    estacas: [],
    parametros: {
      janelaCompatibilizacao_m: 0.50,
      coeficientesCustomizados: null,
    },
    // Domínios geotécnicos (CP-12a, SPEC commit 7-B). Cada domínio agrupa furos.
    // Estrutura: { id, nome, cor, furos:[], origem:'manual'|'sugestao_kmeans' }
    // Estaca referencia via estaca.dominioId (null = usa todos os furos).
    dominios: [],
    resultadosCalculo: {},
    // Corte esquemático (CP-13d): última seleção + toggles, persistidos no JSON.
    // sequencia: [{ tipo:'furo'|'estaca', nome }]; toggles: { ... }
    corteEsquematico: {
      sequencia: [],
      limiarLente_m: 2,
      toggles: {
        mostrarNspt: true,
        ligarCamadas: false,
        ligarHachuras: false,
        preservarMergulho: true,
        mostrarMediaTopos: true,
        perfilInterpretado: false,
        mostrarTerreno: true,
        mostrarNA: true,
        mostrarSemSPT: true,
      },
    },
  },
  ui: {
    abaAtiva: 'identificacao',
    sondagemSelecionada: null,
    estacaSelecionada: null,
    modoCalculoSelecionado: 'envoltoria',
    submodoPerfilMedio: '2.2_conservador',
    // Elemento atualmente selecionado em visualizações (mini-mapa, perfis, etc.)
    // Formato: { tipo: 'furo'|'estaca', nome: string } | null
    // Compartilhado entre abas para permitir seleção cruzada (Aba 5 ↔ Aba 6 etc.)
    elementoSelecionado: null,
  },
};
