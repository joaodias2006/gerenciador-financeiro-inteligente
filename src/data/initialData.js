/**
 * Catálogo de Instituições Financeiras do Open Finance Brasil
 * e gerador de dados iniciais coerentes para o Raio-X Financeiro.
 */

export const BANCOS_CATALOGO = [
  {
    code: '260',
    name: 'Nubank',
    shortName: 'Nubank',
    color: '#0d9488', // Teal moderno (evitando roxo intenso no dark mode)
    badgeBg: 'bg-teal-500/15 text-teal-600 dark:text-teal-300 border-teal-500/30',
    defaultBalance: 4850.0,
    defaultLimit: 12000.0,
    closingDay: 24,
    dueDay: 2,
    accountType: 'Conta Digital & Ultravioleta'
  },
  {
    code: '341',
    name: 'Itaú Unibanco',
    shortName: 'Itaú',
    color: '#ea580c',
    badgeBg: 'bg-orange-500/15 text-orange-600 dark:text-orange-300 border-orange-500/30',
    defaultBalance: 6320.0,
    defaultLimit: 18000.0,
    closingDay: 28,
    dueDay: 6,
    accountType: 'Conta Corrente Personnalité'
  },
  {
    code: '077',
    name: 'Banco Inter',
    shortName: 'Inter',
    color: '#f97316',
    badgeBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30',
    defaultBalance: 2430.0,
    defaultLimit: 8000.0,
    closingDay: 20,
    dueDay: 28,
    accountType: 'Conta Digital & Cartão Black'
  },
  {
    code: '237',
    name: 'Bradesco',
    shortName: 'Bradesco',
    color: '#e11d48',
    badgeBg: 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30',
    defaultBalance: 3150.0,
    defaultLimit: 14000.0,
    closingDay: 25,
    dueDay: 5,
    accountType: 'Conta Corrente Prime'
  },
  {
    code: '001',
    name: 'Banco do Brasil',
    shortName: 'BB',
    color: '#eab308',
    badgeBg: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border-yellow-500/30',
    defaultBalance: 5400.0,
    defaultLimit: 15000.0,
    closingDay: 22,
    dueDay: 1,
    accountType: 'Conta Corrente Ourocard'
  },
  {
    code: '104',
    name: 'Caixa Econômica',
    shortName: 'Caixa',
    color: '#0284c7',
    badgeBg: 'bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/30',
    defaultBalance: 1980.0,
    defaultLimit: 6500.0,
    closingDay: 18,
    dueDay: 26,
    accountType: 'Conta Corrente & Habitação'
  },
  {
    code: '033',
    name: 'Santander',
    shortName: 'Santander',
    color: '#dc2626',
    badgeBg: 'bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/30',
    defaultBalance: 2890.0,
    defaultLimit: 11000.0,
    closingDay: 26,
    dueDay: 4,
    accountType: 'Conta Select & Cartão Unique'
  },
  {
    code: '208',
    name: 'BTG Pactual',
    shortName: 'BTG',
    color: '#2563eb',
    badgeBg: 'bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30',
    defaultBalance: 8200.0,
    defaultLimit: 22000.0,
    closingDay: 27,
    dueDay: 5,
    accountType: 'Conta Investimentos & Banking'
  },
  {
    code: '336',
    name: 'C6 Bank',
    shortName: 'C6 Bank',
    color: '#64748b',
    badgeBg: 'bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30',
    defaultBalance: 1750.0,
    defaultLimit: 9500.0,
    closingDay: 21,
    dueDay: 29,
    accountType: 'Conta Global & Carbon'
  }
];

export const PAYMENT_METHODS = [
  'Pix',
  'Cartão de Crédito à Vista',
  'Cartão de Crédito Parcelado',
  'Cartão de Débito',
  'Boleto',
  'Transferência',
  'Benefício'
];

export const EXPENSE_CATEGORIES = [
  'Moradia',
  'Alimentação',
  'Transporte',
  'Saúde',
  'Educação',
  'Lazer',
  'Assinaturas',
  'Outros'
];

export const INCOME_CATEGORIES = [
  'Salário',
  'Freelance / Projetos',
  'Rendimentos / Dividendos',
  'Reembolso / Outros'
];

/**
 * Formata uma data relativa ao mês atual do sistema para manter os dados
 * de exemplo sempre vivos no mês corrente e nos meses seguintes.
 */
