<script setup lang="ts">
import type { PerformanceEvent } from '#/api/performance';

import { computed, onUnmounted, ref } from 'vue';

import { createIconifyIcon } from '@vben/icons';

import { money } from '#/views/home/format';

const props = defineProps<{ userId: string }>();
const Sparkles = createIconifyIcon('lucide:party-popper');
const current = ref<PerformanceEvent>();
const merged = ref(0);
let timer: ReturnType<typeof setTimeout> | undefined;
let pending: { event: PerformanceEvent; count: number }[] = [];
const text = computed(() => {
  if (merged.value) return `捷报！刚刚新增 ${merged.value} 笔成功报名与成交`;
  const e = current.value;
  if (!e) return '';
  const name = e.salesId === props.userId ? '你' : e.salesName || '活动';
  return e.kind === 'payment'
    ? `恭喜${name}再添一单，实付 ${money(e.amountCent)}！`
    : `${name}新增 1 位成功报名客户！`;
});
function next() {
  const nextItem = pending.shift();
  current.value = nextItem?.event;
  merged.value = nextItem?.count ?? 0;
  if (!current.value) {
    return;
  }
  timer = setTimeout(() => {
    current.value = undefined;
    merged.value = 0;
    timer = setTimeout(next, 250);
  }, 3200);
}
function push(events: PerformanceEvent[]) {
  if (events.length > 3) {
    pending.push({ event: events[0]!, count: events.length });
  } else {
    pending.push(...events.map((event) => ({ event, count: 0 })));
  }
  if (!current.value) next();
  pending = pending.slice(0, 3);
}
function clear() {
  clearTimeout(timer);
  pending = [];
  current.value = undefined;
  merged.value = 0;
}
onUnmounted(clear);
defineExpose({ push, clear });
</script>
<template>
  <Teleport to="body">
<Transition name="success-banner">
<div
        v-if="current"
        :key="current.id"
        class="performance-success"
        role="status"
        aria-live="polite"
      >
        <div class="success-fireworks" aria-hidden="true">
          <i v-for="n in 18" :key="n" :style="{ '--n': n }"></i>
        </div>
        <Sparkles class="success-symbol" />
        <div>
          <strong>{{ text }}</strong><span>{{ current.activityName }}</span>
        </div>
        <button type="button" aria-label="关闭庆祝" @click="clear">×</button>
      </div>
</Transition>
</Teleport>
</template>
<style scoped>
.performance-success {
  position: fixed;
  top: 86px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1100;
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: calc(100vw - 32px);
  width: max-content;
  padding: 16px 20px;
  background: #fffaf0;
  border: 1px solid #ead8a9;
  border-radius: 6px;
  box-shadow: 0 8px 26px #37200018;
  color: #795016;
  pointer-events: auto;
}
.performance-success strong {
  font-size: 15px;
  display: block;
  line-height: 1.5;
}
.performance-success span {
  display: block;
  font-size: 12px;
  color: #94784c;
  margin-top: 3px;
}
.success-symbol {
  width: 30px;
  height: 30px;
  flex: none;
  color: #c78e21;
}
.performance-success button {
  margin-left: 10px;
  font-size: 22px;
  color: #9d8b70;
  background: none;
  border: 0;
  cursor: pointer;
}
.success-fireworks {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: visible;
}
.success-fireworks i {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 5px;
  height: 9px;
  background: #d7a843;
  opacity: 0;
  animation: success-confetti 1.25s ease-out both;
  animation-delay: calc(var(--n) * 0.025s);
}
.success-fireworks i:nth-child(3n) {
  background: #dc6855;
}
.success-fireworks i:nth-child(3n + 1) {
  background: #67a58c;
}
@keyframes success-confetti {
  0% {
    transform: rotate(calc(var(--n) * 20deg)) translateY(0);
    opacity: 1;
  }
  100% {
    transform: rotate(calc(var(--n) * 20deg)) translateY(130px) rotate(120deg);
    opacity: 0;
  }
}
.success-banner-enter-active,
.success-banner-leave-active {
  transition:
    opacity 0.2s,
    margin-top 0.2s;
}
.success-banner-enter-from,
.success-banner-leave-to {
  opacity: 0;
  margin-top: -12px;
}
@media (prefers-reduced-motion: reduce) {
  .success-fireworks {
    display: none;
  }
  .success-banner-enter-active,
  .success-banner-leave-active {
    transition: none;
  }
}
@media (max-width: 640px) {
  .performance-success {
    top: 68px;
    padding: 12px 14px;
    gap: 8px;
  }
  .performance-success strong {
    font-size: 14px;
  }
  .success-symbol {
    width: 24px;
    height: 24px;
  }
}
</style>
