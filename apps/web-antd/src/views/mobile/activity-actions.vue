<script setup lang="ts">
import type { Activity } from '#/api/management';

import { computed, onBeforeUnmount, ref } from 'vue';

import { useUserStore } from '@vben/stores';

import { Button, message, Modal } from 'ant-design-vue';

import { transitionActivity } from '#/api/activity-lifecycle';
import { captureContext } from '#/api/context-lifecycle';
import { changeActivityState } from '#/api/management';
import { useAuthStore } from '#/store';

const props = defineProps<{ activity: Activity }>();
const emit = defineEmits<{ changed: [] }>();
const auth = useAuthStore();
const users = useUserStore();
const manager = computed(
  () =>
    !auth.profile?.isPlatformAdmin && users.userInfo?.roles?.includes('admin'),
);
const busy = ref(false);
let activeDialog: ReturnType<typeof Modal.confirm> | undefined;
onBeforeUnmount(() => activeDialog?.destroy());
type Action =
  | 'publish'
  | 'submit-review'
  | 'withdraw-review'
  | 'archive'
  | 'restore';
function run(action: Action, label: string) {
  const activity = props.activity;
  const context = captureContext();
  activeDialog?.destroy();
  const dialog = Modal.confirm({
    title: `确认${label}“${activity.name}”？`,
    content:
      action === 'submit-review'
        ? '提交后由平台审核，核心配置锁定，展示资料仍可修改。'
        : undefined,
    async onOk() {
      context.assertCurrent();
      busy.value = true;
      try {
        if (action === 'archive' || action === 'restore')
          await changeActivityState(activity);
        else await transitionActivity(activity.id, activity.version, action);
        context.assertCurrent();
        message.success(`${label}成功`);
        emit('changed');
      } finally {
        busy.value = false;
      }
    },
    afterClose() {
      context.signal.removeEventListener('abort', cancel);
    },
  });
  activeDialog = dialog;
  const cancel = () => dialog.destroy();
  context.signal.addEventListener('abort', cancel, { once: true });
}
</script>
<template>
  <div v-if="manager" class="m-toolbar m-management-actions">
    <RouterLink
      v-if="activity.canEdit || activity.canEditSchedule"
      :to="{ path: `/activities/${activity.id}`, query: { edit: '1' } }"
      class="ant-btn"
      >编辑活动</RouterLink
    >
    <RouterLink
      v-if="activity.canManageMembers || activity.canReviewApplications"
      :to="{ path: `/activities/${activity.id}`, query: { tab: 'members' } }"
      class="ant-btn"
      >活动人员与申请</RouterLink
    >
    <Button
      v-if="activity.canSubmitReview"
      :disabled="busy"
      @click="run('submit-review', '提交审核')"
      >提交审核</Button
    >
    <Button
      v-if="activity.canWithdrawReview"
      :disabled="busy"
      @click="run('withdraw-review', '撤回审核')"
      >撤回审核</Button
    >
    <Button
      v-if="activity.canPublish"
      type="primary"
      :disabled="busy"
      @click="run('publish', '发布活动')"
      >发布活动</Button
    >
    <Button
      v-if="activity.canArchive"
      :disabled="busy"
      @click="run('archive', '归档活动')"
      >归档活动</Button
    >
    <Button
      v-if="activity.canRestore"
      :disabled="busy"
      @click="run('restore', '恢复活动')"
      >恢复活动</Button
    >
  </div>
</template>
