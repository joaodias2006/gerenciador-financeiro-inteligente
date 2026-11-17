import React, { useState } from 'react';
import {
  CalendarArrowUp,
  Sparkles,
  CreditCard,
  Repeat,
  ShieldCheck,
  AlertTriangle,
  OctagonAlert,
  Calculator,
  Plus,
  Check
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';
import { formatBRL, formatDateBR, formatMonthYearLabel } from '../utils/formatters.js';

export default function NextMonthProjectionTab({
  xray,
  banks,
  privacyMode,
  onUpdateProfile,
  onOpenNewTransaction
}) {
  const proj = xray.nextMonthProjection;

  const [incomeInput, setIncomeInput] = useState(proj.expectedNextMonthIncome);
  const [rolloverInput, setRolloverInput] = useState(proj.effectiveRollover);
  const [savedFeedback, setSavedFeedback] = useState(false);

  // Simulador rápido "Será que cabe no orçamento do próximo mês?"
  const [simPurchaseTotal, setSimPurchaseTotal] = useState(1800);
  const [simInstallments, setSimInstallments] = useState(6);

  const simMonthlyInstallment =
    simInstallments > 0 ? Number(simPurchaseTotal) / Number(simInstallments) : 0;
  const budgetAfterSimulation = proj.nextMonthAvailableBudget - simMonthlyInstallment;

  const handleSaveForecastParams = (e) => {
    e.preventDefault();
    onUpdateProfile({
      expectedNextMonthIncome: Number(incomeInput) || 0,
      rolloverAmount: Number(rolloverInput) || 0
    });
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2500);
  };

  // Cor de alerta para o indicador do próximo mês
  const totalNextMonthResources = proj.expectedNextMonthIncome + proj.effectiveRollover;
  const freeRatio =
    totalNextMonthResources > 0
      ? proj.nextMonthAvailableBudget / totalNextMonthResources
      : 0;

  let statusTheme = {
    border: 'border-emerald-500/40',
    bg: 'from-emerald-950/90 to-slate-900',
    badge: 'Orçamento Confortável',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    valueColor: 'text-emerald-400',
    icon: ShieldCheck
  };

  if (proj.nextMonthAvailableBudget < 0) {
    statusTheme = {
      border: 'border-rose-500/50',
      bg: 'from-rose-950/90 to-slate-900',
      badge: 'Déficit Projetado',
      badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      valueColor: 'text-rose-400',
      icon: OctagonAlert
    };
  } else if (freeRatio < 0.25) {
    statusTheme = {
      border: 'border-amber-500/50',
      bg: 'from-amber-950/80 to-slate-900',
      badge: 'Atenção: Alto Comprometimento',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      valueColor: 'text-amber-400',
      icon: AlertTriangle
    };
  }

  const StatusIcon = statusTheme.icon;

  return (
    <div className="space-y-6">
      {/* =====================================================================
          HERO BANNER — INDICADOR OFICIAL DE PREVISÃO DO PRÓXIMO MÊS
         ===================================================================== */}
      <div
        className={`rounded-2xl bg-gradient-to-br ${statusTheme.bg} text-white p-6 sm:p-7 border-2 ${statusTheme.border} shadow-sm`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <CalendarArrowUp className="w-5 h-5 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Projeção Inteligente • {formatMonthYearLabel(proj.nextMonthKey)}
            </span>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusTheme.badgeClass}`}
          >
            <StatusIcon className="w-4 h-4" />
            {statusTheme.badge}
          </span>
        </div>

        {/* Frase Indicadora Obrigatória em Destaque */}
        <div className="space-y-2">
          <p className="text-base sm:text-xl font-medium text-slate-200 leading-snug">
            Com base nos seus compromissos atuais, você terá{' '}
            <span className={`font-extrabold font-mono-num text-2xl sm:text-4xl px-1 ${statusTheme.valueColor}`}>
              {formatBRL(proj.nextMonthAvailableBudget, privacyMode)}
            </span>{' '}
            disponíveis para gastar no próximo mês.
          </p>
          <p className="text-xs text-slate-300/80 font-mono-num">
            Fórmula: (Renda Mensal Prevista [{formatBRL(proj.expectedNextMonthIncome, privacyMode)}] + Sobra/Reserva Acumulada Deste Mês [{formatBRL(proj.effectiveRollover, privacyMode)}]) − Gastos Já Comprometidos para o Próximo Mês [{formatBRL(proj.nextMonthCommittedTotal, privacyMode)}]
          </p>
        </div>

        {/* 4 Mini Cards de Decomposição da Fórmula do Próximo Mês */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6 pt-5 border-t border-white/10">
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[11px] text-slate-300 block">1. Renda Mensal Prevista</span>
            <span className="text-lg font-extrabold font-mono-num text-emerald-400 mt-0.5 block">
              + {formatBRL(proj.expectedNextMonthIncome, privacyMode)}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[11px] text-slate-300 block">
              2. Sobra / Rollover Deste Mês
            </span>
            <span className="text-lg font-extrabold font-mono-num text-teal-300 mt-0.5 block">
              + {formatBRL(proj.effectiveRollover, privacyMode)}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[11px] text-slate-300 block">
              3. Parcelas de Cartão Contratadas
            </span>
            <span className="text-lg font-extrabold font-mono-num text-amber-400 mt-0.5 block">
              - {formatBRL(proj.nextMonthInstallmentsTotal, privacyMode)}
            </span>
            <span className="text-[10px] text-slate-400">
              {proj.nextMonthInstallments.length} parcelas ativas
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[11px] text-slate-300 block">
              4. Despesas Fixas Recorrentes
            </span>
            <span className="text-lg font-extrabold font-mono-num text-rose-400 mt-0.5 block">
              - {formatBRL(proj.nextMonthFixedTotal + proj.nextMonthOtherTotal, privacyMode)}
            </span>
            <span className="text-[10px] text-slate-400">
              {proj.projectedRecurringFixed.length} contas fixas mensais
            </span>
          </div>
        </div>
      </div>

      {/* =====================================================================
          CALIBRADOR DE ORÇAMENTO + SIMULADOR DE NOVA COMPRA PARCELADA
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Ajuste de Renda Prevista e Rollover */}
        <form
          onSubmit={handleSaveForecastParams}
          className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between space-y-4"
        >
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              Calibrar Parâmetros do Próximo Mês
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Ajuste sua expectativa salarial/receitas e quanto da sobra atual você deseja transferir como reforço de caixa (*rollover*).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Renda Mensal Prevista (R$)
                </label>
                <input
                  type="number"
                  step="100"
                  value={incomeInput}
                  onChange={(e) => setIncomeInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono-num font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Sobra/Reserva Acumulada (Rollover R$)
                </label>
                <input
                  type="number"
                  step="50"
                  value={rolloverInput}
                  onChange={(e) => setRolloverInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono-num font-bold"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              {savedFeedback ? '✓ Projeção recalculada com sucesso!' : 'Cálculo atualizado instantaneamente'}
            </span>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Atualizar Previsão
            </button>
          </div>
        </form>

        {/* Simulador de Impacto de Nova Compra Parcelada */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calculator className="w-4 h-4 text-amber-500" />
              Teste Rápido: "Essa compra parcelada cabe no mês que vem?"
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Simule uma compra antes de passar o cartão e veja o impacto real no seu saldo disponível do próximo mês.
            </p>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Valor Total da Compra (R$)
                </label>
                <input
                  type="number"
                  step="100"
                  value={simPurchaseTotal}
                  onChange={(e) => setSimPurchaseTotal(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono-num font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Número de Parcelas
                </label>
                <select
                  value={simInstallments}
                  onChange={(e) => setSimInstallments(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold"
                >
                  {[2, 3, 4, 5, 6, 8, 10, 12, 18, 24].map((n) => (
                    <option key={n} value={n}>
                      {n}x de {formatBRL(simPurchaseTotal / n, privacyMode)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div>
              <span className="text-slate-400 block">
                Com parcela de {formatBRL(simMonthlyInstallment, privacyMode)}/mês, seu saldo livre ficará em:
              </span>
              <span
                className={`text-base font-extrabold font-mono-num ${
                  budgetAfterSimulation >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {formatBRL(budgetAfterSimulation, privacyMode)}
              </span>
            </div>
            <button
              type="button"
              onClick={onOpenNewTransaction}
              className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-emerald-600 text-white font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Lançar Compra Real
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          GRÁFICO DE EVOLUÇÃO DE COMPROMETIMENTO (PRÓXIMOS 6 MESES)
         ===================================================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Curva de Alívio de Parcelas & Custos Fixos (Horizonte de 6 Meses)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Visualize como o término das parcelas atuais libera capacidade financeira nos meses seguintes.
          </p>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={proj.sixMonthsProjection}
              margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
            >
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickFormatter={(v) => (privacyMode ? '•••' : `R$${v / 1000}k`)}
              />
              <Tooltip
                formatter={(val) => formatBRL(val, privacyMode)}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  color: '#f8fafc',
                  fontSize: '12px'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar
                dataKey="fixas"
                name="Despesas Fixas Recorrentes"
                stackId="a"
                fill="#0ea5e9"
                radius={[0, 0, 6, 6]}
              />
              <Bar
                dataKey="parcelas"
                name="Parcelas de Cartão de Crédito"
                stackId="a"
                fill="#f59e0b"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* =====================================================================
          DETALHAMENTO DOS COMPROMISSOS DO PRÓXIMO MÊS
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna 1: Parcelas de Cartão de Crédito que cairão no próximo mês */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-500" />
                Parcelas de Cartão no Próximo Mês ({proj.nextMonthInstallments.length})
              </h3>
              <p className="text-xs text-slate-400">
                Geradas automaticamente pelos seus parcelamentos ativos
              </p>
            </div>
            <span className="font-mono-num font-extrabold text-sm text-amber-600 dark:text-amber-400">
              {formatBRL(proj.nextMonthInstallmentsTotal, privacyMode)}
            </span>
          </div>

          {proj.nextMonthInstallments.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">
              Nenhuma parcela de cartão programada para o próximo mês.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {proj.nextMonthInstallments.map((item) => {
                const bank = banks.find((b) => b.id === item.bankId);
                return (
                  <div
                    key={item.id}
                    className="py-2.5 flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {item.description}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {formatDateBR(item.date)} • {bank?.bankName || 'Cartão'} • Parcela{' '}
                        {item.installmentCurrent}/{item.installmentTotal}
                      </div>
                    </div>
                    <span className="font-mono-num font-bold text-amber-600 dark:text-amber-400">
                      {formatBRL(item.amount, privacyMode)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Coluna 2: Despesas Fixas Recorrentes no próximo mês */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Repeat className="w-4 h-4 text-sky-500" />
                Despesas Fixas Recorrentes ({proj.projectedRecurringFixed.length})
              </h3>
              <p className="text-xs text-slate-400">
                Contas mensais fixas (aluguel, luz, internet, saúde, educação)
              </p>
            </div>
            <span className="font-mono-num font-extrabold text-sm text-sky-600 dark:text-sky-400">
              {formatBRL(proj.nextMonthFixedTotal, privacyMode)}
            </span>
          </div>

          {proj.projectedRecurringFixed.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">
              Nenhuma despesa fixa recorrente cadastrada.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {proj.projectedRecurringFixed.map((item) => {
                const bank = banks.find((b) => b.id === item.bankId);
                return (
                  <div
                    key={item.id}
                    className="py-2.5 flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {item.description}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Previsto: {formatDateBR(item.date)} • {item.category} •{' '}
                        {bank?.bankName || 'Conta'}
                      </div>
                    </div>
                    <span className="font-mono-num font-bold text-slate-800 dark:text-slate-200">
                      {formatBRL(item.amount, privacyMode)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
