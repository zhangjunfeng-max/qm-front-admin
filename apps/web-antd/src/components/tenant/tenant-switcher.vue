<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { ChevronDown } from '@vben/icons';

import { Alert, Button, Dropdown, Spin } from 'ant-design-vue';

import { PLATFORM_CONTEXT_ID } from '#/api/company-context';
import { useAuthStore } from '#/store';

import TenantList from './tenant-list.vue';
const authStore = useAuthStore();
const open = ref(false);
const loading = ref(false);
const failed = ref(false);
const loaded = ref(false);
const visible = computed(
  () =>
    authStore.profile?.isPlatformAdmin ||
    (loaded.value && authStore.availableTenants.length > 1),
);
async function load() {
  if (loading.value) return;
  loading.value = true;
  failed.value = false;
  try {
    await authStore.loadTenants();
    loaded.value = true;
  } catch {
    failed.value = true;
  } finally {
    loading.value = false;
  }
}
async function select(id: string) {
  if (id === authStore.currentTenant?.id) {
    open.value = false;
    return;
  }
  try {
    await authStore.switchTenant(id);
  } catch {
    /* The store displays the error. */
  }
}
onMounted(load);
</script>
<template>
  <Dropdown
    v-if="visible"
    v-model:open="open"
    :trigger="['click']"
    placement="bottomLeft"
    @open-change="(value: boolean) => value && load()"
  >
    <Button
      type="text"
      :loading="authStore.switchingTenant"
      aria-label="切换公司"
      :aria-expanded="open"
      class="tenant-switcher-trigger h-8 max-w-[220px] px-3"
    >
      <span class="tenant-switcher-content min-w-0 max-w-full gap-2">
        <span class="tenant-switcher-name truncate font-medium leading-5">
          {{
            authStore.currentTenant?.name ||
            (authStore.profile?.isPlatformAdmin ? '平台管理' : '选择公司')
          }}
        </span>
        <ChevronDown
          aria-hidden="true"
          class="text-muted-foreground size-4 shrink-0 transition-transform"
          :class="{ 'rotate-180': open }"
        />
      </span>
    </Button>
    <template #overlay>
      <div
        class="bg-popover text-popover-foreground w-[360px] max-w-[calc(100vw-32px)] rounded-xl border p-4 shadow-lg"
      >
        <Alert
          v-if="failed"
          type="error"
          message="公司列表加载失败"
          class="mb-3"
        >
          <template #action>
            <Button type="link" size="small" @click="load">重试</Button>
          </template>
        </Alert>
        <div
          v-if="authStore.profile?.isPlatformAdmin"
          class="mb-3 flex items-center justify-between gap-2 border-b pb-3"
        >
          <span class="text-muted-foreground text-xs">可切换所有公司，每次仅查看当前公司数据</span>
          <Button
            size="small"
            :disabled="!authStore.currentTenant || authStore.switchingTenant"
            @click="select(PLATFORM_CONTEXT_ID)"
          >
            平台管理
          </Button>
        </div>
        <Spin :spinning="loading || authStore.switchingTenant">
          <TenantList
            :items="authStore.availableTenants"
            :platform="authStore.profile?.isPlatformAdmin"
            :selected-id="authStore.currentTenant?.id"
            :disabled="loading || authStore.switchingTenant"
            @select="select"
          />
        </Spin>
      </div>
    </template>
  </Dropdown>
  <Button
    v-else-if="failed"
    type="text"
    :loading="loading"
    aria-label="重新加载公司列表"
    title="公司列表加载失败，点击重试"
    @click="load"
  >
    重试
  </Button>
</template>

<style scoped>
/* Keep the trigger aligned when Ant Design's button span styles take precedence over utilities. */
.tenant-switcher-trigger,
.tenant-switcher-content {
  display: inline-flex;
  align-items: center;
}

.tenant-switcher-name {
  display: block;
}

@media (max-width: 767px) {
  .tenant-switcher-trigger {
    max-width: min(180px, calc(100vw - 180px));
    padding-inline: 8px;
  }
}
</style>
