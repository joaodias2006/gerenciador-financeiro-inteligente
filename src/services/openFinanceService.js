import { BANCOS_CATALOGO, buildRelativeDate } from '../data/initialData.js';

/**
 * Serviço de Integração Real e Simulada — Open Finance Brasil (Pluggy API),
 * Importador Real de Extratos Bancários (.OFX e .CSV de bancos brasileiros)
 * e Decodificador FEBRABAN (Boletos 47/48 dígitos e Pix Copia e Cola EMV).
 */

/**
 * Conecta de verdade à API REST da Pluggy (https://api.pluggy.ai)
 * usando Client ID, Client Secret e Item ID reais do usuário.
 */
export async function syncRealPluggyOpenFinance({
  clientId,
  clientSecret,
  itemId,
  userId
}) {
  if (!clientId || !clientSecret || !itemId) {
    throw new Error(
      'Informe o Client ID, Client Secret e o Item ID da sua conexão Pluggy Open Finance.'
    );
  }

  // 1. Autentica na Pluggy para obter o X-API-KEY
  const authRes = await fetch('https://api.pluggy.ai/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, clientSecret })
  });

  if (!authRes.ok) {
    throw new Error(
      `Falha na autenticação Pluggy (HTTP ${authRes.status}). Verifique seu Client ID e Client Secret.`
    );
  }

  const { apiKey } = await authRes.json();

  // 2. Busca contas reais vinculadas ao Item ID (Conta Corrente e Cartão de Crédito)
  const accRes = await fetch(
    `https://api.pluggy.ai/accounts?itemId=${encodeURIComponent(itemId)}`,
    {
      headers: { 'X-API-KEY': apiKey }
    }
  );

  if (!accRes.ok) {
    throw new Error(
      `Não foi possível buscar as contas do Item ID informado (HTTP ${accRes.status}).`
    );
  }

  const accData = await accRes.json();
  const pluggyAccounts = accData.results || [];
  if (pluggyAccounts.length === 0) {
    throw new Error('Nenhuma conta encontrada para este Item ID na Pluggy.');
  }

  const bankAcc =
    pluggyAccounts.find((a) => a.type === 'BANK') || pluggyAccounts[0];
  const creditAcc = pluggyAccounts.find((a) => a.type === 'CREDIT');

  const bankName = bankAcc.name || 'Instituição Open Finance';
  const catalogMatch =
    BANCOS_CATALOGO.find((b) =>
      bankName.toLowerCase().includes(b.shortName.toLowerCase())
    ) || BANCOS_CATALOGO[0];

  const newBankId = `bank-pluggy-${bankAcc.id}`;
  const nowStr = new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const realBank = {
    id: newBankId,
    userId,
    bankCode: catalogMatch.code,
    bankName: bankAcc.marketingName || bankName,
    accountType: 'Conectado via Open Finance Real (Pluggy)',
    agency: bankAcc.bankData?.transferNumber?.split('/')[0] || '0001',
    accountNumber: bankAcc.number || 'OpenFinance',
    balance: Number(bankAcc.balance || 0),
    creditLimit: Number(
      creditAcc?.creditData?.creditLimit ||
        creditAcc?.creditData?.availableCreditLimit ||
        0
    ),
    creditUsed: Number(creditAcc?.balance || 0),
    currentInvoice: Number(creditAcc?.balance || 0),
    closingDay: 25,
    dueDay: 5,
    color: catalogMatch.color,
    connectionType: 'open_finance_real',
    lastSync: `Open Finance Real às ${nowStr}`,
    status: 'Sincronizado (API Real)'
  };

  // 3. Busca transações reais dos últimos 60 dias
  const importedTransactions = [];
  for (const acc of pluggyAccounts) {
    const txRes = await fetch(
      `https://api.pluggy.ai/transactions?accountId=${encodeURIComponent(acc.id)}&pageSize=100`,
      {
        headers: { 'X-API-KEY': apiKey }
      }
    );
    if (txRes.ok) {
      const txData = await txRes.json();
      const results = txData.results || [];
      for (const t of results) {
        const rawAmt = Number(t.amount || 0);
        const isCreditCard = acc.type === 'CREDIT';
        const isExpense = isCreditCard ? rawAmt > 0 : rawAmt < 0;
        const absAmount = Math.abs(rawAmt);
        if (absAmount === 0) continue;

        const dateStr = (t.date || new Date().toISOString()).slice(0, 10);
        const desc = t.description || t.descriptionRaw || 'Transação Open Finance';

        importedTransactions.push({
          id: `pluggy-tx-${t.id}`,
          externalId: `pluggy-${t.id}`,
          userId,
          bankId: newBankId,
          type: isExpense ? 'expense' : 'income',
          amount: Number(absAmount.toFixed(2)),
          description: desc,
          date: dateStr,
          category: inferCategoryFromDescription(desc, isExpense ? 'expense' : 'income'),
          status: isCreditCard ? 'pending' : 'paid',
          paymentMethod: isCreditCard
            ? inferPaymentMethodFromText(desc, 'CREDIT')
            : inferPaymentMethodFromText(desc, t.paymentData?.paymentMethod || ''),
          isFixed: lowerIncludesFixedKeyword(desc),
          installmentGroupId: null,
          installmentCurrent: t.creditCardMetadata?.installmentNumber || 1,
          installmentTotal: t.creditCardMetadata?.totalInstallments || 1
        });
      }
    }
  }

  return { bank: realBank, transactions: importedTransactions };
}

