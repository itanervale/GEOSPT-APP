# GeoSPT — Vite

Aplicativo de análise SPT e capacidade de carga de estacas (Décourt-Quaresma e
Aoki-Velloso). Engine v2.0.7 validada com 216 testes (190 sintéticos + 26 Balsas).

## Pré-requisitos

- Node.js ≥ 20 (Vite 7 recomenda ≥ 20.19.0; Node 18 ainda funciona, mas será descontinuado)
- npm ≥ 9 (vem com Node)

## Versões fixadas

| Pacote | Versão | Observação |
|---|---|---|
| Vite | ^7.3.3 | LTS estável, auditoria limpa |
| @vitejs/plugin-react | ^5.2.0 | Compatível com Vite 4–8 |
| React, React-DOM | ^18.3.1 | React 19 é major bump separado, fora deste escopo |
| Tailwind CSS | ^3.4.19 | Mantém config tradicional `tailwind.config.js` (Tailwind 4 é re-escopo) |
| PostCSS | ^8.5.15 | — |
| Autoprefixer | ^10.5.0 | — |

**`npm audit` retorna 0 vulnerabilidades** nesta combinação. Verificado em maio/2026.

## Setup

```bash
npm install
```

Demora 1–2 minutos na primeira vez. As deps somam ~70 MB em `node_modules`.

## Desenvolvimento

```bash
npm run dev
```

Abre automaticamente `http://localhost:5173`. Hot reload ativo — edite qualquer
arquivo em `src/` e o navegador atualiza.

## Build de produção

```bash
npm run build
```

Gera bundle em `dist/`. Pré-visualizar local:

```bash
npm run preview
```

## Estrutura

```
src/
├── main.jsx          # entry point
├── App.jsx           # raiz: provider + tabs + disclaimer
├── index.css         # tailwind directives
├── engine/           # núcleo matemático (v2.0.7) — não modificar sem critério
├── state/            # ObraProvider (context global)
├── domain/           # mapeamentos, classificações (lógica pura, sem React)
├── components/       # UI reutilizável (Banner, Modal, inputs, viz SVG)
├── layout/           # Header, Tabs
├── abas/             # uma pasta por aba do app (1–7)
└── utils/            # hash, canonicalize, helpers genéricos
```

## Checkpoints de migração

Esta base nasceu da decomposição de um artifact único de 9.265 linhas. A
migração segue 13 checkpoints (CP-1 a CP-13). Estado atual:

