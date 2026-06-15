/* ============================================================================
 * construirAlertas — função pura que gera lista de alertas a partir do estado
 *
 * Recebe (compat, sondagens, estacas, aterroCorteInfo) e devolve array de:
 *   { id, icone, severidade, titulo, descricao (JSX), implicacao (string) }
 *
 * IDs (não inventar): A1, A2, A3, A4, A5, A6, A7, A8, A9, A10
 *   A6 (CP-14) é o único alerta sobre ESTACA (dimensão fora de 15–120 cm);
 *   os demais analisam sondagens. Informativo: não bloqueia cálculo.
 *   Nota: A6 não existe (pulou no artifact). Preservado para compatibilidade
 *   com qualquer referência externa ao app. A9_info é variante quando não há
 *   estacas cadastradas.
 *
 * Severidades:
 *   critico  — A1 (furo crítico domina >60%)
 *   moderado — A2, A3, A4, A7, A8, A9, A10
 *   info     — A5, A6, A9_info
 *
 * Limites (constantes do artifact, não alterar sem revisão técnica):
 *   A1: furoCriticoPct > 0.6 (60%)
 *   A2: |deltaNspt| > 5
 *   A3: pctSubamostradas > 0.3 (30%)
 *   A4: pctHeterogeneas > 0.2 (20%)
 *   A8: |deltaNspt| > 10
 *   A9/A10: |delta| > 2.5m (definido em aterroCorteInfo.limite)
 *
 * Extraído fielmente das linhas 4571-4751 do geospt_app.jsx.
 * ============================================================================ */

import React from 'react';
import { avaliarAlertaA6, avaliarAlertaA11 } from '@/domain/estacas';