/**
 * Cria uma conta bancária REAL cadastrada manualmente pelo usuário
 * (sem injetar transações fictícias!).
 */
export function createRealManualBankAccount({
  bankCode,
  customBankName,
  accountType,
  agency,
  accountNumber,
  balance,
  creditLimit,
  currentInvoice,
  closingDay,
  dueDay,
  userId
}) {
  const catalogItem =
    BANCOS_CATALOGO.find((b) => b.code === bankCode) || BANCOS_CATALOGO[0];

  const nowStr = new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return {
    id: `bank-real-${catalogItem.code}-${Date.now()}`,
    userId,
    bankCode: catalogItem.code,
    bankName: (customBankName || catalogItem.name).trim(),
    accountType: (accountType || catalogItem.accountType).trim(),
    agency: (agency || '0001').trim(),
    accountNumber: (accountNumber || 'Conta Real').trim(),
    balance: Number(balance || 0),
    creditLimit: Number(creditLimit || 0),
    creditUsed: Number(currentInvoice || 0),
    currentInvoice: Number(currentInvoice || 0),
    closingDay: Number(closingDay || catalogItem.closingDay || 25),
    dueDay: Number(dueDay || catalogItem.dueDay || 5),
    color: catalogItem.color,
    connectionType: 'real_manual',
    lastSync: `Saldo real atualizado às ${nowStr}`,
    status: 'Conta Real Ativa'
  };
}

/**
 * Gera uma conta bancária simulada + lançamentos de demonstração ao usar o Simulador.
 */
export function simulateBankConnection(bankCode, userId) {
  const catalogItem =
    BANCOS_CATALOGO.find((b) => b.code === bankCode) || BANCOS_CATALOGO[0];

  const randomDigits = Math.floor(10000 + Math.random() * 89999);
  const bankId = `bank-${catalogItem.code}-${Date.now()}`;
  const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const newBank = {
    id: bankId,
    userId,
    bankCode: catalogItem.code,
    bankName: catalogItem.name,
    accountType: catalogItem.accountType,
    agency: '0001',
    accountNumber: `${randomDigits}-${Math.floor(Math.random() * 9)}`,
    balance: catalogItem.defaultBalance,
    creditLimit: catalogItem.defaultLimit,
    creditUsed: Math.round(catalogItem.defaultLimit * 0.18),
    currentInvoice: Math.round(catalogItem.defaultLimit * 0.09),
    closingDay: catalogItem.closingDay,
    dueDay: catalogItem.dueDay,
    color: catalogItem.color,
    connectionType: 'open_finance_sim',
    lastSync: `Simulado às ${nowStr}`,
    status: 'Simulador Demo'
  };

  const sampleTransactions = [
    {
      id: `tx-of-${Date.now()}-1`,
      userId,
      bankId,
      type: 'income',
      amount: 1450.0,
      description: `Transferência Recebida TED/Pix (${catalogItem.shortName})`,
      date: buildRelativeDate(0, 9),
      category: 'Freelance / Projetos',
      status: 'paid',
      paymentMethod: 'Pix',
      isFixed: false,
      installmentGroupId: null,
      installmentCurrent: 1,
      installmentTotal: 1
    },
    {
      id: `tx-of-${Date.now()}-2`,
      userId,
      bankId,
      type: 'expense',
      amount: 189.9,
      description: `Compra Débito Supermercado (${catalogItem.shortName})`,
      date: buildRelativeDate(0, 12),
      category: 'Alimentação',
      status: 'paid',
      paymentMethod: 'Cartão de Débito',
      isFixed: false,
      installmentGroupId: null,
      installmentCurrent: 1,
      installmentTotal: 1
    }
  ];

  return { bank: newBank, transactions: sampleTransactions };
}

