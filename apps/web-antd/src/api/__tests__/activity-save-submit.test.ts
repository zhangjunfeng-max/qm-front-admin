/* eslint-disable vue/one-component-per-file -- Isolated component shell for workflow assertions. */
import type { Activity } from '../management';

import { createApp, defineComponent, h } from 'vue';

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import Editor from '../../views/management/activity-editor.vue';
import { defaultActivity } from '../activity-form';
const api = vi.hoisted(() => ({
  save: vi.fn(),
  get: vi.fn(),
  payment: vi.fn(),
  transition: vi.fn(),
  upload: vi.fn(),
  clear: vi.fn(),
}));
vi.mock('../management', () => ({
  getActivity: api.get,
  getActivityPaymentAccounts: api.payment,
  saveActivity: api.save,
}));
vi.mock('../activity-lifecycle', () => ({
  transitionActivity: api.transition,
}));
vi.mock('../../components/management/activity-media', () => ({
  useActivityMedia: () => ({
    clear: api.clear,
    loadPreviews: vi.fn(),
    info: vi.fn(),
    uploadPending: api.upload,
    preparing: { value: 0 },
    progress: { value: '' },
  }),
}));
vi.mock('../../components/management/activity-editor-shell.vue', () => ({
  default: defineComponent({
    setup:
      (_, { slots }) =>
      () =>
        h('section', [slots.default?.(), slots.footer?.()]),
  }),
}));
vi.mock('../../components/management/activity-asset-upload.vue', () => ({
  default: { render: () => null },
}));
vi.mock('../../components/management/activity-music-select.vue', () => ({
  default: { render: () => null },
}));
vi.mock('../../components/management/activity-store-select.vue', () => ({
  default: { render: () => null },
}));
vi.mock('../../components/management/activity-employee-picker.vue', () => ({
  default: { render: () => null },
}));
vi.mock('../../components/management/activity-miniapp-select.vue', () => ({
  default: { render: () => null },
}));
let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  document.body.innerHTML = '';
});
beforeEach(() => {
  vi.clearAllMocks();
  api.upload.mockResolvedValue(undefined);
  api.payment.mockResolvedValue({ items: [] });
});
function activity(
  version = 1,
  status: Activity['storedStatus'] = 'draft',
): Activity {
  return {
    ...defaultActivity(),
    id: 'saved-activity',
    name: '测试活动',
    posterUrl: 'https://example.test/poster.jpg',
    startsAt: new Date(Date.now() + 3600000).toISOString(),
    endsAt: new Date(Date.now() + 7200000).toISOString(),
    version,
    storedStatus: status,
    status,
    canEditCore: true,
    canEditSchedule: true,
    canSubmitReview: status === 'draft',
    stores: [],
  } as unknown as Activity;
}
async function mount() {
  api.get.mockResolvedValue(activity());
  const root = document.createElement('div');
  document.body.append(root);
  const onSaved = vi.fn();
  const onClose = vi.fn();
  const app = createApp({
    render: () =>
      h(Editor, {
        open: true,
        activityId: 'saved-activity',
        inline: true,
        onSaved,
        onClose,
      }),
  });
  app.mount(root);
  cleanup = () => app.unmount();
  await vi.waitFor(() =>
    expect(root.querySelector('input')?.value).toBe('测试活动'),
  );
  return { root, onSaved, onClose, app };
}
function submit(root: HTMLElement) {
  [...root.querySelectorAll('button')]
    .find((b) => b.textContent?.includes('保存并提交审核'))!
    .click();
}
it('disables enabling group buying when the company has no payment channel', async () => {
  const { root } = await mount();
  await vi.waitFor(() =>
    expect(api.payment).toHaveBeenCalledWith({
      channel: 'h5',
      miniappId: null,
    }),
  );
  const groupItem = [...root.querySelectorAll<HTMLElement>('.ant-form-item')]
    .find((item) => item.textContent?.includes('开启拼团'));
  expect(groupItem).toBeTruthy();
  expect(groupItem?.querySelector<HTMLButtonElement>('button')?.disabled).toBe(
    true,
  );
  expect(root.textContent).toContain(
    '请先让平台在支付配置中为公司绑定可用账户并配置支付渠道。',
  );
});
it('retries the same saved activity and new version after a rejected submission without losing form', async () => {
  const { root, onSaved } = await mount();
  api.save
    .mockResolvedValueOnce(activity(2))
    .mockResolvedValueOnce(activity(3));
  api.transition
    .mockRejectedValueOnce(new Error('incomplete'))
    .mockResolvedValueOnce(activity(4, 'pending_review'));
  api.get.mockResolvedValue(activity(2));
  submit(root);
  await vi.waitFor(() => expect(root.textContent).toContain('草稿已保存'));
  expect(onSaved).not.toHaveBeenCalled();
  expect(root.querySelector('input')?.value).toBe('测试活动');
  submit(root);
  await vi.waitFor(() => expect(onSaved).toHaveBeenCalled());
  expect(api.save.mock.calls.map((c) => c[0])).toEqual([
    'saved-activity',
    'saved-activity',
  ]);
  expect(api.save.mock.calls[1]![1].version).toBe(2);
  expect(api.transition.mock.calls[1]!.slice(0, 2)).toEqual([
    'saved-activity',
    3,
  ]);
});
it('reconciles committed review when its response was lost without repeating write', async () => {
  const { root, onSaved } = await mount();
  api.save.mockResolvedValue(activity(2));
  api.transition.mockRejectedValue(new Error('network'));
  api.get.mockResolvedValue(activity(3, 'pending_review'));
  submit(root);
  await vi.waitFor(() =>
    expect(onSaved).toHaveBeenCalledWith(
      expect.objectContaining({ storedStatus: 'pending_review' }),
    ),
  );
  expect(api.save).toHaveBeenCalledTimes(1);
  expect(api.transition).toHaveBeenCalledTimes(1);
});
it('does not submit after navigating away during draft save', async () => {
  const { root, app } = await mount();
  let resolve!: (a: Activity) => void;
  api.save.mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  submit(root);
  await vi.waitFor(() => expect(api.save).toHaveBeenCalled());
  app.unmount();
  cleanup = undefined;
  resolve(activity(2));
  await new Promise((done) => setTimeout(done, 0));
  expect(api.transition).not.toHaveBeenCalled();
});
