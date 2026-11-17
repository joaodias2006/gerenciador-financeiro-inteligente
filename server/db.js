import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEMO_USERS, generateSeedDataForUser } from '../src/data/initialData.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'raiox_financeiro.sqlite');

const db = new DatabaseSync(dbPath);

// Inicializa tabelas relacionais com isolamento por user_id (Titular)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    cpf TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Titular',
    monthly_savings_goal REAL NOT NULL DEFAULT 1800,
    vault_saved_current_month REAL NOT NULL DEFAULT 1200,
    rollover_amount REAL NOT NULL DEFAULT 950,
    expected_next_month_income REAL NOT NULL DEFAULT 12640,
    open_finance_provider TEXT NOT NULL DEFAULT 'Pluggy Open Finance Brasil'
  );

  CREATE TABLE IF NOT EXISTS bank_accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    bank_code TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    account_type TEXT NOT NULL,
    agency TEXT NOT NULL,
    account_number TEXT NOT NULL,
    balance REAL NOT NULL DEFAULT 0,
    credit_limit REAL NOT NULL DEFAULT 0,
    credit_used REAL NOT NULL DEFAULT 0,
    current_invoice REAL NOT NULL DEFAULT 0,
    closing_day INTEGER NOT NULL DEFAULT 25,
    due_day INTEGER NOT NULL DEFAULT 5,
    color TEXT NOT NULL DEFAULT '#0d9488',
    connection_type TEXT NOT NULL DEFAULT 'open_finance',
    last_sync TEXT NOT NULL DEFAULT 'Sincronizado agora',
    status TEXT NOT NULL DEFAULT 'Conectado'
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    bank_id TEXT NOT NULL,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT NOT NULL,
    date TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    is_fixed INTEGER NOT NULL DEFAULT 0,
    installment_group_id TEXT,
    installment_current INTEGER NOT NULL DEFAULT 1,
    installment_total INTEGER NOT NULL DEFAULT 1
  );
`);

export function seedUserIfEmpty(userId) {
  const existingUser = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!existingUser) {
    const demoProfile = DEMO_USERS.find((u) => u.id === userId) || DEMO_USERS[0];
    db.prepare(`
      INSERT INTO users (
        id, name, email, cpf, role,
        monthly_savings_goal, vault_saved_current_month,
        rollover_amount, expected_next_month_income, open_finance_provider
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      demoProfile.id,
      demoProfile.name,
      demoProfile.email,
      demoProfile.cpf,
      demoProfile.role,
      demoProfile.monthlySavingsGoal,
      demoProfile.vaultSavedCurrentMonth,
      demoProfile.rolloverAmount,
      demoProfile.expectedNextMonthIncome,
      demoProfile.openFinanceProvider
    );

    populateSeedBanksAndTransactions(demoProfile.id);
  }
}

export function populateSeedBanksAndTransactions(userId) {
  db.prepare('DELETE FROM transactions WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM bank_accounts WHERE user_id = ?').run(userId);

  const { banks, transactions } = generateSeedDataForUser(userId);

  const insertBank = db.prepare(`
    INSERT INTO bank_accounts (
      id, user_id, bank_code, bank_name, account_type, agency, account_number,
      balance, credit_limit, credit_used, current_invoice, closing_day, due_day,
      color, connection_type, last_sync, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const b of banks) {
    insertBank.run(
      b.id,
      userId,
      b.bankCode,
      b.bankName,
      b.accountType,
      b.agency,
      b.accountNumber,
      b.balance,
      b.creditLimit,
      b.creditUsed,
      b.currentInvoice,
      b.closingDay,
      b.dueDay,
      b.color,
      b.connectionType,
      b.lastSync,
      b.status
    );
  }

  const insertTx = db.prepare(`
    INSERT INTO transactions (
      id, user_id, bank_id, type, amount, description, date, category,
      status, payment_method, is_fixed, installment_group_id,
      installment_current, installment_total
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const t of transactions) {
    insertTx.run(
      t.id,
      userId,
      t.bankId,
      t.type,
      t.amount,
      t.description,
      t.date,
      t.category,
      t.status,
      t.paymentMethod,
      t.isFixed ? 1 : 0,
      t.installmentGroupId || null,
      t.installmentCurrent || 1,
      t.installmentTotal || 1
    );
  }
}

// Garante que os dois perfis demo iniciais existam
for (const u of DEMO_USERS) {
  seedUserIfEmpty(u.id);
}

export function getUserState(userId = 'user-joao-01') {
  seedUserIfEmpty(userId);

  const rawUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  const allRawUsers = db.prepare('SELECT * FROM users ORDER BY rowid ASC').all();
  const rawBanks = db
    .prepare('SELECT * FROM bank_accounts WHERE user_id = ? ORDER BY rowid ASC')
    .all(userId);
  const rawTransactions = db
    .prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC, rowid DESC')
    .all(userId);

  const mapUser = (u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    cpf: u.cpf,
    role: u.role,
    monthlySavingsGoal: u.monthly_savings_goal,
    vaultSavedCurrentMonth: u.vault_saved_current_month,
    rolloverAmount: u.rollover_amount,
    expectedNextMonthIncome: u.expected_next_month_income,
    openFinanceProvider: u.open_finance_provider
  });

  const banks = rawBanks.map((b) => ({
    id: b.id,
    userId: b.user_id,
    bankCode: b.bank_code,
    bankName: b.bank_name,
    accountType: b.account_type,
    agency: b.agency,
    accountNumber: b.account_number,
    balance: b.balance,
    creditLimit: b.credit_limit,
    creditUsed: b.credit_used,
    currentInvoice: b.current_invoice,
    closingDay: b.closing_day,
    dueDay: b.due_day,
    color: b.color,
    connectionType: b.connection_type,
    lastSync: b.last_sync,
    status: b.status
  }));

  const transactions = rawTransactions.map((t) => ({
    id: t.id,
    userId: t.user_id,
    bankId: t.bank_id,
    type: t.type,
    amount: t.amount,
    description: t.description,
    date: t.date,
    category: t.category,
    status: t.status,
    paymentMethod: t.payment_method,
    isFixed: Boolean(t.is_fixed),
    installmentGroupId: t.installment_group_id,
    installmentCurrent: t.installment_current,
    installmentTotal: t.installment_total
  }));

  return {
    user: mapUser(rawUser),
    users: allRawUsers.map(mapUser),
    banks,
    transactions
  };
}

export { db };
