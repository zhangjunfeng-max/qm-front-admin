import type { Registration } from '#/api/customer-management';
export { count, dateTime, money } from '#/views/home/format';
export function statusLabel(
  row: Pick<Registration, 'participation' | 'status'>,
) {
  if (row.status === 'pending') return '待报名';
  if (row.status === 'pending_payment') return '待支付';
  return row.participation === 'free' ? '已报名' : '已支付';
}
export function dial(phone: string) {
  return /^1[3-9]\d{9}$/.test(phone) || /^0[\d-]{6,14}$/.test(phone)
    ? `tel:${phone}`
    : undefined;
}
