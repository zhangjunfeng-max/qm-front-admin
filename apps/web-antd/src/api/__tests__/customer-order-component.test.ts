import type { SetupContext } from 'vue';

import { createApp, h } from 'vue';

import { createPinia } from 'pinia';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import Customers from '../../views/management/customers.vue';
import Orders from '../../views/management/orders.vue';

const api = vi.hoisted(() => ({
  customers: vi.fn(),
  orders: vi.fn(),
  order: vi.fn(),
  queryRefund: vi.fn(),
  requestRefund: vi.fn(),
  retryRefund: vi.fn(),
  push: vi.fn(),
  query: {} as Record<string, string>,
  params: {} as Record<string, string>,
}));
vi.mock('#/api/customer-management', () => ({
  getCustomers: api.customers,
  getOrders: api.orders,
  getOrder: api.order,
  queryRefund: api.queryRefund,
  requestOrderRefund: api.requestRefund,
  retryRefund: api.retryRefund,
}));
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: api.push, replace: vi.fn() }),
  useRoute: () => ({ query: api.query, params: api.params }),
}));
vi.mock('../../components/management/list-shell.vue', () => ({
  default: {
    setup:
      (_: unknown, { slots }: SetupContext) =>
      () =>
        h('main', [slots.filters?.(), slots.default?.(), slots.dialogs?.()]),
  },
}));
const row = {
  id: 'order-a',
  orderNo: '20261101080000000001',
  customerId: 'customer-a',
  activityId: 'activity-a',
  activityName: '摄影活动',
  customerName: '陈小雨',
  customerPhone: '13900139000',
  storeName: '春熙路门店',
  participation: 'free',
  status: 'confirmed',
  amountCent: 0,
  salesName: '销售小王',
  salesPhone: '13800138000',
  registeredAt: '2026-11-01T00:00:00Z',
  createdAt: '2026-11-01T00:00:00Z',
};
let cleanup: (() => void) | undefined;
function mount(component: typeof Customers | typeof Orders) {
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
  api.orders
    .mockReset()
    .mockResolvedValue({ items: [row], total: 1, page: 1, pageSize: 20 });
  api.order.mockReset().mockResolvedValue({
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
it('shows login-only customers and navigates to their registration records', async () => {
  mount(Customers);
  await vi.waitFor(() =>
    expect(document.body.textContent).toContain('13900139000'),
  );
  expect(document.body.textContent).toContain('未填写姓名');
  expect(document.body.textContent).toContain('微信');
  button('查看记录').click();
  expect(api.push).toHaveBeenCalledWith({
    path: '/registrations',
    query: { customerId: 'customer-a' },
  });
});
it('filters orders by the selected customer and shows all saved answers', async () => {
  api.query = { customerId: 'customer-a' };
  mount(Orders);
  await vi.waitFor(() =>
    expect(api.orders).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: 'customer-a' }),
    ),
  );
  await vi.waitFor(() => expect(document.body.textContent).toContain('陈小雨'));
  expect(document.body.textContent).toContain('20261101080000000001');
  expect(document.body.textContent).not.toContain('order-a');
  button('查看').click();
  await vi.waitFor(() =>
    expect(document.body.textContent).toContain('一家五口'),
  );
  expect(document.body.textContent).toContain('拍摄偏好');
  expect(document.body.textContent).toContain('春熙路门店');
  expect(document.body.textContent).toContain('无需支付');
});
it('ignores an old order detail response after closing and reopening', async () => {
  let finish!: (data: unknown) => void;
  api.order.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  mount(Orders);
  await vi.waitFor(() => expect(document.body.textContent).toContain('陈小雨'));
  button('查看').click();
  await vi.waitFor(() => expect(api.order).toHaveBeenCalledTimes(1));
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

it('puts payment, contact and sales first and highlights unpaid follow-up', async () => {
  api.orders.mockResolvedValue({
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
  mount(Orders);
  await vi.waitFor(() =>
    expect(document.body.textContent).toContain('销售小王'),
  );
  const headers = [...document.querySelectorAll('thead th')].map(
    (el) => el.textContent,
  );
  expect(headers.slice(0, 4)).toEqual([
    '支付状态',
    '报名人姓名',
    '报名人电话',
    '销售',
  ]);
  expect(headers).toContain('订单创建时间');
  expect(headers).toContain('报名时间');
  expect(document.querySelector('.order-unpaid')).not.toBeNull();
  expect(document.body.textContent).toContain('未完成报名');
  button('待支付').click();
  await vi.waitFor(() =>
    expect(api.orders).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'pending_payment', page: 1 }),
    ),
  );
});

it('shows customer contact and unpaid orders for immediate follow-up', async () => {
  api.customers.mockResolvedValue({
    items: [
      {
        id: 'customer-a',
        displayName: '陈小雨',
        phone: '',
        customerPhone: '13900139000',
        salesName: '销售小王',
        orderCount: 2,
        pendingOrderCount: 1,
        activityName: '摄影活动',
        createdAt: row.createdAt,
        lastOrderAt: row.createdAt,
        lastRegistrationAt: null,
        kind: 'wechat',
      },
    ],
    total: 1,
    page: 1,
    pageSize: 20,
  });
  mount(Customers);
  await vi.waitFor(() =>
    expect(document.body.textContent).toContain('销售小王'),
  );
  expect(document.body.textContent).toContain('13900139000');
  button('1人待支付').click();
  expect(api.push).toHaveBeenCalledWith({
    path: '/registrations',
    query: { customerId: 'customer-a', status: 'pending_payment' },
  });
});

it('initializes unpaid filters from customer follow-up navigation', async () => {
  api.query = { customerId: 'customer-a', status: 'pending_payment' };
  mount(Orders);
  await vi.waitFor(() =>
    expect(api.orders).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 'customer-a',
        status: 'pending_payment',
      }),
    ),
  );
});

