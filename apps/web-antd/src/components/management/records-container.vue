<script setup lang="ts">
import { Alert, Button, Pagination } from 'ant-design-vue';

import ListShell from './list-shell.vue';

defineProps<{
  embedded?: boolean;
  title: string;
  loading: boolean;
  failed: boolean;
  page: number;
  pageSize: number;
  total: number;
}>();
const emit = defineEmits<{
  reload: [];
  change: [page: number, size: number];
}>();
</script>
<template>
  <ListShell
    v-if="!embedded"
    v-bind="{ title, loading, failed, page, pageSize, total }"
    @reload="emit('reload')"
    @change="(p, s) => emit('change', p, s)"
  >
    <template #filters><slot name="filters" /></template>
    <slot />
    <template #dialogs><slot name="dialogs" /></template>
  </ListShell>
  <div v-else class="flex min-h-[420px] min-w-0 flex-col gap-4">
    <div class="flex flex-wrap items-center gap-3">
      <slot name="filters" />
      <Button :loading="loading" @click="emit('reload')">刷新</Button>
    </div>
    <Alert v-if="failed" type="error" message="报名记录加载失败">
      <template #action><Button @click="emit('reload')">重试</Button></template>
    </Alert>
    <div class="min-h-0 flex-1 overflow-auto"><slot /></div>
    <Pagination
      class="self-end"
      :current="page"
      :page-size="pageSize"
      :total="total"
      show-size-changer
      responsive
      :show-total="(n: number) => `共 ${n} 条`"
      @change="(p: number, s: number) => emit('change', p, s)"
    />
    <slot name="dialogs" />
  </div>
</template>
