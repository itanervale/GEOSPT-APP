# CP-11 — Smoke Test Integrado

Data: 2026-05-30 · Engine v2.0.7 · Schema 2.0.7

## O que foi validado automaticamente

| Verificação | Resultado |
|---|---|
| Build de produção (`npm run build`) | ✅ 88 módulos, 6.7s |
| Bundle | 960 KB (290 KB gzip) — sem warning de chunk |
| `npm audit` | ✅ 0 vulnerabilidades |
| Bateria completa da engine | ✅ 216 testes (190 sintéticos + 26 Balsas) |
| Regressão canônica | ✅ 32.84 tf @ cota 242 |
| Teste de integração ponta a ponta | ✅ 10/10 |
| 7 abas com `export default` | ✅ todas |
| Stubs/placeholders residuais | ✅ nenhum (PlaceholderAba só no fallback `default:`) |
| EditorCoeficientesCompleto | ✅ real (882 linhas), usado no PainelConfigCalculo |

## Teste de integração (fluxo Balsas)

1. Compatibilização → 20 cotas, furo crítico SPT-01 ✅
2. Modo 1 (envoltória) → 32.84 @ 242, 54.20 @ 239 ✅
3. Modo 2.2 (perfil médio) → perfil gerado ✅
4. Modo 3 (por furo) → 5 furos ✅
5. Modo 4 (interpolação) → SEM NaN, última cota = furo_unico_disponivel ✅
6. Hash de entrada → SHA-256 (64 hex) ✅
7. Determinismo → mesma entrada gera mesmo hash ✅

## O que NÃO foi validado (requer teste manual ou runner de browser)

- Renderização visual real das abas (cliques, formulários, modais)
- Gráficos SVG renderizando no navegador (validados só como string sem NaN)
- Interação do painel de camadas do mini-mapa
- Download real de XLSX/JSON e abertura de PDF via window.open
- Responsividade / layout em telas estreitas

Um smoke test de browser de verdade exigiria Playwright/Puppeteer (não montado;
seria um CP próprio). O que está aqui valida a **integridade de build, lógica e
integração de dados** — não a camada visual.

## Estrutura final

- 62 arquivos .jsx/.js em src/
- 7 abas: Identificação, Sondagens, Compatibilização, Análise, Estacas (4),
  Capacidade (13), Saídas (7)
- Engine modificada 2× (documentado em NOTAS_TECNICAS.md):
  CP-9d (cargaEstrutural_tf_override) e CP-10c.1 (bug NaN 1 furo)
