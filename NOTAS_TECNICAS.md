# Notas técnicas observadas nas validações

Pontos identificados ao longo da migração que devem ser respeitados em CPs
futuros. **Cada item deve ser releído antes do CP indicado.**

## CP-7 (Aba 4 — Análise Crítica)

### furoCriticoPct é proporção (0-1), não percentual (0-100)

`compat.metadata.furoCriticoPct` retorna valor entre 0 e 1.
**Exibir como `(valor * 100).toFixed(1) + '%'`**, não `valor.toFixed(1) + '%'`.

Bug histórico no CP-2: card mostrava "0.8%" quando o valor real era 85%
(diferença crítica para alertar o engenheiro sobre dominância de um furo).

### Alerta A2: envoltória dominada por 1 furo

Quando `furoCriticoPct >= 0.5` (50% das cotas), o furo dominou a envoltória.
No dataset Balsas, SPT-01 domina 85% — deve disparar alerta.

Mensagem sugerida: "Envoltória dominada pelo furo {X} em {Y}% das cotas.
Considere análise por furo individual (Modo 3) ou agrupar furos por domínio."

### Alerta A3: inversão de NSPT

`compat.metadata.inversoes` retorna array de `{furo, cotaAcima_m, cotaAbaixo_m, deltaNspt}`.
Caso Balsas: SPT-02 tem inversão em 17m (NSPT 44 → 36, delta -8).

Disparar alerta quando `deltaNspt < -5` (já é o critério interno da engine).

### Formatação de ponto flutuante

A engine não arredonda — deixa para a UI. Exemplos do JSON exportado:
- `mediaTopos_m: 254.40540000000001` → exibir `254.41 m` (`.toFixed(2)`)
- `delta: 2.5945999999999856` → exibir `2.59 m` (`.toFixed(2)`)

Convenção: cotas absolutas com `.toFixed(2)`, NSPTs como inteiros, percentuais com `.toFixed(1)`.

## CP-9 (Aba 6 — Capacidade)

### Nomes corretos de campos do memorial

Confirmado em CP-2 por inspeção direta:
- `cotaPonta_m` (não `cota_m`)
- `Qadm_final_tf` (não `Q_adm_tf`)
- `Qadm_geo_tf` — capacidade geotécnica isolada
- `Qadm_estrutural_tf` — limite estrutural da estaca

### Assinatura de calcularDQ/calcularAV

`engine.calcularDQ(perfil, opcoes)` — primeiro argumento é **array de camadas**,
não o objeto compat inteiro. Montar via:

```js
const perfil = compat.resultados
  .filter(r => r.envoltoria.nspt !== null)
  .map(r => ({
    cota_m: r.cotaRef_m,
    nspt: r.envoltoria.nspt,
    nspt_real: r.envoltoria.nspt_real,
    impenetravel: r.envoltoria.impenetravel,
    solo: r.envoltoria.solo,
    familia: r.envoltoria.familia,
  }));
```

Padrão `perfilEnvoltoriaUtil` extraído da linha 7556 do artifact original.

### Opções padrão de calcularDQ/AV

Defaults da engine (verificar em CP-9 antes de codar):
- `desprezaUltimoMetroAtrito: true` (despreza atrito no último 1m — bulbo Décourt)
- `aplicaRedutorPonta: false`
- `tratamentoPonta: 'calculado'`
- `limitaPontaPorAtrito: false`

## CP-10 (Aba 7 — Saídas)

### crypto.subtle confirmado funcionando no browser

`_inputHash` e `_exportHash` foram gerados com sucesso no JSON do CP-3.
SHA-256 via `globalThis.crypto.subtle.digest` funciona em localhost (contexto
seguro). Não precisa de fallback.

### SheetJS entra como dependência

Decisão no CP-1 foi adiar SheetJS até o CP-10. Ao adicionar:
- Acrescentar `"xlsx": "^0.18.5"` em `dependencies`
- Bundle vai crescer ~600 KB minified (~200 KB gzip)
- Considerar code-splitting via `import('xlsx')` dinâmico se virar problema

## Lições gerais (todos os CPs)

### Mudança intencional no PainelSondagem (CP-5)

No artifact original (linha 3556), o input de nome da sondagem usa
`value={nome}` com `onChange` chamando `renomearSondagem` a cada tecla. Isso
gera renomeações intermediárias inválidas ao digitar "SPT-01" (renomeia para
"S", depois "SP", "SPT"...) com perda de foco.

**Correção no CP-5:** uso `defaultValue` + `onBlur` + `onKeyDown` (Enter/Escape).
A renomeação só ocorre quando o usuário confirma. Comportamento mais robusto,
sem mudar a semântica.

### Antipadrão #1 — Inventar nomes de campos

Cometi no CP-2: `calcularDQ(compat, opcoes)` (errado) e procurar `m.cota_m` no
memorial (errado). Sempre **inspecionar a estrutura real** antes de codar:

```js
// padrão de verificação
console.log(Object.keys(retorno));
console.log(JSON.stringify(retorno[0], null, 2));
```

### Antipadrão — coeficientesCustomizados sob spread

Não usar `JSON.parse(JSON.stringify(coefs))` — destrói `AV_F1_F2_fn`.
Usar spread + reconstrução explícita da função (ver `carregarObra` no
ObraProvider).

### Regra de migração de schema antigo

Toda nova versão deve preservar compatibilidade com JSON exportado pelas
versões anteriores. No carregarObra:
```js
const obraMigrada = { ...ESTADO_INICIAL.obra, ...obraCompleta };
if (!obraMigrada.resultadosCalculo) obraMigrada.resultadosCalculo = {};
// adicionar mais migrações aqui em CP-12 (dominiosGeotecnicos schema novo)
```

## CP-9d — Carga estrutural editável (override por estaca)

**Decisão importante: 1 alteração na engine v2.0.7 (congelada).**

Contexto: o usuário pediu para editar a capacidade estrutural admissível das
estacas. A engine lia `Qadm_estrutural_tf` exclusivamente da tabela
`coefficients.cargaEstrutural_tf[diâmetro][tipo]`.

Mudança (geospt-engine.js, `_calcularGenerico`, ~linha 738):
- Adicionado: `opcoes.cargaEstrutural_tf_override ?? tabela`.
- **Retrocompatível**: override ausente (null/undefined) → usa tabela.
- Regressão 32.84 tf preservada (verificada após a mudança).
- DQ e AV compartilham `_calcularGenerico`, então a mudança cobre os dois.

Por que mexer na engine (e não injetar via coeficientesCustomizados):
- Carga estrutural é propriedade da ESTACA, não coeficiente global da obra.
- Injetar em coeficientesCustomizados sujaria o inputHash e o editor de
  coeficientes ("customizado" apareceria sem o usuário ter mexido nos coefs).
- A 1 linha com `??` tem risco de regressão nulo e é semanticamente correta.

Campo novo na estaca: `cargaEstrutural_tf_custom` (null = usa tabela).
Propagado em `construirOpcoesCalculo` → `cargaEstrutural_tf_override`.
UI: campo no ModalEditarEstaca com aviso âmbar se divergir >30% da tabela.
Persistência: automática (obra.estacas serializa o campo).

## Critério canônico "ambos atendem" (CP-9c.2)

Regra de projeto: cota sugerida = mais RASA onde DQ E AV atendem a carga
simultaneamente (interseção real das cotas atendentes). Se interseção vazia →
"nenhuma cota atende ambos", sem sugerir cota.
- Motor: encontrarCotaSugeridaConservadora usa Set de interseção + Math.max.
- Removido fallback "só-DQ" da interpolação.
- Bug corrigido: motor antigo podia sugerir cota onde só 1 método atendia.

## CP-10c.1 — Bug NaN no Modo 4 (2ª alteração na engine v2.0.7)

**Decisão importante: 2ª alteração na engine (congelada). Validada com os 216
testes (190 sintéticos + 26 Balsas) + regressão 32.84 tf.**

