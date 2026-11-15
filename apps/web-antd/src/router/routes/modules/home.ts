import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    name: 'TenantHome',
    path: '/home',
    component: () => import('#/views/home/index.vue'),
    meta: {
      authority: ['admin', 'member'],
      icon: 'lucide:house',
      order: 0,
      title: '首页',
    },
  },
  {
    name: 'Account',
    path: '/account',
    component: () => import('#/views/account/index.vue'),
    meta: { hideInMenu: true, title: '当前账号' },
  },
];

export default routes;