/**
 * Infere automaticamente a Categoria com base na descrição e sinal do lançamento.
 */
export function inferCategoryFromDescription(description = '', type = 'expense') {
  const lower = description.toLowerCase();
  if (type === 'income') {
    if (
      lower.includes('salário') ||
      lower.includes('salario') ||
      lower.includes('folha') ||
      lower.includes('remunera') ||
      lower.includes('pro-labore')
    ) {
      return 'Salário';
    }
    if (
      lower.includes('cdi') ||
      lower.includes('rendimento') ||
      lower.includes('dividendo') ||
      lower.includes('fii') ||
      lower.includes('tesouro')
    ) {
      return 'Rendimentos / Dividendos';
    }
    return 'Freelance / Projetos';
  }

  if (
    lower.includes('aluguel') ||
    lower.includes('condom') ||
    lower.includes('enel') ||
    lower.includes('energia') ||
    lower.includes('cpfl') ||
    lower.includes('cemig') ||
    lower.includes('light') ||
    lower.includes('luz') ||
    lower.includes('sabesp') ||
    lower.includes('copasa') ||
    lower.includes('sanepar') ||
    lower.includes('água') ||
    lower.includes('agua') ||
    lower.includes('vivo') ||
    lower.includes('claro') ||
    lower.includes('tim') ||
    lower.includes('oi ') ||
    lower.includes('internet') ||
    lower.includes('iptu') ||
    lower.includes('gás') ||
    lower.includes('comgas')
  ) {
    return 'Moradia';
  }
  if (
    lower.includes('supermercado') ||
    lower.includes('mercado') ||
    lower.includes('atacad') ||
    lower.includes('assai') ||
    lower.includes('assaí') ||
    lower.includes('ifood') ||
    lower.includes('rappi') ||
    lower.includes('restaurante') ||
    lower.includes('padaria') ||
    lower.includes('lanchonete') ||
    lower.includes('feira') ||
    lower.includes('pão de açúcar') ||
    lower.includes('carrefour') ||
    lower.includes('extra') ||
    lower.includes('zafari') ||
    lower.includes('oba ')
  ) {
    return 'Alimentação';
  }
  if (
    lower.includes('uber') ||
    lower.includes('99app') ||
    lower.includes('99*') ||
    lower.includes('99 pop') ||
    lower.includes('posto') ||
    lower.includes('shell') ||
    lower.includes('ipiranga') ||
    lower.includes('br mania') ||
    lower.includes('petrobras') ||
    lower.includes('combust') ||
    lower.includes('gasolina') ||
    lower.includes('etanol') ||
    lower.includes('pedágio') ||
    lower.includes('sem parar') ||
    lower.includes('veloe') ||
    lower.includes('conectcar') ||
    lower.includes('estacionamento') ||
    lower.includes('seguro auto')
  ) {
    return 'Transporte';
  }
  if (
    lower.includes('farmácia') ||
    lower.includes('farmacia') ||
    lower.includes('drogasil') ||
    lower.includes('droga raia') ||
    lower.includes('drogaria') ||
    lower.includes('pague menos') ||
    lower.includes('panvel') ||
    lower.includes('unimed') ||
    lower.includes('bradesco saude') ||
    lower.includes('amil') ||
    lower.includes('sulamerica') ||
    lower.includes('hapvida') ||
    lower.includes('saúde') ||
    lower.includes('médico') ||
    lower.includes('clinica') ||
    lower.includes('hospital') ||
    lower.includes('exame') ||
    lower.includes('smart fit') ||
    lower.includes('bluefit') ||
    lower.includes('totalpass') ||
    lower.includes('gympass') ||
    lower.includes('wellhub') ||
    lower.includes('academia')
  ) {
    return 'Saúde';
  }
  if (
    lower.includes('faculdade') ||
    lower.includes('universidade') ||
    lower.includes('curso') ||
    lower.includes('pós') ||
    lower.includes('escola') ||
    lower.includes('colégio') ||
    lower.includes('livro') ||
    lower.includes('amazon br') ||
    lower.includes('alura') ||
    lower.includes('udemy') ||
    lower.includes('rocketseat')
  ) {
    return 'Educação';
  }
  if (
    lower.includes('netflix') ||
    lower.includes('spotify') ||
    lower.includes('prime video') ||
    lower.includes('disney') ||
    lower.includes('hbo') ||
    lower.includes('max.com') ||
    lower.includes('youtube') ||
    lower.includes('apple.com/bill') ||
    lower.includes('icloud') ||
    lower.includes('google one') ||
    lower.includes('chatgpt') ||
    lower.includes('openai') ||
    lower.includes('claude') ||
    lower.includes('assinatura') ||
    lower.includes('github') ||
    lower.includes('aws')
  ) {
    return 'Assinaturas';
  }
  if (
    lower.includes('cinema') ||
    lower.includes('ingresso') ||
    lower.includes('viagem') ||
    lower.includes('hotel') ||
    lower.includes('airbnb') ||
    lower.includes('booking') ||
    lower.includes('latam') ||
    lower.includes('gol ') ||
    lower.includes('azul ') ||
    lower.includes('passagem') ||
    lower.includes('show') ||
    lower.includes('bar')
  ) {
    return 'Lazer';
  }
  return 'Outros';
}

