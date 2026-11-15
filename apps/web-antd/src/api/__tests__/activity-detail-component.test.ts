/* eslint-disable vue/one-component-per-file -- The test mounts the real page with a mock layout component. */
import type { Activity } from '../management';

import { createApp, h, reactive } from 'vue';

import { afterEach, expect, it, vi } from 'vitest';

import ActivityDetail from '../../views/management/activity-detail.vue';
import { defaultActivity } from '../activity-form';

const mock = vi.hoisted(() => ({
  route: { params: { id: 'a' } },
  get: vi.fn(),
  assign: vi.fn(),
  push: vi.fn(),
  resolve: vi.fn(),
  invitation: vi.fn(),
  invitationCode: vi.fn(),
}));
vi.mock('#/store', () => ({ useAuthStore: () => ({ profile: { isPlatformAdmin: false } }) }));
vi.mock('@vben/stores', () => ({
  useUserStore: () => ({ userInfo: { userId: 'company-admin' } }),
}));
vi.mock('#/components/performance/performance-panel.vue', () => ({
  default: { render: () => null },
}));
vi.mock('#/api/request', () => ({ requestClient: {} }));
vi.mock('vue-router', () => ({
  useRoute: () => mock.route,
  useRouter: () => ({ push: mock.push, resolve: mock.resolve }),
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
  getActivityInvitation: mock.invitation,
  getActivityInvitationCode: mock.invitationCode,
  applyActivity: vi.fn(),
  assignActivityEmployee: mock.assign,
  changeActivityState: vi.fn(),
}));
let unmount: (() => void) | undefined;
afterEach(() => {
  unmount?.();
  document.body.innerHTML = '';
  mock.get.mockReset();
  mock.assign.mockReset();
  mock.invitation.mockReset();
  mock.invitationCode.mockReset();
  vi.unstubAllEnvs();
});
function record(id: string): Activity {
  return {
    ...defaultActivity(),
 musicUrl: '', musicName: '', musicStatus: '',
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
    canJoin: false,
    canEdit: true,
    canEditCore: true,
    canEditSchedule: true,
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
    (button) => button.textContent?.trim() === '报名记录',
  );
  expect(orders).toBeTruthy();
  orders?.click();
  expect(mock.push).toHaveBeenCalledWith('/activities/b/registrations');
});
it('does not offer customer promotion for a restricted activity detail', async () => {
  mock.route = reactive({ params: { id: 'restricted' } });
  mock.get.mockResolvedValue({
    ...record('restricted'),
    performanceScope: 'none',
    canEdit: false,
    currentRole: '',
  });
  const root = document.createElement('div');
  document.body.append(root);
  const app = createApp({ render: () => h(ActivityDetail) });
  app.mount(root);
  unmount = () => app.unmount();
  await vi.waitFor(() =>
    expect(root.querySelector('h1')?.textContent).toBe('活动restricted'),
  );
  expect(
    [...root.querySelectorAll('button')].some(
      (button) => button.textContent?.replaceAll(/\s/g, '') === '活动推广',
    ),
  ).toBe(false);
});

it('allows company administrators to explicitly join their own company activity', async () => {
  mock.route = reactive({ params: { id: 'mine' } });
  mock.get.mockResolvedValue({ ...record('mine'), canJoin: true });
  mock.assign.mockResolvedValue({ role: 'member', status: 'approved' });
  const root = document.createElement('div');
  document.body.append(root);
  const app = createApp({ render: () => h(ActivityDetail) });
  app.mount(root);
  unmount = () => app.unmount();
  await vi.waitFor(() => expect(root.textContent).toContain('活动mine'));
  const join = [...root.querySelectorAll('button')].find(
    (b) => b.textContent?.replaceAll(/\s/g, '') === '加入活动',
  );
  expect(join).toBeTruthy();
  join!.click();
  await vi.waitFor(() =>
    expect(mock.assign).toHaveBeenCalledWith('mine', 'company-admin', {
      role: 'member',
      groupId: null,
      status: 'approved',
    }),
  );
});
it('does not expose a participation entry when the server forbids platform participation', async () => {
  mock.route = reactive({ params: { id: 'platform' } });
  mock.get.mockResolvedValue({ ...record('platform'), canJoin: false });
  const root = document.createElement('div');
  document.body.append(root);
  const app = createApp({ render: () => h(ActivityDetail) });
  app.mount(root);
  unmount = () => app.unmount();
  await vi.waitFor(() => expect(root.textContent).toContain('活动platform'));
  expect(
    [...root.querySelectorAll('button')].some((b) =>
      ['加入活动', '申请加入'].includes(
        b.textContent?.replaceAll(/\s/g, '') ?? '',
      ),
    ),
  ).toBe(false);
  expect(mock.assign).not.toHaveBeenCalled();
});

it('generates a channel-matched H5 employee invitation', async () => {
  vi.stubEnv('VITE_ACTIVITY_H5_URL', 'https://activity.example.com/');
  mock.route = reactive({ params: { id: 'invite' } });
  mock.get.mockResolvedValue({ ...record('invite'), canManageMembers: true });
  mock.invitation.mockResolvedValue({
    registrationPath: '#/pages/staff-invite/index?token=AbCdEfGh1234_-56',
    channel: 'h5',
  });
  const root = document.createElement('div');
  document.body.append(root);
  const app = createApp({ render: () => h(ActivityDetail) });
  app.mount(root);
  unmount = () => app.unmount();
  await vi.waitFor(() => expect(root.textContent).toContain('活动invite'));
  const invite = [...root.querySelectorAll('button')].find(
    (b) => b.textContent?.replaceAll(/\s/g, '') === '员工邀请',
  );
  expect(invite).toBeTruthy();
  invite!.click();
  await vi.waitFor(() =>
    expect(document.querySelector('textarea')?.value).toContain(
      'https://activity.example.com/#/pages/staff-invite/index?token=AbCdEfGh1234_-56',
    ),
  );
  expect(mock.invitationCode).not.toHaveBeenCalled();
});

it('uses only a mini program code for a mini program employee invitation', async () => {
  mock.route = reactive({ params: { id: 'invite-mini' } });
  mock.get.mockResolvedValue({
    ...record('invite-mini'),
    channel: 'miniapp',
    canManageMembers: true,
  });
  mock.invitation.mockResolvedValue({
    channel: 'miniapp',
    registrationPath: '#/pages/staff-invite/index?token=AbCdEfGh1234_-56',
  });
  mock.invitationCode.mockResolvedValue({
    dataUrl: 'data:image/png;base64,aGVsbG8=',
  });
  const root = document.createElement('div');
  document.body.append(root);
  const app = createApp({ render: () => h(ActivityDetail) });
  app.mount(root);
  unmount = () => app.unmount();
  await vi.waitFor(() => expect(root.textContent).toContain('活动invite-mini'));
  const invite = [...root.querySelectorAll('button')].find(
    (b) => b.textContent?.replaceAll(/\s/g, '') === '员工邀请',
  );
  expect(invite).toBeTruthy();
  invite!.click();
  await vi.waitFor(() =>
    expect(document.querySelector('textarea')).toBeNull(),
  );
  expect(mock.invitationCode).toHaveBeenCalledWith('invite-mini');
});
