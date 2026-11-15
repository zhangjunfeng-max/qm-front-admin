import type { NotificationScope } from '#/api/notifications';

const labels: Record<string, string> = {
  activity_changed: '活动修改',
  activity_review_decided: '审核结果',
  activity_review_requested: '活动待审核',
  activity_staff_decided: '申请结果',
  activity_staff_requested: '员工申请',
  company_announcement: '公司公告',
  customer_lead_created: '客户线索',
  customer_order_created: '活动报名',
  platform_announcement: '平台公告',
};

const companyKinds = [
  'customer_lead_created',
  'customer_order_created',
  'activity_staff_requested',
  'activity_staff_decided',
  'activity_review_decided',
  'company_announcement',
  'platform_announcement',
];

const platformKinds = [
  'activity_review_requested',
  'activity_changed',
  'platform_announcement',
];

export function notificationTypeLabel(kind: string) {
  return labels[kind] ?? '其他通知';
}

export function notificationTypeColor(kind: string) {
  if (kind === 'customer_order_created') return 'success';
  if (kind === 'customer_lead_created') return 'processing';
  if (kind === 'activity_review_requested') return 'warning';
  if (kind === 'activity_review_decided') {
    return 'success';
  }
  if (
    kind === 'activity_changed' ||
    kind === 'activity_staff_requested'
  ) {
    return 'gold';
  }
  if (
    kind === 'company_announcement' ||
    kind === 'platform_announcement'
  ) {
    return 'blue';
  }
  return undefined;
}

export function notificationTypeOptions(scope: NotificationScope) {
  const kinds = scope === 'platform' ? platformKinds : companyKinds;
  return [
    { label: '全部类型', value: 'all' },
    ...kinds.map((value) => ({
      label: notificationTypeLabel(value),
      value,
    })),
  ];
}