- ✅ **CP-1** — Setup base do Vite
- ✅ **CP-2** — Engine v2.0.7 + dataset Balsas + ObraProvider + EngineGuard
- ✅ **CP-3** — UI base + Header + Tabs + 7 stubs de aba
- ✅ **CP-4** — Aba 1 Identificação real + diagnóstico colapsável
- ✅ **CP-5** — Aba 2 Sondagens (sidebar + painel + leituras NSPT)
- ✅ **CP-6** — Aba 3 Compatibilização + PerfilGeotecnicoSVG nas Abas 2 e 3
- ✅ **CP-7** — Aba 4 Análise Crítica (alertas A1-A10 + sugestão de domínios)
- ✅ **CP-8a** — Aba 5 Locação de Estacas: cadastro + mini-mapa + configs básicas
- ✅ **CP-8a.1** — Refinamento do mini-mapa (aspect ratio real, grade+escala, símbolos, furo crítico, bolhas de domínio, resumo)
- ✅ **CP-8a.2** — Seleção interativa (Context `elementoSelecionado` + clique no mapa + painel detalhe) + botão "Limpar domínios" na Aba 4
- ✅ **CP-8b** — Editor de coeficientes completo (DQ, AV, FS, redutor)
- ✅ **CP-9a** — Aba 6 base: modo Envoltória ponta-a-ponta + Perfil médio 2.1/2.2 + card resumo DQ×AV + cota sugerida conservadora
- ✅ **CP-9b** — Memorial detalhado (toggle simples/detalhado + linha expandível) + Curva Q×cota SVG
- ✅ **CP-9c** — Modos Por furo, Interpolação, Perfis paralelos (2.3) + Comparativo entre modos — **Aba 6 completa**
- ✅ **CP-9c.1** — Correções pós-validação: Comparativo usa Cenário B (pior caso) consistente com abas individuais; NSPTs do atrito lateral no detalhamento
- ✅ **CP-9c.2** — Critério canônico "ambos atendem": cota mais rasa onde DQ E AV atendem juntos; sem isso, não sugere cota (corrige bug de interseção)
- ✅ **CP-9d** — Carga estrutural editável por estaca (override + aviso >30%); 1 alteração retrocompatível na engine (ver NOTAS_TECNICAS)
- ✅ **CP-9d.1/9d.2** — Transparência do atrito lateral: parâmetros por camada no painel expandido — β (DQ) e K/α/F2 (AV) ao lado do NSPT de cada camada; tabela de atrito AV adicionada
- ✅ **CP-9d.3** — Coluna Q_l acumulado nas duas tabelas de atrito (DQ e AV); pula a camada desprezada e fecha com R_l total
- ✅ **CP-10a** — Aba 7 (Saídas): XLSX (SheetJS 0.20.3 via npm) + JSON funcionais; PDFs como stub
- ✅ **CP-10b** — JSON de auditoria (resultados calculados, arquivo separado) + PDF compacto (memorial de 1 estaca)
- ✅ **CP-10c** — PDF completo (multi-estaca, todos os modos + auditoria com 7 tabelas de coeficientes) — **Aba 7 completa**
- ✅ **CP-10c.1** — Bug NaN no Modo 4 corrigido na engine (1 furo distante → `furo_unico_disponivel`); 216 testes revalidados
- ✅ **CP-10d** — Gráficos SVG nos PDFs: mini-mapa de locação + perfil compatibilizado + curva Q×cota (completo); perfil + curva da envoltória (compacto)
- ✅ **CP-10d.1** — Painel de camadas no mini-mapa da Aba 5 (item 10): liga/desliga Furos, Estacas, Nomes, Grade, Domínios
- ✅ **CP-10d.2** — Rótulos do mini-mapa em lados opostos (furo à direita, estaca à esquerda) — resolve sobreposição quando furo e estaca coincidem
- ✅ **CP-11** — Smoke test integrado: build produção (88 módulos), 216 testes engine, 10/10 integração ponta a ponta, 0 vulnerabilidades (ver SMOKE_TEST_CP11.md)
- ✅ **CP-11.1** — Sanitização anti-injeção no XLSX (formula injection / OWASP) + legenda do perfil compatibilizado movida para rodapé horizontal (Aba 3 + PDF)
- ✅ **CP-12a** — Domínios geotécnicos: schema `obra.dominios[]` + `estaca.dominioId` + migração de JSON antigo (`furo.dominioGeotecnico`→`dominios[]`) + helper `obterFurosDoDominio`. SEM filtro de cálculo ainda (regressão 32.84 preservada) (você está aqui)
- ✅ **CP-12b** — UI de domínios: modal "Gerenciar domínios" (lista+edição), campo dominioId no modal de estaca (badge + aviso Modo 4 se <3 furos), coluna na tabela, mini-mapa colorido por domínio, sugestão k-means grava no schema novo. SEM filtro de cálculo ainda (você está aqui)
- ✅ **CP-12c** — Filtro de cálculo por domínio: os 4 modos usam só os furos do domínio da estaca (Aba 6, comparativo e auditoria JSON); estaca sem domínio = comportamento atual (regressão 32.84); Modo 4 bloqueado se domínio <3 furos; badge de filtro na Aba 6. **CP-12 COMPLETO**
- ✅ **CP-12d** — Visualização da compatibilização por domínio na Aba 3: toggle "ver por domínio" (default off) + seletor Global/Domínio N; gráfico e tabela refletem o subset. Estende a SPEC (decisão F preservada como padrão; extensão é opt-in e só visual)
- ✅ **CP-13a** — Cota de arrasamento decimal (campo ÚNICO `cotaArrasamento_m`): aceita decimal, mas o cálculo usa `Math.floor` (conservador, a favor da segurança). Indicador na Aba 6 mostra a cota usada quando decimal. Engine inalterada (floor na borda: `construirOpcoesCalculo` + `prepararPerfilCalculo`); regressão 32.84 intacta; decimal 253.7 ≡ inteiro 253. Revisão: unificado a pedido do usuário (eliminado o 2º campo da SPEC) (você está aqui)
- ✅ **CP-13b** — Algoritmo de casamento de camadas (função pura, sem UI): `derivarFamilia` (reusa tabela da engine), `agruparEmBlocos` (consecutivas de mesma família; NSPT não separa), `casarBlocos` (liga blocos de mesma família topo↔topo/base↔base, mergulho = desnível; casa com cotaTopo mais próxima; sem par = interrupção brusca), `tipoTransicao` (gradiente/brusca por decisão A). 23 testes (test-casamento.mjs), validado com Balsas real (você está aqui)
- ✅ **CP-13c** — Modal do corte (seleção sequencial): botão "📐 Corte esquemático" na Aba 5, modal fullscreen 2 colunas (esquerda: MiniMapaSelecao clicável + lista de seleção agrupada por tipo / direita: lista ordenável da sequência), ordem por clique + subir/descer/remover, "todos furos/estacas/limpar", validação 1 estaca + 2 furos, máx 10 itens. Lista resolve sobreposição no mapa (ex.: SPT-05/E-01 em coords idênticas). Placeholder onde o SVG entra (13d) (você está aqui)
- ✅ **CP-13d** — SVG do corte esquemático (React, reativo): colunas de furos (blocos por família + hachura, NSPT, cota, ★ impenetrável), estacas (pilar ∝ diâmetro, "atravessa X"), conexões com mergulho, eixos, média topos. Toggles, exportar SVG, 3 proteções contra falsa continuidade (disclaimer no SVG, conexões fracas, aviso furos distantes >25m). Geometria pura (12 testes). **CP-13 COMPLETO**
- ✅ **CP-13d.1** — Ajustes do corte (feedback visual): modo tela cheia (corte ocupa largura total quando válido, com "✏ Editar seleção" para voltar), seleção persiste no estado da obra + JSON (com migração e filtragem de itens removidos), checkbox do bulbo de tensão removido, rótulo de solo dentro de cada bloco, lista de seleção reposicionada (mini-mapa menor, colunas 50/50) para não ficar escondida 
- ⏳ CP-12 — Commit 7-B (domínios geotécnicos)
- ⏳ CP-13 — Commit 8 (corte esquemático)
- ⏳ CP-12 — Commit 7-B (domínios geotécnicos)
- ⏳ CP-13 — Commit 8 (corte esquemático)

