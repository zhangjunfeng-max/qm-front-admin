<script setup lang="ts">
import type { TableColumnsType } from 'ant-design-vue';

import type {
  CompanyOverview,
  PlatformOverview,
} from '#/api/platform-overview';

import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Alert,
  Button,
  Card,
  Empty,
  InputSearch,
  Pagination,
  Progress,
  Segmented,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import {
  getPlatformCompanyOverviewApi,
  getPlatformOverviewApi,
} from '#/api/platform-overview';

import OverviewTrend from './overview-trend.vue';

const router = useRouter();
const overview = ref<null | PlatformOverview>(null);
const items = ref<CompanyOverview[]>([]);
const days = ref<7 | 30>(7);
const loading = ref(false);
const companiesLoading = ref(false);
const failed = ref(false);
const companiesFailed = ref(false);
const keyword = ref('');
const appliedKeyword = ref('');
const page = ref(1);
const pageSize = ref(10);
const total = ref(0);
let overviewController: AbortController | undefined;
let companiesController: AbortController | undefined;
let overviewVersion = 0;
let companiesVersion = 0;

const numberFormatter = new Intl.NumberFormat('zh-CN');
function count(value: null | number | undefined) {
  return value == null ? '—' : numberFormatter.format(value);
}
function date(value: null | string | undefined) {
  return value
    ? new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Shanghai',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date(value))
    : '—';
}
const summary = computed(() => overview.value?.summary);
const metrics = computed(() => [
  {
    title: '今日新增活动',
    value: summary.value?.todayActivities,
    detail: `累计活动 ${count(summary.value?.totalActivities)} 场`,
  },
  {
    title: '进行中活动',
    value: summary.value?.runningActivities,
    detail: '已发布且处于活动时间内',
    help: '仅统计已发布、已到开始时间且未到结束时间的活动。草稿及待审核活动不计入。',
  },
  {
    title: '公司总数',
    value: summary.value?.totalCompanies,
    detail: `今日新增 ${count(summary.value?.todayCompanies)} 家`,
  },
  {
    title: '有效员工',
    value: summary.value?.activeEmployees,
    detail: '正常公司内的有效员工',
    help: '账号及公司员工关系均正常，且公司服务未到期。一个人加入两家公司按两名公司员工计数。',
  },
  {
    title: '待审核活动',
    value: summary.value?.pendingReviewActivities,
    detail: '等待平台审核',
  },
  {
    title: '整体真实浏览量',
    value: summary.value?.views,
    detail: overview.value
      ? summary.value?.views == null
        ? '暂无浏览统计'
        : '真实访问，不含虚拟浏览'
      : '等待数据',
    help: '只统计真实访问，不包含活动配置的虚拟浏览量。',
  },
  {
    title: '累计订单量',
    value: summary.value?.orders,
    detail: overview.value
      ? summary.value?.orders == null
        ? '暂无订单统计'
        : '全部活动累计订单'
      : '等待数据',
  },
  {
    title: '今日新增订单',
    value: summary.value?.todayOrders,
    detail: overview.value
      ? summary.value?.todayOrders == null
        ? '暂无订单统计'
        : '北京时间今日新增'
      : '等待数据',
  },
]);
const distribution = computed(() => [
  {
    name: '进行中',
    value: summary.value?.runningActivities ?? 0,
    color: '#16a34a',
  },
  {
    name: '已发布（未开始）',
    value: summary.value?.scheduledActivities ?? 0,
    color: '#1677ff',
  },
  {
    name: '已结束',
    value: summary.value?.endedActivities ?? 0,
    color: '#64748b',
  },
  {
    name: '草稿',
    value: summary.value?.draftActivities ?? 0,
    color: '#94a3b8',
  },
  {
    name: '审核中',
    value: summary.value?.pendingReviewActivities ?? 0,
    color: '#d97706',
  },
  {
    name: '审核通过',
    value: summary.value?.approvedActivities ?? 0,
    color: '#1677ff',
  },
  {
    name: '审核未通过',
    value: summary.value?.rejectedActivities ?? 0,
    color: '#dc2626',
  },
  {
    name: '已归档',
    value: summary.value?.archivedActivities ?? 0,
    color: '#94a3b8',
  },
]);
const columns: TableColumnsType<CompanyOverview> = [
  {
    title: '公司名称',
    dataIndex: 'name',
    key: 'name',
    width: 200,
    fixed: 'left',
    ellipsis: true,
  },
  { title: '状态', key: 'status', width: 90 },
  {
    title: '今日新增活动',
    dataIndex: 'todayActivities',
    key: 'todayActivities',
    width: 120,
    align: 'right',
  },
  {
    title: '累计活动',
    dataIndex: 'totalActivities',
    key: 'totalActivities',
    width: 100,
    align: 'right',
  },
  {
    title: '进行中',
    dataIndex: 'runningActivities',
    key: 'runningActivities',
    width: 90,
    align: 'right',
  },
  {
    title: '有效员工',
    dataIndex: 'activeEmployees',
    key: 'activeEmployees',
    width: 100,
    align: 'right',
  },
  {
    title: '待审核申请',
    dataIndex: 'pendingApplications',
    key: 'pendingApplications',
    width: 110,
    align: 'right',
  },
  { title: '今日新增订单', key: 'todayOrders', width: 120, align: 'right' },
  { title: '最近新增活动', key: 'lastActivityAt', width: 150 },
];
function companyStatus(
  status: CompanyOverview['status'],
  expiresAt: CompanyOverview['expiresAt'],
) {
  if (status === 'disabled') return { name: '已停用', color: 'default' };
  if (
    expiresAt &&
    new Date(expiresAt).getTime() <=
      new Date(overview.value?.generatedAt ?? Date.now()).getTime()
  )
    return { name: '已到期', color: 'warning' };
  return { name: '正常', color: 'success' };
}
async function loadOverview() {
  const version = ++overviewVersion;
  overviewController?.abort();
  const controller = new AbortController();
  overviewController = controller;
  loading.value = true;
  failed.value = false;
  try {
    const result = await getPlatformOverviewApi(days.value, controller.signal);
    if (version !== overviewVersion || controller.signal.aborted) return;
    overview.value = result;
  } catch {
    if (version === overviewVersion && !controller.signal.aborted) {
      overview.value = null;
      failed.value = true;
    }
  } finally {
    if (version === overviewVersion) loading.value = false;
  }
}
async function loadCompanies() {
  const version = ++companiesVersion;
  companiesController?.abort();
  const controller = new AbortController();
  companiesController = controller;
  companiesLoading.value = true;
  companiesFailed.value = false;
  items.value = [];
  total.value = 0;
  try {
    const result = await getPlatformCompanyOverviewApi(
      {
        page: page.value,
        pageSize: pageSize.value,
        keyword: appliedKeyword.value || undefined,
      },
      controller.signal,
    );
    if (version !== companiesVersion || controller.signal.aborted) return;
    items.value = result.items;
    total.value = result.total;
  } catch {
    if (version === companiesVersion && !controller.signal.aborted)
      companiesFailed.value = true;
  } finally {
    if (version === companiesVersion) companiesLoading.value = false;
  }
}
function refresh() {
  void loadOverview();
  void loadCompanies();
}
function changeDays(value: number | string) {
  days.value = value === 30 ? 30 : 7;
  void loadOverview();
}
function search() {
  appliedKeyword.value = keyword.value.trim();
  page.value = 1;
  void loadCompanies();
}
function changePage(current: number, nextSize: number) {
  page.value = pageSize.value === nextSize ? current : 1;
  pageSize.value = nextSize;
  void loadCompanies();
}
onMounted(refresh);
onUnmounted(() => {
  overviewVersion++;
  companiesVersion++;
  overviewController?.abort();
  companiesController?.abort();
});
</script>

