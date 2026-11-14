import type { Registration } from '#/api/customer-management';
export { count, money } from '#/views/home/format';
export function dateTime(value: null | string | undefined) {
  return value
    ? new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Shanghai',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date(value))
    : '—';
}
export function statusLabel(
  row: Pick<Registration, 'participation' | 'status'>,
) {
  return row.status === 'pending'
    ? '待报名'
    : row.status === 'pending_payment'
      ? '待支付'
      : row.participation === 'free'
        ? '已报名'
        : '已支付';
}
export function dial(phone: string) {
  return /^1[3-9]\d{9}$/.test(phone) || /^0[\d-]{6,14}$/.test(phone)
    ? `tel:${phone}`
    : undefined;
}
