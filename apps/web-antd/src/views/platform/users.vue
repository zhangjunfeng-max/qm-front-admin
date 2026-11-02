<script setup lang="ts">
import type { TableColumnsType } from 'ant-design-vue';

import type { PlatformApi } from '#/api/platform';

import { onMounted, ref } from 'vue';

import {
  Button,
  Empty,
  InputSearch,
  Select,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';

import { getPlatformUsersApi } from '#/api/platform';
import ListShell from '#/components/management/list-shell.vue';

import UserProfile from './user-profile.vue';

const items = ref<PlatformApi.User[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const keyword = ref('');
const appliedKeyword = ref('');
const status = ref<PlatformApi.UserQuery['status']>();
const identity = ref<PlatformApi.UserQuery['identity']>();
const membership = ref<PlatformApi.UserQuery['membership']>();
const loading = ref(false);
const failed = ref(false);
const open = ref(false);
const selectedId = ref('');
const editing = ref(false);
let version = 0;
const columns: TableColumnsType<PlatformApi.User> = [
  {
    title: '用户姓名',
    dataIndex: 'displayName',
    ellipsis: true,
    width: 160,
    fixed: 'left',
  },
  { title: '手机号', dataIndex: 'phone', width: 150 },
  { title: '平台身份', key: 'identity', width: 130 },
  { title: '账号状态', key: 'status', width: 110 },
  { title: '加入公司', key: 'companies', width: 120 },
  { title: '最近登录', key: 'lastLoginAt', width: 180 },
  { title: '注册时间', key: 'createdAt', width: 180 },
  { title: '操作', key: 'actions', width: 120, fixed: 'right' },
];
async function load() {
  const current = ++version;
  loading.value = true;
  failed.value = false;
  items.value = [];
  total.value = 0;
  try {
    const result = await getPlatformUsersApi({
      page: page.value,
      pageSize: pageSize.value,
      keyword: appliedKeyword.value || undefined,
      status: status.value,
      identity: identity.value,
      membership: membership.value,
    });
    if (current !== version) return;
    items.value = result.items;
    total.value = result.total;
  } catch {
    if (current === version) failed.value = true;
  } finally {
    if (current === version) loading.value = false;
  }
}
function search() {
  appliedKeyword.value = keyword.value.trim();
  page.value = 1;
  void load();
}
function change(current: number, size: number) {
  page.value = size === pageSize.value ? current : 1;
  pageSize.value = size;
  void load();
}
function show(id = '', edit = true) {
  selectedId.value = id;
  editing.value = edit;
  open.value = true;
}
function date(value: null | string) {
  return value ? new Date(value).toLocaleString() : '尚未登录';
}
onMounted(load);
</script>
<template>
  <ListShell
    title="用户管理"
    description="管理全平台账号；未加入公司的用户也会显示。员工与活动角色在对应公司内维护。"
    v-bind="{ loading, failed, page, pageSize, total }"
    @reload="load"
    @change="change"
  >
    <template #extra>
      <Button type="primary" @click="show()">新增用户</Button>
    </template>
    <template #filters>
      <InputSearch
        v-model:value="keyword"
        placeholder="搜索姓名或手机号"
        allow-clear
        @search="search"
      />
      <Select
        v-model:value="status"
        placeholder="全部账号状态"
        allow-clear
        :options="[
          { label: '正常', value: 'active' },
          { label: '已禁用', value: 'disabled' },
        ]"
        @change="search"
      />
      <Select
        v-model:value="identity"
        placeholder="全部平台身份"
        allow-clear
        :options="[
          { label: '平台管理员', value: 'platform' },
          { label: '普通用户', value: 'ordinary' },
        ]"
        @change="search"
      />
      <Select
        v-model:value="membership"
        placeholder="全部公司关系"
        allow-clear
        :options="[
          { label: '已加入公司', value: 'joined' },
          { label: '未加入公司', value: 'unjoined' },
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
      :scroll="{ x: 1150 }"
    >
      <template #bodyCell="{ column, record }">
        <Tag
          v-if="column.key === 'identity'"
          :color="record.isPlatformAdmin ? 'blue' : 'default'"
        >
          {{ record.isPlatformAdmin ? '平台管理员' : '普通用户' }}
        </Tag>
        <Tag
          v-else-if="column.key === 'status'"
          :color="record.status === 'active' ? 'success' : 'default'"
        >
          {{ record.status === 'active' ? '正常' : '已禁用' }}
        </Tag>
        <Button
          v-else-if="column.key === 'companies'"
          type="link"
          size="small"
          @click="show(record.id, false)"
        >
          {{
            record.companyCount ? `${record.companyCount} 家公司` : '未加入公司'
          }}
        </Button>
        <template
          v-else-if="column.key === 'lastLoginAt' || column.key === 'createdAt'"
        >
          {{ date(record[column.key]) }}
        </template>
        <Space v-else-if="column.key === 'actions'" :size="0">
          <Button type="link" size="small" @click="show(record.id, false)">
            详情
          </Button>
          <Button type="link" size="small" @click="show(record.id, true)">
            编辑
          </Button>
        </Space>
      </template>
      <template #emptyText><Empty description="暂无匹配的用户" /></template>
    </Table>
    <template #dialogs>
      <UserProfile
        :open="open"
        :user-id="selectedId"
        :editing="editing"
        @close="open = false"
        @saved="load"
      />
    </template>
  </ListShell>
</template>
