import type { AuthApi } from './core/auth';

import { useAppConfig } from '@vben/hooks';
import { preferences } from '@vben/preferences';
import {
  defaultResponseInterceptor,
  errorMessageResponseInterceptor,
  RequestClient,
} from '@vben/request';
import { useAccessStore, useUserStore } from '@vben/stores';

import { message } from 'ant-design-vue';

import { useAuthStore } from '#/store';

import { captureContext } from './context-lifecycle';
import {
  credentialContext,
  credentialContextMatches,
} from './credential-context';
import { createSessionRefresher, responseStatus } from './session';

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

// The Go API returns the body directly, without a { code, data } envelope.
function ensureCredentialContext() {
  try {
    captureContext().assertCurrent();
  } catch (error) {
    useAuthStore().reloadContext();
    throw error;
  }
  if (useAuthStore().switchingTenant || useAuthStore().reloadingContext)
    throw new Error('公司已切换，请重新操作');
  if (
    !credentialContextMatches(
      useAccessStore().accessToken,
      useUserStore().userInfo,
    )
  ) {
    useAuthStore().reloadContext();
    throw new Error('公司已切换，请重新操作');
  }
}

function bodyClient(scoped = false) {
  const client = new RequestClient({ baseURL: apiURL, responseReturn: 'body' });
  if (scoped)
    client.addResponseInterceptor({
      fulfilled: (response) => {
        const config = response.config as typeof response.config & {
          __context?: ReturnType<typeof captureContext>;
          __tenantId?: string;
          __userId?: string;
        };
        config.__context?.assertCurrent();
        useAccessStore().$hydrate();
        const user =
          useUserStore().userInfo ||
          credentialContext(useAccessStore().accessToken);
        if (
          (config.__tenantId && config.__tenantId !== user?.tenantId) ||
          (config.__userId && config.__userId !== user?.userId)
        )
          throw new Error('公司已切换，请重新操作');
        ensureCredentialContext();
        return response;
      },
    });
  client.addResponseInterceptor(
    defaultResponseInterceptor({
      codeField: 'code',
      dataField: 'data',
      successCode: 0,
    }),
  );
  return client;
}

// Public authentication calls never enter the 401/refresh interceptor.
export const authRequestClient = bodyClient();
export const requestClient = bodyClient(true);
export const baseRequestClient = authRequestClient;

const refreshSession = createSessionRefresher<AuthApi.LoginResult>({
  apply: (next) => {
    const displayed =
      useUserStore().userInfo ||
      credentialContext(useAccessStore().accessToken);
    if (
      displayed &&
      (next.tenant.id !== displayed.tenantId ||
        next.user.id !== displayed.userId)
    ) {
      useAuthStore().recoverSession(next);
      throw new Error('公司已切换，请重新操作');
    }
    const { accessToken, refreshToken } = next;
    const store = useAccessStore();
    store.$patch({ accessToken, refreshToken });
    store.$persist();
  },
  current: () => {
    const store = useAccessStore();
    return { accessToken: store.accessToken, refreshToken: store.refreshToken };
  },
  expire: async () => {
    await useAuthStore().logout(true, false);
  },
  refresh: (refreshToken) =>
    authRequestClient.post<AuthApi.LoginResult>('/auth/refresh', {
      refreshToken,
    }),
  // Coordinate tabs sharing persisted credentials. Re-read the persisted pair
  // only after obtaining the lock, so a waiting tab sees the previous rotation.
  runExclusive: async (callback) => {
    if (typeof navigator !== 'undefined' && navigator.locks) {
      const scope = `${import.meta.env.VITE_APP_NAMESPACE}-${import.meta.env.VITE_APP_VERSION}-${import.meta.env.MODE}-refresh`;
      return navigator.locks.request(scope, async () => {
        useAccessStore().$hydrate();
        ensureCredentialContext();
        return callback();
      });
    }
    return callback();
  },
});

requestClient.addRequestInterceptor({
  fulfilled: (config) => {
    useAccessStore().$hydrate();
    ensureCredentialContext();
    const identity =
      useUserStore().userInfo ||
      credentialContext(useAccessStore().accessToken);
    const tenantId = identity?.tenantId;
    const scopedConfig = config as typeof config & {
      __context?: ReturnType<typeof captureContext>;
      __tenantId?: string;
      __userId?: string;
    };
    scopedConfig.__context ??= captureContext();
    scopedConfig.__context.assertCurrent();
    if (!config.signal) config.signal = scopedConfig.__context.signal;
    if (
      (scopedConfig.__tenantId && scopedConfig.__tenantId !== tenantId) ||
      (scopedConfig.__userId && scopedConfig.__userId !== identity?.userId)
    )
      throw new Error('公司已切换，请重新操作');
    scopedConfig.__tenantId = tenantId;
    scopedConfig.__userId = identity?.userId;
    const token = useAccessStore().accessToken;
    config.headers.Authorization = token ? `Bearer ${token}` : undefined;
    config.headers['Accept-Language'] = preferences.app.locale;
    return config;
  },
});

requestClient.addResponseInterceptor({
  rejected: async (error) => {
    const config = error?.config;
    if (responseStatus(error) !== 401 || !config) throw error;
    config.__context?.assertCurrent();
    ensureCredentialContext();
    if (
      config.__tenantId !==
        (
          useUserStore().userInfo ||
          credentialContext(useAccessStore().accessToken)
        )?.tenantId ||
      config.__userId !==
        (
          useUserStore().userInfo ||
          credentialContext(useAccessStore().accessToken)
        )?.userId
    )
      throw error;
    if (config.__isRetryRequest) {
      await useAuthStore().logout(true, false);
      throw error;
    }
    const sentToken =
      String(config.headers?.Authorization ?? '').replace(/^Bearer\s+/i, '') ||
      null;
    await refreshSession(sentToken);
    if (
      config.__tenantId !==
        (
          useUserStore().userInfo ||
          credentialContext(useAccessStore().accessToken)
        )?.tenantId ||
      config.__userId !==
        (
          useUserStore().userInfo ||
          credentialContext(useAccessStore().accessToken)
        )?.userId
    )
      throw new Error('公司已切换，请重新操作');
    return requestClient.request(config.url, {
      ...config,
      __isRetryRequest: true,
    });
  },
});

requestClient.addResponseInterceptor(
  errorMessageResponseInterceptor((fallback, error) => {
    message.error(error?.response?.data?.message || fallback);
  }),
);
