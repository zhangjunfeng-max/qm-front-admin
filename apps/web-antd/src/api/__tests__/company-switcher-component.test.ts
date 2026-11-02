import { createApp, h, reactive } from 'vue';

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import TenantSwitcher from '../../components/tenant/tenant-switcher.vue';

const mock = vi.hoisted(() => ({ store: {} as Record<string, unknown> }));
vi.mock('#/store', () => ({ useAuthStore: () => mock.store }));
let unmount: (() => void) | undefined;
afterEach(() => {
  unmount?.();
  document.body.innerHTML = '';
});
beforeEach(() => {
  mock.store = reactive({
    availableTenants: [{ id: 'a', name: '公司A' }],
    currentTenant: { id: 'a', name: '公司A' },
    profile: { isPlatformAdmin: false },
    switchingTenant: false,
    loadTenants: async () => {},
  });
});
function mount() {
  const root = document.createElement('div');
  document.body.append(root);
  const app = createApp({ render: () => h(TenantSwitcher) });
  app.mount(root);
  unmount = () => app.unmount();
  return root;
}
it('hides the company switcher for a single-company account', async () => {
  const root = mount();
  await vi.waitFor(() =>
    expect(root.querySelector('[aria-label="切换公司"]')).toBeNull(),
  );
});
it('shows the company switcher for a multi-company account', async () => {
  mock.store.availableTenants = [
    { id: 'a', name: '公司A' },
    { id: 'b', name: '公司B' },
  ];
  const root = mount();
  await vi.waitFor(() =>
    expect(root.querySelector('[aria-label="切换公司"]')).not.toBeNull(),
  );
});
it('keeps platform navigation available while a platform operator is in a company', async () => {
  mock.store.profile = { isPlatformAdmin: true };
  const root = mount();
  await vi.waitFor(() =>
    expect(root.querySelector('[aria-label="切换公司"]')).not.toBeNull(),
  );
});
it.each([1, 2])(
  'recovers from a failed first load and respects the resulting %i company count',
  async (count) => {
    const reload = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockImplementationOnce(async () => {
        mock.store.availableTenants = Array.from({ length: count }, (_, i) => ({
          id: String(i),
          name: `公司${i}`,
        }));
      });
    mock.store.availableTenants = [];
    mock.store.loadTenants = reload;
    const root = mount();
    await vi.waitFor(() =>
      expect(
        root.querySelector('[aria-label="重新加载公司列表"]'),
      ).not.toBeNull(),
    );
    expect(root.querySelector('[aria-label="切换公司"]')).toBeNull();
    (
      root.querySelector('[aria-label="重新加载公司列表"]') as HTMLButtonElement
    ).click();
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(2));
    await vi.waitFor(() =>
      expect(root.querySelector('[aria-label="重新加载公司列表"]')).toBeNull(),
    );
    expect(!!root.querySelector('[aria-label="切换公司"]')).toBe(count > 1);
  },
);
