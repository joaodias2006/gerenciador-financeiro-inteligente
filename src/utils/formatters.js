const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export function formatBRL(value, privacyMode = false) {
  if (privacyMode) {
    return 'R$ ••••••';
  }
  const num = Number(value || 0);
  return brlFormatter.format(num);
}

export function formatCompactBRL(value, privacyMode = false) {
  if (privacyMode) return 'R$ •••';
  const num = Number(value || 0);
  if (Math.abs(num) >= 1000) {
    return `R$ ${(num / 1000).toLocaleString('pt-BR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    })}k`;
  }
  return brlFormatter.format(num);
}

export function formatDateBR(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '—';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function formatMonthYearLabel(monthKey) {
  if (!monthKey || !monthKey.includes('-')) return monthKey;
  const [y, m] = monthKey.split('-').map(Number);
  const monthNames = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro'
  ];
  return `${monthNames[(m - 1) % 12]} de ${y}`;
}

export function getSelectableMonths(centerMonthKey) {
  const [y, m] = (centerMonthKey || '2026-11').split('-').map(Number);
  const result = [];
  for (let offset = -2; offset <= 5; offset++) {
    const d = new Date(y, m - 1 + offset, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    result.push({
      key,
      label: formatMonthYearLabel(key),
      isCurrent: offset === 0,
      isNext: offset === 1
    });
  }
  return result;
}
