import type { SetupContext } from 'vue';

import { createApp, h, nextTick, ref } from 'vue';

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import ActivityMembers from '../../views/management/activity-members.vue';

const api = vi.hoisted(() => ({ create: vi.fn(), batch: vi.fn() }));
vi.mock('@vben/stores', () => ({
  useUserStore: () => ({ userInfo: { userId: 'admin', roles: ['admin'] } }),
}));
vi.mock('#/api/management', () => ({
  getActivityEmployees: async () => ({ items: [], total: 0 }),
  getActivityGroups: async () => ({ items: [] }),
  saveActivityGroup: api.create,
  batchActivityEmployees: api.batch,
  assignActivityEmployee: vi.fn(),
  reviewApplication: vi.fn(),
}));
vi.mock('#/components/management/activity-employee-picker.vue', () => ({
  default: {
    emits: ['update:modelValue'],
    setup:
      (_: unknown, { emit }: SetupContext) =>
      () =>
        h(
          'button',
          { onClick: () => emit('update:modelValue', ['employee']) },
          '选择员工',
        ),
  },
}));
vi.mock('ant-design-vue', async (original) => {
  const actual = await original<Record<string, unknown>>();
  return {
    ...actual,
    Select: {
      setup:
        (_: unknown, { slots }: SetupContext) =>
        () =>
          h('div', slots.dropdownRender?.({ menuNode: h('div') })),
    },
  };
});

let unmount: (() => void) | undefined;
const activity = ref<any>();
const record = (id: string) => ({
  id,
  canManageMembers: true,
  canManageGroups: true,
  currentRole: 'admin',
});
function button(text: string) {
  return [...document.querySelectorAll<HTMLButtonElement>('button')].find(
    (item) => item.textContent?.replaceAll(/\s/g, '') === text,
  )!;
}
function mount() {
  const root = document.createElement('div');
  document.body.append(root);
  const app = createApp(() => h(ActivityMembers, { activity: activity.value }));
  app.mount(root);
  unmount = () => app.unmount();
}
async function open() {
  button('批量添加员工').click();
  await vi.waitFor(() => expect(button('选择员工')).toBeDefined());
  button('选择员工').click();
  await nextTick();
}
async function create() {
  const input = document.querySelector<HTMLInputElement>(
    'input[placeholder="新小组名称"]',
  )!;
  input.value = '新建小组';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await nextTick();
  button('创建并选中').click();
  await vi.waitFor(() => expect(api.create).toHaveBeenCalledTimes(1));
}
beforeEach(() => {
  activity.value = record('a');
  api.create.mockReset();
  api.batch.mockReset().mockResolvedValue({ changed: 1, skipped: 0 });
});
afterEach(() => {
  unmount?.();
  document.body.innerHTML = '';
});

it('blocks submit and close until group creation completes, then submits the new group', async () => {
  let resolve!: (value: unknown) => void;
  api.create.mockImplementation(
    () =>
      new Promise((finish) => {
        resolve = finish;
      }),
  );
  mount();
  await open();
  await create();
  expect(button('确认提交').disabled).toBe(true);
  expect(button('取消').disabled).toBe(true);
  button('确认提交').click();
  button('取消').click();
  await nextTick();
  expect(api.batch).not.toHaveBeenCalled();
  expect(document.body.textContent).toContain('批量添加活动员工');
  resolve({ id: 'new-group', name: '新建小组', sortOrder: 0, memberCount: 0 });
  await vi.waitFor(() => expect(button('确认提交').disabled).toBe(false));
  button('确认提交').click();
  await vi.waitFor(() =>
    expect(api.batch).toHaveBeenCalledWith(
      'a',
      expect.objectContaining({ groupId: 'new-group', userIds: ['employee'] }),
    ),
  );
});

it('ignores group completion from an invalidated batch after another activity opens a fresh batch', async () => {
  let resolve!: (value: unknown) => void;
  api.create.mockImplementation(
    () =>
      new Promise((finish) => {
        resolve = finish;
      }),
  );
  mount();
  await open();
  await create();
  activity.value = record('b');
  await nextTick();
  await open();
  resolve({
    id: 'old-group',
    name: '旧活动小组',
    sortOrder: 0,
    memberCount: 0,
  });
  await nextTick();
  await nextTick();
  button('确认提交').click();
  await vi.waitFor(() =>
    expect(api.batch).toHaveBeenCalledWith(
      'b',
      expect.objectContaining({ groupId: null, userIds: ['employee'] }),
    ),
  );
});
