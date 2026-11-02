const numberFormatter = new Intl.NumberFormat('zh-CN');
const moneyFormatter = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' });

export function count(value: null | number | undefined) {
  return value == null ? '—' : numberFormatter.format(value);
}
export function money(value: null | number | undefined) {
  return value == null ? '—' : moneyFormatter.format(value / 100);
}
