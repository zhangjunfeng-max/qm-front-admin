<script setup lang="ts">
import type { Notice, NoticeQuery } from '#/api/notifications';

import { computed, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import {
  Alert,
  Button,
  Card,
  Empty,
  Select,
  Space,
  Spin,
  Tag,
} from 'ant-design-vue';

import { useNotificationStore } from '#/store/notifications';
import { dateTime } from '#/views/home/format';

import {
  notificationTypeColor,
  notificationTypeLabel,
  notificationTypeOptions,
} from './notification-types';

const pageSize = 15;
const center = useNotificationStore();
const router = useRouter();
const selectedKind = ref('all');
const items = ref<Notice[]>([]);
const total = ref(0);
const loading = ref(false);
const failed = ref(false);
let requestVersion = 0;

const typeOptions = computed(() =>
  notificationTypeOptions(center.scope ?? 'admin'),
);
async function load() {
  const current = ++requestVersion;
  const context = center.contextVersion;
  if (!center.scope) {
    items.value = [];
    total.value = 0;
    loading.value = false;
    failed.value = false;
    return;
  }
  loading.value = true;
  failed.value = false;
  const query: NoticeQuery = {
    page: 1,
    pageSize,
    status: 'unread',
  };
  if (selectedKind.value !== 'all') query.kind = selectedKind.value;
  try {
    const result = await center.list(query);
    if (
      current !== requestVersion ||
      context !== center.contextVersion ||
      !result
    )
      return;
    items.value = result.items;
    total.value = result.total;
  } catch {
    if (current === requestVersion && context === center.contextVersion) {
      items.value = [];
      total.value = 0;
      failed.value = true;
    }
  } finally {
    if (current === requestVersion && context === center.contextVersion)
      loading.value = false;
  }
}

async function openNotice(id: string) {
  await center.activate(id, (link) => router.push(link));
}

watch(
  [
    () => center.contextVersion,
    () => center.revision,
    () => center.refreshVersion,
  ],
  () => void load(),
  { immediate: true },
);
watch(
  () => center.scope,
  () => {
    const allowed = new Set(typeOptions.value.map((item) => item.value));
    if (!allowed.has(selectedKind.value)) selectedKind.value = 'all';
  },
);
watch(selectedKind, () => void load());
onUnmounted(() => {
  requestVersion++;
});
</script>

<template>
  <Card
    size="small"
    class="home-notifications-panel min-w-0"
    data-home-notifications
  >
    <template #title>
      <div class="flex items-center gap-2">
        <span>待处理通知</span>
        <Tag v-if="total" color="blue">{{ total }}</Tag>
      </div>
    </template>
    <template #extra>
      <Space :size="8" wrap>
        <Select
          v-model:value="selectedKind"
          :options="typeOptions"
          size="small"
          class="min-w-28"
          aria-label="通知类型"
        />
        <Button size="small" :loading="loading" @click="load">刷新</Button>
        <Button size="small" type="link" @click="router.push('/notifications')">
          通知中心
        </Button>
      </Space>
    </template>
    <Alert v-if="failed" type="error" message="通知加载失败" show-icon>
      <template #action>
        <Button size="small" @click="load">重试</Button>
      </template>
    </Alert>
    <Spin :spinning="loading">
      <div
        v-if="!failed && !items.length"
        class="flex min-h-[96px] items-center justify-center"
      >
        <Empty
          :image="Empty.PRESENTED_IMAGE_SIMPLE"
          :description="
            selectedKind === 'all' ? '暂无未处理通知' : '该类型暂无未处理通知'
          "
        />
      </div>
      <div
        v-else-if="items.length"
        class="grid grid-cols-1 gap-1 md:grid-cols-2 xl:grid-cols-3"
      >
        <button
          v-for="notice in items"
          :key="notice.id"
          type="button"
          class="flex w-full min-w-0 flex-col gap-1 rounded-sm px-2 py-1.5 text-left hover:bg-muted/60"
          :disabled="Boolean(center.openingId)"
          @click="openNotice(notice.id)"
        >
          <div class="flex min-w-0 items-center gap-2">
            <Tag :color="notificationTypeColor(notice.kind)">
              {{ notificationTypeLabel(notice.kind) }}
            </Tag>
            <strong class="min-w-0 flex-1 truncate font-medium">
              {{ notice.title }}
            </strong>
            <span class="text-muted-foreground shrink-0 text-xs">
              {{ dateTime(notice.createdAt) }}
            </span>
          </div>
          <p class="text-muted-foreground line-clamp-1 text-sm">
            {{ notice.message }}
          </p>
        </button>
      </div>
    </Spin>
  </Card>
</template>

<style scoped>
.home-notifications-panel :deep(.ant-card-body) {
  max-height: 360px;
  padding: 8px;
  overflow-y: auto;
}

.home-notifications-panel :deep(.ant-card-head) {
  min-height: 38px;
  padding-inline: 10px;
}

.home-notifications-panel :deep(.ant-card-head-title) {
  padding-block: 8px;
}
</style>