## Validação do CP-9c

Critério de aceite (Balsas + E-01):

1. `npm install && npm run dev` levanta sem erros
2. **Aba 6 → tab "Por furo":**
   - Tabela com 5 furos, Q_adm DQ/AV por furo, furo crítico (★) destacado
   - Clicar num furo → card + curva + memorial daquele furo
3. **Tab "Interpolação"** (E-01 tem coordenadas):
   - Card com Q_adm DQ/AV interpolado + divergência
   - "Influência dos furos" (% de aparição)
   - Tabela de pesos por cota expansível (peso × valor por furo)
4. **Tab "Perfil médio" → submodo 2.3:**
   - 2 ramos lado a lado (Coesivo azul, Granular âmbar; Intermediário vazio é omitido)
   - Cada ramo com card + memorial expansível
5. **Tab "⚖ Comparativo":**
   - 4 modos em paralelo, modo mais conservador (★ roxo)
   - Dispersão entre modos (%)
6. **Estaca sem coordenadas** → Interpolação mostra erro claro
7. **Aba 1 (validar engine)** continua 32.84 tf
8. `npm run build` gera bundle ~380 KB (gzip ~106 KB) sem warnings

Se algum passo falhar, **não avançar para CP-10**.

## Validação do CP-9b

Critério de aceite (Balsas + E-01, modo Envoltória):

