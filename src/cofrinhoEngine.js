/**
 * Motor Inteligente de Automação do Cofrinho e Priorização de Boletos.
 * Analisa saldos bancários consolidados, boletos pendentes, vencimentos,
 * reserva operacional do mês e metas para recomendar:
 * 1) O que deve ser pago imediatamente (evitando multas de 2% + 1% a.m.)
 * 2) Quanto pode ser guardado com segurança no Cofrinho hoje e no mês
 * 3) Projeção de rendimentos (CDI) e impactos de regras automáticas.
 */

export const AUTOMATION_MODES = {
  conservador: {
    id: 'conservador',
    label: 'Conservador (Segurança Máxima)',
    safetyBufferRatio: 0.30, // Mantém 30% da renda/saldo livre na conta corrente
    targetSaveRatio: 0.15,
    description: 'Prioriza folga de caixa na conta corrente (30% de margem) antes de transferir para o Cofrinho.'
  },
  equilibrado: {
    id: 'equilibrado',
    label: 'Equilibrado (50-30-20 Inteligente)',
    safetyBufferRatio: 0.18, // Mantém 18% de margem operacional
    targetSaveRatio: 0.25,
    description: 'Quita boletos dos próximos 15 dias, preserva reserva semanal e guarda o excedente automaticamente.'
  },
  agressivo: {
    id: 'agressivo',
    label: 'Meta Acelerada (Máximo Rendimento)',
    safetyBufferRatio: 0.10, // Mantém apenas 10% de margem mínima
    targetSaveRatio: 0.40,
    description: 'Maximiza o dinheiro rendendo 102% do CDI no Cofrinho e sugere antecipar boletos com desconto.'
  }
};

/**
 * Classifica um boleto quanto à urgência e calcula potencial multa evitada.
 */
export function evaluateBillPriority(bill, referenceDateStr) {
  const refDate = referenceDateStr ? new Date(`${referenceDateStr}T00:00:00`) : new Date();
  refDate.setHours(0, 0, 0, 0);
  const dueDate = new Date(`${bill.dueDate}T00:00:00`);
  dueDate.setHours(0, 0, 0, 0);

  const diffDays = Math.round((dueDate - refDate) / (1000 * 60 * 60 * 24));

  if (bill.status === 'paid') {
    return {
      level: 'paid',
      badge: 'Pago',
      diffDays,
      urgencyScore: 0,
      estimatedPenalty: 0,
      actionLabel: 'Quitado'
    };
  }

  // Multa padrão de atraso no Brasil: 2% de multa + 0.033% ao dia de mora
  const penaltyBase = bill.amount * 0.02;
  const dailyInterest = bill.amount * 0.00033 * Math.max(1, Math.abs(diffDays));
  const estimatedPenalty = Number((penaltyBase + dailyInterest).toFixed(2));

  if (diffDays < 0) {
    return {
      level: 'overdue',
      badge: `Atrasado (${Math.abs(diffDays)}d)`,
      diffDays,
      urgencyScore: 100 + Math.abs(diffDays),
      estimatedPenalty,
      actionLabel: 'Pagar Agora (Urgente)'
    };
  }

  if (diffDays === 0) {
    return {
      level: 'today',
      badge: 'Vence Hoje',
      diffDays: 0,
      urgencyScore: 95,
      estimatedPenalty,
      actionLabel: 'Pagar Hoje'
    };
  }

  if (diffDays <= 3) {
    return {
      level: 'soon',
      badge: `Vence em ${diffDays}d`,
      diffDays,
      urgencyScore: 80 - diffDays,
      estimatedPenalty,
      actionLabel: 'Priorizar Pagamento'
    };
  }

  if (diffDays <= 7) {
    return {
      level: 'week',
      badge: `Em ${diffDays} dias`,
      diffDays,
      urgencyScore: 50 - diffDays,
      estimatedPenalty,
      actionLabel: 'Agendar Semana'
    };
  }

  return {
    level: 'scheduled',
    badge: `Em ${diffDays} dias`,
    diffDays,
    urgencyScore: Math.max(10, 30 - diffDays),
    estimatedPenalty,
    actionLabel: 'Programado'
  };
}

/**
 * Calcula o diagnóstico completo de pagamentos e o valor ótimo para guardar no Cofrinho.
 */
