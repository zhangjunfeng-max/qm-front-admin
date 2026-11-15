import type { NotificationScope } from '#/api/notifications';

const notificationTypes = [
  {
    kind: 'activity_changed',
    label: '活动修改',
    color: 'gold',
    scopes: ['platform'],
  },
  {
    kind: 'activity_review_decided',
    label: '审核结果',
    color: 'success',
    scopes: ['admin'],
  },
  {
    kind: 'activity_review_requested',
    label: '活动待审核',
    color: 'warning',
    scopes: ['platform'],
  },
  {
    kind: 'activity_staff_decided',
    label: '申请结果',
    color: undefined,
    scopes: ['admin'],
  },
  {
    kind: 'activity_staff_requested',
    label: '员工申请',
    color: 'gold',
    scopes: ['admin'],
  },
  {
    kind: 'company_announcement',
    label: '公司公告',
    color: 'blue',
    scopes: ['admin'],
  },
  {
    kind: 'customer_lead_created',
    label: '客户线索',
    color: 'processing',
    scopes: ['admin'],
  },
  {
    kind: 'customer_order_created',
    label: '活动报名',
    color: 'success',
    scopes: ['admin'],
  },
  {
    kind: 'platform_announcement',
    label: '平台公告',
    color: 'blue',
    scopes: ['admin', 'platform'],
  },
];

export function notificationTypeLabel(kind: string) {
  return (
    notificationTypes.find((item) => item.kind === kind)?.label ?? '其他通知'
  );
}

export function notificationTypeColor(kind: string) {
  return notificationTypes.find((item) => item.kind === kind)?.color;
}

export function notificationTypeOptions(scope: NotificationScope) {
  return [
    { label: '全部类型', value: 'all' },
    ...notificationTypes
      .filter((item) =>
        (item.scopes as readonly NotificationScope[]).includes(scope),
      )
      .map((item) => ({ label: item.label, value: item.kind })),
  ];
}
