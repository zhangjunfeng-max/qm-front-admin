import { onScopeDispose, watch } from 'vue';

import { useAccessStore, useUserStore } from '@vben/stores';

import { defineStore } from 'pinia';

import { PLATFORM_CONTEXT_ID } from '#/api/company-context';
import { captureContext } from '#/api/context-lifecycle';
import { notificationApi } from '#/api/notifications';

import { useAuthStore } from './auth';
import { createNotificationCenter } from './notification-center';

export const useNotificationStore = defineStore('notifications', () => {
  const center = createNotificationCenter(notificationApi);
  const users = useUserStore();
  const access = useAccessStore();
  const auth = useAuthStore();
  let detach: (() => void) | undefined;
  let disposed = false;
  function syncContext() {
    if (disposed) return;
    detach?.();
    const user = users.userInfo;
    const enabled =
      !!access.accessToken &&
      !!user?.userId &&
      !!user.tenantId &&
      !auth.switchingTenant &&
      !auth.reloadingContext;
    const scope = !enabled
      ? null
      : user.tenantId === PLATFORM_CONTEXT_ID
        ? user.roles?.includes('platform_admin')
          ? 'platform'
          : null
        : 'admin';
    const { signal } = captureContext();
    center.bind(
      scope,
      enabled ? `${user.userId}:${user.tenantId}:${user.roles?.join(',')}` : '',
      signal,
    );
    // Login broadcasts invalidate the context after writing the verified identity.
    // Rebind to its new lifetime after that synchronous session update finishes.
    const renew = () => queueMicrotask(syncContext);
    signal.addEventListener('abort', renew, { once: true });
    detach = () => signal.removeEventListener('abort', renew);
  }
  watch(
    () => [
      !!access.accessToken,
      users.userInfo?.userId,
      users.userInfo?.tenantId,
      users.userInfo?.roles?.join(','),
      auth.switchingTenant,
      auth.reloadingContext,
    ],
    syncContext,
    { immediate: true, flush: 'sync' },
  );
  onScopeDispose(() => {
    disposed = true;
    detach?.();
    center.stop();
  });
  return {
    ...center,
    start: () => {
      syncContext();
      center.start();
    },
    $reset: center.stop,
  };
});
