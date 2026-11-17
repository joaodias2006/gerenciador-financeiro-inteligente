import { BANCOS_CATALOGO, buildRelativeDate } from '../data/initialData.js';

/**
 * Serviço Modular de Integração Open Finance Brasil (Pluggy / Belvo)
 * e Importador Inteligente de Extratos Manuais (.OFX e .CSV).
 */

export class OpenFinanceBridge {
  constructor(config = {}) {
    this.provider = config.provider || 'pluggy'; // 'pluggy' | 'belvo'
    this.clientId = config.clientId || '';
    this.clientSecret = config.clientSecret || '';
    this.webhookUrl = config.webhookUrl || 'https://api.raioxfinanceiro.com.br/webhooks/open-finance';
  }

  isLiveCredentialsConfigured() {
    return Boolean(this.clientId && this.clientSecret);
  }

  getConnectionMetadata() {
    return {
      provider: this.provider === 'belvo' ? 'Belvo Open Finance API' : 'Pluggy Open Finance Brasil',
      environment: this.isLiveCredentialsConfigured() ? 'Produção (Chaves Ativas)' : 'Simulador Open Finance Ativo',
      protocolVersion: 'Open Finance Brasil Fase 2 & 3 ( Consentimento OAuth 2.0 + mTLS )',
      webhookUrl: this.webhookUrl
    };
  }
}

/**
 * Gera uma conta bancária realista + lançamentos simulados ao conectar
 * uma nova instituição financeira pelo Simulador Open Finance.
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
    connectionType: 'open_finance',
    lastSync: `Sincronizado às ${nowStr} via Open Finance`,
    status: 'Conectado'
  };

  // Cria 3 lançamentos realistas sincronizados automaticamente com a nova conta
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
    },
    {
      id: `tx-of-${Date.now()}-3`,
      userId,
      bankId,
      type: 'expense',
      amount: 340.0,
      description: `Fatura / Seguro Conta (${catalogItem.shortName})`,
      date: buildRelativeDate(0, catalogItem.dueDay || 25),
      category: 'Assinaturas',
      status: 'pending',
      paymentMethod: 'Cartão de Crédito à Vista',
      isFixed: true,
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
    if (lower.includes('salário') || lower.includes('salario') || lower.includes('folha') || lower.includes('remunera')) {
      return 'Salário';
    }
    if (lower.includes('cdi') || lower.includes('rendimento') || lower.includes('dividendo') || lower.includes('fii')) {
      return 'Rendimentos / Dividendos';
    }
    return 'Freelance / Projetos';
  }

  if (
    lower.includes('aluguel') ||
    lower.includes('condom') ||
    lower.includes('enel') ||
    lower.includes('energia') ||
    lower.includes('luz') ||
    lower.includes('sabesp') ||
    lower.includes('água') ||
    lower.includes('vivo') ||
    lower.includes('claro') ||
    lower.includes('internet') ||
    lower.includes('iptu')
  ) {
    return 'Moradia';
  }
  if (
    lower.includes('supermercado') ||
    lower.includes('mercado') ||
    lower.includes('atacad') ||
    lower.includes('ifood') ||
    lower.includes('restaurante') ||
    lower.includes('padaria') ||
    lower.includes('feira') ||
    lower.includes('pão de açúcar') ||
    lower.includes('carrefour')
  ) {
    return 'Alimentação';
  }
  if (
    lower.includes('uber') ||
    lower.includes('99') ||
    lower.includes('posto') ||
    lower.includes('shell') ||
    lower.includes('ipiranga') ||
    lower.includes('combust') ||
    lower.includes('pedágio') ||
    lower.includes('estacionamento') ||
    lower.includes('seguro auto')
  ) {
    return 'Transporte';
  }
  if (
    lower.includes('farmácia') ||
    lower.includes('drogasil') ||
    lower.includes('droga') ||
    lower.includes('unimed') ||
    lower.includes('saúde') ||
    lower.includes('médico') ||
    lower.includes('exame') ||
    lower.includes('smart fit') ||
    lower.includes('academia')
  ) {
    return 'Saúde';
  }
  if (
    lower.includes('faculdade') ||
    lower.includes('curso') ||
    lower.includes('pós') ||
    lower.includes('escola') ||
    lower.includes('livro') ||
    lower.includes('alura') ||
    lower.includes('udemy')
  ) {
    return 'Educação';
  }
  if (
    lower.includes('netflix') ||
    lower.includes('spotify') ||
    lower.includes('amazon') ||
    lower.includes('icloud') ||
    lower.includes('assinatura') ||
    lower.includes('github') ||
    lower.includes('aws')
  ) {
    return 'Assinaturas';
  }
  if (
    lower.includes('cinema') ||
    lower.includes('viagem') ||
    lower.includes('hotel') ||
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
  if (lower.includes('parcela') || /\(\d+\/\d+\)/.test(lower) || /\d+\s*de\s*\d+/.test(lower)) {
    return 'Cartão de Crédito Parcelado';
  }
  if (lower.includes('crédito') || lower.includes('credito') || lower.includes('credit')) {
    return 'Cartão de Crédito à Vista';
  }
  if (lower.includes('boleto') || lower.includes('dda') || lower.includes('fatura') || lower.includes('enel') || lower.includes('condom')) {
    return 'Boleto';
  }
  if (lower.includes('vr') || lower.includes('va') || lower.includes('alelo') || lower.includes('pluxee') || lower.includes('flash') || lower.includes('benefício')) {
    return 'Benefício';
  }
  if (lower.includes('ted') || lower.includes('doc') || lower.includes('transf')) {
    return 'Transferência';
  }
  return 'Cartão de Débito';
}

/**
 * Faz o parse de conteúdo de extrato bancário .OFX (Open Financial Exchange 1.x / 2.x).
 */
