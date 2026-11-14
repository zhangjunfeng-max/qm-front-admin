<script setup lang="ts">
import type { WechatConfig } from './wechat-share';

import type { Activity } from '#/api/management';

import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { useUserStore } from '@vben/stores';

import { Alert, Button, Input, message, Modal, Spin } from 'ant-design-vue';
import QRCode from 'qrcode';

import {
  buildActivityH5Url,
  generateActivityEntry,
} from '#/api/activity-promotion';
import { captureContext } from '#/api/context-lifecycle';
import { requestClient } from '#/api/request';
import ActivitySharePoster from '#/components/management/activity-share-poster.vue';
import { useAuthStore } from '#/store';

import {
  configureWechatShare,
  isWechat,
  resetWechatShare,
} from './wechat-share';
const props = defineProps<{ activity: Activity; open: boolean }>();
const emit = defineEmits<{ close: [] }>();
const users = useUserStore();
const auth = useAuthStore();
const url = ref('');
const qr = ref('');
const poster = ref('');
const loading = ref(false);
const failed = ref(false);
const wxReady = ref(false);
const wxFailed = ref(false);
const wechat = isWechat();
const input = ref<{ $el: HTMLInputElement }>();
const published = computed(
  () =>
    props.activity.storedStatus === 'published' &&
    !!props.activity.currentRole &&
    (props.activity.currentRole === 'admin' || !props.activity.canJoin),
);
let controller: AbortController | undefined;
let detach: (() => void) | undefined;
let version = 0;
function clear() {
  if (wechat) resetWechatShare();
  version++;
  controller?.abort();
  detach?.();
  detach = undefined;
  url.value = '';
  qr.value = '';
  poster.value = '';
  loading.value = false;
  failed.value = false;
  wxReady.value = false;
  wxFailed.value = false;
}
async function prepare() {
  clear();
  if (!props.open || !published.value) return;
  const context = captureContext();
  const active = new AbortController();
  controller = active;
  const serial = version;
  const clean = () => {
    clear();
    emit('close');
  };
  context.signal.addEventListener('abort', clean, { once: true });
  detach = () => context.signal.removeEventListener('abort', clean);
  const current = () =>
    serial === version && !active.signal.aborted && !context.signal.aborted;
  loading.value = true;
  try {
    const salesId = String(users.userInfo?.userId ?? '');
    if (!salesId) throw new Error('请重新登录');
    const entry = await generateActivityEntry(
      props.activity.id,
      active.signal,
      props.activity.canJoin || auth.profile?.isPlatformAdmin ? undefined : salesId,
    );
    context.assertCurrent();
    if (!current()) return;
    const link = buildActivityH5Url(
      import.meta.env.VITE_ACTIVITY_H5_URL ?? '',
      entry.code,
    );
    const image = await QRCode.toDataURL(link, {
      width: 392,
      margin: 4,
      errorCorrectionLevel: 'M',
    });
    if (!current()) return;
    url.value = link;
    qr.value = image;
    if (wechat) void setupWechat(link, active, serial);
  } catch {
    if (current()) failed.value = true;
  } finally {
    if (current()) loading.value = false;
  }
}
async function setupWechat(
  link: string,
  active: AbortController,
  serial: number,
) {
  try {
    const config = await requestClient.post<WechatConfig>(
      `/admin/activities/${props.activity.id}/share-config`,
      { url: location.href.split('#')[0] },
      { signal: active.signal },
    );
    if (active.signal.aborted) return;
    const a = props.activity;
    await configureWechatShare(
      config,
      {
        title: a.shareText || a.name,
        desc: a.name,
        link,
        imgUrl: a.shareImageUrl || a.posterUrl,
      },
      {
        title: a.forwardText || a.shareText || a.name,
        desc: a.name,
        link,
        imgUrl: a.forwardImageUrl || a.shareImageUrl || a.posterUrl,
      },
      active.signal,
    );
    if (serial === version && !active.signal.aborted) wxReady.value = true;
  } catch {
    if (serial === version && !active.signal.aborted) wxFailed.value = true;
  }
}
async function copy() {
  if (!url.value) return;
  try {
    await navigator.clipboard.writeText(url.value);
    message.success('活动链接已复制');
  } catch {
    input.value?.$el.focus();
    input.value?.$el.select();
    message.info('请长按链接复制');
  }
}
watch(() => [props.open, props.activity.id], prepare, { immediate: true });
onBeforeUnmount(clear);
</script>
<template>
  <Modal
    :open="open"
    title="分享活动"
    :footer="null"
    width="min(420px,calc(100vw - 24px))"
    class="m-share"
    @cancel="$emit('close')"
  >
    <p v-if="!published" class="m-muted">加入已发布活动后可分享</p>
    <Spin :spinning="loading">
      <template v-if="published">
        <p class="m-muted">{{ activity.name }}</p>
        <Alert v-if="failed" type="warning" message="活动链接加载失败">
          <template #action>
            <Button @click="prepare">重试</Button>
          </template>
</Alert><template v-if="url">
          <ActivitySharePoster
            :activity="activity"
            :code-url="qr"
            @ready="poster = $event"
          />
          <p v-if="wechat" class="m-muted text-center">
            {{
              wxReady
                ? '点击微信右上角 ··· 分享给朋友或朋友圈'
                : wxFailed
                  ? '可先复制链接或长按保存海报'
                  : '正在准备微信分享'
            }}
          </p>
          <p v-else class="m-muted text-center">
            长按保存海报，或复制链接发给客户
          </p>
          <Input ref="input" :value="url" readonly aria-label="活动推广链接" />
          <div class="m-share-actions">
            <Button type="primary" @click="copy">复制活动链接</Button><a
              v-if="poster"
              :href="poster"
              :download="`${activity.name }-分享海报.png`"
              class="ant-btn"
              ><span>保存海报</span></a>
          </div>
        </template>
      </template>
    </Spin>
  </Modal>
</template>
