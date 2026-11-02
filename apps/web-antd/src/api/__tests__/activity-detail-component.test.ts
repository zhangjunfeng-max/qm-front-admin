/* eslint-disable vue/one-component-per-file -- The test mounts the real page with a mock layout component. */
import type { Activity } from '../management';

import { createApp, h, reactive } from 'vue';

import { afterEach, expect, it, vi } from 'vitest';

import ActivityDetail from '../../views/management/activity-detail.vue';
import { defaultActivity } from '../activity-form';

const mock = vi.hoisted(() => ({
  route: { params: { id: 'a' } },
  get: vi.fn(),
  push: vi.fn(),
}));
vi.mock('#/api/request', () => ({ requestClient: {} }));
vi.mock('vue-router', () => ({
  useRoute: () => mock.route,
  useRouter: () => ({ push: mock.push }),
}));
vi.mock('@vben/common-ui', async () => {
  const { h, defineComponent } = await import('vue');
  return {
    Page: defineComponent({
      props: { title: { type: String, default: '' } },
      setup:
        (props, { slots }) =>
        () =>
          h('main', [h('h1', props.title), slots.default?.(), slots.extra?.()]),
    }),
  };
});
vi.mock('../../views/management/activity-editor.vue', () => ({
  default: { render: () => null },
}));
vi.mock('../../views/management/activity-groups.vue', () => ({
  default: { render: () => null },
}));
vi.mock('../../views/management/activity-members.vue', () => ({
  default: { render: () => null },
}));
vi.mock('../../views/management/activity-stores.vue', () => ({
  default: { render: () => null },
}));
vi.mock('#/api/management', () => ({
  getActivity: mock.get,
  getMyMembership: async () => null,
  getActivityGroups: vi.fn(),
  getActivityInvitation: vi.fn(),
  applyActivity: vi.fn(),
  changeActivityState: vi.fn(),
}));
let unmount: (() => void) | undefined;
afterEach(() => {
  unmount?.();
  document.body.innerHTML = '';
  mock.get.mockReset();
});
function record(id: string): Activity {
  return {
    ...defaultActivity(),
    id,
    name: `活动${id}`,
    tenantId: 'company',
    version: 1,
    status: 'draft',
    storedStatus: 'draft',
    submittedAt: null,
    reviewedAt: null,
    reviewedBy: null,
    reviewReason: '',
    publishedAt: null,
    canSubmitReview: true,
    canWithdrawReview: false,
    canPublish: false,
    canArchive: true,
    canRestore: false,
    stores: [],
    miniapp: {
      id: `app${id}`,
      name: `小程序${id}`,
      appid: `wx000000000000000${id}`,
      status: 'active',
      authorizationStatus: 'authorized',
    },
    memberCount: 0,
    groupCount: 0,
    currentRole: 'admin',
    canEdit: true,
    canManageMembers: false,
    canManageGroups: false,
    canReviewApplications: false,
    performanceScope: 'all',
    createdAt: '',
    updatedAt: '',
  };
}
it('keeps the latest activity and its mini program when an older detail response arrives late', async () => {
  mock.route = reactive({ params: { id: 'a' } });
  let finish!: (r: Activity) => void;
  mock.get
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    )
    .mockResolvedValueOnce(record('b'));
  const root = document.createElement('div');
  document.body.append(root);
  const app = createApp({ render: () => h(ActivityDetail) });
  app.mount(root);
  unmount = () => app.unmount();
  await vi.waitFor(() => expect(mock.get).toHaveBeenCalledWith('a'));
  mock.route.params.id = 'b';
  await vi.waitFor(() => expect(root.textContent).toContain('小程序b'));
  finish(record('a'));
  await vi.waitFor(() =>
    expect(root.querySelector('h1')?.textContent).toBe('活动b'),
  );
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(root.textContent).toContain('小程序b');
  expect(root.textContent).not.toContain('小程序a');
  const orders = [...root.querySelectorAll('button')].find(
    (button) => button.textContent?.trim() === '订单管理',
  );
  expect(orders).toBeTruthy();
  orders?.click();
  expect(mock.push).toHaveBeenCalledWith('/activities/b/orders');
});
it('does not offer customer promotion for a restricted activity detail', async () => {
  mock.route = reactive({ params: { id: 'restricted' } });
  mock.get.mockResolvedValue({ ...record('restricted'), performanceScope: 'none', canEdit: false, currentRole: '' });
  const root = document.createElement('div');
  document.body.append(root);
  const app = createApp({ render: () => h(ActivityDetail) });
  app.mount(root);
  unmount = () => app.unmount();
  await vi.waitFor(() => expect(root.querySelector('h1')?.textContent).toBe('活动restricted'));
  expect([...root.querySelectorAll('button')].some((button) => button.textContent?.replaceAll(/\s/g, '') === '活动推广')).toBe(false);
});
