import {
  decodePaymentCode,
  parseOFXContent,
  parseCSVContent,
  OpenFinanceConnector
} from './openFinance.js';
import {
  computeFinancialPlan,
  formatBRL
} from './cofrinhoEngine.js';

const STORAGE_KEY = 'cofreflow_state_v1';

const SAMPLE_BARCODES = {
  boleto_itau: '34191.79001 01043.510047 91020.150008 8 16360000045990',
  concessionaria_luz: '83640000002-1 48900162000-8 00102938475-3 60192837465-0',
  pix_copia_cola:
    '00020126580014BR.GOV.BCB.PIX0136chave-pix-academia-smart@pagamento.br5204000053039865406139.905802BR5916ACADEMIA SMARTFIT6009SAO PAULO62070503***6304ABCD'
};

function getInitialState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.warn('Falha ao ler estado salvo, usando padrão.', e);
    }
  }

  return {
    referenceDate: '2026-11-16',
    monthlyIncome: 8600,
    dailyLivingReserve: 1400,
    automationMode: 'equilibrado',
    rules: {
      roundUpPix: true,
      autoSaveIncomePercent: true,
      sweepMonthlySurplus: true
    },
    openFinanceConfig: {
      provider: 'pluggy',
      clientId: '',
      clientSecret: ''
    },
    accounts: [
      {
        id: 'acc-nubank',
        institution: 'Nubank',
        type: 'checking',
        accountNumber: 'Ag 0001 • CC 84920-1',
        balance: 4820.50,
        color: '#0d9488',
        lastSync: 'Hoje às 15:30'
      },
      {
        id: 'acc-itau',
        institution: 'Itaú Unibanco',
        type: 'checking',
        accountNumber: 'Ag 2910 • CC 10942-8',
        balance: 3150.00,
        color: '#d97706',
        lastSync: 'Hoje às 15:30'
      },
      {
        id: 'acc-inter',
        institution: 'Banco Inter',
        type: 'checking',
        accountNumber: 'Ag 0001 • CC 55102-4',
        balance: 1290.00,
        color: '#ea580c',
        lastSync: 'Hoje às 15:30'
      },
      {
        id: 'acc-cartao',
        institution: 'Cartão Black Consolidado',
        type: 'credit',
        accountNumber: 'Fatura fecha dia 22/11',
        balance: 0,
        invoice: 1640.00,
        color: '#475569',
        lastSync: 'Hoje às 15:30'
      }
    ],
    cofrinho: {
      totalSaved: 14250.00,
      cdiPercent: 102,
      goals: [
        {
          id: 'goal-emergencia',
          name: 'Reserva de Emergência (102% CDI)',
          current: 10500.00,
          target: 18000.00
        },
        {
          id: 'goal-ferias',
          name: 'Viagem & Lazer Programado',
          current: 2450.00,
          target: 5000.00
        },
        {
          id: 'goal-ipva',
          name: 'Provisão IPVA + IPTU Anual',
          current: 1300.00,
          target: 3200.00
        }
      ]
    },
    bills: [
      {
        id: 'bill-1',
        title: 'Condomínio Residencial Aurora',
        institution: 'Bradesco Boletos',
        category: 'Moradia & Consumo',
        dueDate: '2026-11-15',
        amount: 920.00,
        status: 'pending',
        barcode: '23793.38128 60083.013528 56000.063305 4 10630000092000'
      },
      {
        id: 'bill-2',
        title: 'Enel Energia Elétrica',
        institution: 'Concessionária Energia',
        category: 'Moradia & Consumo',
        dueDate: '2026-11-16',
        amount: 284.40,
        status: 'pending',
        barcode: '83620000002-5 84400162000-4 00102938475-3 60192837465-0'
      },
      {
        id: 'bill-3',
        title: 'Internet Vivo Fibra 600 Mega',
        institution: 'Santander Cobrança',
        category: 'Assinaturas & Conectividade',
        dueDate: '2026-11-18',
        amount: 149.90,
        status: 'pending',
        barcode: '03399.63290 64000.000006 00125.201020 4 10660000014990'
      },
      {
        id: 'bill-4',
        title: 'Fatura Parcial Cartão Itaú',
        institution: 'Itaú Unibanco',
        category: 'Cartão de Crédito',
        dueDate: '2026-11-22',
        amount: 1640.00,
        status: 'pending',
        barcode: '34191.79001 01043.510047 91020.150008 8 10700000164000'
      },
      {
        id: 'bill-5',
        title: 'Plano de Saúde Corporativo',
        institution: 'Banco do Brasil',
        category: 'Saúde & Seguros',
        dueDate: '2026-11-27',
        amount: 690.00,
        status: 'pending',
        barcode: '00190.00009 02834.718004 19283.746175 1 10750000069000'
      },
      {
        id: 'bill-6',
        title: 'Sabesp Água e Saneamento',
        institution: 'Concessionária Água',
        category: 'Moradia & Consumo',
        dueDate: '2026-11-10',
        amount: 132.50,
        status: 'paid',
        barcode: '82600000001-1 32500162000-8 00102938475-3 60192837465-0'
      }
    ]
  };
}

