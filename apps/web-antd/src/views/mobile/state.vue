<script setup lang="ts">
import { Button, Empty, Spin } from 'ant-design-vue';
defineProps<{ loading?: boolean; failed?: boolean; empty?: boolean }>();
defineEmits<{ retry: [] }>();
</script>
<template>
  <div v-if="loading" class="m-state">
    <Spin />
    <p>加载中</p>
  </div>
  <div v-else-if="failed" class="m-state">
    <p>暂时无法加载</p>
    <Button @click="$emit('retry')">重试</Button>
  </div>
  <Empty
    v-else-if="empty"
    class="m-state"
    description="暂无记录"
    :image="Empty.PRESENTED_IMAGE_SIMPLE"
  /><slot v-else></slot>
</template>
