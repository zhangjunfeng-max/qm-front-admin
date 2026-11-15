import type { SetupContext } from 'vue';

import type {
  CompanyOverviewPage,
  PlatformOverview,
} from '../platform-overview';

import { createApp, h, nextTick } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Overview from '../../views/platform/overview.vue';

const api = vi.hoisted(() => ({ overview: vi.fn(), companies: vi.fn() }));
vi.mock('#/api/platform-overview', () => ({
  getPlatformOverviewApi: api.overview,
  getPlatformCompanyOverviewApi: api.companies,
}));
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@vben/common-ui', () => ({
  Page: {
    setup:
      (_: unknown, { slots }: SetupContext) =>
      () =>
        h('main', [slots.extra?.(), slots.default?.()]),
  },
}));
vi.mock('../../views/platform/overview-trend.vue', () => ({
  default: { template: '<div>趋势图</div>' },
}));
vi.mock('#/components/management/home-notifications.vue', () => ({
  default: { template: '<section>平台待处理通知</section>' },
}));

function response(): PlatformOverview {
  return {
    generatedAt: '2026-11-01T00:30:00Z',
    timeZone: 'Asia/Shanghai',
    days: 7,
    summary: {
      totalCompanies: 2,
      activeCompanies: 2,
      todayCompanies: 1,
      expiredCompanies: 0,
      expiringCompanies: 0,
      totalActivities: 100,
      draftActivities: 1,
      pendingReviewActivities: 1,
      approvedActivities: 1,
      rejectedActivities: 2,
      todayActivities: 12,
      runningActivities: 30,
      scheduledActivities: 40,
      endedActivities: 20,
      unscheduledActivities: 0,
      archivedActivities: 5,
      activeEmployees: 88,
      pendingApplications: 3,
      views: null,
      orders: null,
      todayOrders: null,
    },
    trend: [{ date: '2026-11-01', newActivities: 12, newCompanies: 1 }],
  };
}
function companies(): CompanyOverviewPage {
  return {
    generatedAt: '2026-11-01T00:30:00Z',
    page: 1,
    pageSize: 10,
    total: 1,
    items: [
      {
        id: 'company-a',
        name: '第一公司',
        status: 'active',
        expiresAt: null,
        totalActivities: 23,
        todayActivities: 5,
        runningActivities: 10,
        activeEmployees: 8,
        pendingApplications: 1,
        lastActivityAt: '2026-11-01T00:30:00Z',
        todayOrders: null,
      },
    ],
  };
}
let cleanup: (() => void) | undefined;
function mount() {
  const root = document.createElement('div');
  document.body.append(root);
  const app = createApp({ render: () => h(Overview) });
  app.mount(root);
  cleanup = () => app.unmount();
  return root;
}
beforeEach(() => {
  api.overview.mockReset().mockResolvedValue(response());
  api.companies.mockReset().mockResolvedValue(companies());
});
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.innerHTML = '';
});

describe('platform operating overview', () => {
  it('shows real aggregate/company counts and labels unavailable traffic/orders without false zeros', async () => {
    const root = mount();
    await vi.waitFor(() => expect(root.textContent).toContain('第一公司'));
    expect(root.textContent).toContain('平台待处理通知');
    expect(root.textContent).toContain('累计活动 100 场');
    expect(root.textContent).toContain('暂无浏览统计');
    expect(root.textContent).toContain('暂无订单统计');
    expect(root.textContent).not.toContain('999999');
    expect(api.overview).toHaveBeenCalledWith(7, expect.any(AbortSignal));
  });
  it('renders genuinely available zero traffic/orders as zero', async () => {
    const data = response();
    Object.assign(data.summary, { views: 0, orders: 0, todayOrders: 0 });
    api.overview.mockResolvedValue(data);
    const root = mount();
    await vi.waitFor(() =>
      expect(root.textContent).toContain('真实访问，不含虚拟浏览'),
    );
    expect(root.textContent).not.toContain('暂无浏览统计');
    expect(root.textContent).toContain('全部活动累计订单');
  });
  it('ignores an older trend response and aborts its request', async () => {
    let finish!: (value: PlatformOverview) => void;
    api.overview.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const root = mount();
    await vi.waitFor(() => expect(api.overview).toHaveBeenCalledTimes(1));
    const oldSignal = api.overview.mock.calls[0]![1] as AbortSignal;
    const thirty = [...root.querySelectorAll('label')].find((item) =>
      item.textContent?.includes('近30天'),
    );
    expect(thirty).toBeDefined();
    thirty!.click();
    await vi.waitFor(() =>
      expect(api.overview).toHaveBeenCalledWith(30, expect.any(AbortSignal)),
    );
    await vi.waitFor(() =>
      expect(root.textContent).toContain('累计活动 100 场'),
    );
    expect(oldSignal.aborted).toBe(true);
    const stale = response();
    stale.summary.totalActivities = 999_999;
    finish(stale);
    await nextTick();
    expect(root.textContent).not.toContain('999,999');
  });
  it('clears failed refreshes and offers retry instead of keeping misleading data', async () => {
    const root = mount();
    await vi.waitFor(() =>
      expect(root.textContent).toContain('累计活动 100 场'),
    );
    api.overview.mockRejectedValueOnce(new Error('permission revoked'));
    [...root.querySelectorAll('label')]
      .find((item) => item.textContent?.includes('近30天'))!
      .click();
    await vi.waitFor(() =>
      expect(root.textContent).toContain('运营数据加载失败'),
    );
    expect(root.textContent).not.toContain('累计活动 100 场');
    [...root.querySelectorAll('button')]
      .find((button) => button.textContent?.replaceAll(/\s/g, '') === '重试')!
      .click();
    await vi.waitFor(() =>
      expect(root.textContent).toContain('累计活动 100 场'),
    );
  });
  it('cancels outstanding requests when leaving the platform context', async () => {
    api.overview.mockImplementation(() => new Promise(() => {}));
    api.companies.mockImplementation(() => new Promise(() => {}));
    mount();
    await nextTick();
    const summarySignal = api.overview.mock.calls[0]![1] as AbortSignal;
    const companySignal = api.companies.mock.calls[0]![1] as AbortSignal;
    cleanup?.();
    cleanup = undefined;
    expect(summarySignal.aborted).toBe(true);
    expect(companySignal.aborted).toBe(true);
  });
});
