import type { SetupContext } from 'vue';

import { createApp, h, nextTick, reactive } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Home from '../../views/home/index.vue';
import { invalidateContext } from '../context-lifecycle';

const api = vi.hoisted(() => ({ overview: vi.fn(), push: vi.fn() }));
const stores = reactive({
  auth: {
    currentTenant: { id: 'a', name: '第一公司' },
    switchingTenant: false,
    reloadingContext: false,
  },
  user: { userInfo: { userId: 'user-a', roles: ['admin'] } },
});
vi.mock('#/components/performance/performance-panel.vue', () => ({
  default: { template: '<section>独立业绩排行榜</section>' },
}));
vi.mock('#/api/company-overview', () => ({
  getCompanyOverviewApi: api.overview,
}));
vi.mock('#/store', () => ({ useAuthStore: () => stores.auth }));
vi.mock('@vben/stores', () => ({ useUserStore: () => stores.user }));
vi.mock('vue-router', () => ({ useRouter: () => ({ push: api.push }) }));
vi.mock('@vben/common-ui', () => ({
  Page: {
    setup:
      (_: unknown, { slots }: SetupContext) =>
      () =>
        h('main', [slots.extra?.(), slots.default?.()]),
  },
}));
vi.mock('#/components/management/company-profile.vue', () => ({
  default: { template: '<div>公司资料编辑表单</div>' },
}));

function response(manager = true) {
  return {
    generatedAt: '2026-11-01T00:30:00Z',
    month: '2026-11',
    manager,
    personal: { registrations: 1, paidOrders: 1, netRevenueCent: 5000 },
    joinedActivities: 2,
    summary: {
      netRevenueCent: 9900,
      collectedCent: 19800,
      refundedCent: 9900,
      paidOrders: 2,
      refundedOrders: 1,
      registrations: 3,
      newContacts: 4,
      pendingPayment: 5,
      pendingRegistration: 6,
      activities: 7,
      runningActivities: 2,
      views: 100,
    },
    employees: [
      {
        id: 'e1',
        name: '本公司销售甲',
        activityName: '',
        netRevenueCent: 9900,
        paidOrders: 1,
        registrations: 2,
      },
    ],
    groups: [
      {
        id: 'g1',
        name: '销售一组',
        activityName: '摄影活动',
        netRevenueCent: 9900,
        paidOrders: 1,
        registrations: 2,
      },
    ],
  };
}
let cleanup: (() => void) | undefined;
function mount() {
  const root = document.createElement('div');
  document.body.append(root);
  const app = createApp({ render: () => h(Home) });
  app.mount(root);
  cleanup = () => app.unmount();
  return root;
}
function click(label: string) {
  const button = [...document.querySelectorAll('button')].find(
    (b) => b.textContent?.replaceAll(/\s/g, '') === label,
  );
  expect(button, label).toBeDefined();
  button!.click();
}
beforeEach(() => {
  stores.auth.currentTenant = { id: 'a', name: '第一公司' };
  stores.auth.switchingTenant = false;
  stores.user.userInfo = { userId: 'user-a', roles: ['admin'] };
  api.overview.mockReset().mockResolvedValue(response());
  api.push.mockReset();
  invalidateContext();
});
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('company homepage', () => {
  it('consolidates six metrics, rankings and shortcuts, with profile editing on demand', async () => {
    const root = mount();
    await vi.waitFor(() => expect(root.textContent).toContain('待支付 5'));
    expect(root.querySelectorAll('[data-metric]')).toHaveLength(6);
    expect(root.textContent).toContain('本月净收入');
    expect(root.textContent).toContain('累计真实浏览');
    expect(root.textContent).toContain('待支付 5');
    expect(root.textContent).toContain('待报名 6');
    expect(root.textContent).toContain('独立业绩排行榜');
    expect(root.textContent).not.toContain('利润');
    expect(root.textContent).not.toContain('公司资料编辑表单');
    click('报名记录');
    expect(api.push).toHaveBeenCalledWith('/registrations');
    click('公司资料');
    await vi.waitFor(() =>
      expect(document.body.textContent).toContain('公司资料编辑表单'),
    );
  });
  it('clears previous company data and ignores responses across A to B to A', async () => {
    const root = mount();
    await vi.waitFor(() => expect(root.textContent).toContain('待支付 5'));
    let finishB!: (data: ReturnType<typeof response>) => void;
    let finishA!: (data: ReturnType<typeof response>) => void;
    api.overview.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishB = resolve;
        }),
    );
    invalidateContext();
    stores.auth.currentTenant = { id: 'b', name: '第二公司' };
    await nextTick();
    expect(root.textContent).not.toContain('待支付 5');
    const signalB = api.overview.mock.calls.at(-1)![0] as AbortSignal;
    api.overview.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishA = resolve;
        }),
    );
    invalidateContext();
    stores.auth.currentTenant = { id: 'a', name: '第一公司' };
    await nextTick();
    expect(signalB.aborted).toBe(true);
    const old = response();
    old.summary.pendingPayment = 111;
    finishB(old);
    await nextTick();
    expect(root.textContent).not.toContain('待支付 111');
    const current = response();
    current.summary.pendingPayment = 123;
    finishA(current);
    await vi.waitFor(() => expect(root.textContent).toContain('待支付 123'));
  });
  it('shows company statistics to ordinary staff without granting management shortcuts', async () => {
    stores.user.userInfo.roles = ['member'];
    api.overview.mockResolvedValue(response(false));
    const root = mount();
    await vi.waitFor(() => expect(root.textContent).toContain('待支付 5'));
    for (const label of ['员工管理', '门店管理', '公司资料'])
      expect(
        [...root.querySelectorAll('button')].some(
          (b) => b.textContent?.trim() === label,
        ),
      ).toBe(false);
    expect(root.textContent).toContain('我参加的活动');
    expect(root.textContent).toContain('我的本月业绩');
    click('报名记录');
    expect(api.push).toHaveBeenCalledWith('/registrations');
    expect(root.querySelector('[data-metric="views"]')?.textContent).toContain(
      '100',
    );
    expect(root.textContent).not.toContain('按活动权限');
  });
  it('supports errors and retry without retaining data, and aborts on unmount', async () => {
    api.overview.mockRejectedValueOnce(new Error('failed'));
    const root = mount();
    await vi.waitFor(() =>
      expect(root.textContent).toContain('运营数据加载失败'),
    );
    click('重试');
    await vi.waitFor(() => expect(root.textContent).toContain('待支付 5'));
    const signal = api.overview.mock.calls.at(-1)![0] as AbortSignal;
    cleanup?.();
    cleanup = undefined;
    expect(signal.aborted).toBe(true);
  });

  it('keeps company profile editing available when overview loading fails', async () => {
    api.overview.mockRejectedValueOnce(new Error('failed'));
    const root = mount();
    await vi.waitFor(() =>
      expect(root.textContent).toContain('运营数据加载失败'),
    );
    click('公司资料');
    await vi.waitFor(() =>
      expect(document.body.textContent).toContain('公司资料编辑表单'),
    );
    stores.auth.switchingTenant = true;
    await nextTick();
    expect(document.body.textContent).not.toContain('公司资料编辑表单');
  });
  it('mounts the independent monthly ranking panel', async () => {
    const root = mount();
    await vi.waitFor(() => expect(root.textContent).toContain('待支付 5'));
    expect(root.textContent).toContain('独立业绩排行榜');
    expect(api.overview).toHaveBeenCalledOnce();
  });
});
