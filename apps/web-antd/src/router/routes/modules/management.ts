import type { RouteRecordRaw } from 'vue-router';
const routes: RouteRecordRaw[] = [
  {
    name: 'CustomerManagement',
    path: '/customers',
    component: () => import('#/views/management/customers.vue'),
    meta: {
      title: '客户管理',
      icon: 'lucide:contact-round',
      authority: ['admin', 'member'],
      order: 6,
    },
  },
  // 免费报名版没有“订单”，报名记录只从活动详情/客户记录进入，不占菜单。
  {
    name: 'Registrations',
    path: '/registrations',
    component: () => import('#/views/management/registrations.vue'),
    meta: {
      title: '报名记录',
      authority: ['admin', 'member'],
      hideInMenu: true,
      activePath: '/activities',
      order: 7,
    },
  },
  {
    name: 'RegistrationsByActivity',
    path: '/activities/:id/registrations',
    component: () => import('#/views/management/registrations.vue'),
    meta: {
      title: '报名记录',
      authority: ['admin', 'member'],
      hideInMenu: true,
      activePath: '/activities',
    },
  },
  // 订单线（团购/付费活动）保留完整页面与接口，本期先不在菜单暴露。
  // hideInMenu 只影响导航渲染，路由本身可直达，功能不删。
  {
    name: 'ActivityOrders',
    path: '/orders',
    component: () => import('#/views/management/orders.vue'),
    meta: {
      title: '活动订单',
      icon: 'lucide:clipboard-list',
      authority: ['admin', 'member'],
      hideInMenu: true,
      order: 8,
    },
  },
  {
    name: 'ActivityOrdersByActivity',
    path: '/activities/:id/orders',
    component: () => import('#/views/management/orders.vue'),
    meta: {
      title: '订单管理',
      authority: ['admin', 'member'],
      hideInMenu: true,
      activePath: '/activities',
    },
  },
  {
    name: 'MiniappManagement',
    path: '/miniapps',
    component: () => import('#/views/management/miniapps.vue'),
    meta: {
      title: '小程序',
      icon: 'lucide:smartphone',
      authority: ['admin'],
      order: 5,
    },
  },
  {
    name: 'ActivityManagement',
    path: '/activities',
    component: () => import('#/views/management/activities.vue'),
    meta: {
      authority: ['admin', 'member'],
      title: '活动管理',
      icon: 'lucide:calendar-days',
      order: 2,
    },
  },
  {
    name: 'ActivityDetail',
    path: '/activities/:id',
    component: () => import('#/views/management/activity-detail.vue'),
    meta: {
      authority: ['admin', 'member'],
      title: '活动详情',
      hideInMenu: true,
      activePath: '/activities',
    },
  },
  {
    name: 'EmployeeManagement',
    path: '/employees',
    component: () => import('#/views/management/employees.vue'),
    meta: {
      title: '员工管理',
      icon: 'lucide:users',
      authority: ['admin'],
      order: 3,
    },
  },
  {
    name: 'StoreManagement',
    path: '/stores',
    component: () => import('#/views/management/stores.vue'),
    meta: {
      title: '门店管理',
      icon: 'lucide:store',
      authority: ['admin'],
      order: 4,
    },
  },
];
export default routes;
