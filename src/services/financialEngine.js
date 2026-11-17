import { getMonthKey, getNextMonthKey } from '../data/initialData.js';

/**
 * Motor de Cálculo do Raio-X Financeiro
 * Calcula indicadores do Dashboard, Alertas de Saúde Financeira,
 * Distribuição Crédito vs. Débito e Projeção do Próximo Mês.
 */

const CREDIT_METHODS = ['Cartão de Crédito à Vista', 'Cartão de Crédito Parcelado'];

export function isCreditMethod(method) {
  return CREDIT_METHODS.includes(method);
}

/**
 * Calcula todos os indicadores do mês selecionado e do próximo mês.
 */
export function calculateFinancialXRay({
  banks = [],
  transactions = [],
  userProfile = {},
  selectedMonthKey,
  selectedBankId = 'all'
}) {
  // 1. Filtra bancos ativos conforme filtro de banco individual ou todos
  const filteredBanks =
    selectedBankId === 'all'
      ? banks
      : banks.filter((b) => b.id === selectedBankId);

  const totalBalance = filteredBanks.reduce((acc, b) => acc + Number(b.balance || 0), 0);
  const totalCreditLimit = filteredBanks.reduce((acc, b) => acc + Number(b.creditLimit || 0), 0);

  // 2. Filtra transações pelo banco selecionado (ou todas)
  const bankTransactions =
    selectedBankId === 'all'
      ? transactions
      : transactions.filter((t) => t.bankId === selectedBankId);

  // 3. Transações do mês selecionado
  const monthTransactions = bankTransactions.filter(
    (t) => getMonthKey(t.date) === selectedMonthKey
  );

  const monthIncomes = monthTransactions.filter((t) => t.type === 'income');
  const monthExpenses = monthTransactions.filter((t) => t.type === 'expense');

  const totalMonthIncome = monthIncomes.reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const paidIncome = monthIncomes
    .filter((t) => t.status === 'paid')
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const pendingIncome = monthIncomes
    .filter((t) => t.status === 'pending')
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  // Despesas já pagas (Gastos Já Realizados) vs Pendentes/Agendadas (Intocável/Comprometido)
  const paidExpenses = monthExpenses
    .filter((t) => t.status === 'paid')
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const committedPendingExpenses = monthExpenses
    .filter((t) => t.status === 'pending')
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  // Detalhamento do Dinheiro Intocável / Comprometido
  const pendingFixedBills = monthExpenses
    .filter((t) => t.status === 'pending' && t.isFixed && !isCreditMethod(t.paymentMethod))
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const pendingScheduledBoletos = monthExpenses
    .filter((t) => t.status === 'pending' && !t.isFixed && !isCreditMethod(t.paymentMethod))
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const currentMonthCreditInvoice = monthExpenses
    .filter((t) => isCreditMethod(t.paymentMethod) && t.status === 'pending')
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const totalMonthExpenses = paidExpenses + committedPendingExpenses;

  // Meta de Reserva e Rollover do perfil (proporcional ou integral)
  const savingsGoal = Number(userProfile?.monthlySavingsGoal ?? 1800);
  const vaultSaved = Number(userProfile?.vaultSavedCurrentMonth ?? 1200);
  const rolloverAmount = Number(userProfile?.rolloverAmount ?? 950);

  // =========================================================================
  // CARD 1: "Livre para Gastar" (Safe-to-Spend)
  // Fórmula oficial exigida:
  // (Saldo Total em Conta + Receitas do Mês) - (Gastos Já Realizados + Contas Fixas/Comprometidas a Pagar + Meta de Reserva)
  // =========================================================================
  const safeToSpend =
    totalBalance +
    totalMonthIncome -
    (paidExpenses + committedPendingExpenses + savingsGoal);

  // Visão complementar estrita do fluxo mensal (sem usar saldo acumulado anterior)
  const monthlyFlowSafeToSpend =
    totalMonthIncome - (paidExpenses + committedPendingExpenses + savingsGoal);

  // Status de Alerta Visual (Verde = Seguro, Amarelo = Atenção, Vermelho = Limite Excedido)
  const totalResources = totalBalance + totalMonthIncome;
  const safeRatio = totalResources > 0 ? safeToSpend / totalResources : 0;
  let healthStatus = 'safe'; // 'safe' | 'warning' | 'danger'
  if (safeToSpend < 0) {
    healthStatus = 'danger';
  } else if (safeRatio < 0.18 || monthlyFlowSafeToSpend < 0) {
    healthStatus = 'warning';
  }

  // =========================================================================
  // CARD 2: "Dinheiro Intocável / Comprometido" (O que NÃO posso gastar)
  // Soma automática de todas as contas fixas pendentes, boletos agendados e faturas de cartão no mês
  // =========================================================================
  const untouchableTotal = committedPendingExpenses;
  const untouchableWithReserve = committedPendingExpenses + savingsGoal;

  // =========================================================================
  // CARD 4: "Sobra Real do Mês"
  // Diferença líquida entre tudo o que entrou e tudo o que saiu no mês
  // =========================================================================
  const realMonthlySurplus = totalMonthIncome - totalMonthExpenses;
  const cashRealizedSurplus = paidIncome - paidExpenses;
  const savingsRatePercent =
    totalMonthIncome > 0 ? Math.round((realMonthlySurplus / totalMonthIncome) * 100) : 0;

  // =========================================================================
  // PAINEL 5: "Crédito vs. Débito & Meios de Pagamento"
  // =========================================================================
  const cashOutflowsTotal = monthExpenses
    .filter((t) => !isCreditMethod(t.paymentMethod))
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const creditOutflowsTotal = monthExpenses
    .filter((t) => isCreditMethod(t.paymentMethod))
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  // Limite de crédito utilizado somando todas as parcelas pendentes a vencer (>= mês atual)
  const futureAndCurrentCreditPending = bankTransactions
    .filter(
      (t) =>
        t.type === 'expense' &&
        isCreditMethod(t.paymentMethod) &&
        t.status === 'pending' &&
        getMonthKey(t.date) >= selectedMonthKey
    )
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const effectiveCreditUsed = Math.max(
    futureAndCurrentCreditPending,
    filteredBanks.reduce((acc, b) => acc + Number(b.creditUsed || 0), 0)
  );
  const availableCreditLimit = Math.max(0, totalCreditLimit - effectiveCreditUsed);
  const creditUsagePercent =
    totalCreditLimit > 0 ? Math.min(100, Math.round((effectiveCreditUsed / totalCreditLimit) * 100)) : 0;

  // Distribuição por Forma de Pagamento
  const byPaymentMethodMap = {};
  monthExpenses.forEach((t) => {
    const method = t.paymentMethod || 'Outros';
    byPaymentMethodMap[method] = (byPaymentMethodMap[method] || 0) + Number(t.amount || 0);
  });

  const paymentMethodChartData = Object.entries(byPaymentMethodMap)
    .map(([name, value]) => ({
      name,
      value: Number(value.toFixed(2)),
      percent: totalMonthExpenses > 0 ? Math.round((value / totalMonthExpenses) * 100) : 0
    }))
    .sort((a, b) => b.value - a.value);

  // Distribuição por Categoria
  const byCategoryMap = {};
  monthExpenses.forEach((t) => {
    const cat = t.category || 'Outros';
    byCategoryMap[cat] = (byCategoryMap[cat] || 0) + Number(t.amount || 0);
  });

  const categoryChartData = Object.entries(byCategoryMap)
    .map(([name, value]) => ({
      name,
      value: Number(value.toFixed(2)),
      percent: totalMonthExpenses > 0 ? Math.round((value / totalMonthExpenses) * 100) : 0
    }))
    .sort((a, b) => b.value - a.value);

  // =========================================================================
  // MÓDULO 5: "Previsão do Próximo Mês"
  // =========================================================================
  const nextMonthKey = getNextMonthKey(selectedMonthKey);
  const nextMonthExplicitTx = bankTransactions.filter(
    (t) => getMonthKey(t.date) === nextMonthKey && t.type === 'expense'
  );

  // 1. Parcelas de cartão que já caem no próximo mês
  const nextMonthInstallments = nextMonthExplicitTx.filter(
    (t) => t.paymentMethod === 'Cartão de Crédito Parcelado' || (t.installmentTotal && t.installmentTotal > 1)
  );
  const nextMonthInstallmentsTotal = nextMonthInstallments.reduce(
    (acc, t) => acc + Number(t.amount || 0),
    0
  );

  // 2. Despesas fixas recorrentes (herdadas do mês atual se ainda não lançadas explicitamente no próximo mês)
  const currentFixedExpenses = monthExpenses.filter((t) => t.isFixed);
  const explicitFixedNextMonth = nextMonthExplicitTx.filter((t) => t.isFixed);
  const explicitDescriptions = new Set(
    explicitFixedNextMonth.map((t) => t.description.toLowerCase().trim())
  );

  const projectedRecurringFixed = [
    ...explicitFixedNextMonth,
    ...currentFixedExpenses
      .filter((t) => !explicitDescriptions.has(t.description.toLowerCase().trim()))
      .map((t) => ({
        ...t,
        id: `proj-fixed-${t.id}`,
        date: `${nextMonthKey}-${t.date.slice(8, 10) || '10'}`,
        status: 'pending',
        isProjected: true
      }))
  ];

  const nextMonthFixedTotal = projectedRecurringFixed.reduce(
    (acc, t) => acc + Number(t.amount || 0),
    0
  );

  // 3. Outros agendamentos avulsos no próximo mês
  const nextMonthOtherScheduled = nextMonthExplicitTx.filter(
    (t) => !t.isFixed && t.paymentMethod !== 'Cartão de Crédito Parcelado' && (!t.installmentTotal || t.installmentTotal <= 1)
  );
  const nextMonthOtherTotal = nextMonthOtherScheduled.reduce(
    (acc, t) => acc + Number(t.amount || 0),
    0
  );

  const nextMonthCommittedTotal =
    nextMonthInstallmentsTotal + nextMonthFixedTotal + nextMonthOtherTotal;

  // Renda Mensal Prevista para o próximo mês
  const expectedNextMonthIncome =
    Number(userProfile?.expectedNextMonthIncome) > 0
      ? Number(userProfile.expectedNextMonthIncome)
      : totalMonthIncome > 0
      ? totalMonthIncome
      : 12640;

  // Sobra/Reserva acumulada deste mês transferida (Rollover ou Sobra positiva)
  const effectiveRollover = rolloverAmount;

  // Fórmula oficial exigida para o Próximo Mês:
  // (Renda Mensal Prevista + Sobra/Reserva acumulada deste mês) - Gastos já comprometidos para o próximo mês
  const nextMonthAvailableBudget =
    expectedNextMonthIncome + effectiveRollover - nextMonthCommittedTotal;

  // Projeção para os próximos 6 meses (evolução de parcelas + custos fixos)
  const sixMonthsProjection = [];
  let cursorMonth = selectedMonthKey;
  for (let i = 0; i < 6; i++) {
    const mKey = i === 0 ? selectedMonthKey : getNextMonthKey(cursorMonth);
    cursorMonth = mKey;

    const mInstallments = bankTransactions
      .filter(
        (t) =>
          t.type === 'expense' &&
          getMonthKey(t.date) === mKey &&
          (t.paymentMethod === 'Cartão de Crédito Parcelado' || (t.installmentTotal && t.installmentTotal > 1))
      )
      .reduce((acc, t) => acc + Number(t.amount || 0), 0);

    const [yy, mm] = mKey.split('-');
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const label = `${monthNames[parseInt(mm, 10) - 1]}/${yy.slice(2)}`;

    sixMonthsProjection.push({
      monthKey: mKey,
      label,
      parcelas: Number(mInstallments.toFixed(2)),
      fixas: Number(nextMonthFixedTotal.toFixed(2)),
      totalComprometido: Number((mInstallments + nextMonthFixedTotal).toFixed(2)),
      rendaPrevista: Number(expectedNextMonthIncome.toFixed(2))
    });
  }

  return {
    selectedMonthKey,
    nextMonthKey,
    totalBalance,
    totalMonthIncome,
    paidIncome,
    pendingIncome,
    paidExpenses,
    committedPendingExpenses,
    pendingFixedBills,
    pendingScheduledBoletos,
    currentMonthCreditInvoice,
    totalMonthExpenses,
    savingsGoal,
    vaultSaved,
    rolloverAmount,
    safeToSpend,
    monthlyFlowSafeToSpend,
    healthStatus,
    safeRatio,
    untouchableTotal,
    untouchableWithReserve,
    realMonthlySurplus,
    cashRealizedSurplus,
    savingsRatePercent,
    creditVsDebit: {
      cashOutflowsTotal,
      creditOutflowsTotal,
      totalCreditLimit,
      effectiveCreditUsed,
      availableCreditLimit,
      creditUsagePercent,
      currentMonthCreditInvoice,
      comparisonChart: [
        {
          name: 'À Vista (Pix, Débito, Boleto)',
          valor: Number(cashOutflowsTotal.toFixed(2)),
          fill: '#10b981'
        },
        {
          name: 'Crédito (À Vista & Parcelado)',
          valor: Number(creditOutflowsTotal.toFixed(2)),
          fill: '#f59e0b'
        }
      ]
    },
    paymentMethodChartData,
    categoryChartData,
    nextMonthProjection: {
      nextMonthKey,
      expectedNextMonthIncome,
      effectiveRollover,
      nextMonthInstallments,
      nextMonthInstallmentsTotal,
      projectedRecurringFixed,
      nextMonthFixedTotal,
      nextMonthOtherScheduled,
      nextMonthOtherTotal,
      nextMonthCommittedTotal,
      nextMonthAvailableBudget,
      sixMonthsProjection
    }
  };
}

