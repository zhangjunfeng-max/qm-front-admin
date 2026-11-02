import { reactive } from 'vue';

import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, expect, it, vi } from 'vitest';

import { useNotificationStore } from '../../store/notifications';

const mocks = vi.hoisted(() => ({
  users: null as any,
  access: null as any,
  auth: null as any,
  controller: new AbortController(),
  list: vi.fn(),
}));
vi.mock('@vben/stores', () => ({
  useAccessStore: () => mocks.access,
  useUserStore: () => mocks.users,
}));
vi.mock('../../store/auth', () => ({ useAuthStore: () => mocks.auth }));
vi.mock('#/api/context-lifecycle', () => ({
  captureContext: () => ({ signal: mocks.controller.signal }),
}));
vi.mock('#/api/notifications', () => ({
  notificationApi: { list: mocks.list },
}));
beforeEach(() => {
  setActivePinia(createPinia());
  mocks.controller = new AbortController();
  mocks.users = reactive({
    userInfo: { userId: 'user-a', tenantId: 'company-a', roles: ['owner'] },
  });
  mocks.access = reactive({ accessToken: 'token' });
  mocks.auth = reactive({ switchingTenant: false, reloadingContext: false });
  mocks.list
    .mockReset()
    .mockResolvedValue({
      items: [],
      total: 0,
      unreadCount: 0,
      canPublish: true,
    });
});
it('binds company APIs for platform users entering a company, platform APIs only in platform context', () => {
  const store = useNotificationStore();
  expect(store.scope).toBe('admin');
  mocks.users.userInfo = {
    userId: 'user-a',
    tenantId: '00000000-0000-0000-0000-000000000000',
    roles: ['platform_admin'],
  };
  expect(store.scope).toBe('platform');
  mocks.users.userInfo.roles = ['member'];
  expect(store.scope).toBeNull();
});
it('rebinds after login broadcast invalidates an otherwise identical identity and supports global store reset', async () => {
  const store = useNotificationStore();
  const old = mocks.controller;
  old.abort();
  mocks.controller = new AbortController();
  expect(store.scope).toBeNull();
  await Promise.resolve();
  expect(store.scope).toBe('admin');
  expect(() => store.$reset()).not.toThrow();
  expect(store.items).toEqual([]);
});
