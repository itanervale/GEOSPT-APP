# STATUS DO PROJETO — GeoSPT

> Documento de situação para apoiar a **elaboração do Manual de Utilização em HTML**.
> Última atualização: outubro/2026 · Engine v2.0.7 · App v2.0.7

---

## 1. O que é o GeoSPT

Aplicação web (roda no navegador, sem backend) para **análise de sondagens SPT** e
**cálculo de capacidade de carga de estacas** pelos métodos **Décourt-Quaresma** e
**Aoki-Velloso**, conforme a **NBR 6122:2022**. Uso em apoio a projetos geotécnicos.

**Stack:** React 18.3 · Vite 7 · Tailwind CSS 3.4 · SheetJS (xlsx) · jsPDF (via impressão
do navegador). JavaScript, **sem TypeScript**. Alias `@/` → `src/`.

**Característica central:** todo o processamento é local (no navegador). A obra é salva
**automaticamente no navegador** (autosave em localStorage, CP-17), mas o backup forte e
portável continua sendo exportar/importar a obra em JSON.

---

## 2. Estado geral — PRONTO PARA USO

O app está **funcional e validado** em todas as 7 abas. A engine de cálculo está
**congelada** (216 testes verdes: 190 sintéticos + 26 do caso de referência Balsas).
O desenvolvimento recente concentrou-se no **Corte Esquemático** (checkpoints CP-13x).

| Área | Situação |
|------|----------|
| Engine de cálculo | ✅ Congelada e validada (216 testes) |
| Aba 1 — Obra | ✅ Completa |
| Aba 2 — Sondagens | ✅ Completa |
| Aba 3 — Compatibilização | ✅ Completa |
| Aba 4 — Análise | ✅ Completa (alertas A1–A11 + sugestão de domínios) |
| Aba 5 — Estacas | ✅ Completa |
| Aba 6 — Capacidade | ✅ Completa (4 modos + comparativo) |
| Aba 7 — Saídas | ✅ Completa (XLSX, PDF, JSON da obra, JSON de auditoria, JSON de detalhamento de estacas) |
| Corte Esquemático | ✅ Funcional (perfil interpretado, hachuras, cunhas, mini-mapa) |

---

## 3. As 7 abas (fluxo de trabalho)

A ordem das abas é o fluxo sugerido, mas a navegação é livre.

### Aba 1 — Obra (`id: identificacao`)
Formulário de cabeçalho. Campos: nome da obra, localização (Município/UF), data de
cadastro, sistema de coordenadas, responsável técnico (nome/CREA), observações.
Alimenta os memoriais exportados. No rodapé há um diagnóstico técnico da engine
(expansível, discreto).

### Aba 2 — Sondagens (`id: sondagens`)
Cadastro dos furos SPT. Barra lateral com lista + botão "+ Adicionar"; painel principal
edita o furo selecionado; modal de confirmação para remoção. Por furo: nome, cota de topo,
profundidade final, critério de paralisação (ex.: impenetrável), nível d'água, leituras de
NSPT metro a metro, com solo, família e **cor** (texto livre do laudo, informativa — não
entra no cálculo). Trata trecho impenetrável / NSPT acima do limite (preserva valor real).
Ações por leitura: mover ↑/↓, duplicar ⧉, **uniformizar abaixo ⇊** (repete solo e cor nas
leituras abaixo), remover ✕. **Requer ≥ 2 sondagens** para compatibilizar.

### Aba 3 — Compatibilização (`id: compatibilizacao`)
Alinha furos por **cota absoluta**, gerando perfil consolidado. Slider de janela de
compatibilização (modo rascunho, commit explícito via "Recalcular"); seletor de domínio;
layout 2 colunas (tabela densa + perfil SVG). Empty state se < 2 sondagens. A tabela mostra
a **cor** da envoltória (da mesma leitura/furo que deu o NSPT mínimo) e a **cor da média**
(mais frequente entre os furos da família predominante; heterogênea: uma por família) —
derivadas em `src/domain/cores.js`, sem alterar a compatibilização.

