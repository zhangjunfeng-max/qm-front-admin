<script setup lang="ts">
import type { StoreOption } from '#/api/management';

import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { Button, Select } from 'ant-design-vue';

import { collectSelection } from '#/api/batch-selection';
import { getActivityStoreOptions } from '#/api/management';

const props = defineProps<{
  open: boolean;
  disabled?: boolean;
  activityId: string;
  selectedStores: StoreOption[];
}>();
const selected = defineModel<string[]>({ required: true });
const busy = defineModel<boolean>('busy', { default: false });
const rows = ref<StoreOption[]>([]);
const cache = ref<Record<string, StoreOption>>({});
const loading = ref(false);
const failed = ref(false);
const selecting = ref(false);
const selectionError = ref('');
watch(
  selecting,
  (value) => {
    busy.value = value;
  },
  { flush: 'sync' },
);
let selectionVersion = 0;
const keyword = ref('');
const page = ref(0);
const total = ref(0);
let request = 0;
let timer: ReturnType<typeof setTimeout> | undefined;

const options = computed(() => {
  const byId = new Map(rows.value.map((s) => [s.id, s]));
  const known = { ...cache.value };
  for (const store of props.selectedStores) known[store.id] = store;
  for (const id of selected.value) {
    const store = known[id];
    if (store) byId.set(id, store);
  }
  return [...byId.values()].map((s) => ({
    value: s.id,
    label: `${s.name}${s.status === 'disabled' ? '（已停用）' : ''}`,
    title: s.address || s.name,
    disabled: s.status === 'disabled' && !selected.value.includes(s.id),
  }));
});

async function load(reset = false) {
  if (!reset && loading.value) return;
  const serial = ++request;
  if (reset) {
    rows.value = [];
    page.value = 0;
    total.value = 0;
  }
  const next = page.value + 1;
  loading.value = true;
  failed.value = false;
  try {
    const result = await getActivityStoreOptions(props.activityId, {
      page: next,
      pageSize: 100,
      keyword: keyword.value || undefined,
    });
    if (serial !== request) return;
    rows.value = [...rows.value, ...result.items];
    for (const store of result.items) cache.value[store.id] = store;
    page.value = result.page;
    total.value = result.total;
  } catch {
    if (serial === request) failed.value = true;
  } finally {
    if (serial === request) loading.value = false;
  }
}
function search(value: string) {
  ++selectionVersion;
  selecting.value = false;
  keyword.value = value;
  clearTimeout(timer);
  // Invalidate in-flight results immediately while the next search is debounced.
  ++request;
  timer = setTimeout(() => void load(true), 250);
}
function scroll(event: UIEvent) {
  const target = event.target as HTMLElement;
  if (
    target.scrollTop + target.clientHeight >= target.scrollHeight - 32 &&
    rows.value.length < total.value
  )
    void load();
}
async function selectAll() {
  if (props.disabled || selecting.value) return;
  const version = ++selectionVersion;
  const id = props.activityId;
  const filter = keyword.value;
  selecting.value = true;
  selectionError.value = '';
  try {
    const stores = await collectSelection(
      (p, size) =>
        getActivityStoreOptions(id, {
          page: p,
          pageSize: size,
          keyword: filter || undefined,
        }),
      (s) => s.id,
      500,
    );
    if (version !== selectionVersion) return;
    const ids = [
      ...new Set([
        ...selected.value,
        ...stores.filter((s) => s.status === 'active').map((s) => s.id),
      ]),
    ];
    if (ids.length > 500)
      throw new Error('每个活动最多选择 500 家门店，请缩小筛选范围');
    for (const store of stores) cache.value[store.id] = store;
    selected.value = ids;
  } catch (error) {
    if (version === selectionVersion)
      selectionError.value =
        error instanceof Error ? error.message : '全选失败，请重试';
  } finally {
    if (version === selectionVersion) selecting.value = false;
  }
}
watch(
  () => [props.open, props.activityId],
  () => {
    clearTimeout(timer);
    ++selectionVersion;
    selecting.value = false;
    selectionError.value = '';
    ++request;
    loading.value = false;
    if (props.open) {
      cache.value = {};
      keyword.value = '';
      void load(true);
    }
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  ++selectionVersion;
  clearTimeout(timer);
  ++request;
});
</script>

<template>
  <div>
    <Select
      v-model:value="selected"
      mode="multiple"
      show-search
      allow-clear
      class="w-full"
      placeholder="选择参与门店，可多选"
      :options="options"
      :loading="loading || selecting"
      :disabled="selecting || disabled"
      :filter-option="false"
      :not-found-content="
        loading ? '加载中…' : failed ? '加载失败' : '暂无匹配的启用门店'
      "
      @search="search"
      @popup-scroll="scroll"
    />
    <div
      class="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
    >
      <Button
        type="link"
        size="small"
        :loading="selecting"
        :disabled="disabled"
        @click="selectAll"
      >
        全选{{ keyword ? '搜索结果' : '启用门店' }}
      </Button>
      <Button
        type="link"
        size="small"
        :disabled="selecting || disabled || !selected.length"
        @click="selected = []"
      >
        清空
      </Button>
      <span>已选 {{ selected.length }} 家</span>
    </div>
    <div
      v-if="selectionError"
      role="alert"
      class="mt-1 text-xs text-destructive"
    >
      {{ selectionError }}
    </div>
    <div v-if="failed" class="mt-1 text-xs text-muted-foreground">
      门店加载失败
      <Button type="link" size="small" @click="load(true)">重试</Button>
    </div>
  </div>
</template>
