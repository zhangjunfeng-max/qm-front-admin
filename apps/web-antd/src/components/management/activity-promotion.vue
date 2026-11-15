<script setup lang="ts">
import type { Activity } from '#/api/management';

import { computed, onBeforeUnmount, ref, watch } from 'vue';

import {
  Alert,
  Button,
  Input,
  message,
  Modal,
  Space,
  Spin,
} from 'ant-design-vue';
import QRCode from 'qrcode';

import {
  buildActivityH5Url,
  generateActivityEntry,
  generateActivityMiniappCode,
  promotionImageExtension,
} from '#/api/activity-promotion';
import { captureContext } from '#/api/context-lifecycle';

import ActivitySharePoster from './activity-share-poster.vue';

const props = defineProps<{
  activity: Activity;
  open: boolean;
  salesId?: string;
}>();
const emit = defineEmits<{ close: [] }>();
const h5Url = ref('');
const h5Qr = ref('');
const h5Poster = ref('');
const miniappPoster = ref('');
const h5Error = ref('');
const h5Loading = ref(false);
const miniappCode = ref('');
const miniappError = ref(false);
const generating = ref(false);
const ready = ref(false);
const published = computed(
  () =>
    props.activity.storedStatus === 'published' ||
    ['ended', 'published', 'running'].includes(props.activity.status),
);
const promotable = computed(() => ready.value && published.value);
const isMiniapp = computed(() => props.activity.channel === 'miniapp');
const miniappAvailable = computed(
  () =>
    isMiniapp.value &&
    props.activity.miniapp?.status === 'active' &&
    props.activity.miniapp.authorizationStatus === 'authorized',
);
let lifetime = 0;
let controller: AbortController | undefined;
let context: ReturnType<typeof captureContext> | undefined;
let detachContext: (() => void) | undefined;

function clear() {
  ++lifetime;
  detachContext?.();
  detachContext = undefined;
  controller?.abort();
  controller = undefined;
  context = undefined;
  ready.value = false;
  h5Url.value = '';
  h5Qr.value = '';
  h5Poster.value = '';
  miniappPoster.value = '';
  h5Error.value = '';
  h5Loading.value = false;
  miniappCode.value = '';
  miniappError.value = false;
  generating.value = false;
}
function current(version = lifetime) {
  if (
    version !== lifetime ||
    !props.open ||
    !ready.value ||
    controller?.signal.aborted
  )
    return false;
  try {
    context?.assertCurrent();
    return true;
  } catch {
    clear();
    return false;
  }
}
async function prepareH5(version: number) {
  if (!promotable.value || isMiniapp.value) return;
  h5Loading.value = true;
  try {
    const entry = await generateActivityEntry(
      props.activity.id,
      controller!.signal,
      props.salesId,
    );
    if (!current(version)) return;
    h5Url.value = buildActivityH5Url(
      import.meta.env.VITE_ACTIVITY_H5_URL ?? '',
      entry.code,
    );
    const dataUrl = await QRCode.toDataURL(h5Url.value, {
      width: 392,
      margin: 4,
      errorCorrectionLevel: 'M',
    });
    if (current(version)) h5Qr.value = dataUrl;
  } catch {
    if (current(version)) h5Error.value = '活动链接暂不可用，请联系管理员';
  } finally {
    if (current(version)) h5Loading.value = false;
  }
}
watch(
  () => [props.open, props.activity],
  () => {
    clear();
    if (!props.open) return;
    context = captureContext();
    try {
      context.assertCurrent();
    } catch {
      return;
    }
    controller = new AbortController();
    const signal = context.signal;
    signal.addEventListener('abort', clear, { once: true });
    detachContext = () => signal.removeEventListener('abort', clear);
    ready.value = true;
    if (!isMiniapp.value) void prepareH5(lifetime);
  },
  { deep: true, immediate: true, flush: 'sync' },
);
onBeforeUnmount(clear);