### Aba 4 — Análise (`id: analise`)
Análise crítica automática. (1) Contagem por severidade (críticos/moderados/info);
(2) lista de alertas **A1–A11** como cards; (3) sugestão de agrupamento em domínios
geotécnicos (k-means simplificado — só roda ao clicar em "Calcular"; aplicar grava os
domínios em `obra.dominios[]`, schema do CP-12). Inclui comparação cota de arrasamento × média dos
topos (limite ±2,5 m → alimenta alertas A9/A10).

#### Alertas da Aba 4 (texto fiel ao código — NÃO inventar)

A análise gera alertas conforme limites técnicos. **A6** (CP-14) e **A11** (CP-16) são os
alertas sobre **estacas** e não bloqueiam o cálculo. Quando não há estacas cadastradas, A9
vira a variante informativa `A9_info`.

| ID | Severidade | Título | Dispara quando | Implicação (resumo) |
|----|-----------|--------|----------------|----------------------|
| **A1** | 🚨 crítico | Furo crítico domina a envoltória | Um furo domina a envoltória inferior em > 60% das cotas | Resultado depende demais de um único furo; pode estar enviesado. |
| **A2** | ⚠ moderado | Inversões de resistência entre cotas adjacentes | NSPT cai > 5 golpes entre cotas vizinhas | Pode indicar lente mole, transição litológica ou erro de leitura. Verificar laudo. |
| **A3** | ⚠ moderado | Subamostragem em parte do perfil | > 30% das cotas têm menos de 3 furos representados | Compatibilização pouco robusta; considerar sondagem complementar. |
| **A4** | ⚠ moderado | Heterogeneidade de famílias entre furos | > 20% das cotas têm famílias diferentes entre furos | Transição lateral de litologia; avaliar perfis paralelos ou domínios distintos. |
| **A5** | ℹ info | Nível d'água não registrado | Nenhuma sondagem tem NA (inicial/final) | Não afeta Décourt/Aoki, mas é relevante para recalques e empuxo. |
| **A6** | ℹ aviso | Dimensão de estaca fora da faixa usual | Diâmetro (circular) ou lado (quadrada) < 15 cm ou > 120 cm | Possível erro de digitação ou dimensão atípica; Abas 4 e 5 e auditoria; não bloqueia. |
| **A7** | ⚠ moderado | Sondagens paralisadas por solicitação do contratante | Furo com critério de paralisação = solicitação do contratante | Camadas inferiores não amostradas; capacidade pode ser sub/superestimada. |
| **A8** | ⚠ moderado | Inversão de grande magnitude | NSPT cai > 10 golpes entre cotas | Inversão acentuada; verificar erro de transcrição ou lente encoberta. |
| **A9** | ⚠ moderado | Aterro espesso previsto sob a estaca | Cota de arrasamento > 2,5 m **acima** da média dos topos | Aterro espesso; verificar material, compactação, sondagens no aterro. |
| **A9_info** | ℹ info | Verificação A9/A10 pendente | Não há estaca cadastrada com cota de arrasamento | Cadastrar estaca na Aba 5 para a verificação. |
| **A10** | ⚠ moderado | Corte elevado previsto sob a estaca | Cota de arrasamento > 2,5 m **abaixo** da média dos topos | Corte elevado; possível desconfinamento e redução de capacidade. |
| **A11** | ℹ aviso | Carga estrutural acima do valor de norma | Carga estrutural em uso (catálogo ou informada) > σₑ × área (Tabela 1.10) | Informa o valor de norma σₑ×A; Abas 4 e 5 e auditoria; não bloqueia. |

> Mapeamento de severidade para os badges do manual: crítico → badge `critica`;
> moderado → badge `media` (ou `alta`, a critério); info/aviso → badge `baixa`.

### Aba 5 — Estacas (`id: estacas`)
Cadastro de estacas + configurações globais. Layout 2 colunas: tabela + configurações à
esquerda, **mini-mapa** (furos e estacas) à direita. Operações: adicionar (gera próximo
nome E-XX), editar (✎), remover (✕, com confirmação). Por estaca: tipo (hélice contínua,
pré-moldada, raiz...), diâmetro, cota de arrasamento, carga prevista, coordenadas.

