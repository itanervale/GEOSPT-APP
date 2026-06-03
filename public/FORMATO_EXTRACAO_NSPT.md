# Formato Padrão de Extração de NSPT (PDF → GeoSPT)

> Protocolo para extrair sondagens de um laudo PDF e entregar um JSON pronto para o
> botão **Importar** do GeoSPT, com conferência humana obrigatória. Schema: `geospt-obra`
> (compatível com app/engine v2.0.7).

Este documento serve a dois públicos: (a) à IA que fará a extração (instruções de saída) e
(b) ao engenheiro, que confere os valores antes de importar. A leitura é **assistida**: a IA
extrai um rascunho, o engenheiro valida campo a campo. O JSON nunca é importado sem revisão.

---

## 1. Protocolo de uso (passo a passo)

1. **Anexar** o(s) PDF(s) do laudo numa conversa com o Claude.
2. Pedir: *"Extraia as sondagens no formato padrão GeoSPT (FORMATO_EXTRACAO_NSPT)."*
3. A IA devolve **dois blocos**:
   - **(A) Relatório de conferência** — tabela por furo (cota de topo, NA, critério de
     paralisação, e os NSPT lidos), com **marcação dos valores de baixa confiança**.
   - **(B) JSON** no schema abaixo, pronto para o botão Importar.
4. **Conferir** o relatório (A) contra o PDF — especialmente os dígitos de NSPT e as cotas.
5. Só então **Importar** o JSON (B) no app (botão 📥 Importar).
6. No app, revisar a aba **2. Sondagens** e a **4. Análise** (os alertas A1–A10 ajudam a
   pegar inconsistências de digitação, como inversões bruscas de NSPT).

> ⚠️ **Regra de ouro.** Os NSPT são dados de entrada que governam todo o cálculo de
> capacidade. Um dígito errado se propaga silenciosamente. A conferência humana é parte do
> processo, não opcional.

---

## 2. Schema raiz do JSON (o que o botão Importar espera)

O arquivo de importação tem esta estrutura. Os campos marcados `← preencher` são os que a
extração alimenta; os demais podem ir com o padrão indicado.

```json
{
  "_schema": "geospt-obra",
  "_schemaVersao": "2.0.7",
  "obra": {
    "identificacao": {
      "nome": "",                       
      "localizacao": "",                
      "dataCadastro": "AAAA-MM-DD",      
      "sistemaCoordenadas": "xy_local",
      "responsavelTecnico": "",
      "observacoes": "Extraído de laudo PDF por IA; valores conferidos pelo eng. responsável."
    },
    "sondagens": {
      "SPT-01": { /* objeto-sondagem, ver seção 3 */ }
    },
    "estacas": [],
    "parametros": { "janelaCompatibilizacao_m": 0.5, "coeficientesCustomizados": null },
    "dominios": [],
    "resultadosCalculo": {}
  }
}
```

Notas:
- **`_schema` deve ser exatamente `"geospt-obra"`** — o app rejeita o arquivo se for diferente.
- `sondagens` é um **objeto** (dicionário), com a **chave = nome do furo** (ex.: `"SPT-01"`),
  não um array.
- `estacas` fica **vazio** na extração (as estacas são cadastradas depois, no app).
- Não inclua `resultadosCalculo`/`dominios` preenchidos — deixe vazios.

---

## 3. Objeto-sondagem (um por furo)

```json
"SPT-01": {
  "cotaTopo_m": 254.485,
  "profundidadeFinal_m": 20.00,
  "criterioParalisacao": "impenetravel",
  "naInicial_m": null,
  "naFinal_m": null,
  "dominioGeotecnico": null,
  "coordenadas": { "x": 0.0, "y": 0.0 },
  "leituras": [ /* uma por metro, ver seção 4 */ ]
}
```

Campos:
- **`cotaTopo_m`** — cota absoluta da boca do furo (m). Se o laudo só traz profundidade e não
  cota, ver seção 6 (cotas ausentes).
- **`profundidadeFinal_m`** — profundidade total ensaiada (m).
- **`criterioParalisacao`** — um de: `"impenetravel"` (impenetrável ao SPT / trépano),
  `"profundidade_prevista"` (atingiu a profundidade de projeto),
  `"solicitacao_contratante"` (paralisado a pedido). Em dúvida, usar `"impenetravel"` se o
  laudo menciona trépano/impenetrável; senão `"profundidade_prevista"`.