async function generate() {
  if (
    !current() ||
    !promotable.value ||
    !miniappAvailable.value ||
    generating.value ||
    !controller
  )
    return;
  const version = lifetime;
  generating.value = true;
  miniappError.value = false;
  miniappCode.value = '';
  try {
    const result = await generateActivityMiniappCode(
      props.activity.id,
      controller.signal,
      props.salesId,
    );
    if (!current(version)) return;
    if (
      typeof result.dataUrl !== 'string' ||
      !promotionImageExtension(result.dataUrl)
    )
      throw new Error('invalid image');
    miniappCode.value = result.dataUrl;
  } catch {
    if (current(version)) miniappError.value = true;
  } finally {
    if (current(version)) generating.value = false;
  }
}
function openActivity() {
  if (current() && promotable.value && h5Url.value)
    window.open(h5Url.value, '_blank', 'noopener,noreferrer');
}
async function copy() {
  if (!current() || !promotable.value || !h5Url.value) return;
  const version = lifetime;
  try {
    await navigator.clipboard.writeText(h5Url.value);
    if (current(version)) message.success('活动链接已复制');
  } catch {
    if (current(version)) message.info('请选中并复制活动链接');
  }
}
function download(dataUrl: string, name: string) {
  if (!current() || !promotable.value) return;
  const extension = promotionImageExtension(dataUrl);
  if (!extension) return;
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `${name}.${extension}`;
  link.click();
}
function close() {
  clear();
  emit('close');
}
</script>

<template>
  <Modal
    :open="open"
    title="活动推广"
    :footer="null"
    destroy-on-close
    @cancel="close"
  >
    <Alert
      v-if="!published"
      class="mb-4"
      type="info"
      show-icon
      message="发布后可推广"
    />
    <template v-if="!isMiniapp">
      <Alert v-if="h5Error" class="mb-4" type="warning" :message="h5Error" />
      <Spin :spinning="h5Loading">
        <ActivitySharePoster
          v-if="h5Qr"
          :activity="activity"
          :code-url="h5Qr"
          @ready="h5Poster = $event"
        />
      </Spin>
      <Input.TextArea
        :value="h5Url"
        readonly
        :rows="1"
        aria-label="活动链接"
      />
      <Space class="mt-4" wrap>
        <Button :disabled="!promotable || !h5Url" @click="openActivity">
          打开活动
        </Button>
        <Button
          type="primary"
          :disabled="!promotable || !h5Url"
          @click="copy"
        >
          复制链接
        </Button>
        <Button
          :disabled="!promotable || !h5Poster"
          @click="download(h5Poster, `${activity.name}-分享海报`)"
        >
          下载分享海报
        </Button>
      </Space>
    </template>
    <template v-else>
      <p class="mb-3">{{ activity.miniapp?.name || '尚未绑定小程序' }}</p>
      <Alert
        v-if="!miniappAvailable"
        class="mb-4"
        type="warning"
        message="小程序暂不可用，请联系管理员"
      />
      <Alert
        v-if="miniappError"
        class="mb-4"
        type="error"
        message="小程序码生成失败，请稍后重试"
      />
      <Spin :spinning="generating">
        <ActivitySharePoster
          v-if="miniappCode"
          :activity="activity"
          :code-url="miniappCode"
          channel="miniapp"
          @ready="miniappPoster = $event"
        />
      </Spin>
      <Space class="mt-4" wrap>
        <Button
          type="primary"
          :disabled="!promotable || !miniappAvailable"
          :loading="generating"
          @click="generate"
        >
          {{ miniappError ? '重试' : '生成小程序码' }}
        </Button>
        <Button
          :disabled="!promotable || !miniappCode"
          @click="download(miniappCode, '小程序码')"
        >
          下载小程序码
        </Button>
        <Button
          :disabled="!promotable || !miniappPoster"
          @click="download(miniappPoster, `${activity.name}-小程序海报`)"
        >
          下载分享海报
        </Button>
      </Space>
    </template>
  </Modal>
</template>
