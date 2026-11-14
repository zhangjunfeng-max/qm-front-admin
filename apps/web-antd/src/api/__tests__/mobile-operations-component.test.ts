import type { SetupContext } from 'vue';

import { createApp, h } from 'vue';

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import Activities from '../../views/mobile/activities.vue';

const api = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  admin: true,
  platform: false,
}));
vi.mock('#/api/management', () => ({
  getActivities: api.list,
  getActivity: api.get,
}));
vi.mock('#/store', () => ({
  useAuthStore: () => ({
    profile: { isPlatformAdmin: api.platform },
    currentTenant: { id: 'company' },
  }),
}));
vi.mock('@vben/stores', () => ({
  useUserStore: () => ({
    userInfo: { roles: api.admin ? ['admin'] : ['member'] },
  }),
}));
vi.mock('vue-router', () => ({ useRoute: () => ({ query: {} }) }));
vi.mock('../../views/mobile/activity-actions.vue', () => ({
  default: { template: '<div>管理员活动操作</div>' },
}));
vi.mock('../../views/mobile/share.vue', () => ({
  default: {
    props: ['activity', 'open'],
    template:
      '<section v-if="open" role="dialog" :data-can-join="activity.canJoin">分享：{{ activity.name }}<button @click="$emit(\'close\')">关闭分享</button></section>',
  },
}));

let unmount: (() => void) | undefined;
function mount() {
  const root = document.createElement('div');
  document.body.append(root);
  const app = createApp(Activities);
  app.component('RouterLink', {
    props: ['to'],
    setup:
      (props: { to?: unknown }, { slots }: SetupContext) =>
      () =>
        h('a', { 'data-to': JSON.stringify(props.to) }, slots.default?.()),
  });
  app.mount(root);
  unmount = () => app.unmount();
}
function button(label: string) {
  return [...document.querySelectorAll('button')].find(
    (item) => item.textContent?.trim() === label,
  )!;
}
beforeEach(() => {
  api.admin = true;
  api.platform = false;
  api.get
    .mockReset()
    .mockResolvedValue({
      id: 'activity',
      name: '周末亲子活动',
      storedStatus: 'published',
      currentRole: 'admin',
      canJoin: true,
    });
  api.list.mockReset().mockResolvedValue({
    items: [
      {
        id: 'activity',
        name: '周末亲子活动',
        status: 'running',
        storedStatus: 'published',
        currentRole: 'admin',
        canJoin: false,
      },
    ],
    total: 1,
  });
});
afterEach(() => {
  unmount?.();
  document.body.innerHTML = '';
});

it('opens and closes share in the activity list while preserving the list', async () => {
  mount();
  await vi.waitFor(() => expect(button('分享活动')).toBeDefined());
  button('分享活动').click();
  await vi.waitFor(() =>
    expect(document.querySelector('[role=dialog]')?.textContent).toContain(
      '周末亲子活动',
    ),
  );
  expect(api.get).toHaveBeenCalledWith('activity', expect.any(AbortSignal));
  expect(
    document.querySelector('[role=dialog]')?.getAttribute('data-can-join'),
  ).toBe('true');
  expect(api.list).toHaveBeenCalledTimes(1);
  button('关闭分享').click();
  await vi.waitFor(() =>
    expect(document.querySelector('[role=dialog]')).toBeNull(),
  );
  expect(document.body.textContent).toContain('周末亲子活动');
});

it('offers company administrator creation and keeps ordinary staff lightweight', async () => {
  mount();
  await vi.waitFor(() =>
    expect(document.body.textContent).toContain('创建活动'),
  );
  expect(document.querySelector('a[data-to*="create"]')).not.toBeNull();
  unmount?.();
  document.body.innerHTML = '';
  api.admin = false;
  mount();
  await vi.waitFor(() =>
    expect(document.body.textContent).toContain('周末亲子活动'),
  );
  expect(document.body.textContent).not.toContain('创建活动');
  expect(document.body.textContent).not.toContain('管理员活动操作');
});

it('does not expose company administration to platform identities', async () => {
  api.platform = true;
  mount();
  await vi.waitFor(() =>
    expect(document.body.textContent).toContain('周末亲子活动'),
  );
  expect(document.body.textContent).not.toContain('创建活动');
  expect(document.body.textContent).not.toContain('管理员活动操作');
});