**Configurações globais de cálculo:**
- Desprezar atrito do último metro (bulbo) — padrão ligado;
- Aplicar fator redutor de ponta (Tabela 1.9);
- Limitar R_p ≤ R_l (regra adicional Décourt);
- Tratamento de ponta (exclusivo): `calculado` (padrão) · `R_p=0 e P_adm=R_l/2` ·
  `R_p=min(R_p,R_l)`;
- Editor de coeficientes (com presets).

Daqui se abre o **Corte Esquemático**.

### Aba 6 — Capacidade (`id: capacidade`)
Cálculo da capacidade da estaca selecionada. Seleção de estaca + modo (abas internas).
**Quatro modos** (todos ATIVOS): **Envoltória** (envoltória inferior, conservadora) ·
**Perfil médio** (com submodos) · **Por furo** (individual) · **Interpolação** (entre furos,
com pesos por cota). Mais a aba **Comparativo** (modos lado a lado). Cada modo mostra
resumo (Q_adm, carga prevista, margem colorida por sinal), detalhamento por camada e
memorial. Divergência Décourt × Aoki é sinalizada.

### Aba 7 — Saídas (`id: saidas`)
Exportações: **XLSX** (memorial por modo + comparativa + colunas de auditoria, via SheetJS;
leituras e compatibilização com cor), **PDF** (compacto e completo — gerados via janela de
impressão do navegador, botão "Imprimir / Salvar como PDF"; o completo traz a cor nas
leituras e na compatibilização, o compacto uma tabela de camadas solo/cor), **JSON da obra**
(entrada + hashes de integridade; é o formato de "obra salva", reabre no app), **JSON de
auditoria** (resultados datados, não reabre) e **JSON de detalhamento de estacas** (esquema
`geospt-detalhamento-estacas` 1.1.0, para o app de detalhamento do TQS; não reabre).

---

## 4. O Corte Esquemático (módulo de maior desenvolvimento recente)

Acessível pela Aba 5 ("📐 Corte esquemático"). É um **perfil geológico interpretado** entre
furos selecionados.

**Montagem:** no mini-mapa ou lista, selecionar furos e estacas **na ordem** (cada item
recebe número de ordem). Mínimo: 1 estaca + 2 sondagens; máximo: 10 itens. Depois "Ver
corte (tela cheia)".

**Toggles (camadas):**
- **Perfil interpretado** — preenche camadas entre furos; blocos da mesma família de solo se
  ligam por trapézios; camadas que terminam lateralmente viram **cunhas** que se estendem
  até a face do furo vizinho (frac 1,0 — NÃO há mais "lente" que some no meio do vão).
- **Mostrar NSPTs** — valores ao lado dos furos.
- **Ligar camadas / Ligar hachuras** — modos de conexão (linhas tracejadas / hachuras).
- **Preservar mergulho real** — conexões nas cotas reais (camadas inclinadas).
- **Superfície do terreno / Nível d'água / Média dos topos** — sobreposições de contexto.
- **Trecho sem SPT** — quando a cota de arrasamento de uma estaca está acima do topo
  investigado, esse trecho recebe **hachura âmbar (crosshatch)** distinta, sinalizando zona
  não investigada.

**Exportação:** botão "Exportar SVG".

**Famílias de solo:** Coesivo (argila) · Granular (areia) · Intermediário (silte).

> O perfil entre furos é **inferência por similaridade de famílias**, não dado medido. O
> próprio app exibe aviso nesse sentido; o manual deve reforçar isso.

---

## 5. Salvar / abrir obra

- **Salvar:** Exportar → JSON (`geospt_<obra>_<data>.json`). Contém todo o estado.
- **Abrir:** Importar → seleciona um JSON. Valida (`_schema: geospt-obra`) e restaura tudo.
- **Autosave (CP-17):** a obra é salva no localStorage do navegador ~1,5 s após cada
  alteração; ao reabrir, o app pergunta se deseja recuperar. É local ao navegador/máquina e
  **não substitui** o export JSON (backup forte e portável).

---

## 6. Avisos e pontos críticos (devem aparecer no manual)

1. **Aviso técnico / responsabilidade:** estimativas semiempíricas; NÃO substituem a análise
   e a responsabilidade técnica do projetista. (O app exibe esse aviso no rodapé.)
2. **Autosave não é backup:** o salvamento automático é local ao navegador; exportar o JSON
   continua sendo o backup portável.
