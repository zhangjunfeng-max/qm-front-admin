<script setup lang="ts">
import type { AuthApi } from '#/api/core/auth';

import { computed, ref } from 'vue';

import { Empty, Input, Tag } from 'ant-design-vue';
const props = defineProps<{
  items: AuthApi.UserTenant[];
  selectedId?: string;
  disabled?: boolean;
  platform?: boolean;
}>();
const emit = defineEmits<{ select: [id: string] }>();
const keyword = ref('');
const roles = {
  admin: '管理员',
  member: '成员',
  platform_admin: '平台管理员',
};
const filtered = computed(() =>
  props.items.filter((item) =>
    item.name.toLowerCase().includes(keyword.value.trim().toLowerCase()),
  ),
);
function lastEntry(value: null | string) {
  return value
    ? `上次进入：${new Date(value).toLocaleDateString()}`
    : '尚未进入';
}
</script>
<template>
  <div class="flex min-h-0 flex-col gap-3">
    <Input
      v-model:value="keyword"
      placeholder="搜索公司名称"
      allow-clear
      aria-label="搜索公司名称"
    />
    <div
      class="max-h-[380px] overflow-y-auto"
      role="group"
      :aria-label="platform ? '所有公司' : '已加入的公司'"
    >
      <button
        v-for="item in filtered"
        :key="item.id"
        type="button"
        :disabled="disabled"
        class="hover:bg-accent focus-visible:ring-primary flex w-full items-center justify-between gap-3 rounded-lg px-4 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:cursor-wait disabled:opacity-60"
        :class="{ 'bg-accent': selectedId === item.id }"
        :aria-label="`进入${item.name}`"
        @click="emit('select', item.id)"
      >
        <div class="min-w-0 flex-1">
          <div class="truncate text-base font-medium">{{ item.name }}</div>
          <div class="text-muted-foreground mt-1 text-xs">
            {{
              item.status === 'disabled'
                ? '已停用'
                : item.expiresAt &&
                    new Date(item.expiresAt).getTime() <= Date.now()
                  ? '服务已到期'
                  : platform
                    ? '以平台身份管理'
                    : lastEntry(item.lastEnteredAt)
            }}
          </div>
        </div>
        <Tag v-if="selectedId === item.id" color="blue">当前公司</Tag>
        <span v-else class="text-muted-foreground shrink-0 text-xs">
          {{ platform ? '平台管理' : roles[item.role] }}
          <span aria-hidden="true">›</span>
        </span>
      </button>
      <Empty
        v-if="filtered.length === 0"
        description="暂无匹配的公司"
        class="py-6"
      />
    </div>
  </div>
</template>
