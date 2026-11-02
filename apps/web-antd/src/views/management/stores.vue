<script setup lang="ts">
import type { Store, StoreInput } from '#/api/management';

import { reactive, ref } from 'vue';

import {
  Button,
  Drawer,
  Form,
  FormItem,
  Input,
  InputSearch,
  message,
  Select,
  Space,
  Switch,
  Table,
  Tag,
} from 'ant-design-vue';

import { getStores, saveStore } from '#/api/management';
import ListShell from '#/components/management/list-shell.vue';

import { useList } from './use-list';

const {
  items,
  total,
  page,
  pageSize,
  keyword,
  status,
  loading,
  failed,
  load,
  search,
  change,
} = useList(getStores);
const open = ref(false);
const saving = ref(false);
const editingId = ref('');
const form = reactive<StoreInput>({
  name: '',
  address: '',
  contactName: '',
  contactPhone: '',
  remark: '',
  status: 'active',
});
function edit(store?: Store) {
  editingId.value = store?.id || '';
  Object.assign(form, {
    name: store?.name || '',
    address: store?.address || '',
    contactName: store?.contactName || '',
    contactPhone: store?.contactPhone || '',
    remark: store?.remark || '',
    status: store?.status || 'active',
  });
  open.value = true;
}
async function save() {
  if (saving.value) return;
  if (!form.name.trim()) {
    message.warning('请填写门店名称');
    return;
  }
  if (!/^[\d+()\s-]*$/.test(form.contactPhone)) {
    message.warning('请填写有效联系电话');
    return;
  }
  saving.value = true;
  try {
    await saveStore(editingId.value, { ...form });
    message.success('门店已保存');
    open.value = false;
    await load();
  } catch {
  } finally {
    saving.value = false;
  }
}
const columns = [
  { title: '门店名称', dataIndex: 'name', ellipsis: true },
  { title: '门店地址', dataIndex: 'address', ellipsis: true },
  { title: '联系人', dataIndex: 'contactName', width: 120, ellipsis: true },
  { title: '联系电话', dataIndex: 'contactPhone', width: 160 },
  { title: '状态', key: 'status', width: 90 },
  { title: '更新时间', key: 'updatedAt', width: 180 },
  { title: '操作', key: 'actions', width: 80 },
];
</script>

<template>
  <ListShell
    title="门店管理"
    description="维护当前公司的门店，创建活动时可选择多个参与门店"
    v-bind="{ loading, failed, page, pageSize, total }"
    @reload="load"
    @change="change"
  >
    <template #extra>
      <Button type="primary" @click="edit()">新增门店</Button>
    </template>
    <template #filters>
      <InputSearch
        v-model:value="keyword"
        placeholder="搜索名称、地址、联系人或电话"
        allow-clear
        @search="search"
      />
      <Select
        v-model:value="status"
        placeholder="全部状态"
        allow-clear
        :options="[
          { label: '启用', value: 'active' },
          { label: '已停用', value: 'disabled' },
        ]"
        @change="search"
      />
    </template>
    <Table
      row-key="id"
      :columns="columns"
      :data-source="items"
      :loading="loading"
      :pagination="false"
      :scroll="{ x: 1050 }"
    >
      <template #bodyCell="{ column, record }">
        <Tag
          v-if="column.key === 'status'"
          :color="record.status === 'active' ? 'success' : 'default'"
        >
          {{ record.status === 'active' ? '启用' : '已停用' }}
        </Tag>
        <template v-else-if="column.key === 'updatedAt'">
          {{ new Date(record.updatedAt).toLocaleString() }}
        </template>
        <Button
          v-else-if="column.key === 'actions'"
          type="link"
          @click="edit(record as Store)"
        >
          编辑
        </Button>
      </template>
    </Table>
    <template #dialogs>
      <Drawer
        :open="open"
        :title="editingId ? '编辑门店' : '新增门店'"
        width="min(640px,100vw)"
        :mask-closable="!saving"
        @close="open = false"
      >
        <Form layout="vertical" :disabled="saving" class="store-form">
          <FormItem label="门店名称" required>
            <Input v-model:value="form.name" :maxlength="160" />
          </FormItem>
          <FormItem label="启用门店">
            <Switch
              :checked="form.status === 'active'"
              @update:checked="form.status = $event ? 'active' : 'disabled'"
            />
          </FormItem>
          <FormItem label="联系人">
            <Input v-model:value="form.contactName" :maxlength="80" />
          </FormItem>
          <FormItem label="联系电话">
            <Input
              v-model:value="form.contactPhone"
              :maxlength="32"
              inputmode="tel"
            />
          </FormItem>
          <FormItem label="门店地址" class="store-field-wide">
            <Input v-model:value="form.address" :maxlength="300" />
          </FormItem>
          <FormItem label="备注" class="store-field-wide">
            <Input.TextArea
              v-model:value="form.remark"
              :maxlength="1000"
              :auto-size="{ minRows: 2, maxRows: 4 }"
            />
          </FormItem>
          <p class="store-field-wide text-xs text-muted-foreground">
            停用后不可新增到活动，已有活动关联会保留。
          </p>
        </Form>
        <template #footer>
          <Space class="float-right">
            <Button @click="open = false">取消</Button>
            <Button type="primary" :loading="saving" @click="save">
              保存门店
            </Button>
          </Space>
        </template>
      </Drawer>
    </template>
  </ListShell>
</template>

<style scoped>
.store-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 16px;
}

.store-form :deep(.ant-form-item) {
  min-width: 0;
  margin-bottom: 12px;
}

.store-form :deep(.ant-form-item-label) {
  padding-bottom: 4px;
}

.store-field-wide {
  grid-column: 1 / -1;
}

@media (max-width: 599px) {
  .store-form {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
