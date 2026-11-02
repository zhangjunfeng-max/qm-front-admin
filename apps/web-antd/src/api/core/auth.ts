import type { LoginPublicKey } from '#/api/login-crypto';

import { encryptLoginPassword } from '#/api/login-crypto';
import { authRequestClient, requestClient } from '#/api/request';
import { responseStatus } from '#/api/session';

export namespace AuthApi {
  export type Role = 'admin' | 'member' | 'owner' | 'platform_admin';

  export interface LoginParams {
    phone: string;
    password: string;
  }

  export interface UserTenant {
    id: string;
    name: string;

    role: Role;
    lastEnteredAt: null | string;
    status?: 'active' | 'disabled';
    expiresAt?: null | string;
  }
  export interface TenantSelection {
    requiresTenantSelection: true;
    selectionToken: string;
    expiresIn: number;
    user: Pick<LoginResult['user'], 'displayName' | 'id' | 'phone'>;
    tenants: UserTenant[];
  }
  export type LoginResponse = LoginResult | TenantSelection;
  export interface LoginResult {
    accessToken: string;
    expiresIn: number;
    refreshToken: string;
    tenant: { id: string; name: string };
    tokenType: 'Bearer';
    user: {
      displayName: string;
      phone: string;
      id: string;
      role: Role;
      isPlatformAdmin: boolean;
    };
  }

  export interface MeResult {
    user: LoginResult['user'];
    tenant: LoginResult['tenant'];
    isPlatformAdmin: boolean;
    expiresAt: string;
    role: Role;
    tenantId: string;
    tokenId: string;
    userId: string;
  }
}

export async function loginApi(data: AuthApi.LoginParams) {
  const key = await authRequestClient.get<LoginPublicKey>('/auth/public-key');
  const phone = data.phone.trim();
  const encryptedPassword = await encryptLoginPassword(
    data.password,
    key,
    phone,
  );
  return authRequestClient.post<AuthApi.LoginResponse>('/auth/login', {
    phone,
    encryptedPassword,
    keyId: key.keyId,
    challenge: key.challenge,
  });
}

export function selectTenantApi(selectionToken: string, tenantId: string) {
  return authRequestClient.post<AuthApi.LoginResult>('/auth/select-tenant', {
    selectionToken,
    tenantId,
  });
}
export function getMyTenantsApi() {
  return requestClient.get<{ items: AuthApi.UserTenant[] }>('/auth/tenants');
}
export function switchTenantApi(
  tenantId: string,
  refreshToken: string,
  accessToken: string,
) {
  return authRequestClient.post<AuthApi.LoginResult>(
    '/auth/switch-tenant',
    { tenantId, refreshToken },
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
}
export function getCurrentSessionApi() {
  return requestClient.get<AuthApi.MeResult>('/auth/me');
}

export function refreshTokenApi(refreshToken: string) {
  return authRequestClient.post<AuthApi.LoginResult>('/auth/refresh', {
    refreshToken,
  });
}

/** Logout uses an isolated client and never restores credentials locally. */
export async function logoutApi(
  accessToken: string,
  refreshToken: null | string,
) {
  const revoke = (access: string, refresh: null | string) =>
    authRequestClient.post(
      '/auth/logout',
      { refreshToken: refresh || undefined },
      {
        headers: { Authorization: `Bearer ${access}` },
      },
    );
  try {
    await revoke(accessToken, refreshToken);
  } catch (error) {
    if (responseStatus(error) !== 401 || !refreshToken) throw error;
    // Logout requires a valid access token. Rotate once if it expired while
    // idle, then revoke the resulting pair without restoring it in the UI.
    const next = await refreshTokenApi(refreshToken);
    await revoke(next.accessToken, next.refreshToken);
  }
}
