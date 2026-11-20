import React, { useState, useEffect } from 'react';
import {
  X,
  PlusCircle,
  Layers,
  Repeat,
  CheckCircle2,
  Clock,
  QrCode
} from 'lucide-react';
import {
  PAYMENT_METHODS,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  buildRelativeDate
} from '../data/initialData.js';
import { decodeRealBoletoOrPix } from '../services/openFinanceService.js';
import { formatBRL } from '../utils/formatters.js';

export default function TransactionModal({
  isOpen,
  onClose,
  banks,
  editingTransaction,
  onSaveTransaction
}) {
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [amountMode, setAmountMode] = useState('installment'); // 'installment' | 'total'
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(buildRelativeDate(0, new Date().getDate()));
  const [bankId, setBankId] = useState(banks[0]?.id || '');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [status, setStatus] = useState('paid');
  const [paymentMethod, setPaymentMethod] = useState('Pix');
  const [installmentsCount, setInstallmentsCount] = useState(6);
  const [isFixed, setIsFixed] = useState(false);

  // Leitor de Boleto FEBRABAN / Pix Copia e Cola
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeMsg, setBarcodeMsg] = useState('');

  useEffect(() => {
    setBarcodeInput('');
    setBarcodeMsg('');
    if (editingTransaction) {
      setType(editingTransaction.type || 'expense');
      setAmount(String(editingTransaction.amount || ''));
      setAmountMode('installment');
      setDescription(editingTransaction.description || '');
      setDate(editingTransaction.date || buildRelativeDate(0, 10));
      setBankId(editingTransaction.bankId || banks[0]?.id || '');
      setCategory(editingTransaction.category || EXPENSE_CATEGORIES[0]);
      setStatus(editingTransaction.status || 'paid');
      setPaymentMethod(editingTransaction.paymentMethod || 'Pix');
      setInstallmentsCount(editingTransaction.installmentTotal || 1);
      setIsFixed(Boolean(editingTransaction.isFixed));
    } else {
      setType('expense');
      setAmount('');
      setAmountMode('installment');
      setDescription('');
      setDate(buildRelativeDate(0, Math.min(28, new Date().getDate())));
      setBankId(banks[0]?.id || '');
      setCategory(EXPENSE_CATEGORIES[0]);
      setStatus('paid');
      setPaymentMethod('Pix');
      setInstallmentsCount(6);
      setIsFixed(false);
    }
  }, [editingTransaction, banks, isOpen]);

  if (!isOpen) return null;

  const categoriesList = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleDecodeBarcode = () => {
    const res = decodeRealBoletoOrPix(barcodeInput);
    if (!res.valid) {
      setBarcodeMsg(res.error);
      return;
    }
    setType('expense');
    if (res.amount > 0) setAmount(String(res.amount.toFixed(2)));
    if (res.dueDate) setDate(res.dueDate);
    if (res.description) setDescription(res.description);
    if (res.category) setCategory(res.category);
    if (res.paymentMethod) setPaymentMethod(res.paymentMethod);
    if (res.status) setStatus(res.status);
    setBarcodeMsg(
      `✓ ${res.paymentMethod} identificado automaticamente (${formatBRL(res.amount)})!`
    );
  };

  const handleTypeChange = (newType) => {
    setType(newType);
    if (newType === 'income') {
      setCategory(INCOME_CATEGORIES[0]);
      setPaymentMethod('Pix');
    } else {
      setCategory(EXPENSE_CATEGORIES[0]);
    }
  };

  const handleMethodChange = (newMethod) => {
    setPaymentMethod(newMethod);
    if (
      newMethod === 'Cartão de Crédito Parcelado' ||
      newMethod === 'Cartão de Crédito à Vista'
    ) {
      setStatus('pending');
    }
  };

  const numericAmount = parseFloat(String(amount).replace(',', '.')) || 0;
  const isParcelado =
    type === 'expense' &&
    paymentMethod === 'Cartão de Crédito Parcelado' &&
    !editingTransaction;

  const perInstallmentValue =
    isParcelado && amountMode === 'total' && installmentsCount > 0
      ? Number((numericAmount / installmentsCount).toFixed(2))
      : Number(numericAmount.toFixed(2));

  const totalPurchaseValue = isParcelado
    ? Number((perInstallmentValue * installmentsCount).toFixed(2))
    : numericAmount;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description.trim() || numericAmount <= 0) return;

    const payload = {
      id: editingTransaction?.id,
      type,
      amount: isParcelado ? perInstallmentValue : numericAmount,
      description: description.trim(),
      date,
      bankId: bankId || banks[0]?.id,
      category,
      status,
      paymentMethod,
      isFixed
    };

    onSaveTransaction(
      payload,
      isParcelado ? Number(installmentsCount) : 1,
      Boolean(editingTransaction)
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 my-8">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-emerald-500" />
            {editingTransaction
              ? 'Editar Lançamento Financeiro'
              : 'Registrar Pagamento / Receita Real'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Leitor Rápido de Boleto FEBRABAN ou Pix Copia e Cola */}
        {!editingTransaction && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <QrCode className="w-3.5 h-3.5 text-emerald-500" />
              Leitor Rápido de Boleto (47/48 dígitos) ou Pix Copia e Cola (Opcional)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Cole a linha digitável do seu boleto ou código Pix 000201..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono-num"
              />
              <button
                type="button"
                onClick={handleDecodeBarcode}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shrink-0 cursor-pointer"
              >
                Ler Código
              </button>
            </div>
            {barcodeMsg && (
              <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                {barcodeMsg}
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Seletor Despesa vs Receita */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                type === 'expense'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Despesa / Saída
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                type === 'income'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Receita / Entrada
            </button>
          </div>

          {/* Valor e Data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                {isParcelado
                  ? amountMode === 'installment'
                    ? 'Valor de Cada Parcela (R$)'
                    : 'Valor Total da Compra (R$)'
                  : 'Valor (R$)'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono-num font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                Data do Lançamento / 1ª Parcela
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono-num focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
              Descrição do Lançamento
            </label>
            <input
              type="text"
              required
              placeholder={
                type === 'income'
                  ? 'Ex: Salário Mensal, Pix Consultoria...'
                  : 'Ex: Supermercado, Aluguel, Notebook Dell...'
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Banco e Categoria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                Banco / Conta Utilizada
              </label>
              <select
                value={bankId}
                onChange={(e) => setBankId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
              >
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bankName} ({b.accountNumber})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
              >
                {categoriesList.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Forma de Pagamento e Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                Forma de Pagamento
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => handleMethodChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                Status do Lançamento
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStatus('paid')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 cursor-pointer ${
                    status === 'paid'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/40'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Pago
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('pending')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 cursor-pointer ${
                    status === 'pending'
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/40'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Agendado
                </button>
              </div>
            </div>
          </div>

          {/* Painel Automático de Parcelamento no Cartão de Crédito */}
          {isParcelado && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-300 flex items-center gap-1.5">
                  <Layers className="w-4 h-4" />
                  Configuração de Compra Parcelada (1 de {installmentsCount})
                </span>
                <div className="flex items-center gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setAmountMode('installment')}
                    className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                      amountMode === 'installment'
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-500'
                    }`}
                  >
                    Valor da Parcela
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmountMode('total')}
                    className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                      amountMode === 'total'
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-500'
                    }`}
                  >
                    Valor Total
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    Quantidade de Parcelas:
                  </label>
                  <select
                    value={installmentsCount}
                    onChange={(e) => setInstallmentsCount(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-xl border border-amber-500/40 bg-white dark:bg-slate-900 text-xs font-bold"
                  >
                    {[2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 18, 24].map((n) => (
                      <option key={n} value={n}>
                        {n} parcelas (1 de {n})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="text-xs space-y-0.5">
                  <div className="text-slate-500 dark:text-slate-400">
                    Cada parcela:{' '}
                    <strong className="font-mono-num text-amber-600 dark:text-amber-300">
                      {formatBRL(perInstallmentValue)}
                    </strong>
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">
                    Total da compra:{' '}
                    <strong className="font-mono-num text-slate-800 dark:text-slate-200">
                      {formatBRL(totalPurchaseValue)}
                    </strong>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                O sistema gerará automaticamente as <strong>{installmentsCount} parcelas</strong> nos meses subsequentes para alimentar a <strong>Previsão do Próximo Mês</strong>.
              </p>
            </div>
          )}

          {/* Checkbox de Conta Fixa Recorrente */}
          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={isFixed}
              onChange={(e) => setIsFixed(e.target.checked)}
              className="w-4 h-4 rounded accent-emerald-600"
            />
            <div className="text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <Repeat className="w-3.5 h-3.5 text-sky-500" />
                Marcar como Conta Fixa / Recorrente Mensal
              </span>
              <span className="text-[11px] text-slate-400 block">
                Inclui este compromisso automaticamente no cálculo de Dinheiro Intocável e na Previsão do Próximo Mês.
              </span>
            </div>
          </label>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors"
            >
              {editingTransaction
                ? 'Salvar Alterações'
                : isParcelado
                ? `Gerar ${installmentsCount} Parcelas`
                : 'Confirmar Lançamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
