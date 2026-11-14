import type { Activity } from '../management';

import { createApp, h, nextTick, reactive } from 'vue';

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import ActivityPromotion from '../../components/management/activity-promotion.vue';
import { defaultActivity } from '../activity-form';
import { invalidateContext } from '../context-lifecycle';

const api = vi.hoisted(() => ({ post: vi.fn(), entry: vi.fn(), qr: vi.fn() }));
vi.mock('#/api/request', () => ({
  requestClient: {
    post: (url: string, ...args: unknown[]) =>
      url.endsWith('/entry') ? api.entry(url, ...args) : api.post(url, ...args),
  },
}));
vi.mock('qrcode', () => ({ default: { toDataURL: api.qr } }));
const png = 'data:image/png;base64,aGVsbG8=';
const jpeg = 'data:image/jpeg;base64,bmV3';
const idA = '12345678-1234-1234-1234-123456789abc';
const idB = '87654321-1234-1234-1234-123456789abc';
let cleanup: (() => void) | undefined;
function record(
  id = idA,
  channel: Activity['channel'] = 'h5_miniapp',
): Activity {
  return {
    ...defaultActivity(),
 musicUrl: '', musicName: '', musicStatus: '',
    id,
    channel,
    name: '夏日活动',
    tenantId: 'company',
    version: 1,
    status: 'running',
    storedStatus: 'published',
    submittedAt: null,
    reviewedAt: null,
    reviewedBy: null,
    reviewReason: '',
    publishedAt: '',
    canSubmitReview: false,
    canWithdrawReview: false,
    canPublish: false,
    canArchive: true,
    canRestore: false,
    stores: [],
    miniapp: {
      id: 'app',
      name: '品牌小程序',
      appid: 'wx1234567890abcdef',
      status: 'active',
      authorizationStatus: 'authorized',
    },
    memberCount: 0,
    groupCount: 0,
    currentRole: 'admin',
    canJoin: false,
    canEdit: true,
    canEditCore: false,
    canEditSchedule: false,
    canManageMembers: true,
    canManageGroups: true,
    canReviewApplications: true,
    performanceScope: 'all',
    createdAt: '',
    updatedAt: '',
  };
}
function mount(activity = record()) {
  const state = reactive({ open: true, activity });
  const root = document.createElement('div');
  document.body.append(root);
  const app = createApp({
    render: () =>
      h(ActivityPromotion, {
        activity: state.activity,
        open: state.open,
        onClose: () => (state.open = false),
      }),
  });
  app.mount(root);
  cleanup = () => app.unmount();
  return state;
}
function button(label: string) {
  const target = [...document.querySelectorAll('button')].find(
    (el) => el.textContent?.replaceAll(/\s/g, '') === label,
  );
  expect(target, `button ${label}`).toBeTruthy();
  return target!;
}
async function miniappTab() {
  await vi.waitFor(() =>
    expect(document.querySelector('[role="tab"]')).toBeTruthy(),
  );
  const tab = [...document.querySelectorAll<HTMLElement>('[role="tab"]')].find(
    (el) => el.textContent === '小程序',
  );
  expect(tab).toBeTruthy();
  tab!.click();
  await nextTick();
}
beforeEach(() => {
  api.post.mockReset();
  api.entry.mockReset().mockResolvedValue({ code: 'AbCdEfGh1234_-56' });
  api.qr.mockReset().mockResolvedValue(png);
  vi.stubEnv('VITE_ACTIVITY_H5_URL', 'http://localhost:5173/');
});
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.innerHTML = '';
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
it('renders an H5 customer link and QR without issuing a mini program request', async () => {
  mount(record(idA, 'h5'));
  await vi.waitFor(() => expect(document.querySelector('img')?.src).toBe(png));
  expect(document.querySelector('textarea')?.value).toBe(
    'http://localhost:5173/?c=AbCdEfGh1234_-56',
  );
  expect(document.body.textContent).not.toContain('小程序');
  expect(api.post).not.toHaveBeenCalled();
  expect(button('打开活动').disabled).toBe(false);
  const copy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
  button('复制链接').click();
  await vi.waitFor(() =>
    expect(copy).toHaveBeenCalledWith(
      'http://localhost:5173/?c=AbCdEfGh1234_-56',
    ),
  );
});
it('generates bound mini program codes only on request and allows retry after failure', async () => {
  api.post
    .mockRejectedValueOnce(new Error('unavailable'))
    .mockResolvedValueOnce({ dataUrl: jpeg });
  mount();
  await miniappTab();
  expect(document.body.textContent).toContain('品牌小程序');
  expect(api.post).not.toHaveBeenCalled();
  button('生成小程序码').click();
  await vi.waitFor(() =>
    expect(document.body.textContent).toContain('生成失败'),
  );
  button('重试').click();
  await vi.waitFor(() =>
    expect(
      document.querySelector('img[alt="小程序码"]')?.getAttribute('src'),
    ).toBe(jpeg),
  );
  expect(api.post).toHaveBeenLastCalledWith(
    `/admin/activities/${idA}/miniapp-code`,
    undefined,
    { signal: expect.any(AbortSignal) },
  );
  const downloads: HTMLAnchorElement[] = [];
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
    function (this: HTMLAnchorElement) {
      downloads.push(this);
    },
  );
  button('下载小程序码').click();
  expect(downloads[0]?.getAttribute('href')).toBe(jpeg);
  expect(downloads[0]?.getAttribute('download')).toMatch(/\.jpg$/);
});
it.each(['draft', 'approved', 'archived'] as const)(
  'keeps %s discoverable while disabling customer promotion',
  async (status) => {
    mount({ ...record(), status, storedStatus: status });
    await vi.waitFor(() =>
      expect(document.body.textContent).toContain('发布后可推广'),
    );
    expect(api.qr).not.toHaveBeenCalled();
    expect(button('打开活动').disabled).toBe(true);
    await miniappTab();
    expect(button('生成小程序码').disabled).toBe(true);
    expect(api.post).not.toHaveBeenCalled();
  },
);
it('supports ended published activities', async () => {
  mount({ ...record(), status: 'ended' });
  await vi.waitFor(() => expect(document.querySelector('img')?.src).toBe(png));
  expect(button('打开活动').disabled).toBe(false);
});
it('does not create links or images from invalid configuration or unsafe code responses', async () => {
  vi.stubEnv('VITE_ACTIVITY_H5_URL', 'javascript:alert(1)');
  api.post.mockResolvedValue({ dataUrl: 'data:image/svg+xml;base64,PHN2Zz4=' });
  mount();
  await vi.waitFor(() => expect(button('打开活动').disabled).toBe(true));
  expect(api.qr).not.toHaveBeenCalled();
  await miniappTab();
  button('生成小程序码').click();
  await vi.waitFor(() =>
    expect(document.body.textContent).toContain('生成失败'),
  );
  expect(document.querySelector('img[alt="小程序码"]')).toBeNull();
  expect(button('下载小程序码').disabled).toBe(true);
});
it('cancels and ignores old activity requests even when switching A to B to A', async () => {
  let finish!: (value: { dataUrl: string }) => void;
  api.post.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const state = mount();
  await miniappTab();
  button('生成小程序码').click();
  await vi.waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
  const signal = api.post.mock.calls[0]![2].signal as AbortSignal;
  state.activity = record(idB);
  await nextTick();
  state.activity = record(idA);
  await nextTick();
  expect(signal.aborted).toBe(true);
  finish({ dataUrl: jpeg });
  await nextTick();
  await nextTick();
  expect(document.querySelector('img[alt="小程序码"]')).toBeNull();
});
it('clears generated images and cancels requests when the company context expires', async () => {
  let finish!: (value: { dataUrl: string }) => void;
  api.post.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  mount();
  await miniappTab();
  button('生成小程序码').click();
  await vi.waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
  invalidateContext();
  await nextTick();
  expect(api.post.mock.calls[0]![2].signal.aborted).toBe(true);
  finish({ dataUrl: jpeg });
  await nextTick();
  await nextTick();
  expect(document.querySelector('img')).toBeNull();
  expect(button('下载小程序码').disabled).toBe(true);
});
it('ignores a delayed H5 QR after closing and reopening the dialog', async () => {
  let finish!: (value: string) => void;
  api.qr.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const state = mount(record(idA, 'h5'));
  await vi.waitFor(() => expect(api.qr).toHaveBeenCalledTimes(1));
  state.open = false;
  await nextTick();
  state.open = true;
  await vi.waitFor(() => expect(document.querySelector('img')?.src).toBe(png));
  finish(jpeg);
  await nextTick();
  await nextTick();
  expect(document.querySelector('img')?.src).toBe(png);
});

