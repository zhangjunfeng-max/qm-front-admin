<script setup lang="ts">
import type { ActivityContactSource } from '#/api/management';

import { Button } from 'ant-design-vue';

import { contactPhoneLabels } from '#/api/activity-form';

const props = defineProps<{ disabled?: boolean }>();
const priority = defineModel<ActivityContactSource[]>({ required: true });
let dragging = -1;

function move(from: number, to: number) {
  if (
    props.disabled ||
    from < 0 ||
    to < 0 ||
    to >= priority.value.length ||
    from === to
  )
    return;
  const next = [...priority.value];
  const [source] = next.splice(from, 1);
  if (!source) return;
  next.splice(to, 0, source);
  priority.value = next;
}
function drop(index: number) {
  move(dragging, index);
  dragging = -1;
}
</script>

<template>
  <div>
    <ol class="contact-priority-list" aria-label="客服电话优先顺序">
      <li
        v-for="(source, index) in priority"
        :key="source"
        :draggable="!disabled"
        class="flex min-w-0 items-center gap-1 rounded border border-border px-2 py-1"
        @dragstart="dragging = index"
        @dragend="dragging = -1"
        @dragover.prevent
        @drop.prevent="drop(index)"
      >
        <span class="text-xs text-muted-foreground">{{ index + 1 }}</span>
        <span class="flex-1 whitespace-nowrap">{{
          contactPhoneLabels[source]
        }}</span>
        <Button
          size="small"
          type="text"
          :aria-label="`${contactPhoneLabels[source]}前移`"
          :disabled="disabled || index === 0"
          @click="move(index, index - 1)"
        >
          前移
        </Button>
        <Button
          size="small"
          type="text"
          :aria-label="`${contactPhoneLabels[source]}后移`"
          :disabled="disabled || index === priority.length - 1"
          @click="move(index, index + 1)"
        >
          后移
        </Button>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.contact-priority-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  padding: 0;
  margin: 0;
  list-style: none;
}

@media (max-width: 699px) {
  .contact-priority-list {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