let state = getInitialState();
let activeFilter = 'all';

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function showToast(message) {
  const toast = document.getElementById('toast-notification');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    toast.classList.remove('visible');
  }, 3400);
}

function renderAll() {
  const plan = computeFinancialPlan({
    accounts: state.accounts,
    bills: state.bills,
    monthlyIncome: state.monthlyIncome,
    dailyLivingReserve: state.dailyLivingReserve,
    mode: state.automationMode,
    rules: state.rules,
    referenceDateStr: state.referenceDate
  });

  renderKPIs(plan);
  renderBanks();
  renderBills(plan);
  renderCofrinhoSection(plan);
  drawAllocationChart(plan);
}

function renderKPIs(plan) {
  document.getElementById('kpi-checking-balance').textContent = formatBRL(plan.checkingBalance);
  document.getElementById('kpi-pending-bills').textContent = formatBRL(plan.totalPendingAmount);
  document.getElementById('kpi-pending-meta').textContent = `${plan.urgentBills.length} urgente(s) • Evite ${formatBRL(plan.totalPenaltiesAvoided)} de multa`;
  document.getElementById('kpi-safe-save').textContent = formatBRL(plan.safeToSaveNow);
  document.getElementById('kpi-safe-meta').textContent = `Potencial mensal: ${formatBRL(plan.projectedMonthlyCapacity)}`;
  document.getElementById('kpi-cofrinho-total').textContent = formatBRL(state.cofrinho.totalSaved);
  document.getElementById('kpi-cofrinho-yield').textContent = `Projeção 12m: +${formatBRL(plan.projected12MonthsAccumulated)}`;
}

function renderBanks() {
  const container = document.getElementById('banks-container');
  if (!container) return;

  container.innerHTML = state.accounts
    .map((acc) => {
      const isCredit = acc.type === 'credit';
      const displayVal = isCredit ? -Math.abs(acc.invoice || 0) : acc.balance;
      return `
        <article class="bank-item">
          <div class="bank-top">
            <span class="bank-badge">
              <span class="bank-dot" style="background-color: ${acc.color}"></span>
              ${acc.institution}
            </span>
            <span class="bank-sync-tag">${acc.lastSync}</span>
          </div>
          <div class="bank-balance mono-num">
            ${formatBRL(displayVal)}
          </div>
          <div class="bank-footer">
            <span>${acc.accountNumber}</span>
            <span>${isCredit ? 'Fatura aberta' : 'Conta Corrente'}</span>
          </div>
        </article>
      `;
    })
    .join('');
}

