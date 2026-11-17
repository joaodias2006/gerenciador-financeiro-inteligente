import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  OctagonAlert,
  Lock,
  PiggyBank,
  TrendingUp,
  CreditCard,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock,
  CalendarArrowUp,
  Plus,
  Info,
  Sparkles,
  Check
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { formatBRL, formatDateBR, formatMonthYearLabel } from '../utils/formatters.js';

const CHART_COLORS = [
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#0ea5e9', // Sky
  '#f97316', // Orange
  '#14b8a6', // Teal
  '#eab308', // Yellow
  '#ec4899', // Pink
  '#64748b'  // Slate
];

export default function DashboardTab({
  xray,
  banks,
  transactions,
  privacyMode,
  selectedBankId,
  onSelectBank,
  onUpdateProfile,
  onToggleTransactionStatus,
  onOpenNewTransaction,
  onNavigateTab
}) {
  const [editingVault, setEditingVault] = useState(false);
  const [goalInput, setGoalInput] = useState(xray.savingsGoal);
  const [vaultInput, setVaultInput] = useState(xray.vaultSaved);
  const [rolloverInput, setRolloverInput] = useState(xray.rolloverAmount);
  const [showFormulaDetail, setShowFormulaDetail] = useState(false);

  const handleOpenVaultEdit = () => {
    setGoalInput(xray.savingsGoal);
    setVaultInput(xray.vaultSaved);
    setRolloverInput(xray.rolloverAmount);
    setEditingVault(true);
  };

  const handleSaveVault = (e) => {
    e.preventDefault();
    onUpdateProfile({
      monthlySavingsGoal: Number(goalInput) || 0,
      vaultSavedCurrentMonth: Number(vaultInput) || 0,
      rolloverAmount: Number(rolloverInput) || 0
    });
    setEditingVault(false);
  };

  // Configuração visual do alerta do Card "Livre para Gastar"
  const healthConfig = {
    safe: {
      badge: 'Margem Segura',
      badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30',
      borderClass: 'border-emerald-500/40 dark:border-emerald-500/30',
      accentText: 'text-emerald-600 dark:text-emerald-400',
      icon: ShieldCheck,
      description: 'Fluxo saudável: suas obrigações do mês e reserva estão 100% cobertas.'
    },
    warning: {
      badge: 'Atenção ao Limite',
      badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30',
      borderClass: 'border-amber-500/40 dark:border-amber-500/30',
      accentText: 'text-amber-600 dark:text-amber-400',
      icon: AlertTriangle,
      description: 'Margem estreita no mês: evite novos gastos supérfluos ou parcelamentos.'
    },
    danger: {
      badge: 'Limite Excedido',
      badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30',
      borderClass: 'border-rose-500/50 dark:border-rose-500/40',
      accentText: 'text-rose-600 dark:text-rose-400',
      icon: OctagonAlert,
      description: 'Alerta vermelho: os compromissos + meta de reserva superam os recursos disponíveis!'
    }
  }[xray.healthStatus];

  const HealthIcon = healthConfig.icon;

  // Compromissos pendentes deste mês para ação rápida
  const pendingMonthItems = transactions
    .filter(
      (t) =>
        t.type === 'expense' &&
        t.status === 'pending' &&
        t.date.slice(0, 7) === xray.selectedMonthKey &&
        (selectedBankId === 'all' || t.bankId === selectedBankId)
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  const vaultProgressPercent =
    xray.savingsGoal > 0
      ? Math.min(100, Math.round((xray.vaultSaved / xray.savingsGoal) * 100))
      : 100;

  return (
    <div className="space-y-6">
      {/* Barra de Filtro Rápido por Banco (Consolidação Multibancos) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2">
            Visão por Conta:
          </span>
          <button
            type="button"
            onClick={() => onSelectBank('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedBankId === 'all'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            Consolidado ({banks.length} Bancos) • {formatBRL(banks.reduce((a, b) => a + Number(b.balance || 0), 0), privacyMode)}
          </button>
          {banks.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => onSelectBank(b.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                selectedBankId === b.id
                  ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: b.color || '#10b981' }}
              />
              <span>{b.bankName}</span>
              <span className="font-mono-num opacity-80">
                {formatBRL(b.balance, privacyMode)}
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowFormulaDetail((v) => !v)}
          className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1.5 px-2 py-1 cursor-pointer"
        >
          <Info className="w-3.5 h-3.5" />
          {showFormulaDetail ? 'Ocultar memória de cálculo' : 'Auditar fórmula Safe-to-Spend'}
        </button>
      </div>

      {/* Memória de Cálculo Auditável (Expansível) */}
      {showFormulaDetail && (
        <div className="bg-emerald-950/5 dark:bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-4 text-xs space-y-2">
          <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Memória de Cálculo em Tempo Real — Fórmula "Livre para Gastar" (Safe-to-Spend):
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-mono-num">
            (Saldo Total em Conta [{formatBRL(xray.totalBalance, privacyMode)}] + Receitas do Mês [{formatBRL(xray.totalMonthIncome, privacyMode)}])
            {' − '}
            (Gastos Já Realizados [{formatBRL(xray.paidExpenses, privacyMode)}] + Contas Fixas/Comprometidas a Pagar [{formatBRL(xray.committedPendingExpenses, privacyMode)}] + Meta de Reserva [{formatBRL(xray.savingsGoal, privacyMode)}])
            {' = '}
            <strong className="text-emerald-600 dark:text-emerald-400">
              {formatBRL(xray.safeToSpend, privacyMode)}
            </strong>
          </p>
        </div>
      )}

      {/* =====================================================================
          4 CARDS PRINCIPAIS DO RAIO-X DO MÊS
         ===================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* CARD 1: LIVRE PARA GASTAR (SAFE-TO-SPEND) */}
        <div
          className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border-2 ${healthConfig.borderClass} shadow-xs flex flex-col justify-between relative overflow-hidden`}
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                1. Livre para Gastar
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${healthConfig.badgeClass}`}
              >
                <HealthIcon className="w-3.5 h-3.5" />
                {healthConfig.badge}
              </span>
            </div>

            <div className={`text-2xl sm:text-3xl font-extrabold font-mono-num tracking-tight ${healthConfig.accentText}`}>
              {formatBRL(xray.safeToSpend, privacyMode)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              {healthConfig.description}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Saldo + Receitas do Mês:</span>
              <span className="font-mono-num font-semibold text-slate-700 dark:text-slate-200">
                {formatBRL(xray.totalBalance + xray.totalMonthIncome, privacyMode)}
              </span>
            </div>
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Saídas + Fixas + Reserva:</span>
              <span className="font-mono-num font-semibold text-rose-600 dark:text-rose-400">
                - {formatBRL(xray.paidExpenses + xray.committedPendingExpenses + xray.savingsGoal, privacyMode)}
              </span>
            </div>
            <div className="flex justify-between text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/50">
              <span>Disponível só do fluxo mensal:</span>
              <span
                className={`font-mono-num font-bold ${
                  xray.monthlyFlowSafeToSpend >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {formatBRL(xray.monthlyFlowSafeToSpend, privacyMode)}
              </span>
            </div>
          </div>
        </div>

        {/* CARD 2: DINHEIRO INTOCÁVEL / COMPROMETIDO */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                2. Dinheiro Intocável
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                <Lock className="w-3 h-3" />
                Não Gastar
              </span>
            </div>

            <div className="text-2xl sm:text-3xl font-extrabold font-mono-num tracking-tight text-amber-600 dark:text-amber-400">
              {formatBRL(xray.untouchableTotal, privacyMode)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              Soma de contas fixas pendentes, boletos agendados e faturas de cartão a vencer no mês.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Contas Fixas & Boletos:</span>
              <span className="font-mono-num font-semibold text-slate-700 dark:text-slate-200">
                {formatBRL(xray.pendingFixedBills + xray.pendingScheduledBoletos, privacyMode)}
              </span>
            </div>
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Faturas / Parcelas no Mês:</span>
              <span className="font-mono-num font-semibold text-slate-700 dark:text-slate-200">
                {formatBRL(xray.currentMonthCreditInvoice, privacyMode)}
              </span>
            </div>
            <div className="flex justify-between text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/50">
              <span>Intocável + Meta Reserva:</span>
              <span className="font-mono-num font-bold text-amber-600 dark:text-amber-400">
                {formatBRL(xray.untouchableWithReserve, privacyMode)}
              </span>
            </div>
          </div>
        </div>

        {/* CARD 3: COFRE & RESERVA PARA O PRÓXIMO MÊS */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                3. Cofre & Reserva
              </span>
              <button
                type="button"
                onClick={handleOpenVaultEdit}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/15 text-teal-600 dark:text-teal-300 border border-teal-500/30 hover:bg-teal-500/25 transition-colors cursor-pointer"
              >
                <PiggyBank className="w-3.5 h-3.5" />
                {editingVault ? 'Editando' : 'Ajustar Meta'}
              </button>
            </div>

            {!editingVault ? (
              <>
                <div className="text-2xl sm:text-3xl font-extrabold font-mono-num tracking-tight text-teal-600 dark:text-teal-400">
                  {formatBRL(xray.savingsGoal, privacyMode)}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                  Meta mensal de poupança •{' '}
                  <strong className="text-slate-700 dark:text-slate-200">
                    {vaultProgressPercent}% guardado
                  </strong>
                </p>

                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-2.5">
                  <div
                    className="h-full bg-teal-500 rounded-full transition-all duration-300"
                    style={{ width: `${vaultProgressPercent}%` }}
                  />
                </div>
              </>
            ) : (
              <form onSubmit={handleSaveVault} className="space-y-2 mt-1">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block">
                      Meta do Mês (R$)
                    </label>
                    <input
                      type="number"
                      step="50"
                      value={goalInput}
                      onChange={(e) => setGoalInput(e.target.value)}
                      className="w-full px-2 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono-num"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block">
                      Rollover Próx. Mês
                    </label>
                    <input
                      type="number"
                      step="50"
                      value={rolloverInput}
                      onChange={(e) => setRolloverInput(e.target.value)}
                      className="w-full px-2 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono-num"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditingVault(false)}
                    className="px-2 py-1 text-[11px] text-slate-500 hover:text-slate-700 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-2.5 py-1 bg-teal-600 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3 h-3" /> Salvar
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Já guardado neste mês:</span>
              <span className="font-mono-num font-semibold text-teal-600 dark:text-teal-400">
                {formatBRL(xray.vaultSaved, privacyMode)}
              </span>
            </div>
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Rollover (Reforço Próx. Mês):</span>
              <span className="font-mono-num font-bold text-slate-800 dark:text-slate-200">
                {formatBRL(xray.rolloverAmount, privacyMode)}
              </span>
            </div>
          </div>
        </div>

        {/* CARD 4: SOBRA REAL DO MÊS */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                4. Sobra Real do Mês
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                  xray.realMonthlySurplus >= 0
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                {xray.savingsRatePercent}% da Renda
              </span>
            </div>

            <div
              className={`text-2xl sm:text-3xl font-extrabold font-mono-num tracking-tight ${
                xray.realMonthlySurplus >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {xray.realMonthlySurplus >= 0 ? '+' : ''}
              {formatBRL(xray.realMonthlySurplus, privacyMode)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              Diferença líquida entre todas as entradas e saídas (pagas + previstas) do mês.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" /> Entradas do Mês:
              </span>
              <span className="font-mono-num font-semibold text-emerald-600 dark:text-emerald-400">
                {formatBRL(xray.totalMonthIncome, privacyMode)}
              </span>
            </div>
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" /> Saídas Totais do Mês:
              </span>
              <span className="font-mono-num font-semibold text-rose-600 dark:text-rose-400">
                - {formatBRL(xray.totalMonthExpenses, privacyMode)}
              </span>
            </div>
            <div className="flex justify-between text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/50">
              <span>Gastos já liquidados:</span>
              <span className="font-mono-num font-semibold text-slate-700 dark:text-slate-300">
                {formatBRL(xray.paidExpenses, privacyMode)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          PAINEL 5: CRÉDITO VS. DÉBITO & MEIOS DE PAGAMENTO
         ===================================================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-500" />
              Painel Crédito vs. Débito & Meios de Pagamento
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Comparativo entre saídas imediatas de caixa (Pix, Débito, Boleto) e comprometimento de limite no Cartão de Crédito.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
              Mês: <strong>{formatMonthYearLabel(xray.selectedMonthKey)}</strong>
            </span>
          </div>
        </div>

        {/* Barra de Limite de Crédito Consolidado */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/80 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Termômetro de Limite de Crédito
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  xray.creditVsDebit.creditUsagePercent > 70
                    ? 'bg-rose-500/15 text-rose-500'
                    : xray.creditVsDebit.creditUsagePercent > 40
                    ? 'bg-amber-500/15 text-amber-500'
                    : 'bg-emerald-500/15 text-emerald-500'
                }`}
              >
                {xray.creditVsDebit.creditUsagePercent}% do limite tomado
              </span>
            </div>

            <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex">
              <div
                className={`h-full transition-all duration-500 ${
                  xray.creditVsDebit.creditUsagePercent > 70
                    ? 'bg-rose-500'
                    : xray.creditVsDebit.creditUsagePercent > 40
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${xray.creditVsDebit.creditUsagePercent}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block">Fatura do Mês</span>
                <span className="text-sm font-bold font-mono-num text-amber-600 dark:text-amber-400">
                  {formatBRL(xray.creditVsDebit.currentMonthCreditInvoice, privacyMode)}
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block">Limite Tomado</span>
                <span className="text-sm font-bold font-mono-num text-slate-800 dark:text-slate-200">
                  {formatBRL(xray.creditVsDebit.effectiveCreditUsed, privacyMode)}
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block">Limite Livre</span>
                <span className="text-sm font-bold font-mono-num text-emerald-600 dark:text-emerald-400">
                  {formatBRL(xray.creditVsDebit.availableCreditLimit, privacyMode)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block">Saídas à Vista (Débito/Pix/Boleto)</span>
                <span className="font-mono-num font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  {formatBRL(xray.creditVsDebit.cashOutflowsTotal, privacyMode)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Lançado no Crédito (Mês)</span>
                <span className="font-mono-num font-bold text-amber-600 dark:text-amber-400 text-sm">
                  {formatBRL(xray.creditVsDebit.creditOutflowsTotal, privacyMode)}
                </span>
              </div>
            </div>
          </div>

          {/* Gráfico 1: Comparativo À Vista vs Crédito */}
          <div className="lg:col-span-7 h-60 bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/70 rounded-2xl p-4 flex flex-col">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Comparativo Direto: Dinheiro à Vista vs. Cartão de Crédito
            </span>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={xray.creditVsDebit.comparisonChart}
                  layout="vertical"
                  margin={{ top: 8, right: 24, left: 10, bottom: 8 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={195}
                    tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}
                  />
                  <Tooltip
                    formatter={(val) => [formatBRL(val, privacyMode), 'Total no Mês']}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#f8fafc',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="valor" radius={[0, 8, 8, 0]} barSize={32}>
                    {xray.creditVsDebit.comparisonChart.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Gráficos 2 e 3: Distribuição por Forma de Pagamento e por Categoria */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          {/* Distribuição por Forma de Pagamento */}
          <div className="bg-slate-50/60 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Distribuição por Meio de Pagamento
            </h3>
            {xray.paymentMethodChartData.length === 0 ? (
              <p className="text-xs text-slate-400 py-12 text-center">
                Nenhuma despesa registrada neste período.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                <div className="sm:col-span-5 h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={xray.paymentMethodChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={70}
                        paddingAngle={3}
                      >
                        {xray.paymentMethodChartData.map((_, idx) => (
                          <Cell
                            key={idx}
                            fill={CHART_COLORS[idx % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val) => formatBRL(val, privacyMode)}
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '10px',
                          color: '#f8fafc',
                          fontSize: '12px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="sm:col-span-7 space-y-2">
                  {xray.paymentMethodChartData.map((item, idx) => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: CHART_COLORS[idx % CHART_COLORS.length]
                          }}
                        />
                        <span className="truncate text-slate-700 dark:text-slate-300 font-medium">
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono-num font-semibold text-slate-900 dark:text-slate-100">
                          {formatBRL(item.value, privacyMode)}
                        </span>
                        <span className="text-[11px] text-slate-400 w-9 text-right">
                          {item.percent}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Distribuição por Categoria */}
          <div className="bg-slate-50/60 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Gastos por Categoria no Mês
            </h3>
            {xray.categoryChartData.length === 0 ? (
              <p className="text-xs text-slate-400 py-12 text-center">
                Nenhuma despesa registrada neste período.
              </p>
            ) : (
              <div className="space-y-2.5">
                {xray.categoryChartData.map((cat, idx) => (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {cat.name}
                      </span>
                      <span className="font-mono-num font-semibold text-slate-900 dark:text-slate-100">
                        {formatBRL(cat.value, privacyMode)}{' '}
                        <span className="text-slate-400 font-normal">({cat.percent}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.max(4, cat.percent)}%`,
                          backgroundColor: CHART_COLORS[idx % CHART_COLORS.length]
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================================
          SEÇÃO INFERIOR: CONTAS COMPROMETIDAS A PAGAR & ATALHO PRÓXIMO MÊS
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lista de Obrigações Pendentes no Mês */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                Contas Comprometidas / Pendentes neste Mês ({pendingMonthItems.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Clique em "Dar Baixa" quando efetuar o pagamento para atualizar o saldo realizado.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenNewTransaction}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Novo Lançamento
            </button>
          </div>

          {pendingMonthItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Todas as contas e faturas deste mês já foram quitadas!
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/70 max-h-72 overflow-y-auto pr-1">
              {pendingMonthItems.map((item) => {
                const bankObj = banks.find((b) => b.id === item.bankId);
                return (
                  <div
                    key={item.id}
                    className="py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 truncate flex items-center gap-1.5">
                        <span>{item.description}</span>
                        {item.isFixed && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-500">
                            Fixa
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>Venc: {formatDateBR(item.date)}</span>
                        <span>•</span>
                        <span>{item.paymentMethod}</span>
                        {bankObj && (
                          <>
                            <span>•</span>
                            <span className="font-medium text-slate-500 dark:text-slate-300">
                              {bankObj.bankName}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono-num font-bold text-amber-600 dark:text-amber-400">
                        {formatBRL(item.amount, privacyMode)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onToggleTransactionStatus(item)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Dar Baixa
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Card de Destaque da Previsão do Próximo Mês */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-900 dark:to-slate-950 text-white rounded-2xl p-5 border border-slate-800 flex flex-col justify-between shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <CalendarArrowUp className="w-4 h-4" />
                Radar do Próximo Mês ({formatMonthYearLabel(xray.nextMonthKey)})
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
              <span className="text-xs text-slate-300 block">
                Com base nos seus compromissos atuais, você terá:
              </span>
              <div className="text-2xl font-extrabold font-mono-num text-emerald-400">
                {formatBRL(xray.nextMonthProjection.nextMonthAvailableBudget, privacyMode)}
              </div>
              <span className="text-[11px] text-slate-400 block">
                disponíveis para gastar no próximo mês.
              </span>
            </div>

            <div className="space-y-1.5 text-xs pt-1">
              <div className="flex justify-between text-slate-300">
                <span>Renda Prevista + Rollover:</span>
                <span className="font-mono-num font-semibold text-emerald-400">
                  {formatBRL(
                    xray.nextMonthProjection.expectedNextMonthIncome +
                      xray.nextMonthProjection.effectiveRollover,
                    privacyMode
                  )}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Parcelas de Cartão já Contratadas:</span>
                <span className="font-mono-num font-semibold text-amber-400">
                  - {formatBRL(xray.nextMonthProjection.nextMonthInstallmentsTotal, privacyMode)}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Despesas Fixas Recorrentes:</span>
                <span className="font-mono-num font-semibold text-amber-400">
                  - {formatBRL(xray.nextMonthProjection.nextMonthFixedTotal, privacyMode)}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('projection')}
            className="mt-5 w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            Abrir Simulador Completo do Próximo Mês
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
