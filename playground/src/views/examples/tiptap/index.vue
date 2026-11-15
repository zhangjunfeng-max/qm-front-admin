<script lang="ts" setup>
import type { ImageUploadOptions } from '@vben/plugins/tiptap';

import { computed, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { VbenTiptap, VbenTiptapPreview } from '@vben/plugins/tiptap';

import { Card, Switch } from 'antdv-next';
const content = ref(`
  <h1>Vben Tiptap</h1>
  <p>这个编辑器已经被封装在 <code>packages/effects/plugins/src/tiptap</code> 中。</p>
  <p>你可以直接在各个 app 里通过 <code>@vben/plugins/tiptap</code> 引入。</p>
  <blockquote>默认内置 StarterKit、Underline、TextAlign、Placeholder。</blockquote>
`);
const previewContent = computed(() => content.value);

const enableUpload = ref(true);

// Mock upload: 模拟上传延迟，支持进度回调
const imageUpload: ImageUploadOptions = {
  accept: 'image/*',
  maxSize: 5 * 1024 * 1024, // 5MB
  upload: (_file, onProgress) =>
    new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
        }
        onProgress?.(Math.round(progress));
        if (progress >= 100) {
          // 上传完成后返回 mock URL
          resolve(
            `data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%23dbeafe%22%2F%3E%3Ccircle%20cx%3D%22580%22%20cy%3D%22170%22%20r%3D%2290%22%20fill%3D%22%23fbbf24%22%2F%3E%3Cpath%20d%3D%22M0%20600V460L220%20260l220%20220%20160-140%20200%20190v70%22%20fill%3D%22%2393c5fd%22%2F%3E%3C%2Fsvg%3E`,
          );
        }
      }, 300);
    }),
  onUploadError: (error) => {
    console.error('Image upload failed:', error);
  },
};
</script>

<template>
  <Page title="Tiptap 富文本">
    <template #description>
      <div class="mt-2 text-foreground/80">
        统一封装后的富文本编辑器，适合在各个 app 中直接复用。
      </div>
    </template>

    <Card class="mb-5" title="编辑器">
      <div class="mb-3 flex items-center gap-3">
        <span class="text-sm">启用图片上传：</span>
        <Switch v-model:checked="enableUpload" />
      </div>
      <VbenTiptap
        v-model="content"
        :image-upload="enableUpload ? imageUpload : undefined"
      />
    </Card>

    <Card class="mb-5" title="富文本预览">
      <VbenTiptapPreview :content="previewContent" />
    </Card>

    <Card title="HTML 输出">
      <pre class="overflow-auto rounded-xl border border-border bg-muted p-4">
        {{ previewContent }}
      </pre>
    </Card>
  </Page>
</template>
