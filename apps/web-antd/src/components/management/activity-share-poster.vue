<script setup lang="ts">
import type { Activity } from '#/api/management';

import { onBeforeUnmount, ref, watch } from 'vue';

import { Alert, Button, Spin } from 'ant-design-vue';

import { previewActivityMedia } from '#/api/activity-media';
import { captureContext } from '#/api/context-lifecycle';
import { createSharePoster } from '#/utils/activity-share-poster';

const props = defineProps<{
  activity: Activity;
  codeUrl: string;
  channel?: 'h5' | 'miniapp';
}>();
const emit = defineEmits<{ ready: [image: string] }>();
const image = ref('');
const loading = ref(false);
const failed = ref(false);
let controller: AbortController | undefined;
let detach: (() => void) | undefined;
let version = 0;
function clear() {
  version++;
  controller?.abort();
  detach?.();
  detach = undefined;
  image.value = '';
  loading.value = false;
  failed.value = false;
  emit('ready', '');
}
async function generate() {
  clear();
  if (!props.codeUrl) return;
  const serial = version;
  const context = captureContext();
  const active = new AbortController();
  controller = active;
  context.signal.addEventListener('abort', clear, { once: true });
  detach = () => context.signal.removeEventListener('abort', clear);
  loading.value = true;
  try {
    const source = props.activity.shareImageUrl || props.activity.posterUrl;
    const url = source
      ? (await previewActivityMedia(source, props.activity.id)).url
      : '';
    context.assertCurrent();
    active.signal.throwIfAborted();
    const result = await createSharePoster({
      imageUrl: url,
      codeUrl: props.codeUrl,
      name: props.activity.name,
      text: props.activity.shareText,
      color: props.activity.themeColor,
      channel: props.channel || 'h5',
      signal: active.signal,
    });
    context.assertCurrent();
    if (version === serial && !active.signal.aborted) {
      image.value = result;
      emit('ready', result);
    }
  } catch {
    if (version === serial && !active.signal.aborted) failed.value = true;
  } finally {
    if (version === serial) loading.value = false;
  }
}
watch(
  () => [
    props.codeUrl,
    props.activity.id,
    props.activity.shareImageUrl,
    props.activity.posterUrl,
    props.activity.name,
    props.activity.shareText,
    props.activity.themeColor,
    props.channel,
  ],
  generate,
  { immediate: true },
);
onBeforeUnmount(clear);
</script>

<template>
  <Spin :spinning="loading">
    <div v-if="codeUrl" class="share-poster-preview">
      <img
        :src="image || codeUrl"
        :alt="
          image
            ? '活动分享海报'
            : channel === 'miniapp'
              ? '小程序码'
              : '活动二维码'
        "
        :class="{ 'code-only': !image }"
      />
    </div>
  </Spin>
  <Alert
    v-if="failed"
    class="mb-3"
    type="warning"
    message="海报生成失败，可重试或先分享活动链接"
  >
    <template #action>
<Button size="small" @click="generate">重试海报</Button>
</template>
  </Alert>
</template>

<style scoped>
.share-poster-preview {
  max-height: min(55vh, 580px);
  padding: 12px;
  margin-bottom: 16px;
  overflow-y: auto;
  background: #f5f5f5;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
}
.share-poster-preview img {
  display: block;
  width: 100%;
  max-width: 360px;
  height: auto;
  margin: 0 auto;
}
.share-poster-preview img.code-only {
  width: 240px;
  max-width: 100%;
}
</style>