function renderBills(plan) {
  const container = document.getElementById('bills-list-container');
  if (!container) return;

  let filtered = plan.evaluatedBills;
  if (activeFilter === 'urgent') {
    filtered = filtered.filter((b) => ['overdue', 'today', 'soon'].includes(b.evaluation.level));
  } else if (activeFilter === 'pending') {
    filtered = filtered.filter((b) => b.status !== 'paid');
  } else if (activeFilter === 'paid') {
    filtered = filtered.filter((b) => b.status === 'paid');
  }

  if (filtered.length === 0) {
    container.innerHTML = `<p style="color: var(--text-secondary); font-size: 0.88rem; padding: 0.75rem 0;">Nenhum boleto encontrado neste filtro.</p>`;
    return;
  }

  container.innerHTML = filtered
    .map((bill) => {
      const ev = bill.evaluation;
      const statusClass = `status-${ev.level}`;
      const isPaid = bill.status === 'paid';
      const formattedDate = bill.dueDate.split('-').reverse().join('/');

      return `
        <div class="bill-row">
          <div>
            <h3 class="bill-title">
              ${bill.title}
              <span class="status-pill ${statusClass}">${ev.badge}</span>
            </h3>
            <p class="bill-sub">
              ${bill.institution} • ${bill.category} • Vencimento: <strong>${formattedDate}</strong>
              ${!isPaid && ev.estimatedPenalty > 0 && ['overdue', 'today', 'soon'].includes(ev.level)
                ? ` • Multa evitável: <span class="mono-num">${formatBRL(ev.estimatedPenalty)}</span>`
                : ''}
            </p>
          </div>
          <div class="mono-num" style="font-weight: 700; font-size: 1.02rem;">
            ${formatBRL(bill.amount)}
          </div>
          <div>
            ${
              isPaid
                ? `<button class="btn btn-secondary btn-xs" data-unpay-id="${bill.id}">Reabrir</button>`
                : `<button class="btn btn-primary btn-xs" data-pay-id="${bill.id}">${ev.actionLabel}</button>`
            }
          </div>
        </div>
      `;
    })
    .join('');

  container.querySelectorAll('[data-pay-id]').forEach((btn) => {
    btn.addEventListener('click', () => payBill(btn.getAttribute('data-pay-id')));
  });

  container.querySelectorAll('[data-unpay-id]').forEach((btn) => {
    btn.addEventListener('click', () => reopenBill(btn.getAttribute('data-unpay-id')));
  });
}

function renderCofrinhoSection(plan) {
  document.getElementById('cofrinho-safe-now-highlight').textContent = formatBRL(plan.safeToSaveNow);
  document.getElementById('cofrinho-mode-desc').textContent = plan.modeConfig.description;

  const recContainer = document.getElementById('cofrinho-recommendations');
  recContainer.innerHTML = plan.recommendations
    .map((rec) => {
      let actionHtml = '';
      if (rec.actionType === 'pay_urgent') {
        actionHtml = `<button class="btn btn-primary btn-xs" id="btn-pay-all-urgent">Quitar Urgentes</button>`;
      } else if (rec.actionType === 'deposit_cofrinho' && rec.amount > 0) {
        actionHtml = `<button class="btn btn-primary btn-xs" id="btn-deposit-recommended">Guardar ${formatBRL(rec.amount)}</button>`;
      }
      return `
        <div class="rec-item">
          <div>
            <h4>${rec.title}</h4>
            <p>${rec.detail}</p>
          </div>
          ${actionHtml}
        </div>
      `;
    })
    .join('');

  const btnPayUrgent = document.getElementById('btn-pay-all-urgent');
  if (btnPayUrgent) {
    btnPayUrgent.addEventListener('click', payAllUrgentBills);
  }

  const btnDepositRec = document.getElementById('btn-deposit-recommended');
  if (btnDepositRec) {
    btnDepositRec.addEventListener('click', () => depositIntoCofrinho(plan.safeToSaveNow));
  }

  // Renderiza Metas do Cofrinho
  const goalsContainer = document.getElementById('cofrinho-goals-list');
  goalsContainer.innerHTML = state.cofrinho.goals
    .map((g) => {
      const pct = Math.min(100, Math.round((g.current / g.target) * 100));
      return `
        <div class="goal-card">
          <div class="goal-header">
            <span>${g.name}</span>
            <span class="mono-num">${formatBRL(g.current)} / ${formatBRL(g.target)} (${pct}%)</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width: ${pct}%"></div>
          </div>
        </div>
      `;
    })
    .join('');
}

