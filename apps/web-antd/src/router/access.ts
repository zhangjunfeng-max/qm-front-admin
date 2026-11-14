import type { GenerateMenuAndRoutesOptions } from '@vben/types';

import { generateAccessible } from '@vben/access';

// Menus use the live company/platform identity; data scopes are enforced by APIs.
export async function generateAccess(options: GenerateMenuAndRoutesOptions) {
  options.signal?.throwIfAborted();
  return generateAccessible('frontend', {
    ...options,
    forbiddenComponent: () => import('#/views/_core/fallback/forbidden.vue'),
  });
}
