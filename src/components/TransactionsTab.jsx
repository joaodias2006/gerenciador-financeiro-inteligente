import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  Edit3,
  Trash2,
  Download,
  Layers,
  Repeat,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import {
  PAYMENT_METHODS,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES
} from '../data/initialData.js';
import {
  formatBRL,
  formatDateBR,
  formatMonthYearLabel
} from '../utils/formatters.js';

export default function TransactionsTab({
  banks,
  transactions,
  selectedMonthKey,
  nextMonthKey,
  selectedBankId,
  privacyMode,
  onSelectBank,
  onOpenNewModal,
  onEditTransaction,
  onDeleteTransaction,
  onToggleStatus
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState('current'); // 'current' | 'next' | 'all'
  const [methodFilter, setMethodFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'income' | 'expense' | 'fixed' | 'installment'

  const allCategories = useMemo(
    () => Array.from(new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES])),
    []
  );

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        // 1. Filtro por Banco
        if (selectedBankId !== 'all' && t.bankId !== selectedBankId) return false;

        // 2. Filtro por Período
        const txMonth = (t.date || '').slice(0, 7);
        if (periodFilter === 'current' && txMonth !== selectedMonthKey) return false;
        if (periodFilter === 'next' && txMonth !== nextMonthKey) return false;

        // 3. Filtro por Forma de Pagamento
        if (methodFilter !== 'all' && t.paymentMethod !== methodFilter) return false;

        // 4. Filtro por Categoria
        if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;

        // 5. Filtro por Status
        if (statusFilter !== 'all' && t.status !== statusFilter) return false;

        // 6. Filtro por Tipo / Natureza
        if (typeFilter === 'income' && t.type !== 'income') return false;
        if (typeFilter === 'expense' && t.type !== 'expense') return false;
        if (typeFilter === 'fixed' && !t.isFixed) return false;
        if (
          typeFilter === 'installment' &&
          t.paymentMethod !== 'Cartão de Crédito Parcelado' &&
          (!t.installmentTotal || t.installmentTotal <= 1)
        ) {
          return false;
        }

        // 7. Busca textual
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const bankName =
            banks.find((b) => b.id === t.bankId)?.bankName?.toLowerCase() || '';
          const matchDesc = (t.description || '').toLowerCase().includes(q);
          const matchCat = (t.category || '').toLowerCase().includes(q);
          const matchMethod = (t.paymentMethod || '').toLowerCase().includes(q);
          const matchBank = bankName.includes(q);
          if (!matchDesc && !matchCat && !matchMethod && !matchBank) return false;
        }

        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [
    transactions,
    banks,
    selectedBankId,
    periodFilter,
    selectedMonthKey,
    nextMonthKey,
    methodFilter,
    categoryFilter,
    statusFilter,
    typeFilter,
    searchQuery
  ]);

  const summary = useMemo(() => {
    const inc = filteredTransactions
      .filter((t) => t.type === 'income')
      .reduce((acc, t) => acc + Number(t.amount || 0), 0);
    const exp = filteredTransactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => acc + Number(t.amount || 0), 0);
    return {
      income: inc,
      expense: exp,
      net: inc - exp
    };
  }, [filteredTransactions]);

  const handleExportCSV = () => {
    const header = 'Data;Descrição;Tipo;Categoria;Forma de Pagamento;Banco;Status;Valor\n';
    const rows = filteredTransactions
      .map((t) => {
        const bankName = banks.find((b) => b.id === t.bankId)?.bankName || 'Conta';
        const signal = t.type === 'income' ? '' : '-';
        const val = `${signal}${Number(t.amount).toFixed(2).replace('.', ',')}`;
        return `${t.date};"${t.description}";${t.type === 'income' ? 'Receita' : 'Despesa'};${t.category};${t.paymentMethod};${bankName};${t.status === 'paid' ? 'Pago' : 'Pendente'};${val}`;
      })
      .join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extrato-raiox-${selectedMonthKey}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Cabeçalho e Botão de Lançamento Rápido */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Extrato Unificado de Gestão Multibancos
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pesquise, filtre, edite ou dê baixa em lançamentos à vista, boletos agendados e parcelas de cartão.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar CSV
            </button>
            <button
              type="button"
              onClick={onOpenNewModal}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              + Registrar Pagamento / Receita
            </button>
          </div>
        </div>

        {/* Barra de Busca e Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 pt-2">
          {/* Busca textual */}
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por descrição, banco, Pix..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/90 text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Período */}
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/90 text-xs font-medium"
          >
            <option value="current">Mês: {formatMonthYearLabel(selectedMonthKey)}</option>
            <option value="next">Próx. Mês: {formatMonthYearLabel(nextMonthKey)}</option>
            <option value="all">Todo o Histórico + Parcelas Futuras</option>
          </select>

          {/* Banco */}
          <select
            value={selectedBankId}
            onChange={(e) => onSelectBank(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/90 text-xs font-medium"
          >
            <option value="all">Todos os Bancos ({banks.length})</option>
            {banks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.bankName}
              </option>
            ))}
          </select>

          {/* Forma de Pagamento */}
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/90 text-xs font-medium"
          >
            <option value="all">Meio de Pagamento: Todos</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/90 text-xs font-medium"
          >
            <option value="all">Status: Todos</option>
            <option value="paid">Apenas Pagos / Recebidos</option>
            <option value="pending">Apenas Agendados / Pendentes</option>
          </select>
        </div>

        {/* Segunda linha de filtros rápidos (Pills de Tipo e Categoria) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'expense', label: 'Despesas' },
              { id: 'income', label: 'Receitas' },
              { id: 'fixed', label: 'Contas Fixas' },
              { id: 'installment', label: 'Parcelados no Crédito' }
            ].map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={() => setTypeFilter(pill.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  typeFilter === pill.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
            >
              <option value="all">Todas as Categorias</option>
              {allCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Resumo Rápido dos Itens Filtrados */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block">Entradas (Filtro Atual)</span>
            <span className="text-lg font-extrabold font-mono-num text-emerald-600 dark:text-emerald-400">
              {formatBRL(summary.income, privacyMode)}
            </span>
          </div>
          <ArrowUpRight className="w-5 h-5 text-emerald-500" />
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block">Saídas (Filtro Atual)</span>
            <span className="text-lg font-extrabold font-mono-num text-rose-600 dark:text-rose-400">
              - {formatBRL(summary.expense, privacyMode)}
            </span>
          </div>
          <ArrowDownRight className="w-5 h-5 text-rose-500" />
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block">
              Resultado ({filteredTransactions.length} lançamentos)
            </span>
            <span
              className={`text-lg font-extrabold font-mono-num ${
                summary.net >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatBRL(summary.net, privacyMode)}
            </span>
          </div>
        </div>
      </div>

      {/* Tabela do Extrato Unificado */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Nenhum lançamento encontrado para os filtros selecionados.
            </p>
            <p className="text-xs text-slate-400">
              Altere os filtros acima ou clique em "+ Registrar Pagamento / Receita".
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4">Data</th>
                  <th className="py-3.5 px-4">Descrição</th>
                  <th className="py-3.5 px-4">Banco / Conta</th>
                  <th className="py-3.5 px-4">Categoria</th>
                  <th className="py-3.5 px-4">Forma de Pagamento</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Valor</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-xs">
                {filteredTransactions.map((tx) => {
                  const bank = banks.find((b) => b.id === tx.bankId);
                  const isInstallment =
                    tx.installmentTotal && Number(tx.installmentTotal) > 1;

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono-num whitespace-nowrap text-slate-500 dark:text-slate-400">
                        {formatDateBR(tx.date)}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                          <span>{tx.description}</span>
                          {tx.isFixed && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-300 border border-sky-500/20 text-[10px] font-bold">
                              <Repeat className="w-2.5 h-2.5" /> Fixa
                            </span>
                          )}
                          {isInstallment && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/20 text-[10px] font-bold">
                              <Layers className="w-2.5 h-2.5" />
                              Parcela {tx.installmentCurrent}/{tx.installmentTotal}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {bank ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: bank.color || '#10b981' }}
                            />
                            {bank.bankName}
                          </span>
                        ) : (
                          <span className="text-slate-400">Conta Padrão</span>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                          {tx.category}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-300 font-medium">
                        {tx.paymentMethod}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onToggleStatus(tx)}
                          title="Clique para alternar entre Pago e Agendado/Pendente"
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-colors ${
                            tx.status === 'paid'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25'
                              : 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/25'
                          }`}
                        >
                          {tx.status === 'paid' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              Pago
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" />
                              Agendado
                            </>
                          )}
                        </button>
                      </td>

                      <td
                        className={`py-3 px-4 text-right font-mono-num font-bold whitespace-nowrap ${
                          tx.type === 'income'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : '-'}
                        {formatBRL(tx.amount, privacyMode)}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEditTransaction(tx)}
                            title="Editar lançamento"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteTransaction(tx)}
                            title="Excluir lançamento"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
