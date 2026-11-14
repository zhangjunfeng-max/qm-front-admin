<script setup lang="ts">
import type { ActivityTransition } from '#/api/activity-lifecycle';
import type { Activity } from '#/api/management';

import { onBeforeUnmount, ref } from 'vue';

import { Button, message, Modal, Space } from 'ant-design-vue';

import { transitionActivity } from '#/api/activity-lifecycle';
import { captureContext } from '#/api/context-lifecycle';
import { changeActivityState } from '#/api/management';

const props = withDefaults(
  defineProps<{ activity: Activity; small?: boolean; actions?: string[] }>(),
  { small: false, actions: undefined },
);
const emit = defineEmits<{ changed: [] }>();
const busy = ref(false);
let dialog: ReturnType<typeof Modal.confirm> | undefined;
onBeforeUnmount(() => dialog?.destroy());
const labels = {
  'submit-review': {
    title: '提交平台审核？',
    content: '提交后核心配置锁定，展示资料仍可修改。审核通过后可自行发布。',
  },
  'withdraw-review': {
    title: '撤回为草稿？',
    content: '撤回后可修改活动，修改完成需重新提交平台审核。',
  },
  publish: {
    title: '发布活动？',
    content: '发布后按开始、结束时间对外展示，展示资料仍可修改。',
  },
  archive: {
    title: '归档活动？',
    content: '归档后停止对外展示和员工申请，保留历史数据。',
  },
  restore: {
    title: '恢复为草稿？',
    content: '恢复后需要重新提交平台审核，通过后才能发布。',
  },
};
function act(action: 'archive' | 'restore' | ActivityTransition) {
  const activity = { ...props.activity };
  const context = captureContext();
  dialog = Modal.confirm({
    ...labels[action],
    async onOk() {
      context.assertCurrent();
      busy.value = true;
      try {
        if (action === 'archive' || action === 'restore')
          await changeActivityState(activity);
        else await transitionActivity(activity.id, activity.version, action);
        context.assertCurrent();
        message.success('活动状态已更新');
        emit('changed');
      } finally {
        busy.value = false;
      }
    },
  });
}
</script>

<template>
  <Space :size="small ? 0 : 8" :wrap="!small">
    <Button
      v-if="
        activity.canSubmitReview &&
        (!actions || actions.includes('submit-review'))
      "
      :type="small ? 'link' : 'primary'"
      :size="small ? 'small' : 'middle'"
      :loading="busy"
      @click="act('submit-review')"
    >
      提交审核
    </Button>
    <Button
      v-if="
        activity.canWithdrawReview &&
        (!actions || actions.includes('withdraw-review'))
      "
      :type="small ? 'link' : 'default'"
      :size="small ? 'small' : 'middle'"
      :loading="busy"
      @click="act('withdraw-review')"
    >
      撤回草稿
    </Button>
    <Button
      v-if="activity.canPublish && (!actions || actions.includes('publish'))"
      :type="small ? 'link' : 'primary'"
      :size="small ? 'small' : 'middle'"
      :loading="busy"
      @click="act('publish')"
    >
      发布
    </Button>
    <Button
      v-if="activity.canArchive && (!actions || actions.includes('archive'))"
      type="link"
      :size="small ? 'small' : 'middle'"
      :disabled="busy"
      danger
      @click="act('archive')"
    >
      归档
    </Button>
    <Button
      v-if="activity.canRestore && (!actions || actions.includes('restore'))"
      type="link"
      :size="small ? 'small' : 'middle'"
      :disabled="busy"
      @click="act('restore')"
    >
      恢复
    </Button>
  </Space>
</template>
