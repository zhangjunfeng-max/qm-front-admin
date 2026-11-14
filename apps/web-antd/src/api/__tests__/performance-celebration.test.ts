import { createApp, nextTick } from 'vue';

import { afterEach, expect, it, vi } from 'vitest';

import SuccessCelebration from '../../components/performance/success-celebration.vue';
vi.mock('@vben/icons', () => ({
  createIconifyIcon: () => ({ render: () => null }),
}));
const event = (id: string) => ({
  id,
  salesId: 'me',
  salesName: '销售甲',
  activityName: '活动',
  kind: 'payment' as const,
  amountCent: 29900,
});
let dispose: (() => void) | undefined;
afterEach(() => {
  dispose?.();
  document.body.innerHTML = '';
  vi.useRealTimers();
});
it('celebrates an actual success briefly, merges a burst and clears its queue on unmount', async () => {
  vi.useFakeTimers();
  const root = document.createElement('div');
  document.body.append(root);
  const app = createApp(SuccessCelebration, { userId: 'me' });
  const instance = app.mount(root) as unknown as {
    push: (events: ReturnType<typeof event>[]) => void;
  };
  dispose = () => app.unmount();
  instance.push([event('1')]);
  await nextTick();
  expect(document.body.textContent).toContain('恭喜你再添一单');
  expect(document.body.textContent).toContain('299');
  instance.push(['2', '3', '4', '5'].map(event));
  await vi.advanceTimersByTimeAsync(3450);
  await nextTick();
  expect(document.body.textContent).toContain('刚刚新增 4 笔');
  app.unmount();
  dispose = undefined;
  await vi.advanceTimersByTimeAsync(10000);
  expect(document.querySelector('.performance-success')).toBeNull();
});