1. `npm install && npm run dev` levanta sem erros
2. **Aba 6 → E-01 → Envoltória:**
   - Card resumo (do 9a) no topo
   - **Curva Q_adm × cota** logo abaixo: DQ azul sólida, AV verde tracejada, linha vermelha vertical da carga prevista (50 tf), legenda no canto
   - **Memorial cota a cota** abaixo da curva
3. **Memorial — modo Simples (default):** colunas R_l, R_p, Q_geo, Q_final, rege para DQ e AV; linha sugerida (239 m) em **amarelo com ★**
4. **Toggle 🔬 Detalhado:** adiciona colunas Solo/N_p/NSPTs (ponta), C/α (DQ), K/α/F1/F2 (AV)
5. **Clicar numa linha** → expande `DetalhamentoLinha`: ponta DQ passo-a-passo (q_p, R_p, redutor, FS), ponta AV, e tabela de camadas de atrito
6. **Hover nos pontos da curva** → tooltip com cota + Q_adm + rege
7. **Trocar estaca** (E-03 raiz, E-04 premoldada) → curva e memorial recalculam
8. **Aba 1 (validar engine)** continua 32.84 tf
9. `npm run build` gera bundle ~361 KB (gzip ~102 KB) sem warnings

Se algum passo falhar, **não avançar para CP-9c**.

## Validação do CP-9a

Critério de aceite (Balsas + E-01):

1. `npm install && npm run dev` levanta sem erros
2. **Carregar Balsas (demo)** → **Aba 6**:
   - Seletor de estaca no topo (E-01 a E-04)
   - Tabs de modo: Envoltória | Perfil médio | Por furo | Interpolação | ⚖ Comparativo
3. **Modo Envoltória (default) com E-01:**
   - Card de 3 colunas: Décourt-Quaresma | Aoki-Velloso | Divergência
   - Cota de ponta sugerida (conservadora) = **239 m** (ambos atendem 50 tf)
   - Q_adm coerente, badge de regência (geo/estr)
4. **Trocar para Perfil médio → submodos 2.1 / 2.2** funcionam (2.3 mostra stub CP-9c)
5. **Por furo, Interpolação, Comparativo** → mostram stub "🔒 Será habilitado no CP-9c"
6. **CurvaQxCota e Memorial** → mostram stub "🔒 CP-9b"
7. **Trocar estaca** (E-02, E-03 raiz, E-04 premoldada) → recalcula
8. **Aba 1 (validar engine)** continua 32.84 tf
9. `npm run build` gera bundle ~338 KB (gzip ~98 KB) sem warnings

Se algum passo falhar, **não avançar para CP-9b**.

## Validação do CP-8b

Critério de aceite:

1. `npm install && npm run dev` levanta sem erros
2. **Aba 5 → Configurações globais → 📋 Editor de coeficientes (completo)** — botão antes desabilitado agora **funciona**
3. **Clicar no editor expande** mostrando 7 seções colapsáveis (Tabela 1.3 até 1.9)
4. **Expandir Tabela 1.3 (DQ_C)** → 15 solos editáveis, coluna "Padrão (kPa)" + "Valor em uso"
5. **Editar uma célula** (ex.: "Argila Silto-Arenosa" de 100 → 200) → badge **customizado** (laranja) aparece no header do editor + botão **↺ Restaurar TODOS aos padrões**
6. **Range plausível**: digitar valor fora do range (ex.: DQ_C = 50 → ok, DQ_C = 30 → ⚠ âmbar)
7. **Tabela 1.4 (DQ_α)** — presets "original" e "modificada" funcionam; toast amber-warning visível
8. **Restaurar tabela individual** (↺ ao lado de cada seção aberta) — só zera aquela tabela
9. **Restaurar TODOS** — zera tudo, badge "customizado" some
10. **Exportar JSON** → custom values persistem em `obra.parametros.coeficientesCustomizados`
11. **Importar JSON com customizações** → editor abre com badge "customizado"; valores corretos exibidos
12. **Aba 1 (validar engine)** continua mostrando 32.84 tf com defaults; muda quando há custom values
13. `npm run build` gera bundle ~318 KB (gzip ~92 KB) sem warnings

Se algum passo falhar, **não avançar para CP-9**.

## Validação do CP-8a.1

