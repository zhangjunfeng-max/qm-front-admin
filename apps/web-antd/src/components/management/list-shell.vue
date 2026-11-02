<script setup lang="ts">
import { Page } from '@vben/common-ui';

import { Alert, Button, Card, Pagination } from 'ant-design-vue';
withDefaults(
  defineProps<{
    title: string;
    description?: string;
    loading: boolean;
    failed: boolean;
    page: number;
    pageSize: number;
    total: number;
  }>(),
  { description: '' },
);
const emit = defineEmits<{
  reload: [];
  change: [page: number, size: number];
}>();
</script>
<template>
  <Page
    :title="title"
    :description="description"
    auto-content-height
    content-class="flex flex-col gap-4"
  >
    <template #extra>
      <slot name="extra"></slot>
      <Button class="ml-2" :loading="loading" @click="emit('reload')">
        刷新
      </Button>
    </template>
    <Alert
      v-if="failed"
      type="error"
      message="加载失败，请重试"
      show-icon
      class="shrink-0"
    >
      <template #action>
        <Button @click="emit('reload')">重试</Button>
      </template>
    </Alert>
    <Card
      class="flex min-h-[480px] flex-1 flex-col"
      :body-style="{
        display: 'flex',
        flexDirection: 'column',
        flex: '1',
        minHeight: 0,
      }"
    >
      <div
        class="mb-4 flex shrink-0 flex-wrap items-center gap-3 management-filters"
      >
        <slot name="filters"></slot>
      </div>
      <div class="management-table-region min-h-0 flex-1 overflow-auto">
        <slot></slot>
      </div>
      <div class="mt-4 flex shrink-0 justify-end border-t border-border pt-4">
        <Pagination
          :current="page"
          :page-size="pageSize"
          :total="total"
          show-size-changer
          :show-total="(n: number) => `共 ${n} 条`"
          @change="(p: number, s: number) => emit('change', p, s)"
        />
      </div>
    </Card>
    <slot name="dialogs"></slot>
  </Page>
</template>
<style scoped>
.management-table-region :deep(.ant-table-thead > tr > th) {
  position: sticky;
  top: 0;
  z-index: 2;
}

.management-table-region :deep(.ant-table-content) {
  overflow: visible !important;
}

.management-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.management-filters :deep(.ant-input-search) {
  width: 288px;
  max-width: 100%;
}

.management-filters :deep(.ant-select) {
  min-width: 144px;
}
</style>
