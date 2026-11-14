<script setup lang="ts">
import type { TableColumnsType } from 'ant-design-vue';

import type { PlatformApi } from '#/api/platform';

import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Alert,
  Button,
  Card,
  Empty,
  InputSearch,
  Pagination,
  Select,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';

import {
  getPlatformPaymentAccountsApi,
  getPlatformTenantsApi,
} from '#/api/platform';

import TenantCreate from './tenant-create.vue';
import TenantProfile from './tenant-profile.vue';
const createOpen = ref(false);
const tableRegion = ref<HTMLElement>();
const items = ref<PlatformApi.Tenant[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const keyword = ref('');
const appliedKeyword = ref('');
const status = ref<PlatformApi.TenantQuery['status']>();
const loading = ref(false);
const failed = ref(false);
let requestVersion = 0;
const profileOpen = ref(false);
const profileId = ref('');
const profileEditing = ref(false);
const router = useRouter();
const merchantCounts = ref(new Map<string, number>());
function openProfile(id: string, editing: boolean) {
  profileId.value = id;
  profileEditing.value = editing;
  profileOpen.value = true;
}
function expired(value: null | string) {
  return !!value && new Date(value).getTime() <= Date.now();
}
const columns: TableColumnsType<PlatformApi.Tenant> = [
  {
    title: '公司名称',
    dataIndex: 'name',
    key: 'name',
    width: 200,
    ellipsis: true,
    fixed: 'left',
  },
  {
    title: '联系人',
    dataIndex: 'contactName',
    key: 'contactName',
    width: 110,
    ellipsis: true,
  },
  {
    title: '联系电话',
    dataIndex: 'contactPhone',
    key: 'contactPhone',
    width: 150,
    ellipsis: true,
  },
  {
    title: '所属行业',
    dataIndex: 'industry',
    key: 'industry',
    width: 130,
    ellipsis: true,
  },
  {
    title: '有效成员',
    dataIndex: 'memberCount',
    key: 'memberCount',
    width: 100,
  },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '支付账户', key: 'paymentAccounts', width: 130 },
  {
    title: '服务到期时间',
    dataIndex: 'expiresAt',
    key: 'expiresAt',
    width: 190,
  },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 190 },
  { title: '操作', key: 'actions', width: 180, fixed: 'right' },
];
const pagination = computed(() => ({
  current: page.value,
  pageSize: pageSize.value,
  total: total.value,
  showSizeChanger: true,
  showTotal: (count: number) => `共 ${count} 家公司`,
}));
async function load() {
  const version = ++requestVersion;
  loading.value = true;
  failed.value = false;
  items.value = [];
  total.value = 0;
  try {
    const [result, accounts] = await Promise.all([
      getPlatformTenantsApi({
        page: page.value,
        pageSize: pageSize.value,
        keyword: appliedKeyword.value || undefined,
        status: status.value,
      }),
      getPlatformPaymentAccountsApi({ page: 1, pageSize: 100 }),
    ]);
    if (version !== requestVersion) return;
    items.value = result.items;
    total.value = result.total;
    const next = new Map<string, number>();
    for (const account of accounts.items) {
      for (const binding of account.bindings) {
        next.set(binding.tenantId, (next.get(binding.tenantId) || 0) + 1);
      }
    }
    merchantCounts.value = next;
  } catch {
    if (version === requestVersion) failed.value = true;
  } finally {
    if (version === requestVersion) loading.value = false;
  }
}
function search() {
  appliedKeyword.value = keyword.value.trim();
  page.value = 1;
  void load();
}
function changePage(current: number, nextSize: number) {
  page.value = nextSize === pageSize.value ? current : 1;
  pageSize.value = nextSize;
  void load();
}
onMounted(load);
</script>

