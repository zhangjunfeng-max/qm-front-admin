<script setup lang="ts">
import type { NoticeDetail } from '#/api/notifications';

defineProps<{ changes: NonNullable<NoticeDetail['changes']> }>();
</script>

<template>
  <div class="notice-changes">
    <section v-for="change in changes" :key="change.field" class="change-row">
      <h4>{{ change.label }}</h4>
      <div class="change-values">
        <div><span class="text-muted-foreground text-xs">修改前</span><p>{{ change.before || '未设置' }}</p></div>
        <div><span class="text-muted-foreground text-xs">修改后</span><p>{{ change.after || '未设置' }}</p></div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.change-row { padding: 12px 0; border-top: 1px solid hsl(var(--border)); }
.change-row h4 { margin-bottom: 8px; font-weight: 600; }
.change-values { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.change-values p { max-height: 240px; margin-top: 4px; overflow: auto; white-space: pre-wrap; overflow-wrap: anywhere; }
@media (max-width: 575px) { .change-values { grid-template-columns: minmax(0, 1fr); } }
</style>
