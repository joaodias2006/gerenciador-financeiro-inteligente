import React, { useState } from 'react';
import {
  Landmark,
  RefreshCw,
  Upload,
  FileSpreadsheet,
  FileCode2,
  CheckCircle2,
  Plus,
  Trash2,
  Settings2,
  Shield,
  Edit3,
  Check,
  Sparkles,
  Filter,
  AlertCircle,
  Building2
} from 'lucide-react';
import { BANCOS_CATALOGO } from '../data/initialData.js';
import {
  createRealManualBankAccount,
  syncRealPluggyOpenFinance,
  simulateBankConnection,
  parseOFXStatement,
  parseCSVStatement,
  getSampleOFXContent,
  getSampleCSVContent
} from '../services/openFinanceService.js';
import { formatBRL, formatDateBR } from '../utils/formatters.js';

export default function BanksOpenFinanceTab({
  user,
  banks,
  transactions,
  privacyMode,
  selectedBankId,
  onSelectBank,
  onAddBankWithTransactions,
  onUpdateBank,
  onDeleteBank,
  onImportTransactions
}) {
  // Aba interna de conexão: 'real_manual' | 'ofx_csv' | 'pluggy_api' | 'simulador'
  const [connectionTab, setConnectionTab] = useState('real_manual');

  // Form de Cadastro de Conta Bancária Real
  const [realBankCode, setRealBankCode] = useState('260');
  const [realCustomName, setRealCustomName] = useState('');
  const [realAgency, setRealAgency] = useState('0001');
  const [realAccountNum, setRealAccountNum] = useState('');
  const [realBalance, setRealBalance] = useState('');
  const [realCreditLimit, setRealCreditLimit] = useState('');
  const [realCurrentInvoice, setRealCurrentInvoice] = useState('');
  const [realClosingDay, setRealClosingDay] = useState('25');
  const [realDueDay, setRealDueDay] = useState('5');
  const [realAccountSuccess, setRealAccountSuccess] = useState('');

  // Edição inline de banco existente
  const [syncingBankId, setSyncingBankId] = useState(null);
  const [editingBankId, setEditingBankId] = useState(null);
  const [editBalance, setEditBalance] = useState('');
  const [editLimit, setEditLimit] = useState('');

  // Estado do Importador Real OFX / CSV
  const [importTargetBankId, setImportTargetBankId] = useState(banks[0]?.id || '');
  const [parsedPreview, setParsedPreview] = useState([]);
  const [detectedOfxBalance, setDetectedOfxBalance] = useState(null);
  const [applyOfxBalance, setApplyOfxBalance] = useState(true);
  const [importSourceLabel, setImportSourceLabel] = useState('');
  const [importFeedback, setImportFeedback] = useState('');

  // Estado da Conexão Real Open Finance Pluggy API
  const [pluggyClientId, setPluggyClientId] = useState('');
  const [pluggyClientSecret, setPluggyClientSecret] = useState('');
  const [pluggyItemId, setPluggyItemId] = useState('');
  const [pluggyLoading, setPluggyLoading] = useState(false);
  const [pluggyError, setPluggyError] = useState('');
  const [pluggySuccess, setPluggySuccess] = useState('');

  // Simulador
  const [connectingCode, setConnectingCode] = useState(null);

  const totalConsolidatedBalance = banks.reduce((acc, b) => acc + Number(b.balance || 0), 0);
  const totalConsolidatedLimit = banks.reduce((acc, b) => acc + Number(b.creditLimit || 0), 0);
  const totalConsolidatedUsed = banks.reduce((acc, b) => acc + Number(b.creditUsed || 0), 0);

  // 1. Cadastra uma Conta Bancária REAL do usuário (sem transações fictícias)
  const handleCreateRealAccount = async (e) => {
    e.preventDefault();
    const newRealBank = createRealManualBankAccount({
      bankCode: realBankCode,
      customBankName: realCustomName,
      agency: realAgency,
      accountNumber: realAccountNum || 'Conta Principal',
      balance: parseFloat(String(realBalance).replace(',', '.')) || 0,
      creditLimit: parseFloat(String(realCreditLimit).replace(',', '.')) || 0,
      currentInvoice: parseFloat(String(realCurrentInvoice).replace(',', '.')) || 0,
      closingDay: Number(realClosingDay) || 25,
      dueDay: Number(realDueDay) || 5,
      userId: user.id
    });

    await onAddBankWithTransactions(newRealBank, []);
    setImportTargetBankId(newRealBank.id);
    setRealBalance('');
    setRealCreditLimit('');
    setRealCurrentInvoice('');
    setRealAccountNum('');
    setRealCustomName('');
    setRealAccountSuccess(
      `Conta real ${newRealBank.bankName} cadastrada com sucesso! Agora você pode lançar seus gastos reais ou importar seu extrato .OFX/.CSV.`
    );
    setTimeout(() => setRealAccountSuccess(''), 5000);
  };

  // 2. Sincronização REAL via API Pluggy Open Finance Brasil
  const handleRealPluggySync = async (e) => {
    e.preventDefault();
    setPluggyError('');
    setPluggySuccess('');
    setPluggyLoading(true);
    try {
      const { bank, transactions: realTxs } = await syncRealPluggyOpenFinance({
        clientId: pluggyClientId.trim(),
        clientSecret: pluggyClientSecret.trim(),
        itemId: pluggyItemId.trim(),
        userId: user.id
      });
      await onAddBankWithTransactions(bank, realTxs);
      setPluggySuccess(
        `Conexão Open Finance concluída! Conta ${bank.bankName} e ${realTxs.length} transações reais sincronizadas.`
      );
    } catch (err) {
      setPluggyError(err.message || 'Erro ao conectar com a API Pluggy.');
    } finally {
      setPluggyLoading(false);
    }
  };

  // 3. Processa upload de arquivo REAL .OFX ou .CSV do computador do usuário
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const targetBank = importTargetBankId || banks[0]?.id;
    if (!targetBank) {
      setImportFeedback('Cadastre primeiro sua conta bancária acima antes de importar o extrato.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = String(ev.target?.result || '');
      const isOfx =
        file.name.toLowerCase().endsWith('.ofx') || content.toUpperCase().includes('<OFX>');

      if (isOfx) {
        const parsed = parseOFXStatement(content, targetBank, user.id, {
          preserveRealDates: true
        });
        setParsedPreview(parsed);
        setDetectedOfxBalance(
          parsed.metadata?.ledgerBalance !== null && parsed.metadata?.ledgerBalance !== undefined
            ? parsed.metadata.ledgerBalance
            : null
        );
        setImportSourceLabel(`Extrato Real OFX: ${file.name} (${parsed.length} transações reais)`);
      } else {
        const parsed = parseCSVStatement(content, targetBank, user.id, {
          preserveRealDates: true
        });
        setParsedPreview(parsed);
        setDetectedOfxBalance(null);
        setImportSourceLabel(`Extrato/Fatura Real CSV: ${file.name} (${parsed.length} transações reais)`);
      }
      setImportFeedback('');
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleLoadSampleStatement = (format) => {
    const targetBank = importTargetBankId || banks[0]?.id;
    if (!targetBank) return;

    if (format === 'ofx') {
      const ofxContent = getSampleOFXContent();
      const items = parseOFXStatement(ofxContent, targetBank, user.id, {
        preserveRealDates: false
      });
      setParsedPreview(items);
      setDetectedOfxBalance(null);
      setImportSourceLabel('Amostra padrao_febraban.ofx (4 lançamentos)');
    } else {
      const csvContent = getSampleCSVContent();
      const items = parseCSVStatement(csvContent, targetBank, user.id, {
        preserveRealDates: false
      });
      setParsedPreview(items);
      setDetectedOfxBalance(null);
      setImportSourceLabel('Amostra fatura_mensal.csv (4 lançamentos)');
    }
    setImportFeedback('');
  };

  const handleConfirmImport = async () => {
    if (parsedPreview.length === 0) return;
    const targetBank = importTargetBankId || banks[0]?.id;

    // Desduplica transações pelo ID/descrição+data+valor para não duplicar extratos reais
    const existingKeys = new Set(
      transactions.map((t) => `${t.date}|${t.description}|${Number(t.amount).toFixed(2)}`)
    );
    const uniqueNew = parsedPreview.filter(
      (t) => !existingKeys.has(`${t.date}|${t.description}|${Number(t.amount).toFixed(2)}`)
    );

    if (uniqueNew.length > 0) {
      await onImportTransactions(uniqueNew);
    }

    if (detectedOfxBalance !== null && applyOfxBalance && targetBank) {
      await onUpdateBank(targetBank, {
        balance: detectedOfxBalance,
        lastSync: 'Saldo atualizado via arquivo OFX oficial'
      });
    }

    setImportFeedback(
      `${uniqueNew.length} lançamentos inéditos importados com sucesso (${
        parsedPreview.length - uniqueNew.length
      } duplicados ignorados)!`
    );
    setParsedPreview([]);
    setDetectedOfxBalance(null);
  };

  const handleSimulateConnect = async (bankCode) => {
    setConnectingCode(bankCode);
    await new Promise((r) => setTimeout(r, 350));
    const { bank, transactions: sampleTxs } = simulateBankConnection(bankCode, user.id);
    await onAddBankWithTransactions(bank, sampleTxs);
    if (!importTargetBankId) setImportTargetBankId(bank.id);
    setConnectingCode(null);
  };

  const handleSyncSingleBank = async (bank) => {
    setSyncingBankId(bank.id);
    await new Promise((r) => setTimeout(r, 350));
    const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    await onUpdateBank(bank.id, {
      lastSync: `Verificado às ${nowTime}`,
      status: 'Conta Ativa'
    });
    setSyncingBankId(null);
  };

  const handleStartEditBank = (bank) => {
    setEditingBankId(bank.id);
    setEditBalance(String(bank.balance));
    setEditLimit(String(bank.creditLimit));
  };

  const handleSaveBankEdit = async (bankId) => {
    await onUpdateBank(bankId, {
      balance: Number(editBalance) || 0,
      creditLimit: Number(editLimit) || 0,
      lastSync: 'Saldo real atualizado manualmente'
    });
    setEditingBankId(null);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho Consolidado Multibancos do Titular */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                Gestão Real • Mesmo Titular
              </span>
              <span className="text-xs text-slate-400 font-mono-num">
                CPF: {user.cpf}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-1.5 flex items-center gap-2">
              <Landmark className="w-5 h-5 text-emerald-500" />
              Minhas Contas e Bancos ({banks.length} Instituições)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Cadastre seus bancos reais com seu saldo atual, importe seus extratos `.OFX`/`.CSV` do internet banking ou sincronize via API Open Finance.
            </p>
          </div>
        </div>

        {/* Resumo Consolidado */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-800/80">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
              Saldo Consolidado em Contas
            </span>
            <span className="text-2xl font-extrabold font-mono-num text-emerald-600 dark:text-emerald-400 mt-1 block">
              {formatBRL(totalConsolidatedBalance, privacyMode)}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Soma líquida disponível nas {banks.length} contas
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-800/80">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
              Limite de Crédito Consolidado
            </span>
            <span className="text-2xl font-extrabold font-mono-num text-slate-900 dark:text-white mt-1 block">
              {formatBRL(totalConsolidatedLimit, privacyMode)}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Disponível: {formatBRL(Math.max(0, totalConsolidatedLimit - totalConsolidatedUsed), privacyMode)}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-800/80 flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                Filtro Ativo de Visualização
              </span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1 block">
                {selectedBankId === 'all'
                  ? 'Visão Consolidada (Todos os Bancos)'
                  : `Filtrando apenas: ${banks.find((b) => b.id === selectedBankId)?.bankName || ''}`}
              </span>
            </div>
            {selectedBankId !== 'all' && (
              <button
                type="button"
                onClick={() => onSelectBank('all')}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline text-left mt-2 cursor-pointer"
              >
                Voltar para visão consolidada de todos os bancos →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cards das Contas Bancárias Ativas */}
      {banks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {banks.map((bank) => {
            const isSelected = selectedBankId === bank.id;
            const bankTxCount = transactions.filter((t) => t.bankId === bank.id).length;

            return (
              <div
                key={bank.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border transition-all shadow-xs flex flex-col justify-between ${
                  isSelected
                    ? 'border-2 border-emerald-500 ring-2 ring-emerald-500/15'
                    : 'border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-extrabold text-xs shadow-xs shrink-0"
                        style={{ backgroundColor: bank.color || '#0d9488' }}
                      >
                        {bank.bankCode}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                          {bank.bankName}
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Ag {bank.agency} • Cc {bank.accountNumber}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        title="Atualizar status"
                        onClick={() => handleSyncSingleBank(bank)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <RefreshCw
                          className={`w-4 h-4 ${syncingBankId === bank.id ? 'animate-spin text-emerald-500' : ''}`}
                        />
                      </button>
                      <button
                        type="button"
                        title="Editar Saldo Real e Limite"
                        onClick={() => handleStartEditBank(bank)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        title="Remover Conta"
                        onClick={() => onDeleteBank(bank.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {editingBankId === bank.id ? (
                    <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-semibold text-slate-400 block">
                            Saldo Real em Conta (R$)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={editBalance}
                            onChange={(e) => setEditBalance(e.target.value)}
                            className="w-full px-2 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono-num"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-400 block">
                            Limite Cartão (R$)
                          </label>
                          <input
                            type="number"
                            step="100"
                            value={editLimit}
                            onChange={(e) => setEditLimit(e.target.value)}
                            className="w-full px-2 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono-num"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingBankId(null)}
                          className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveBankEdit(bank.id)}
                          className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" /> Salvar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
                      <div>
                        <span className="text-[11px] text-slate-400 block">Saldo em Conta</span>
                        <span className="text-lg font-extrabold font-mono-num text-emerald-600 dark:text-emerald-400">
                          {formatBRL(bank.balance, privacyMode)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block">Limite de Crédito</span>
                        <span className="text-lg font-extrabold font-mono-num text-slate-800 dark:text-slate-200">
                          {formatBRL(bank.creditLimit, privacyMode)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400 truncate">
                    {bank.lastSync} • {bankTxCount} lançamentos
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelectBank(isSelected ? 'all' : bank.id)}
                    className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-500/15 hover:text-emerald-500'
                    }`}
                  >
                    <Filter className="w-3 h-3" />
                    {isSelected ? 'Filtro Ativo' : 'Filtrar Banco'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =====================================================================
          CENTRAL DE CONEXÃO DE BANCOS REAIS (3 MÉTODOS REAIS + SIMULADOR)
         ===================================================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
          <button
            type="button"
            onClick={() => setConnectionTab('real_manual')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
              connectionTab === 'real_manual'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Building2 className="w-4 h-4" />
            1. Cadastrar Meu Banco Real (Saldo & Cartão)
          </button>

          <button
            type="button"
            onClick={() => setConnectionTab('ofx_csv')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
              connectionTab === 'ofx_csv'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Upload className="w-4 h-4" />
            2. Importar Meu Extrato / Fatura Real (.OFX e .CSV)
          </button>

          <button
            type="button"
            onClick={() => setConnectionTab('pluggy_api')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
              connectionTab === 'pluggy_api'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Shield className="w-4 h-4" />
            3. Open Finance Automático (API Pluggy Real)
          </button>

          <button
            type="button"
            onClick={() => setConnectionTab('simulador')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
              connectionTab === 'simulador'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            4. Simulador de Teste
          </button>
        </div>

        {/* ABA 1: CADASTRAR MEU BANCO REAL */}
        {connectionTab === 'real_manual' && (
          <form onSubmit={handleCreateRealAccount} className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Cadastrar Minha Conta Bancária Real
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Adicione seu banco real informando seu saldo em conta atual e o limite do seu cartão de crédito. Nenhum lançamento fictício será adicionado.
              </p>
            </div>

            {realAccountSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{realAccountSuccess}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Instituição Financeira
                </label>
                <select
                  value={realBankCode}
                  onChange={(e) => setRealBankCode(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                >
                  {BANCOS_CATALOGO.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.code} — {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Apelido / Nome Personalizado (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Nubank Principal, Itaú Salário..."
                  value={realCustomName}
                  onChange={(e) => setRealCustomName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    Agência
                  </label>
                  <input
                    type="text"
                    value={realAgency}
                    onChange={(e) => setRealAgency(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono-num"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    Nº da Conta
                  </label>
                  <input
                    type="text"
                    placeholder="12345-6"
                    value={realAccountNum}
                    onChange={(e) => setRealAccountNum(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono-num"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
              <div>
                <label className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 block mb-1">
                  Saldo Real Atual em Conta (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Ex: 3450.80"
                  value={realBalance}
                  onChange={(e) => setRealBalance(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-emerald-500/40 bg-slate-50 dark:bg-slate-800 text-sm font-mono-num font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Limite Total do Cartão (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 8000.00"
                  value={realCreditLimit}
                  onChange={(e) => setRealCreditLimit(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono-num font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Dia Fechamento Fatura
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={realClosingDay}
                  onChange={(e) => setRealClosingDay(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono-num"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Dia Vencimento Fatura
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={realDueDay}
                  onChange={(e) => setRealDueDay(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono-num"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Adicionar Minha Conta Bancária Real
              </button>
            </div>
          </form>
        )}

        {/* ABA 2: IMPORTADOR REAL DE EXTRATOS .OFX E .CSV */}
        {connectionTab === 'ofx_csv' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Importar Extrato Bancário ou Fatura Real (.OFX e .CSV)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Exporte o arquivo <strong>.OFX</strong> ou <strong>.CSV</strong> do aplicativo/site do seu banco (Nubank, Itaú, Banco Inter, Bradesco, Banco do Brasil, Santander, Caixa, C6) e envie abaixo. O sistema preserva as datas reais, atualiza seu saldo oficial do OFX e evita duplicidades.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Selecione sua Conta Bancária de Destino:
                </label>
                <select
                  value={importTargetBankId || banks[0]?.id || ''}
                  onChange={(e) => setImportTargetBankId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                >
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bankName} (Ag {b.agency} • Cc {b.accountNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-2">
                <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer shadow-xs">
                  <Upload className="w-4 h-4" />
                  <span>Escolher Arquivo .OFX ou .CSV do Meu Computador</span>
                  <input
                    type="file"
                    accept=".ofx,.csv,text/csv,application/x-ofx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="text-slate-400">Ou teste o parser com arquivos de exemplo:</span>
              <button
                type="button"
                onClick={() => handleLoadSampleStatement('ofx')}
                className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-teal-500 text-xs font-semibold cursor-pointer"
              >
                Testar Exemplo .OFX
              </button>
              <button
                type="button"
                onClick={() => handleLoadSampleStatement('csv')}
                className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-amber-500 text-xs font-semibold cursor-pointer"
              >
                Testar Exemplo .CSV
              </button>
            </div>

            {importFeedback && (
              <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{importFeedback}</span>
              </div>
            )}

            {parsedPreview.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      {importSourceLabel}
                    </span>
                    {detectedOfxBalance !== null && (
                      <label className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={applyOfxBalance}
                          onChange={(e) => setApplyOfxBalance(e.target.checked)}
                          className="rounded accent-emerald-600"
                        />
                        Atualizar saldo da conta para {formatBRL(detectedOfxBalance)} (detectado no arquivo OFX)
                      </label>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Confirmar Importação ({parsedPreview.length} itens)
                  </button>
                </div>

                <div className="max-h-56 overflow-y-auto divide-y divide-slate-200/60 dark:divide-slate-800 text-xs">
                  {parsedPreview.map((item) => (
                    <div key={item.id} className="py-2 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {item.description}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Data Real: {formatDateBR(item.date)} • {item.category} • {item.paymentMethod}
                        </div>
                      </div>
                      <span
                        className={`font-mono-num font-bold shrink-0 ${
                          item.type === 'income'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {item.type === 'income' ? '+' : '-'}
                        {formatBRL(item.amount, privacyMode)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ABA 3: OPEN FINANCE AUTOMÁTICO VIA API PLUGGY REAL */}
        {connectionTab === 'pluggy_api' && (
          <form onSubmit={handleRealPluggySync} className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-500" />
                Sincronização Automática Open Finance Brasil (API Pluggy Real)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                No Brasil, a conexão direta com bancos via Open Finance exige um agregador homologado pelo Banco Central (como a <strong>Pluggy</strong>). Você pode criar uma conta gratuita de desenvolvedor em <code>dashboard.pluggy.ai</code>, conectar seu banco real pelo QR Code do Open Finance e colar abaixo seu <strong>Client ID</strong>, <strong>Client Secret</strong> e o <strong>Item ID</strong> da sua conexão para puxar seu saldo e extrato reais automaticamente!
              </p>
            </div>

            {pluggyError && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{pluggyError}</span>
              </div>
            )}

            {pluggySuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{pluggySuccess}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Pluggy Client ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="UUID do seu Client ID Pluggy"
                  value={pluggyClientId}
                  onChange={(e) => setPluggyClientId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono-num"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Pluggy Client Secret *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Seu Client Secret Pluggy"
                  value={pluggyClientSecret}
                  onChange={(e) => setPluggyClientSecret(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono-num"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Pluggy Item ID (Conexão do Banco) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="UUID do Item conectado"
                  value={pluggyItemId}
                  onChange={(e) => setPluggyItemId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono-num"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={pluggyLoading}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${pluggyLoading ? 'animate-spin' : ''}`} />
                {pluggyLoading
                  ? 'Conectando à API Pluggy...'
                  : 'Sincronizar Meu Banco Real via Pluggy API'}
              </button>
            </div>
          </form>
        )}

        {/* ABA 4: SIMULADOR DE TESTE */}
        {connectionTab === 'simulador' && (
          <div className="space-y-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Simulador Rápido de Bancos (Para Testes)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Adiciona uma conta com dados simulados apenas para testar os gráficos. Para usar seus dados reais, use a aba <strong>1. Cadastrar Meu Banco Real</strong> ou <strong>2. Importar Meu Extrato</strong>.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {BANCOS_CATALOGO.map((inst) => (
                <div
                  key={inst.code}
                  className="p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0"
                      style={{ backgroundColor: inst.color }}
                    >
                      {inst.code}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {inst.name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Simulado: {formatBRL(inst.defaultBalance, privacyMode)}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={connectingCode === inst.code}
                    onClick={() => handleSimulateConnect(inst.code)}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-200 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white cursor-pointer transition-colors"
                  >
                    + Simular
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
