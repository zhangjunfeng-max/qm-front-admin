<script setup lang="ts">
import { nextTick, ref } from 'vue';

import { Button, Input, message } from 'ant-design-vue';

type Format = 'bold' | 'heading' | 'ordered' | 'unordered';

const props = withDefaults(
  defineProps<{ modelValue: string; disabled?: boolean }>(),
  { disabled: false },
);
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const root = ref<HTMLDivElement>();
const placeholder = '### 参与方式\n1. 选择门店并填写报名信息\n2. 到店前请提前预约\n\n### 使用须知\n- 请携带报名凭证\n- **仅限本人使用**';
async function format(kind: Format) {
  const input = root.value?.querySelector('textarea');
  if (!input || props.disabled) return;
  const source = props.modelValue;
  let start = input.selectionStart;
  let end = input.selectionEnd;
  let replacement: string;
  let selectionStart: number;
  let selectionEnd: number;
  if (kind === 'bold') {
    const content = source.slice(start, end) || '重点内容';
    replacement = `**${content}**`;
    selectionStart = start + 2;
    selectionEnd = selectionStart + content.length;
  } else {
    start = start === 0 ? 0 : source.lastIndexOf('\n', start - 1) + 1;
    const nextLine = source.indexOf('\n', Math.max(start, end - 1));
    end = nextLine === -1 ? source.length : nextLine;
    const lines = (source.slice(start, end) || (kind === 'heading' ? '小标题' : '规则内容')).split('\n');
    replacement = lines.map((line, index) => {
      const content = line.replace(/^(?:#{1,6}\s+|[-+*]\s+|\d+[.)]\s+)/, '');
      const prefix = kind === 'heading' ? '### ' : kind === 'ordered' ? `${index + 1}. ` : '- ';
      return prefix + content;
    }).join('\n');
    selectionStart = start;
    selectionEnd = start + replacement.length;
  }
  const value = source.slice(0, start) + replacement + source.slice(end);
  if (value.length > 20_000) {
    message.warning('活动规则最多填写 20000 字');
    return;
  }
  emit('update:modelValue', value);
  await nextTick();
  input.focus();
  input.setSelectionRange(selectionStart, selectionEnd);
}
</script>

<template>
  <div ref="root" class="rules-editor">
    <div class="rules-toolbar" role="group" aria-label="活动规则格式">
      <Button size="small" :disabled="disabled" @mousedown.prevent @click="format('heading')">小标题</Button>
      <Button size="small" :disabled="disabled" @mousedown.prevent @click="format('bold')">加粗</Button>
      <Button size="small" :disabled="disabled" @mousedown.prevent @click="format('ordered')">编号列表</Button>
      <Button size="small" :disabled="disabled" @mousedown.prevent @click="format('unordered')">项目列表</Button>
    </div>
    <Input.TextArea
      :value="modelValue"
      :disabled="disabled"
      :rows="8"
      :maxlength="20000"
      :placeholder="placeholder"
      aria-label="活动规则内容"
      class="rules-input"
      @update:value="emit('update:modelValue', $event)"
    />
  </div>
</template>

<style scoped>
.rules-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.rules-input {
  min-height: 200px;
  line-height: 1.7;
  resize: vertical;
}
</style>
