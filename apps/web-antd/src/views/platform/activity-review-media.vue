<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';

import { Alert, Button, Image, Spin } from 'ant-design-vue';

import { getPlatformActivityMedia } from '#/api/activity-lifecycle';

const props = defineProps<{
  activityId: string;
  url: string;
  kind: 'audio' | 'image' | 'video';
}>();
const signed = ref('');
const loading = ref(false);
const failed = ref(false);
let controller: AbortController | undefined;
async function load() {
  controller?.abort();
  const current = new AbortController();
  controller = current;
  signed.value = '';
  failed.value = false;
  loading.value = true;
  try {
    const result = await getPlatformActivityMedia(
      props.activityId,
      props.url,
      current.signal,
    );
    if (!current.signal.aborted) signed.value = result.url;
  } catch {
    if (!current.signal.aborted) failed.value = true;
  } finally {
    if (!current.signal.aborted) loading.value = false;
  }
}
watch(() => [props.activityId, props.url], load, { immediate: true });
onBeforeUnmount(() => controller?.abort());
</script>
<template>
  <Spin :spinning="loading">
    <Alert v-if="failed" type="warning" message="素材预览加载失败" class="my-2">
      <template #action>
<Button size="small" @click="load">重试</Button>
</template>
    </Alert>
    <template v-if="signed">
      <Image
        v-if="kind === 'image'"
        :src="signed"
        :style="{ maxWidth: '100%', maxHeight: '420px', objectFit: 'contain' }"
      />
      <video
        v-else-if="kind === 'video'"
        :src="signed"
        controls
        playsinline
        preload="metadata"
        class="max-h-[420px] w-full"
      ></video>
      <audio
        v-else
        :src="signed"
        controls
        preload="none"
        class="max-w-full"
      ></audio>
    </template>
  </Spin>
</template>
