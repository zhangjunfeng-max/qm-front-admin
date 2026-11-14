import type { SetupContext } from 'vue';

import { createApp, h } from 'vue';

import { createPinia } from 'pinia';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import Registrations from '../../views/management/registrations.vue';

const api = vi.hoisted(() => ({
  customers: vi.fn(),
  registrations: vi.fn(),
  registration: vi.fn(),
  exportCsv: vi.fn(),
  push: vi.fn(),
  query: {} as Record<string, string>,
  params: {} as Record<string, string>,
}));
vi.mock('#/api/customer-management', () => ({
  getCustomers: api.customers,
  getRegistrations: api.registrations,
  getRegistration: api.registration,
  exportRegistrations: api.exportCsv,
}));
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: api.push, replace: vi.fn() }),
  useRoute: () => ({ query: api.query, params: api.params }),
}));
vi.mock('../../components/management/records-container.vue', () => ({
  default: {
    setup:
      (_: unknown, { slots }: SetupContext) =>
      () =>
        h('main', [slots.filters?.(), slots.default?.(), slots.dialogs?.()]),
  },
}));
const row = {
  id: 'registration-a',
  orderId: 'order-a',
  orderNo: '20261101080000000001',
  customerId: 'customer-a',
  activityId: 'activity-a',
  activityName: '摄影活动',
  customerName: '陈小雨',
  customerPhone: '13900139000',
  storeName: '春熙路门店',
  participation: 'free',
  status: 'registered',
  amountCent: 0,
  salesName: '销售小王',
  salesPhone: '13800138000',
  createdAt: '2026-11-01T00:00:00Z',
  orderCreatedAt: '2026-11-01T00:00:00Z',
  registeredAt: '2026-11-01T00:00:00Z',
};
let cleanup: (() => void) | undefined;
function mount(component: typeof Registrations) {
  const root = document.createElement('div');
  document.body.append(root);
  const app = createApp({ render: () => h(component) });
  app.use(createPinia());
  app.mount(root);
  cleanup = () => app.unmount();
}
function button(text: string) {
  const el = [...document.querySelectorAll('button')].find(
    (item) => item.textContent?.replaceAll(/\s/g, '') === text,
  );
  if (!el) throw new Error(`missing button: ${text}`);
  return el;
}
function tab(text: string) {
  const el = [...document.querySelectorAll<HTMLElement>('[role=tab]')].find(
    (item) =>
      item.textContent
        ?.trim()
        .replaceAll(/\s/g, '')
        .replace(/（\d+）$/, '') === text,
  );
  if (!el) throw new Error(`missing tab: ${text}`);
  return el;
}
beforeEach(() => {
  api.query = {};
  api.params = {};
  api.push.mockReset();
  api.customers.mockReset().mockResolvedValue({
    items: [
      {
        id: 'customer-a',
        displayName: '',
        phone: '13900139000',
        kind: 'wechat',
        orderCount: 0,
        createdAt: row.createdAt,
        lastRegistrationAt: null,
      },
    ],
    total: 1,
    page: 1,
    pageSize: 20,
  });
  api.registrations.mockReset().mockResolvedValue({
    hasPaymentRecords: false,
    items: [row],
    total: 1,
    page: 1,
    pageSize: 20,
  });
  api.registration.mockReset().mockResolvedValue({
    ...row,
    answers: [{ key: 'note', label: '拍摄偏好', value: '一家五口' }],
    paymentInfo: null,
    refundInfo: null,
  });
});
afterEach(() => {
  cleanup?.();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

it('filters registrations by customer and shows every saved answer', async () => {
  api.query = { customerId: 'customer-a' };
  mount(Registrations);
  await vi.waitFor(() =>
    expect(api.registrations).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: 'customer-a' }),
    ),
  );
  await vi.waitFor(() => expect(document.body.textContent).toContain('陈小雨'));
  expect(document.body.textContent).toContain('20261101080000000001');
  expect(document.body.textContent).not.toContain('registration-a');
  button('查看').click();
  await vi.waitFor(() =>
    expect(document.body.textContent).toContain('一家五口'),
  );
  expect(document.body.textContent).toContain('拍摄偏好');
  expect(document.body.textContent).toContain('春熙路门店');
  // 免费报名没有支付环节，界面不能出现任何支付/金额字样。
  expect(document.body.textContent).not.toContain('支付状态');
  expect(document.body.textContent).not.toContain('支付与退款');
  expect(document.body.textContent).not.toContain('订单金额');
});

