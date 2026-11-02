import type { UserInfo } from '@vben/types';

import type { AuthApi } from '#/api/core/auth';

import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { LOGIN_PATH } from '@vben/constants';
import {
  resetAllStores,
  useAccessStore,
  useTabbarStore,
  useUserStore,
} from '@vben/stores';

import { notification } from 'ant-design-vue';
import { defineStore } from 'pinia';

import {
  getCurrentSessionApi,
  getMyTenantsApi,
  loginApi,
  logoutApi,
  refreshTokenApi,
  selectTenantApi,
  switchTenantApi,
} from '#/api';
import { sessionContext } from '#/api/company-context';
import { captureContext, invalidateContext } from '#/api/context-lifecycle';
import { resetRoutes } from '#/router';

export const useAuthStore = defineStore(
  'auth',
  () => {
    const accessStore = useAccessStore();
    const userStore = useUserStore();
    const tabbarStore = useTabbarStore();
    const router = useRouter();
    const loginLoading = ref(false);
    const switchingTenant = ref(false);
    const reloadingContext = ref(false);
    const profile = ref<AuthApi.LoginResult['user'] | null>(null);
    const currentTenant = ref<AuthApi.LoginResult['tenant'] | null>(null);
    // A selection ticket is short lived and intentionally never persisted.
    const tenantSelection = ref<AuthApi.TenantSelection | null>(null);
    const availableTenants = ref<AuthApi.UserTenant[]>([]);

    function toUserInfo(
      user: AuthApi.LoginResult['user'],
      tenantId: string,
    ): UserInfo {
      const { homePath, roles } = sessionContext(user, {
        id: tenantId,
        name: '',
      });
      return {
        avatar: '',
        desc: '',
        homePath,
        realName: user.displayName || user.phone,
        roles,
        tenantId,
        token: accessStore.accessToken ?? '',
        userId: user.id,
        username: user.phone,
      };
    }
    function applySession(result: AuthApi.LoginResult) {
      invalidateContext();
      resetRoutes();
      tabbarStore.$reset();
      userStore.$reset();
      accessStore.$reset();
      accessStore.$patch({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
      accessStore.$persist();
      profile.value = result.user;
      currentTenant.value = sessionContext(
        result.user,
        result.tenant,
      ).currentTenant;
      tenantSelection.value = null;
      availableTenants.value = [];
      userStore.setUserInfo(toUserInfo(result.user, result.tenant.id));
    }
    function recoverSession(result: AuthApi.LoginResult) {
      reloadingContext.value = true;
      applySession(result);
      useAuthStore().$persist();
      broadcastContextChange();
      window.location.replace(
        router.resolve(sessionContext(result.user, result.tenant).homePath)
          .href,
      );
    }
    function reloadContext() {
      if (reloadingContext.value) return;
      reloadingContext.value = true;
      invalidateContext();
      // Read the latest credentials before clearing persisted access state in another tab.
      accessStore.$hydrate();
      accessStore.setAccessMenus([]);
      accessStore.setAccessRoutes([]);
      accessStore.setIsAccessChecked(false);
      resetRoutes();
      tabbarStore.$reset();
      userStore.$reset();
      profile.value = null;
      currentTenant.value = null;
      availableTenants.value = [];
      useAuthStore().$persist();
      window.location.replace(router.resolve('/home').href);
    }
    function notifyError(title: string, error: unknown) {
      notification.error({
        message: title,
        description:
          (error as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ||
          (error instanceof Error ? error.message : '服务暂不可用，请稍后重试'),
      });
    }
    async function finishLogin(result: AuthApi.LoginResult) {
      applySession(result);
      useAuthStore().$persist();
      broadcastContextChange();
      await router.replace(sessionContext(result.user, result.tenant).homePath);
      notification.success({
        message: '登录成功',
        description: `欢迎回来，${result.user.displayName || result.user.phone}`,
        duration: 3,
      });
    }
    async function authLogin(params: AuthApi.LoginParams) {
      if (loginLoading.value) return;
      loginLoading.value = true;
      try {
        const result = await loginApi({
          phone: params.phone.trim(),
          password: params.password,
        });
        if ('requiresTenantSelection' in result) {
          tenantSelection.value = result;
          return;
        }
        await finishLogin(result);
      } catch (error) {
        notifyError('登录失败', error);
        throw error;
      } finally {
        loginLoading.value = false;
      }
    }
    async function selectTenant(tenantId: string) {
      if (loginLoading.value || !tenantSelection.value) return;
      loginLoading.value = true;
      try {
        const result = await selectTenantApi(
          tenantSelection.value.selectionToken,
          tenantId,
        );
        await finishLogin(result);
      } catch (error) {
        if (
          (error as { response?: { status?: number } })?.response?.status ===
          401
        )
          tenantSelection.value = null;
        notifyError('进入公司失败', error);
        throw error;
      } finally {
        loginLoading.value = false;
      }
    }
    function cancelSelection() {
      tenantSelection.value = null;
    }
    async function loadTenants() {
      const context = captureContext();
      const result = await getMyTenantsApi();
      context.assertCurrent();
      availableTenants.value = result.items;
    }
    async function switchTenant(tenantId: string) {
      if (switchingTenant.value || tenantId === currentTenant.value?.id) return;
      switchingTenant.value = true;
      invalidateContext();
      const context = captureContext();
      try {
        const run = async () => {
          context.assertCurrent();
          accessStore.$hydrate();
          if (!accessStore.refreshToken)
            throw new Error('登录已过期，请重新登录');
          // Rotate under the same lock before switching; this client never recursively acquires the lock.
          const fresh = await refreshTokenApi(accessStore.refreshToken);
          context.assertCurrent();
          accessStore.$patch({
            accessToken: fresh.accessToken,
            refreshToken: fresh.refreshToken,
          });
          accessStore.$persist();
          const result = await switchTenantApi(
            tenantId,
            fresh.refreshToken,
            fresh.accessToken,
          );
          context.assertCurrent();
          reloadingContext.value = true;
          applySession(result);
          // Persist before navigation so a reload cannot revive the previous tenant.
          useAuthStore().$persist();
          broadcastContextChange();
          window.location.replace(
            router.resolve(sessionContext(result.user, result.tenant).homePath)
              .href,
          );
        };
        if (navigator.locks) {
          // Same lock as token rotation, avoiding a refresh/switch race between tabs.
          const scope = `${import.meta.env.VITE_APP_NAMESPACE}-${import.meta.env.VITE_APP_VERSION}-${import.meta.env.MODE}-refresh`;
          await navigator.locks.request(scope, run);
        } else {
          await run();
        }
      } catch (error) {
        notifyError('切换公司失败', error);
        reloadContext();
        throw error;
      } finally {
        switchingTenant.value = false;
      }
    }
    function broadcastContextChange() {
      localStorage.setItem(
        'group-admin-session-context',
        `${Date.now()}-${Math.random()}`,
      );
      invalidateContext();
    }
    async function logout(_redirect = true, revoke = true) {
      invalidateContext();
      const accessToken = accessStore.accessToken;
      const refreshToken = accessStore.refreshToken;
      resetAllStores();
      accessStore.$persist();
      resetRoutes();
      accessStore.setLoginExpired(false);
      broadcastContextChange();
      await router.replace(LOGIN_PATH);
      if (revoke && accessToken) {
        try {
          await logoutApi(accessToken, refreshToken);
        } catch {
          /* Local session is already cleared. */
        }
      }
    }
    async function fetchUserInfo() {
      const context = captureContext();
      const result = await getCurrentSessionApi();
      context.assertCurrent();
      profile.value = result.user;
      currentTenant.value = sessionContext(
        result.user,
        result.tenant,
      ).currentTenant;
      const userInfo = toUserInfo(result.user, result.tenant.id);
      userStore.setUserInfo(userInfo);
      return userInfo;
    }
    function $reset() {
      loginLoading.value = false;
      switchingTenant.value = false;
      reloadingContext.value = false;
      profile.value = null;
      currentTenant.value = null;
      tenantSelection.value = null;
      availableTenants.value = [];
    }
    return {
      $reset,
      recoverSession,
      reloadContext,
      authLogin,
      fetchUserInfo,
      loginLoading,
      logout,
      profile,
      currentTenant,
      tenantSelection,
      availableTenants,
      selectTenant,
      cancelSelection,
      loadTenants,
      switchTenant,
      switchingTenant,
      reloadingContext,
    };
  },
  { persist: { pick: ['profile', 'currentTenant'] } },
);
