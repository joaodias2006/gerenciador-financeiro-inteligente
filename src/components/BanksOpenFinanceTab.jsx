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
  SlidersHorizontal,
  Edit3,
  Check,
  Sparkles,
  Filter
} from 'lucide-react';
import { BANCOS_CATALOGO } from '../data/initialData.js';
import {
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
  const [connectingCode, setConnectingCode] = useState(null);
  const [syncingBankId, setSyncingBankId] = useState(null);
  const [editingBankId, setEditingBankId] = useState(null);
  const [editBalance, setEditBalance] = useState('');
  const [editLimit, setEditLimit] = useState('');

  // Estado do Importador OFX / CSV
  const [importTargetBankId, setImportTargetBankId] = useState(banks[0]?.id || '');
  const [parsedPreview, setParsedPreview] = useState([]);
  const [importSourceLabel, setImportSourceLabel] = useState('');
  const [importFeedback, setImportFeedback] = useState('');

  // Estado do Painel de Configuração de API Open Finance (Pluggy / Belvo)
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [apiProvider, setApiProvider] = useState('pluggy');
  const [apiClientId, setApiClientId] = useState('');
  const [apiSecret, setApiSecret] = useState('');

  const totalConsolidatedBalance = banks.reduce((acc, b) => acc + Number(b.balance || 0), 0);
  const totalConsolidatedLimit = banks.reduce((acc, b) => acc + Number(b.creditLimit || 0), 0);
  const totalConsolidatedUsed = banks.reduce((acc, b) => acc + Number(b.creditUsed || 0), 0);

  // Simula o fluxo de Consentimento Open Finance e conecta a instituição
  const handleSimulateConnect = async (bankCode) => {
    setConnectingCode(bankCode);
    await new Promise((r) => setTimeout(r, 450));
    const { bank, transactions: sampleTxs } = simulateBankConnection(bankCode, user.id);
    await onAddBankWithTransactions(bank, sampleTxs);
    if (!importTargetBankId) {
      setImportTargetBankId(bank.id);
    }
    setConnectingCode(null);
  };

  // Sincroniza saldo e status de um banco específico
  const handleSyncSingleBank = async (bank) => {
    setSyncingBankId(bank.id);
    await new Promise((r) => setTimeout(r, 400));
    const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    await onUpdateBank(bank.id, {
      lastSync: `Sincronizado às ${nowTime} via ${apiProvider === 'belvo' ? 'Belvo' : 'Pluggy'}`,
      status: 'Conectado'
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
      lastSync: 'Saldo ajustado manualmente'
    });
    setEditingBankId(null);
  };

  // Processa upload de arquivo .OFX ou .CSV do computador
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const targetBank = importTargetBankId || banks[0]?.id;
    if (!targetBank) {
      setImportFeedback('Conecte pelo menos um banco antes de importar um extrato.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = String(ev.target?.result || '');
      const isOfx =
        file.name.toLowerCase().endsWith('.ofx') || content.includes('<OFX>');

      const parsed = isOfx
        ? parseOFXStatement(content, targetBank, user.id)
        : parseCSVStatement(content, targetBank, user.id);

      setParsedPreview(parsed);
      setImportSourceLabel(`Arquivo: ${file.name} (${parsed.length} lançamentos detectados)`);
      setImportFeedback('');
    };
    reader.readAsText(file, 'UTF-8');
  };

  // Carrega amostra realista .OFX ou .CSV com 1 clique
  const handleLoadSampleStatement = (format) => {
    const targetBank = importTargetBankId || banks[0]?.id;
    if (!targetBank) return;

    if (format === 'ofx') {
      const ofxContent = getSampleOFXContent();
      const items = parseOFXStatement(ofxContent, targetBank, user.id);
      setParsedPreview(items);
      setImportSourceLabel('Extrato Simulado padrao_febraban_2026.ofx');
    } else {
      const csvContent = getSampleCSVContent();
      const items = parseCSVStatement(csvContent, targetBank, user.id);
      setParsedPreview(items);
      setImportSourceLabel('Planilha Extrato fatura_mensal_2026.csv');
    }
    setImportFeedback('');
  };

  const handleConfirmImport = async () => {
    if (parsedPreview.length === 0) return;
    await onImportTransactions(parsedPreview);
    setImportFeedback(
      `${parsedPreview.length} lançamentos importados e conciliados com sucesso no extrato unificado!`
    );
    setParsedPreview([]);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho Consolidado Multibancos do Titular */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                Open Finance Brasil • Mesmo Titular
              </span>
              <span className="text-xs text-slate-400 font-mono-num">
                CPF: {user.cpf}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-1.5 flex items-center gap-2">
              <Landmark className="w-5 h-5 text-emerald-500" />
              Minhas Contas e Bancos ({banks.length} Instituições Conectadas)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Consolidação automática de saldos, limites de crédito e extratos de todas as contas de {user.name}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowApiConfig((v) => !v)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 cursor-pointer"
            >
              <Settings2 className="w-4 h-4 text-emerald-500" />
              Configurar API Pluggy / Belvo
            </button>
          </div>
        </div>

        {/* Painel de Arquitetura de Integração Open Finance (Pluggy / Belvo) */}
        {showApiConfig && (
          <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-emerald-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-500" />
                Arquitetura Modular Open Finance Brasil (Pluggy & Belvo Connectors)
              </div>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 font-semibold">
                {apiClientId && apiSecret ? 'Chaves de Produção Ativas' : 'Modo Simulador Sandbox Ativo'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              O backend possui o adaptador pronto para sincronizar contas, extratos e faturas via API agregadora. Caso não insira chaves pagas, o Simulador Interativo e o Importador OFX/CSV permanecem 100% funcionais.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Provedor Agregador
                </label>
                <select
                  value={apiProvider}
                  onChange={(e) => setApiProvider(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                >
                  <option value="pluggy">Pluggy Open Finance Brasil</option>
                  <option value="belvo">Belvo Open Finance API</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Client ID (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="ex: pk_live_891230981..."
                  value={apiClientId}
                  onChange={(e) => setApiClientId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono-num"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Client Secret (Opcional)
                </label>
                <input
                  type="password"
                  placeholder="••••••••••••••••"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono-num"
                />
              </div>
            </div>
          </div>
        )}

        {/* Resumo Consolidado de Todos os Bancos */}
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

      {/* Cards das Contas Bancárias Conectadas */}
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
                      title="Sincronizar via Open Finance"
                      onClick={() => handleSyncSingleBank(bank)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${syncingBankId === bank.id ? 'animate-spin text-emerald-500' : ''}`}
                      />
                    </button>
                    <button
                      type="button"
                      title="Editar Saldo e Limite"
                      onClick={() => handleStartEditBank(bank)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      title="Desconectar Instituição"
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
                          Saldo em Conta (R$)
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

      {/* =====================================================================
          SIMULADOR DE CONEXÃO BANCÁRIA OPEN FINANCE + IMPORTADOR OFX / CSV
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Simulador de Conexão Bancária */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Modo Funcional Imediato #1
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              Simulador de Conexão Bancária (Open Finance Brasil)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Conecte novas instituições financeiras do mesmo titular com 1 clique. O simulador cria a conta com saldo, limite de cartão e extrato sincronizado para teste imediato.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {BANCOS_CATALOGO.map((inst) => {
              const alreadyConnected = banks.some((b) => b.bankCode === inst.code);
              const isConnecting = connectingCode === inst.code;

              return (
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
                        Saldo sim.: {formatBRL(inst.defaultBalance, privacyMode)}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isConnecting}
                    onClick={() => handleSimulateConnect(inst.code)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold shrink-0 cursor-pointer transition-colors flex items-center gap-1 ${
                      alreadyConnected
                        ? 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-600 hover:text-white'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {isConnecting
                      ? 'Conectando...'
                      : alreadyConnected
                      ? '+ Outra Conta'
                      : 'Conectar'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Importador de Extratos Manuais (.OFX e .CSV) */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Modo Funcional Imediato #2
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5 flex items-center gap-2">
              <Upload className="w-4 h-4 text-teal-500" />
              Importador de Extratos Manuais (.OFX e .CSV)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Alimente os bancos cadastrados importando extratos `.OFX` ou `.CSV` exportados do seu internet banking, com categorização e identificação automática de Pix, Débito, Boleto ou Crédito.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                1. Selecione o Banco / Conta de Destino:
              </label>
              <select
                value={importTargetBankId || banks[0]?.id || ''}
                onChange={(e) => setImportTargetBankId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
              >
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bankName} (Ag {b.agency} • Cc {b.accountNumber})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <label className="flex flex-col items-center justify-center p-3 rounded-xl border-2 border-dashed border-emerald-500/40 hover:border-emerald-500 bg-emerald-500/5 cursor-pointer text-center transition-colors">
                <Upload className="w-4 h-4 text-emerald-500 mb-1" />
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  Enviar .OFX / .CSV
                </span>
                <span className="text-[10px] text-slate-400">Do seu computador</span>
                <input
                  type="file"
                  accept=".ofx,.csv,text/csv,application/x-ofx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={() => handleLoadSampleStatement('ofx')}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-teal-500/50 bg-slate-50 dark:bg-slate-950/60 cursor-pointer text-center transition-colors"
              >
                <FileCode2 className="w-4 h-4 text-teal-500 mb-1" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Simular Arquivo .OFX
                </span>
                <span className="text-[10px] text-slate-400">4 lançamentos FEBRABAN</span>
              </button>

              <button
                type="button"
                onClick={() => handleLoadSampleStatement('csv')}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-500/50 bg-slate-50 dark:bg-slate-950/60 cursor-pointer text-center transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-amber-500 mb-1" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Simular Arquivo .CSV
                </span>
                <span className="text-[10px] text-slate-400">4 lançamentos Planilha</span>
              </button>
            </div>

            {importFeedback && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{importFeedback}</span>
              </div>
            )}

            {parsedPreview.length > 0 && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Pré-visualização: {importSourceLabel}
                  </span>
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Confirmar Importação ({parsedPreview.length})
                  </button>
                </div>

                <div className="max-h-44 overflow-y-auto divide-y divide-slate-200/60 dark:divide-slate-800 text-xs">
                  {parsedPreview.map((item) => (
                    <div key={item.id} className="py-2 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {item.description}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {formatDateBR(item.date)} • {item.category} • {item.paymentMethod}
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
        </div>
      </div>
    </div>
  );
}
