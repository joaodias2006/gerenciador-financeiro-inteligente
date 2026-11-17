import React, { useState } from 'react';
import {
  X,
  UserCheck,
  UserPlus,
  Shield,
  CheckCircle2,
  Database
} from 'lucide-react';

export default function AuthTitularModal({
  isOpen,
  onClose,
  currentUser,
  allUsers,
  onSwitchUser,
  onRegisterNewUser
}) {
  const [mode, setMode] = useState('switch'); // 'switch' | 'register'
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [expectedIncome, setExpectedIncome] = useState('9000');
  const [initialBalance, setInitialBalance] = useState('3500');

  if (!isOpen) return null;

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !cpf.trim()) return;
    await onRegisterNewUser({
      name: name.trim(),
      cpf: cpf.trim(),
      email: email.trim() || `${name.toLowerCase().replace(/\s+/g, '.')}@raiox.com.br`,
      expectedNextMonthIncome: Number(expectedIncome) || 8500,
      monthlySavingsGoal: 1500,
      initialBalance: Number(initialBalance) || 0
    });
    setName('');
    setCpf('');
    setEmail('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-500" />
              Autenticação & Isolamento por Titular
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Cada CPF possui suas próprias contas bancárias, cartões e histórico isolados no banco SQL.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setMode('switch')}
            className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'switch'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Alternar Titular ({allUsers.length})
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'register'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Novo Titular (CPF)
          </button>
        </div>

        {mode === 'switch' ? (
          <div className="space-y-2.5">
            {allUsers.map((u) => {
              const isActive = u.id === currentUser.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    onSwitchUser(u.id);
                    onClose();
                  }}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                    isActive
                      ? 'border-2 border-emerald-500 bg-emerald-500/10'
                      : 'border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 bg-slate-50 dark:bg-slate-950/50'
                  }`}
                >
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{u.name}</span>
                      {isActive && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-extrabold">
                          Sessão Ativa
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 font-mono-num mt-0.5">
                      CPF: {u.cpf} • {u.email}
                    </div>
                  </div>
                  <CheckCircle2
                    className={`w-5 h-5 ${
                      isActive ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-700'
                    }`}
                  />
                </button>
              );
            })}

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
              <Database className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                Persistência Full-Stack ativa: SQLite Server (`/api/*`) + Políticas RLS (`supabase/schema.sql`) garantindo isolamento estrito por `user_id`.
              </span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateSubmit} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                Nome Completo do Titular
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Carlos Eduardo Mendes"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  CPF do Titular
                </label>
                <input
                  type="text"
                  required
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono-num"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  E-mail de Acesso
                </label>
                <input
                  type="email"
                  placeholder="titular@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Renda Mensal Estimada (R$)
                </label>
                <input
                  type="number"
                  value={expectedIncome}
                  onChange={(e) => setExpectedIncome(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono-num"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Saldo Inicial em Conta (R$)
                </label>
                <input
                  type="number"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono-num"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs cursor-pointer mt-2"
            >
              Criar Conta Isolada & Acessar Painel
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