Critério de aceite (Balsas):

1. `npm install && npm run dev` levanta sem erros
2. **Aba 5 → mini-mapa profissional:**
   - Aspect ratio REAL: obra de 25×25m aparece como quadrado perfeito; obra retangular aparece retangular
   - **Grade leve** com ticks proporcionais (em Balsas: a cada 5 ou 10m)
   - Eixos com labels "X (m)" e "Y (m)"
   - **Escala gráfica** no canto inferior esquerdo: barra "0—10 m" (ou múltiplo redondo)
3. **Símbolos diferenciados:**
   - Furos = círculos cheios (cor cinza-escuro ou cor do domínio)
   - Estacas = **losangos vermelhos**
   - SPT-01 (furo crítico) = círculo + **anel vermelho tracejado** + ícone ⚠
4. **Tooltip** ao passar mouse sobre furo: mostra nome, X/Y, cota topo, prof. final, domínio
5. **Tooltip** ao passar mouse sobre estaca: nome, X/Y, tipo, diâmetro, cota arrasamento, carga prevista
6. **Bolhas de domínio:** Balsas não tem domínios atribuídos por default → nenhuma bolha aparece. Use Aba 4 ("Calcular sugestão de domínios") e "Aplicar agrupamento" para ativá-las.
7. **Legenda fixa** abaixo do SVG: ● Furo SPT, ◆ Estaca, ⊙ Furo crítico
8. **Resumo numérico:**
   - "Furos plotados: 5 / 5"
   - "Estacas plotadas: 4 / 4"
   - "Furo crítico: **SPT-01** (85% das cotas)"
9. **Tabela de estacas compactada** (item 7): cabe sem rolagem horizontal em larguras médias; mini-mapa ganhou ~140px de largura (520 vs 380)
10. `npm run build` gera bundle ~294 KB (gzip ~88 KB) sem warnings
11. Aba 1 (validar engine) continua mostrando 32.84 tf

Validação CP-8a (cadastro funcional, continua valendo):
- **+ Adicionar estaca**: modal abre, nome E-XX pré-preenchido, salvar funciona
- **Editar estaca** (✎): modal com dados; validação de cota não-inteira gera erro
- **Remover estaca** (✕): modal de confirmação
- **Configurações globais**: checkboxes + radios persistem no JSON
- **Editor completo (CP-8b)**: botão 🔒 cinza desabilitado

Se algum passo falhar, **não avançar para CP-8b**.

## Engine

A engine `geospt-engine.js` (v2.0.7) está em `src/engine/` como ES module.
O IIFE original foi preservado intacto; apenas o envelope foi adaptado para
coexistir com `import { GeoSPT } from '@/engine/geospt-engine'` no Vite e
simultaneamente popular `globalThis.GeoSPT` (compatibilidade legacy).

A bateria de regressão (`geospt_validacao_node_runner.js`) continua servindo
como suite de testes — adaptada para tolerar a sintaxe `export const` ao
carregar via `vm.runInContext`.

Critério de regressão canônico: cota 242m, hélice contínua D=0.40m, arrasamento
em 253m → **Q_adm = 32.84 tf** (Décourt-Quaresma). Validado em CP-2 dentro do
Vite via teste `test-esm.mjs`.

## Comandos úteis

```bash
# limpar tudo e reinstalar
rm -rf node_modules dist package-lock.json && npm install

# verificar tamanho do bundle
npm run build && du -sh dist/

# rodar engine standalone (validação)
node ../path/to/geospt_validacao_node_runner.js
```

## Licença

