<script setup lang="ts">
import type { MiniappOption } from '#/api/management';

import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { Button, Select } from 'ant-design-vue';

import { getActivityMiniappOptions } from '#/api/management';
const props = defineProps<{
  activityId: string;
  current?: MiniappOption | null;
  disabled?: boolean;
}>();
const selected = defineModel<null | string>({ required: true });
const busy = defineModel<boolean>('busy', { default: false });
const failed = defineModel<boolean>('failed', { default: false });
const rows = ref<MiniappOption[]>([]);
const cache = ref<Record<string, MiniappOption>>({});
const keyword = ref('');
const page = ref(0);
const total = ref(0);
let serial = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
const options = computed(() => {
  const values = new Map(rows.value.map((r) => [r.id, r]));
  const current =
    props.current?.id === selected.value
      ? props.current
      : selected.value
        ? cache.value[selected.value]
        : undefined;
  if (current) values.set(current.id, current);
  return [...values.values()].map((r) => ({
    value: r.id,
    label: `${r.name}（${r.appid}）${r.status === 'disabled' ? ' · 已停用' : ''}${r.authorizationStatus === 'authorized' ? '' : ' · 未授权'}`,
    disabled: r.status !== 'active' || r.authorizationStatus !== 'authorized',
  }));
});
async function load(reset = false) {
  if (!reset && busy.value) return;
  const version = ++serial;
  if (reset) {
    rows.value = [];
    page.value = 0;
    total.value = 0;
  }
  const next = page.value + 1;
  busy.value = true;
  failed.value = false;
  try {
    const result = await getActivityMiniappOptions(props.activityId, {
      page: next,
      pageSize: 100,
      keyword: keyword.value || undefined,
    });
    if (version !== serial) return;
    rows.value = [...rows.value, ...result.items];
    for (const r of result.items) cache.value[r.id] = r;
    page.value = result.page;
    total.value = result.total;
    const only = result.items[0];
    if (
      reset &&
      !keyword.value &&
      !selected.value &&
      result.total === 1 &&
      only?.status === 'active' &&
      only.authorizationStatus === 'authorized'
    )
      selected.value = only.id;
  } catch {
    if (version === serial) failed.value = true;
  } finally {
    if (version === serial) busy.value = false;
  }
}
function search(value: string) {
  keyword.value = value;
  clearTimeout(timer);
  ++serial;
  busy.value = true;
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
watch(
  () => props.activityId,
  () => {
    clearTimeout(timer);
    ++serial;
    cache.value = {};
    keyword.value = '';
    void load(true);
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  ++serial;
  clearTimeout(timer);
});
</script>
<template>
  <div>
    <Select
      :value="selected ?? undefined"
      class="w-full"
      show-search
      :filter-option="false"
      :options="options"
      :disabled="disabled"
      :loading="busy"
      placeholder="请选择小程序"
      :not-found-content="
        busy ? '加载中…' : failed ? '加载失败' : '暂无可用小程序'
      "
      @update:value="selected = typeof $event === 'string' ? $event : null"
      @search="search"
      @popup-scroll="scroll"
    />
    <div v-if="failed" role="alert" class="mt-1 text-xs text-destructive">
      小程序加载失败
      <Button type="link" size="small" @click="load(true)">重试</Button>
    </div>
  </div>
</template>