export function parseOFXStatement(ofxText, targetBankId, userId) {
  if (!ofxText || typeof ofxText !== 'string') return [];

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
    const dtPosted = getTag('DTPOSTED');
    let dateStr = buildRelativeDate(0, Math.min(28, 5 + idx * 2));
    if (dtPosted && dtPosted.length >= 8) {
      const y = dtPosted.slice(0, 4);
      const m = dtPosted.slice(4, 6);
      const d = dtPosted.slice(6, 8);
      // Mantém o dia do OFX mas ajusta para o ano-mês atual se o arquivo de exemplo for antigo
      const currentMonthPrefix = buildRelativeDate(0, 1).slice(0, 7);
      dateStr = `${currentMonthPrefix}-${d}`;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        dateStr = `${y}-${m}-${d}`;
      }
    }

    const memo = getTag('MEMO') || getTag('NAME') || 'Lançamento Importado OFX';
    const type = rawAmount > 0 ? 'income' : 'expense';
    const absAmount = Math.abs(rawAmount);
    const paymentMethod = type === 'income' ? 'Pix' : inferPaymentMethodFromText(memo, trnType);
    const category = inferCategoryFromDescription(memo, type);

    parsed.push({
      id: `ofx-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      userId,
      bankId: targetBankId,
      type,
      amount: Number(absAmount.toFixed(2)),
      description: memo,
      date: dateStr,
      category,
      status: 'paid',
      paymentMethod,
      isFixed: lowerIncludesFixedKeyword(memo),
      installmentGroupId: null,
      installmentCurrent: 1,
      installmentTotal: 1
    });
  });

  return parsed;
}

/**
 * Faz o parse de conteúdo .CSV de extratos bancários (Nubank, Itaú, Inter, Bradesco, etc.).
 */
export function parseCSVStatement(csvText, targetBankId, userId) {
  if (!csvText || typeof csvText !== 'string') return [];

  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return [];

  const separator = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(separator).map((h) => h.replace(/^"|"$/g, '').trim().toLowerCase());

  const dateIdx = headers.findIndex((h) => h.includes('data') || h.includes('date') || h.includes('vencimento'));
  const descIdx = headers.findIndex(
    (h) => h.includes('descri') || h.includes('historico') || h.includes('histórico') || h.includes('memo') || h.includes('titulo') || h.includes('estabelecimento')
  );
  const valIdx = headers.findIndex((h) => h.includes('valor') || h.includes('amount') || h.includes('quantia'));
  const methodIdx = headers.findIndex((h) => h.includes('forma') || h.includes('meio') || h.includes('metodo') || h.includes('tipo'));
  const catIdx = headers.findIndex((h) => h.includes('categ'));

  const parsed = [];
  const currentMonthPrefix = buildRelativeDate(0, 1).slice(0, 7);

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(separator).map((c) => c.replace(/^"|"$/g, '').trim());
    if (cols.length < 2) continue;

    const rawDate = cols[dateIdx >= 0 ? dateIdx : 0] || '';
    const desc = cols[descIdx >= 0 ? descIdx : 1] || `Lançamento CSV #${i}`;
    const rawValStr = cols[valIdx >= 0 ? valIdx : cols.length - 1] || '0';

    const cleanValStr = rawValStr.replace(/[R$\s]/g, '');
    const normalizedVal =
      cleanValStr.includes(',') && cleanValStr.includes('.')
        ? cleanValStr.replace(/\./g, '').replace(',', '.')
        : cleanValStr.replace(',', '.');

    const rawAmount = parseFloat(normalizedVal);
    if (isNaN(rawAmount) || rawAmount === 0) continue;

    let dateStr = `${currentMonthPrefix}-${String(Math.min(28, 4 + i * 2)).padStart(2, '0')}`;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)) {
      const [d] = rawDate.split('/');
      dateStr = `${currentMonthPrefix}-${d}`;
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      const d = rawDate.slice(8, 10);
      dateStr = `${currentMonthPrefix}-${d}`;
    }

    const type = rawAmount > 0 ? 'income' : 'expense';
    const absAmount = Math.abs(rawAmount);
    const explicitMethod = methodIdx >= 0 ? cols[methodIdx] : '';
    const explicitCat = catIdx >= 0 ? cols[catIdx] : '';

    const paymentMethod =
      explicitMethod || (type === 'income' ? 'Pix' : inferPaymentMethodFromText(desc));
    const category =
      explicitCat || inferCategoryFromDescription(desc, type);

    parsed.push({
      id: `csv-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      userId,
      bankId: targetBankId,
      type,
      amount: Number(absAmount.toFixed(2)),
      description: desc,
      date: dateStr,
      category,
      status: 'paid',
      paymentMethod,
      isFixed: lowerIncludesFixedKeyword(desc),
      installmentGroupId: null,
      installmentCurrent: 1,
      installmentTotal: 1
    });
  }

  return parsed;
}

function lowerIncludesFixedKeyword(text = '') {
  const l = text.toLowerCase();
  return (
    l.includes('aluguel') ||
    l.includes('condom') ||
    l.includes('assinatura') ||
    l.includes('internet') ||
    l.includes('plano de saúde') ||
    l.includes('mensalidade')
  );
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
