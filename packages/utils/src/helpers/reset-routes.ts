import type { Router, RouteRecordRaw } from 'vue-router';

import { cloneDeep } from '@vben-core/shared/utils';

/** Restore the static route tree so removed dynamic children cannot be re-added. */
export function resetStaticRoutes(router: Router, routes: RouteRecordRaw[]) {
  for (const { name } of router.getRoutes()) {
    if (name && router.hasRoute(name)) {
      router.removeRoute(name);
    }
  }
  for (const route of cloneDeep(routes)) {
    router.addRoute(route);
  }
}
