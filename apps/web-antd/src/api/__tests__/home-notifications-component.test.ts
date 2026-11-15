import { createApp, h, nextTick, reactive } from 'vue';

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import HomeNotifications from '../../components/management/home-notifications.vue';

const mocks = vi.hoisted(() => ({
  center: null as any,
  push: vi.fn(),
}));

vi.mock('#/store/notifications', () => ({
  useNotificationStore: () => mocks.center,
}));
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }) }));

let cleanup: (() => void) | undefined;

function mount() {
  const root = document.createElement('div');
  document.body.append(root);
  const app = createApp({ render: () => h(HomeNotifications) });
  app.mount(root);
  cleanup = () => app.unmount();
  return root;
}

function notice(kind = 'customer_order_created') {
  return {
    id: `notice-${kind}`,
    title: '新的活动报名',
    message: '销售需要及时跟进本次报名客户',
    kind,
    createdAt: '2026-11-01T00:30:00Z',
    isRead: false,
  };
}

beforeEach(() => {
  mocks.center = reactive({
    contextVersion: 1,
    revision: 0,
    refreshVersion: 0,
    scope: 'admin',
    openingId: '',
    list: vi.fn().mockResolvedValue({
      items: [notice()],
      total: 1,
      unreadCount: 1,
    }),
    activate: vi.fn().mockResolvedValue(undefined),
  });
  mocks.push.mockReset();
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

it('shows unread notice information and opens the permission-checked notice', async () => {
  const root = mount();
  await vi.waitFor(() => expect(root.textContent).toContain('新的活动报名'));

  expect(mocks.center.list).toHaveBeenCalledWith({
    page: 1,
    pageSize: 15,
    status: 'unread',
  });
  expect(root.textContent).toContain('活动报名');
  expect(root.textContent).toContain('销售需要及时跟进本次报名客户');
  expect(root.textContent).toContain('11/01 08:30');

  const item = [...root.querySelectorAll('button')].find((button) =>
    button.textContent?.includes('新的活动报名'),
  );
  item!.click();
  expect(mocks.center.activate).toHaveBeenCalledWith(
    'notice-customer_order_created',
    expect.any(Function),
  );
});

it('requests server-side filtering by notification type', async () => {
  const root = mount();
  await vi.waitFor(() => expect(root.textContent).toContain('新的活动报名'));

  const selector = root.querySelector<HTMLElement>('.ant-select-selector');
  selector!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  await nextTick();
  const option = [...document.querySelectorAll<HTMLElement>('.ant-select-item-option')]
    .find((item) => item.textContent?.includes('客户线索'));
  option!.click();

  await vi.waitFor(() =>
    expect(mocks.center.list).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 15,
      status: 'unread',
      kind: 'customer_lead_created',
    }),
  );
});
