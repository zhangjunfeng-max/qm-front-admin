<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { Button, InputSearch, Select, Table, Tag } from 'ant-design-vue';

import { getCustomers } from '#/api/customer-management';
import ListShell from '#/components/management/list-shell.vue';

import { useList } from './use-list';

const router = useRouter();
const kind = ref<string>();
const {
  items,
  total,
  page,
  pageSize,
  keyword,
  loading,
  failed,
  load,
  search,
  change,
} = useList((query) => getCustomers({ ...query, kind: kind.value }));
const columns = [
  { title: '待跟进', key: 'pending', width: 155 },
  { title: '客户姓名', key: 'name', ellipsis: true },
  { title: '报名人电话', key: 'phone', width: 150 },
  { title: '最近活动销售', key: 'sales', width: 130, ellipsis: true },
  { title: '最近留资时间', key: 'lastContactAt', width: 180 },
  { title: '最近订单时间', key: 'lastOrderAt', width: 180 },
  { title: '最近参与活动', key: 'activity', width: 160, ellipsis: true },
  { title: '最近报名成功', key: 'lastRegistrationAt', width: 180 },
  { title: '客户身份', key: 'kind', width: 120 },
  { title: '订单数', dataIndex: 'orderCount', width: 90 },
  { title: '建档时间', key: 'createdAt', width: 180 },
  { title: '操作', key: 'actions', width: 100, fixed: 'right' as const },
];
</script>

<template>
  <ListShell
    title="客户管理"
    v-bind="{ loading, failed, page, pageSize, total }"
    @reload="load"
    @change="change"
  >
    <template #filters>
      <InputSearch
        v-model:value="keyword"
        placeholder="搜索客户姓名或手机号"
        allow-clear
        @search="search"
      />
      <Select
        v-model:value="kind"
        placeholder="全部客户身份"
        allow-clear
        :options="[
          { label: '微信', value: 'wechat' },
          { label: '未登录留资', value: 'lead' },
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
      :scroll="{ x: 1800 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'pending'">
          <Button
            v-if="record.pendingOrderCount"
            type="link"
            class="!text-orange-500"
            @click="
              router.push({
                path: '/orders',
                query: { customerId: record.id, status: 'pending_payment' },
              })
            "
          >
            {{ record.pendingOrderCount }}笔待支付
          </Button>
          <Button
            v-if="record.pendingRegistrationCount"
            type="link"
            @click="
              router.push({
                path: '/orders',
                query: {
                  customerId: record.id,
                  status: 'pending_registration',
                },
              })
            "
          >
            {{ record.pendingRegistrationCount }}人次待报名
          </Button>
          <span
            v-if="!record.pendingOrderCount && !record.pendingRegistrationCount"
            >—</span>
        </template>
        <template v-else-if="column.key === 'name'">
          {{ record.displayName || '未填写姓名' }}
        </template>
        <template v-else-if="column.key === 'phone'">
          {{ record.customerPhone || record.phone || '未绑定手机号' }}
        </template>
        <template v-else-if="column.key === 'sales'">
          {{ record.salesName || (record.activityName ? '未归属销售' : '—') }}
        </template>
        <template v-else-if="column.key === 'activity'">
          {{ record.activityName || '—' }}
        </template>
        <template v-else-if="column.key === 'lastOrderAt'">
          {{
            record.lastOrderAt
              ? new Date(record.lastOrderAt).toLocaleString()
              : '—'
          }}
        </template>
        <template v-else-if="column.key === 'lastContactAt'">
          {{
            record.lastContactAt
              ? new Date(record.lastContactAt).toLocaleString()
              : '—'
          }}
        </template>
        <Tag
          v-else-if="column.key === 'kind'"
          :color="record.kind === 'wechat' ? 'green' : 'orange'"
        >
          {{ record.kind === 'wechat' ? '微信' : '未登录留资' }}
        </Tag>
        <template v-else-if="column.key === 'createdAt'">
          {{ new Date(record.createdAt).toLocaleString() }}
        </template>
        <template v-else-if="column.key === 'lastRegistrationAt'">
          {{
            record.lastRegistrationAt
              ? new Date(record.lastRegistrationAt).toLocaleString()
              : '—'
          }}
        </template>
        <Button
          v-else-if="column.key === 'actions'"
          type="link"
          @click="
            router.push({ path: '/orders', query: { customerId: record.id } })
          "
        >
          查看记录
        </Button>
      </template>
    </Table>
  </ListShell>
</template>
