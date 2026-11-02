<script setup lang="ts">
import type { ActivityTheme } from '#/api/activity-theme';

import { computed, ref } from 'vue';

import { Button } from 'ant-design-vue';

import { activityThemePreset, activityThemes } from '#/api/activity-theme';

const props = withDefaults(
  defineProps<{ theme: ActivityTheme; themeColor: string; disabled?: boolean }>(),
  { disabled: false },
);
const emit = defineEmits<{
  'update:theme': [value: ActivityTheme];
  'update:themeColor': [value: string];
}>();
const customizing = ref(false);
const customized = computed(
  () => props.themeColor !== activityThemePreset(props.theme).color,
);
function select(theme: ActivityTheme) {
  emit('update:theme', theme);
  emit('update:themeColor', activityThemePreset(theme).color);
  customizing.value = false;
}
function pickColor(event: Event) {
  emit('update:themeColor', (event.target as HTMLInputElement).value.toUpperCase());
}
</script>

<template>
  <div>
    <div class="theme-options" role="group" aria-label="选择活动主题">
      <button
        v-for="preset in activityThemes"
        :key="preset.value"
        type="button"
        class="theme-option"
        :class="{ 'theme-option-selected': theme === preset.value }"
        :aria-pressed="theme === preset.value"
        :disabled="disabled"
        @click="select(preset.value)"
      >
        <span class="theme-preview" :style="{ backgroundColor: preset.background }" aria-hidden="true">
          <span class="theme-preview-title" :style="{ backgroundColor: preset.text }"></span>
          <span class="theme-preview-line" :style="{ backgroundColor: preset.text }"></span>
          <span class="theme-preview-button" :style="{ backgroundColor: theme === preset.value ? themeColor : preset.color }"></span>
        </span>
        <span class="mt-2 block text-sm font-medium">{{ preset.label }}</span>
        <span class="text-muted-foreground mt-1 block text-xs">{{ preset.description }}</span>
      </button>
    </div>
    <div class="mt-2 flex flex-wrap items-center gap-2">
      <Button type="link" size="small" :disabled="disabled" @click="customizing = !customizing">
        自定义颜色
      </Button>
      <span v-if="customized" class="text-muted-foreground text-xs">已自定义</span>
      <template v-if="customizing">
        <input
          type="color"
          aria-label="选择自定义主题色"
          :value="themeColor"
          :disabled="disabled"
          class="border-border h-8 w-10 cursor-pointer rounded border bg-transparent p-0.5"
          @input="pickColor"
        />
        <Button size="small" :disabled="disabled" @click="select(theme)">恢复预设</Button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.theme-options {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.theme-option {
  min-width: 0;
  padding: 8px;
  text-align: left;
  cursor: pointer;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  transition: border-color 0.15s;
}

.theme-option:hover:not(:disabled),
.theme-option-selected {
  border-color: hsl(var(--primary));
}

.theme-option-selected {
  box-shadow: 0 0 0 1px hsl(var(--primary));
}

.theme-option:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
}

.theme-option:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.theme-preview {
  position: relative;
  display: block;
  height: 58px;
  overflow: hidden;
  border-radius: 5px;
}

.theme-preview-title,
.theme-preview-line,
.theme-preview-button {
  position: absolute;
  left: 10px;
  height: 5px;
  border-radius: 4px;
}

.theme-preview-title {
  top: 10px;
  width: 50%;
}

.theme-preview-line {
  top: 22px;
  width: 65%;
  height: 3px;
  opacity: 0.3;
}

.theme-preview-button {
  right: 10px;
  bottom: 8px;
  height: 12px;
}

@media (max-width: 639px) {
  .theme-options {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