- **`naInicial_m` / `naFinal_m`** — profundidade do nível d'água (m), inicial e final/estática.
  `null` se não registrado ou seco. **Atenção:** é profundidade do NA (m), não cota.
- **`dominioGeotecnico`** — sempre `null` na extração.
- **`coordenadas`** — `{x, y}` em metros. Se o laudo não traz, usar `{x:0, y:0}` e anotar no
  relatório de conferência que as coordenadas precisam ser inseridas no app (afetam só o modo
  de interpolação e o mini-mapa, não os demais cálculos).

---

## 4. Objeto-leitura (uma por metro de profundidade)

Uma leitura por metro inteiro, de 1 até a profundidade final.

```json
{ "profundidade_m": 1, "nspt_real": 3, "nspt_calculo": 3, "impenetravel": false, "solo": "Areia Silto-Argilosa", "familia": "Granular" }
```

Campos:
- **`profundidade_m`** — inteiro, o metro da leitura (1, 2, 3, …).
- **`nspt_real`** — o NSPT como está no laudo (golpes para os 30 cm finais). Inteiro.
- **`nspt_calculo`** — igual a `nspt_real`, **exceto** quando há impenetrabilidade / NSPT > 50
  (ver seção 5).
- **`impenetravel`** — `true` apenas nos metros impenetráveis; senão `false`.
- **`solo`** — **obrigatoriamente** um dos 15 nomes canônicos (seção 7). Traduza a descrição
  do laudo para o canônico mais próximo.
- **`familia`** — derivada do `solo` pela 1ª palavra: **Areia→`"Granular"`**,
  **Silte→`"Intermediário"`**, **Argila→`"Coesivo"`**. Deve ser coerente com o `solo`.

---

## 5. NSPT alto / impenetrável (regra crítica)

O app distingue o valor **medido** do valor **usado no cálculo**:
- NSPT normal (≤ 50): `nspt_real = nspt_calculo` = valor do laudo; `impenetravel: false`.
- **NSPT > 50 ou impenetrável** (ex.: laudo registra "45/15", "50/10", "impenetrável"):
  - `nspt_real` = o número medido se houver (ex.: 50); se for só "impenetrável" sem número,
    use o último NSPT válido ou 50 como referência e **anote no relatório**.
  - `nspt_calculo` = **50** (teto de cálculo).
  - `impenetravel` = **true**.

> Por que isso importa: o cálculo usa `nspt_calculo` (limitado a 50), mas o `nspt_real`
> preserva a leitura original para auditoria. Não jogue fora o valor real.

---

## 6. Casos difíceis (e como tratá-los no relatório)

- **PDF escaneado / dígito ambíguo (8↔6, 1↔7, 0↔9):** extraia o mais provável, mas **marque
  como baixa confiança** no relatório de conferência, listando profundidade e furo. Esses são
  os pontos que o engenheiro deve conferir primeiro.
- **Cota de topo ausente:** se o laudo só tem profundidade, deixe `cotaTopo_m` com um valor
  provisório coerente (ex.: 0.0 ou a cota de referência informada) e **avise** que as cotas
  precisam ser ajustadas — a compatibilização por cota absoluta depende disso.
- **Camada entre metros (transição não-inteira):** o app trabalha por metro inteiro; atribua
  o solo predominante do metro e anote a simplificação.
- **Layout não reconhecido:** se não houver confiança na estrutura, **não invente** — entregue
  só o que for seguro e peça ao engenheiro para confirmar as partes duvidosas.

---

## 7. Tabela canônica de solos (use EXATAMENTE estes nomes)

O campo `solo` deve ser um destes 15 (qualquer outro nome quebra o cálculo). A família é dada
pela primeira palavra.

