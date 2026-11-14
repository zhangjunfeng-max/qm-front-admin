<script setup lang="ts">
import { Drawer } from 'ant-design-vue';

defineProps<{
  inline?: boolean;
  open: boolean;
  title: string;
  saving: boolean;
}>();
const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <section v-if="inline && open" class="activity-inline-editor">
    <slot></slot>
    <footer class="activity-inline-footer"><slot name="footer"></slot></footer>
  </section>
  <Drawer
    v-else
    :open="open"
    :title="title"
    width="min(900px,100vw)"
    :body-style="{ padding: '16px 20px' }"
    :closable="!saving"
    :keyboard="!saving"
    :mask-closable="!saving"
    @close="emit('close')"
  >
    <slot></slot>
    <template #footer><slot name="footer"></slot></template>
  </Drawer>
</template>

<style scoped>
.activity-inline-editor {
  min-width: 0;
}
.activity-inline-footer {
  position: sticky;
  bottom: 0;
  z-index: 10;
  display: flex;
  justify-content: flex-end;
  padding: 12px 0;
  background: hsl(var(--background));
  border-top: 1px solid hsl(var(--border));
}
</style>
