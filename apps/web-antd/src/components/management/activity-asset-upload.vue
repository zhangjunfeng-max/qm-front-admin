<script setup lang="ts">
import type { UploadFile, UploadProps } from 'ant-design-vue';

import type { useActivityMedia } from './activity-media';

import { computed, h, ref } from 'vue';

import { Button, message, Modal, Upload } from 'ant-design-vue';

import { PreviewUpload } from '#/adapter/component';
import { useAuthStore } from '#/store';

import { formatFileSize } from './activity-media';

const props = withDefaults(
  defineProps<{
    assets: ReturnType<typeof useActivityMedia>;
    kind?: 'audio' | 'detail' | 'image';
    label: string;
    multiple?: boolean;
    disabled?: boolean;
  }>(),
  { kind: 'image' },
);
const urls = defineModel<string[]>({ required: true });
const authStore = useAuthStore();
const showFileSize = computed(
  () => authStore.profile?.isPlatformAdmin === true,
);
const files = computed<UploadFile[]>(() =>
  urls.value.map((url) => ({
    uid: url,
    name: props.assets.info(url)?.name || props.label,
    status: 'done',
    url: props.assets.previews[url],
    size: props.assets.info(url)?.size,
    type: props.assets.info(url)?.contentType,
  })),
);
let selectionQueue = Promise.resolve();
function select(file: File) {
  const session = props.assets.session();
  const selection = selectionQueue.then(async () => {
    if (session !== props.assets.session()) return;
    try {
      if (props.multiple && urls.value.length >= 50)
        throw new Error('活动详情最多50项');
      const kind =
        props.kind === 'detail'
          ? /\.(mp4|webm)$/i.test(file.name)
            ? 'video'
            : 'image'
          : props.kind;
      const url = await props.assets.prepare(file, kind);
      if (url) urls.value = props.multiple ? [...urls.value, url] : [url];
    } catch (error) {
      message.error(error instanceof Error ? error.message : '文件处理失败');
    }
  });
  selectionQueue = selection;
  return selection.then(() => Upload.LIST_IGNORE);
}

function update(list: UploadFile[]) {
  urls.value = (list || []).map((file) => file.uid);
}
const previewVideo = ref('');
const renderItem: UploadProps['itemRender'] = ({ originNode, file }) => {
  const info = props.assets.info(file.uid);
  const pending = file.uid.startsWith('blob:');
  const status = pending ? '待保存' : '已上传';
  return h('div', { class: 'activity-asset-item' }, [
    h('div', { class: 'activity-asset-frame' }, [
      info?.contentType.startsWith('video/')
        ? h(
            'div',
            {
              class:
                'ant-upload-list-item ant-upload-list-item-done activity-video-card',
            },
            [
              h(
                'button',
                {
                  type: 'button',
                  class: 'activity-video-preview',
                  'aria-label': `播放视频 ${info.name}`,
                  onPointerdown: (event: PointerEvent) =>
                    event.stopPropagation(),
                  onMousedown: (event: MouseEvent) => event.stopPropagation(),
                  onClick: () => {
                    previewVideo.value = file.uid;
                  },
                },
                [
                  h('video', {
                    src: file.url,
                    muted: true,
                    preload: 'metadata',
                    playsinline: true,
                  }),
                  h('span', '播放视频'),
                ],
              ),
              h(
                Button,
                {
                  size: 'small',
                  danger: true,
                  disabled: props.disabled,
                  'aria-label': `移除视频 ${info.name}`,
                  onPointerdown: (event: PointerEvent) =>
                    event.stopPropagation(),
                  onMousedown: (event: MouseEvent) => event.stopPropagation(),
                  onClick: () => {
                    urls.value = urls.value.filter((url) => url !== file.uid);
                  },
                },
                () => '移除',
              ),
            ],
          )
        : originNode,
      h('span', {
        class: [
          'activity-asset-status',
          pending ? 'bg-amber-500' : 'bg-emerald-500',
        ],
        title: status,
        role: 'img',
        'aria-label': status,
      }),
    ]),
    showFileSize.value && info
      ? h(
          'div',
          {
            class: 'mt-1 text-center text-xs text-muted-foreground',
            title: `原始 ${formatFileSize(info.originalSize)}，处理后 ${formatFileSize(info.size)}`,
          },
          formatFileSize(info.size),
        )
      : null,
  ]);
};
const audioUrl = computed(() => props.assets.previews[urls.value[0] || '']);
</script>

