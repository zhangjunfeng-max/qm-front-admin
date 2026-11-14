import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    name: 'PlatformPaymentConfiguration',
    path: '/platform/payments',
    component: () => import('#/views/platform/payments.vue'),
    meta: {
      authority: ['platform_admin'],
      icon: 'lucide:wallet-cards',
      order: 9,
      title: '支付配置',
    },
  },
  {
    name: 'PlatformMusicManagement',
    path: '/platform/music',
    component: () => import('#/views/platform/music.vue'),
    meta: {
      authority: ['platform_admin'],
      icon: 'lucide:music',
      order: 12,
      title: '音乐管理',
    },
  },
  {
    name: 'PlatformActivityReview',
    path: '/platform/activities',
    component: () => import('#/views/platform/activities.vue'),
    meta: {
      authority: ['platform_admin'],
      icon: 'lucide:clipboard-check',
      order: 5,
      title: '活动审核',
    },
  },
  {
    name: 'PlatformOverview',
    path: '/platform/overview',
    component: () => import('#/views/platform/overview.vue'),
    meta: {
      authority: ['platform_admin'],
      icon: 'lucide:chart-no-axes-combined',
      order: 0,
      title: '平台首页',
    },
  },
  {
    name: 'PlatformUserManagement',
    path: '/platform/users',
    component: () => import('#/views/platform/users.vue'),
    meta: {
      authority: ['platform_admin'],
      icon: 'lucide:users-round',
      order: 11,
      title: '用户管理',
    },
  },
  {
    name: 'PlatformTenantManagement',
    path: '/platform/tenants',
    component: () => import('#/views/platform/tenants.vue'),
    meta: {
      authority: ['platform_admin'],
      icon: 'lucide:building-2',
      order: 10,
      title: '公司管理',
    },
  },
];
export default routes;