Uso interno. Sem dependência institucional pública.
- ✅ **CP-13d.2** — Refinamentos do corte: lista de seleção visível (mini-mapa altura fixa 200px no wrapper, não estica); ponta da estaca = cota sugerida do Modo 1 (envoltória conservadora, reusa cálculo da Aba 6); sem solução → estaca até o fundo + contorno vermelho tracejado + texto; texto "atravessa X" substituído por info da estaca (tipo, Ø, cota de ponta, regente) 
- ✅ **CP-13e** — Refinamentos (1/3 do feedback das referências geológicas): (#2) comentário "6 toggles"→5 corrigido; (#7) linha do corte A–A' no mini-mapa (polilinha na ordem da sequência, rótulos A/A', alerta vermelho se ângulo <60° = ordem espacialmente estranha); (#5) resultados da estaca no desenho (Qadm, carga, margem com cor por sinal) + 4 estados distintos (sem_carga/sem_perfil=âmbar dado incompleto; sem_cota/erro=vermelho falha) 
- ✅ **CP-13e.1** — Correção (bug do print): estaca com carga 0/'' caía em 'nenhuma cota atende' (vermelho) em vez de 'sem carga' (âmbar). Check de sem_carga agora pega null/undefined/''/≤0. Dívida registrada: cruzamento de hachuras entre furos será corrigido no CP-13f (você está aqui)
- ✅ **CP-13f** — Perfil interpretado + correção do cruzamento: (a) casamento reescrito para casar por ORDEM dentro da família (1ª areia↔1ª areia), eliminando cruzamento de conexões — 26 testes (era 23) incluindo prova anti-cruzamento; (b) 6º toggle "Perfil interpretado" (default OFF): polígonos preenchidos entre furos (cor família opacidade 0.30), colunas estreitas (~18%), alerta em camada sem par. Equilíbrio dado-vs-inferência 
- ⏳ CP-13g — Superfície do terreno + nível d'água (NA) + trecho sem-SPT
- ✅ **CP-13f.1** — Motor de lentes + acunhamento (corrige cruzamento na causa): detecta lente fina (≤ limiar configurável, default 2m, campo no painel) entre mesma família e a colapsa (família fica contígua, elimina ambiguidade de pareamento); promove lente recorrente (≥2 furos, mesma família+cota) a camada normal; blocos sem-par viram cunha acunhando (borda=vão 100%, meio=50%) apontando para a cota correspondente; lentes solitárias = triângulo até 50% do vão. Decisão: casamento ordinal mantido, cruzamento em inversão sem-lente (argila espessa) é aceito como geologicamente ambíguo. 37 testes de casamento (era 26) 
- ✅ **CP-13f.2** — Correção do cruzamento (pareamento por proximidade de cota): o casamento ordinal do CP-13f produzia o pior resultado no caso SPT-05↔SPT-04 (faixa Granular cruzando a Coesiva + cunha triangular órfã). Reescrito para parear blocos da mesma família por PROXIMIDADE DE COTA (greedy): areia de baixo↔areia de baixo, base-com-base. A areia excedente vira cunha de borda acunhando na direção natural. Elimina cruzamento E triângulo órfão. 39 testes (era 37) 
- ✅ **CP-13g** — Sobreposições ao perfil (3 toggles novos, default ON): (#3) superfície do terreno = polilinha marrom ligando topos dos furos + marca ▽; (#1) nível d'água = símbolo ▽NA por furo na cota medida (cotaTopo−naFinal) + linha azul tracejada ligando entre furos, só desenha onde há dado (Balsas tem NA null → nada aparece, degrada bem); (#6) trecho sem SPT = hachura cinza clara + rótulo quando arrasamento da estaca está acima do topo do perfil amostrado. **CP-13 e roadmap concluídos**
- ✅ **CP-13h** — Correção DEFINITIVA do cruzamento (pareamento por SOBREPOSIÇÃO de cota): diagnóstico determinístico (diag.mjs) localizou a causa-raiz em SPT-01↔SPT-05 — famílias invertidas faziam as duas areias (rasa×profunda) se ligarem atravessando a argila. Regra do "solo em frente" (decisão do usuário): só liga mesma família **cujas cotas se sobreponham**, 1-para-1, com rejeição de cruzamento; blocos sem correspondente acunham. Geometria das cunhas refinada (`classificarCunha`): borda → vão 100% até topo/base do vizinho; interior fino (≤ limiar) → 50% (lente); interior espesso (> limiar) → 100% até o próprio nível médio. Teste 7 corrigido (codificava o bug). 48 testes de casamento (era 39). Regressão 32.84 ✓, build 96 ✓, 0 vulns ✓

## ⚠️ Problema em aberto (para a próxima sessão)
O **cruzamento de camadas no perfil interpretado NÃO está resolvido a contento** segundo o usuário. Múltiplas abordagens tentadas (ordinal, proximidade de cota, motor de lentes). Ver DOC_CONTINUACAO e seção dedicada nas NOTAS_TECNICAS.
- ✅ **CP-13h.1** — Sincronizar "ligar camadas" com perfil + fan-out (leque): (A, prioridade) "ligar camadas" agora desenha as cunhas e lentes em forma de LINHA (mesma geometria do perfil preenchido), então os dois modos contam a mesma história — antes o modo linha omitia o acunhamento. (BUG 1) Fan-out: quando um bloco contínuo de um furo está em frente a vários blocos da mesma família no vizinho (separados por uma camada que pinça), ele se ramifica e liga a todos, partindo a aresta nos pontos médios dos vãos — corrige a cunha de argila espúria (era o caso "1-para-muitos" latente do CP-13h, agora exercido). Balsas não regride (nenhum leque dispara). 53 testes de casamento (era 48). Regressão 32.84 ✓, build ✓. (BUG 2 resolvido no CP-13h.2)
- ✅ **CP-13h.2** — ELIMINAÇÃO de lentes + hachura real + cunha sempre até a face oposta (decisão do usuário): toda camada é SOLO REAL — acabou o conceito de "lente". `processarSequenciaFuros` não roda mais detectar/promover/colapsar (parâmetro de limiar descontinuado; input "Lente ≤ N" removido da toolbar). `classificarCunha` agora só tem 'borda' e 'interior', ambos frac 1.0 → o triângulo SEMPRE alcança a face do furo oposto (corrige o buraco branco circulado perto do SPT-01). Hachura passou a usar os patterns diagonais reais `url(#hatch-*)` (era sólido fraco) e agora cobre também as cunhas. Funções mortas de lente removidas (116 linhas). CAUSA-RAIZ do "0,5 ≠ 1,5" achada no JSON real (areias de espessura diferente: 1 m no SPT-05 × 2 m no SPT-04 → uma virava lente em 1,5 e era colapsada); eliminada na raiz — topologia agora IDÊNTICA em qualquer limiar (provado). VALIDAÇÃO VISUAL feita via SSR (esbuild + react-dom/server + cairosvg): ilustrativo e Balsas conferidos. 45 testes de casamento (era 53; −8 dos testes de lente). Regressão 32.84 ✓, build ✓
- ✅ **CP-13h.3** — "Sem SPT" distinto + mini-mapa de seleção legível (feedback visual): (1) o trecho "sem SPT" da estaca era indistinguível do corpo (cinza-claro sobre cinza-escuro) — agora cobre a estaca naquele pedaço com fundo branco + crosshatch ÂMBAR + borda âmbar tracejada, contrastando tanto com estaca cinza quanto vermelha; (2) mini-mapa de seleção tinha ícones/textos minúsculos (viewBox 320 comprimido a 200px) — contêiner 200→280px, marcadores e fontes maiores, rótulos LATERALIZADOS (estaca à esquerda do ícone, furo à direita, por pedido do usuário), badge de ordem no lado oposto, margens laterais maiores para os rótulos não vazarem. Validado por SSR com dados reais do Balsas. Regressão 32.84 ✓, casamento 45 ✓, build ✓
- ✅ **CP-13h.4** — mini-mapa maior/proporcional + remoção do .npmrc: (1) mini-mapa de seleção agora ocupa mais espaço (viewBox 320×320 → 400×300, mais largo; contêiner passou a preencher a largura da coluna com width:100% em vez de travar no quadrado de ~340px; legenda afastada com mt-4) — fica proporcionalmente maior, não só mais alto; (2) removido o `.npmrc` que continha apenas `PLAYWRIGHT_BROWSERS_PATH` (variável de ambiente, resíduo do contêiner, não usada pelo projeto) — elimina o aviso `npm warn Unknown project config "PLAYWRIGHT_BROWSERS_PATH"`. Regressão 32.84 ✓, casamento 45 ✓, build ✓ (você está aqui)
