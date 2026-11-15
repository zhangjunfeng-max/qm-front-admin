const numberFormatter = new Intl.NumberFormat('zh-CN');
const moneyFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
});
const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function count(value: null | number | undefined) {
  return value === null || value === undefined
    ? '—'
    : numberFormatter.format(value);
}
export function money(value: null | number | undefined) {
  return value === null || value === undefined
    ? '—'
    : moneyFormatter.format(value / 100);
}
export function dateTime(value: null | string | undefined) {
  return value ? dateTimeFormatter.format(new Date(value)) : '—';
}