export function buildRelativeDate(monthOffset = 0, day = 10) {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const maxDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  const safeDay = Math.min(Math.max(1, day), maxDay);
  const yyyy = target.getFullYear();
  const mm = String(target.getMonth() + 1).padStart(2, '0');
  const dd = String(safeDay).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function getMonthKey(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '';
  return dateStr.slice(0, 7); // YYYY-MM
}

export function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function getNextMonthKey(baseMonthKey) {
  const [y, m] = (baseMonthKey || getCurrentMonthKey()).split('-').map(Number);
  const d = new Date(y, m, 1); // m is 1-based, so Date(y, m, 1) is next month!
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Perfis de titulares pré-configurados para demonstrar autenticação e
 * isolamento de dados por CPF/Titular.
 */
export const DEMO_USERS = [
  {
    id: 'user-joao-01',
    name: 'João Dias',
    email: 'joao.dias@raioxfinanceiro.com.br',
    cpf: '418.920.318-06',
    role: 'Titular Principal',
    monthlySavingsGoal: 1800.0,
    vaultSavedCurrentMonth: 1200.0,
    rolloverAmount: 950.0,
    expectedNextMonthIncome: 12640.0,
    openFinanceProvider: 'Pluggy Open Finance Brasil'
  },
  {
    id: 'user-maria-02',
    name: 'Marina Costa',
    email: 'marina.costa@raioxfinanceiro.com.br',
    cpf: '729.401.852-90',
    role: 'Segundo Titular (Isolamento Demo)',
    monthlySavingsGoal: 2500.0,
    vaultSavedCurrentMonth: 2500.0,
    rolloverAmount: 1400.0,
    expectedNextMonthIncome: 16500.0,
    openFinanceProvider: 'Belvo Open Finance Brasil'
  }
];

/**
 * Gera os bancos e transações de exemplo para o titular especificado.
 */
export function generateSeedDataForUser(userId = 'user-joao-01') {
  if (userId === 'user-maria-02') {
    const banks = [
      {
        id: 'bank-maria-btg',
        userId: 'user-maria-02',
        bankCode: '208',
        bankName: 'BTG Pactual',
        accountType: 'Conta Investimentos & Banking',
        agency: '0001',
        accountNumber: '994120-5',
        balance: 9400.0,
        creditLimit: 25000.0,
        creditUsed: 3200.0,
        currentInvoice: 1600.0,
        closingDay: 25,
        dueDay: 5,
        color: '#2563eb',
        connectionType: 'open_finance',
        lastSync: 'Sincronizado via Belvo API',
        status: 'Conectado'
      },
      {
        id: 'bank-maria-nubank',
        userId: 'user-maria-02',
        bankCode: '260',
        bankName: 'Nubank',
        accountType: 'Conta Digital & Ultravioleta',
        agency: '0001',
        accountNumber: '518290-1',
        balance: 5200.0,
        creditLimit: 15000.0,
        creditUsed: 1850.0,
        currentInvoice: 1850.0,
        closingDay: 24,
        dueDay: 2,
        color: '#0d9488',
        connectionType: 'open_finance',
        lastSync: 'Sincronizado via Belvo API',
        status: 'Conectado'
      }
    ];

    const transactions = [
      {
        id: 'tx-m-1',
        userId: 'user-maria-02',
        bankId: 'bank-maria-btg',
        type: 'income',
        amount: 16500.0,
        description: 'Remuneração Diretoria Médica',
        date: buildRelativeDate(0, 5),
        category: 'Salário',
        status: 'paid',
        paymentMethod: 'Transferência',
        isFixed: true,
        installmentGroupId: null,
        installmentCurrent: 1,
        installmentTotal: 1
      },
      {
        id: 'tx-m-2',
        userId: 'user-maria-02',
        bankId: 'bank-maria-btg',
        type: 'expense',
        amount: 3400.0,
        description: 'Financiamento Studio Jardins',
        date: buildRelativeDate(0, 10),
        category: 'Moradia',
        status: 'paid',
        paymentMethod: 'Boleto',
        isFixed: true,
        installmentGroupId: null,
        installmentCurrent: 1,
        installmentTotal: 1
      },
      {
        id: 'tx-m-3',
        userId: 'user-maria-02',
        bankId: 'bank-maria-nubank',
        type: 'expense',
        amount: 1600.0,
        description: 'Congresso Internacional Cardiologia (1/2)',
        date: buildRelativeDate(0, 15),
        category: 'Educação',
        status: 'pending',
        paymentMethod: 'Cartão de Crédito Parcelado',
        isFixed: false,
        installmentGroupId: 'grp-maria-congresso',
        installmentCurrent: 1,
        installmentTotal: 2
      },
      {
        id: 'tx-m-4',
        userId: 'user-maria-02',
        bankId: 'bank-maria-nubank',
        type: 'expense',
        amount: 1600.0,
        description: 'Congresso Internacional Cardiologia (2/2)',
        date: buildRelativeDate(1, 15),
        category: 'Educação',
        status: 'pending',
        paymentMethod: 'Cartão de Crédito Parcelado',
        isFixed: false,
        installmentGroupId: 'grp-maria-congresso',
        installmentCurrent: 2,
        installmentTotal: 2
      }
    ];

    return { banks, transactions };
  }

  // Titular Principal: João Dias (3 bancos conectados: Nubank, Itaú e Inter)
  const banks = [
    {
      id: 'bank-nubank',
      userId: 'user-joao-01',
      bankCode: '260',
      bankName: 'Nubank',
      accountType: 'Conta Digital & Ultravioleta',
      agency: '0001',
      accountNumber: '849201-7',
      balance: 4850.0,
      creditLimit: 12000.0,
      creditUsed: 2385.0,
      currentInvoice: 825.0,
      closingDay: 24,
      dueDay: 2,
      color: '#0d9488',
      connectionType: 'open_finance',
      lastSync: 'Sincronizado há 4 min via Pluggy',
      status: 'Conectado'
    },
    {
      id: 'bank-itau',
      userId: 'user-joao-01',
      bankCode: '341',
      bankName: 'Itaú Unibanco',
      accountType: 'Conta Corrente Personnalité',
      agency: '3104',
      accountNumber: '44912-3',
      balance: 6320.0,
      creditLimit: 18000.0,
      creditUsed: 4290.0,
      currentInvoice: 1130.0,
      closingDay: 28,
      dueDay: 6,
      color: '#ea580c',
      connectionType: 'open_finance',
      lastSync: 'Sincronizado há 2 min via Pluggy',
      status: 'Conectado'
    },
    {
      id: 'bank-inter',
      userId: 'user-joao-01',
      bankCode: '077',
      bankName: 'Banco Inter',
      accountType: 'Conta Digital & Cartão Black',
      agency: '0001',
      accountNumber: '1928374-9',
      balance: 2430.0,
      creditLimit: 8000.0,
      creditUsed: 960.0,
      currentInvoice: 320.0,
      closingDay: 20,
      dueDay: 28,
      color: '#f97316',
      connectionType: 'open_finance',
      lastSync: 'Sincronizado há 6 min via Pluggy',
      status: 'Conectado'
    }
  ];

  const transactions = [
    // ================= RECEITAS DO MÊS ATUAL =================
    {
      id: 'tx-inc-1',
      userId: 'user-joao-01',
      bankId: 'bank-itau',
      type: 'income',
      amount: 9500.0,
      description: 'Salário Mensal — Engenheiro de Software Sênior',
      date: buildRelativeDate(0, 5),
      category: 'Salário',
      status: 'paid',
      paymentMethod: 'Transferência',
      isFixed: true,
      installmentGroupId: null,
      installmentCurrent: 1,
      installmentTotal: 1
    },
    {
      id: 'tx-inc-2',
      userId: 'user-joao-01',
      bankId: 'bank-nubank',
      type: 'income',
      amount: 2800.0,
      description: 'Consultoria Arquitetura Cloud (Pix Cliente)',
      date: buildRelativeDate(0, 12),
      category: 'Freelance / Projetos',
      status: 'paid',
      paymentMethod: 'Pix',
      isFixed: false,
      installmentGroupId: null,
      installmentCurrent: 1,
      installmentTotal: 1
    },
    {
      id: 'tx-inc-3',
      userId: 'user-joao-01',
      bankId: 'bank-inter',
      type: 'income',
      amount: 340.0,
      description: 'Rendimento Líquido CDB Liquidez Diária (102% CDI)',
      date: buildRelativeDate(0, 14),
      category: 'Rendimentos / Dividendos',
      status: 'paid',
      paymentMethod: 'Transferência',
      isFixed: true,
      installmentGroupId: null,
      installmentCurrent: 1,
      installmentTotal: 1
    },

    // ================= GASTOS JÁ REALIZADOS (PAGOS À VISTA) =================
    {
      id: 'tx-exp-paid-1',
      userId: 'user-joao-01',
      bankId: 'bank-itau',
      type: 'expense',
      amount: 2650.0,
      description: 'Aluguel + Condomínio Residencial Vila Mariana',
      date: buildRelativeDate(0, 6),
      category: 'Moradia',
      status: 'paid',
      paymentMethod: 'Boleto',
      isFixed: true,
      installmentGroupId: null,
      installmentCurrent: 1,
      installmentTotal: 1
    },
    {
      id: 'tx-exp-paid-2',
      userId: 'user-joao-01',
      bankId: 'bank-itau',
      type: 'expense',
      amount: 980.0,
      description: 'Supermercado Pão de Açúcar & Atacadão (Mês)',
      date: buildRelativeDate(0, 8),
      category: 'Alimentação',
      status: 'paid',
      paymentMethod: 'Benefício',
      isFixed: false,
      installmentGroupId: null,
      installmentCurrent: 1,
      installmentTotal: 1
    },
    {
      id: 'tx-exp-paid-3',
      userId: 'user-joao-01',
      bankId: 'bank-nubank',
      type: 'expense',
      amount: 245.0,
      description: 'Feira Orgânica & Empório Semanal (Pix)',
      date: buildRelativeDate(0, 10),
      category: 'Alimentação',
      status: 'paid',
      paymentMethod: 'Pix',
      isFixed: false,
      installmentGroupId: null,
      installmentCurrent: 1,
      installmentTotal: 1
    },
    {
      id: 'tx-exp-paid-4',
      userId: 'user-joao-01',
      bankId: 'bank-inter',
      type: 'expense',
      amount: 380.0,
      description: 'Abastecimento Shell Box + Tag Pedágio',
      date: buildRelativeDate(0, 11),
      category: 'Transporte',
      status: 'paid',
      paymentMethod: 'Cartão de Débito',
      isFixed: false,
      installmentGroupId: null,
      installmentCurrent: 1,
      installmentTotal: 1
    },
    {
      id: 'tx-exp-paid-5',
      userId: 'user-joao-01',
      bankId: 'bank-nubank',
      type: 'expense',
      amount: 290.0,
      description: 'Drogasil & Exames Laboratoriais',
      date: buildRelativeDate(0, 13),
      category: 'Saúde',
      status: 'paid',
      paymentMethod: 'Cartão de Débito',
      isFixed: false,
      installmentGroupId: null,
      installmentCurrent: 1,
      installmentTotal: 1
    },
    {
      id: 'tx-exp-paid-6',
      userId: 'user-joao-01',
      bankId: 'bank-nubank',
      type: 'expense',
      amount: 215.0,
      description: 'Restaurante & Cinema Final de Semana',
      date: buildRelativeDate(0, 15),
      category: 'Lazer',
      status: 'paid',
      paymentMethod: 'Pix',
      isFixed: false,
      installmentGroupId: null,
      installmentCurrent: 1,
      installmentTotal: 1
    },

    // ================= CONTAS FIXAS / COMPROMETIDAS A PAGAR NO MÊS =================
    {
      id: 'tx-exp-pend-1',
      userId: 'user-joao-01',
      bankId: 'bank-itau',
      type: 'expense',
      amount: 310.0,
      description: 'Enel Energia Elétrica (Boleto DDA Agendado)',
      date: buildRelativeDate(0, 20),
      category: 'Moradia',
      status: 'pending',
      paymentMethod: 'Boleto',
      isFixed: true,
      installmentGroupId: null,
      installmentCurrent: 1,
      installmentTotal: 1
    },
    {
      id: 'tx-exp-pend-2',
      userId: 'user-joao-01',
      bankId: 'bank-nubank',
      type: 'expense',
      amount: 220.0,
      description: 'Vivo Fibra 1Gbps + Plano Móvel 5G',
      date: buildRelativeDate(0, 22),
      category: 'Moradia',
      status: 'pending',
      paymentMethod: 'Boleto',
      isFixed: true,
      installmentGroupId: null,
      installmentCurrent: 1,
      installmentTotal: 1
    },
    {
      id: 'tx-exp-pend-3',
      userId: 'user-joao-01',
      bankId: 'bank-itau',
      type: 'expense',
      amount: 690.0,
      description: 'Plano de Saúde Bradesco Saúde Nacional',
      date: buildRelativeDate(0, 25),
      category: 'Saúde',
      status: 'pending',
      paymentMethod: 'Boleto',
      isFixed: true,
      installmentGroupId: null,
      installmentCurrent: 1,
      installmentTotal: 1
    },
    {
      id: 'tx-exp-pend-4',
      userId: 'user-joao-01',
      bankId: 'bank-inter',
      type: 'expense',
      amount: 420.0,
      description: 'Pós-Graduação Engenharia de Dados & IA',
      date: buildRelativeDate(0, 26),
      category: 'Educação',
      status: 'pending',
      paymentMethod: 'Boleto',
      isFixed: true,
      installmentGroupId: null,
      installmentCurrent: 1,
      installmentTotal: 1
    },
    {
      id: 'tx-exp-pend-5',
      userId: 'user-joao-01',
      bankId: 'bank-nubank',
      type: 'expense',
      amount: 160.0,
      description: 'Smart Fit Black + App Corrida',
      date: buildRelativeDate(0, 24),
      category: 'Saúde',
      status: 'pending',
      paymentMethod: 'Cartão de Crédito à Vista',
      isFixed: true,
      installmentGroupId: null,
      installmentCurrent: 1,
      installmentTotal: 1
    },
    {
      id: 'tx-exp-pend-6',
      userId: 'user-joao-01',
      bankId: 'bank-nubank',
      type: 'expense',
      amount: 145.0,
      description: 'Assinaturas Digitais (Spotify, AWS, GitHub, iCloud)',
      date: buildRelativeDate(0, 24),
      category: 'Assinaturas',
      status: 'pending',
      paymentMethod: 'Cartão de Crédito à Vista',
      isFixed: true,
      installmentGroupId: null,
      installmentCurrent: 1,
      installmentTotal: 1
    }
  ];

  // ================= COMPRAS PARCELADAS NO CRÉDITO (MÊS ATUAL + PRÓXIMOS MESES) =================
  // 1. Workstation / Monitor Dell 4K: 6x de R$ 650,00 no Itaú (estamos na parcela 2/6)
  for (let i = 2; i <= 6; i++) {
    const monthOffset = i - 2; // i=2 -> mês atual (0), i=3 -> próximo mês (1), etc.
    transactions.push({
      id: `tx-inst-dell-${i}`,
      userId: 'user-joao-01',
      bankId: 'bank-itau',
      type: 'expense',
      amount: 650.0,
      description: `Monitor Dell UltraSharp 4K & Dock (${i}/6)`,
      date: buildRelativeDate(monthOffset, 18),
      category: 'Educação',
      status: 'pending',
      paymentMethod: 'Cartão de Crédito Parcelado',
      isFixed: false,
      installmentGroupId: 'grp-dell-4k',
      installmentCurrent: i,
      installmentTotal: 6
    });
  }

  // 2. Seguro Auto Porto Seguro: 6x de R$ 480,00 no Itaú (estamos na parcela 3/6)
  for (let i = 3; i <= 6; i++) {
    const monthOffset = i - 3;
    transactions.push({
      id: `tx-inst-seguro-${i}`,
      userId: 'user-joao-01',
      bankId: 'bank-itau',
      type: 'expense',
      amount: 480.0,
      description: `Seguro Auto Anual Completo (${i}/6)`,
      date: buildRelativeDate(monthOffset, 21),
      category: 'Transporte',
      status: 'pending',
      paymentMethod: 'Cartão de Crédito Parcelado',
      isFixed: false,
      installmentGroupId: 'grp-seguro-auto',
      installmentCurrent: i,
      installmentTotal: 6
    });
  }

  // 3. Passagens Aéreas Férias: 4x de R$ 520,00 no Nubank (parcelas 1/4 a 4/4)
  for (let i = 1; i <= 4; i++) {
    const monthOffset = i - 1;
    transactions.push({
      id: `tx-inst-viagem-${i}`,
      userId: 'user-joao-01',
      bankId: 'bank-nubank',
      type: 'expense',
      amount: 520.0,
      description: `Passagens Aéreas & Hotel Florianópolis (${i}/4)`,
      date: buildRelativeDate(monthOffset, 19),
      category: 'Lazer',
      status: 'pending',
      paymentMethod: 'Cartão de Crédito Parcelado',
      isFixed: false,
      installmentGroupId: 'grp-viagem-fln',
      installmentCurrent: i,
      installmentTotal: 4
    });
  }

  // 4. Revisão Preventiva & Pneus: 3x de R$ 320,00 no Banco Inter (parcelas 1/3 a 3/3)
  for (let i = 1; i <= 3; i++) {
    const monthOffset = i - 1;
    transactions.push({
      id: `tx-inst-revisao-${i}`,
      userId: 'user-joao-01',
      bankId: 'bank-inter',
      type: 'expense',
      amount: 320.0,
      description: `Revisão 40.000km & Alinhamento (${i}/3)`,
      date: buildRelativeDate(monthOffset, 16),
      category: 'Transporte',
      status: 'pending',
      paymentMethod: 'Cartão de Crédito Parcelado',
      isFixed: false,
      installmentGroupId: 'grp-revisao-auto',
      installmentCurrent: i,
      installmentTotal: 3
    });
  }

  return { banks, transactions };
}
