import type { MiniappOption } from '../management';

import { createApp, h, nextTick, reactive } from 'vue';

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import ActivityMiniappSelect from '../../components/management/activity-miniapp-select.vue';
const api = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock('#/api/management', () => ({ getActivityMiniappOptions: api.fetch }));
const appA: MiniappOption = {
  id: 'a',
  name: '品牌小程序',
  appid: 'wx1234567890abcdef',
  status: 'active',
  authorizationStatus: 'authorized',
};
const appB: MiniappOption = { ...appA, id: 'b', name: '第二个小程序' };
let cleanup: (() => void) | undefined;
beforeEach(() => {
  api.fetch.mockReset();
});
afterEach(() => {
  cleanup?.();
  document.body.innerHTML = '';
});
function mount(initial: null | string = null, current?: MiniappOption) {
  const state = reactive({
    value: initial,
    busy: false,
    failed: false,
    id: '',
  });
  const root = document.createElement('div');
  document.body.append(root);
  const app = createApp({
    render: () =>
      h(ActivityMiniappSelect, {
        activityId: state.id,
        current,
        modelValue: state.value,
        'onUpdate:modelValue': (v) => (state.value = v),
        'onUpdate:busy': (v) => (state.busy = v),
        'onUpdate:failed': (v) => (state.failed = v),
      }),
  });
  app.mount(root);
  cleanup = () => app.unmount();
  return { state, root };
}
it('selects the only available program and renders a single select', async () => {
  api.fetch.mockResolvedValue({
    items: [appA],
    total: 1,
    page: 1,
    pageSize: 100,
  });
  const { state, root } = mount();
  await vi.waitFor(() => expect(state.value).toBe('a'));
  expect(root.querySelector('.ant-select-multiple')).toBeNull();
  expect(root.textContent).toContain('品牌小程序');
});
it('does not guess a choice when the complete result has more than one program', async () => {
  api.fetch.mockResolvedValue({
    items: [appA],
    total: 101,
    page: 1,
    pageSize: 100,
  });
  const { state } = mount();
  await vi.waitFor(() => expect(api.fetch).toHaveBeenCalled());
  await nextTick();
  expect(state.value).toBeNull();
});
it('retains and labels an unavailable existing program', async () => {
  const old = {
    ...appB,
    status: 'disabled' as const,
    authorizationStatus: 'unauthorized' as const,
  };
  api.fetch.mockResolvedValue({
    items: [appA, old],
    total: 2,
    page: 1,
    pageSize: 100,
  });
  const { state, root } = mount('b', old);
  await vi.waitFor(() => expect(root.textContent).toContain('已停用'));
  expect(state.value).toBe('b');
});
it('reports a failed request and can retry', async () => {
  api.fetch
    .mockRejectedValueOnce(new Error('network'))
    .mockResolvedValue({ items: [appA], total: 1, page: 1, pageSize: 100 });
  const { state, root } = mount();
  await vi.waitFor(() => expect(state.failed).toBe(true));
  const retry = [...root.querySelectorAll('button')].find((b) =>
    b.textContent?.includes('重试'),
  );
  expect(retry).toBeDefined();
  retry!.click();
  await vi.waitFor(() => expect(state.value).toBe('a'));
  expect(state.failed).toBe(false);
});
it('ignores a late response after switching activity', async () => {
  let resolveFirst!: (v: unknown) => void;
  api.fetch
    .mockImplementationOnce(() => new Promise((r) => (resolveFirst = r)))
    .mockResolvedValueOnce({ items: [appB], total: 1, page: 1, pageSize: 100 });
  const { state } = mount();
  state.id = 'other';
  await vi.waitFor(() => expect(state.value).toBe('b'));
  resolveFirst({ items: [appA], total: 1, page: 1, pageSize: 100 });
  await nextTick();
  await nextTick();
  expect(state.value).toBe('b');
});
