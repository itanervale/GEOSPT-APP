/* ============================================================================
 * ABAS — lista canônica das 7 abas do app
 *
 * Constante usada por <Tabs/> (renderiza os botões) e por <ConteudoAba/>
 * (roteia para o componente correto). Extraído das linhas 3036-3044 do
 * geospt_app.jsx.
 *
 * O id é a chave usada em `estado.ui.abaAtiva`.
 * ============================================================================ */

export const ABAS = [
  { id: 'identificacao', rotulo: '1. Obra' },
  { id: 'sondagens', rotulo: '2. Sondagens' },
  { id: 'compatibilizacao', rotulo: '3. Compat.' },
  { id: 'analise', rotulo: '4. Análise' },
  { id: 'estacas', rotulo: '5. Estacas' },
  { id: 'capacidade', rotulo: '6. Capacidade' },
  { id: 'saidas', rotulo: '7. Saídas' },
];
