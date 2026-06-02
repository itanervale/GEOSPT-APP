# GeoSPT

> Análise de sondagens SPT e cálculo de capacidade de carga de estacas pelos métodos de **Décourt-Quaresma** e **Aoki-Velloso**, conforme a **NBR 6122:2022**.

Aplicação web para apoio a projetos geotécnicos: compatibiliza múltiplos furos de sondagem, estima a capacidade de carga de estacas em diferentes modos de cálculo e gera um corte esquemático interpretado do subsolo.

> ⚠️ **Aviso técnico.** O GeoSPT realiza estimativas semiempíricas. Os resultados são uma ferramenta de apoio e **não substituem a análise e a responsabilidade técnica do projetista**. Todo dimensionamento deve ser revisado por engenheiro habilitado.

---

## Funcionalidades

- **Sondagens** — cadastro de furos SPT (NSPT por metro, cota de topo, nível d'água, critério de paralisação) e tratamento de trechos impenetráveis.
- **Compatibilização** — alinhamento de múltiplos furos por cota absoluta, com perfil consolidado.
- **Capacidade de carga** — Décourt-Quaresma e Aoki-Velloso em quatro modos: envoltória, perfil médio, por furo individual e por interpolação entre furos.
- **Corte esquemático** — perfil geológico interpretado entre furos (camadas casadas por família de solo, acunhamento, hachuras), com sobreposição de estacas, terreno, nível d'água e trechos sem investigação SPT.
- **Exportações** — memoriais e resultados em XLSX, PDF e JSON de auditoria.

## Stack

- **React** 18.3 + **Vite** 7
- **Tailwind CSS** 3.4
- **SheetJS (xlsx)** para exportação de planilhas
- JavaScript (sem TypeScript)

## Como rodar

Pré-requisito: **Node.js 18+** (recomendado 20+).

```bash
# 1. Instalar dependências
npm install

# 2. Rodar em modo desenvolvimento (abre em http://localhost:5173)
npm run dev

# 3. Gerar build de produção (saída em dist/)
npm run build

# 4. Pré-visualizar o build de produção
npm run preview
```

## Testes

A engine de cálculo é validada por uma bateria de testes determinísticos em Node:

```bash
# Regressão canônica (caso Balsas → Q_adm = 32,84 tf)
node test-esm.mjs

# Casamento de camadas do corte esquemático
node test-casamento.mjs

# Geometria do corte
node test-geometria-corte.mjs
```

A engine (`src/engine/geospt-engine.js`) está **congelada e validada com 216 testes** (190 sintéticos + 26 do caso de referência Balsas). O caso Balsas serve de regressão canônica: qualquer alteração que mude o resultado de **32,84 tf** indica quebra.

## Estrutura do projeto

```
src/
├── abas/                 # As 7 abas da aplicação
│   ├── AbaSondagens/      # Cadastro de furos SPT
│   ├── AbaCompatibilizacao/
│   ├── AbaAnalise/        # Alertas e domínios geotécnicos
│   ├── AbaEstacas/        # Cadastro de estacas + coeficientes
│   ├── AbaCapacidade/     # Cálculo de capacidade (4 modos)
│   ├── AbaCorteEsquematico/  # Corte geológico interpretado
│   └── AbaSaidas/         # Exportações (XLSX, PDF, JSON)
├── components/           # Componentes de UI e visualizações
├── domain/               # Regras de domínio (solos, estacas)
├── engine/               # Núcleo de cálculo (CONGELADO) + dataset Balsas
├── layout/               # Cabeçalho, abas, navegação
└── state/                # Estado global da obra (Context)
```

## Documentação adicional

- **[HISTORICO_DESENVOLVIMENTO.md](HISTORICO_DESENVOLVIMENTO.md)** — registro cronológico das decisões técnicas (checkpoints de desenvolvimento).
- **[NOTAS_TECNICAS.md](NOTAS_TECNICAS.md)** — notas técnicas detalhadas por checkpoint.
- **[CHECKLIST_VISUAL.md](CHECKLIST_VISUAL.md)** — checklist de verificação visual.

## Persistência

A aplicação **não salva dados no navegador**. Exporte a obra em **JSON** antes de fechar a aba para não perder o trabalho; reimporte o JSON para continuar.

## Licença

Projeto de uso interno. Defina aqui a licença aplicável (ex.: uso restrito institucional, MIT, etc.).