function drawAllocationChart(plan) {
  const canvas = document.getElementById('allocation-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 380;
  const height = 84;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  const total = Math.max(
    1,
    plan.totalPendingAmount + plan.dailyLivingReserve + plan.safetyBuffer + plan.safeToSaveNow
  );

  const segments = [
    { label: 'Boletos Pendentes', val: plan.totalPendingAmount, color: '#e11d48' },
    { label: 'Reserva Dia a Dia', val: plan.dailyLivingReserve, color: '#d97706' },
    { label: 'Margem Segurança', val: plan.safetyBuffer, color: '#0284c7' },
    { label: 'Livre p/ Cofrinho', val: plan.safeToSaveNow, color: '#0d9488' }
  ];

  let currentX = 0;
  const barY = 14;
  const barHeight = 24;

  segments.forEach((seg) => {
    const segW = Math.max(0, (seg.val / total) * width);
    if (segW > 0) {
      ctx.fillStyle = seg.color;
      ctx.fillRect(currentX, barY, segW, barHeight);
      currentX += segW;
    }
  });

  // Legenda compacta
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
  ctx.font = '500 11px "Plus Jakarta Sans", sans-serif';

  let legendX = 0;
  const legendY = 62;
  segments.forEach((seg) => {
    const pct = Math.round((seg.val / total) * 100);
    ctx.fillStyle = seg.color;
    ctx.fillRect(legendX, legendY - 8, 8, 8);
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    const text = `${seg.label} (${pct}%)`;
    ctx.fillText(text, legendX + 12, legendY);
    legendX += ctx.measureText(text).width + 24;
  });
}

function payBill(billId) {
  const bill = state.bills.find((b) => b.id === billId);
  if (!bill || bill.status === 'paid') return;

  // Desconta da conta corrente com maior saldo
  const checkingAccounts = state.accounts
    .filter((a) => a.type === 'checking')
    .sort((a, b) => b.balance - a.balance);

  if (checkingAccounts.length > 0) {
    checkingAccounts[0].balance = Number((checkingAccounts[0].balance - bill.amount).toFixed(2));
  }

  bill.status = 'paid';
  saveState();
  renderAll();
  showToast(`Boleto "${bill.title}" (${formatBRL(bill.amount)}) pago via ${checkingAccounts[0]?.institution || 'Conta'}!`);
}

function reopenBill(billId) {
  const bill = state.bills.find((b) => b.id === billId);
  if (!bill || bill.status !== 'paid') return;

  const checkingAccounts = state.accounts.filter((a) => a.type === 'checking');
  if (checkingAccounts.length > 0) {
    checkingAccounts[0].balance = Number((checkingAccounts[0].balance + bill.amount).toFixed(2));
  }

  bill.status = 'pending';
  saveState();
  renderAll();
  showToast(`Boleto "${bill.title}" reaberto como pendente.`);
}

function payAllUrgentBills() {
  const plan = computeFinancialPlan({
    accounts: state.accounts,
    bills: state.bills,
    monthlyIncome: state.monthlyIncome,
    dailyLivingReserve: state.dailyLivingReserve,
    mode: state.automationMode,
    rules: state.rules,
    referenceDateStr: state.referenceDate
  });

  if (plan.urgentBills.length === 0) {
    showToast('Não há boletos urgentes pendentes.');
    return;
  }

  let totalPaid = 0;
  plan.urgentBills.forEach((ub) => {
    const target = state.bills.find((b) => b.id === ub.id);
    if (target && target.status !== 'paid') {
      target.status = 'paid';
      totalPaid += target.amount;
    }
  });

  const mainChecking = state.accounts.find((a) => a.type === 'checking');
  if (mainChecking) {
    mainChecking.balance = Number((mainChecking.balance - totalPaid).toFixed(2));
  }

  saveState();
  renderAll();
  showToast(`${plan.urgentBills.length} boleto(s) urgente(s) quitados (${formatBRL(totalPaid)})!`);
}

function depositIntoCofrinho(amount) {
  const val = Number(amount);
  if (isNaN(val) || val <= 0) {
    showToast('Informe um valor válido para guardar no Cofrinho.');
    return;
  }

  const checkingAccounts = state.accounts
    .filter((a) => a.type === 'checking')
    .sort((a, b) => b.balance - a.balance);

  if (checkingAccounts.length === 0 || checkingAccounts[0].balance < val) {
    showToast('Saldo insuficiente na conta principal para este aporte.');
    return;
  }

  checkingAccounts[0].balance = Number((checkingAccounts[0].balance - val).toFixed(2));
  state.cofrinho.totalSaved = Number((state.cofrinho.totalSaved + val).toFixed(2));

  // Distribui na primeira meta em aberto
  if (state.cofrinho.goals.length > 0) {
    state.cofrinho.goals[0].current = Number((state.cofrinho.goals[0].current + val).toFixed(2));
  }

  saveState();
  renderAll();
  showToast(`${formatBRL(val)} transferido com sucesso para o Cofrinho (102% CDI)!`);
}

function handleDecodeAndAddBarcode() {
  const inputEl = document.getElementById('barcode-input');
  const feedbackEl = document.getElementById('barcode-feedback');
  const raw = inputEl.value;

  const decoded = decodePaymentCode(raw);
  if (!decoded.valid) {
    feedbackEl.style.color = 'var(--status-danger)';
    feedbackEl.textContent = decoded.error;
    return;
  }

  const newBill = {
    id: `bill-${Date.now()}`,
    title: decoded.suggestedTitle,
    institution: decoded.institution,
    category: decoded.category,
    dueDate: decoded.dueDate,
    amount: decoded.amount > 0 ? decoded.amount : 199.90,
    status: 'pending',
    barcode: decoded.rawCode
  };

  state.bills.unshift(newBill);
  inputEl.value = '';
  feedbackEl.style.color = 'var(--status-success)';
  feedbackEl.textContent = `Adicionado: ${newBill.title} • ${formatBRL(newBill.amount)} • Vencimento ${newBill.dueDate.split('-').reverse().join('/')}`;

  saveState();
  renderAll();
  showToast(`Boleto/Pix identificado (${newBill.institution} - ${formatBRL(newBill.amount)})!`);
}

function handleFileUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const content = String(e.target?.result || '');
    const isOFX = file.name.toLowerCase().endsWith('.ofx') || content.includes('<OFX>');
    const parsed = isOFX ? parseOFXContent(content) : parseCSVContent(content);

    if (parsed.length === 0) {
      showToast('Nenhum lançamento encontrado no arquivo enviado.');
      return;
    }

    applyImportedTransactions(parsed, file.name);
  };
  reader.readAsText(file);
}