3. **Corte é inferência:** revisar com julgamento técnico e geológico.
4. **Mínimo de 2 sondagens** para compatibilização e corte.
5. **Privacidade:** processamento 100% local; dados só saem se exportados.
6. **Caminho sem espaços:** ao rodar localmente, evitar espaços no caminho da pasta
   (causa erro de alias no Windows). Já resolvido no `vite.config.js`, mas é boa prática.

---

## 7. Execução local (para quem for testar o app e capturar telas)

```bash
npm install        # instala dependências
npm run dev        # abre em http://localhost:5173
npm run build      # build de produção em dist/
```
Testes: `node test-esm.mjs` (regressão canônica → **32,84 tf**),
`node test-casamento.mjs`, `node test-geometria-corte.mjs`, `node test-transferencia.mjs`,
`node test-persistencia.mjs`, `node test-detalhamento.mjs`, `node test-saidas-cor.mjs`,
`node test-saidas-calculo.mjs`.
(`test-casamento` e `test-geometria-corte` gravam em `/tmp/` fixo — rodam em Linux/macOS;
no Windows, ver README.)

---

## 8. Estrutura do código (referência)

```
src/
├── abas/                     # 45 arquivos — as 7 abas
│   ├── AbaIdentificacao.jsx
│   ├── AbaSondagens/
│   ├── AbaCompatibilizacao/
│   ├── AbaAnalise/
│   ├── AbaEstacas/
│   ├── AbaCapacidade/         # 4 modos de cálculo
│   ├── AbaCorteEsquematico/   # corte interpretado (foco dos CP-13x)
│   └── AbaSaidas/             # XLSX, PDF, JSON
├── components/               # 17 arquivos — UI, inputs, visualizações
├── domain/                   # regras de domínio (solos, estacas)
├── engine/                   # núcleo CONGELADO + dataset Balsas
├── layout/                   # cabeçalho, abas, navegação
└── state/                    # estado global (Context)
```

Documentação correlata no repositório: `README.md` (manual resumido),
`HISTORICO_DESENVOLVIMENTO.md` (diário dos checkpoints), `NOTAS_TECNICAS.md`
(notas técnicas detalhadas por CP), `CHECKLIST_VISUAL.md`.

---

## 9. Telas a capturar para o manual (sugestão)

Para um manual ilustrado (o modelo usa 5 screenshots numa pasta `Imagens-manual/`), sugere-se
capturar pelo menos:

1. Aba 1 — tela de identificação da obra
2. Aba 2 — painel de uma sondagem com leituras NSPT
3. Aba 3 — compatibilização (tabela + perfil)
4. Aba 4 — lista de alertas + card de domínios
5. Aba 5 — tabela de estacas + mini-mapa
6. Aba 6 — um modo de cálculo (resumo + memorial) e a aba comparativa
7. Aba 7 — opções de exportação
8. Corte Esquemático — modal de seleção e o corte em tela cheia (com hachuras)

> As capturas devem ser feitas com o app rodando (`npm run dev`), idealmente importando uma
> obra de exemplo para as telas não ficarem vazias.


## CP-14 — Formato de estaca (circular/quadrada) + dimensão livre + alerta A6

- Engine: diff mínimo retrocompatível (AV_F1_F2_fn com B_m; Ap/U aceitos via
  opcoes.area_ponta_m2/perimetro_m; B_m = dimensaoTransversal_m ?? D_m).
  216 testes verdes; chamadas legadas byte a byte idênticas.
- Modelo: estaca.formato ('circular'|'quadrada', quadrada só pré-moldada) +
  estaca.dimensao_m; diametro_m mantido como ESPELHO (retrocompatibilidade).
  Migração automática de obras antigas em carregarObra.
- UI Aba 5: campo livre de dimensão (cm) substitui o dropdown; seletor de
  formato só para pré-moldada; alerta A6 (15–120 cm) inline + painel na Aba 5
  + JSON de auditoria — NÃO bloqueia o cálculo.
- Carga estrutural: lado_cm como chave equivalente da tabela (conservador);
  override do fabricante tem precedência; sem entrada → null explícito.