<template>
  <Page
    title="平台首页"
    description="查看全部公司的运营与业务情况"
    content-class="flex flex-col gap-4"
  >
    <template #extra>
      <Space wrap>
        <span class="text-muted-foreground text-xs">
          北京时间 · {{ date(overview?.generatedAt) }} 更新
        </span>
        <Button :loading="loading || companiesLoading" @click="refresh">
          刷新
        </Button>
      </Space>
    </template>
    <Alert
      v-if="failed"
      type="error"
      message="运营数据加载失败，请重试"
      show-icon
    >
      <template #action>
        <Button size="small" @click="loadOverview">重试</Button>
      </template>
    </Alert>
    <Spin :spinning="loading">
      <div class="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Card
          v-for="metric in metrics"
          :key="metric.title"
          size="small"
          class="min-w-0"
        >
          <div class="text-muted-foreground flex items-center gap-2 text-sm">
            {{ metric.title }}
            <Tooltip v-if="metric.help" :title="metric.help">
              <button
                type="button"
                :aria-label="`${metric.title}统计说明`"
                class="text-muted-foreground inline-flex size-4 items-center justify-center rounded-full border text-[11px]"
              >
                ?
              </button>
            </Tooltip>
          </div>
          <div
            class="my-2 text-3xl font-semibold tabular-nums"
            :class="{ 'text-muted-foreground': metric.value == null }"
          >
            {{ count(metric.value) }}
          </div>
          <div class="text-muted-foreground truncate text-xs">
            {{ metric.detail }}
          </div>
        </Card>
      </div>
    </Spin>
    <div class="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-3">
      <Card title="新增趋势" size="small" class="min-w-0 xl:col-span-2">
        <template #extra>
          <Segmented
            :value="days"
            :options="[
              { label: '近7天', value: 7 },
              { label: '近30天', value: 30 },
            ]"
            size="small"
            @change="changeDays"
          />
        </template>
        <Spin :spinning="loading">
          <OverviewTrend v-if="overview" :items="overview.trend" />
          <div v-else class="flex h-[240px] items-center justify-center">
            <Empty
              :description="failed ? '数据加载失败' : '等待运营数据'"
              :image="Empty.PRESENTED_IMAGE_SIMPLE"
            />
          </div>
        </Spin>
      </Card>
      <Card title="活动档期分布" size="small" class="min-w-0">
        <template #extra>
          <span class="text-muted-foreground text-xs">
            共 {{ count(summary?.totalActivities) }} 场
          </span>
        </template>
        <div
          v-if="overview"
          class="flex min-h-[240px] flex-col gap-2"
        >
          <div v-for="item in distribution" :key="item.name" class="shrink-0">
            <div class="mb-1 flex justify-between text-xs">
              <span>{{ item.name }}</span>
              <span class="tabular-nums">{{ count(item.value) }}</span>
            </div>
            <Progress
              :percent="
                summary?.totalActivities
                  ? (item.value / summary.totalActivities) * 100
                  : 0
              "
              :show-info="false"
              :stroke-color="item.color"
              size="small"
              class="!m-0"
            />
          </div>
        </div>
        <div v-else class="flex h-[240px] items-center justify-center">
          <Empty description="暂无统计" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
        </div>
      </Card>
    </div>
    <Card title="公司业务明细" size="small" class="min-w-0">
      <template #extra>
        <Button
          type="link"
          size="small"
          @click="router.push('/platform/tenants')"
        >
          公司管理
        </Button>
      </template>
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Space wrap>
          <Tag>正常 {{ count(summary?.activeCompanies) }} 家</Tag>
          <Tag :color="summary?.expiringCompanies ? 'warning' : undefined">
            7天内到期 {{ count(summary?.expiringCompanies) }} 家
          </Tag>
          <Tag :color="summary?.expiredCompanies ? 'error' : undefined">
            已到期 {{ count(summary?.expiredCompanies) }} 家
          </Tag>
        </Space>
        <InputSearch
          v-model:value="keyword"
          placeholder="搜索公司名称"
          :maxlength="80"
          allow-clear
          class="w-full sm:!w-64"
          @search="search"
        />
      </div>
      <Alert
        v-if="companiesFailed"
        type="error"
        class="mb-3"
        message="公司业务明细加载失败"
        show-icon
      >
        <template #action>
          <Button size="small" @click="loadCompanies">重试</Button>
        </template>
      </Alert>
      <div class="min-h-[220px] min-w-0">
        <Table
          :columns="columns"
          :data-source="items"
          :loading="companiesLoading"
          :pagination="false"
          :scroll="{ x: 1180, y: 380 }"
          row-key="id"
          size="small"
        >
          <template #emptyText>
            <Empty
              :description="
                companiesFailed ? '加载失败，请重试' : '暂无公司数据'
              "
              :image="Empty.PRESENTED_IMAGE_SIMPLE"
            />
          </template>
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'status'">
              <Tag
                :color="companyStatus(record.status, record.expiresAt).color"
              >
                {{ companyStatus(record.status, record.expiresAt).name }}
              </Tag>
            </template>
            <template v-else-if="column.key === 'todayOrders'">
              <Tooltip v-if="record.todayOrders == null" title="暂无订单统计">
                —
              </Tooltip>
              <template v-else>{{ count(record.todayOrders) }}</template>
            </template>
            <template v-else-if="column.key === 'lastActivityAt'">
              {{ date(record.lastActivityAt) }}
            </template>
          </template>
        </Table>
      </div>
      <div class="mt-4 flex justify-end overflow-x-auto">
        <Pagination
          :current="page"
          :page-size="pageSize"
          :total="total"
          :page-size-options="['10', '20', '50']"
          show-size-changer
          :show-total="(value: number) => `共 ${value} 家公司`"
          @change="changePage"
        />
      </div>
    </Card>
  </Page>
</template>