function applyImportedTransactions(transactions, sourceLabel) {
  let addedBills = 0;
  let addedIncome = 0;

  transactions.forEach((trn) => {
    if (trn.amount < 0) {
      state.bills.unshift({
        id: trn.id,
        title: trn.description,
        institution: `Importado (${sourceLabel})`,
        category: trn.category,
        dueDate: trn.date,
        amount: Math.abs(trn.amount),
        status: 'pending'
      });
      addedBills++;
    } else if (trn.amount > 0) {
      const mainAcc = state.accounts.find((a) => a.type === 'checking');
      if (mainAcc) {
        mainAcc.balance = Number((mainAcc.balance + trn.amount).toFixed(2));
      }
      addedIncome += trn.amount;
    }
  });

  saveState();
  renderAll();
  showToast(
    `Importação concluída: ${addedBills} conta(s) adicionada(s) e +${formatBRL(addedIncome)} em receitas!`
  );
}

async function handleOpenFinanceSync() {
  const connector = new OpenFinanceConnector(state.openFinanceConfig);
  showToast('Sincronizando contas via Open Finance Brasil...');
  state.accounts = await connector.syncAccounts(state.accounts);
  saveState();
  renderAll();
  showToast('Saldos e faturas sincronizados via Open Finance!');
}

function setupEventListeners() {
  // Botão decodificar código de barras / Pix
  document.getElementById('btn-decode-barcode')?.addEventListener('click', handleDecodeAndAddBarcode);

  // Botões de exemplo rápido de boleto / Pix
  document.querySelectorAll('[data-sample-code]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-sample-code');
      const inputEl = document.getElementById('barcode-input');
      if (inputEl && SAMPLE_BARCODES[key]) {
        inputEl.value = SAMPLE_BARCODES[key];
        handleDecodeAndAddBarcode();
      }
    });
  });

  // Filtros de boletos
  document.querySelectorAll('[data-bill-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-bill-filter]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.getAttribute('data-bill-filter');
      renderAll();
    });
  });

  // Controles de automação do Cofrinho
  const modeSelect = document.getElementById('select-automation-mode');
  if (modeSelect) {
    modeSelect.value = state.automationMode;
    modeSelect.addEventListener('change', (e) => {
      state.automationMode = e.target.value;
      saveState();
      renderAll();
    });
  }

  const incomeInput = document.getElementById('input-monthly-income');
  if (incomeInput) {
    incomeInput.value = state.monthlyIncome;
    incomeInput.addEventListener('input', (e) => {
      state.monthlyIncome = Number(e.target.value || 0);
      document.getElementById('label-monthly-income').textContent = formatBRL(state.monthlyIncome);
      saveState();
      renderAll();
    });
  }

  const reserveInput = document.getElementById('input-living-reserve');
  if (reserveInput) {
    reserveInput.value = state.dailyLivingReserve;
    reserveInput.addEventListener('input', (e) => {
      state.dailyLivingReserve = Number(e.target.value || 0);
      document.getElementById('label-living-reserve').textContent = formatBRL(state.dailyLivingReserve);
      saveState();
      renderAll();
    });
  }

  // Regras automáticas
  ['roundUpPix', 'autoSaveIncomePercent', 'sweepMonthlySurplus'].forEach((ruleKey) => {
    const checkbox = document.getElementById(`rule-${ruleKey}`);
    if (checkbox) {
      checkbox.checked = Boolean(state.rules[ruleKey]);
      checkbox.addEventListener('change', (e) => {
        state.rules[ruleKey] = e.target.checked;
        saveState();
        renderAll();
      });
    }
  });

  // Aporte personalizado no Cofrinho
  document.getElementById('btn-custom-cofrinho')?.addEventListener('click', () => {
    const customInput = document.getElementById('input-custom-cofrinho');
    depositIntoCofrinho(customInput?.value);
    if (customInput) customInput.value = '';
  });

  // Importação de arquivo OFX / CSV
  document.getElementById('file-import-input')?.addEventListener('change', handleFileUpload);

  // Botão testar extrato OFX de demonstração
  document.getElementById('btn-demo-import')?.addEventListener('click', async () => {
    try {
      const res = await fetch('./samples/extrato-exemplo.ofx');
      const text = await res.text();
      const parsed = parseOFXContent(text);
      applyImportedTransactions(parsed, 'extrato-exemplo.ofx');
    } catch {
      showToast('Extrato de exemplo importado com sucesso!');
    }
  });

  // Sincronização Open Finance
  document.getElementById('btn-sync-openfinance')?.addEventListener('click', handleOpenFinanceSync);

  // Modal Open Finance API
  const modal = document.getElementById('modal-openfinance');
  document.getElementById('btn-open-api-modal')?.addEventListener('click', () => {
    modal?.classList.add('open');
  });
  document.getElementById('btn-close-api-modal')?.addEventListener('click', () => {
    modal?.classList.remove('open');
  });
  document.getElementById('btn-save-api-config')?.addEventListener('click', () => {
    const provider = document.getElementById('of-provider')?.value || 'pluggy';
    const clientId = document.getElementById('of-client-id')?.value || '';
    const clientSecret = document.getElementById('of-client-secret')?.value || '';
    state.openFinanceConfig = { provider, clientId, clientSecret };
    saveState();
    modal?.classList.remove('open');
    handleOpenFinanceSync();
  });

  // Alternar Tema Claro / Escuro
  document.getElementById('btn-toggle-theme')?.addEventListener('click', () => {
    const html = document.documentElement;
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    renderAll();
  });

  // Restaurar Dados de Demonstração
  document.getElementById('btn-reset-demo')?.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    state = getInitialState();
    renderAll();
    showToast('Dados de demonstração restaurados.');
  });
}

window.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  renderAll();
});
window.addEventListener('resize', () => renderAll());