- Exportações (XLSX, PDFs, auditoria) exibem formato + dimensão (Ø/lado).
- Manual e NOTAS_TECNICAS atualizados (A6 documentado).
- Validação: 32,84 tf · casamento 45 · geometria 12 · build OK · 12 checks
  sintéticos CP-14 (geometria, F1, razão 4/π, override, limites A6).


## CP-15 — Diagrama de transferência de carga estaca-solo (AOKI 1979)

- Botão "📉 Transferência de carga" por método (DQ/AV) no resumo da Aba 6
  (modo Envoltória); modal em tela cheia com 3 painéis em eixo de profundidade
  comum: desenho da estaca, esforço normal N(z) e tensão axial σ(z)=N/Ap.
- Engine INTOCADA — tudo derivado do memorial. 3 testes canônicos verdes +
  nova suíte test-transferencia.mjs (33 asserções).
- 3 cenários: Ruptura (R_rup), Carga prevista (a cadastrada), Prevista×FSg.
  2 modelos de AOKI (A/B) nos cenários de trabalho; B≡A quando P≥PL.
- Cota dupla (absoluta│relativa), valores metro a metro, identificação da
  estaca em linha simples dentro do SVG, σ_topo sem corte, scroll para
  estacas longas.
- CP-15c/d: (a) carga estrutural comparada no MESMO estado-limite (admissível
  no serviço; admissível×FSg no último/ruptura) — só referência, não altera o
  traçado; (b) fuste acima das sondagens (E-04): N/σ constantes até o "topo do
  solo" (corrige NaN na causa-raiz); (c) renderização defensiva contra valores
  não-finitos.
- Manual (5.6.1 + imagem 11), README, NOTAS_TECNICAS e HISTORICO atualizados.
- Próximo (CP-16): tensões máximas admissíveis do material por norma no diagrama.
- Validação: 32,84 tf · casamento 45 · geometria 12 · transferência 33 · build OK.


## CP-16 — Tensão admissível estrutural (Tabela 1.10) + carga estrutural por hierarquia + alerta A-11

- **Tabela 1.10** (σₑ por tipo, editável no editor de coeficientes): hélice 6, escavada a seco 5, escavada com fluido 6, pré-moldada 11, raiz 12 MPa. (Metálica 120 MPa → CP-17, ainda não no sistema.)
- **Carga estrutural admissível = σₑ × área da seção** (Opção A) — substitui a tabela por diâmetro do CP-14 como fonte de verdade; funciona para qualquer dimensão (circular/quadrada). A tabela antiga permanece na engine apenas como fallback retrocompatível (216 testes externos intactos).
- **Hierarquia do valor efetivo:** (1) override do usuário → (2) catálogo comercial (dimensões padronizadas; valores das tabelas em kN ÷10) → (3) cálculo σₑ×A. O valor efetivo é o limite estrutural em TODOS os cálculos (passado à engine via o override já existente).
- **Sugestões no cadastro:** botões clicáveis "usar catálogo" / "usar norma" + entrada manual. Catálogo: hélice (Ø27,5–100), escavada a seco (trado), escavada com fluido (estação), pré-moldada circular (vibrada) e quadrada (Tab 2.2), raiz (limite superior da faixa).
- **Alerta A-11:** dispara quando a carga estrutural em uso (catálogo ou override) > σₑ×A; informa o valor de norma. Nas Abas 4 e 5 e no JSON de auditoria. NÃO bloqueia o cálculo.
- **Diagrama de transferência:** linha vertical tracejada no painel de tensão em σ=σₑ (cenário serviço) ou σ=σₑ×FSg (último/ruptura); trecho de σ(z) acima do limite em vermelho.
- **σ → letra grega** na UI.
- **Propagação:** carga estrutural efetiva e A-11 no XLSX, PDFs e auditoria JSON (bloco cargaEstruturalAdmissivel: valor, origem, catálogo, norma, σₑ).
- Engine: 2 adições aditivas (tabela tensaoAdmissivel_MPa + util.cargaEstruturalNorma_tf). Caminho de cálculo intocado.
- Validação: 32,84 tf · casamento 45 · geometria 12 · transferência 33 · build OK.


## CP-17 — Salvamento automático (autosave) em localStorage