| Solo canônico | Família |
|---|---|
| Areia | Granular |
| Areia Siltosa | Granular |
| Areia Silto-Argilosa | Granular |
| Areia Argilo-Siltosa | Granular |
| Areia Argilosa | Granular |
| Silte Arenoso | Intermediário |
| Silte Areno-Argiloso | Intermediário |
| Silte | Intermediário |
| Silte Argilo-Arenoso | Intermediário |
| Silte Argiloso | Intermediário |
| Argila Arenosa | Coesivo |
| Argila Areno-Siltosa | Coesivo |
| Argila Silto-Arenosa | Coesivo |
| Argila Siltosa | Coesivo |
| Argila | Coesivo |

**Tradução de descrições do laudo:** mapeie para o canônico mais próximo. Exemplos:
"areia fina argilosa" → `Areia Argilosa`; "argila siltosa pouco arenosa" → `Argila Siltosa`
(ou `Argila Silto-Arenosa` se o caráter arenoso for relevante); "silte areno-argiloso" →
`Silte Areno-Argiloso`. Em dúvida entre dois, escolha o mais conservador para a família
dominante e **anote a decisão** no relatório.

---

## 8. Exemplo mínimo completo (2 furos, poucos metros)

```json
{
  "_schema": "geospt-obra",
  "_schemaVersao": "2.0.7",
  "obra": {
    "identificacao": {
      "nome": "Obra Exemplo",
      "localizacao": "Município/UF",
      "dataCadastro": "2026-06-02",
      "sistemaCoordenadas": "xy_local",
      "responsavelTecnico": "",
      "observacoes": "Extraído de laudo PDF por IA; conferir antes de calcular."
    },
    "sondagens": {
      "SPT-01": {
        "cotaTopo_m": 254.49,
        "profundidadeFinal_m": 3,
        "criterioParalisacao": "profundidade_prevista",
        "naInicial_m": null, "naFinal_m": null,
        "dominioGeotecnico": null,
        "coordenadas": { "x": 0, "y": 0 },
        "leituras": [
          { "profundidade_m": 1, "nspt_real": 3, "nspt_calculo": 3, "impenetravel": false, "solo": "Areia Siltosa", "familia": "Granular" },
          { "profundidade_m": 2, "nspt_real": 5, "nspt_calculo": 5, "impenetravel": false, "solo": "Argila Siltosa", "familia": "Coesivo" },
          { "profundidade_m": 3, "nspt_real": 8, "nspt_calculo": 8, "impenetravel": false, "solo": "Argila Siltosa", "familia": "Coesivo" }
        ]
      },
      "SPT-02": {
        "cotaTopo_m": 254.09,
        "profundidadeFinal_m": 2,
        "criterioParalisacao": "impenetravel",
        "naInicial_m": 1.5, "naFinal_m": 1.2,
        "dominioGeotecnico": null,
        "coordenadas": { "x": 25, "y": 0 },
        "leituras": [
          { "profundidade_m": 1, "nspt_real": 4, "nspt_calculo": 4, "impenetravel": false, "solo": "Areia Siltosa", "familia": "Granular" },
          { "profundidade_m": 2, "nspt_real": 52, "nspt_calculo": 50, "impenetravel": true, "solo": "Argila Siltosa", "familia": "Coesivo" }
        ]
      }
    },
    "estacas": [],
    "parametros": { "janelaCompatibilizacao_m": 0.5, "coeficientesCustomizados": null },
    "dominios": [],
    "resultadosCalculo": {}
  }
}
```

(No exemplo, SPT-02 ilustra a regra do impenetrável: `nspt_real: 52`, `nspt_calculo: 50`,
`impenetravel: true`.)

---

## 9. Checklist de conferência (antes de importar)

- [ ] `_schema` é exatamente `"geospt-obra"`.
- [ ] Cada furo tem `cotaTopo_m`, `profundidadeFinal_m` e `criterioParalisacao`.
- [ ] Número de leituras = profundidade final (uma por metro).
- [ ] Todos os `solo` estão na tabela canônica (seção 7).
- [ ] `familia` coerente com a 1ª palavra do `solo`.
- [ ] Metros impenetráveis: `nspt_calculo` ≤ 50 e `impenetravel: true`.
- [ ] Valores marcados como "baixa confiança" foram conferidos no PDF.
- [ ] NA em profundidade (m), não cota; `null` se seco/não registrado.
- [ ] Após importar: abrir a Aba 4 e revisar os alertas (inversões bruscas podem ser erro de
      digitação).