/**
 * Infere automaticamente a Forma de Pagamento com base no texto do extrato OFX/CSV.
 */
export function inferPaymentMethodFromText(description = '', trnType = '') {
  const lower = `${description} ${trnType}`.toLowerCase();
  if (lower.includes('pix')) return 'Pix';
  if (
    lower.includes('parcela') ||
    /\(\d+\/\d+\)/.test(lower) ||
    /\b\d{1,2}\/\d{1,2}\b/.test(lower) ||
    /\d+\s*de\s*\d+/.test(lower)
  ) {
    return 'Cartão de Crédito Parcelado';
  }
  if (
    lower.includes('crédito') ||
    lower.includes('credito') ||
    lower.includes('credit') ||
    lower.includes('compra cartao')
  ) {
    return 'Cartão de Crédito à Vista';
  }
  if (
    lower.includes('boleto') ||
    lower.includes('dda') ||
    lower.includes('pagamento de titulo') ||
    lower.includes('pagamento de conta') ||
    lower.includes('deb.autor') ||
    lower.includes('débito automático') ||
    lower.includes('enel') ||
    lower.includes('sabesp') ||
    lower.includes('condom')
  ) {
    return 'Boleto';
  }
  if (
    lower.includes('vr ') ||
    lower.includes('va ') ||
    lower.includes('alelo') ||
    lower.includes('pluxee') ||
    lower.includes('sodexo') ||
    lower.includes('ticket') ||
    lower.includes('caju') ||
    lower.includes('flash') ||
    lower.includes('benefício')
  ) {
    return 'Benefício';
  }
  if (lower.includes('ted') || lower.includes('doc') || lower.includes('transf')) {
    return 'Transferência';
  }
  return 'Cartão de Débito';
}

/**
 * Faz o parse de um arquivo .OFX REAL (Open Financial Exchange 1.x / 2.x)
 * exportado do Nubank, Itaú, Inter, Bradesco, Banco do Brasil, Santander, Caixa, etc.
 * Preserva as datas reais (<DTPOSTED>), extrai o saldo real (<BALAMT>) e o código do banco (<BANKID>).
 */
