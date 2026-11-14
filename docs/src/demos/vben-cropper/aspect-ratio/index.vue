<script lang="ts" setup>
import { onBeforeUnmount, ref } from 'vue';

import { VCropper } from '@vben/common-ui';

const cropperRef = ref<InstanceType<typeof VCropper>>();
const aspectRatio = ref('1:1');
const imageUrl = ref('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%23dbeafe%22%2F%3E%3Ccircle%20cx%3D%22580%22%20cy%3D%22170%22%20r%3D%2290%22%20fill%3D%22%23fbbf24%22%2F%3E%3Cpath%20d%3D%22M0%20600V460L220%20260l220%20220%20160-140%20200%20190v70%22%20fill%3D%22%2393c5fd%22%2F%3E%3C%2Fsvg%3E');
const croppedImage = ref('');

const aspectOptions = [
  { label: '1:1 (正方形)', value: '1:1' },
  { label: '16:9 (宽屏)', value: '16:9' },
  { label: '4:3 (标准)', value: '4:3' },
  { label: '3:4 (竖版)', value: '3:4' },
  { label: '3:2 (照片)', value: '3:2' },
];

// 释放旧的 object URL 以避免内存泄漏
const revokeCroppedImage = () => {
  if (croppedImage.value?.startsWith('blob:')) {
    URL.revokeObjectURL(croppedImage.value);
  }
};

const handleCrop = async () => {
  const blob = await cropperRef.value?.getCropImage('image/jpeg', 0.9, 'blob');
  if (blob instanceof Blob) {
    // 释放旧的 URL
    revokeCroppedImage();
    croppedImage.value = URL.createObjectURL(blob);
  }
};

const handleReset = () => {
  // 释放 URL
  revokeCroppedImage();
  croppedImage.value = '';
  imageUrl.value = `data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%23dbeafe%22%2F%3E%3Ccircle%20cx%3D%22580%22%20cy%3D%22170%22%20r%3D%2290%22%20fill%3D%22%23fbbf24%22%2F%3E%3Cpath%20d%3D%22M0%20600V460L220%20260l220%20220%20160-140%20200%20190v70%22%20fill%3D%22%2393c5fd%22%2F%3E%3C%2Fsvg%3E`;
};

// 组件卸载时清理
onBeforeUnmount(() => {
  revokeCroppedImage();
});
</script>

<template>
  <div>
    <div class="mb-4">
      <label class="text-sm text-gray-500 mr-2">选择比例:</label>
      <select v-model="aspectRatio" class="px-3 py-1 border rounded text-sm">
        <option
          v-for="option in aspectOptions"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
    </div>

    <VCropper
      ref="cropperRef"
      :img="imageUrl"
      :width="500"
      :height="300"
      :aspect-ratio="aspectRatio"
    />

    <div class="mt-4 flex gap-2">
      <button
        class="px-4 py-2 bg-blue-500 rounded hover:bg-blue-600"
        @click="handleCrop"
      >
        裁剪图片
      </button>
      <button
        class="px-4 py-2 bg-gray-500 rounded hover:bg-gray-600"
        @click="handleReset"
      >
        重置
      </button>
    </div>

    <div v-if="croppedImage" class="mt-4">
      <p class="text-sm text-gray-500 mb-2">
        裁剪结果 (比例: {{ aspectRatio }}):
      </p>
      <img :src="croppedImage" class="max-w-full rounded border" />
    </div>

    <div class="mt-4">
      <p class="text-sm text-gray-500">提示:</p>
      <ul class="mt-2 text-xs text-gray-400 list-disc pl-4">
        <li>设置固定比例后，裁剪框始终维持该比例</li>
        <li>切换比例会自动重新计算裁剪框大小</li>
        <li>比例格式为 "宽:高"，如 "16:9"</li>
      </ul>
    </div>
  </div>
</template>