Sintoma: PDFs/XLSX mostravam `NaN` na última cota do Modo 4 (interpolação)
quando só 1 furo alcançava aquela profundidade (ex: cota 235, #furos=1).

Causa raiz (interpolarValorPorFuros, ~linha 1797): com 1 furo distante, o
numerador do peso linear normalizado `1 - d/Σd = 1 - d/d = 0`, daí `sumNum = 0`
e `peso = 0/0 = NaN`. O comentário original assumia "≥ 2 furos" — o caso de 1
furo distante escapou. A proteção raioMin (furo próximo) não cobre furo distante.

Mudança: caso explícito `if (distancias.length === 1)` ANTES do bloco de
ponderação, retornando o valor do furo único (peso 1.0) com método
`furo_unico_disponivel` (sinaliza a limitação no memorial).
- Aditiva: não altera o caminho de ≥2 furos nem a proteção raioMin.
- Validado: 1 furo distante → valor (não NaN); 2/3 furos inalterados.
- Decisão do usuário: dar número + sinalizar (vs retornar null).

## CP-11.1 — Sanitização anti-injeção no XLSX (segurança)

Falha encontrada em teste do usuário (nome da obra = "=2+2"): o XLSX gravava o
texto literal, e Excel/LibreOffice o interpretariam como FÓRMULA (formula
injection / CSV injection — OWASP). Vetor real com `=HYPERLINK`, `=cmd|...` etc.
A proteção estava na spec FASE_3 mas não foi portada na migração Vite.

Correção (gerarWorkbookXLSX.js, função `sanitizarCelula` + aplicação no
`criarSheet`):
- Toda célula de TEXTO que começa com `= + - @ \t \r` recebe prefixo apóstrofo `'`.
- Centralizada no criarSheet → cobre TODAS as 9 abas automaticamente.
- Não afeta números (só strings). Texto com esses chars no meio (ex: Balsas/MA)
  fica intacto — só o 1º caractere dispara.
- Apóstrofo é marcador "forçar texto" do Excel: NÃO é exibido na célula.
- Validado: célula vira tipo `s` (string), sem `cell.f` (sem fórmula).

## CP-11.1 — Legenda do perfil compatibilizado fora do plot

Pedido do usuário: a legenda do perfil (NSPT × cota) sobrepunha grade e curvas.
Movida para rodapé horizontal abaixo do eixo X, nos DOIS lugares (consistência):
- PerfilCompatibilizadoSVG.jsx (tela Aba 3): H 400→460, padB 30→90, legenda em
  2 linhas no rodapé (translate Y = padT+plotH+42).
- pdfGraficos.js svgPerfilCompatibilizado (PDF): H 460→500, padB 30→72, legenda
  horizontal no rodapé. NSPT label movido para padT+plotH+28.

## CP-12a — Domínios geotécnicos: schema + migração (1º de 3 fatias do CP-12)

SPEC: SPEC_commit7B_dominios_geotecnicos.md. CP-12 fatiado em 12a (schema), 12b
(UI), 12c (filtro de cálculo) — validando regressão entre cada (decisão usuário).

Decisão técnica (delegada ao assistente): migração na borda, schema novo no núcleo.
- `obra.dominios[]` + `estaca.dominioId` = fonte da verdade (schema da SPEC).
- `furo.dominioGeotecnico` (string, schema antigo) é LIDO na importação e migrado;
  deixa de ser fonte da verdade. NÃO removido dos 8 arquivos que ainda o leem —
  derivação via furoParaDominio() evita refatoração transversal de risco no 12a.
- Motivo: remover de 8 arquivos no 1º passo ampliaria a superfície de mudança;
  prioridade é não quebrar a regressão. Limpeza fica para 12b/12c.

Mudanças:
- estadoInicial.js: campo morto `dominiosGeotecnicos:[]` (não usado) substituído
  por `dominios:[]` (schema da SPEC). Header.jsx reset atualizado.
- Novo src/state/dominiosHelper.js: CORES_DOMINIO (6), CLASSES_COR_DOMINIO
  (Tailwind estático — JIT não resolve bg-${cor}), HEX_COR_DOMINIO (SVG),
  novoIdDominio, migrarDominios, obterFurosDoDominio, furoParaDominio.
- ObraProvider.carregarObra: chama migrarDominios após o spread.

Validado: regressão 32.84 + 216 testes (engine intacta — filtro é da UI).
Migração: Grupo A→g1, Grupo B→g2 agrupando furos. Balsas (sem domínios) importa
com dominios:[], 0 estacas com dominioId → comportamento atual 100% preservado.
inputHash muda (campo novo no schema) — esperado, não afeta cálculo.

## CP-12b — UI de domínios geotécnicos (2º de 3 fatias do CP-12)

Camada de interface, SEM efeito no cálculo (filtro = CP-12c). Build 90 módulos,
regressão 32.84 preservada.

Implementado:
- ObraProvider: ação `setDominios(arr)`.
- ModalGerenciarDominios.jsx (Aba 4): 2 colunas (lista 40% / edição 60%).
  Rascunho local; só persiste em obra.dominios ao Salvar. Exclusividade de furo
  (SPEC R-C7B-2): marcar furo num domínio remove de qualquer outro. Confirma
  descarte se houve mudança.
- AbaAnalise: botão "Gerenciar domínios (N)" / "+ Criar domínios";
  aplicarSugestaoDominio reescrito → grava obra.dominios[] (origem
  'sugestao_kmeans') em vez de furo.dominioGeotecnico; contadores e limpeza
  migrados ao schema novo.
- ModalEditarEstaca: dropdown por dominioId; badge colorido do domínio;
  aviso âmbar "Modo 4 indisponível" se domínio < 3 furos.
- AbaEstacas: coluna "Domínio" com badge colorido; nova estaca usa dominioId.
- MiniMapaSVG: prop dominiosObra (array obra.dominios). Deriva nome/cor do
  furo via mapaFuroDominio e da estaca via dominioId. Fallback ao campo antigo
  mantido (retrocompatível).
- ModalLimparDominios: textos ajustados ao significado novo ("Excluir todos os
  domínios" / "Desvincular domínio das estacas").

Dívidas registradas (limpar em CP-12c ou depois):
- AbaCompatibilizacao tem seletor de filtro por dominioGeotecnico (schema antigo).
  Fica INERTE no schema novo (Set vazio → seletor não renderiza), o que ALINHA
  com a SPEC decisão F (Aba 3 sem filtro de domínio). Código morto a remover.
- Exports (XLSX col domínio, pdfGraficos cor do furo) ainda leem dominioGeotecnico
  — fallback inócuo; migrar para derivação quando conveniente.
- Engine (sugerirAgrupamentoDominios, filtro interno) lê dominioGeotecnico —
  NÃO tocar (regra: engine congelada).

## CP-12c — Filtro de cálculo por domínio (3º de 3 — CP-12 COMPLETO)

A fatia que MUDA Q_adm. Engine NÃO tocada (filtro na borda, via subset de furos).

Abordagem (A): filtrar na origem. Novo helper resolverFurosParaCalculo(estaca,
obra) → { sondagens (subset|todas), dominio, temFiltro, nFuros, modo4Disponivel }.
prepararPerfilCalculo ganhou param opcional filtroDominio (só p/ bloquear Modo 4
<3 furos — decisão E). Retrocompatível: sem o param, comportamento atual.

3 chamadores adaptados (todos resolvem filtro e passam subset + filtroDominio):
- ConteudoModoCalculo.jsx (Aba 6): resolve filtro, passa obra desde AbaCapacidade.
  Renderiza <BadgeFiltroDominio> antes do conteúdo.
- ConteudoComparativoModos.jsx (Aba 6.5): 4 chamadas filtradas + badge.
- gerarAuditoriaJSON.js: calcularModosDaEstaca recebe obra; 4 chamadas filtradas.

Novo componente BadgeFiltroDominio.jsx: "Filtrado: domínio X (N furos)" colorido,
ou "Sem filtro — todos os N furos". Mitiga R-C7B-1 (deixa explícito por que Q_adm
pode diferir).

VALIDAÇÃO RIGOROSA (prova do filtro):
- E-01 SEM domínio → 32.84 @ 242 (regressão preservada).
- Domínio COM o crítico SPT-01 → 32.84 (idêntico: SPT-01 domina a cota, então o
  NSPT mínimo é o mesmo). NÃO é bug — é a Balsas (SPT-01 crítico em 85% das cotas).
- Domínio SEM SPT-01 (SPT-02..05) → cota 242: NSPT 12→25, Q_adm 32.84→56.38 tf.
  Cota sugerida E-01: 239→242. PROVA que o filtro muda o resultado.
- Domínio 2 furos → modo4Disponivel=false → Modo 4 retorna erro claro.
216 testes + regressão + smoke 200.

Dívidas remanescentes (não bloqueiam): seletor inerte na Aba 3, exports lendo
dominioGeotecnico (fallback), engine sugerirAgrupamentoDominios (congelada).

## CP-12d — Visualização da compatibilização por domínio (Aba 3)

Pedido do usuário (estende a SPEC). Decisão F dizia "Aba 3 sem filtro de domínio";
o usuário optou conscientemente por estender. Salvaguardas: toggle default OFF
(comportamento global = padrão, respeita F como default), e rótulo "Visualização
— não altera o cálculo". Mecânica escolhida pelo usuário: seletor único
Global/Domínio-N (uma compatibilização por vez), não sobreposição.

- Reaproveitou e SUBSTITUIU o seletor antigo (que lia dominioGeotecnico e estava
  inerte desde CP-12b) — agora lê obra.dominios. Resolve a dívida do seletor inerte.
- Estado: verPorDominio (toggle), dominioSelId ('global'|id). dominioAtivo derivado.
- sondagensVisiveis = obterFurosDoDominio(subset) ou todas (global). O `resultado`
  (compatibilizar) recomputa sobre esse subset → gráfico (PerfilCompatibilizadoSVG)
  e tabela (TabelaCompatibilizacao) refletem automaticamente (consomem `resultado`).
- Toggle/seletor agem na hora (não usam o commit da janela; é só visualização).
- useEffect: se dominios.length→0 (limpar/importar), volta a global e desliga.
- Removido o param `dominio` da chamada compatibilizar (era do filtro antigo).

Validação: Global 20 cotas/crítico SPT-01; domínio Sul (sem SPT-01) 19 cotas/
crítico SPT-02, NSPT sobe por cota (242:12→25). Regressão 32.84 intacta (global
é o default e idêntico ao anterior). 216 testes, smoke 200, 0 vulnerabilidades.

NOTA: a compatibilização por domínio aqui é VISUAL (Aba 3). O cálculo por domínio
(CP-12c) já usava o mesmo obterFurosDoDominio — então o que a Aba 3 mostra ao
selecionar um domínio É exatamente o perfil que alimenta as estacas daquele
domínio. Coerência total entre visualização e cálculo.

## CP-13 — Corte esquemático (SPEC commit 8). Fatiado em 13a/b/c/d.

DECISÕES consolidadas (usuário):
- Estrutura: 13a (campo cotaArrasamento_real_m) → 13b (algoritmo casamento+testes)
  → 13c (modal+seleção) → 13d (SVG+toggles).
- Proteção MÁXIMA contra falsa continuidade (R-C8-1): além das 3 da SPEC
  (disclaimer, toggles conexão off default, interrupção brusca incompatíveis):
  (a) disclaimer DENTRO do SVG exportado (não só rodapé do modal);
  (b) conexões inferidas visualmente MAIS FRACAS que colunas de dado;
  (c) aviso em conexões entre furos muito distantes (estende R-C8-2 p/ dist. horiz).
- REGRA CENTRAL (usuário): casamento de camadas usa SÓ a família do solo. NSPT
  NÃO governa conexão nem gradiente — é informativo ao lado da coluna (decisão I).

## CP-13a — Campo cotaArrasamento_real_m (pré-requisito)

ModalEditarEstaca.jsx:
- Campo decimal opcional (step=0.001), abaixo do grid arrasamento/carga.
- setArrasamentoReal: ao digitar real, sugere inteiro = Math.floor(real) SE o
  inteiro estiver vazio (não sobrescreve escolha manual — regra J).
- Validação: |real − inteiro| ≤ 1m (tolerância 1.0001 p/ float).
- Tooltip: "apenas para desenho — cálculo usa o inteiro; arredonda p/ baixo".
AbaEstacas: nova estaca inclui cotaArrasamento_real_m: null.

CRÍTICO confirmado: construirOpcoesCalculo passa SÓ cotaArrasamento_m (inteiro)
à engine. O decimal NÃO entra no cálculo — schema aditivo, engine inalterada.
Regressão 32.84 intacta. Validado: floor 254.485→254, 239.9→239; não sobrescreve
manual; validação 4.485m→erro, 1.0m→ok, 0.485m→ok.

## CP-13a REVISADO — Cota decimal com floor no cálculo (campo ÚNICO)

CORREÇÃO de rumo (usuário): a SPEC (decisão J) pedia DOIS campos (inteiro +
cotaArrasamento_real_m decimal). O usuário reafirmou a intenção original: UM
campo decimal, floor no cálculo. Decisão do usuário prevalece sobre a SPEC.
Mais simples e elimina classe de erro (não há como inteiro e real divergirem).

Implementação (Caminho 1 — engine intocada):
- ModalEditarEstaca: campo cotaArrasamento_m vira step=0.001 (decimal). Removidos:
  setArrasamentoReal, validação |real−inteiro|, campo extra. Validação da engine
  agora roda sobre Math.floor(cota). Indicador no campo quando decimal: "Cálculo
  usará N m".
- calculoHelpers.construirOpcoesCalculo: aplica Math.floor(cotaArrasamento_m)
  antes de entregar à engine (modos envoltoria/perfil_medio).
- prepararPerfilCalculo: ATENÇÃO — modos por_furo e interpolacao leem
  estaca.cotaArrasamento_m DIRETO (engine calcularPorFuroIndividual usa
  estaca.cotaArrasamento_m, ~linha 1170, NÃO opcoes). Por isso criada estacaCalc
  = {...estaca, cotaArrasamento_m: Math.floor(...)} no início, usada em por_furo
  e interpolacao (estacaConv). Garante floor em TODOS os 4 modos.
- AbaCapacidade: aviso âmbar abaixo do SeletorEstaca quando cota é decimal —
  "informada X m · cálculo usando floor(X) m (a favor da segurança)".
- cotaArrasamento_real_m REMOVIDO de todo o src (0 referências).

Validado: regressão 32.84 (cota 242 inteira); decimal 253.7 → floor 253 →
Q_adm idêntico (32.84); 216 testes; 0 vulnerabilidades. Engine inalterada.

## CP-13b — Algoritmo de casamento de camadas (núcleo geotécnico, função pura)

src/abas/AbaCorteEsquematico/casamentoCamadas.js — SEM React/DOM. 23 testes em
test-casamento.mjs (rodar: node test-casamento.mjs).

REGRA CENTRAL (usuário): casamento usa SÓ família do solo. NSPT NÃO governa
conexão nem gradiente (é informativo no 13d).

Funções:
- derivarFamilia(solo): reusa GeoSPT.domain.soilTypes[solo].familia (fonte
  canônica — NÃO duplica classificação). 15 solos, 3 famílias.
- tipoTransicao(fA,fB) (decisão A): mesma família OU Intermediário envolvido →
  'gradiente'; Granular↔Coesivo direto → 'brusca'. (Intermediário = ponte.)
- agruparEmBlocos(furo): agrupa leituras CONSECUTIVAS de mesma família em blocos
  {familia,solo,cotaTopo_m,cotaBase_m,espessura_m,leituras[],temImpenetravel}.
  Aceita formato real (profundidade_m + familia pré-computada) E simplificado
  (prof + solo). cotaBase = cotaTopo_furo − prof; topo = cotaTopo_furo − (prof−1).
- casarBlocos(A,B) (decisão usuário): p/ cada bloco de A acha bloco de B de MESMA
  família com cotaTopo mais próxima (1-para-1, usadosB Set). Conexão liga
  topo↔topo e base↔base → mergulhoTopo_m/mergulhoBase_m (=desnível) geram linhas
  inclinadas. Blocos sem par → semParA/semParB (interrupção brusca). "5m de A
  casa com 3m de B em desnível" suportado (espessuras/cotas livres).
- processarSequenciaFuros(furos): blocosPorFuro + paresAdjacentes (consome no 13d).

ATENÇÃO formato: dataset usa profundidade_m/nspt_real/nspt_calculo + familia
pré-computada (NÃO prof/nspt/solo cru). O algoritmo normaliza ambos.

Validado com Balsas: SPT-01 = Areia 2m + Argila 17m; SPT-02 = Argila 7m + Areia
11m; conexões 01↔02 = 2 gradientes (famílias casam), mergulho 7-16m (perfis bem
diferentes — captura corretamente). Build 91 módulos (módulo ainda não importado
por componente — função pura aguardando 13c/d). Regressão 32.84 intacta.

## CP-13c — Modal do corte: seleção sequencial (3º de 4)

Fluxo de seleção apenas — SEM desenho (13d substitui o placeholder). Build 93
módulos, regressão 32.84, 0 vulnerabilidades. 14 testes de lógica de seleção.

- MiniMapaSelecao.jsx (DEDICADO, decisão usuário — não reusa MiniMapaSVG):
  multisseleção ORDENADA. Clicar furo/estaca adiciona ao fim; clicar de novo
  remove. Número de ordem em círculo verde. Escala real (min(plotW/spanX,
  plotH/spanY)), Y invertido (norte p/ cima). Triângulo=furo, losango=estaca,
  verde=na sequência. Conta itens sem coordenadas.
- ModalCorteEsquematico.jsx: fullscreen, 2 colunas (40% mini-mapa / 60%
  sequência). Estado sequencia=[{tipo,nome}]. toggle/mover(±1, com bordas)/
  remover. Botões "todos furos/estacas/limpar tudo". Validação: MIN 1 estaca +
  2 furos, MAX 10 itens (ordem = ordem de clique, decisão usuário). Placeholder
  no lugar do SVG.
- AbaEstacas: botão "📐 Corte esquemático" no cabeçalho do mini-mapa, disabled
  se <2 sondagens ou <1 estaca. Estado mostrarCorte. Modal renderizado no fim.

CP-13d (próximo) consome casamentoCamadas.processarSequenciaFuros(furos da
sequência) para desenhar. A sequência mistura furos E estacas; o casamento só
roda entre furos adjacentes (estacas são colunas próprias, decisão K).

## CP-13c ADIÇÃO — lista de seleção (resolve sobreposição no mapa)

Problema relatado (print do usuário): SPT-05 e E-01 estão em (12.5, 12.5) —
coords idênticas — então se sobrepõem no mini-mapa e o clique vira loteria
(mesmo par coincidente do CP-10d.2). Decisão usuário: lista de seleção ABAIXO do
mapa (coluna esquerda; mapa + lista juntos), AGRUPADA POR TIPO (Furos, Estacas).

ModalCorteEsquematico.jsx:
- Lista abaixo do mini-mapa + atalhos, na coluna esquerda. Dois grupos (Furos
  sky-700, Estacas slate). Cada item = botão full-width: verde + nº de ordem se
  na sequência, senão branco + ícone (▲ furo / ◆ estaca). Clique = mesmo toggle
  do mapa → mapa e lista sincronizados.
- Adicionados ordemDe(tipo,nome) (índice 1-based ou 0) e nomesFurosOrdenados
  (useMemo, sort). Removido estaPresente (não usado).
- Empty-state da sequência atualizado: "mini-mapa ou lista".

Build 93 módulos, regressão 32.84, smoke 200, 0 vulnerabilidades. Mapa continua
para visão espacial; lista garante seleção precisa de itens coincidentes.

## CP-13d — SVG do corte esquemático (4º de 4 — CP-13 COMPLETO)

SVG em React (decisão usuário: reativo aos toggles). Build 96 módulos, regressão
32.84, 0 vulnerabilidades. Geometria pura testável: test-geometria-corte.mjs (12).

ARQUITETURA (separação geometria/render — permite testar coords no Node):
- geometriaCorte.js (PURO): construirGeometria (yDe cota→px escala real, xColuna
  i→px uniforme), calcularDominioCotas, ticksEixoY, distancia2D, estacaAtravessa
  (furo mais próximo + interseção de cotas → "Coesivo (3.5m)+Granular(2.0m)").
  Cores por família: Coesivo=azul #3B82F6, Granular=âmbar #D97706, Interm=púrpura
  #9333EA (+ versões FRACAS para conexões).
- CorteEsquematicoSVG.jsx (React): consome geometria + casamentoCamadas. Furos =
  colunas de blocos (cor cheia 0.55 + hachura pattern 45°), NSPT à direita
  (nspt_calculo), cota base à esquerda, ★ impenetrável, tick de topo. Estacas =
  pilar cinza (largura ∝ diâmetro·80, contorno 3px, hachura diagonal), bulbo
  elipse âmbar 0.15, texto "atravessa". Eixo Y grade 1m + rótulo; eixo X
  distância 2D ao anterior. Linha tracejada média topos.

6 TOGGLES (SPEC §3, defaults): mostrarNspt=on, ligarCamadas=OFF, ligarHachuras=
OFF, preservarMergulho=on, mostrarBulbo=on, mostrarMediaTopos=on. Os 2 de conexão
OFF por default = mitigação de falsa continuidade.

3 PROTEÇÕES contra falsa continuidade (decisão usuário — máxima):
- (a) disclaimer EMBUTIDO no SVG (2 linhas no rodapé do próprio <svg>, vai junto
  no export — não só no rodapé do modal).
- (b) conexões inferidas MAIS FRACAS: linhas tracejadas (3 2) finas opacity 0.6,
  hachuras cor clara fillOpacity 0.35. Colunas de dado = cor cheia/contorno
  sólido. Olho distingue medido de interpretado.
- (c) furos distantes (>25m, LIMIAR_DISTANCIA_M): linha de conexão vermelha +
  aviso "⚠ Nm entre furos". Estende R-C8-2 para distância horizontal.

REGRA CENTRAL respeitada: casamento por família (via casamentoCamadas); NSPT só
informativo (números à direita, toggle), não governa conexão.

mergulho ON → conexões ligam cotas reais (inclinadas); OFF → cota média
(horizontais). Validado: SPT-01↔SPT-02 topoA 254.49 ≠ topoB 247.09 (inclinada);
8 combinações de toggles não quebram; proteção (c) dispara em SPT-02↔SPT-03
(35.4m > 25m).

Exportar SVG: XMLSerializer do #corte-esquematico-svg + blob image/svg+xml +
download corte-esquematico.svg. Disclaimer (a) embutido viaja no arquivo.

cotaArrasamento: o DESENHO usa cotaArrasamento_m decimal DIRETO (não floor — o
floor é só do cálculo, CP-13a). cotaPonta visual = fallback (não recalcula
capacidade). NOTA: cotaArrasamento_real_m da SPEC foi unificado em
cotaArrasamento_m no CP-13a — o SVG usa este.

## CP-13d.1 — Ajustes do corte (feedback visual do usuário, 2 imagens)

Imagens: nosso corte (espremido, lista escondida) + referência AutoCAD (Engaste/
ELO) com legenda lateral de camadas. 5 ajustes:

1. MODO TELA CHEIA: estado modoVisao ('selecao'|'desenho'). Quando válido +
   modo='desenho', o corte ocupa largura total (toggles no topo, SVG embaixo);
   botão "✏ Editar seleção" volta ao modo 2 colunas. Abre direto em 'desenho'
   se já houver sequência salva.
2. PERSISTÊNCIA: estado.obra.corteEsquematico {sequencia, toggles}. Ação
   setCorteEsquematico no provider; carregarObra migra (JSON pré-13d.1 ganha
   default). Modal recebe corteInicial + onPersistir; fecharEPersistir salva ao
   fechar (× ou Fechar). Sequência salva é FILTRADA contra furos/estacas
   removidos na reabertura. Vai no JSON exportado (persiste entre sessões).
3. BULBO REMOVIDO: toggle mostrarBulbo + elipse do SVG removidos (pedido). NOTA:
   "regra de bulbo" do cálculo de atrito (desprezar último 1m) é OUTRA coisa,
   permanece.
4. RÓTULO DE SOLO no bloco: nome do solo (b.solo) centralizado no bloco quando
   altura > 16px. Mantém simplificado (sem legenda lateral estilo AutoCAD —
   decisão usuário).
5. LISTA ESCONDIDA (bug do print): mini-mapa reduzido (maxHeight 360→240px),
   colunas do modo seleção 40/60 → 50/50. Lista de furos/estacas agora visível
   abaixo do mini-mapa sem rolagem excessiva.

Toggles agora 5 (era 6): mostrarNspt, ligarCamadas, ligarHachuras,
preservarMergulho, mostrarMediaTopos. Build 96 módulos, regressão 32.84,
23+12 testes, 0 vulnerabilidades. Persistência: filtra removidos + migra.

## CP-13d.2 — Refinamentos do corte (feedback visual, 2 imagens)

Image 1 (tela cheia funcionou bem); Image 2 (lista AINDA escondida abaixo do
mini-mapa). Pergunta sobre "atravessa Coesivo (1.0m)" → texto estava quebrado
(estaca desenhada com comprimento errado).

4 ajustes:
1. LISTA ESCONDIDA (causa real): SVG do mini-mapa com w-full + viewBox quadrado
   320×320 esticava altura junto com largura (coluna agora w-1/2 mais larga →
   mais alto). maxHeight no SVG não bastava. FIX: wrapper com height fixo 200px
   + SVG height:100% width:auto. Lista agora visível logo abaixo.
2. PONTA DA ESTACA = cota sugerida MODO 1: resolverPontaEstaca no modal roda
   prepararPerfilCalculo(envoltoria) → calcularDQ/AV(perfilParaCalculo, opcoes) →
   encontrarCotaSugeridaConservadora(carga). Passa cotaPonta_m + temSolucao +
   regente via itensParaDesenho. Engine inalterada (reusa Aba 6). sondagensDa
   Sequencia = furos selecionados (ou todos). params nova prop do modal.
   ATENÇÃO: prepararPerfilCalculo(envoltoria) retorna perfilParaCalculo (NÃO
   memorialDq/Av) — DQ/AV calculados aqui, como ConteudoPerfilUnico faz.
3. SEM SOLUÇÃO (cota null): estaca desenhada até geo.cotaMin (fundo) + fill
   vermelho claro + contorno #DC2626 tracejado (5 3) + texto motivo abaixo +
   "SEM SOLUÇÃO" na info lateral. (decisão usuário: "as duas" — marca + texto).
4. TEXTO "atravessa X" REMOVIDO → info da estaca à direita: tipoEstaca, Ø Ncm,
   ponta X.XX m, (regente). estacaAtravessa removido do SVG (import tirado;
   função ainda existe em geometriaCorte mas não usada — mantida p/ ref futura).
   Quando há solução: marca de cota na ponta (linha + label).

Validado: ponta carga 30tf→cota 241 (AV); 9999tf→sem solução; 80tf→237 (mais
profundo, coerente). Build 96 módulos, regressão 32.84, 23+12 testes, 0 vulns.

## CP-13e — Refinamentos do corte (1/3 do feedback das refs geológicas)

Análise do usuário: comparou nosso corte (colunas) com 3 cortes profissionais
(camadas preenchidas contínuas). Decidiu Caminho B (híbrido) + equilíbrio
dado/inferência, fatiado em 13e→13f→13g. Este CP = as 3 melhorias de menor risco.

#2 — Comentário "6 toggles" → "5 toggles" (cabeçalho + interno). Ruído de
manutenção (são 5 desde que o bulbo saiu no CP-13d.1).

#7 — Linha do corte A–A' no MiniMapaSelecao:
- coordDe(it) resolve cada item da sequência para (x,y); pontosLinha na ordem.
- polyline tracejada ligando os pontos; rótulos A (início) e A' (fim).
- sequenciaEstranha: ângulo interno <60° em algum vértice → linha vermelha +
  aviso "curvas fechadas, ordem pode não ser alinhamento coerente". Comunica que
  a sequência é o EIXO do corte, não só uma lista.

#5 — Resultados + estados da estaca (resolverPontaEstaca estendido):
- Retorna estado ∈ {sem_carga, sem_perfil, sem_cota, erro, ok} + qAdm_tf +
  margem_tf (= qAdm - carga). qAdm = min(DQ, AV) na cota sugerida.
- SVG mostra (quando ok): tipo, Ø, ponta, "X rege", Qadm, carga, margem (verde
  se ≥0, vermelho se <0).
- Estados de falha: cor do PILAR diferenciada — dado incompleto (sem_carga/
  sem_perfil) = âmbar #FEF3C7 (NÃO é falha); falha técnica/erro (sem_cota/erro)
  = vermelho #FEE2E2. Decisão usuário: "sem carga → não falha; nenhuma cota →
  falha técnica". Texto explicativo abaixo só em sem_cota/erro.

Validado: carga 30tf→ok Qadm 31.0 margem +1.0; sem carga→sem_carga; 9999tf→
sem_cota; margem=Qadm-carga. Build 96 módulos, regressão 32.84, 23+12 testes,
0 vulns. Engine inalterada (reusa cálculo da Aba 6).

## CP-13e.1 — Correção: distinção sem_carga vs sem_cota (bug do print)

Bug (print do usuário): E-04 (sem carga prevista) e E-03 (nenhuma cota atende)
apareciam IDÊNTICAS (vermelhas, "NENHUMA COTA ATENDE"). Violava a especificação
do próprio usuário (sem_carga = âmbar/dado incompleto; sem_cota = vermelho/falha).

Causa raiz: a carga da E-04 não era null e sim 0 (ou '' → 0). O check
`cargaPrevista_tf == null` não pega 0; a estaca escapava para o cálculo, onde
encontrarCotaSugeridaConservadora com carga≤0 entra no ramo sem_alvo
(ambosAtendem:false) → meu check classificava como sem_cota.

Fix: resolverPontaEstaca agora trata como sem_carga quando a carga é null,
undefined, '', não-finita OU ≤ 0 (Number(carga) <= 0). Agora E-04 (carga 0) →
sem_carga (âmbar), E-03 (carga válida, nenhuma cota) → sem_cota (vermelho).

## DÍVIDA registrada (corrigir no CP-13f) — cruzamento de hachuras

Print do usuário mostra bandas de conexão se CRUZANDO em X entre furos. Causa:
casarBlocos casa por proximidade de cotaTopo; quando 2 blocos de mesma família
trocam de ordem vertical entre furos adjacentes, as conexões cruzam. O usuário
pediu para corrigir JUNTO ao CP-13f (reformulação das conexões em polígonos
preenchidos — lugar natural). NÃO corrigir isoladamente agora.
Abordagem provável no 13f: ao montar polígonos, ordenar/evitar sobreposição
(ex.: casar respeitando ordem vertical, ou clipar polígonos que se cruzam).

## CP-13f — Perfil interpretado + correção do cruzamento (2/3 do feedback)

Duas entregas: (1) corrige a dívida do cruzamento de hachuras; (2) modo perfil
interpretado (Caminho B do usuário — híbrido). Build 96 módulos, regressão
32.84, 26+12 testes UI, 216 engine, 0 vulns.

PARTE 1 — Casamento por ORDEM dentro da família (corrige cruzamento):
- casarBlocos REESCRITO. Antes: cada bloco de A casava com o de B de cotaTopo
  mais próxima (proximidade absoluta) → quando 2 blocos de mesma família trocam
  ordem vertical entre furos, conexões cruzavam em X.
- Agora: agrupa blocosA e blocosB por família; dentro de cada família pareia por
  ORDEM vertical (1º↔1º, 2º↔2º). Areia não atravessa areia. Excedente → semPar.
  conexoes.sort por topoA desc (ordem estável p/ desenho).
- Decisão usuário: regra nova é geotecnicamente mais correta; testes podem mudar.
- 1 teste mudou (test 6: areia de A agora casa com 1ª areia de B topo 250, não
  com a mais próxima 247). Reescrito + 2 testes novos: 2ª areia de B sem par;
  teste 9 ANTI-CRUZAMENTO (caso patológico, prova que topoA e topoB preservam
  mesma ordem → sem cruzamento). 23 → 26 testes.

PARTE 2 — Perfil interpretado (6º toggle, default OFF):
- estadoInicial + migração carregarObra + defaults do modal + TOGGLES_DEF ganham
  perfilInterpretado:false. Persistido no JSON.
- CorteEsquematicoSVG: quando ON, antes das colunas desenha polígonos
  trapezoidais (topoA→topoB→baseB→baseA) ligando blocos casados, cor da família
  fillOpacity 0.30 (interpolação, não medição — decisão usuário: SÓ opacidade,
  sem textura extra). Transição brusca → ⚡ no meio. Bloco sem par → ⚠ na borda.
- Colunas ESTREITAS no modo (larguraCol 0.42→0.18 da colW) — furo vira quase
  linha com NSPTs, como nas referências geológicas. Fora do modo, 0.42 normal.
- Casamento por ordem (Parte 1) garante polígonos sem cruzamento.

3 proteções preservadas: disclaimer no SVG; perfil interpretado é opt-in (default
off, preserva visual atual como padrão); aviso de furos distantes. Equilíbrio:
parece corte geológico mas opacidade baixa marca que o miolo é interpolado.

## CP-13f.1 — Motor de lentes + acunhamento (corrige cruzamento na CAUSA)

Investigação: o cruzamento do CP-13f persistia (print do usuário: faixas azul/âmbar
em X entre SPT-05↔SPT-04). Diagnóstico: casamento por ordem dentro da família
(CP-13f) resolvia cruzamento INTRA-família, mas não INTER-família. Causa real:
SPT-04 é Areia(4m)–Argila(9m)–Areia(1m); a areia de SPT-05 (embaixo) casava com
a 1ª areia de SPT-04 (topo), atravessando a argila.

Pesquisa (Wikipedia pinch-out, interfingering, AAPG cross section): cortes
profissionais NÃO cruzam faixas — usam acunhamento (pinch-out) e lentes. Usuário
especificou regra geotécnica em várias rodadas de perguntas.

REGRA FINAL (decisões do usuário):
- Lente fina (≤ limiar, default 2m, CONFIGURÁVEL no painel) entre blocos da MESMA
  família (areia–[argila fina]–areia) = inclusão local. Colapsa: a família fica
  contígua p/ casar (elimina ambiguidade → sem cruzamento). Lente vira triângulo.
- Lente RECORRENTE (≥2 furos, mesma família + cota próxima, tol 2m) tem
  continuidade lateral → PROMOVE a camada normal (não é mais lente).
- Bloco sem-par: cunha acunhando. Borda (1º/último do furo) → vão 100%; meio →
  50%. Ponta aponta p/ cota do bloco correspondente no vizinho (cotaMaisProxima).
- Lente solitária → triângulo afina 50% do vão em ambas direções (some no meio).
- Casamento ordinal MANTIDO (1ª↔1ª). Inversão SEM lente (argila espessa 9m, caso
  SPT-04) PODE cruzar — aceito como geologicamente AMBÍGUO (decisão do usuário:
  não inventar certeza que o geólogo não tem).

IMPLEMENTAÇÃO (casamentoCamadas.js):
- detectarLentes(blocos, limiar): marca ehLente + familiaEnvolvente (interno +
  envolvido pela mesma família + fino).
- promoverLentesRecorrentes(blocosPorFuro, tolCota): lente em ≥2 furos → ehLente
  false + promovida true.
- colapsarLentes(blocos): remove lentes, funde família envolvente contígua;
  retorna { blocosParaCasar, lentes }.
- processarSequenciaFuros(furos, {limiarLente_m, tolCotaLente_m}): orquestra
  detecção→promoção→colapso→casamento; expõe blocosPorFuro[].lentes e
  par.cunhasA/cunhasB (com tipoCunha borda|meio + cotaAlvo).
- classificarBordaOuMeio, cotaMaisProxima: helpers exportados.

DESENHO (CorteEsquematicoSVG.jsx, perfilInterpretado ON):
- Cunhas: polygon triângulo [topo-borda, base-borda, ponta-no-vão]. frac=1.0
  borda, 0.5 meio. fillOpacity 0.30.
- Lentes: triângulo p/ esquerda e/ou direita, alcance 50% colW, fillOpacity 0.45
  (mais marcada — dado pontual). Prop limiarLente_m (default 2) → useMemo dep.

UI: campo numérico "Lente ≤ N m" (0.5–5, step 0.5) na barra do modo desenho, só
visível com perfilInterpretado ON. Estado limiarLente no modal, persistido em
obra.corteEsquematico.limiarLente_m (estadoInicial + migração + fecharEPersistir).

Validado: 37 testes casamento (era 26) — detecção, limiar configurável (3m vira
lente), colapso (areia 7m contígua), promoção recorrente, borda/meio. Build 96
módulos, regressão 32.84, geometria 12, engine 216, 0 vulns. NÃO testado visual.

## CP-13f.2 — Correção do cruzamento: pareamento por proximidade de cota

Feedback do usuário (sem imagem, descrição textual precisa): camadas ainda
cruzavam; a última areia de SPT-04 (areia argilo-siltosa, base) ligou-se à
metade da areia de SPT-05 formando triângulo órfão.

Diagnóstico (inspeção Node): o casamento ORDINAL do CP-13f ligava a areia de
SPT-05 (base, 246→239) com a 1ª areia de SPT-04 (TOPO, 254→250) → faixa Granular
SUBIA cruzando a Coesiva. A areia de baixo de SPT-04 (241→240) ficava sem par →
cunha triangular órfã (o triângulo estranho que o usuário viu).

Decisão do usuário: reverter para PROXIMIDADE DE COTA (havia sido proposta antes,
mas o usuário preferira ordinal; o resultado visual provou que proximidade é
necessária).

Fix (casarBlocos): dentro de cada família, monta TODOS os pares candidatos (A,B)
com dist = |centroA - centroB|, ordena por dist e consome greedy (cada bloco uma
vez). Liga base-com-base e topo-com-topo naturalmente. Excedente → cunha.

Resultado validado (SPT-05↔SPT-04):
- Antes: Granular A:246→239 ↔ B:254→250 (CRUZAVA).
- Agora: Granular A:246→239 ↔ B:241→240 (base, NÃO cruza). Coesivo A:253→246 ↔
  B:250→241. Ordem vertical preservada nos dois furos.
- Areia do topo de SPT-04 (254→250) agora é cunha de borda (acunha p/ cima, alvo
  250.3) — comportamento natural, sem triângulo órfão.

Testes: teste 6 reescrito (proximidade: areia A 248 casa com B 247 mais próxima,
não 1ª 250; 1ª de B vira cunha). Teste 8b novo (caso SPT-05↔SPT-04: areia casa
com a de baixo topoB<245; Granular/Coesivo sem inverter ordem). 37→39 testes.
Build 96, regressão 32.84, geometria 12, 0 vulns. NÃO testado visual.

NOTA: inversão sem lente com argila espessa — antes "aceita como ambígua", agora
a proximidade RESOLVE a maioria desses casos também (liga base-base). Cruzamento
só restaria em geometria muito patológica (3+ blocos alternados invertidos), raro.

## CP-13g — Sobreposições ao perfil (terreno + NA + sem-SPT)

3 toggles novos (default ON): mostrarTerreno, mostrarNA, mostrarSemSPT. Adicionados
a estadoInicial + migração + defaults do modal + TOGGLES_DEF. itensParaDesenho
agora passa naInicial_m/naFinal_m dos furos. Build 96, regressão 32.84, 39+12
testes, engine 216, 0 vulns.

#3 SUPERFÍCIE DO TERRENO: polyline marrom (#78350F) ligando topos dos furos na
ordem da sequência (furosSeq filtra furos com índice de coluna). Marca ▽ em cada
topo. Liga só furos (estacas não entram na linha do terreno).

#1 NÍVEL D'ÁGUA: por furo, cotaNA = cotaTopo - naFinal (ou naInicial fallback).
Símbolo: linha horizontal COR_NA (#06B6D4) na largura da coluna + "▽ NA" ao lado.
Liga os NAs entre furos com polyline azul tracejada. SÓ desenha onde naFinal/
naInicial != null. Balsas tem ambos null → nada aparece (degrada bem, não quebra).

#6 TRECHO SEM SPT: para cada estaca, topoPerfil = max(cotaTopo dos furos da seq).
Se cotaArrasamento_m > topoPerfil → trecho entre arrasamento e topoPerfil recebe
hachura cinza clara (pattern hatch-semspt, #CBD5E1) + rótulo "sem SPT" rotacionado.
Representa que a engine trata arrasamento acima do perfil como sem atrito.

Validado: topos variam (254.49/253.75/254.82) → terreno irregular; NA null →
nada; arras > topoPerfil → sem-SPT, arras dentro → não. NÃO testado visual.

## ✅ RESOLVIDO (CP-13h) — CRUZAMENTO DE CAMADAS (perfil interpretado)

STATUS: RESOLVIDO. Causa-raiz identificada por diagnóstico determinístico (diag.mjs)
e corrigida no CP-13h. Ver a seção CP-13h ao final deste arquivo para o conserto.
O texto abaixo é o HISTÓRICO das tentativas anteriores (mantido para referência).

HISTÓRICO DE TENTATIVAS:
1. CP-13f: casamento por ORDEM ordinal dentro da família (1ª↔1ª). Resolveu intra-
   família, mas inter-família cruzava (areia de baixo de um furo ligava com areia
   de cima do outro, atravessando argila). Pior: gerava cunha triangular órfã.
2. CP-13f.1: motor de LENTES (colapsa lente fina ≤limiar entre mesma família;
   promove lente recorrente). Resolve casos COM lente fina, mas o caso real
   SPT-05↔SPT-04 tem argila ESPESSA (9m), não é lente → continuou cruzando.
3. CP-13f.2: pareamento por PROXIMIDADE DE COTA (greedy, base↔base). Resolveu o
   caso SPT-05↔SPT-04 nos testes Node (Granular liga base 241 com base 239, não
   cruza; ordem vertical preservada). MAS usuário diz que visualmente AINDA cruza.

HIPÓTESES PARA INVESTIGAR NA PRÓXIMA SESSÃO:
- O cruzamento que resta pode ser de OUTRO par de furos (não SPT-05↔SPT-04), ou
  envolver as CUNHAS (não as faixas casadas) cruzando as faixas.
- Os triângulos de LENTE podem estar cruzando faixas (desenhados sem checar
  sobreposição com as conexões).
- As cunhas de borda (vão 100%) podem cruzar faixas casadas adjacentes — uma cunha
  que afina o vão todo passa por cima de outras faixas no caminho.
- Possível solução estrutural: em vez de casar par-a-par e desenhar trapézios/
  triângulos independentes, construir as FRONTEIRAS como polilinhas contínuas ao
  longo de TODA a sequência (cada fronteira de família é uma curva única ligando
  todos os furos), e preencher entre fronteiras consecutivas. Isso garante que
  preenchimentos nunca se sobreponham (são faixas empilhadas, não trapézios soltos).
  É uma reescrita maior do modelo de desenho — provavelmente o caminho correto.
- Pedir ao usuário um print anotado do caso EXATO que ainda cruza (qual furo, qual
  camada) — sem isso, depuração é por hipótese.

ARQUIVO CHAVE: casamentoCamadas.js (lógica) + CorteEsquematicoSVG.jsx (desenho dos
polígonos, cunhas, lentes). A lógica de não-cruzamento das FAIXAS está provada nos
testes; o problema provável está em CUNHAS/LENTES ou em pares não testados.

## CP-13h — Correção definitiva do cruzamento: pareamento por SOBREPOSIÇÃO de cota

CAUSA-RAIZ (provada em diag.mjs): o cruzamento NÃO estava nas cunhas nem em pares
não testados (hipóteses do CP-13f.2 estavam erradas). Estava no pareamento de
SPT-01↔SPT-05. As famílias estão INVERTIDAS: SPT-01 = Areia(topo)/Argila(base);
SPT-05 = Argila(topo)/Areia(base). A regra antiga (proximidade de cota dentro da
família, sem exigir sobreposição) ligava as DUAS areias entre si — a areia rasa
de SPT-01 (254→252) com a areia profunda de SPT-05 (246→239) — porque eram as
únicas Granular. Essa conexão atravessava a conexão Argila↔Argila, gerando o X.
O mesmo defeito ocorria, oculto, em SPT-01↔SPT-02 (areia rasa × areia profunda
atravessando 17m de argila).

DECISÃO DO USUÁRIO (regra do "solo em frente", consolidada em 4 rodadas + 2 imagens
conceituais): dois blocos só se ligam por trapézio se forem da MESMA família E se
suas faixas de cota se SOBREPUSEREM (ou tocarem). "O solo que o bloco encontra do
outro lado" é o que está na MESMA cota no vizinho — não uma camada de mesma família
em qualquer profundidade. Uma areia a 246m não "encontra" uma areia a 253m do outro
furo atravessando 7m de argila: ela acunha.

IMPLEMENTAÇÃO (casamentoCamadas.js):
- casarBlocos REESCRITO: candidatos = mesma família + sobreposição ≥ 0 (toque conta,
  para preservar casos base-com-base). Ordena por MAIOR sobreposição (empate → menor
  distância de centro). Greedy 1-para-1 com REJEIÇÃO DE CRUZAMENTO: par (Ai↔Bi) e
  (Aj↔Bj) cruzam sse (Ai<Aj) !== (Bi<Bj), usando a ordem vertical (índice) dos blocos.
- A 'brusca' (tipoTransicao Granular↔Coesivo) torna-se efetivamente código morto:
  conexões agora são sempre mesma família ('gradiente'); contatos inter-família são
  representados por cunhas, não por bandas. Deixado como está (sem churn).

GEOMETRIA DAS CUNHAS (classificarCunha — 3 casos, decisão do usuário + imagens):
- BORDA (1º/último bloco): triângulo atravessa o vão INTEIRO (frac 1.0); ponta no
  TOPO do vizinho (se bloco do topo) ou na BASE do vizinho (se de baixo).
- INTERIOR FINO (espessura ≤ limiar, padrão 2,00m): triângulo afina até o PONTO
  MÉDIO do vão (frac 0.5) e some, no nível médio do próprio bloco ("como lente").
- INTERIOR ESPESSO (> limiar): triângulo atravessa o vão INTEIRO (frac 1.0) e
  termina no nível MÉDIO do próprio bloco projetado no vizinho ("maior que lente").
  Só ocorre quando o solo em frente é de família DIFERENTE; se fosse igual, casaria
  por trapézio (decisão explícita do usuário).
- CorteEsquematicoSVG.jsx: o frac fixo (borda?1.0:0.5) foi trocado por cunha.frac
  (com fallback). cotaAlvo já era consumido. Os 3 modos (ligarCamadas, ligarHachuras,
  perfilInterpretado) consomem par.conexoes → corrigidos juntos. As cunhas só
  aparecem no perfilInterpretado.

RESULTADO VALIDADO (diag.mjs, topologia = desenho à mão do usuário):
- SPT-01↔SPT-05: Argila↔Argila (trapézio). Areia de topo de SPT-01 → cunha borda,
  alvo 253.75 (topo de SPT-05). Areia de base de SPT-05 → cunha borda, alvo 235.49
  (base de SPT-01). DETECÇÃO DE CRUZAMENTO: ok (não cruza).
- SPT-05↔SPT-04: Argila↔Argila + Areia↔Areia de baixo (241.82). Areia de topo de
  SPT-04 → cunha borda, alvo 253.75. Não cruza.

TESTES: teste 7 CORRIGIDO — exigia 2 conexões (codificava o bug: ligava areias não
sobrepostas); agora exige 1 (só argila) + 2 cunhas Granular. Teste 6 mantém resultado
(comentário atualizado: contato de cota). Testes 11 (geometria das 3 cunhas:
borda→topo/base do vizinho; espesso 9m→frac 1.0 próprio centro; lente 1m→frac 0.5) e
12 (não-cruzamento real SPT-01↔SPT-05: 1 conexão Coesiva, 2 areias acunham) ADICIONADOS.
39→48 testes casamento. Regressão 32.84 ✓, geometria 12 ✓, build 96 ✓, 0 vulns ✓.

ISOLAMENTO PROVADO: src/engine/ NÃO importa casamentoCamadas nem CorteEsquematico
(grep vazio). Dependência unidirecional (casamento importa GeoSPT, nunca o inverso).
Logo a mudança não pode afetar os 216 testes da engine; o test-esm (32.84 tf) confirma.

CASO LATENTE (não exercido pelo Balsas — sinalizado ao usuário): quando um bloco
espesso interior fica em frente a um vizinho que TEM a mesma família em OUTRA cota
(fora da sobreposição), ou quando uma argila contínua de um furo está em frente a
uma argila dividida por lente no vizinho (poderia "abrir em leque" 1-para-muitos).
A implementação atual é 1-para-1 (conecta ao de maior sobreposição; o outro acunha).
O Balsas real não tem órfão interior, então esse ramo fica LATENTE e não pôde ser
validado visualmente. Decisão pendente do usuário se/quando surgir um dataset assim.

NÃO TESTADO VISUALMENTE nesta sessão (limite de imagens). Pedir ao usuário que
exporte o SVG do corte (perfil interpretado + ligar camadas) e confirme.

NOTA DE AMBIENTE: o .npmrc do projeto continha `prefix=/home/claude/.npm-global`,
específico do contêiner, que quebra `npm install`/`npm run build` em qualquer outro
ambiente (conflito de prefix do npm). Removido do entregável (mantida só a linha
PLAYWRIGHT_BROWSERS_PATH). Se o seu fluxo depender desse prefix, re-adicione localmente.

## CP-13h.1 — Sincronizar "ligar camadas" com perfil + FAN-OUT (leque)

Feedback do usuário (Balsas + exemplo ilustrativo de areia ensanduichada):

ISSUE A (Balsas, PRIORIDADE): "ligar camadas" deve representar o RESULTADO FINAL do
"perfil interpretado". Causa: o perfil desenhava trapézios + cunhas + lentes; o
"ligar camadas" desenhava SÓ as linhas das conexões (sem cunhas nem lentes), então
uma camada que acunha sumia no modo linha. CONSERTO (CorteEsquematicoSVG.jsx):
(1) larguraCol movida para ANTES da seção de conexões, para os DOIS modos usarem a
mesma borda de coluna; (2) offset das linhas trocado de colW*0.28 para larguraCol/2
(as linhas tracejadas coincidem com as bordas dos preenchimentos quando ambos ON);
(3) bloco "(b2) CUNHAS em forma de LINHA" adicionado ao if(ligarCamadas): desenha as
duas arestas convergindo até a ponta, mesma geometria (frac, cotaAlvo) do perfil;
(4) bloco de lentes passou a `if (perfilInterpretado || ligarCamadas)` com helper
desenhaLado(sinal,sufixo) — polígono no perfil, linhas no ligar camadas.

BUG 1 — FAN-OUT (leque), o "1-para-muitos" que estava LATENTE no CP-13h: NÃO era
latente. Diagnóstico determinístico (diag_lente.mjs, areia ~2m no meio de SPT-05 e
SPT-04, SPT-01 só argila) mostrou que o argilão contínuo de SPT-01 ligava SÓ à argila
de BAIXO de SPT-05; a argila de CIMA virava cunha espúria (origem da cunha branca no
topo-esquerdo dos prints). CONSERTO (casamentoCamadas.js): helper sobrepoeCota +
função ramificar(orfaosVizinho, ladoQueRamifica), chamada em casarBlocos ANTES do
sort/return: ramificar(semParB,'A') e ramificar(semParA,'B'). Para cada conexão, busca
órfãos do lado oposto da MESMA família que o bloco fixo também cruza (sobreposição≥0);
se houver, monta alvos (bloco original + extras, topo→base), parte a aresta do bloco
fixo nos pontos médios dos vãos (com clamp ao intervalo), e substitui a conexão por
uma por alvo (campo ramificado:true). NÃO cruza (sub-faixas empilhadas na ordem dos
alvos). Teste 13 (a-e) ADICIONADO. 48→53 testes casamento.

BALSAS NÃO REGRIDE: nenhum leque dispara (os blocos de areia candidatos NÃO se
sobrepõem em cota — o filtro sobrepoeCota≥0 os rejeita). Conexões/cunhas idênticas ao
1-para-1. Confirmado por diag_balsas.mjs. Regressão 32.84 ✓, geometria 12 ✓, build ✓.

BUG 2 — PENDENTE (decisão do usuário): o frac da cunha de uma camada RECORRENTE
(promovida) ainda depende do limiar — no exemplo sintético a areia acunha com
frac=1.0 (espesso) em 0.5/1.5 e frac=0.5 (lente) em 2.0, porque classificarCunha
re-aplica a espessura>limiar e NÃO checa bloco.promovida. Opção A (recomendada,
geologicamente honesta): promovida → SEMPRE espesso (frac 1.0), consistente em todos
os limiares (faz 2.0 virar igual a 1.5/0.5). Opção B: preservar a aparência de 2.0
(lente/0.5) e fazer 1.5/0.5 baterem com ela. A decide pela continuidade lateral
comprovada; B pela aparência-referência que o usuário citou. AGUARDANDO escolha.

LIMITE DE REPRODUÇÃO (honesto): a reconstrução sintética dá 0.5 ≡ 1.5 (idênticos),
mas o usuário relata 0.5 ≠ 1.5 nas imagens. Logo o dataset sintético NÃO bate com o
ilustrativo do usuário (a areia dele deve ter espessura na faixa (0.5, 1.5], OU há uma
camada fina não-recorrente que vira lente em 1.5 mas não em 0.5 — comportamento que
seria CORRETO, pois o limiar controla a detecção de lente de camadas NÃO recorrentes).
NÃO dá para diagnosticar o caso exato sem o JSON da obra ilustrativa do usuário.

NÃO TESTADO VISUALMENTE (limite de imagens). Pedir ao usuário: (1) exportar o SVG do
corte Balsas (perfil + ligar camadas) para confirmar o ISSUE A e o fan-out;
(2) exportar o JSON da obra ilustrativa para reproduzir o BUG 2 e o 0.5≠1.5.

## CP-13h.2 — ELIMINAÇÃO DE LENTES + hachura real + cunha sempre até a face oposta

DECISÃO DO USUÁRIO (após inspeção dos SVGs Balsas/Ilustrativo e do JSON real): eliminar
por completo o conceito de "lente". Toda camada é SOLO REAL. O triângulo de acunhamento
(cunha) SEMPRE atravessa o vão inteiro (frac 1.0) e alcança a FACE do furo oposto — nunca
afina no meio. Pediu também a HACHURA real e que o perfil interpretado preencha até a face
oposta (buraco branco circulado de vermelho perto do SPT-01).

CAUSA-RAIZ do "0,5 ≠ 1,5" (FINALMENTE encontrada com o JSON Exemplo_Ilustrativo.json): as
duas areias têm espessuras DIFERENTES — SPT-05 = 1 m (cota 247,75→246,75) e SPT-04 = 2 m
(247,82→245,82). Com limiar 1,5 a areia de 1 m do SPT-05 era detectada como lente e, por
N�O ser recorrente *como lente* (a de SPT-04, 2 m, não era lente em 1,5), não era promovida
→ colapsada → SPT-05 virava só argila. Topologias distintas entre 0,5 e 1,5. Era impossível
reproduzir com a reconstrução sintética anterior (areias iguais) — por isso o diagnóstico
ficou em aberto no CP-13h.1. A decisão de eliminar lentes mata essa inconsistência na raiz.

MUDANÇAS:
1. casamentoCamadas.js — processarSequenciaFuros REESCRITO: não roda mais o pipeline de
   lentes (detectar/promover/colapsar). agruparEmBlocos(f) vira blocosParaCasar direto;
   lentes:[] sempre. O parâmetro de limiar foi descontinuado (ignorado; `void opcoes`).
   A topologia passa a ser IDÊNTICA para qualquer limiar (provado, ver abaixo).
2. casamentoCamadas.js — classificarCunha: removido o caso INTERIOR FINO ('lente', frac 0.5).
   Agora só há 'borda' (frac 1.0, mira topo/base do vizinho) e 'interior' (frac 1.0, mira o
   próprio nível médio projetado na face do vizinho). 5º parâmetro (limiar) removido.
3. casamentoCamadas.js — REMOVIDAS as funções mortas detectarLentes, colapsarLentes e
   promoverLentesRecorrentes (116 linhas). Confirmado por grep que nada em src/ as usava
   (apenas os testes diretos). classificarBordaOuMeio e cotaMaisProxima mantidas.
4. CorteEsquematicoSVG.jsx — HACHURA real: o modo "Ligar hachuras" trocou o preenchimento
   sólido fraco (corFamiliaFraca) pelos patterns diagonais reais url(#hatch-FAMILIA),
   fillOpacity 0.55 — os mesmos das colunas. Adicionado bloco (b3) que hachura também as
   CUNHAS (triângulos), eliminando buracos brancos no acunhamento. import órfão
   corFamiliaFraca removido. Param limiarLente_m removido da assinatura/uso/deps.
5. ModalCorteEsquematico.jsx — REMOVIDO o input "Lente ≤ N m" da toolbar e o estado
   limiarLente/setLimiarLente; fecharEPersistir persiste { sequencia, toggles } (sem limiar).
6. test-casamento.mjs — removidos os testes 10a–10e (lente) e os imports das 3 funções;
   mantido o teste de classificarBordaOuMeio (fixture renomeado furoTresCamadas). Testes
   11c/11d atualizados: interior agora 'interior' frac 1.0 (era 'espesso'/'lente'). 53→45.

VALIDAÇÃO DETERMINÍSTICA (dataset ilustrativo REAL, via motor congelado):
- Blocos: SPT-01 = 1 argila (19 m); SPT-05 = argila/areia(1 m)/argila; SPT-04 =
  argila/areia(2 m)/argila — areias agora são blocos NORMAIS, lentes=0.
- Topologia IDÊNTICA entre limiares 0,5 / 1,5 / 2,0 → o "0,5 ≠ 1,5" ELIMINADO.
- Todas as cunhas com frac=1,0; nenhuma 'lente'.
- SPT-01↔SPT-05: argila ramifica em LEQUE (2 conexões), SEM cunha de argila espúria;
  a areia do SPT-05 vira cunha interior frac=1,0 alvo=247,25 → CHEGA à face do SPT-01.
- SPT-05↔SPT-04: areia(1 m) conecta areia(2 m); argilas conectam acima e abaixo.

VALIDAÇÃO VISUAL (NOVA TÉCNICA — agora FEITA): SSR do componente real via
esbuild (--format=cjs --packages=external --alias:@=./src --jsx=automatic) + react-dom/server
renderToStaticMarkup, rasterizado com cairosvg. Inspecionados os PNGs do ilustrativo
(só_perfil, só_hachura, perfil+hachura) e do Balsas (perfil+hachura). CONFIRMADO:
(a) o buraco branco SUMIU — a cunha da areia vai até a face do SPT-01; (b) a hachura são
linhas diagonais reais cobrindo trapézios E cunhas; (c) Balsas NÃO regrediu (mesma
topologia aprovada, agora com hachura). Defeito cosmético pré-existente, não pedido: labels
de NSPT sobrepõem labels de cota junto às colunas estreitas — deixado para um CP futuro.

PENDÊNCIA (cosmética, opcional): campo vestigial limiarLente_m:2 ainda existe em
estadoInicial.js e ObraProvider.jsx (inerte — nada lê). Pode ser removido num próximo passo.

## CP-13h.3 — "Sem SPT" distinto + mini-mapa de seleção legível

Dois ajustes de feedback visual do usuário (print do modal de seleção + SVG exportado).

PROBLEMA 1 — trecho "sem SPT" indistinguível do corpo da estaca. Diagnóstico: a coluna
da estaca era desenhada por inteiro (fundo #E2E8F0 + hatch-estaca cinza-escuro #475569 +
contorno sólido grosso) e o overlay "sem SPT" apenas ADICIONAVA por cima uma 2ª hachura
cinza-clara (#CBD5E1, opacity 0.6). Cinza sobre cinza → diferença quase nula.
CORREÇÃO (CorteEsquematicoSVG.jsx):
- pattern hatch-semspt redesenhado: crosshatch (linhas cruzadas) ÂMBAR #D97706 — textura de
  atenção, não diagonal-simples como a da estaca.
- o bloco de desenho do trecho agora COBRE a estaca naquele pedaço: (1) rect branco opaco
  para apagar o cinza do pilar; (2) crosshatch âmbar; (3) borda âmbar tracejada (3 2);
  (4) rótulo "sem SPT" em âmbar bold. Resultado: o trecho não investigado contrasta tanto
  com a estaca cinza (com solução) quanto com a vermelha (sem solução). Validado por SSR nos
  dois estados (E-04 arras 257 > topo do perfil 254,82).

PROBLEMA 2 — mini-mapa de seleção com ícones/textos minúsculos. Causa-raiz: viewBox 320×320
comprimido para height:200px no contêiner → marcadores de ~12px viravam ~8px na tela e
fontes 9px viravam ~5,6px. CORREÇÃO (MiniMapaSelecao.jsx):
- contêiner 200px → 280px (mais pixels reais).
- marcadores maiores: triângulo do furo de ~12→~20px; losango da estaca 12→18px; badge de
  ordem r 7→9; fontes: nome 9→13, badge 9→12.
- LATERALIDADE dos rótulos (pedido do usuário): estaca → texto à ESQUERDA do ícone
  (text-anchor end); furo → texto à DIREITA (text-anchor start); centrados verticalmente no
  ícone (era todos embaixo, centralizados). O badge de ordem foi para o lado OPOSTO ao
  rótulo, para não colidir. Além de organizar, reduz a sobreposição quando furo e estaca
  caem em coords próximas.
- margens da escala agora ASSIMÉTRICAS: margemLateral 70 (folga p/ os rótulos que saem para
  os lados) × margemVert 40. Corrige o vazamento dos rótulos de furos na borda direita
  (SPT-04/SPT-02 eram cortados). Constante `pad` simétrica antiga removida.

VALIDAÇÃO VISUAL (SSR): mini-mapa renderizado com os dados reais do Balsas (5 furos + 4
estacas + sequência de 6 itens da imagem do usuário) — marcadores legíveis, rótulos
lateralizados corretos, sem vazamento. Corte com E-04 (sem-SPT) nos dois estados de solução.
Regressão 32,84 ✓, casamento 45 ✓, geometria 12 ✓, build ✓.

LIMITAÇÃO conhecida (cosmética): quando uma estaca e um furo têm coordenadas IDÊNTICAS
(ex.: E-01 e SPT-05 em 12,5/12,5 no Balsas), os rótulos "E-01" (esq.) e "SPT-05" (dir.)
ainda se aproximam do ícone central — fisicamente inevitável sem deslocar rótulos de itens
co-localizados. A lateralização já evita o empilhamento que havia antes. Melhoria opcional
futura: detectar co-localização e deslocar verticalmente um dos rótulos.

NOTA SOBRE A LEITURA DO SVG via cairosvg (ambiente): o SSR do React não emite o atributo
xmlns nem width/height absolutos (o componente usa style height:100%). Para rasterizar,
injetar `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="320"
height="320">` antes de passar ao cairosvg, senão o PNG sai em branco.

## CP-13h.4 — mini-mapa maior/proporcional + remoção do .npmrc (aviso npm)

Dois ajustes de feedback do usuário.

1. MINI-MAPA ocupa mais espaço (pedido: "aumentar proporcionalmente, afastar dos elementos
   abaixo"). MiniMapaSelecao.jsx:
   - viewBox 320×320 → 400×300 (proporção mais larga, casa melhor com a coluna w-1/2 do
     modal, que é larga). A escala interna continua preservando o aspecto REAL dos dados
     (1m X = 1m Y) — o viewBox maior só dá mais "moldura".
   - estratégia do contêiner mudou de {height:280px; svg width:auto} para {div w-full; svg
     width:100%, height:auto}. Antes o SVG quadrado travava em ~340px de largura deixando
     ~220px vazios à direita da coluna; agora preenche a largura (~560px numa tela 1184),
     ficando de fato proporcionalmente maior, não só mais alto.
   - legenda afastada: mt-1 → mt-4 (mais respiro abaixo do mapa).
   - margens da escala mantidas (margemLateral 70 × margemVert 40); sem vazamento de rótulos.
   Validado por SSR (viewBox 400×300, sequência da imagem do usuário): marcadores em tamanho
   confortável, lateralidade ok, SPT-04/SPT-02 inteiros.

   LIMITAÇÃO da validação: o efeito real de "ocupar mais espaço" depende do navegador aplicar
   width:100% dentro da coluna; o SSR/cairosvg só confirma o layout INTERNO do viewBox, não o
   tamanho final na tela. O usuário deve confirmar no app.

2. AVISO DO NPM: `npm warn Unknown project config "PLAYWRIGHT_BROWSERS_PATH"`. O .npmrc
   continha só essa linha (PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers), que é uma VARIÁVEL DE
   AMBIENTE, não config de npm — resíduo do contêiner de desenvolvimento. O projeto não usa
   Playwright (grep confirmou). CORREÇÃO: .npmrc REMOVIDO por completo. Verificado: npm
   install não emite mais o aviso. IMPORTANTE no empacotamento: NÃO incluir .npmrc no staging
   (senão o aviso volta).

Regressão 32,84 ✓, casamento 45 ✓, geometria 12 ✓, build ✓.

---

## CP-14 — Formato de estaca (circular/quadrada), dimensão livre e alerta A6

### O que mudou

1. ENGINE (geospt-engine.js) — diff mínimo e RETROCOMPATÍVEL, pré-validado:
   - `AV_F1_F2_fn(tipoEstaca, diametro_m, B_m)` — novo 3º parâmetro opcional
     (dimensão transversal). Pré-moldada: F1 = 1 + B/0,80 quando B_m vier;
     senão deriva de diametro_m como sempre.
   - `_calcularGenerico`: Ap_m2 e U_m aceitam `opcoes.area_ponta_m2` e
     `opcoes.perimetro_m` (quadrada: Ap=L², U=4·L); ausentes → π·D²/4 e π·D,
     idêntico ao comportamento anterior. `B_m = opcoes.dimensaoTransversal_m ?? D_m`.
   - As 2 chamadas de AV_F1_F2_fn passam B_m.
   VALIDAÇÃO: 216 testes verdes (32,84 tf · casamento 45 · geometria 12);
   chamada sem campos novos produz memorial BYTE A BYTE idêntico ao anterior;
   quadrada L=0,40: Ap=0,1600, U=1,600, razão Q quad/circ = 4/π = 1,2732 exata;
   F1: L=0,40→1,50; L=0,60→1,75.

2. MODELO (domain/estacas.js):
   - `estaca.formato` ('circular' padrão | 'quadrada', só pré-moldada) e
     `estaca.dimensao_m` (diâmetro ou lado, m).
   - INVARIANTE: `diametro_m` é ESPELHO de `dimensao_m`, sempre preenchido.
     Por isso consumidores legados (largura no corte, mini-mapa, check da
     Aba 6, engine sem campos novos) funcionam sem alteração.
   - Migração em carregarObra: estaca antiga (só diametro_m) →
     formato='circular', dimensao_m=diametro_m (normalizarEstacaFormato).
   - O AV_F1_F2_fn RECONSTRUÍDO dos coeficientes customizados (ObraProvider)
     foi alinhado à assinatura de 3 parâmetros.

3. UI (Aba 5): dropdown de diâmetro REMOVIDO → campo numérico livre em cm;
   seletor de formato aparece apenas para pré-moldada. Geometria propaga à
   engine por UM único ponto: construirOpcoesCalculo (usado por Aba 6, corte,
   XLSX, PDFs e auditoria).

4. ALERTA A6 — dimensão fora da faixa usual (15–120 cm, diâmetro OU lado):
   - Preenche a lacuna histórica da numeração (A6 não existia).
   - É o único alerta sobre ESTACA (os demais analisam sondagens): exibido
     inline no formulário, na listagem da Aba 5 (badge + painel) e gravado no
     JSON de auditoria (campo `alertaA6` por estaca). NÃO bloqueia salvamento
     nem cálculo. Constantes: A6_DIMENSAO_MIN_M=0,15; A6_DIMENSAO_MAX_M=1,20.

5. CARGA ESTRUTURAL da quadrada: a tabela da engine é indexada por DIÂMETRO
   de seção circular. DECISÃO: lado_cm é usado como CHAVE EQUIVALENTE
   (opção prevista no prompt do CP-14) — conservadora, pois
   A_quadrada = L² > π·L²/4 = A_circular, logo a capacidade estrutural real
   da quadrada é maior que a tabelada para o círculo de mesma dimensão.
   A UI declara isso explicitamente e recomenda o override do fabricante
   (`cargaEstrutural_tf_custom`, que tem precedência). Dimensão sem entrada
   na tabela (qualquer formato) → Qadm_estrutural = null (sem limite
   estrutural automático, aviso na UI) — NENHUM valor é inventado.
   Motivo da decisão: a alternativa (UI dizendo "sem valor" enquanto a
   engine, via diametro_m espelhado, aplica o valor tabelado) criaria
   divergência entre UI e memorial — inaceitável.

### Cabos soltos conhecidos
- `validation.validarEstaca` (engine) ainda valida diâmetro contra a tabela
  e rejeitaria dimensões livres — porém NÃO é chamada por nenhum arquivo do
  app (verificado por grep). Se for ativada no futuro, precisa de revisão.


### CP-14f — Ajustes pós-validação do usuário

1. A6 TAMBÉM no painel da Aba 4 (construirAlertas.jsx), entre A5 e A7,
   severidade 'info' — agregando todas as estacas fora da faixa numa única
   entrada. Permanece na Aba 5 (inline + painel) e no JSON de auditoria.
2. GEOMETRIA DA SEÇÃO (A_p e U) agora visível em 5 locais:
   - Modal da estaca (ao vivo, sob o campo de dimensão);
   - Detalhamento da Aba 6 (linha "Geometria da seção" no topo, lendo
     dq.Ap_m2/dq.U_m do memorial da engine — valores EFETIVOS do cálculo);
   - Cabeçalho da estaca nos PDFs (blocoEstacaCabecalho — herda nos dois);
   - Linha de cabeçalho dos memoriais XLSX (Ap=...m² | U=...m);
   - JSON de auditoria: bloco estaca.geometriaSecao
     {area_ponta_m2, perimetro_m, dimensaoTransversal_m}.
   Racional: A_p e U são constantes por estaca — exibir por linha do
   memorial seria ruído; o cabeçalho é o local canônico. Na Aba 6 a fonte é
   o memorial da engine (não recomputado), garantindo fidelidade ao cálculo.


---

## CP-15 — Diagrama de transferência de carga estaca-solo (AOKI 1979)

### Escopo e blindagem
Visualização nova, em modal de tela cheia, aberta por um botão em cada método
(DQ e AV) no resumo da Aba 6 (modo Envoltória). ENGINE INTOCADA: tudo é derivado
do memorial que a engine já produz. Os 216 testes da engine permanecem verdes sem
alteração; 3 testes canônicos preservados (32,84 · 45 · 12) e nova suíte
`test-transferencia.mjs` (33 asserções).

Arquivos novos: `src/abas/AbaCapacidade/TransferenciaCarga/{transferenciaHelpers.js,
DiagramaTransferenciaSVG.jsx, ModalTransferenciaCarga.jsx}` e `test-transferencia.mjs`.
Edições: `CardResumoCalculo.jsx` (botão + modal por método) e `ConteudoPerfilUnico.jsx`
(passa `params` para o FSg). Escopo só na Envoltória; componente recebe tudo por
props (memorialLinha, estaca, metodo, FSg, naProf_m) para reuso futuro nos demais modos.

### Teoria (AOKI 1979, doc. TQS) e fontes dos dados
Definições por linha de memorial: PL = Ql_total_kN (atrito lateral último total — já
EXCLUI a camada do "último metro desprezado"/bulbo; NUNCA somar camadasAtrito);
PP = Rp_final_kN; PR = Rrup_kN = PL+PP (validado bit a bit); Ap = Ap_m2 (respeita
formato circular/quadrada do CP-14). PL(z) = atrito acumulado do topo, interpolado
linear no metro, usando só camadas com Ql válido.

Três cenários de carga no topo (P):
- RUPTURA: P = PR; N(z) = PR − PL(z); ponta = PP. Não usa Modelo A/B.
- PREVISTA: P = carga prevista cadastrada na estaca (serviço).
- PREVISTA×FS: P = carga prevista × FSg (estado-limite último).
A carga dos cenários 2/3 é SEMPRE a prevista do usuário — nunca a Qadm calculada.
Plotabilidade: cenário 2/3 só traça se P ≤ PR; sem carga prevista ou P>PR → aviso, sem gráfico.

Dois modelos (cenários 2/3):
- Modelo A: N(z) = max(P − PL(z), 0). Ponto B (P−PL(z)=0) quando P<PL; abaixo, N=0.
- Modelo B: P≤PL → N(z) = P·(1 − PL(z)/PL); P>PL → N(z) = P − PL(z) (atrito saturado:
  ponta recebe P−PL; nesse regime B≡A). DECISÃO validada com o usuário: a fórmula
  proporcional pura só vale em P<PL (regime do documento); em P>PL a página 1 do
  documento manda Pp=P−PL — manter a proporcional levaria a N_base=0, fisicamente
  incorreto. B difere de A apenas em P<PL (Fig. 10.3).
Ponta de trabalho (2/3): max(P−PL,0); ponta da ruptura: PP.
Tensão: σ(z) = N(z)/Ap (MPa). Conversões tf↔kN pela constante CANÔNICA da engine
(GeoSPT.util — KN_POR_TF=9,80665), não pelo /9,81 hardcoded da UI antiga.

### CP-15c/d — correções pós-revisão visual
1. CARGA ESTRUTURAL como referência por ESTADO-LIMITE (correção conceitual do
   usuário): a carga estrutural da tabela é ADMISSÍVEL (com FS embutido). Comparar
   ruptura ou carga última (sem/maior FS) com a admissível mistura estados-limite.
   Regra final: cenário "Carga prevista" (serviço) compara P_prev vs C_adm; cenários
   "Prevista×FS" e "Ruptura" (último) comparam vs C_adm × FSg (admissível elevada ao
   último). C_adm nunca altera o traçado — só referência ao projetista.
2. FUSTE ACIMA DAS SONDAGENS (causa-raiz do bug do NaN na E-04): quando o
   arrasamento está acima do topo das sondagens (aterro, alerta A9), as camadas
   superiores vêm com Ql_camada_kN indefinido. O `construirPLz` antigo somava-as
   (ac += undefined → NaN), contaminando toda a série e apagando as curvas.
   Correção: `cotaTopoSolo` = topo da 1ª camada com Ql finito; acima dela o atrito é
   nulo e N(z)/σ(z) permanecem CONSTANTES = P (solução física indicada pelo usuário),
   decaindo só a partir do topo do solo. PLz itera apenas camadas com Ql finito.
   Linha "topo do solo" marcada no desenho. 3 testes novos travam a regressão.
3. RENDERIZAÇÃO DEFENSIVA: a série descarta pontos com N/σ/cota não-finitos; se
   sobrar <2 pontos, exibe aviso em vez de eixos quebrados — a tela nunca mais
   mostra "NaN".
4. UI: identificação da estaca em LINHA SIMPLES vertical, dentro do SVG, colada ao
   desenho (E-01 · Hélice Contínua · Ø40cm · L=14m); cota DUPLA no eixo Y
   (absoluta │ relativa); rótulos de N e σ em cada metro inteiro; σ_topo recua da
   borda direita para não cortar; altura dinâmica (30px/m) → scroll no modal para
   estacas longas (decisão do usuário: scroll, não densidade adaptativa).

### Cabo solto deixado para o CP-16
Tensões máximas admissíveis do material por norma (limite estrutural visível no
diagrama de σ): no cenário "Ruptura" a σ_topo pode exceder qualquer fck usual
(ex.: E-04 ~15,6 MPa) — é correto (mostra que a estrutural rege antes da ruptura
geotécnica), mas falta a linha-limite normativa. Planejado para o CP-16.