export function parseOFXStatement(ofxText, targetBankId, userId, options = {}) {
  if (!ofxText || typeof ofxText !== 'string') {
    return { transactions: [], metadata: {} };
  }

  const preserveRealDates = options.preserveRealDates !== false;

  // Extrai metadados reais da conta bancária presentes no OFX
  const extractGlobalTag = (tag) => {
    const regex = new RegExp(`<${tag}>([^<\\r\\n]+)`, 'i');
    const match = ofxText.match(regex);
    return match ? match[1].trim() : '';
  };

  const rawBankId = extractGlobalTag('BANKID');
  const rawAcctId = extractGlobalTag('ACCTID');
  const rawBalAmt = extractGlobalTag('BALAMT');
  const ledgerBalance = rawBalAmt
    ? parseFloat(rawBalAmt.replace(',', '.'))
    : null;

  const isCreditCardStatement =
    /<CREDITCARDMSGSRSV1>/i.test(ofxText) || /<CCSTMTRS>/i.test(ofxText);

  const blocks = ofxText.split(/<STMTTRN>/i).slice(1);
  const parsed = [];

  blocks.forEach((block, idx) => {
    const endIdx = block.search(/<\/STMTTRN>/i);
    const chunk = endIdx !== -1 ? block.slice(0, endIdx) : block;

    const getTag = (tag) => {
      const regex = new RegExp(`<${tag}>([^<\\r\\n]+)`, 'i');
      const match = chunk.match(regex);
      return match ? match[1].trim() : '';
    };

    const rawAmountStr = getTag('TRNAMT').replace(',', '.');
    const rawAmount = parseFloat(rawAmountStr);
    if (isNaN(rawAmount) || rawAmount === 0) return;

    const trnType = getTag('TRNTYPE');
    const fitId = getTag('FITID');
    const dtPosted = getTag('DTPOSTED');

    let dateStr = buildRelativeDate(0, Math.min(28, 5 + idx * 2));
    if (dtPosted && dtPosted.length >= 8) {
      const y = dtPosted.slice(0, 4);
      const m = dtPosted.slice(4, 6);
      const d = dtPosted.slice(6, 8);
      if (preserveRealDates && /^\d{4}$/.test(y) && /^\d{2}$/.test(m) && /^\d{2}$/.test(d)) {
        dateStr = `${y}-${m}-${d}`;
      } else {
        const currentMonthPrefix = buildRelativeDate(0, 1).slice(0, 7);
        dateStr = `${currentMonthPrefix}-${d}`;
      }
    }

    const memo = getTag('MEMO') || getTag('NAME') || 'Lançamento OFX';
    const type = rawAmount > 0 ? 'income' : 'expense';
    const absAmount = Math.abs(rawAmount);

    let paymentMethod =
      type === 'income' ? 'Pix' : inferPaymentMethodFromText(memo, trnType);
    if (isCreditCardStatement && type === 'expense' && paymentMethod === 'Cartão de Débito') {
      paymentMethod = 'Cartão de Crédito à Vista';
    }

    // Detecta parcelas no título ex: "Compra Loja 02/06" ou "(2/6)"
    let installmentCurrent = 1;
    let installmentTotal = 1;
    const instMatch = memo.match(/(?:\(|Parc(?:ela)?\s*)(\d{1,2})\s*[/de]+\s*(\d{1,2})\)?/i);
    if (instMatch) {
      installmentCurrent = parseInt(instMatch[1], 10) || 1;
      installmentTotal = parseInt(instMatch[2], 10) || 1;
      if (installmentTotal > 1) {
        paymentMethod = 'Cartão de Crédito Parcelado';
      }
    }

    const category = inferCategoryFromDescription(memo, type);

    parsed.push({
      id: fitId ? `ofx-${fitId}` : `ofx-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      externalId: fitId || null,
      userId,
      bankId: targetBankId,
      type,
      amount: Number(absAmount.toFixed(2)),
      description: memo,
      date: dateStr,
      category,
      status: isCreditCardStatement ? 'pending' : 'paid',
      paymentMethod,
      isFixed: lowerIncludesFixedKeyword(memo),
      installmentGroupId: null,
      installmentCurrent,
      installmentTotal
    });
  });

  // Para compatibilidade retroativa caso o chamador espere um array diretamente
  parsed.metadata = {
    bankId: rawBankId,
    accountNumber: rawAcctId,
    ledgerBalance: !isNaN(ledgerBalance) ? ledgerBalance : null,
    isCreditCardStatement
  };

  return parsed;
}

/**
 * Faz o parse de um arquivo .CSV REAL de extratos ou faturas bancárias:
 * Suporta:
 * - Nubank Conta Corrente (Data,Valor,Identificador,Descrição)
 * - Nubank Fatura Cartão (date,category,title,amount)
 * - Banco Inter (com linhas de cabeçalho de metadados antes de Data Lançamento;Histórico;Descrição;Valor;Saldo)
 * - Itaú, Bradesco, Santander, Banco do Brasil, C6 Bank e planilhas personalizadas.
 */
export function parseCSVStatement(csvText, targetBankId, userId, options = {}) {
  if (!csvText || typeof csvText !== 'string') return [];

  const preserveRealDates = options.preserveRealDates !== false;

  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return [];

  // Encontra automaticamente a linha real de cabeçalho (caso o banco coloque metadados nas primeiras linhas, como Banco Inter e Itaú)
  let headerLineIdx = 0;
  for (let i = 0; i < Math.min(15, lines.length); i++) {
    const l = lines[i].toLowerCase();
    if (
      (l.includes('data') || l.includes('date')) &&
      (l.includes('valor') || l.includes('amount') || l.includes('title') || l.includes('descri') || l.includes('hist'))
    ) {
      headerLineIdx = i;
      break;
    }
  }

  const headerLine = lines[headerLineIdx];
  const separator = headerLine.includes(';') ? ';' : ',';
  const headers = headerLine
    .split(separator)
    .map((h) => h.replace(/^"|"$/g, '').trim().toLowerCase());

  const dateIdx = headers.findIndex(
    (h) => h.includes('data') || h.includes('date') || h.includes('vencimento')
  );
  const descIdx = headers.findIndex(
    (h) =>
      h.includes('descri') ||
      h.includes('title') ||
      h.includes('titulo') ||
      h.includes('estabelecimento') ||
      h.includes('memo') ||
      h.includes('lançamento')
  );
  const histIdx = headers.findIndex(
    (h) => h.includes('historico') || h.includes('histórico')
  );
  const valIdx = headers.findIndex(
    (h) => h.includes('valor') || h.includes('amount') || h.includes('quantia')
  );
  const methodIdx = headers.findIndex(
    (h) => h.includes('forma') || h.includes('meio') || h.includes('metodo') || h.includes('tipo')
  );
  const catIdx = headers.findIndex(
    (h) => h.includes('categ') || h.includes('category')
  );

  // Detecta se é fatura de cartão do Nubank (colunas: date,category,title,amount onde valores positivos são gastos)
  const isNubankCreditCardCsv =
    headers.includes('date') && headers.includes('title') && headers.includes('amount');

  const parsed = [];
  const currentMonthPrefix = buildRelativeDate(0, 1).slice(0, 7);

  for (let i = headerLineIdx + 1; i < lines.length; i++) {
    const cols = lines[i]
      .split(separator)
      .map((c) => c.replace(/^"|"$/g, '').trim());
    if (cols.length < 2) continue;

    const rawDate = cols[dateIdx >= 0 ? dateIdx : 0] || '';
    let desc = cols[descIdx >= 0 ? descIdx : 1] || '';
    const hist = histIdx >= 0 ? cols[histIdx] : '';
    if (hist && desc && !desc.toLowerCase().includes(hist.toLowerCase())) {
      desc = `${hist} - ${desc}`;
    } else if (!desc && hist) {
      desc = hist;
    }
    if (!desc) desc = `Lançamento CSV #${i}`;

    const rawValStr = cols[valIdx >= 0 ? valIdx : cols.length - 1] || '0';
    const cleanValStr = rawValStr.replace(/[R$\s]/g, '');

    // Normaliza formato brasileiro (1.234,56) ou internacional (1234.56)
    let normalizedVal = cleanValStr;
    if (cleanValStr.includes(',') && cleanValStr.includes('.')) {
      if (cleanValStr.lastIndexOf(',') > cleanValStr.lastIndexOf('.')) {
        normalizedVal = cleanValStr.replace(/\./g, '').replace(',', '.');
      } else {
        normalizedVal = cleanValStr.replace(/,/g, '');
      }
    } else if (cleanValStr.includes(',')) {
      normalizedVal = cleanValStr.replace(',', '.');
    }

    const rawAmount = parseFloat(normalizedVal);
    if (isNaN(rawAmount) || rawAmount === 0) continue;

    let dateStr = `${currentMonthPrefix}-${String(Math.min(28, 4 + i)).padStart(2, '0')}`;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)) {
      const [d, m, y] = rawDate.split('/');
      dateStr = preserveRealDates ? `${y}-${m}-${d}` : `${currentMonthPrefix}-${d}`;
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      dateStr = preserveRealDates
        ? rawDate
        : `${currentMonthPrefix}-${rawDate.slice(8, 10)}`;
    }

    // Na fatura de cartão do Nubank, valores positivos são despesas e negativos são estornos/pagamentos
    const type = isNubankCreditCardCsv
      ? rawAmount > 0
        ? 'expense'
        : 'income'
      : rawAmount > 0
      ? 'income'
      : 'expense';

    const absAmount = Math.abs(rawAmount);
    const explicitMethod = methodIdx >= 0 ? cols[methodIdx] : '';
    const explicitCat = catIdx >= 0 ? cols[catIdx] : '';

    let paymentMethod =
      explicitMethod ||
      (isNubankCreditCardCsv
        ? inferPaymentMethodFromText(desc, 'CREDIT')
        : type === 'income'
        ? 'Pix'
        : inferPaymentMethodFromText(desc));

    const category =
      explicitCat && EXPENSE_CATEGORIES_MAP[explicitCat.toLowerCase()]
        ? EXPENSE_CATEGORIES_MAP[explicitCat.toLowerCase()]
        : explicitCat || inferCategoryFromDescription(desc, type);

    parsed.push({
      id: `csv-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      userId,
      bankId: targetBankId,
      type,
      amount: Number(absAmount.toFixed(2)),
      description: desc,
      date: dateStr,
      category,
      status: isNubankCreditCardCsv ? 'pending' : 'paid',
      paymentMethod,
      isFixed: lowerIncludesFixedKeyword(desc),
      installmentGroupId: null,
      installmentCurrent: 1,
      installmentTotal: 1
    });
  }

  return parsed;
}

const EXPENSE_CATEGORIES_MAP = {
  restaurante: 'Alimentação',
  supermercado: 'Alimentação',
  alimentação: 'Alimentação',
  transporte: 'Transporte',
  casa: 'Moradia',
  moradia: 'Moradia',
  saúde: 'Saúde',
  saude: 'Saúde',
  educação: 'Educação',
  educacao: 'Educação',
  lazer: 'Lazer',
  serviços: 'Assinaturas',
  assinaturas: 'Assinaturas'
};

function lowerIncludesFixedKeyword(text = '') {
  const l = text.toLowerCase();
  return (
    l.includes('aluguel') ||
    l.includes('condom') ||
    l.includes('assinatura') ||
    l.includes('internet') ||
    l.includes('vivo') ||
    l.includes('claro') ||
    l.includes('enel') ||
    l.includes('sabesp') ||
    l.includes('plano de saúde') ||
    l.includes('unimed') ||
    l.includes('mensalidade')
  );
}

/**
 * Decodificador Real de Linha Digitável de Boleto FEBRABAN (47/48 dígitos)
 * e Código Pix Copia e Cola (BRCode EMV 000201...).
 */
export function decodeRealBoletoOrPix(rawInput) {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) {
    return { valid: false, error: 'Cole uma linha digitável de boleto ou Pix Copia e Cola.' };
  }

  // 1. Pix Copia e Cola (EMV BRCode inicia com 000201)
  if (trimmed.startsWith('000201')) {
    let i = 0;
    const fields = {};
    while (i + 4 <= trimmed.length) {
      const tag = trimmed.slice(i, i + 2);
      const len = parseInt(trimmed.slice(i + 2, i + 4), 10);
      if (isNaN(len) || i + 4 + len > trimmed.length) break;
      fields[tag] = trimmed.slice(i + 4, i + 4 + len);
      i += 4 + len;
    }
    const amount = fields['54'] ? parseFloat(fields['54']) : 0;
    const merchant = fields['59'] || 'Recebedor Pix';
    return {
      valid: true,
      paymentMethod: 'Pix',
      amount: isNaN(amount) ? 0 : amount,
      dueDate: new Date().toISOString().slice(0, 10),
      description: `Pix — ${merchant}`,
      category: inferCategoryFromDescription(merchant, 'expense'),
      status: 'paid'
    };
  }

  const digits = trimmed.replace(/\D/g, '');

  // 2. Boleto Bancário FEBRABAN (47 dígitos linha digitável ou 44 código de barras)
  if (digits.length === 47 || digits.length === 44) {
    const bankCode = digits.slice(0, 3);
    const bankObj = BANCOS_CATALOGO.find((b) => b.code === bankCode);
    const bankLabel = bankObj ? bankObj.name : `Banco ${bankCode}`;

    const factorStr = digits.length === 47 ? digits.slice(33, 37) : digits.slice(5, 9);
    const valueStr = digits.length === 47 ? digits.slice(37, 47) : digits.slice(9, 19);

    const amount = parseInt(valueStr, 10) / 100;
    const factor = parseInt(factorStr, 10);
    let dueDate = new Date().toISOString().slice(0, 10);

    if (factor >= 1000 && factor <= 5500) {
      // Novo ciclo FEBRABAN pós 22/02/2025 (fator 1000 = 2025-02-22)
      const base2025 = new Date(Date.UTC(2025, 1, 22));
      base2025.setUTCDate(base2025.getUTCDate() + (factor - 1000));
      dueDate = base2025.toISOString().slice(0, 10);
    } else if (factor > 5500) {
      const base1997 = new Date(Date.UTC(1997, 9, 7));
      base1997.setUTCDate(base1997.getUTCDate() + factor);
      dueDate = base1997.toISOString().slice(0, 10);
    }

    return {
      valid: true,
      paymentMethod: 'Boleto',
      amount: amount > 0 ? amount : 0,
      dueDate,
      description: `Boleto ${bankLabel}`,
      category: 'Moradia',
      status: 'pending'
    };
  }

  // 3. Boleto Concessionária (Água, Luz, Gás, Internet, IPTU - 48 dígitos iniciando em 8)
  if (digits.length === 48 && digits.startsWith('8')) {
    const b1 = digits.slice(0, 11);
    const b2 = digits.slice(12, 23);
    const b3 = digits.slice(24, 35);
    const b4 = digits.slice(36, 47);
    const bar44 = b1 + b2 + b3 + b4;
    const amount = parseInt(bar44.slice(4, 15), 10) / 100;

    const segMap = {
      '1': 'IPTU / Prefeitura',
      '2': 'Conta de Água / Saneamento',
      '3': 'Conta de Energia Elétrica / Gás',
      '4': 'Internet / Telecomunicações'
    };
    const segName = segMap[bar44[1]] || 'Concessionária de Serviços';

    return {
      valid: true,
      paymentMethod: 'Boleto',
      amount: amount > 0 ? amount : 0,
      dueDate: new Date().toISOString().slice(0, 10),
      description: segName,
      category: 'Moradia',
      status: 'pending'
    };
  }

  return {
    valid: false,
    error: `Código com ${digits.length} dígitos não reconhecido. Use 47 dígitos (boleto bancário), 48 dígitos (água/luz/internet) ou Pix Copia e Cola.`
  };
}

/**
 * Gera conteúdo .OFX realista para teste imediato do importador.
 */
export function getSampleOFXContent() {
  const ym = buildRelativeDate(0, 1).slice(0, 7).replace('-', '');
  return `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:UTF-8
<OFX>
  <BANKMSGSRSV1>
    <STMTTRNRS>
      <STMTRS>
        <CURDEF>BRL
        <BANKACCTFROM>
          <BANKID>0260
          <ACCTID>849201-7
          <ACCTTYPE>CHECKING
        </BANKACCTFROM>
        <BANKTRANLIST>
          <STMTTRN>
            <TRNTYPE>CREDIT
            <DTPOSTED>${ym}07100000[-3:BRT]
            <TRNAMT>1250.00
            <FITID>OFX-${ym}-001
            <MEMO>Pix Recebido - Reembolso Projeto Consultoria
          </STMTTRN>
          <STMTTRN>
            <TRNTYPE>PAYMENT
            <DTPOSTED>${ym}09143000[-3:BRT]
            <TRNAMT>-168.50
            <FITID>OFX-${ym}-002
            <MEMO>Pix Enviado - Mercado Livre Compras Casa
          </STMTTRN>
          <STMTTRN>
            <TRNTYPE>DEBIT
            <DTPOSTED>${ym}11191500[-3:BRT]
            <TRNAMT>-142.90
            <FITID>OFX-${ym}-003
            <MEMO>Compra Debito - Posto Ipiranga Combustivel
          </STMTTRN>
          <STMTTRN>
            <TRNTYPE>PAYMENT
            <DTPOSTED>${ym}14080000[-3:BRT]
            <TRNAMT>-95.00
            <FITID>OFX-${ym}-004
            <MEMO>Boleto Pago - Sabesp Saneamento Agua
          </STMTTRN>
        </BANKTRANLIST>
      </STMTRS>
    </STMTTRNRS>
  </BANKMSGSRSV1>
</OFX>`;
}

/**
 * Gera conteúdo .CSV realista para teste imediato do importador.
 */
export function getSampleCSVContent() {
  const d1 = buildRelativeDate(0, 8);
  const d2 = buildRelativeDate(0, 11);
  const d3 = buildRelativeDate(0, 14);
  const d4 = buildRelativeDate(0, 17);
  return `Data;Descrição;Categoria;Forma de Pagamento;Valor
${d1};Pix Recebido Dividendos FIIs;Rendimentos / Dividendos;Pix;420,00
${d2};Supermercado Carrefour Bairro;Alimentação;Benefício;-315,40
${d3};Uber Viagens Corporativas;Transporte;Cartão de Crédito à Vista;-78,90
${d4};Farmácia Raia Vitaminas;Saúde;Cartão de Débito;-114,50`;
}
