<script setup lang="ts">
import type { ActivityPreview } from '#/api/activity-workspace';

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { Alert, Button, Modal, Spin } from 'ant-design-vue';

import { getActivityPreview } from '#/api/activity-workspace';
import { captureContext } from '#/api/context-lifecycle';

const props = defineProps<{ open: boolean; activityId: string }>();
const emit = defineEmits<{ close: [] }>();
const data = ref<ActivityPreview>();
const loading = ref(false);
const failed = ref(false);
const frame = ref<HTMLIFrameElement>();
const previewUrl = computed(() => {
  const url = new URL(
    import.meta.env.VITE_ACTIVITY_H5_URL || '/',
    window.location.origin,
  );
  url.search = '?preview=1';
  url.hash = '#/pages/index/index';
  return url;
});
function sendPreview() {
  if (data.value && props.open)
    frame.value?.contentWindow?.postMessage(
      {
        type: 'group-activity-preview',
        detail: JSON.parse(JSON.stringify(data.value)),
      },
      previewUrl.value.origin,
    );
}
function receive(event: MessageEvent) {
  if (
    event.source === frame.value?.contentWindow &&
    event.origin === previewUrl.value.origin &&
    event.data?.type === 'group-activity-preview-ready'
  )
    sendPreview();
}
onMounted(() => window.addEventListener('message', receive));
let request = 0;
let detachContext: (() => void) | undefined;
let controller: AbortController | undefined;
async function load() {
  const serial = ++request;
  controller?.abort();
  controller = new AbortController();
  const context = captureContext();
  detachContext?.();
  const invalidate = () => {
    request++;
    controller?.abort();
    data.value = undefined;
    loading.value = false;
    emit('close');
  };
  context.signal.addEventListener('abort', invalidate, { once: true });
  detachContext = () => context.signal.removeEventListener('abort', invalidate);
  data.value = undefined;
  loading.value = true;
  failed.value = false;
  try {
    const result = await getActivityPreview(
      props.activityId,
      controller.signal,
    );
    context.assertCurrent();
    if (request === serial) {
      data.value = result;
      sendPreview();
    }
  } catch {
    if (request === serial) failed.value = true;
  } finally {
    if (request === serial) loading.value = false;
  }
}
watch(
  () => [props.open, props.activityId],
  () => {
    if (props.open) void load();
    else {
      request++;
      controller?.abort();
      detachContext?.();
      data.value = undefined;
    }
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  request++;
  controller?.abort();
  detachContext?.();
  window.removeEventListener('message', receive);
});
</script>

<template>
  <Modal
    :open="open"
    title="活动预览"
    :footer="null"
    :width="460"
    @cancel="emit('close')"
  >
    <p class="mb-3 text-sm text-muted-foreground">
      仅供内部预览，客户需在活动发布后访问。
    </p>
    <Spin :spinning="loading">
      <Alert v-if="failed" type="error" message="预览加载失败">
        <template #action><Button @click="load">重试</Button></template>
      </Alert>
      <iframe
        v-if="data"
        ref="frame"
        :src="previewUrl.href"
        title="活动页面预览"
        class="activity-preview"
        @load="sendPreview"
      ></iframe>
    </Spin>
  </Modal>
</template>

<style scoped>
.activity-preview {
  width: 100%;
  height: 70vh;
  border: 1px solid hsl(var(--border));
}
</style>
