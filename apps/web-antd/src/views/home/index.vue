<script setup lang="ts">
import type { CompanyBusinessOverview } from '#/api/company-overview';

import { computed, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import {
  Alert,
  Button,
  Card,
  Drawer,
  Space,
  Spin,
  Tooltip,
} from 'ant-design-vue';

import { getCompanyOverviewApi } from '#/api/company-overview';
import { captureContext } from '#/api/context-lifecycle';
import CompanyProfile from '#/components/management/company-profile.vue';
import HomeNotifications from '#/components/management/home-notifications.vue';
import PerformancePanel from '#/components/performance/performance-panel.vue';
import { useAuthStore } from '#/store';

import { count, money } from './format';

const authStore = useAuthStore();
const userStore = useUserStore();
const router = useRouter();
const overview = ref<CompanyBusinessOverview | null>(null);
const loading = ref(false);
const failed = ref(false);
const showProfile = ref(false);
const canEditCompany = computed(() =>
  Boolean(
    authStore.currentTenant?.id &&
    !authStore.switchingTenant &&
    !authStore.reloadingContext &&
    userStore.userInfo?.roles?.some((role) => role === 'admin'),
  ),
);
let controller: AbortController | undefined;
let version = 0;
const summary = computed(() => overview.value?.summary);
const metrics = computed(() => [
  {
    key: 'income',
    title: '本月净收入',
    value: money(summary.value?.netRevenueCent),
    detail: `收款 ${money(summary.value?.collectedCent)} · 退款 ${money(summary.value?.refundedCent)}`,
    help: '按本月实际收款减去本月成功退款统计，不含待支付金额。',
  },
  {
    key: 'orders',
    title: '成交订单',
    value: count(summary.value?.paidOrders),
    detail: `待支付 ${count(summary.value?.pendingPayment)} · 退款 ${count(summary.value?.refundedOrders)}`,
    help: '本月实际付款成功的订单数，不含免费报名。待支付按本月创建的订单统计。',
  },
  {
    key: 'registrations',
    title: '报名人数',
    value: count(summary.value?.registrations),
    detail: `待报名 ${count(summary.value?.pendingRegistration)}`,
    help: '本月报名成功的人次，含免费报名；同一客户参加不同活动分别统计。待报名为本月留资后尚未提交报名的客户。',
  },
  {
    key: 'contacts',
    title: '新增客资',
    value: count(summary.value?.newContacts),
    detail: '按客户去重',
    help: '本月新建的客户资料，同一公司内按手机号去重。',
  },
  {
    key: 'activities',
    title: '开展活动',
    value: count(summary.value?.activities),
    detail: `进行中 ${count(summary.value?.runningActivities)} 场`,
    help: '本月已开展的活动，包含月初仍在进行的活动，不含草稿和未发布活动。',
  },
  {
    key: 'views',
    title: '累计真实浏览',
    value: count(summary.value?.views),
    detail: '全部活动累计访问',
    help: '当前公司全部活动的真实累计浏览，不含虚拟浏览量。',
  },
]);
const shortcuts = computed(() =>
  [
    {
      name: '创建活动',
      path: '/activities?create=1',
      visible: canEditCompany.value,
    },
    {
      name: overview.value?.manager ? '活动管理' : '我参加的活动',
      path: '/activities',
      visible: true,
    },
    {
      name: '报名记录',
      path: '/registrations',
      visible: true,
    },
    {
      name: '客户管理',
      path: '/customers',
      visible: true,
    },
    { name: '员工管理', path: '/employees', visible: overview.value?.manager },
    { name: '门店管理', path: '/stores', visible: overview.value?.manager },
    { name: '小程序', path: '/miniapps', visible: overview.value?.manager },
  ].filter((item) => item.visible),
);
const updatedAt = computed(() =>
  overview.value
    ? new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Shanghai',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date(overview.value.generatedAt))
    : '—',
);

async function load() {
  const current = ++version;
  controller?.abort();
  overview.value = null;
  failed.value = false;
  if (
    !authStore.currentTenant?.id ||
    !userStore.userInfo?.userId ||
    authStore.switchingTenant ||
    authStore.reloadingContext
  ) {
    loading.value = false;
    return;
  }
  const request = new AbortController();
  controller = request;
  const context = captureContext();
  loading.value = true;
  try {
    const value = await getCompanyOverviewApi(request.signal);
    if (current !== version || request.signal.aborted) return;
    context.assertCurrent();
    overview.value = value;
  } catch {
    if (current === version && !request.signal.aborted) failed.value = true;
  } finally {
    if (current === version) loading.value = false;
  }
}
watch(
  [
    () => authStore.currentTenant?.id,
    () => userStore.userInfo?.userId,
    () => authStore.switchingTenant,
    () => authStore.reloadingContext,
  ],
  () => {
    showProfile.value = false;
    void load();
  },
  { immediate: true, flush: 'sync' },
);
onUnmounted(() => {
  version++;
  controller?.abort();
});
</script>

<template>
  <Page
    title="经营总览"
    :description="authStore.currentTenant?.name"
    header-class="flex-wrap gap-3"
    content-class="dashboard-page flex min-w-0 flex-col gap-2 p-2"
  >
    <template #extra>
      <Space wrap>
        <span class="text-muted-foreground text-xs">
          {{ overview?.month ?? '本月' }} · {{ updatedAt }} 更新
        </span>
        <Button
          v-if="canEditCompany"
          type="primary"
          @click="router.push('/activities?create=1')"
          >创建活动</Button
        >
        <Button v-if="canEditCompany" @click="showProfile = true">
          公司资料
        </Button>
        <Button :loading="loading" @click="load">刷新</Button>
      </Space>
    </template>
    <Alert
      v-if="failed"
      type="error"
      message="运营数据加载失败，请重试"
      show-icon
    >
      <template #action>
        <Button size="small" @click="load">重试</Button>
      </template>
    </Alert>
    <HomeNotifications :page-size="15" />
    <Card
      v-if="!authStore.profile?.isPlatformAdmin"
      size="small"
      title="我的本月业绩"
    >
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div>
          <div class="text-muted-foreground text-sm">报名人数</div>
          <Button
            type="link"
            class="!h-auto !px-0 !text-xl"
            @click="
              router.push({
                path: '/registrations',
                query: {
                  onlySelf: 'true',
                  period: 'month',
                  event: 'registrations',
                  status: 'registered',
                },
              })
            "
            >{{ count(overview?.personal?.registrations) }}</Button
          >
        </div>
        <div>
          <div class="text-muted-foreground text-sm">成交订单</div>
          <Button
            type="link"
            class="!h-auto !px-0 !text-xl"
            @click="
              router.push({
                path: '/registrations',
                query: { onlySelf: 'true', period: 'month', event: 'paid' },
              })
            "
            >{{ count(overview?.personal?.paidOrders) }}</Button
          >
        </div>
        <div>
          <div class="text-muted-foreground text-sm">净成交金额</div>
          <Button
            type="link"
            class="!h-auto !px-0 !text-xl"
            @click="
              router.push({
                path: '/registrations',
                query: { onlySelf: 'true', period: 'month', event: 'paid' },
              })
            "
            >{{ money(overview?.personal?.netRevenueCent) }}</Button
          >
        </div>
        <div>
          <div class="text-muted-foreground text-sm">我参加的活动</div>
          <Button
            type="link"
            class="!px-0"
            @click="router.push('/activities?onlyJoined=true')"
          >
            {{ count(overview?.joinedActivities) }} 场
          </Button>
        </div>
      </div>
    </Card>
    <Spin :spinning="loading">
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          v-for="metric in metrics"
          :key="metric.key"
          :data-metric="metric.key"
          size="small"
          class="min-w-0"
        >
          <div class="text-muted-foreground flex items-center gap-2 text-sm">
            {{ metric.title }}
            <Tooltip :title="metric.help">
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
            class="my-1 truncate text-2xl font-semibold tabular-nums"
            :title="metric.value"
            :class="metric.key === 'income' ? 'text-primary' : undefined"
          >
            {{ metric.value }}
          </div>
          <Tooltip :title="metric.detail">
            <div class="text-muted-foreground truncate text-xs">
              {{ metric.detail }}
            </div>
          </Tooltip>
        </Card>
      </div>
    </Spin>
    <Card size="small" class="min-w-0">
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-muted-foreground mr-2 text-sm">快捷入口</span>
        <Button
          v-for="item in shortcuts"
          :key="item.path"
          @click="router.push(item.path)"
        >
          {{ item.name }}
        </Button>
      </div>
    </Card>
    <PerformancePanel />
    <Drawer
      v-if="showProfile && canEditCompany"
      v-model:open="showProfile"
      title="公司资料"
      :width="720"
      destroy-on-close
      root-class-name="company-profile-drawer"
    >
      <CompanyProfile :key="authStore.currentTenant?.id" />
    </Drawer>
  </Page>
</template>

<style>
.company-profile-drawer .ant-drawer-content-wrapper {
  max-width: 100vw;
}

.dashboard-page .ant-card-head {
  min-height: 38px;
  padding-inline: 10px;
}

.dashboard-page .ant-card-head-title {
  padding-block: 8px;
}

.dashboard-page .ant-card-body {
  padding: 10px;
}
</style>