export function computeFinancialPlan({
  accounts = [],
  bills = [],
  monthlyIncome = 8500,
  dailyLivingReserve = 1200,
  mode = 'equilibrado',
  cdiAnnualRate = 0.1125, // 11.25% a.a.
  rules = { roundUpPix: true, autoSaveIncomePercent: true, sweepMonthlySurplus: true },
  referenceDateStr
}) {
  const modeConfig = AUTOMATION_MODES[mode] || AUTOMATION_MODES.equilibrado;

  // 1. Saldo disponível em contas correntes
  const checkingBalance = accounts
    .filter((a) => a.type === 'checking' || a.type === 'savings_linked')
    .reduce((sum, a) => sum + Number(a.balance || 0), 0);

  // Faturas de cartão abertas
  const creditCardTotal = accounts
    .filter((a) => a.type === 'credit')
    .reduce((sum, a) => sum + Math.abs(Number(a.invoice || 0)), 0);

  // 2. Avalia todos os boletos e ordena por prioridade
  const evaluatedBills = bills
    .map((b) => ({
      ...b,
      evaluation: evaluateBillPriority(b, referenceDateStr)
    }))
    .sort((a, b) => b.evaluation.urgencyScore - a.evaluation.urgencyScore);

  const pendingBills = evaluatedBills.filter((b) => b.status !== 'paid');
  const paidBills = evaluatedBills.filter((b) => b.status === 'paid');

  const urgentBills = pendingBills.filter((b) =>
    ['overdue', 'today', 'soon'].includes(b.evaluation.level)
  );
  const weekBills = pendingBills.filter((b) =>
    ['overdue', 'today', 'soon', 'week'].includes(b.evaluation.level)
  );

  const totalPendingAmount = pendingBills.reduce((s, b) => s + Number(b.amount || 0), 0);
  const urgentAmount = urgentBills.reduce((s, b) => s + Number(b.amount || 0), 0);
  const weekAmount = weekBills.reduce((s, b) => s + Number(b.amount || 0), 0);
  const totalPenaltiesAvoided = urgentBills.reduce(
    (s, b) => s + Number(b.evaluation.estimatedPenalty || 0),
    0
  );

  // 3. Cálculo da Margem de Segurança + Reserva Operacional
  const safetyBuffer = Math.round(
    Math.max(checkingBalance, monthlyIncome) * modeConfig.safetyBufferRatio
  );

  // 4. Quanto pode ser guardado AGORA com segurança (sem faltar para boletos nem para o dia a dia)
  const obligationsNow = totalPendingAmount + Number(dailyLivingReserve || 0);
  const netFreeBalance = checkingBalance - obligationsNow;
  const safeToSaveNow = Math.max(0, Math.round((netFreeBalance - safetyBuffer * 0.5) * 100) / 100);

  // 5. Potencial de Cofrinho Mensal (considerando regras automáticas)
  const roundUpBonus = rules.roundUpPix ? 94.5 : 0;
  const autoIncomeSlice = rules.autoSaveIncomePercent ? monthlyIncome * 0.10 : 0;
  const projectedMonthlyCapacity = Math.max(
    safeToSaveNow,
    Math.round(
      Math.max(0, monthlyIncome - totalPendingAmount - dailyLivingReserve - safetyBuffer) +
        roundUpBonus
    )
  );

  // 6. Rendimento projetado no Cofrinho (102% do CDI líquido estimado)
  const effectiveAnnualRate = cdiAnnualRate * 1.02;
  const monthlyRate = Math.pow(1 + effectiveAnnualRate, 1 / 12) - 1;
  const yield12MonthsOnSafeNow = safeToSaveNow * effectiveAnnualRate;
  const projected12MonthsAccumulated =
    projectedMonthlyCapacity * ((Math.pow(1 + monthlyRate, 12) - 1) / monthlyRate);

  // 7. Recomendações acionáveis passo a passo
  const recommendations = [];

  if (urgentBills.length > 0) {
    recommendations.push({
      id: 'rec-urgent',
      type: 'critical',
      title: `Quitar ${urgentBills.length} boleto(s) urgente(s) (${formatBRL(urgentAmount)})`,
      detail: `Evita aproximadamente ${formatBRL(totalPenaltiesAvoided)} em multas (2%) e juros de mora neste mês.`,
      actionType: 'pay_urgent'
    });
  } else {
    recommendations.push({
      id: 'rec-no-urgent',
      type: 'positive',
      title: 'Nenhum boleto vencido ou crítico para hoje',
      detail: 'Seus compromissos imediatos estão em dia. Excelente momento para fazer seu dinheiro render.',
      actionType: 'none'
    });
  }

  if (safeToSaveNow > 0) {
    recommendations.push({
      id: 'rec-save-now',
      type: 'cofrinho',
      title: `Guardar ${formatBRL(safeToSaveNow)} no Cofrinho agora`,
      detail: `Valor 100% livre após reservar ${formatBRL(totalPendingAmount)} para todos os boletos pendentes e ${formatBRL(dailyLivingReserve)} para gastos variáveis.`,
      actionType: 'deposit_cofrinho',
      amount: safeToSaveNow
    });
  } else {
    const deficit = Math.abs(netFreeBalance);
    recommendations.push({
      id: 'rec-hold-save',
      type: 'warning',
      title: 'Pausar novos aportes no Cofrinho por enquanto',
      detail: `Preserve seu saldo em conta (${formatBRL(checkingBalance)}) para cobrir os ${formatBRL(totalPendingAmount)} de boletos pendentes com folga.`,
      actionType: 'none',
      deficit
    });
  }

  if (autoIncomeSlice > 0 && rules.autoSaveIncomePercent) {
    recommendations.push({
      id: 'rec-rule-income',
      type: 'automation',
      title: `Automação de Entrada ativa: +${formatBRL(autoIncomeSlice)}/mês`,
      detail: `Regra configurada para separar 10% de cada salário/Pix recebido + ${formatBRL(roundUpBonus)} de troco arredondado.`,
      actionType: 'toggle_rules'
    });
  }

  return {
    checkingBalance,
    creditCardTotal,
    totalPendingAmount,
    urgentAmount,
    weekAmount,
    totalPenaltiesAvoided,
    safetyBuffer,
    dailyLivingReserve: Number(dailyLivingReserve || 0),
    netFreeBalance,
    safeToSaveNow,
    projectedMonthlyCapacity,
    projected12MonthsAccumulated,
    yield12MonthsOnSafeNow,
    effectiveAnnualRate,
    evaluatedBills,
    urgentBills,
    paidBills,
    recommendations,
    modeConfig
  };
}

export function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value || 0));
}
