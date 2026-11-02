<script setup lang="ts">
import type { FormField } from '#/api/management';

import { Button, Card, Input, Select, Space, Switch } from 'ant-design-vue';
const fields = defineModel<FormField[]>({ required: true });
const types = [
  { label: '单行文本', value: 'text' },
  { label: '多行文本', value: 'textarea' },
  { label: '日期', value: 'date' },
  { label: '电话', value: 'phone' },
  { label: '邮箱', value: 'email' },
  { label: '单选', value: 'radio' },
  { label: '多选', value: 'checkbox' },
  { label: '是否', value: 'boolean' },
];
let dragging = -1;
function key() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
function addOption(field: FormField) {
  (field.options ||= []).push({ value: `option_${key()}`, label: '' });
}
function add() {
  fields.value.push({
    key: `field_${key()}`,
    type: 'text',
    label: '',
    placeholder: '',
    required: false,
  });
}
function move(index: number, delta: number) {
  const next = index + delta;
  if (index < 2 || next < 2 || next >= fields.value.length) return;
  const [item] = fields.value.splice(index, 1);
  if (item) fields.value.splice(next, 0, item);
}
function drop(index: number) {
  if (dragging >= 2 && index >= 2 && dragging !== index) {
    const [item] = fields.value.splice(dragging, 1);
    if (item) fields.value.splice(index, 0, item);
  }
  dragging = -1;
}
function changeType(field: FormField) {
  if (['checkbox', 'radio'].includes(field.type)) field.options ||= [];
  else delete field.options;
}
</script>
<template>
  <div class="space-y-3">
    <Card
      v-for="(field, index) in fields"
      :key="field.key"
      size="small"
      :draggable="index >= 2"
      @dragstart="dragging = index"
      @dragover.prevent
      @drop.prevent="drop(index)"
    >
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          v-model:value="field.label"
          placeholder="字段标题"
          :maxlength="80"
        />
        <Select
          v-model:value="field.type"
          :options="types"
          :disabled="index < 2"
          @change="changeType(field)"
        />
        <Input
          v-model:value="field.placeholder"
          placeholder="填写提示"
          :maxlength="200"
        />
        <Space>
          <Switch v-model:checked="field.required" :disabled="index < 2" />
          必填
          <span v-if="index < 2" class="text-xs text-muted-foreground">
            固定字段
          </span>
        </Space>
      </div>
      <div
        v-if="['radio', 'checkbox'].includes(field.type)"
        class="mt-3 space-y-2"
      >
        <div
          v-for="(option, oi) in field.options"
          :key="option.value"
          class="flex gap-2"
        >
          <Input
            v-model:value="option.label"
            placeholder="选项名称"
            :maxlength="80"
          />
          <Button danger @click="field.options?.splice(oi, 1)">删除</Button>
        </div>
        <Button @click="addOption(field)">添加选项</Button>
      </div>
      <Space v-if="index >= 2" class="mt-3">
        <Button size="small" :disabled="index === 2" @click="move(index, -1)">
          上移
        </Button>
        <Button
          size="small"
          :disabled="index === fields.length - 1"
          @click="move(index, 1)"
        >
          下移
        </Button>
        <Button size="small" danger @click="fields.splice(index, 1)">
          删除字段
        </Button>
      </Space>
    </Card>
    <Button block type="dashed" @click="add">添加字段</Button>
  </div>
</template>
