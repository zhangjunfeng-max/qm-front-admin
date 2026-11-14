<script setup lang="ts">
import type { MusicOption } from '#/api/music';

import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { Button, message, Select } from 'ant-design-vue';

import { getMusicOptions, previewMusic } from '#/api/music';

const props = defineProps<{
  current?: MusicOption | null;
  disabled?: boolean;
  activityId: string;
}>();
const selected = defineModel<null | string>({ required: true });
const rows = ref<MusicOption[]>([]);
const cache = new Map<string, MusicOption>();
const busy = ref(false);
const failed = ref(false);
const previewing = ref(false);
const audioUrl = ref('');
const keyword = ref('');
const page = ref(0);
const total = ref(0);
let previewSerial = 0;
let serial = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
const current = computed(() =>
  props.current?.id === selected.value
    ? props.current
    : cache.get(selected.value ?? ''),
);
const options = computed(() => {
  const values = new Map(rows.value.map((row) => [row.id, row]));
  if (current.value) values.set(current.value.id, current.value);
  return [...values.values()].map((row) => ({
    value: row.id,
    label: `${row.name}${row.status === 'disabled' ? ' · 已停用' : ''}`,
    disabled: row.status !== 'active',
  }));
});
function stopPreview() {
  ++previewSerial;
  audioUrl.value = '';
  previewing.value = false;
}
async function load(reset = false) {
  if (!reset && busy.value) return;
  const version = ++serial;
  if (reset) {
    rows.value = [];
    page.value = 0;
    total.value = 0;
  }
  busy.value = true;
  failed.value = false;
  try {
    const result = await getMusicOptions({
      page: page.value + 1,
      pageSize: 100,
      keyword: keyword.value || undefined,
    });
    if (version !== serial) return;
    rows.value = [...rows.value, ...result.items];
    for (const row of result.items) cache.set(row.id, row);
    page.value = result.page;
    total.value = result.total;
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
async function play() {
  if (!selected.value) return;
  const version = ++previewSerial;
  previewing.value = true;
  try {
    const result = await previewMusic(selected.value);
    if (version === previewSerial) audioUrl.value = result.url;
  } catch {
    /* API client displays the error. */
  } finally {
    if (version === previewSerial) previewing.value = false;
  }
}
watch(selected, stopPreview);
watch(
  () => props.activityId,
  () => {
    clearTimeout(timer);
    cache.clear();
    keyword.value = '';
    stopPreview();
    void load(true);
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  ++serial;
  clearTimeout(timer);
  stopPreview();
});
</script>
<template>
  <div>
    <div class="flex items-center gap-2">
      <Select
        :value="selected ?? undefined"
        class="min-w-0 flex-1"
        show-search
        allow-clear
        :filter-option="false"
        :options="options"
        :disabled="disabled"
        :loading="busy"
        placeholder="不使用背景音乐"
        :not-found-content="
          busy ? '加载中…' : failed ? '加载失败' : '暂无可用音乐'
        "
        @update:value="selected = typeof $event === 'string' ? $event : null"
        @search="search"
        @popup-scroll="scroll"
      />
      <Button
        :loading="previewing"
        :disabled="!selected || current?.status === 'disabled' || disabled"
        @click="audioUrl ? stopPreview() : play()"
      >
        {{ audioUrl ? '停止试听' : '试听' }}
      </Button>
    </div>
    <div v-if="failed" role="alert" class="mt-1 text-xs text-destructive">
      音乐加载失败<Button type="link" size="small" @click="load(true)">
        重试
      </Button>
    </div>
    <audio
      v-if="audioUrl"
      :src="audioUrl"
      autoplay
      controls
      class="mt-2 h-9 w-full"
      @error="
        stopPreview();
        message.error('音乐暂时无法播放，请重新试听');
      "
    ></audio>
  </div>
</template>
