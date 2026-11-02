import type { RouteRecordRaw } from 'vue-router';
const routes: RouteRecordRaw[] = [
  {
    name: 'CustomerManagement',
    path: '/customers',
    component: () => import('#/views/management/customers.vue'),
    meta: {
      title: '客户管理',
      icon: 'lucide:contact-round',
      authority: ['owner', 'admin', 'activity_manager'],
      order: 6,
    },
  },
  {
    name: 'ActivityOrders',
    path: '/orders',
    component: () => import('#/views/management/orders.vue'),
    meta: {
      title: '活动订单',
      icon: 'lucide:clipboard-list',
      authority: ['owner', 'admin', 'activity_manager'],
      order: 7,
    },
  },
  {
    name: 'ActivityOrdersByActivity',
    path: '/activities/:id/orders',
    component: () => import('#/views/management/orders.vue'),
    meta: {
      title: '订单管理',
      authority: ['owner', 'admin', 'member'],
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
      authority: ['owner', 'admin'],
      order: 5,
    },
  },
  {
    name: 'ActivityManagement',
    path: '/activities',
    component: () => import('#/views/management/activities.vue'),
    meta: {
      authority: ['owner', 'admin', 'member'],
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
      authority: ['owner', 'admin', 'member'],
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
      authority: ['owner', 'admin'],
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
      authority: ['owner', 'admin'],
      order: 4,
    },
  },
];
export default routes;
