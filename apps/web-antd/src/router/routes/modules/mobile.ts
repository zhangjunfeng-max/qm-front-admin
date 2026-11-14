import type { RouteRecordRaw } from 'vue-router';
const routes: RouteRecordRaw[] = [
  {
    name: 'EmployeeMobile',
    path: '/m',
    component: () => import('#/views/mobile/layout.vue'),
    redirect: '/m/workbench',
    meta: {
      title: '员工工作台',
      authority: ['admin', 'member'],
      noBasicLayout: true,
      hideInMenu: true,
      hideInTab: true,
    },
    children: [
      {
        name: 'MobileWorkbench',
        path: 'workbench',
        component: () => import('#/views/mobile/workbench.vue'),
        meta: { title: '工作台' },
      },
      {
        name: 'MobileActivities',
        path: 'activities',
        component: () => import('#/views/mobile/activities.vue'),
        meta: { title: '活动' },
      },
      {
        name: 'MobileActivity',
        path: 'activities/:id',
        component: () => import('#/views/mobile/activity.vue'),
        meta: { title: '活动工作台' },
      },
      {
        name: 'MobileOrders',
        path: 'orders',
        component: () => import('#/views/mobile/orders.vue'),
        meta: { title: '报名记录' },
      },
      {
        name: 'MobileOrder',
        path: 'orders/:id',
        component: () => import('#/views/mobile/order.vue'),
        meta: { title: '报名详情' },
      },
      {
        name: 'MobileRankings',
        path: 'rankings',
        component: () => import('#/views/mobile/rankings.vue'),
        meta: { title: '业绩排行榜' },
      },
      {
        name: 'MobileMe',
        path: 'me',
        component: () => import('#/views/mobile/me.vue'),
        meta: { title: '我的' },
      },
    ],
  },
];
export default routes;
