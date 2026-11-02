import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    name: 'NotificationInbox',
    path: '/notifications',
    component: () => import('#/views/notifications/index.vue'),
    meta: {
      title: '通知中心',
      authority: [
        'owner',
        'admin',
        'member',
        'activity_manager',
        'platform_admin',
      ],
      hideInMenu: true,
    },
  },
];
export default routes;
