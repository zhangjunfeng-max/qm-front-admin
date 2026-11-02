<script setup lang="ts">
import type { Activity, ActivityGroup } from '#/api/management';

import { onMounted, reactive, ref } from 'vue';

import {
  Alert,
  Button,
  Form,
  FormItem,
  Input,
  InputNumber,
  message,
  Modal,
  Space,
  Table,
} from 'ant-design-vue';

import {
  deleteActivityGroup,
  getActivityGroups,
  saveActivityGroup,
} from '#/api/management';
const props = defineProps<{ activity: Activity }>();
const emit = defineEmits<{ changed: [] }>();
const editing = ref('');
const failed = ref(false);
const items = ref<ActivityGroup[]>([]);
const loading = ref(false);
const open = ref(false);
const saving = ref(false);
const form = reactive({ name: '', sortOrder: 0 });
async function load() {
  loading.value = true;
  failed.value = false;
  try {
    items.value = (await getActivityGroups(props.activity.id)).items;
  } catch {
    failed.value = true;
  } finally {
    loading.value = false;
  }
}
function edit(row?: ActivityGroup) {
  editing.value = row?.id || '';
  form.name = row?.name || '';
  form.sortOrder = row?.sortOrder || 0;
  open.value = true;
}
async function save() {
  if (!form.name.trim()) {
    message.warning('请输入小组名称');
    return;
  }
  saving.value = true;
  try {
    await saveActivityGroup(props.activity.id, editing.value, { ...form });
    open.value = false;
    await load();
    emit('changed');
  } catch {
  } finally {
    saving.value = false;
  }
}
function remove(row: ActivityGroup) {
  Modal.confirm({
    title: `删除“${row.name}”？`,
    content: '已有成员的小组不能删除，请先调整成员分组。',
    async onOk() {
      await deleteActivityGroup(props.activity.id, row.id);
      await load();
      emit('changed');
    },
  });
}
onMounted(load);
</script>
<template>
  <div>
    <Space class="mb-4">
      <Button v-if="activity.canManageGroups" type="primary" @click="edit()">
        新增小组
      </Button>
      <Button :loading="loading" @click="load">刷新</Button>
    </Space>
    <Alert v-if="failed" type="error" message="小组加载失败" class="mb-3">
      <template #action><Button @click="load">重试</Button></template>
    </Alert>
    <Table
      row-key="id"
      :data-source="items"
      :loading="loading"
      :pagination="false"
      :columns="[
        { title: '小组名称', dataIndex: 'name', ellipsis: true },
        { title: '成员人数', dataIndex: 'memberCount', width: 100 },
        { title: '排序', dataIndex: 'sortOrder', width: 90 },
        { title: '操作', key: 'actions', width: 150 },
      ]"
    >
      <template #bodyCell="{ column, record }">
        <Space v-if="column.key === 'actions' && activity.canManageGroups">
          <Button type="link" @click="edit(record as ActivityGroup)">
            编辑
          </Button>
          <Button type="link" danger @click="remove(record as ActivityGroup)">
            删除
          </Button>
        </Space>
      </template>
    </Table>
    <Modal
      :open="open"
      :title="editing ? '编辑小组' : '新增小组'"
      :confirm-loading="saving"
      @ok="save"
      @cancel="open = false"
    >
      <Form layout="vertical">
        <FormItem label="小组名称" required>
          <Input v-model:value="form.name" :maxlength="80" />
        </FormItem>
        <FormItem label="排序">
          <InputNumber v-model:value="form.sortOrder" :min="0" :precision="0" />
        </FormItem>
      </Form>
    </Modal>
  </div>
</template>
