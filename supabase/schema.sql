-- ============================================================================
-- RAIO-X FINANCEIRO — Esquema PostgreSQL / Supabase com Isolamento por Titular
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de Perfis de Titular (vinculada ao Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  cpf TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  monthly_savings_goal NUMERIC(14, 2) NOT NULL DEFAULT 1500.00,
  vault_saved_current_month NUMERIC(14, 2) NOT NULL DEFAULT 1000.00,
  rollover_amount NUMERIC(14, 2) NOT NULL DEFAULT 850.00,
  expected_next_month_income NUMERIC(14, 2) NOT NULL DEFAULT 12500.00,
  open_finance_provider TEXT NOT NULL DEFAULT 'pluggy',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabela de Contas Bancárias Conectadas (Mesmo Titular)
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bank_code TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'Conta Corrente & Cartão',
  agency TEXT NOT NULL DEFAULT '0001',
  account_number TEXT NOT NULL,
  balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  credit_limit NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  credit_used NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  current_invoice NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  closing_day INTEGER NOT NULL DEFAULT 25,
  due_day INTEGER NOT NULL DEFAULT 5,
  color TEXT NOT NULL DEFAULT '#0d9488',
  connection_type TEXT NOT NULL DEFAULT 'open_finance', -- 'open_finance' | 'manual_ofx'
  open_finance_item_id TEXT,
  last_sync TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'Sincronizado',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tabela de Lançamentos Financeiros (Receitas, Despesas, Fixas e Parcelamentos)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bank_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  date DATE NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('paid', 'pending')),
  payment_method TEXT NOT NULL, -- 'Pix', 'Cartão de Crédito à Vista', 'Cartão de Crédito Parcelado', 'Cartão de Débito', 'Boleto', 'Transferência', 'Benefício'
  is_fixed BOOLEAN NOT NULL DEFAULT FALSE,
  installment_group_id TEXT,
  installment_current INTEGER DEFAULT 1,
  installment_total INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de Performance para Consultas de Fluxo de Caixa e Extrato
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON public.bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_bank_id ON public.transactions(bank_id);
CREATE INDEX IF NOT EXISTS idx_transactions_installment_group ON public.transactions(installment_group_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) — Isolamento Estrito de Dados por Titular
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Titular visualiza apenas o próprio perfil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Titular atualiza apenas o próprio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Isolamento de Contas Bancárias por Titular"
  ON public.bank_accounts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Isolamento de Transações por Titular"
  ON public.transactions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
