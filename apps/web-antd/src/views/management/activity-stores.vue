<script setup lang="ts">
import type { Activity } from '#/api/management';

import { ref, watch } from 'vue';

import { Button, message, Modal, Table, Tag } from 'ant-design-vue';

import { saveActivityStores } from '#/api/management';
import ActivityStoreSelect from '#/components/management/activity-store-select.vue';

const props = defineProps<{ activity: Activity }>();
const emit = defineEmits<{ changed: [] }>();
const open = ref(false);
const saving = ref(false);
const selecting = ref(false);
const selected = ref<string[]>([]);
const version = ref(0);
function edit() {
  selected.value = [...props.activity.storeIds];
  version.value = props.activity.version;
  open.value = true;
}
async function save() {
  if (saving.value || selecting.value) return;
  saving.value = true;
  try {
    await saveActivityStores(props.activity.id, {
      version: version.value,
      storeIds: selected.value,
    });
    message.success('参与门店已保存');
    open.value = false;
    emit('changed');
  } catch {
  } finally {
    saving.value = false;
  }
}
watch(
  () => props.activity.id,
  () => {
    open.value = false;
  },
);
</script>

<template>
  <div>
    <Button v-if="activity.canEdit" type="primary" class="mb-4" @click="edit">
      设置门店
    </Button>
    <Table
      row-key="id"
      :data-source="activity.stores"
      :pagination="false"
      :scroll="{ x: 500 }"
      :columns="[
        { title: '门店名称', dataIndex: 'name', ellipsis: true },
        { title: '地址', dataIndex: 'address', ellipsis: true },
        { title: '状态', key: 'status', width: 100 },
      ]"
    >
      <template #bodyCell="{ column, record }">
        <Tag
          v-if="column.key === 'status'"
          :color="record.status === 'active' ? 'success' : 'default'"
        >
          {{ record.status === 'active' ? '启用' : '停用' }}
        </Tag>
      </template>
    </Table>
    <Modal
      :open="open"
      title="设置参与门店"
      :confirm-loading="saving"
      :ok-button-props="{ disabled: selecting }"
      :cancel-button-props="{ disabled: saving }"
      :closable="!saving"
      :mask-closable="false"
      @ok="save"
      @cancel="open = false"
    >
      <ActivityStoreSelect
        v-model="selected"
        v-model:busy="selecting"
        :open="open"
        :activity-id="activity.id"
        :selected-stores="activity.stores"
        :disabled="saving"
      />
    </Modal>
  </div>
</template>
