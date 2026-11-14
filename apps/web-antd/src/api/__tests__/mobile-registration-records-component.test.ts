import { createApp, h } from 'vue';

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import MobileOrders from '../../views/mobile/orders.vue';

const api = vi.hoisted(() => ({
  list: vi.fn(),
  activities: vi.fn(),
  activity: vi.fn(),
  push: vi.fn(),
}));

vi.mock('#/api/customer-management', () => ({
  getRegistrations: api.list,
}));
vi.mock('#/api/management', () => ({
  getActivities: api.activities,
  getActivity: api.activity,
}));
vi.mock('@vben/icons', () => ({
  createIconifyIcon: () => ({ template: '<span />' }),
}));
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ push: api.push, replace: vi.fn() }),
}));

let unmount: (() => void) | undefined;
function mount() {
  const root = document.createElement('div');
  document.body.append(root);
  const app = createApp({ render: () => h(MobileOrders) });
  app.mount(root);
  unmount = () => app.unmount();
}
function button(label: string) {
  return [...document.querySelectorAll('button')].find(
    (item) => item.textContent?.replaceAll(/\s/g, '') === label,
  );
}

beforeEach(() => {
  api.list.mockReset();
  api.activities.mockResolvedValue({ items: [], total: 0 });
  api.activity.mockResolvedValue({});
  api.push.mockReset();
});

afterEach(() => {
  unmount?.();
  unmount = undefined;
  document.body.innerHTML = '';
});

it('uses registration states and hides payment follow-up for ordinary activities', async () => {
  api.list.mockResolvedValue({
    items: [
      {
        id: 'registration-a',
        orderId: 'order-a',
        orderNo: '202611140001',
        activityId: 'activity-a',
        customerId: 'customer-a',
        activityName: '亲子活动',
        customerName: '陈小雨',
        customerPhone: '13900139000',
        participation: 'free',
        status: 'registered',
        amountCent: 0,
        createdAt: '2026-11-14T01:00:00Z',
        registeredAt: '2026-11-14T01:10:00Z',
        salesName: '销售小王',
      },
    ],
    total: 1,
    page: 1,
    pageSize: 15,
    hasPaymentRecords: false,
    statusCounts: { pending: 0, registered: 1, pending_payment: 0 },
  });
  mount();
  await vi.waitFor(() =>
    expect(document.body.textContent).toContain('陈小雨'),
  );
  expect(button('待支付')).toBeUndefined();
  expect(document.body.textContent).toContain('已报名');
  expect(document.body.textContent).not.toContain('订单号');
  button('陈小雨›')?.click();
  expect(api.push).toHaveBeenCalledWith(
    expect.objectContaining({ path: '/m/orders/registration-a' }),
  );
});

it('offers unpaid follow-up only when the filtered scope has payment records', async () => {
  api.list.mockResolvedValue({
    items: [],
    total: 0,
    page: 1,
    pageSize: 15,
    hasPaymentRecords: true,
    statusCounts: { pending: 0, registered: 0, pending_payment: 0 },
  });
  mount();
  await vi.waitFor(() => expect(button('待支付')).toBeDefined());
  button('待支付')?.click();
  await vi.waitFor(() =>
    expect(api.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'pending_payment' }),
      expect.any(AbortSignal),
    ),
  );
});
