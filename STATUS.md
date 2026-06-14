# STATUS DO PROJETO — GeoSPT

> Documento de situação para apoiar a **elaboração do Manual de Utilização em HTML**.
> Última atualização: junho/2026 · Engine v2.0.7 · App v2.0.7

---

## 1. O que é o GeoSPT

Aplicação web (roda no navegador, sem backend) para **análise de sondagens SPT** e
**cálculo de capacidade de carga de estacas** pelos métodos **Décourt-Quaresma** e
**Aoki-Velloso**, conforme a **NBR 6122:2022**. Uso em apoio a projetos geotécnicos.

**Stack:** React 18.3 · Vite 7 · Tailwind CSS 3.4 · SheetJS (xlsx) · jsPDF (via impressão
do navegador). JavaScript, **sem TypeScript**. Alias `@/` → `src/`.

**Característica central:** todo o processamento é local (no navegador). **O app NÃO
persiste dados** — o usuário exporta/importa a obra em JSON.

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
| Aba 4 — Análise | ✅ Completa (alertas A1–A10 + sugestão de domínios) |
| Aba 5 — Estacas | ✅ Completa |
| Aba 6 — Capacidade | ✅ Completa (4 modos + comparativo) |
| Aba 7 — Saídas | ✅ Completa (XLSX, PDF, JSON) |
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
NSPT metro a metro. Trata trecho impenetrável / NSPT acima do limite (preserva valor real).
**Requer ≥ 2 sondagens** para compatibilizar.

### Aba 3 — Compatibilização (`id: compatibilizacao`)
Alinha furos por **cota absoluta**, gerando perfil consolidado. Slider de janela de
compatibilização (modo rascunho, commit explícito via "Recalcular"); seletor de domínio;
layout 2 colunas (tabela densa + perfil SVG). Empty state se < 2 sondagens.

### Aba 4 — Análise (`id: analise`)
Análise crítica automática. (1) Contagem por severidade (críticos/moderados/info);
(2) lista de alertas **A1–A10** como cards; (3) sugestão de agrupamento em domínios
geotécnicos (k-means simplificado — só roda ao clicar em "Calcular"; aplicar grava
`dominioGeotecnico` em cada sondagem). Inclui comparação cota de arrasamento × média dos
topos (limite ±2,5 m → alimenta alertas A9/A10).

#### Alertas da Aba 4 (texto fiel ao código — NÃO inventar; A6 não existe)

A análise gera alertas conforme limites técnicos. **Não existe A6** (pulado na numeração).
Quando não há estacas cadastradas, A9 vira a variante informativa `A9_info`.

| ID | Severidade | Título | Dispara quando | Implicação (resumo) |
|----|-----------|--------|----------------|----------------------|
| **A1** | 🚨 crítico | Furo crítico domina a envoltória | Um furo domina a envoltória inferior em > 60% das cotas | Resultado depende demais de um único furo; pode estar enviesado. |
| **A2** | ⚠ moderado | Inversões de resistência entre cotas adjacentes | NSPT cai > 5 golpes entre cotas vizinhas | Pode indicar lente mole, transição litológica ou erro de leitura. Verificar laudo. |
| **A3** | ⚠ moderado | Subamostragem em parte do perfil | > 30% das cotas têm menos de 3 furos representados | Compatibilização pouco robusta; considerar sondagem complementar. |
| **A4** | ⚠ moderado | Heterogeneidade de famílias entre furos | > 20% das cotas têm famílias diferentes entre furos | Transição lateral de litologia; avaliar perfis paralelos ou domínios distintos. |
| **A5** | ℹ info | Nível d'água não registrado | Nenhuma sondagem tem NA (inicial/final) | Não afeta Décourt/Aoki, mas é relevante para recalques e empuxo. |
| **A7** | ⚠ moderado | Sondagens paralisadas por solicitação do contratante | Furo com critério de paralisação = solicitação do contratante | Camadas inferiores não amostradas; capacidade pode ser sub/superestimada. |
| **A8** | ⚠ moderado | Inversão de grande magnitude | NSPT cai > 10 golpes entre cotas | Inversão acentuada; verificar erro de transcrição ou lente encoberta. |
| **A9** | ⚠ moderado | Aterro espesso previsto sob a estaca | Cota de arrasamento > 2,5 m **acima** da média dos topos | Aterro espesso; verificar material, compactação, sondagens no aterro. |
| **A9_info** | ℹ info | Verificação A9/A10 pendente | Não há estaca cadastrada com cota de arrasamento | Cadastrar estaca na Aba 5 para a verificação. |
| **A10** | ⚠ moderado | Corte elevado previsto sob a estaca | Cota de arrasamento > 2,5 m **abaixo** da média dos topos | Corte elevado; possível desconfinamento e redução de capacidade. |

> Mapeamento de severidade para os badges do manual: crítico → badge `critica`;
> moderado → badge `media` (ou `alta`, a critério); info → badge `baixa`.

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
Exportações: **XLSX** (memorial por modo + comparativa + colunas de auditoria, via SheetJS),
**PDF** (compacto e completo — gerados via janela de impressão do navegador, botão
"Imprimir / Salvar como PDF"), **JSON de auditoria** (entrada + resultados + hashes de
integridade; é o formato de "obra salva").

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
- ⚠️ Sem isso, **fechar a aba = perder o trabalho** (não há persistência no navegador).

---

## 6. Avisos e pontos críticos (devem aparecer no manual)

1. **Aviso técnico / responsabilidade:** estimativas semiempíricas; NÃO substituem a análise
   e a responsabilidade técnica do projetista. (O app exibe esse aviso no rodapé.)
2. **Não persiste dados:** exportar JSON antes de fechar.
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
Testes da engine: `node test-esm.mjs` (regressão canônica → **32,84 tf**),
`node test-casamento.mjs`, `node test-geometria-corte.mjs`.

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
