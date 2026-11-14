/* eslint-disable vue/one-component-per-file -- Tests mount two isolated panel scenarios. */
import { createApp, h, reactive } from 'vue';

import { afterEach, expect, it, vi } from 'vitest';

import PerformancePanel from '../../components/performance/performance-panel.vue';
const mock = vi.hoisted(() => ({ get: vi.fn() }));
const auth = reactive({
  currentTenant: { id: 'a' },
  switchingTenant: false,
  reloadingContext: false,
});
vi.mock('@vben/icons', () => ({
  createIconifyIcon: () => ({ render: () => null }),
}));
vi.mock('#/store', () => ({ useAuthStore: () => auth }));
vi.mock('@vben/stores', () => ({
  useUserStore: () => ({ userInfo: { userId: 'u', roles: ['member'] } }),
}));
vi.mock('#/api/performance', () => ({ getPerformanceBoard: mock.get }));
const stat = {
  registrations: 0,
  collectedCent: 0,
  paidOrders: 0,
  refundedCent: 0,
  netCent: 0,
};
const row = {
  ...stat,
  id: 'u',
  name: '零业绩员工',
  rank: 1,
  historical: false,
  activityName: '',
  activityId: '',
};
let unmount: (() => void) | undefined;
afterEach(() => {
  unmount?.();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});
it('shows zero-contribution staff and groups, totals and my standing without awarding a zero champion', async () => {
  mock.get.mockResolvedValue({
    generatedAt: '2026-11-04T00:00:00Z',
    month: '2026-11',
    scope: 'all',
    metric: 'revenue',
    summary: stat,
    unassigned: stat,
    ungrouped: { ...row, id: 'ungrouped', members: [] },
    employees: [row],
    groups: [
      {
        ...row,
        id: 'g',
        name: '零业绩小组',
        activityName: '双十一活动',
        members: [row],
      },
    ],
    mine: row,
    cursor: '0',
    events: [],
  });
  const root = document.createElement('div');
  document.body.append(root);
  const app = createApp({ render: () => h(PerformancePanel) });
  app.mount(root);
  unmount = () => app.unmount();
  await vi.waitFor(() => expect(root.textContent).toContain('零业绩员工'));
  expect(root.textContent).toContain('零业绩小组');
  expect(root.textContent).toContain('双十一活动');
  expect(root.textContent).toContain('我的排名');
  expect(root.textContent).toContain('员工合计');
  expect(root.querySelector('.ranking-medal')).toBeNull();
  const expander = root.querySelector(
    '.ant-table-row-expand-icon',
  ) as HTMLElement;
  expander?.click();
  await vi.waitFor(() =>
    expect(root.querySelectorAll('.ranking-mine').length).toBeGreaterThan(1),
  );
});

it('keeps zero-contribution people beyond the first ten accessible', async () => {
  const rows = Array.from({ length: 12 }, (_, i) => ({
    ...row,
    id: `employee-${i}`,
    name: `完整名单员工${i + 1}`,
  }));
  mock.get.mockResolvedValue({
    generatedAt: '2026-11-04T00:00:00Z',
    month: '2026-11',
    scope: 'all',
    metric: 'registrations',
    summary: stat,
    unassigned: stat,
    ungrouped: { ...row, id: 'ungrouped', members: [] },
    employees: rows,
    groups: [],
    mine: null,
    cursor: '0',
    events: [],
  });
  const root = document.createElement('div');
  document.body.append(root);
  const app = createApp({ render: () => h(PerformancePanel) });
  app.mount(root);
  unmount = () => app.unmount();
  await vi.waitFor(() => expect(root.textContent).toContain('完整名单员工10'));
  expect(root.textContent).not.toContain('完整名单员工12');
  const all = [...root.querySelectorAll('button')].find((b) =>
    b.textContent?.includes('查看全部'),
  )!;
  all.click();
  await vi.waitFor(() =>
    expect(document.body.textContent).toContain('完整名单员工12'),
  );
});