export function construirAlertas(compat, sondagens, estacas, aterroCorteInfo, coeficientesCustomizados = null) {
  const alertas = [];
  const meta = compat.metadata;

  // ---------- A1 — Furo crítico domina envoltória (>60%) ----------
  if (meta.furoCritico && meta.furoCriticoPct > 0.6) {
    alertas.push({
      id: 'A1',
      icone: '🚨',
      severidade: 'critico',
      titulo: 'Furo crítico domina a envoltória',
      descricao: (
        <>
          O furo <strong className="font-mono">{meta.furoCritico}</strong> domina
          a envoltória inferior em{' '}
          <strong>{(meta.furoCriticoPct * 100).toFixed(0)}%</strong> das{' '}
          {meta.cotasProcessadas} cotas compatibilizadas (limite recomendado:
          60%).
        </>
      ),
      implicacao:
        'O resultado depende excessivamente de um único furo. Se este furo for executado em zona não representativa, a envoltória pode estar enviesada.',
    });
  }

  // ---------- A2 — Inversão de resistência (|Δ| > 5) ----------
  if (meta.inversoes && meta.inversoes.length > 0) {
    const grandes = meta.inversoes.filter((i) => Math.abs(i.deltaNspt) > 5);
    if (grandes.length > 0) {
      alertas.push({
        id: 'A2',
        icone: '⚠',
        severidade: 'moderado',
        titulo: 'Inversões de resistência entre cotas adjacentes',
        descricao: (
          <>
            {grandes.length} inversão(ões) significativa(s) detectada(s): NSPT
            cai mais de 5 golpes entre cotas vizinhas.
            <ul className="mt-1 text-xs font-mono">
              {grandes.slice(0, 5).map((inv, k) => (
                <li key={k}>
                  {inv.furo}: cota {inv.cotaAcima_m} m → cota{' '}
                  {inv.cotaAbaixo_m} m (Δ = {inv.deltaNspt > 0 ? '+' : ''}
                  {inv.deltaNspt})
                </li>
              ))}
              {grandes.length > 5 && (
                <li className="text-slate-500">
                  ...e mais {grandes.length - 5}
                </li>
              )}
            </ul>
          </>
        ),
        implicacao:
          'Pode indicar lente de solo mole, transição litológica ou erro de leitura. Verificar laudo original.',
      });
    }
  }

  // ---------- A3 — Subamostragem (<3 furos em >30% das cotas) ----------
  if (meta.cotasSubamostradas && meta.cotasSubamostradas.length > 0) {
    const pctSub = meta.cotasSubamostradas.length / meta.cotasProcessadas;
    if (pctSub > 0.3) {
      alertas.push({
        id: 'A3',
        icone: '⚠',
        severidade: 'moderado',
        titulo: 'Subamostragem em parte do perfil',
        descricao: (
          <>
            <strong>{meta.cotasSubamostradas.length}</strong> de{' '}
            {meta.cotasProcessadas} cotas ({(pctSub * 100).toFixed(0)}%) têm
            menos de 3 furos representados.
          </>
        ),
        implicacao:
          'Compatibilização pouco robusta nessas cotas — pode mascarar variabilidade local. Considerar sondagem complementar.',
      });
    }
  }

  // ---------- A4 — Heterogeneidade de famílias (>20%) ----------
  if (meta.cotasHeterogeneas_m && meta.cotasHeterogeneas_m.length > 0) {
    const pctHet = meta.cotasHeterogeneas_m.length / meta.cotasProcessadas;
    if (pctHet > 0.2) {
      alertas.push({
        id: 'A4',
        icone: '⚠',
        severidade: 'moderado',
        titulo: 'Heterogeneidade de famílias entre furos',
        descricao: (
          <>
            <strong>{meta.cotasHeterogeneas_m.length}</strong> de{' '}
            {meta.cotasProcessadas} cotas ({(pctHet * 100).toFixed(0)}%)
            apresentam famílias diferentes entre os furos.
          </>
        ),
        implicacao:
          'Pode indicar transição lateral de litologia. Avaliar uso do Modo 2 submodo 2.3 (perfis paralelos) ou cadastrar domínios geotécnicos distintos.',
      });
    }
  }

  // ---------- A5 — NA não registrado em nenhum furo ----------
  const todosSemNA = Object.values(sondagens).every(
    (s) =>
      (s.naInicial_m === null || s.naInicial_m === undefined) &&
      (s.naFinal_m === null || s.naFinal_m === undefined)
  );
  if (todosSemNA) {
    alertas.push({
      id: 'A5',
      icone: 'ℹ',
      severidade: 'info',
      titulo: "Nível d'água não registrado",
      descricao:
        "Nenhuma sondagem tem nível d'água registrado (NA inicial ou final).",
      implicacao:
        'Pode ser ausência real ou limitação da execução. Não afeta diretamente o cálculo Décourt/Aoki-Velloso (já consideram NSPT bruto), mas é dado relevante para análise de recalques e empuxo.',
    });
  }

  // ---------- A6 — Dimensão de estaca fora da faixa usual (CP-14) ----------
  // Único alerta sobre ESTACA (diâmetro/lado < 15 cm ou > 120 cm). Também
  // exibido na Aba 5 e gravado no JSON de auditoria. NÃO bloqueia o cálculo.
  const estacasA6 = (estacas || [])
    .map((e) => ({ e, a: avaliarAlertaA6(e) }))
    .filter((x) => x.a);
  if (estacasA6.length > 0) {
    alertas.push({
      id: 'A6',
      icone: 'ℹ',
      severidade: 'info',
      titulo: 'Dimensão de estaca fora da faixa usual (15–120 cm)',
      descricao: (
        <>
          Estaca(s):{' '}
          <strong className="font-mono">
            {estacasA6.map((x) => x.e.nome).join(', ')}
          </strong>
          .{' '}
          {estacasA6
            .map((x) => `${x.e.nome}: ${x.a.mensagem.replace('A6 — ', '')}`)
            .join(' ')}
        </>
      ),
      implicacao:
        'Possível erro de digitação ou dimensão atípica. Verificar o valor na Aba 5. O alerta é informativo e NÃO impede a verificação da capacidade de carga.',
    });
  }

  // ---------- A11 — Carga estrutural acima do valor de norma σₑ×A (CP-16) ----------
  // Sobre ESTACA. Dispara quando a carga estrutural em uso (catálogo comercial ou
  // valor informado) excede σₑ×A (Tabela 1.10). Também exibido na Aba 5 e gravado
  // no JSON de auditoria. NÃO bloqueia o cálculo.
  const estacasA11 = (estacas || [])
    .map((e) => ({ e, a: avaliarAlertaA11(e, coeficientesCustomizados) }))
    .filter((x) => x.a);
  if (estacasA11.length > 0) {
    alertas.push({
      id: 'A11',
      icone: 'ℹ',
      severidade: 'info',
      titulo: 'Carga estrutural acima do valor de norma (σₑ × A)',
      descricao: (
        <>
          Estaca(s):{' '}
          <strong className="font-mono">
            {estacasA11.map((x) => x.e.nome).join(', ')}
          </strong>
          .{' '}
          {estacasA11
            .map((x) => `${x.e.nome}: ${x.a.mensagem.replace('A11 — ', '')}`)
            .join(' ')}
        </>
      ),
      implicacao:
        'A carga estrutural em uso (catálogo comercial ou valor informado) supera o limite normativo σₑ×A. O cálculo usa o valor em uso, mas a norma admitiria menos. Verificar o dimensionamento estrutural. O alerta é informativo e NÃO impede a verificação da capacidade de carga.',
    });
  }

  // ---------- A7 — Paralisação por solicitação do contratante ----------
  const paralisadosContratante = Object.entries(sondagens)
    .filter(([_, s]) => s.criterioParalisacao === 'solicitacao_contratante')
    .map(([nome]) => nome);
  if (paralisadosContratante.length > 0) {
    alertas.push({
      id: 'A7',
      icone: '⚠',
      severidade: 'moderado',
      titulo: 'Sondagens paralisadas por solicitação do contratante',
      descricao: (
        <>
          Furo(s):{' '}
          <strong className="font-mono">
            {paralisadosContratante.join(', ')}
          </strong>
          . Paralisação não atingiu critério de impenetrabilidade do NBR 6484.
        </>
      ),
      implicacao:
        'Camadas inferiores não amostradas — capacidade de carga pode ser subestimada (ou superestimada se houver lente fraca abaixo). Considerar prolongamento da sondagem.',
    });
  }

  // ---------- A8 — Inversão de grande magnitude (|Δ| > 10) ----------
  if (meta.inversoes && meta.inversoes.length > 0) {
    const muitoGrandes = meta.inversoes.filter((i) => Math.abs(i.deltaNspt) > 10);
    if (muitoGrandes.length > 0) {
      alertas.push({
        id: 'A8',
        icone: '⚠',
        severidade: 'moderado',
        titulo: 'Inversão de grande magnitude',
        descricao: (
          <>
            {muitoGrandes.length} inversão(ões) com Δ &gt; 10 golpes
            detectada(s).
          </>
        ),
        implicacao:
          'Inversão muito acentuada — verificar se não há erro de transcrição no laudo, ou lente de aterro/solo orgânico encoberto.',
      });
    }
  }

  // ---------- A9 — Aterro espesso previsto sob a estaca (Δ > +2.5m) ----------
  if (aterroCorteInfo.mediaTopos !== null && aterroCorteInfo.aterro.length > 0) {
    aterroCorteInfo.aterro.forEach((item) => {
      alertas.push({
        id: 'A9',
        icone: '⚠',
        severidade: 'moderado',
        titulo: 'Aterro espesso previsto sob a estaca',
        descricao: (
          <>
            Estaca <strong className="font-mono">{item.nome}</strong>: cota de
            arrasamento <strong>{item.cota.toFixed(2)} m</strong> está{' '}
            <strong>{item.delta.toFixed(2)} m</strong> acima da média dos topos
            das sondagens ({aterroCorteInfo.mediaTopos.toFixed(2)} m).
          </>
        ),
        implicacao:
          'Espera-se aterro espesso sob a estaca. Verificar disponibilidade de material, controle de compactação e necessidade de sondagens adicionais no aterro previsto. Camadas iniciais sem dado SPT são desprezadas no atrito lateral.',
      });
    });
  } else if (estacas.length === 0) {
    alertas.push({
      id: 'A9_info',
      icone: 'ℹ',
      severidade: 'info',
      titulo: 'Verificação A9/A10 (aterro/corte) pendente',
      descricao:
        'Cadastre ao menos uma estaca com cota de arrasamento na Aba 5 para esta verificação.',
      implicacao:
        'Sem cota de arrasamento, não é possível comparar com a média dos topos das sondagens.',
    });
  }

  // ---------- A10 — Corte elevado previsto sob a estaca (Δ < -2.5m) ----------
  if (aterroCorteInfo.mediaTopos !== null && aterroCorteInfo.corte.length > 0) {
    aterroCorteInfo.corte.forEach((item) => {
      alertas.push({
        id: 'A10',
        icone: '⚠',
        severidade: 'moderado',
        titulo: 'Corte elevado previsto sob a estaca',
        descricao: (
          <>
            Estaca <strong className="font-mono">{item.nome}</strong>: cota de
            arrasamento <strong>{item.cota.toFixed(2)} m</strong> está{' '}
            <strong>{Math.abs(item.delta).toFixed(2)} m</strong> abaixo da média
            dos topos das sondagens ({aterroCorteInfo.mediaTopos.toFixed(2)} m).
          </>
        ),
        implicacao:
          'Corte elevado, possibilidade de desconfinamento do solo e redução da capacidade de carga. Sugere-se avaliar a necessidade de sondagens adicionais.',
      });
    });
  }

  return alertas;
}
