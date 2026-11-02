import type { SetupContext } from 'vue';

import type { PlatformActivity } from '../activity-lifecycle';

import { createApp, h } from 'vue';

import { Modal } from 'ant-design-vue';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import ReviewPage from '../../views/platform/activities.vue';
import { defaultActivity } from '../activity-form';

const api = vi.hoisted(() => ({
  list: vi.fn(),
  detail: vi.fn(),
  review: vi.fn(),
  query: {} as Record<string, string>,
}));
vi.mock('vue-router', () => ({ useRoute: () => ({ query: api.query }) }));
vi.mock('#/api/activity-lifecycle', () => ({
  getPlatformActivities: api.list,
  getPlatformActivity: api.detail,
  reviewActivity: api.review,
  getPlatformActivityMedia: vi.fn(),
  activityStatusOptions: [{ label: '审核中', value: 'pending_review' }],
  activityStatusLabel: (s: string) => (s === 'pending_review' ? '审核中' : s),
  activityStatusColor: () => undefined,
}));
vi.mock('../../components/management/list-shell.vue', () => ({
  default: {
    setup:
      (_: unknown, { slots }: SetupContext) =>
      () =>
        h('main', [slots.filters?.(), slots.default?.(), slots.dialogs?.()]),
  },
}));
let cleanup: (() => void) | undefined;
function record(id = 'a'): PlatformActivity {
  return {
    ...defaultActivity(),
    id,
    name: `活动${id}`,
    companyName: '测试公司',
    tenantId: 'company',
    version: 4,
    status: 'pending_review',
    storedStatus: 'pending_review',
    submittedAt: '2026-11-01T00:00:00Z',
    reviewedAt: null,
    reviewedBy: null,
    reviewReason: '',
    publishedAt: null,
    canSubmitReview: false,
    canWithdrawReview: false,
    canPublish: false,
    canArchive: false,
    canRestore: false,
    canEdit: false,
    canManageMembers: false,
    canManageGroups: false,
    canReviewApplications: false,
    currentRole: '',
    performanceScope: 'none',
    miniapp: null,
    stores: [],
    memberCount: 0,
    groupCount: 0,
    createdAt: '',
    updatedAt: '',
  };
}
function button(text: string) {
  const result = [...document.querySelectorAll('button')].find(
    (el) => el.textContent?.replaceAll(/\s/g, '') === text,
  );
  if (!result) throw new Error(`missing button ${text}`);
  return result;
}
function mount() {
  const root = document.createElement('div');
  document.body.append(root);
  const app = createApp({ render: () => h(ReviewPage) });
  app.mount(root);
  cleanup = () => app.unmount();
}
beforeEach(() => {
  api.query = {};
  api.list
    .mockReset()
    .mockResolvedValue({ items: [record()], total: 1, page: 1, pageSize: 20 });
  api.detail.mockReset().mockResolvedValue(record());
  api.review.mockReset().mockResolvedValue({ ...record(), status: 'approved' });
});
afterEach(() => {
  cleanup?.();
  Modal.destroyAll();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});
it('defaults to the platform queue and requires a reason before rejection', async () => {
  mount();
  await vi.waitFor(() => expect(document.body.textContent).toContain('活动a'));
  expect(api.list).toHaveBeenCalledWith(
    expect.objectContaining({ status: 'pending_review' }),
  );
  button('审核').click();
  await vi.waitFor(() =>
    expect(document.body.textContent).toContain('活动信息'),
  );
  expect(document.body.textContent).toContain('填写表单');
  button('审核未通过').click();
  await vi.waitFor(() =>
    expect(document.body.textContent).toContain('请填写审核未通过原因'),
  );
  expect(api.review).not.toHaveBeenCalled();
});
it('confirms offline fee and sends the reviewed version, without publishing', async () => {
  let onOk: (() => Promise<void>) | undefined;
  const confirm = vi.spyOn(Modal, 'confirm').mockImplementation((config) => {
    onOk = config.onOk as () => Promise<void>;
    return { destroy: vi.fn(), update: vi.fn() };
  });
  mount();
  await vi.waitFor(() => expect(document.body.textContent).toContain('活动a'));
  button('审核').click();
  await vi.waitFor(() =>
    expect(document.body.textContent).toContain('活动信息'),
  );
  button('审核通过').click();
  expect(confirm).toHaveBeenCalledWith(
    expect.objectContaining({ title: '确认线下费用已核实并通过审核？' }),
  );
  await onOk?.();
  expect(api.review).toHaveBeenCalledWith('a', 4, 'approved', '');
  await vi.waitFor(() =>
    expect(document.querySelector('#activity-review-reason')).toBeNull(),
  );
});
it('ignores a delayed detail result after closing and reopening the drawer', async () => {
  let resolve!: (value: PlatformActivity) => void;
  api.detail
    .mockImplementationOnce(
      () =>
        new Promise<PlatformActivity>((r) => {
          resolve = r;
        }),
    )
    .mockResolvedValueOnce({ ...record(), name: '新的审核内容' });
  mount();
  await vi.waitFor(() => expect(document.body.textContent).toContain('活动a'));
  button('审核').click();
  await vi.waitFor(() => expect(api.detail).toHaveBeenCalledTimes(1));
  button('关闭').click();
  button('审核').click();
  await vi.waitFor(() =>
    expect(document.body.textContent).toContain('新的审核内容'),
  );
  resolve({ ...record(), name: '旧的审核内容' });
  await Promise.resolve();
  expect(document.body.textContent).not.toContain('旧的审核内容');
});


it('opens the activity selected by a notification using the platform detail API', async () => {
  api.query = { activityId: 'notification-activity' };
  api.detail.mockResolvedValueOnce({ ...record('notification-activity'), name: '通知中的活动' });
  mount();
  await vi.waitFor(() => expect(api.detail).toHaveBeenCalledWith('notification-activity', expect.any(AbortSignal)));
  await vi.waitFor(() => expect(document.body.textContent).toContain('通知中的活动'));
});
