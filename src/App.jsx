import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  LayoutDashboard,
  Landmark,
  ReceiptText,
  CalendarArrowUp,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Plus,
  UserCheck,
  RotateCcw,
  Eraser,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  DEMO_USERS,
  generateSeedDataForUser,
  getCurrentMonthKey,
  getNextMonthKey
} from './data/initialData.js';
import {
  calculateFinancialXRay,
  generateInstallmentTransactions
} from './services/financialEngine.js';
import {
  formatMonthYearLabel,
  getSelectableMonths
} from './utils/formatters.js';
import DashboardTab from './components/DashboardTab.jsx';
import BanksOpenFinanceTab from './components/BanksOpenFinanceTab.jsx';
import TransactionsTab from './components/TransactionsTab.jsx';
import NextMonthProjectionTab from './components/NextMonthProjectionTab.jsx';
import TransactionModal from './components/TransactionModal.jsx';
import AuthTitularModal from './components/AuthTitularModal.jsx';

export default function App() {
  // Tema (Dark por padrão estilo fintech moderna) e Modo Privacidade
  const [darkMode, setDarkMode] = useState(true);
  const [privacyMode, setPrivacyMode] = useState(false);

  // Navegação e Filtros Globais
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'banks' | 'transactions' | 'projection'
  const [selectedMonthKey, setSelectedMonthKey] = useState(getCurrentMonthKey());
  const [selectedBankId, setSelectedBankId] = useState('all');

  // Estado Full-Stack Isolado por Titular
  const [currentUserId, setCurrentUserId] = useState('user-joao-01');
  const [allUsers, setAllUsers] = useState(DEMO_USERS);
  const [userProfile, setUserProfile] = useState(DEMO_USERS[0]);
  const [banks, setBanks] = useState(() => generateSeedDataForUser('user-joao-01').banks);
  const [transactions, setTransactions] = useState(
    () => generateSeedDataForUser('user-joao-01').transactions
  );

  // Modais
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Sincroniza classe dark no HTML
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  // Carrega dados do Backend SQL (/api/state) para o titular autenticado
  useEffect(() => {
    let active = true;
    async function loadFromBackend() {
      try {
        const res = await fetch(`/api/state?userId=${encodeURIComponent(currentUserId)}`, {
          headers: { 'x-user-id': currentUserId }
        });
        if (!res.ok) throw new Error('Fallback local');
        const data = await res.json();
        if (!active) return;
        if (data.user) setUserProfile(data.user);
        if (Array.isArray(data.users)) setAllUsers(data.users);
        if (Array.isArray(data.banks)) setBanks(data.banks);
        if (Array.isArray(data.transactions)) setTransactions(data.transactions);
      } catch {
        // Fallback offline se aberto fora do servidor Node
        const fallbackProfile =
          DEMO_USERS.find((u) => u.id === currentUserId) || DEMO_USERS[0];
        const seeded = generateSeedDataForUser(currentUserId);
        if (!active) return;
        setUserProfile(fallbackProfile);
        setBanks(seeded.banks);
        setTransactions(seeded.transactions);
      }
    }
    loadFromBackend();
    return () => {
      active = false;
    };
  }, [currentUserId]);

  const applyServerState = (data) => {
    if (data?.user) setUserProfile(data.user);
    if (Array.isArray(data?.users)) setAllUsers(data.users);
    if (Array.isArray(data?.banks)) setBanks(data.banks);
    if (Array.isArray(data?.transactions)) setTransactions(data.transactions);
  };

  // Cálculo em tempo real do Raio-X Financeiro
  const xray = useMemo(
    () =>
      calculateFinancialXRay({
        banks,
        transactions,
        userProfile,
        selectedMonthKey,
        selectedBankId
      }),
    [banks, transactions, userProfile, selectedMonthKey, selectedBankId]
  );

  const selectableMonths = useMemo(
    () => getSelectableMonths(getCurrentMonthKey()),
    []
  );

  const handleShiftMonth = (delta) => {
    const [y, m] = selectedMonthKey.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setSelectedMonthKey(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    );
  };

  // =========================================================================
  // HANDLERS DE MUTAÇÃO (FULL-STACK API + ATUALIZAÇÃO INSTANTÂNEA)
  // =========================================================================
  const handleUpdateProfile = async (updates) => {
    setUserProfile((prev) => ({ ...prev, ...updates }));
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUserId
        },
        body: JSON.stringify(updates)
      });
      if (res.ok) applyServerState(await res.json());
    } catch {
      // Estado já atualizado otimistamente
    }
  };

  const handleSaveTransaction = async (txPayload, installmentsCount = 1, isEditing = false) => {
    if (isEditing && txPayload.id) {
      setTransactions((prev) =>
        prev.map((t) => (t.id === txPayload.id ? { ...t, ...txPayload } : t))
      );
      try {
        const res = await fetch(`/api/transactions/${txPayload.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUserId
          },
          body: JSON.stringify(txPayload)
        });
        if (res.ok) applyServerState(await res.json());
      } catch {
        // Otimista mantido
      }
      return;
    }

    // Criação de novo lançamento (com geração automática de parcelas futuras se Crédito Parcelado)
    const generatedList = generateInstallmentTransactions(
      { ...txPayload, userId: currentUserId },
      installmentsCount
    );

    setTransactions((prev) => [...generatedList, ...prev]);

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUserId
        },
        body: JSON.stringify({ transactions: generatedList })
      });
      if (res.ok) applyServerState(await res.json());
    } catch {
      // Otimista mantido
    }
  };

  const handleToggleTransactionStatus = async (tx) => {
    const newStatus = tx.status === 'paid' ? 'pending' : 'paid';
    setTransactions((prev) =>
      prev.map((t) => (t.id === tx.id ? { ...t, status: newStatus } : t))
    );
    try {
      const res = await fetch(`/api/transactions/${tx.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUserId
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) applyServerState(await res.json());
    } catch {
      // Otimista mantido
    }
  };

  const handleDeleteTransaction = async (tx) => {
    const isInstallment = tx.installmentGroupId && tx.installmentTotal > 1;
    setTransactions((prev) =>
      prev.filter((t) =>
        isInstallment
          ? t.installmentGroupId !== tx.installmentGroupId
          : t.id !== tx.id
      )
    );
    try {
      const res = await fetch(
        `/api/transactions/${tx.id}?deleteGroup=${isInstallment ? 'true' : 'false'}`,
        {
          method: 'DELETE',
          headers: { 'x-user-id': currentUserId }
        }
      );
      if (res.ok) applyServerState(await res.json());
    } catch {
      // Otimista mantido
    }
  };

  const handleAddBankWithTransactions = async (newBank, sampleTransactions = []) => {
    setBanks((prev) => [...prev, newBank]);
    if (sampleTransactions.length > 0) {
      setTransactions((prev) => [...sampleTransactions, ...prev]);
    }
    try {
      const res = await fetch('/api/banks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUserId
        },
        body: JSON.stringify({ bank: newBank, transactions: sampleTransactions })
      });
      if (res.ok) applyServerState(await res.json());
    } catch {
      // Otimista mantido
    }
  };

  const handleUpdateBank = async (bankId, updates) => {
    setBanks((prev) =>
      prev.map((b) => (b.id === bankId ? { ...b, ...updates } : b))
    );
    try {
      const res = await fetch(`/api/banks/${bankId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUserId
        },
        body: JSON.stringify(updates)
      });
      if (res.ok) applyServerState(await res.json());
    } catch {
      // Otimista mantido
    }
  };

  const handleDeleteBank = async (bankId) => {
    if (selectedBankId === bankId) setSelectedBankId('all');
    setBanks((prev) => prev.filter((b) => b.id !== bankId));
    setTransactions((prev) => prev.filter((t) => t.bankId !== bankId));
    try {
      const res = await fetch(`/api/banks/${bankId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': currentUserId }
      });
      if (res.ok) applyServerState(await res.json());
    } catch {
      // Otimista mantido
    }
  };

  const handleImportTransactions = async (importedItems) => {
    setTransactions((prev) => [...importedItems, ...prev]);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUserId
        },
        body: JSON.stringify({ transactions: importedItems })
      });
      if (res.ok) applyServerState(await res.json());
    } catch {
      // Otimista mantido
    }
  };

  // Limpar dados de exemplo para o usuário começar do zero
  const handleClearSampleData = async () => {
    setTransactions([]);
    setBanks((prev) =>
      prev.map((b) => ({ ...b, balance: 0, creditUsed: 0, currentInvoice: 0 }))
    );
    setUserProfile((prev) => ({
      ...prev,
      vaultSavedCurrentMonth: 0,
      rolloverAmount: 0
    }));
    try {
      const res = await fetch('/api/seed/clear', {
        method: 'POST',
        headers: { 'x-user-id': currentUserId }
      });
      if (res.ok) applyServerState(await res.json());
    } catch {
      // Otimista mantido
    }
  };

  // Restaurar dados de exemplo
  const handleRestoreSampleData = async () => {
    const seeded = generateSeedDataForUser(currentUserId);
    setBanks(seeded.banks);
    setTransactions(seeded.transactions);
    setUserProfile((prev) => ({
      ...prev,
      monthlySavingsGoal: 1800,
      vaultSavedCurrentMonth: 1200,
      rolloverAmount: 950,
      expectedNextMonthIncome: 12640
    }));
    try {
      const res = await fetch('/api/seed/restore', {
        method: 'POST',
        headers: { 'x-user-id': currentUserId }
      });
      if (res.ok) applyServerState(await res.json());
    } catch {
      // Otimista mantido
    }
  };

  const handleRegisterNewUser = async (newUserData) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserData)
      });
      if (res.ok) {
        const state = await res.json();
        setCurrentUserId(state.user.id);
        applyServerState(state);
      }
    } catch {
      const customId = `user-${Date.now()}`;
      const newProfile = {
        id: customId,
        name: newUserData.name,
        cpf: newUserData.cpf,
        email: newUserData.email,
        role: 'Titular Autenticado',
        monthlySavingsGoal: newUserData.monthlySavingsGoal || 1500,
        vaultSavedCurrentMonth: 0,
        rolloverAmount: 0,
        expectedNextMonthIncome: newUserData.expectedNextMonthIncome || 8500
      };
      setAllUsers((prev) => [...prev, newProfile]);
      setCurrentUserId(customId);
      setUserProfile(newProfile);
    }
  };

  const isDataCleared = transactions.length === 0;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* =====================================================================
          HEADER SUPERIOR (ESTILO FINTECH MODERNA)
         ===================================================================== */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Identidade Visual */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Raio-X Financeiro
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  Open Finance
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Clareza de Fluxo de Caixa & Consolidação Multibancos
              </p>
            </div>
          </div>

          {/* Seletor de Mês Central */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/70">
            <button
              type="button"
              onClick={() => handleShiftMonth(-1)}
              title="Mês anterior"
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <select
              aria-label="Selecionar mês de referência"
              value={selectedMonthKey}
              onChange={(e) => setSelectedMonthKey(e.target.value)}
              className="bg-transparent px-2 py-1 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
            >
              {selectableMonths.map((m) => (
                <option
                  key={m.key}
                  value={m.key}
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  {m.label} {m.isCurrent ? '(Atual)' : m.isNext ? '(Próx.)' : ''}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => handleShiftMonth(1)}
              title="Próximo mês"
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Controles Rápidos: Novo Lançamento, Modo Privacidade, Tema, Titular */}
          <div className="flex items-center gap-2">
            <button
              id="btn-quick-launch"
              type="button"
              onClick={() => {
                setEditingTransaction(null);
                setIsTxModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden md:inline">+ Registrar Pagamento / Receita</span>
              <span className="md:hidden">Lançar</span>
            </button>

            {/* Botão Modo Privacidade */}
            <button
              id="btn-privacy-mode"
              type="button"
              onClick={() => setPrivacyMode((p) => !p)}
              title={privacyMode ? 'Mostrar valores monetários' : 'Ocultar valores monetários (Modo Privacidade)'}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                privacyMode
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-300'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {privacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span className="hidden lg:inline">
                {privacyMode ? 'Valores Ocultos' : 'Modo Privacidade'}
              </span>
            </button>

            {/* Botão Dark / Light Mode */}
            <button
              id="btn-theme-toggle"
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              title={darkMode ? 'Mudar para Light Mode' : 'Mudar para Dark Mode'}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Botão de Titular Autenticado (Isolamento por CPF) */}
            <button
              id="btn-auth-titular"
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:border-emerald-500/50 text-left flex items-center gap-2 cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <div className="hidden sm:block leading-tight">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  {userProfile.name}
                </div>
                <div className="text-[10px] font-mono-num text-slate-400">
                  CPF {userProfile.cpf}
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Barra de Abas de Navegação + Botão Limpar Dados de Exemplo */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 py-2">
          <nav className="flex items-center gap-1 overflow-x-auto">
            {[
              {
                id: 'dashboard',
                label: 'Visão do Mês (Raio-X)',
                icon: LayoutDashboard
              },
              {
                id: 'banks',
                label: `Minhas Contas & Bancos (${banks.length})`,
                icon: Landmark
              },
              {
                id: 'transactions',
                label: `Extrato Unificado (${transactions.length})`,
                icon: ReceiptText
              },
              {
                id: 'projection',
                label: 'Previsão do Próximo Mês',
                icon: CalendarArrowUp
              }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Controle de Dados de Exemplo (Limpar / Restaurar) */}
          <div className="flex items-center gap-2">
            {!isDataCleared ? (
              <button
                id="btn-clear-sample-data"
                type="button"
                onClick={handleClearSampleData}
                className="px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Eraser className="w-3.5 h-3.5" />
                Limpar dados de exemplo
              </button>
            ) : (
              <button
                id="btn-restore-sample-data"
                type="button"
                onClick={handleRestoreSampleData}
                className="px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restaurar dados de exemplo
              </button>
            )}
          </div>
        </div>
      </header>

      {/* =====================================================================
          CONTEÚDO PRINCIPAL
         ===================================================================== */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'dashboard' && (
          <DashboardTab
            xray={xray}
            banks={banks}
            transactions={transactions}
            privacyMode={privacyMode}
            selectedBankId={selectedBankId}
            onSelectBank={setSelectedBankId}
            onUpdateProfile={handleUpdateProfile}
            onToggleTransactionStatus={handleToggleTransactionStatus}
            onOpenNewTransaction={() => {
              setEditingTransaction(null);
              setIsTxModalOpen(true);
            }}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'banks' && (
          <BanksOpenFinanceTab
            user={userProfile}
            banks={banks}
            transactions={transactions}
            privacyMode={privacyMode}
            selectedBankId={selectedBankId}
            onSelectBank={setSelectedBankId}
            onAddBankWithTransactions={handleAddBankWithTransactions}
            onUpdateBank={handleUpdateBank}
            onDeleteBank={handleDeleteBank}
            onImportTransactions={handleImportTransactions}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionsTab
            banks={banks}
            transactions={transactions}
            selectedMonthKey={selectedMonthKey}
            nextMonthKey={getNextMonthKey(selectedMonthKey)}
            selectedBankId={selectedBankId}
            privacyMode={privacyMode}
            onSelectBank={setSelectedBankId}
            onOpenNewModal={() => {
              setEditingTransaction(null);
              setIsTxModalOpen(true);
            }}
            onEditTransaction={(tx) => {
              setEditingTransaction(tx);
              setIsTxModalOpen(true);
            }}
            onDeleteTransaction={handleDeleteTransaction}
            onToggleStatus={handleToggleTransactionStatus}
          />
        )}

        {activeTab === 'projection' && (
          <NextMonthProjectionTab
            xray={xray}
            banks={banks}
            privacyMode={privacyMode}
            onUpdateProfile={handleUpdateProfile}
            onOpenNewTransaction={() => {
              setEditingTransaction(null);
              setIsTxModalOpen(true);
            }}
          />
        )}
      </main>

      {/* Rodapé Técnico Discreto */}
      <footer className="border-t border-slate-200/70 dark:border-slate-800/80 py-4 px-4 sm:px-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            <strong>Raio-X Financeiro</strong> • Gestão Pessoal Inteligente & Consolidação Multibancos
          </span>
          <span>
            Titular Isolado: <strong className="text-slate-600 dark:text-slate-300">{userProfile.name}</strong> ({userProfile.cpf}) • Open Finance Brasil Ready
          </span>
        </div>
      </footer>

      {/* Modal de Lançamento Rápido / Edição */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          setEditingTransaction(null);
        }}
        banks={banks}
        editingTransaction={editingTransaction}
        onSaveTransaction={handleSaveTransaction}
      />

      {/* Modal de Autenticação e Isolamento por Titular */}
      <AuthTitularModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={userProfile}
        allUsers={allUsers}
        onSwitchUser={(uid) => {
          setSelectedBankId('all');
          setCurrentUserId(uid);
        }}
        onRegisterNewUser={handleRegisterNewUser}
      />
    </div>
  );
}
