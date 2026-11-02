import type { SetupContext } from 'vue';

import { createApp, h, reactive } from 'vue';

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { createNotificationCenter } from '../../store/notification-center';
import Inbox from '../../views/notifications/index.vue';

const mocks = vi.hoisted(() => ({ center: null as any, push: vi.fn() }));
vi.mock('#/store/notifications', () => ({
  useNotificationStore: () => mocks.center,
}));
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('../../components/management/list-shell.vue', () => ({
  default: {
    setup:
      (_: unknown, { slots }: SetupContext) =>
      () =>
        h('main', [
          slots.extra?.(),
          slots.filters?.(),
          slots.default?.(),
          slots.dialogs?.(),
        ]),
  },
}));
let cleanup: (() => void) | undefined;
function mount() {
  const root = document.createElement('div');
  document.body.append(root);
  const app = createApp({ render: () => h(Inbox) });
  app.mount(root);
  cleanup = () => app.unmount();
}
function button(text: string) {
  const item = [...document.querySelectorAll('button')].find(
    (el) => el.textContent?.replaceAll(/\s/g, '') === text,
  );
  if (!item) throw new Error(`missing button ${text}`);
  return item;
}
async function fill(selector: string, value: string) {
  const el = document.querySelector<HTMLInputElement>(selector)!;
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  await Promise.resolve();
}
beforeEach(() => {
  mocks.center = reactive({
    contextVersion: 0,
    revision: 0,
    scope: 'admin',
    canPublish: true,
    unreadCount: 1,
    openingId: '',
    list: vi
      .fn()
      .mockResolvedValue({
        items: [
          {
            id: 'notice',
            title: '<b>通知标题</b>',
            message: '<script>不执行</script>',
            createdAt: '2026-11-01T00:00:00Z',
            isRead: false,
          },
        ],
        total: 1,
      }),
    publish: vi.fn().mockResolvedValue({ recipients: 2 }),
    recipients: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    activate: vi.fn().mockResolvedValue(undefined),
    readAll: vi.fn(),
    read: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
  });
});
afterEach(() => {
  cleanup?.();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});
it('renders plain text notices, changes unread filter and opens through permission-checked detail', async () => {
  mount();
  await vi.waitFor(() =>
    expect(document.body.textContent).toContain('<b>通知标题</b>'),
  );
  expect(document.querySelector('b')).toBeNull();
  button('未读').click();
  await vi.waitFor(() =>
    expect(mocks.center.list).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 20,
      status: 'unread',
    }),
  );
  button('查看').click();
  expect(mocks.center.activate).toHaveBeenCalledWith(
    'notice',
    expect.any(Function),
  );
});
it('reuses a request ID after uncertain send, resets only after successful sending', async () => {
  mocks.center.publish.mockRejectedValueOnce(new Error('timeout'));
  mount();
  button('发布公告').click();
  await vi.waitFor(() =>
    expect(document.querySelector('#notice-title')).not.toBeNull(),
  );
  await fill('#notice-title', '公司公告');
  await fill('#notice-message', '请查看本周安排');
  button('发送').click();
  await vi.waitFor(() => expect(mocks.center.publish).toHaveBeenCalledTimes(1));
  await vi.waitFor(() => expect(button('发送').disabled).toBe(false));
  button('发送').click();
  await vi.waitFor(() => expect(mocks.center.publish).toHaveBeenCalledTimes(2));
  const [first, second] = mocks.center.publish.mock.calls;
  expect(first[0].requestId).toMatch(/^[\da-f-]{36}$/);
  expect(first[0]).toEqual(second[0]);
});
it('closes and clears the announcement dialog on company or user changes', async () => {
  mount();
  button('发布公告').click();
  await vi.waitFor(() =>
    expect(document.querySelector('#notice-title')).not.toBeNull(),
  );
  await fill('#notice-title', '旧公司的公告');
  mocks.center.contextVersion++;
  mocks.center.canPublish = false;
  await vi.waitFor(() =>
    expect(document.body.textContent).not.toContain('旧公司的公告'),
  );
  expect(
    [...document.querySelectorAll('button')].some((el) =>
      el.textContent?.includes('发布公告'),
    ),
  ).toBe(false);
});


function realCenter() {
  const list = vi.fn().mockImplementation(async (scope: string) => ({
    items: [{ id: 'notice', title: scope === 'platform' ? '平台上下文通知' : '公司上下文通知', message: '通知内容', createdAt: '2026-11-01T00:00:00Z', isRead: false, kind: 'announcement' }],
    total: 1, unreadCount: 1, canPublish: true, page: 1, pageSize: 20,
  }));
  const center = createNotificationCenter({ list } as unknown as Parameters<typeof createNotificationCenter>[0]);
  mocks.center = reactive(center);
  return { center, list };
}
it('loads the inbox when a verified company is bound after an initially empty session', async () => {
  const { center } = realCenter();
  mount();
  center.bind('admin', 'user-a:company-a');
  await vi.waitFor(() => expect(document.body.textContent).toContain('公司上下文通知'));
});
it('loads only company notices when switching an existing platform inbox into a company', async () => {
  const { center, list } = realCenter();
  center.bind('platform', 'user-a:platform');
  mount();
  await vi.waitFor(() => expect(document.body.textContent).toContain('平台上下文通知'));
  center.bind('admin', 'user-a:company-a');
  await vi.waitFor(() => expect(document.body.textContent).toContain('公司上下文通知'));
  expect(document.body.textContent).not.toContain('平台上下文通知');
  expect(list.mock.calls.at(-1)?.[0]).toBe('admin');
});
