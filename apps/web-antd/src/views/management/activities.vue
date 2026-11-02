<script setup lang="ts">
import type { Activity } from '#/api/management';

import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useUserStore } from '@vben/stores';

import { Button, InputSearch, Select, Space, Table, Tag } from 'ant-design-vue';

import {
  activityStatusColor,
  activityStatusLabel,
  activityStatusOptions,
} from '#/api/activity-lifecycle';
import { getActivities } from '#/api/management';
import ActivityActions from '#/components/management/activity-actions.vue';
import ListShell from '#/components/management/list-shell.vue';

import ActivityEditor from './activity-editor.vue';
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
} = useList(getActivities);
const router = useRouter();
const user = useUserStore();
const canCreate = computed(() =>
  user.userInfo?.roles?.some((r) => ['admin', 'owner'].includes(r)),
);
const editId = ref('');
const open = ref(false);
function edit(id = '') {
  editId.value = id;
  open.value = true;
}
const roleLabels: Record<string, string> = {
  admin: '活动管理员',
  leader: '组长',
  member: '组员',
  owner: '公司负责人',
  tenant_admin: '公司管理员',
};
const columns = [
  { title: '活动名称', dataIndex: 'name', ellipsis: true },
  { title: '玩法', key: 'type', width: 100 },
  { title: '活动状态', key: 'status', width: 120 },
  { title: '参与员工', dataIndex: 'memberCount', width: 100 },
  { title: '员工小组', dataIndex: 'groupCount', width: 100 },
  { title: '我的角色', key: 'role', width: 130 },
  { title: '更新时间', key: 'updatedAt', width: 180 },
  { title: '操作', key: 'actions', width: 240, fixed: 'right' as const },
];
</script>
<template>
  <ListShell
    title="活动管理"
    description="配置本公司活动、活动员工、小组与角色权限"
    v-bind="{ loading, failed, page, pageSize, total }"
    @reload="load"
    @change="change"
  >
    <template #extra>
      <Button v-if="canCreate" type="primary" @click="edit()">创建活动</Button>
    </template>
    <template #filters>
      <InputSearch
        v-model:value="keyword"
        placeholder="搜索活动名称"
        class="w-72"
        allow-clear
        @search="search"
      />
      <Select
        v-model:value="status"
        placeholder="全部状态"
        class="w-36"
        allow-clear
        :options="activityStatusOptions"
        @change="search"
      />
    </template>
    <Table
      row-key="id"
      :columns="columns"
      :data-source="items"
      :loading="loading"
      :pagination="false"
      :scroll="{ x: 1240 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'type'">
          {{ record.groupEnabled ? '拼团活动' : '营销活动' }}
        </template>
        <Tag
          v-else-if="column.key === 'status'"
          :color="activityStatusColor(record.status)"
        >
          {{ activityStatusLabel(record.status) }}
        </Tag>
        <template v-else-if="column.key === 'role'">
          {{ roleLabels[record.currentRole] || '可申请加入' }}
        </template>
        <template v-else-if="column.key === 'updatedAt'">
          {{ new Date(record.updatedAt).toLocaleString() }}
        </template>
        <Space
          v-else-if="column.key === 'actions'"
          :size="0"
          class="activity-table-actions whitespace-nowrap"
        >
          <Button
            type="link"
            size="small"
            @click="router.push(`/activities/${record.id}`)"
          >
            详情
          </Button>
          <Button
            v-if="record.canEdit"
            type="link"
            size="small"
            @click="edit(record.id)"
          >
            编辑
          </Button>
          <ActivityActions
            :activity="record as Activity"
            small
            @changed="load"
          />
        </Space>
      </template>
    </Table>
    <template #dialogs>
      <ActivityEditor
        :open="open"
        :activity-id="editId"
        @close="open = false"
        @saved="load"
      />
    </template>
  </ListShell>
</template>

<style scoped>
.activity-table-actions :deep(.ant-btn-link) {
  padding-inline: 4px;
}
</style>
