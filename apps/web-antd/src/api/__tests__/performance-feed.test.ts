import { afterEach, expect, it, vi } from 'vitest';

import { createPerformanceFeed } from '../performance-feed';

const board = (name = '销售甲', cursor = '1', events: unknown[] = []) => ({
  name,
  cursor,
  events,
});
afterEach(() => vi.useRealTimers());
it('refreshes every 30 seconds, keeps last data on failure and pauses while hidden', async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn().mockResolvedValue(board());
  const observer = {
    data: vi.fn(),
    reset: vi.fn(),
    failed: vi.fn(),
    loading: vi.fn(),
    celebrate: vi.fn(),
  };
  const feed = createPerformanceFeed(fetcher, observer);
  feed.bind({ metric: 'revenue' }, new AbortController().signal);
  await vi.advanceTimersByTimeAsync(0);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(observer.data).toHaveBeenCalledWith(board());
  fetcher.mockRejectedValueOnce(new Error('offline'));
  await vi.advanceTimersByTimeAsync(30000);
  expect(observer.failed).toHaveBeenLastCalledWith(true);
  expect(observer.reset).toHaveBeenCalledTimes(1);
  feed.visible(false);
  await vi.advanceTimersByTimeAsync(90000);
  expect(fetcher).toHaveBeenCalledTimes(2);
  feed.visible(true);
  await vi.advanceTimersByTimeAsync(0);
  expect(fetcher).toHaveBeenCalledTimes(3);
  feed.stop();
});
it('discards late company responses, aborts requests and never replays first-load events', async () => {
  vi.useFakeTimers();
  let finish!: (v: unknown) => void;
  const fetcher = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise((r) => {
          finish = r;
        }),
    )
    .mockResolvedValue(board('第二公司', '9', [{ id: '9' }]));
  const observer = {
    data: vi.fn(),
    reset: vi.fn(),
    failed: vi.fn(),
    loading: vi.fn(),
    celebrate: vi.fn(),
  };
  const feed = createPerformanceFeed(fetcher, observer);
  const first = new AbortController();
  feed.bind({}, first.signal);
  const signal = fetcher.mock.calls[0]![1] as AbortSignal;
  first.abort();
  feed.bind({}, new AbortController().signal);
  finish(board('第一公司泄露'));
  await vi.advanceTimersByTimeAsync(0);
  expect(signal.aborted).toBe(true);
  expect(observer.data).toHaveBeenCalledTimes(1);
  expect(observer.data.mock.calls[0]![0].name).toBe('第二公司');
  expect(observer.celebrate).not.toHaveBeenCalled();
  fetcher.mockResolvedValue(
    board('第二公司', '10', [{ id: '10' }, { id: '10' }]),
  );
  await vi.advanceTimersByTimeAsync(30000);
  expect(observer.celebrate).toHaveBeenCalledTimes(1);
  expect(observer.celebrate.mock.calls[0]![0]).toHaveLength(1);
  await vi.advanceTimersByTimeAsync(30000);
  expect(observer.celebrate).toHaveBeenCalledTimes(1);
  feed.stop();
});
it('clears protected data and celebrations on 403, then resumes from a fresh baseline', async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn().mockResolvedValue(board());
  const observer = { data: vi.fn(), reset: vi.fn(), failed: vi.fn(), loading: vi.fn(), celebrate: vi.fn() };
  const feed = createPerformanceFeed(fetcher, observer);
  feed.bind({}, new AbortController().signal);
  await vi.advanceTimersByTimeAsync(0);
  expect(observer.data).toHaveBeenCalledTimes(1);
  fetcher.mockRejectedValueOnce({ response: { status: 403 } });
  await vi.advanceTimersByTimeAsync(30000);
  expect(observer.reset).toHaveBeenCalledTimes(2);
  expect(observer.failed).toHaveBeenLastCalledWith(true);
  fetcher.mockResolvedValue(board('恢复权限', '5', [{ id: '5' }]));
  await vi.advanceTimersByTimeAsync(30000);
  expect(fetcher.mock.calls.at(-1)![0].after).toBeUndefined();
  expect(observer.celebrate).not.toHaveBeenCalled();
  feed.stop();
});