<template>
  <Page
    title="公司管理"
    description="查看平台全部公司"
    auto-content-height
    content-class="flex flex-col gap-4"
  >
    <template #extra>
      <Button type="primary" class="mr-2" @click="createOpen = true">
        新增公司
      </Button>
      <Button :loading="loading" @click="load">刷新</Button>
    </template>
    <Alert
      v-if="failed"
      class="shrink-0"
      message="公司列表加载失败，请稍后重试"
      type="error"
      show-icon
    >
      <template #action>
        <Button size="small" @click="load">重试</Button>
      </template>
    </Alert>
    <Card
      class="flex min-h-[480px] flex-1 flex-col"
      :body-style="{
        display: 'flex',
        flexDirection: 'column',
        flex: '1',
        minHeight: 0,
      }"
    >
      <div class="mb-4 flex shrink-0 flex-wrap gap-3">
        <InputSearch
          v-model:value="keyword"
          placeholder="搜索公司名称"
          :maxlength="80"
          allow-clear
          class="w-full sm:w-72"
          @search="search"
        />
        <Select
          v-model:value="status"
          placeholder="全部状态"
          allow-clear
          class="w-36"
          :options="[
            { label: '正常', value: 'active' },
            { label: '已禁用', value: 'disabled' },
          ]"
          @change="search"
        />
      </div>
      <div ref="tableRegion" class="min-h-0 flex-1 overflow-auto">
        <Table
          :columns="columns"
          :data-source="items"
          :loading="loading"
          :pagination="false"
          :scroll="{ x: 1460 }"
          :sticky="{ getContainer: () => tableRegion! }"
          row-key="id"
        >
          <template #bodyCell="{ column, record }">
            <Space v-if="column.key === 'actions'" :size="0">
              <Button
                type="link"
                size="small"
                @click="openProfile(record.id, false)"
              >
                详情
              </Button>
              <Button
                type="link"
                size="small"
                @click="openProfile(record.id, true)"
              >
                编辑
              </Button>
              <Button
                type="link"
                size="small"
                @click="
                  router.push({
                    path: '/platform/payments',
                    query: { tenantId: record.id },
                  })
                "
              >
                支付配置
              </Button>
            </Space>
            <template
              v-else-if="
                ['contactName', 'contactPhone', 'industry'].includes(
                  String(column.key),
                )
              "
            >
              {{ record[String(column.key)] || '未设置' }}
            </template>
            <template v-else-if="column.key === 'expiresAt'">
              <span :class="{ 'text-destructive': expired(record.expiresAt) }">
                {{
                  record.expiresAt
                    ? new Date(record.expiresAt).toLocaleString()
                    : '不限期'
                }}
              </span>
              <Tag v-if="expired(record.expiresAt)" color="error">已到期</Tag>
            </template>
            <Tag
              v-else-if="column.key === 'paymentAccounts'"
              :color="merchantCounts.get(record.id) ? 'success' : 'warning'"
            >
              {{
                merchantCounts.get(record.id)
                  ? `已绑定 ${merchantCounts.get(record.id)} 个`
                  : '未绑定'
              }}
            </Tag>
            <Tag
              v-else-if="column.key === 'status'"
              :color="record.status === 'active' ? 'success' : 'default'"
            >
              {{ record.status === 'active' ? '正常' : '已禁用' }}
            </Tag>
            <template v-else-if="column.key === 'createdAt'">
              {{ new Date(record.createdAt).toLocaleString() }}
            </template>
          </template>
          <template #emptyText><Empty description="暂无匹配的公司" /></template>
        </Table>
      </div>
      <div class="mt-4 flex shrink-0 justify-end border-t border-border pt-4">
        <Pagination v-bind="pagination" responsive @change="changePage" />
      </div>
    </Card>
    <TenantCreate
      :open="createOpen"
      @close="createOpen = false"
      @saved="load"
    />
    <TenantProfile
      :open="profileOpen"
      :tenant-id="profileId"
      :editing="profileEditing"
      @close="profileOpen = false"
      @saved="load"
    />
  </Page>
</template>
