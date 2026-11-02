import type { Router } from 'vue-router';

import { beforeEach, expect, it, vi } from 'vitest';

import { createRouterGuard } from '../../router/guard';

const state = vi.hoisted(() => ({
  access: {
    accessToken: 'platform-token',
    isAccessChecked: false,
    $hydrate: vi.fn(),
    setAccessMenus: vi.fn(),
    setAccessRoutes: vi.fn(),
    setIsAccessChecked: vi.fn(),
  },
  user: {
    userInfo: { homePath: '/platform/overview', roles: ['platform_admin'] },
  },
  auth: { switchingTenant: false, reloadingContext: false },
}));
vi.mock('@vben/constants', () => ({ LOGIN_PATH: '/auth/login' }));
vi.mock('@vben/preferences', () => ({
  preferences: { transition: { progress: false } },
}));
vi.mock('@vben/stores', () => ({
  useAccessStore: () => state.access,
  useUserStore: () => state.user,
}));
vi.mock('@vben/utils', () => ({
  startProgress: vi.fn(),
  stopProgress: vi.fn(),
}));
vi.mock('#/api/context-lifecycle', () => ({
  captureContext: () => ({
    signal: new AbortController().signal,
    assertCurrent: vi.fn(),
  }),
}));
vi.mock('#/api/credential-context', () => ({
  credentialContextMatches: () => true,
}));
vi.mock('#/router/routes', () => ({ accessRoutes: [], coreRouteNames: [] }));
vi.mock('#/store', () => ({ useAuthStore: () => state.auth }));
vi.mock('../../router/access', () => ({
  generateAccess: async () => ({ accessibleMenus: [], accessibleRoutes: [] }),
}));

function guard() {
  const hooks: Array<(to: object) => unknown> = [];
  const resolve = vi.fn((path: string) => ({ path }));
  createRouterGuard({
    beforeEach: (hook: (to: object) => unknown) => hooks.push(hook),
    afterEach: vi.fn(),
    resolve,
  } as unknown as Router);
  return { run: hooks[1]!, resolve };
}

beforeEach(() => {
  state.access.isAccessChecked = false;
  state.user.userInfo = {
    homePath: '/platform/overview',
    roles: ['platform_admin'],
  };
});

it('redirects the initial company-home default to platform overview after generating access', async () => {
  const { run, resolve } = guard();
  expect(await run({ path: '/home', fullPath: '/home', meta: {} })).toEqual({
    path: '/platform/overview',
    replace: true,
  });
  expect(resolve).toHaveBeenCalledWith('/platform/overview');
});

it('redirects an already checked platform session from company home', async () => {
  state.access.isAccessChecked = true;
  expect(
    await guard().run({ path: '/home', fullPath: '/home', meta: {} }),
  ).toBe('/platform/overview');
});

it('retains the selected company home and explicit platform subpages', async () => {
  state.access.isAccessChecked = true;
  state.user.userInfo = { homePath: '/home', roles: ['admin'] };
  expect(
    await guard().run({ path: '/home', fullPath: '/home', meta: {} }),
  ).toBe(true);
  state.user.userInfo = {
    homePath: '/platform/overview',
    roles: ['platform_admin'],
  };
  expect(
    await guard().run({
      path: '/platform/tenants',
      fullPath: '/platform/tenants',
      meta: {},
    }),
  ).toBe(true);
});