it.each(['missing', 'disabled', 'unauthorized'] as const)(
  'disables mini program generation for a %s binding',
  async (binding) => {
    const activity = record();
    if (binding === 'missing') activity.miniapp = null;
    else if (binding === 'disabled') activity.miniapp!.status = 'disabled';
    else activity.miniapp!.authorizationStatus = 'unauthorized';
    mount(activity);
    await miniappTab();
    expect(button('生成小程序码').disabled).toBe(true);
    expect(document.body.textContent).toContain('小程序暂不可用');
    expect(api.post).not.toHaveBeenCalled();
  },
);
it('cancels pending mini program requests on close and unmount without restoring stale downloads', async () => {
  let finish!: (value: { dataUrl: string }) => void;
  api.post.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const state = mount();
  await miniappTab();
  button('生成小程序码').click();
  await vi.waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
  const signal = api.post.mock.calls[0]![2].signal as AbortSignal;
  state.open = false;
  await nextTick();
  expect(signal.aborted).toBe(true);
  state.open = true;
  await nextTick();
  await miniappTab();
  finish({ dataUrl: jpeg });
  await nextTick();
  await nextTick();
  expect(button('下载小程序码').disabled).toBe(true);
  api.post.mockImplementationOnce(() => new Promise(() => {}));
  button('生成小程序码').click();
  await vi.waitFor(() => expect(api.post).toHaveBeenCalledTimes(2));
  const lastSignal = api.post.mock.calls[1]![2].signal as AbortSignal;
  cleanup?.();
  cleanup = undefined;
  expect(lastSignal.aborted).toBe(true);
});
it('clears an existing code and download as soon as its binding changes', async () => {
  api.post.mockResolvedValue({ dataUrl: jpeg });
  const state = mount();
  await miniappTab();
  button('生成小程序码').click();
  await vi.waitFor(() =>
    expect(document.querySelector('img[alt="小程序码"]')).not.toBeNull(),
  );
  state.activity.miniapp!.status = 'disabled';
  await nextTick();
  await miniappTab();
  expect(document.querySelector('img[alt="小程序码"]')).toBeNull();
  expect(button('下载小程序码').disabled).toBe(true);
  expect(button('生成小程序码').disabled).toBe(true);
});