it('keeps the activity entry scoped and displays saved contacts without an order', async () => {
  api.params = { id: 'activity-a' };
  api.query = { activityId: 'another-activity' };
  api.orders.mockResolvedValue({
    items: [
      {
        ...row,
        orderNo: '',
        status: 'pending_registration',
        registeredAt: null,
        contactSavedAt: row.createdAt,
      },
    ],
    total: 1,
    page: 1,
    pageSize: 20,
  });
  mount(Orders);
  await vi.waitFor(() =>
    expect(api.orders).toHaveBeenCalledWith(
      expect.objectContaining({ activityId: 'activity-a' }),
    ),
  );
  await vi.waitFor(() => expect(document.body.textContent).toContain('待报名'));
  expect(document.body.textContent).toContain('未创建订单');
  expect(document.body.textContent).not.toContain('¥0.00');
});

it('retains anonymous customer profiles and links directly to pending registrations', async () => {
  api.customers.mockResolvedValue({
    items: [
      {
        id: 'profile-a',
        displayName: '留资客户',
        phone: '13900139000',
        kind: 'lead',
        orderCount: 0,
        pendingOrderCount: 0,
        pendingRegistrationCount: 1,
        createdAt: row.createdAt,
        lastContactAt: row.createdAt,
        salesName: '销售小王',
        activityName: '摄影活动',
      },
    ],
    total: 1,
    page: 1,
    pageSize: 20,
  });
  mount(Customers);
  await vi.waitFor(() =>
    expect(document.body.textContent).toContain('留资客户'),
  );
  expect(document.body.textContent).toContain('未登录留资');
  expect(document.body.textContent).toContain('建档时间');
  expect(document.body.textContent).not.toContain('首次登录');
  button('1人次待报名').click();
  expect(api.push).toHaveBeenCalledWith({
    path: '/registrations',
    query: { customerId: 'profile-a', status: 'pending' },
  });
});

it('opens a notification target using a fresh permitted order detail request', async () => {
  api.params = { id: 'activity-a' };
  api.query = { detailId: 'delivery-target-a' };
  mount(Orders);
  await vi.waitFor(() => expect(api.order).toHaveBeenCalledWith('delivery-target-a'));
  await vi.waitFor(() => expect(document.body.textContent).toContain('一家五口'));
});

it('shows unavailable notification targets as a failed detail without exposing stale data', async () => {
  api.params = { id: 'activity-a' };
  api.query = { detailId: 'revoked-target' };
  api.order.mockRejectedValueOnce(new Error('无权限'));
  mount(Orders);
  await vi.waitFor(() => expect(api.order).toHaveBeenCalledWith('revoked-target'));
  await vi.waitFor(() => expect(document.body.textContent).toContain('加载失败'));
  expect(document.body.textContent).not.toContain('一家五口');
});
