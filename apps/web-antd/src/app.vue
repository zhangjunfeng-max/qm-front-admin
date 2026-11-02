<script lang="ts" setup>
import { computed } from 'vue';

import { useAntdDesignTokens } from '@vben/hooks';
import { preferences, usePreferences } from '@vben/preferences';

import { App, ConfigProvider, theme } from 'ant-design-vue';

import { antdLocale } from '#/locales';
import { useAuthStore } from '#/store';

defineOptions({ name: 'App' });

const authStore = useAuthStore();

const { isDark } = usePreferences();
const { tokens } = useAntdDesignTokens();

const tokenTheme = computed(() => {
  const algorithm = isDark.value
    ? [theme.darkAlgorithm]
    : [theme.defaultAlgorithm];

  // antd 紧凑模式算法
  if (preferences.app.compact) {
    algorithm.push(theme.compactAlgorithm);
  }

  return {
    algorithm,
    token: tokens,
  };
});
</script>

<template>
  <ConfigProvider :locale="antdLocale" :theme="tokenTheme">
    <App>
      <div
        v-if="authStore.switchingTenant || authStore.reloadingContext"
        class="flex min-h-screen items-center justify-center"
        role="status"
      >
        正在切换公司，请稍候…
      </div>
      <RouterView v-else />
    </App>
  </ConfigProvider>
</template>
