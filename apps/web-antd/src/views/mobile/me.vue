<script setup lang="ts">
import { useRouter } from 'vue-router';

import { useUserStore } from '@vben/stores';

import { Button, Modal } from 'ant-design-vue';

import TenantSwitcher from '#/components/tenant/tenant-switcher.vue';
import { desktopPreferenceKey } from '#/router/mobile-navigation';
import { useAuthStore } from '#/store';
const users = useUserStore();
const auth = useAuthStore();
const router = useRouter();
function desktop() {
  localStorage.setItem(desktopPreferenceKey, 'yes');
  void router.replace('/home');
}
function logout() {
  Modal.confirm({
    title: '退出当前账号？',
    okText: '退出',
    cancelText: '取消',
    onOk: () => auth.logout(false),
  });
}
</script>
<template>
  <section class="m-block m-pad">
    <h2 class="m-title">{{ users.userInfo?.realName }}</h2>
    <p class="m-muted mt-1">{{ users.userInfo?.username }}</p>
    <dl class="m-dl mt-3">
      <div>
        <dt>当前公司</dt>
        <dd>{{ auth.currentTenant?.name }}</dd>
      </div>
      <div>
        <dt>公司身份</dt>
        <dd>
          {{ users.userInfo?.roles?.includes('admin') ? '公司管理员' : '员工' }}
        </dd>
      </div>
    </dl>
    <TenantSwitcher />
  </section>
  <section class="m-block">
    <RouterLink class="m-list-link" to="/m/rankings">
<span>公司本月排行榜</span><span>›</span>
</RouterLink><button class="m-list-link w-full" @click="desktop">
      <span>切换电脑版</span><span>›</span>
    </button>
  </section>
  <Button block danger @click="logout">退出登录</Button>
</template>
