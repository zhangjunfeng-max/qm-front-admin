import type { GenerateMenuAndRoutesOptions } from '@vben/types';

import { generateAccessible } from '@vben/access';

import { getCustomerManagementAccess } from '#/api/customer-management';

// The backend authorizes every API. Menus use the verified role from /auth/me.
export async function generateAccess(options: GenerateMenuAndRoutesOptions) {
  const roles = [...(options.roles ?? [])];
  if (roles.includes('member')) {
    const access = await getCustomerManagementAccess();
    options.signal?.throwIfAborted();
    if (access.canManageOrders) roles.push('activity_manager');
  }
  return generateAccessible('frontend', {
    ...options,
    roles,
    forbiddenComponent: () => import('#/views/_core/fallback/forbidden.vue'),
  });
}