<template>
  <div
    class="activity-asset-upload"
    :class="{
      'activity-asset-upload--sizes': showFileSize,
      'activity-asset-upload--audio': kind === 'audio',
    }"
  >
    <PreviewUpload
      :model-value="files"
      :before-upload="select"
      :item-render="renderItem"
      :accept="
        kind === 'detail'
          ? '.jpg,.jpeg,.png,.webp,.mp4,.webm'
          : kind === 'image'
            ? '.jpg,.jpeg,.png,.webp'
            : '.mp3,.m4a,.wav,.ogg'
      "
      :list-type="kind === 'audio' ? 'text' : 'picture-card'"
      :multiple="multiple"
      :draggable="multiple"
      :disabled="disabled || assets.preparing.value > 0"
      :placeholder="`${urls.length && !multiple ? '更换' : '选择'}${label}`"
      @update:model-value="update"
    >
      <template #default>
        <span v-if="kind !== 'audio'">{{ urls.length && !multiple ? '更换' : '选择' }}{{ label }}</span>
        <Button v-else :disabled="disabled">
          {{ urls.length ? '更换' : '选择' }}{{ label }}
        </Button>
      </template>
    </PreviewUpload>
    <Modal
      :open="!!previewVideo"
      title="视频预览"
      :footer="null"
      :width="720"
      @cancel="previewVideo = ''"
    >
      <video
        v-if="previewVideo"
        :src="assets.previews[previewVideo]"
        controls
        autoplay
        playsinline
        class="w-full"
      ></video>
    </Modal>
    <audio
      v-if="kind === 'audio' && audioUrl"
      :src="audioUrl"
      controls
      class="mt-2 max-w-full"
    ></audio>
  </div>
</template>

<style scoped>
.activity-asset-upload :deep(.activity-asset-frame) {
  position: relative;
}

.activity-asset-upload :deep(.activity-asset-status) {
  position: absolute;
  top: 7px;
  right: 7px;
  z-index: 3;
  width: 9px;
  height: 9px;
  border: 1px solid white;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgb(0 0 0 / 10%);
}

.activity-asset-upload--audio :deep(.activity-asset-status) {
  top: 9px;
  right: 28px;
}

.activity-asset-upload :deep(.activity-video-card) {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px;
}

/* Ant 上传卡片的悬浮遮罩不能拦截自定义视频按钮。 */
.activity-asset-upload :deep(.activity-video-card::before) {
  pointer-events: none;
}

.activity-asset-upload :deep(.activity-video-card > *) {
  z-index: 2;
}

.activity-asset-upload :deep(.activity-video-preview) {
  flex: 1;
  width: 100%;
  min-height: 0;
  font-size: 12px;
  cursor: pointer;
}

.activity-asset-upload :deep(.activity-video-preview video) {
  width: 100%;
  height: 40px;
  object-fit: contain;
}

.activity-asset-upload
  :deep(
    .ant-upload-wrapper.ant-upload-picture-card-wrapper
      .ant-upload-list.ant-upload-list-picture-card
      .ant-upload-list-item-container
  ) {
  height: 110px;
  margin-bottom: 8px;
}

.activity-asset-upload
  :deep(
    .ant-upload-wrapper.ant-upload-picture-card-wrapper
      .ant-upload-list.ant-upload-list-picture-card
      .ant-upload-list-item
  ) {
  height: 102px;
}

.activity-asset-upload--sizes
  :deep(
    .ant-upload-wrapper.ant-upload-picture-card-wrapper
      .ant-upload-list.ant-upload-list-picture-card
      .ant-upload-list-item-container
  ) {
  height: 132px;
}
</style>
