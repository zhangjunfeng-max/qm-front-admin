import { afterEach, expect, it, vi } from 'vitest';

import { createNotificationCenter } from '../../store/notification-center';

const notice = {
  id: 'delivery-a',
  title: '活动审核',
  message: '有新的审核结果',
  kind: 'activity_review',
  createdAt: '2026-11-01T00:00:00Z',
  isRead: false,
};
const result = (title = notice.title) => ({
  items: [{ ...notice, title }],
  total: 1,
  unreadCount: 1,
  page: 1,
  pageSize: 10,
  canPublish: true,
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function setup() {
  const api = {
    list: vi.fn().mockResolvedValue(result()),
    detail: vi
      .fn()
      .mockResolvedValue({ ...notice, link: '/activities/activity-a' }),
    read: vi.fn().mockResolvedValue(undefined),
    readAll: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    publish: vi.fn().mockResolvedValue({ recipients: 2 }),
    recipients: vi
      .fn()
      .mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 }),
  };
  const center = createNotificationCenter(api);
  center.bind('admin', 'user-a:company-a');
  return { api, center };
}
afterEach(() => vi.useRealTimers());
it('opens full activity change details before navigating and clears them on company switch', async () => {
  const { api, center } = setup();
  center.bind('platform', 'platform-user');
  api.detail.mockResolvedValue({
    ...notice,
    kind: 'activity_changed',
    link: '/platform/activities?activityId=activity-a',
    changes: [
      {
        field: 'musicUrl',
        label: '背景音乐',
        before: 'old.mp3',
        after: 'new.mp3',
      },
    ],
  });
  const navigate = vi.fn();
  await center.activate('delivery-a', navigate);
  expect(navigate).not.toHaveBeenCalled();
  expect(center.selected.value?.changes?.[0]?.after).toBe('new.mp3');
  center.bind('admin', 'company-b');
  expect(center.selected.value).toBeUndefined();
});
it('aborts and clears A -> B -> A, rejects late results and clears on user change/logout', async () => {
  const { api, center } = setup();
  const old = deferred<ReturnType<typeof result>>();
  api.list.mockReturnValueOnce(old.promise);
  const pending = center.refresh();
  const listCall = api.list.mock.calls[0];
  if (!listCall) throw new Error('expected notification list request');
  const signal = listCall[2];
  center.bind('admin', 'user-a:company-b');
  expect(signal.aborted).toBe(true);
  center.bind('admin', 'user-a:company-a');
  await center.refresh();
  old.resolve(result('旧公司通知'));
  await pending;
  expect(center.items.value[0]?.title).toBe('活动审核');
  center.bind('admin', 'user-b:company-a');
  expect(center.items.value).toEqual([]);
  center.bind(null, '');
  expect(center.canPublish.value).toBe(false);
  expect(center.unreadCount.value).toBe(0);
});
it('polls every 10 seconds only in foreground without overlapping and cleans up', async () => {
  vi.useFakeTimers();
  const { api, center } = setup();
  const old = deferred<ReturnType<typeof result>>();
  api.list.mockReturnValueOnce(old.promise);
  center.start();
  expect(api.list).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(60_000);
  expect(api.list).toHaveBeenCalledTimes(1);
  old.resolve(result());
  await vi.advanceTimersByTimeAsync(0);
  await vi.advanceTimersByTimeAsync(9999);
  expect(api.list).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1);
  expect(api.list).toHaveBeenCalledTimes(2);
  const visibility = vi
    .spyOn(document, 'visibilityState', 'get')
    .mockReturnValue('hidden');
  await vi.advanceTimersByTimeAsync(10_000);
  expect(api.list).toHaveBeenCalledTimes(2);
  visibility.mockReturnValue('visible');
  document.dispatchEvent(new Event('visibilitychange'));
  await Promise.resolve();
  expect(api.list).toHaveBeenCalledTimes(3);
  center.stop();
  await vi.advanceTimersByTimeAsync(60_000);
  document.dispatchEvent(new Event('visibilitychange'));
  expect(api.list).toHaveBeenCalledTimes(3);
  visibility.mockRestore();
});
it('cannot navigate or reload a new context after an old read finishes', async () => {
  const { api, center } = setup();
  const read = deferred<undefined>();
  api.read.mockReturnValueOnce(read.promise);
  const open = center.open(notice.id);
  await Promise.resolve();
  center.bind('admin', 'user-a:company-b');
  read.resolve(undefined);
  expect(await open).toBeUndefined();
  expect(api.list).not.toHaveBeenCalled();
});
it('marks read only after loading detail and accepts only permitted internal business links', async () => {
  const { api, center } = setup();
  api.detail.mockRejectedValueOnce(new Error('无权限'));
  await expect(center.open(notice.id)).rejects.toThrow('无权限');
  expect(api.read).not.toHaveBeenCalled();
  api.detail.mockResolvedValueOnce({ ...notice, link: 'https://evil.example' });
  const detail = await center.open(notice.id);
  expect(detail?.link).toBe('');
  expect(center.unreadCount.value).toBe(1);
});
it('accepts registration detail links produced by customer order notifications', async () => {
  const { api, center } = setup();
  const link = '/activities/activity-a/registrations?detailId=registration-a';
  api.detail.mockResolvedValueOnce({
    ...notice,
    kind: 'customer_order_created',
    link,
  });
  const detail = await center.open(notice.id);
  expect(detail?.link).toBe(link);
});
it('suppresses stale publish and delete completions', async () => {
  const { api, center } = setup();
  const publish = deferred<{ recipients: number }>();
  const remove = deferred<undefined>();
  api.publish.mockReturnValueOnce(publish.promise);
  api.remove.mockReturnValueOnce(remove.promise);
  const sending = center.publish({
    requestId: 'uuid',
    title: '公告',
    message: '内容',
    audience: 'all',
  });
  const deleting = center.remove(notice.id);
  center.bind(null, '');
  publish.resolve({ recipients: 2 });
  remove.resolve(undefined);
  expect(await sending).toBeUndefined();
  expect(await deleting).toBeUndefined();
  expect(api.list).not.toHaveBeenCalled();
});

it('does not restore an old unread count when a pre-mutation inbox list finishes late', async () => {
  const { api, center } = setup();
  const old = deferred<ReturnType<typeof result>>();
  api.list
    .mockReturnValueOnce(old.promise)
    .mockResolvedValue({ ...result(), items: [], total: 0, unreadCount: 0 });
  const pending = center.list({ page: 1, pageSize: 20, status: 'all' });
  await center.clear();
  expect(center.unreadCount.value).toBe(0);
  old.resolve(result());
  expect(await pending).toBeUndefined();
  expect(center.unreadCount.value).toBe(0);
});
