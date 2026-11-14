<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { createIconifyIcon } from '@vben/icons';
import { useUserStore } from '@vben/stores';

import { Button } from 'ant-design-vue';

import IcpFooter from '#/components/icp-footer.vue';
import TenantSwitcher from '#/components/tenant/tenant-switcher.vue';
import { useAuthStore } from '#/store';

import './mobile.css';
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const users = useUserStore();
const Back = createIconifyIcon('lucide:chevron-left');
const tabs = [
  {
    path: '/m/workbench',
    label: '工作台',
    icon: createIconifyIcon('lucide:layout-dashboard'),
  },
  {
    path: '/m/activities',
    label: '活动',
    icon: createIconifyIcon('lucide:calendar-days'),
  },
  {
    path: '/m/orders',
    label: '报名记录',
    icon: createIconifyIcon('lucide:clipboard-list'),
  },
  {
    path: '/m/me',
    label: '我的',
    icon: createIconifyIcon('lucide:user-round'),
  },
];
const back = computed(() =>
  route.path.startsWith('/m/orders/')
    ? { path: '/m/orders', query: route.query }
    : route.path.startsWith('/m/activities/')
      ? '/m/activities'
      : route.path === '/m/rankings'
        ? typeof route.query.activityId === 'string'
          ? `/m/activities/${route.query.activityId}`
          : '/m/workbench'
        : undefined,
);
</script>
<template>
  <div class="mobile-workspace">
    <header class="m-header">
      <div class="m-heading">
        <Button
          v-if="back"
          type="text"
          aria-label="返回"
          @click="router.push(back)"
          >
<Back />
</Button>
        <div class="m-header-title">
          <small>{{ auth.currentTenant?.name }}</small>
          <h1>{{ route.meta.title }}</h1>
        </div>
      </div>
      <TenantSwitcher />
    </header>
    <main
      v-if="!auth.switchingTenant && !auth.reloadingContext"
      :key="`${auth.currentTenant?.id}:${users.userInfo?.userId}`"
      class="m-main"
    >
      <RouterView :key="route.fullPath" />
      <IcpFooter />
    </main>
    <nav class="m-tabbar" aria-label="员工导航">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.path"
        :to="tab.path"
        :class="{ active: route.path.startsWith(tab.path) }"
        >
<component :is="tab.icon" /><span>{{ tab.label }}</span>
</RouterLink>
    </nav>
  </div>
</template>