- **Autosave** da obra no localStorage do navegador, com debounce de ~1,5 s após
  cada alteração. Indicador no topo: "💾 salvando…" → "✓ salvo".
- **Recuperação ao abrir:** se houver obra salva, o app PERGUNTA se deseja
  restaurar (Decisão 2). Restaurar carrega sondagens/estacas/parâmetros; os
  cálculos são refeitos ao abrir a Aba 6.
- **Payload enxuto (Decisão 3):** salva entrada (sondagens, estacas, parâmetros,
  domínios, identificação, corte) SEM resultadosCalculo (recalculáveis) — payload
  pequeno, longe do limite de ~5 MB do localStorage.
- **Botão "🆕 Novo"** no Header (Decisão 4): limpa estado + autosave, com
  confirmação se houver dados.
- **Robustez (Decisão 6):** todo acesso ao localStorage em try/catch. Em janela
  anônima/storage bloqueado, autosave fica 'off' e o app segue normal; indicador
  avisa "⚠ autosave indisponível". QuotaExceeded → status 'erro' + aviso.
- **Versionamento:** grava _schemaVersao; ao carregar, recusa schema de versão
  diferente (evita crash ao atualizar o app). JSON corrompido → ignora.
- Limitação: autosave é local ao navegador/máquina; NÃO substitui o export JSON
  (backup forte e portável). Documentado no manual (5.7.1) e no callout da seção 1.
- Arquivos novos: src/state/persistenciaObra.js, src/components/RecuperacaoAutosave.jsx.
  Modificados: ObraProvider.jsx, Header.jsx, App.jsx.
- Próximo (CP-18): estaca metálica (σₑ=120 MPa).
- Validação: 32,84 · casamento 45 · geometria 12 · transferência 33 · persistência 12 · build OK.


## Exportação para detalhamento de estacas (JSON)

- Cartão novo na Aba 7: gera `geospt_detalhamento_<obra>_<data>.json` (esquema próprio
  `geospt-detalhamento-estacas`, hoje **1.1.0**) para o app de detalhamento de estacas do TQS,
  que desenha o perfil das sondagens ao lado da estaca sem calcular geotecnia.
- Conteúdo: sondagens brutas, domínios e, por estaca, furos considerados (domínio), distâncias
  e sondagem mais próxima, cota de ponta sugerida por modo (= auditoria), envoltória e
  sondagem média (submodo da UI + os 3 submodos). Engine intocada.
- Detalhes no manual (5.7.2), README e NOTAS_TECNICAS.
- Validação: test-detalhamento.mjs.


## Cor do solo (informativa)

- Para a obra conferir em campo se o solo escavado corresponde ao da sondagem. **Não entra em
  nenhum cálculo**; a compatibilização da engine não foi alterada.
- Extração por PDF (`FORMATO_EXTRACAO_NSPT.md`) traz `cor` por leitura (copiada do laudo, mesma
  grafia, repetida na camada, `null` se ausente).
- Aba 2: coluna **Cor** (texto livre); "uniformizar abaixo" copia solo e cor.
- Aba 3, XLSX, PDF completo, PDF compacto (tabela de camadas) e JSON de detalhamento 1.1.0:
  cor da envoltória (mesma leitura/furo do NSPT mínimo) e cor da média (mais frequente entre os
  furos da família; heterogênea: uma por família). Lógica em `src/domain/cores.js`.
- Validação: test-detalhamento.mjs (cor no JSON) e test-saidas-cor.mjs (XLSX/PDFs).


## XLSX e PDFs = Aba 6

- XLSX e PDFs calculam pelos mesmos caminhos da Aba 6 (`src/abas/AbaSaidas/calculoSaidas.js` →
  `prepararPerfilCalculo`): janela da obra, filtro por domínio, floor do arrasamento decimal e
  bloqueio do Modo 4 em domínio < 3 furos. Cabeçalhos mostram os furos considerados e a janela.
- Corrigido na Aba 6: o modo **por furo** passa a usar as opções completas da estaca
  (coeficientes, flags, formato, carga estrutural do CP-16) e a **interpolação** passa a usar a
  janela da obra. No Balsas, muda só o por furo da E-04 (limite estrutural); regressão 32,84 intacta.
- Validação: test-saidas-calculo.mjs.
