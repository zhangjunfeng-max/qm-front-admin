import type { AuthApi } from './core/auth';

export const PLATFORM_CONTEXT_ID = '00000000-0000-0000-0000-000000000000';

export function sessionContext(
  user: Pick<AuthApi.LoginResult['user'], 'isPlatformAdmin' | 'role'>,
  tenant: AuthApi.LoginResult['tenant'],
) {
  const currentTenant = tenant.id === PLATFORM_CONTEXT_ID ? null : tenant;
  return {
    currentTenant,
    homePath: currentTenant ? '/home' : '/platform/overview',
    roles: currentTenant
      ? [user.role]
      : user.isPlatformAdmin
        ? ['platform_admin']
        : [],
  };
}
