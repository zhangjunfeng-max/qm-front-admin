import { beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  access: {
    accessToken: '',
    refreshToken: 'refresh-a',
    $patch(data: object) {
      Object.assign(this, data);
    },
    $persist() {},
    $hydrate() {},
  },
  auth: { switchingTenant: false, reloadingContext: false },
  user: { userInfo: null as null | { tenantId: string; userId: string } },
}));
vi.mock('@vben/hooks', () => ({
  useAppConfig: () => ({ apiURL: 'http://localhost/test-api' }),
}));
vi.mock('@vben/preferences', () => ({
  preferences: { app: { locale: 'zh-CN' } },
}));
vi.mock('@vben/stores', () => ({
  useAccessStore: () => state.access,
  useUserStore: () => state.user,
}));
vi.mock('#/store', () => ({
  useAuthStore: () => ({
    ...state.auth,
    logout: async () => {},
    recoverSession: (next: {
      accessToken: string;
      refreshToken: string;
      tenant: { id: string };
      user: { id: string };
    }) => {
      state.access.$patch(next);
      state.user.userInfo = { tenantId: next.tenant.id, userId: next.user.id };
    },
    reloadContext: () => {
      state.user.userInfo = null;
    },
  }),
}));
vi.mock('ant-design-vue', () => ({ message: { error: () => {} } }));

import { invalidateContext } from '../context-lifecycle';
import { authRequestClient, requestClient } from '../request';
function token(tenant: string) {
  return `header.${btoa(JSON.stringify({ tid: tenant, sub: 'account' }))}.signature`;
}
beforeEach(() => {
  state.auth.switchingTenant = false;
  state.auth.reloadingContext = false;
  state.access.accessToken = token('company-a');
  state.access.refreshToken = 'refresh-a';
  state.user.userInfo = { tenantId: 'company-a', userId: 'account' };
});
it('does not retry an A write with recovered B credentials after a switch response is lost', async () => {
  let writes = 0;
  requestClient.instance.defaults.adapter = async (config) => {
    if (config.headers.Authorization === `Bearer ${token('company-a')}`)
      throw { config, response: { status: 401 } };
    writes++;
    return {
      config,
      data: { saved: true },
      headers: {},
      status: 200,
      statusText: 'OK',
    };
  };
  authRequestClient.instance.defaults.adapter = async (config) => ({
    config,
    data: {
      accessToken: token('company-b'),
      refreshToken: 'refresh-b',
      tenant: { id: 'company-b', name: 'B' },
      user: { id: 'account', role: 'admin', isPlatformAdmin: true },
      expiresIn: 900,
      tokenType: 'Bearer',
    },
    headers: {},
    status: 200,
    statusText: 'OK',
  });
  await expect(
    requestClient.post('/admin/stores', { name: 'A门店' }),
  ).rejects.toThrow('公司已切换');
  expect(writes).toBe(0);
  expect(state.user.userInfo?.tenantId).toBe('company-b');
});
it('blocks a request when persisted credentials have changed before the display context updates', async () => {
  state.access.accessToken = token('company-b');
  let writes = 0;
  requestClient.instance.defaults.adapter = async (config) => {
    writes++;
    return { config, data: {}, headers: {}, status: 200, statusText: 'OK' };
  };
  await expect(
    requestClient.post('/admin/stores', { name: 'A门店' }),
  ).rejects.toThrow('公司已切换');
  expect(writes).toBe(0);
});

it('blocks business writes from an old form as soon as switching starts', async () => {
  state.auth.switchingTenant = true;
  let writes = 0;
  requestClient.instance.defaults.adapter = async (config) => {
    writes++;
    return { config, data: {}, headers: {}, status: 200, statusText: 'OK' };
  };
  await expect(
    requestClient.post('/admin/stores', { name: 'A门店' }),
  ).rejects.toThrow('公司已切换');
  expect(writes).toBe(0);
});

it('rejects a delayed identity response requested before a company switch', async () => {
  state.user.userInfo = null;
  let release!: () => void;
  let started!: () => void;
  const ready = new Promise<void>((resolve) => {
    started = resolve;
  });
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  requestClient.instance.defaults.adapter = async (config) => {
    started();
    await waiting;
    return {
      config,
      data: { tenant: { id: 'company-a' } },
      headers: {},
      status: 200,
      statusText: 'OK',
    };
  };
  const pending = requestClient.get('/auth/me');
  const rejected = expect(pending).rejects.toThrow('公司已切换');
  await ready;
  state.access.accessToken = token('company-b');
  state.user.userInfo = { tenantId: 'company-b', userId: 'account' };
  release();
  await rejected;
});

it('discards an old response even when switching from A to B and back to A', async () => {
  let release!: () => void;
  let started!: () => void;
  const ready = new Promise<void>((resolve) => {
    started = resolve;
  });
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  requestClient.instance.defaults.adapter = async (config) => {
    started();
    await waiting;
    return {
      config,
      data: { old: true },
      headers: {},
      status: 200,
      statusText: 'OK',
    };
  };
  const pending = requestClient.get('/admin/activities');
  const rejected = expect(pending).rejects.toThrow();
  await ready;
  invalidateContext();
  invalidateContext();
  release();
  await rejected;
});

it('blocks a suspended tab even if another tab switches A to B and back before storage events run', async () => {
  let writes = 0;
  requestClient.instance.defaults.adapter = async (config) => {
    writes++;
    return { config, data: {}, headers: {}, status: 200, statusText: 'OK' };
  };
  localStorage.setItem('group-admin-session-context', 'external-new-context');
  await expect(
    requestClient.post('/admin/company', { name: 'old form' }),
  ).rejects.toThrow('公司已切换');
  expect(writes).toBe(0);
  localStorage.removeItem('group-admin-session-context');
  invalidateContext();
});

it('refreshes an expired token while restoring identity before user info is loaded', async () => {
  state.user.userInfo = null;
  requestClient.instance.defaults.adapter = async (config) => {
    if (config.headers.Authorization === `Bearer ${token('company-a')}`)
      throw { config, response: { status: 401 } };
    return {
      config,
      data: { restored: true },
      headers: {},
      status: 200,
      statusText: 'OK',
    };
  };
  authRequestClient.instance.defaults.adapter = async (config) => ({
    config,
    data: {
      accessToken: `${token('company-a')}-new`,
      refreshToken: 'refreshed',
      tenant: { id: 'company-a', name: 'A' },
      user: { id: 'account', role: 'admin', isPlatformAdmin: false },
    },
    headers: {},
    status: 200,
    statusText: 'OK',
  });
  await expect(requestClient.get('/auth/me')).resolves.toEqual({
    restored: true,
  });
});

it('recovers the selected company when an old refresh retry returns a switch while booting', async () => {
  state.user.userInfo = null;
  requestClient.instance.defaults.adapter = async (config) => {
    throw { config, response: { status: 401 } };
  };
  authRequestClient.instance.defaults.adapter = async (config) => ({
    config,
    data: {
      accessToken: token('company-b'),
      refreshToken: 'b',
      tenant: { id: 'company-b', name: 'B' },
      user: { id: 'account', role: 'member', isPlatformAdmin: false },
    },
    headers: {},
    status: 200,
    statusText: 'OK',
  });
  await expect(requestClient.get('/auth/me')).rejects.toThrow('公司已切换');
  expect(state.user.userInfo).toEqual({
    tenantId: 'company-b',
    userId: 'account',
  });
});
