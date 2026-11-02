<script setup lang="ts">
import type { Employee, EmployeeInput } from '#/api/management';

import { reactive, ref } from 'vue';

import { useUserStore } from '@vben/stores';

import {
  Alert,
  Button,
  Drawer,
  Form,
  FormItem,
  Input,
  InputPassword,
  InputSearch,
  message,
  Select,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';

import { getEmployees, saveEmployee } from '#/api/management';
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
} = useList(getEmployees);
const open = ref(false);
const saving = ref(false);
const editingId = ref('');
const owner = ref(false);
const form = reactive<EmployeeInput>({
  phone: '',
  password: '',
  displayName: '',
  avatarUrl: '',
  remark: '',
  role: 'member',
  status: 'active',
});
const userStore = useUserStore();
function edit(row?: Employee) {
  editingId.value = row?.userId || '';
  owner.value = row?.role === 'owner';
  Object.assign(form, {
    phone: row?.phone || '',
    password: '',
    displayName: row?.displayName || '',
    avatarUrl: row?.avatarUrl || '',
    remark: row?.remark || '',
    role: row?.role || 'member',
    status: row?.status || 'active',
  });
  open.value = true;
}
async function save() {
  if (saving.value) return;
  if (
    !form.displayName.trim() ||
    (!editingId.value && !/^1[3-9]\d{9}$/.test(form.phone || ''))
  ) {
    message.warning('请填写姓名和有效手机号');
    return;
  }
  saving.value = true;
  try {
    const { phone, password, ...data } = form;
    await saveEmployee(
      editingId.value,
      editingId.value
        ? data
        : { ...data, phone, password: password || undefined },
    );
    message.success('员工已保存');
    open.value = false;
    await load();
  } catch {
  } finally {
    saving.value = false;
  }
}
const columns = [
  { title: '员工姓名', dataIndex: 'displayName', ellipsis: true },
  { title: '手机号', dataIndex: 'phone', width: 150 },
  { title: '公司角色', key: 'role', width: 130 },
  { title: '状态', key: 'status', width: 90 },
  { title: '备注', dataIndex: 'remark', ellipsis: true },
  { title: '加入时间', key: 'createdAt', width: 180 },
  { title: '操作', key: 'actions', width: 90 },
];
</script>
<template>
  <ListShell
    title="员工管理"
    description="管理当前公司的员工"
    v-bind="{ loading, failed, page, pageSize, total }"
    @reload="load"
    @change="change"
  >
    <template #extra>
      <Button type="primary" @click="edit()">新增员工</Button>
    </template>
    <template #filters>
      <InputSearch
        v-model:value="keyword"
        placeholder="搜索姓名或手机号"
        allow-clear
        class="w-72"
        @search="search"
      />
      <Select
        v-model:value="status"
        placeholder="全部状态"
        allow-clear
        class="w-36"
        :options="[
          { label: '正常', value: 'active' },
          { label: '已停用', value: 'disabled' },
        ]"
        @change="search"
      />
    </template>
    <Table
      row-key="userId"
      :columns="columns"
      :data-source="items"
      :loading="loading"
      :pagination="false"
      :scroll="{ x: 950 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'role'">
          {{
            { owner: '公司负责人', admin: '公司管理员', member: '员工' }[
              record.role as Employee['role']
            ]
          }}
        </template>
        <Tag
          v-else-if="column.key === 'status'"
          :color="record.status === 'active' ? 'success' : 'default'"
        >
          {{ record.status === 'active' ? '正常' : '已停用' }}
        </Tag>
        <template v-else-if="column.key === 'createdAt'">
          {{ new Date(record.createdAt).toLocaleString() }}
        </template>
        <Button
          v-else-if="column.key === 'actions'"
          type="link"
          @click="edit(record as Employee)"
        >
          编辑
        </Button>
      </template>
    </Table>
    <template #dialogs>
      <Drawer
        :open="open"
        :title="editingId ? '编辑员工' : '新增员工'"
        width="min(560px,100vw)"
        :mask-closable="!saving"
        @close="open = false"
      >
        <Form layout="vertical" :disabled="saving">
          <FormItem label="姓名" required>
            <Input v-model:value="form.displayName" :maxlength="120" />
          </FormItem>
          <FormItem label="手机号" required>
            <Input
              v-model:value="form.phone"
              :disabled="!!editingId"
              :maxlength="11"
            />
          </FormItem>
          <FormItem v-if="!editingId" label="初始密码">
            <InputPassword
              v-model:value="form.password"
              autocomplete="new-password"
            />
            <div class="mt-1 text-xs text-muted-foreground">
              新账号请设置登录密码；已有账号继续使用原密码。
            </div>
          </FormItem>
          <FormItem label="公司角色">
            <Select
              v-model:value="form.role"
              :disabled="owner || editingId === userStore.userInfo?.userId"
              :options="
                owner
                  ? [{ label: '公司负责人', value: 'owner' }]
                  : [
                      { label: '员工', value: 'member' },
                      { label: '公司管理员', value: 'admin' },
                    ]
              "
            />
          </FormItem>
          <Alert
            class="mb-4"
            type="info"
            message="活动角色在各活动中单独分配，不受此处员工身份名称影响。"
          />
          <FormItem label="头像地址">
            <Input v-model:value="form.avatarUrl" placeholder="https://" />
          </FormItem>
          <FormItem label="备注">
            <Input.TextArea
              v-model:value="form.remark"
              :maxlength="1000"
              :rows="3"
            />
          </FormItem>
          <FormItem label="状态">
            <Select
              v-model:value="form.status"
              :disabled="editingId === userStore.userInfo?.userId || owner"
              :options="[
                { label: '正常', value: 'active' },
                { label: '已停用', value: 'disabled' },
              ]"
            />
          </FormItem>
        </Form>
        <template #footer>
          <Space class="float-right">
            <Button @click="open = false">取消</Button>
            <Button type="primary" :loading="saving" @click="save">保存</Button>
          </Space>
        </template>
      </Drawer>
    </template>
  </ListShell>
</template>