it('ignores an old registration detail response after closing and reopening', async () => {
  let finish!: (data: unknown) => void;
  api.registration.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  mount(Registrations);
  await vi.waitFor(() => expect(document.body.textContent).toContain('陈小雨'));
  button('查看').click();
  await vi.waitFor(() => expect(api.registration).toHaveBeenCalledTimes(1));
  button('关闭').click();
  button('查看').click();
  await vi.waitFor(() =>
    expect(document.body.textContent).toContain('一家五口'),
  );
  finish({
    ...row,
    customerName: '不该出现的旧客户',
    answers: [],
    paymentInfo: null,
    refundInfo: null,
  });
  await Promise.resolve();
  await Promise.resolve();
  expect(document.body.textContent).not.toContain('不该出现的旧客户');
});

it('lists contact, fill time and registration time without any money column', async () => {
  mount(Registrations);
  await vi.waitFor(() => expect(document.body.textContent).toContain('陈小雨'));
  const headers = [...document.querySelectorAll('thead th')].map(
    (el) => el.textContent,
  );
  expect(headers.slice(0, 4)).toEqual([
    '报名人姓名',
    '报名人电话',
    '销售',
    '填写时间',
  ]);
  expect(headers).toContain('报名时间');
  expect(headers).toContain('报名编号');
  expect(headers).not.toContain('订单金额');
  expect(headers).not.toContain('订单创建时间');
  expect(headers).not.toContain('支付状态');
});

it('shows unsubmitted leads as pending and filters them without an order status', async () => {
  api.registrations.mockResolvedValue({
    hasPaymentRecords: false,
    items: [
      {
        ...row,
        orderId: '',
        orderNo: '',
        status: 'pending',
        registeredAt: null,
      },
    ],
    total: 1,
    page: 1,
    pageSize: 20,
    statusCounts: { pending: 1, registered: 0, pending_payment: 0 },
  });
  mount(Registrations);
  await vi.waitFor(() => expect(document.body.textContent).toContain('陈小雨'));
  expect(document.body.textContent).toContain('未提交');
  expect(document.querySelector('.registration-pending')).not.toBeNull();
  expect(document.body.textContent).toContain('全部（1）');
  tab('未提交').click();
  await vi.waitFor(() =>
    expect(api.registrations).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'pending', page: 1 }),
    ),
  );
});

it('only offers a pending-payment tab once a real payment record exists', async () => {
  api.registrations.mockResolvedValue({
    hasPaymentRecords: true,
    items: [
      {
        ...row,
        participation: 'group',
        status: 'pending_payment',
        amountCent: 9900,
        registeredAt: null,
      },
    ],
    total: 1,
    page: 1,
    pageSize: 20,
  });
  mount(Registrations);
  await vi.waitFor(() =>
    expect(document.body.textContent).toContain('销售小王'),
  );
  tab('待支付').click();
  await vi.waitFor(() =>
    expect(api.registrations).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'pending_payment', page: 1 }),
    ),
  );
});

it('uses server status totals across pages and offers dial and copy actions', async () => {
  api.registrations.mockResolvedValue({
    hasPaymentRecords: true,
    items: [row],
    total: 1,
    page: 1,
    pageSize: 20,
    statusCounts: { pending: 17, registered: 42, pending_payment: 9 },
  });
  mount(Registrations);
  await vi.waitFor(() =>
    expect(document.body.textContent).toContain('全部（68）'),
  );
  expect(document.body.textContent).toContain('已报名（42）');
  expect(document.body.textContent).toContain('待支付（9）');
  expect(document.querySelector('a[href="tel:13900139000"]')).not.toBeNull();
  const copy = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: copy },
  });
  button('复制').click();
  await vi.waitFor(() => expect(copy).toHaveBeenCalledWith('13900139000'));
});

it('keeps the activity entry scoped to the route activity', async () => {
  api.params = { id: 'activity-a' };
  api.query = { activityId: 'another-activity' };
  mount(Registrations);
  await vi.waitFor(() =>
    expect(api.registrations).toHaveBeenCalledWith(
      expect.objectContaining({ activityId: 'activity-a' }),
    ),
  );
});

it('opens a notification target using a fresh permitted registration detail request', async () => {
  api.params = { id: 'activity-a' };
  api.query = { detailId: 'delivery-target-a' };
  mount(Registrations);
  await vi.waitFor(() =>
    expect(api.registration).toHaveBeenCalledWith('delivery-target-a'),
  );
  await vi.waitFor(() =>
    expect(document.body.textContent).toContain('一家五口'),
  );
});

it('shows unavailable notification targets as a failed detail without exposing stale data', async () => {
  api.params = { id: 'activity-a' };
  api.query = { detailId: 'revoked-target' };
  api.registration.mockRejectedValueOnce(new Error('无权限'));
  mount(Registrations);
  await vi.waitFor(() =>
    expect(api.registration).toHaveBeenCalledWith('revoked-target'),
  );
  await vi.waitFor(() =>
    expect(document.body.textContent).toContain('报名记录加载失败'),
  );
  expect(document.body.textContent).not.toContain('一家五口');
});
