<script setup lang="ts">
import type { PlatformActivity } from '#/api/activity-lifecycle';

import { ref, watch } from 'vue';

import { Button, DatePicker, Form, FormItem, message, Modal } from 'ant-design-vue';

import { updatePlatformActivitySchedule } from '#/api/activity-lifecycle';
import { captureContext } from '#/api/context-lifecycle';

const props = defineProps<{ activity: PlatformActivity }>();
const emit = defineEmits<{ changed: [activity: PlatformActivity] }>();
const open = ref(false);
const saving = ref(false);
const startsAt = ref('');
const endsAt = ref('');
const version = ref(0);
function show() {
  startsAt.value = props.activity.startsAt || '';
  endsAt.value = props.activity.endsAt || '';
  version.value = props.activity.version;
  open.value = true;
}
async function save() {
  if (saving.value) return;
  if (!startsAt.value || !endsAt.value || new Date(startsAt.value) >= new Date(endsAt.value)) {
    message.warning('请填写开始和结束时间，结束时间须晚于开始时间');
    return;
  }
  const context = captureContext();
  const id = props.activity.id;
  saving.value = true;
  try {
    const updated = await updatePlatformActivitySchedule(id, {
      version: version.value,
      startsAt: new Date(startsAt.value).toISOString(),
      endsAt: new Date(endsAt.value).toISOString(),
    });
    context.assertCurrent();
    if (props.activity.id !== id) return;
    emit('changed', updated);
    open.value = false;
    message.success('活动时间已调整');
  } catch {} finally {
    saving.value = false;
  }
}
watch(() => props.activity.id, () => { open.value = false; });
</script>

<template>
  <Button v-if="activity.canEditSchedule" @click="show">调整时间</Button>
  <Modal :open="open" title="调整活动时间" :confirm-loading="saving" :closable="!saving" :mask-closable="false" :cancel-button-props="{ disabled: saving }" @ok="save" @cancel="open = false">
    <Form layout="vertical" :disabled="saving">
      <FormItem label="开始时间" required>
        <DatePicker v-model:value="startsAt" value-format="YYYY-MM-DDTHH:mm:ssZ" show-time class="w-full" />
      </FormItem>
      <FormItem label="结束时间" required>
        <DatePicker v-model:value="endsAt" value-format="YYYY-MM-DDTHH:mm:ssZ" show-time class="w-full" />
      </FormItem>
      <p class="text-muted-foreground text-xs">调整后保留审核及发布状态，活动展示状态按新时间计算，并通知平台管理员。</p>
    </Form>
  </Modal>
</template>
