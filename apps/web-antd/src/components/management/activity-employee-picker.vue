<script setup lang="ts">
import type { Employee } from '#/api/management';

import { computed, onBeforeUnmount, ref, watch } from 'vue';

import {
  Alert,
  Button,
  InputSearch,
  message,
  Pagination,
  Table,
} from 'ant-design-vue';

import { getEmployeeOptions } from '#/api/management';

const props = defineProps<{
  activityId: string;
  open: boolean;
  disabled?: boolean;
  max?: number;
}>();
const selected = defineModel<string[]>({ required: true });
const busy = defineModel<boolean>('busy', { default: false });
const rows = ref<Employee[]>([]);
const keyword = ref('');
const appliedKeyword = ref('');
const page = ref(1);
const pageSize = ref(10);
const total = ref(0);
const loading = ref(false);
const error = ref('');
watch(
  loading,
  () => {
    busy.value = loading.value;
  },
  { flush: 'sync' },
);
let request = 0;

const selection = computed(() => ({
  selectedRowKeys: selected.value,
  preserveSelectedRowKeys: true,
  onChange: (keys: (number | string)[]) => {
    if (keys.length > (props.max ?? 1000)) {
      message.warning(`每次最多选择 ${props.max ?? 1000} 人`);
      return;
    }
    selected.value = keys.map(String);
  },
  getCheckboxProps: () => ({ disabled: loading.value || props.disabled }),
}));

async function load() {
  const serial = ++request;
  loading.value = true;
  error.value = '';
  try {
    const result = await getEmployeeOptions(props.activityId, {
      page: page.value,
      pageSize: pageSize.value,
      keyword: appliedKeyword.value || undefined,
    });
    if (serial !== request) return;
    rows.value = result.items;
    total.value = result.total;
  } catch {
    if (serial === request) {
      rows.value = [];
      error.value = '员工加载失败，请重试';
    }
  } finally {
    if (serial === request) loading.value = false;
  }
}
function search() {
  appliedKeyword.value = keyword.value.trim();
  page.value = 1;
  void load();
}
function change(next: number, size: number) {
  page.value = size === pageSize.value ? next : 1;
  pageSize.value = size;
  void load();
}
watch(
  () => [props.open, props.activityId],
  () => {
    ++request;
    loading.value = false;
    if (props.open) {
      keyword.value = '';
      appliedKeyword.value = '';
      page.value = 1;
      rows.value = [];
      total.value = 0;
      void load();
    }
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  ++request;
});
</script>

<template>
  <div>
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <InputSearch
        v-model:value="keyword"
        class="w-60"
        placeholder="搜索姓名、手机号"
        allow-clear
        :disabled="loading || disabled"
        @search="search"
      />
      <Button
        :disabled="loading || disabled || !selected.length"
        @click="selected = []"
      >
        清空选择
      </Button>
      <span class="text-sm text-muted-foreground">已选 {{ selected.length }} 人</span>
    </div>
    <Alert v-if="error" :message="error" type="error" class="mb-2">
      <template #action>
        <Button size="small" @click="load">重试</Button>
      </template>
    </Alert>
    <Table
      row-key="userId"
      size="small"
      :row-selection="selection"
      :data-source="rows"
      :loading="loading"
      :pagination="false"
      :scroll="{ y: 260, x: 400 }"
      :columns="[
        { title: '姓名', dataIndex: 'displayName', ellipsis: true },
        { title: '手机号', dataIndex: 'phone', width: 150 },
      ]"
    />
    <div class="mt-3 flex justify-end">
      <Pagination
        :current="page"
        :page-size="pageSize"
        :total="total"
        size="small"
        show-size-changer
        :disabled="loading || disabled"
        :show-total="(n: number) => `共 ${n} 人`"
        @change="change"
      />
    </div>
  </div>
</template>
