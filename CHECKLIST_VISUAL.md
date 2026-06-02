# ✅ Checklist Visual das 7 Abas — GeoSPT

**Como usar:** rode `npm run dev`, importe a obra de referência Balsas (Carregar
obra → JSON da Balsas) e percorra as abas na ordem. Cada item tem o **resultado
esperado** ancorado nos valores já validados. Marque [x] o que passar; anote
divergências para trazer ao chat.

> Gabarito-chave Balsas: 5 furos, furo crítico SPT-01 (85%), 20 cotas
> compatibilizadas, média dos topos 254.41 m, 4 estacas (E-01 a E-04).

---

## Aba 1 — Identificação

- [ ] Campos editáveis: nome da obra, município/UF, data, responsável, observações
- [ ] Após importar Balsas: nome = "Obra de Referência — Balsas", município = "Balsas/MA"
- [ ] Editar um campo e trocar de aba/voltar → valor persiste
- [ ] Disclaimer/rodapé persistente visível

**Risco a observar:** campo que não salva ao perder foco.

---

## Aba 2 — Sondagens

- [ ] Lista os 5 furos (SPT-01 a SPT-05)
- [ ] Selecionar um furo mostra suas leituras SPT (prof., NSPT, solo)
- [ ] SPT-01: 19 leituras, começa NSPT=3 (Areia Silto-Argilosa) na prof. 1m
- [ ] Cota topo SPT-01 = 254.485; cota absoluta da leitura 1 = 253.49
- [ ] Coordenadas visíveis (SPT-05 em 12.5, 12.5)
- [ ] Testar modal NSPT > 50: inserir um valor alto → confirma, preserva nspt_real, marca impenetrável

**Risco a observar:** o modal NSPT>50 (preserva real, marca impenetrável). Conferir
que não sobrescreve o valor real.

---

## Aba 3 — Compatibilização

- [ ] Tabela cota a cota: 20 cotas (254 a 235)
- [ ] Cota 239: NSPT envoltória = 35, solo Argila Silto-Arenosa, família Coesivo
- [ ] Cota 254: NSPT = 6, família Granular
- [ ] **Perfil compatibilizado SVG renderiza** (envoltória vermelha + ★ impenetráveis)
- [ ] Eixos legíveis (NSPT 0–50 em X, cota em Y)
- [ ] Banner/indicador de furo crítico SPT-01

**Risco a observar:** o SVG do perfil — eixos invertidos, pontos fora da área,
legenda sobreposta.

---

## Aba 4 — Análise Crítica

- [ ] Média dos topos = 254.41 m, limite ±2.5 m
- [ ] **E-04 → aterro espesso (+2.59 m)**
- [ ] **E-02 e E-03 → corte elevado (−4.41 m)**
- [ ] E-01 → sem alerta (Δ −1.41, dentro do limite)
- [ ] Alerta de inversão NSPT (1 inversão detectada)
- [ ] Alertas A9/A10 se aplicáveis

**Risco a observar:** alerta disparando para a estaca errada, ou limite ±2.5 não
aplicado.

---

## Aba 5 — Locação de Estacas

- [ ] Lista 4 estacas (E-01 a E-04) com tipo, diâmetro, arrasamento, carga
- [ ] **Mini-mapa renderiza**: 5 furos (triângulos) + 4 estacas (losangos)
- [ ] **Painel de camadas** (CP-10d.1): desmarcar Grade → grade some; Nomes → rótulos
      somem; Furos → triângulos somem; Estacas; Domínios
- [ ] **Rótulos não colidem** (CP-10d.2): SPT-05 e E-01 coincidem em (12.5,12.5) —
      SPT-05 à direita, E-01 à esquerda, sem sobreposição
- [ ] Clicar num furo/estaca → painel "elemento selecionado" + anel azul
- [ ] Editar estaca (modal): mudar carga/diâmetro → recalcula
- [ ] Campo "Capacidade estrutural custom" no modal (CP-9d): inserir valor >30%
      acima da tabela → aviso âmbar
- [ ] Editor de coeficientes (CP-8b): abrir, ver as 7 tabelas, aplicar preset,
      "Restaurar todos aos padrões"

**Risco a observar:** painel de camadas (interação nova), colisão de rótulos
(acabou de ser corrigida), modal de carga estrutural com aviso >30%.

---

## Aba 6 — Capacidade de Carga

Selecionar E-01 (carga 50 tf). Conferir os 4 modos + comparativo.

- [ ] **Modo 1 (Envoltória):** cota sugerida 239 m, limitante AV, DQ 54.20 / AV 50.64
- [ ] Memorial cota a cota: cota 242 → DQ Q_adm = **32.84 tf** (regressão canônica)
- [ ] Cota 239 destacada com ★
- [ ] **Curva Q×cota SVG** renderiza (DQ azul, AV verde tracejada, carga vermelha em 50)
- [ ] Card divergência DQ×AV classificado (baixa/média/alta)
- [ ] **Modo 2 (Perfil médio):** submodos 2.1, 2.2, 2.3 selecionáveis; 2.2 → cota 241
- [ ] **Modo 2.3 (perfis paralelos):** ramos Coesivo/Granular (Intermediário sem dados)
- [ ] **Modo 3 (Por furo):** 5 furos, SPT-01 → 239 AV, SPT-03 → 243 DQ
- [ ] **Modo 4 (Interpolação):** cota 235 → método "furo_unico_disponivel" SEM NaN
- [ ] **Comparativo entre modos (6.5):** tabela com pior caso por modo
- [ ] Testar E-03 (carga 110): TODOS os modos → "nenhuma cota atende ambos"
- [ ] Modal NSPT>50 / 3 modos de tratamento de ponta / checkbox Limita R_p≤R_l
      → recalcula ao mudar

**Risco a observar:** o seletor de modos (4 modos + 3 submodos do 2), a curva SVG,
e o caso E-03 (nenhuma cota atende) propagando corretamente em todos os modos.

---

## Aba 7 — Saídas

- [ ] 5 cards: XLSX, JSON, JSON Auditoria, PDF Compacto, PDF Completo
- [ ] Indicação da estaca selecionada (vem da Aba 6)
- [ ] **XLSX:** baixa, abre no Excel, 9 abas, Modo 1 cota 239 DQ54.20/AV50.64
- [ ] **JSON:** baixa, reabre no app (round-trip)
- [ ] **JSON Auditoria:** baixa, E-03 com cotaSugerida_m: null
- [ ] **PDF Compacto:** abre nova aba, perfil SVG + curva SVG, imprime
- [ ] **PDF Completo:** abre, mini-mapa + perfis + curvas + 7 tabelas coeficientes
- [ ] Sanitização: pôr "=2+2" no nome da obra → XLSX não interpreta como fórmula

**Risco a observar:** pop-up bloqueado nos PDFs (liberar no navegador);
sanitização de injeção no XLSX.

---

## Transversal (todas as abas)

- [ ] Navegação entre as 7 abas sem erro/tela branca
- [ ] Console do navegador (F12) sem erros vermelhos
- [ ] Layout não quebra em janela estreita (responsividade)
- [ ] Disclaimer persistente em todas as abas
- [ ] Recarregar a página (F5) → app volta ao estado inicial (não persiste — é esperado)