/**
 * Gera automaticamente os registros de parcelas futuras nos meses seguintes
 * quando o usuário registra uma compra no "Cartão de Crédito Parcelado".
 */
export function generateInstallmentTransactions(baseTx, totalInstallments) {
  const count = Math.max(1, Math.min(48, parseInt(totalInstallments, 10) || 1));
  if (count === 1 || baseTx.paymentMethod !== 'Cartão de Crédito Parcelado') {
    return [
      {
        ...baseTx,
        id: baseTx.id || `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        installmentGroupId: null,
        installmentCurrent: 1,
        installmentTotal: 1
      }
    ];
  }

  const groupId = `grp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const [startYear, startMonth, startDay] = baseTx.date.split('-').map(Number);

  // Se o usuário informou o valor da parcela ou valor total, suportamos ambos (por padrão valor da parcela ou dividido)
  const installmentAmount = Number(Number(baseTx.amount).toFixed(2));
  const cleanDescription = baseTx.description.replace(/\s*\(\d+\/\d+\)\s*$/, '').trim();

  const generated = [];
  for (let i = 0; i < count; i++) {
    const targetMonthDate = new Date(startYear, startMonth - 1 + i, 1);
    const maxDayInMonth = new Date(
      targetMonthDate.getFullYear(),
      targetMonthDate.getMonth() + 1,
      0
    ).getDate();
    const safeDay = Math.min(startDay, maxDayInMonth);

    const yyyy = targetMonthDate.getFullYear();
    const mm = String(targetMonthDate.getMonth() + 1).padStart(2, '0');
    const dd = String(safeDay).padStart(2, '0');

    generated.push({
      ...baseTx,
      id: `tx-${Date.now()}-${i + 1}-${Math.random().toString(36).slice(2, 6)}`,
      amount: installmentAmount,
      description: `${cleanDescription} (${i + 1}/${count})`,
      date: `${yyyy}-${mm}-${dd}`,
      // Parcelas futuras de cartão são sempre "Agendado/Pendente" nas faturas seguintes
      status: i === 0 ? baseTx.status : 'pending',
      installmentGroupId: groupId,
      installmentCurrent: i + 1,
      installmentTotal: count
    });
  }

  return generated;
}
