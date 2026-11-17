import { db, getUserState, populateSeedBanksAndTransactions } from './db.js';
import { simulateBankConnection } from '../src/services/openFinanceService.js';

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

export async function handleApiRequest(req, res, next) {
  if (!req.url || !req.url.startsWith('/api/')) {
    return next();
  }

  try {
    const urlObj = new URL(req.url, 'http://localhost');
    const pathname = urlObj.pathname;
    const method = req.method || 'GET';
    const userId =
      req.headers['x-user-id'] ||
      urlObj.searchParams.get('userId') ||
      'user-joao-01';

    // 1. GET /api/state — Retorna estado isolado do Titular autenticado
    if (method === 'GET' && pathname === '/api/state') {
      const state = getUserState(userId);
      return sendJson(res, 200, state);
    }

    // 2. POST /api/auth/register — Cadastra um novo Titular isolado
    if (method === 'POST' && pathname === '/api/auth/register') {
      const body = await readJsonBody(req);
      const newId = `user-${Date.now()}`;
      const name = (body.name || 'Novo Titular').trim();
      const cpf = (body.cpf || '000.000.000-00').trim();
      const email = (body.email || `${newId}@raiox.com.br`).trim();
      const expectedIncome = Number(body.expectedNextMonthIncome) || 8500;
      const savingsGoal = Number(body.monthlySavingsGoal) || 1200;

      db.prepare(`
        INSERT INTO users (
          id, name, email, cpf, role,
          monthly_savings_goal, vault_saved_current_month,
          rollover_amount, expected_next_month_income, open_finance_provider
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        newId,
        name,
        email,
        cpf,
        'Titular Autenticado',
        savingsGoal,
        0,
        0,
        expectedIncome,
        'Pluggy Open Finance Brasil'
      );

      // Conecta automaticamente uma conta inicial Nubank zerada ou com saldo inicial informado
      const sim = simulateBankConnection('260', newId);
      db.prepare(`
        INSERT INTO bank_accounts (
          id, user_id, bank_code, bank_name, account_type, agency, account_number,
          balance, credit_limit, credit_used, current_invoice, closing_day, due_day,
          color, connection_type, last_sync, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        sim.bank.id,
        newId,
        sim.bank.bankCode,
        sim.bank.bankName,
        sim.bank.accountType,
        sim.bank.agency,
        sim.bank.accountNumber,
        Number(body.initialBalance ?? 2500),
        sim.bank.creditLimit,
        0,
        0,
        sim.bank.closingDay,
        sim.bank.dueDay,
        sim.bank.color,
        'open_finance',
        'Conta recém-criada',
        'Conectado'
      );

      return sendJson(res, 201, getUserState(newId));
    }

    // 3. PUT /api/user/profile — Atualiza metas do Cofre, Rollover e Renda Prevista
    if (method === 'PUT' && pathname === '/api/user/profile') {
      const body = await readJsonBody(req);
      const current = getUserState(userId).user;

      db.prepare(`
        UPDATE users
        SET monthly_savings_goal = ?,
            vault_saved_current_month = ?,
            rollover_amount = ?,
            expected_next_month_income = ?,
            open_finance_provider = ?
        WHERE id = ?
      `).run(
        body.monthlySavingsGoal ?? current.monthlySavingsGoal,
        body.vaultSavedCurrentMonth ?? current.vaultSavedCurrentMonth,
        body.rolloverAmount ?? current.rolloverAmount,
        body.expectedNextMonthIncome ?? current.expectedNextMonthIncome,
        body.openFinanceProvider ?? current.openFinanceProvider,
        userId
      );

      return sendJson(res, 200, getUserState(userId));
    }

    // 4. POST /api/banks — Conecta novo banco (Manual ou Simulador Open Finance)
    if (method === 'POST' && pathname === '/api/banks') {
      const body = await readJsonBody(req);
      const bank = body.bank;
      const sampleTxs = Array.isArray(body.transactions) ? body.transactions : [];

      db.prepare(`
        INSERT INTO bank_accounts (
          id, user_id, bank_code, bank_name, account_type, agency, account_number,
          balance, credit_limit, credit_used, current_invoice, closing_day, due_day,
          color, connection_type, last_sync, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        bank.id,
        userId,
        bank.bankCode,
        bank.bankName,
        bank.accountType || 'Conta Corrente & Cartão',
        bank.agency || '0001',
        bank.accountNumber || '10293-1',
        Number(bank.balance || 0),
        Number(bank.creditLimit || 0),
        Number(bank.creditUsed || 0),
        Number(bank.currentInvoice || 0),
        Number(bank.closingDay || 25),
        Number(bank.dueDay || 5),
        bank.color || '#0d9488',
        bank.connectionType || 'open_finance',
        bank.lastSync || 'Sincronizado agora',
        bank.status || 'Conectado'
      );

      if (sampleTxs.length > 0) {
        const insertTx = db.prepare(`
          INSERT INTO transactions (
            id, user_id, bank_id, type, amount, description, date, category,
            status, payment_method, is_fixed, installment_group_id,
            installment_current, installment_total
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const t of sampleTxs) {
          insertTx.run(
            t.id,
            userId,
            bank.id,
            t.type,
            Number(t.amount),
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

      return sendJson(res, 201, getUserState(userId));
    }

    // 5. PUT /api/banks/:id — Atualiza saldo, limite ou sincronização de um banco
    if (method === 'PUT' && pathname.startsWith('/api/banks/')) {
      const bankId = pathname.replace('/api/banks/', '');
      const body = await readJsonBody(req);

      db.prepare(`
        UPDATE bank_accounts
        SET balance = COALESCE(?, balance),
            credit_limit = COALESCE(?, credit_limit),
            last_sync = COALESCE(?, last_sync),
            status = COALESCE(?, status)
        WHERE id = ? AND user_id = ?
      `).run(
        body.balance !== undefined ? Number(body.balance) : null,
        body.creditLimit !== undefined ? Number(body.creditLimit) : null,
        body.lastSync || null,
        body.status || null,
        bankId,
        userId
      );

      return sendJson(res, 200, getUserState(userId));
    }

    // 6. DELETE /api/banks/:id — Desconecta banco e remove transações vinculadas
    if (method === 'DELETE' && pathname.startsWith('/api/banks/')) {
      const bankId = pathname.replace('/api/banks/', '');
      db.prepare('DELETE FROM transactions WHERE bank_id = ? AND user_id = ?').run(bankId, userId);
      db.prepare('DELETE FROM bank_accounts WHERE id = ? AND user_id = ?').run(bankId, userId);
      return sendJson(res, 200, getUserState(userId));
    }

    // 7. POST /api/transactions — Registra 1 ou múltiplos lançamentos (Parcelados ou Importação OFX/CSV)
    if (method === 'POST' && pathname === '/api/transactions') {
      const body = await readJsonBody(req);
      const items = Array.isArray(body.transactions)
        ? body.transactions
        : body.transaction
        ? [body.transaction]
        : [];

      const insertTx = db.prepare(`
        INSERT INTO transactions (
          id, user_id, bank_id, type, amount, description, date, category,
          status, payment_method, is_fixed, installment_group_id,
          installment_current, installment_total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const t of items) {
        insertTx.run(
          t.id,
          userId,
          t.bankId,
          t.type,
          Number(t.amount),
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

      return sendJson(res, 201, getUserState(userId));
    }

    // 8. PUT /api/transactions/:id — Edita lançamento ou alterna status Pago/Pendente
    if (method === 'PUT' && pathname.startsWith('/api/transactions/')) {
      const txId = pathname.replace('/api/transactions/', '');
      const body = await readJsonBody(req);

      db.prepare(`
        UPDATE transactions
        SET type = COALESCE(?, type),
            amount = COALESCE(?, amount),
            description = COALESCE(?, description),
            date = COALESCE(?, date),
            bank_id = COALESCE(?, bank_id),
            category = COALESCE(?, category),
            status = COALESCE(?, status),
            payment_method = COALESCE(?, payment_method),
            is_fixed = COALESCE(?, is_fixed)
        WHERE id = ? AND user_id = ?
      `).run(
        body.type || null,
        body.amount !== undefined ? Number(body.amount) : null,
        body.description || null,
        body.date || null,
        body.bankId || null,
        body.category || null,
        body.status || null,
        body.paymentMethod || null,
        body.isFixed !== undefined ? (body.isFixed ? 1 : 0) : null,
        txId,
        userId
      );

      return sendJson(res, 200, getUserState(userId));
    }

    // 9. DELETE /api/transactions/:id — Exclui lançamento (ou grupo de parcelas)
    if (method === 'DELETE' && pathname.startsWith('/api/transactions/')) {
      const txId = pathname.replace('/api/transactions/', '');
      const deleteGroup = urlObj.searchParams.get('deleteGroup') === 'true';

      if (deleteGroup) {
        const row = db
          .prepare('SELECT installment_group_id FROM transactions WHERE id = ? AND user_id = ?')
          .get(txId, userId);
        if (row && row.installment_group_id) {
          db.prepare('DELETE FROM transactions WHERE installment_group_id = ? AND user_id = ?').run(
            row.installment_group_id,
            userId
          );
          return sendJson(res, 200, getUserState(userId));
        }
      }

      db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').run(txId, userId);
      return sendJson(res, 200, getUserState(userId));
    }

    // 10. POST /api/seed/clear — Limpa dados de exemplo para o usuário começar do zero
    if (method === 'POST' && pathname === '/api/seed/clear') {
      db.prepare('DELETE FROM transactions WHERE user_id = ?').run(userId);
      db.prepare(`
        UPDATE bank_accounts
        SET balance = 0, credit_used = 0, current_invoice = 0
        WHERE user_id = ?
      `).run(userId);
      db.prepare(`
        UPDATE users
        SET vault_saved_current_month = 0, rollover_amount = 0
        WHERE id = ?
      `).run(userId);
      return sendJson(res, 200, getUserState(userId));
    }

    // 11. POST /api/seed/restore — Restaura dados de exemplo coerentes
    if (method === 'POST' && pathname === '/api/seed/restore') {
      populateSeedBanksAndTransactions(userId);
      db.prepare(`
        UPDATE users
        SET monthly_savings_goal = 1800,
            vault_saved_current_month = 1200,
            rollover_amount = 950,
            expected_next_month_income = 12640
        WHERE id = ?
      `).run(userId);
      return sendJson(res, 200, getUserState(userId));
    }

    return sendJson(res, 404, { error: 'Endpoint não encontrado' });
  } catch (err) {
    console.error('API Error:', err);
    return sendJson(res, 500, { error: err.message || 'Erro interno no servidor' });
  }
}

export function raioxApiVitePlugin() {
  return {
    name: 'raiox-financeiro-api',
    configureServer(server) {
      server.middlewares.use(handleApiRequest);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handleApiRequest);
    }
  };
}
