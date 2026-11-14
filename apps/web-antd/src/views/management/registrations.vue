<script setup lang="ts">
import type {
  Registration,
  RegistrationDetail,
} from '#/api/customer-management';

import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useUserStore } from '@vben/stores';

import {
  Alert,
  Button,
  Descriptions,
  DescriptionsItem,
  Divider,
  Drawer,
  Empty,
  InputSearch,
  message,
  Select,
  Spin,
  Table,
  TabPane,
  Tabs,
  Tag,
} from 'ant-design-vue';

import { captureContext } from '#/api/context-lifecycle';
import {
  exportRegistrations,
  getRegistration,
  getRegistrations,
} from '#/api/customer-management';
import RecordsContainer from '#/components/management/records-container.vue';

import { useList } from './use-list';

// 报名记录页承接免费报名版的全部名单查看需求。
// 它不存在“订单”语义：没有订单的参与记录就是未提交，不再造一个假状态。
const props = defineProps<{
  embedded?: boolean;
  customerId?: string;
  initialStatus?: string;
}>();

const registrationStatuses: Registration['status'][] = [
  'pending',
  'registered',
  'pending_payment',
  'refunding',
  'refunded',
];

function asStatus(value: unknown): Registration['status'] | undefined {
  return typeof value === 'string' &&
    registrationStatuses.includes(value as Registration['status'])
    ? (value as Registration['status'])
    : undefined;
}

const route = useRoute();
const router = useRouter();
const user = useUserStore();
const canRefund = computed(() =>
  user.userInfo?.roles?.some((role) => role === 'admin'),
);
const statusCounts = ref<Record<string, number>>();
const hasPaymentRecords = ref(false);
const participation = ref<string>();
let listSerial = 0;
const routeStatus = computed(() =>
  props.embedded ? asStatus(props.initialStatus) : asStatus(route.query.status),
);
const customerId = computed(
  () =>
    props.customerId ??
    (typeof route.query.customerId === 'string'
      ? route.query.customerId
      : undefined),
);
const activityId = computed(() =>
  props.embedded
    ? undefined
    : typeof route.params.id === 'string'
      ? route.params.id
      : typeof route.query.activityId === 'string'
        ? route.query.activityId
        : undefined,
);
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
} = useList(async (query) => {
  const context = captureContext();
  const request = ++listSerial;
  statusCounts.value = undefined;
  const result = await getRegistrations({
    ...query,
    onlySelf: !props.embedded && route.query.onlySelf === 'true',
    period:
      !props.embedded && ['month', 'today'].includes(String(route.query.period))
        ? (route.query.period as 'month' | 'today')
        : undefined,
    event:
      !props.embedded &&
      ['paid', 'registrations'].includes(String(route.query.event))
        ? (route.query.event as 'paid' | 'registrations')
        : undefined,
    customerId: customerId.value,
    activityId: activityId.value,
    participation: participation.value,
  });
  context.assertCurrent();
  if (request === listSerial) {
    statusCounts.value = result.statusCounts;
    hasPaymentRecords.value = result.hasPaymentRecords;
  }
  return result;
});
const detailFailed = ref(false);
const detailId = ref('');
const detailLoading = ref(false);
const open = ref(false);
const detail = ref<null | RegistrationDetail>(null);
let serial = 0;
function close() {
  serial++;
  open.value = false;
  detail.value = null;
  detailLoading.value = false;
}
async function show(id: string) {
  const current = ++serial;
  const context = captureContext();
  detailId.value = id;
  detail.value = null;
  detailLoading.value = true;
  detailFailed.value = false;
  open.value = true;
  try {
    const value = await getRegistration(id);
    context.assertCurrent();
    if (current === serial) detail.value = value;
  } catch {
    if (current === serial) detailFailed.value = true;
  } finally {
    if (current === serial) detailLoading.value = false;
  }
}
const lifetime = captureContext();
function clearContext() {
  hasPaymentRecords.value = false;
  listSerial++;
  close();
  items.value = [];
  total.value = 0;
  statusCounts.value = undefined;
}
lifetime.signal.addEventListener('abort', clearContext, { once: true });
onBeforeUnmount(() => {
  close();
  listSerial++;
  lifetime.signal.removeEventListener('abort', clearContext);
});
status.value = routeStatus.value;
watch([customerId, activityId, routeStatus], () => {
  close();
  status.value = routeStatus.value;
  search();
});
watch(
  () => route.query.detailId,
  (id) => {
    if (!props.embedded && typeof id === 'string' && id) void show(id);
    else close();
  },
  { immediate: true },
);
function clearFilter(key: 'activityId' | 'customerId') {
  const query = { ...route.query };
  delete query[key];
  void router.replace({ path: route.path, query });
}
const exporting = ref(false);
async function exportList() {
  const id = activityId.value;
  if (!id || exporting.value) return;
  const context = captureContext();
  exporting.value = true;
  try {
    const blob = await exportRegistrations({
      activityId: id,
      status: status.value || undefined,
      participation: participation.value || undefined,
      keyword: keyword.value || undefined,
    });
    context.assertCurrent();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `报名名单-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch {
    context.assertCurrent();
    message.error('导出失败，请缩小筛选范围后重试');
  } finally {
    exporting.value = false;
  }
}
const participationLabels = {
  free: '普通报名',
  group: '拼团',
  single: '单独购买',
};
const statusLabels: Record<Registration['status'], string> = {
  pending: '未提交',
  registered: '已报名',
  pending_payment: '待支付',
  refunding: '退款中',
  refunded: '已退款',
};
const statusColors: Record<Registration['status'], string> = {
  pending: 'default',
  registered: 'success',
  pending_payment: 'warning',
  refunding: 'processing',
  refunded: 'default',
};
async function copyPhone(phone: string) {
  try {
    await navigator.clipboard.writeText(phone);
    message.success('手机号已复制');
  } catch {
    message.info('请选中手机号复制');
  }
}
const statusTabs = computed(() => {
  const counts = statusCounts.value;
  return [
    {
      key: '',
      label: '全部',
      count: counts
        ? Object.values(counts).reduce((a, b) => a + b, 0)
        : undefined,
    },
    ...(['pending', 'registered'] as const).map((key) => ({
      key,
      label: statusLabels[key],
      count: counts?.[key],
    })),
    ...(hasPaymentRecords.value
      ? [
          {
            key: 'pending_payment',
            label: statusLabels.pending_payment,
            count: counts?.pending_payment,
          },
          {
            key: 'refunding',
            label: statusLabels.refunding,
            count: counts?.refunding,
          },
          {
            key: 'refunded',
            label: statusLabels.refunded,
            count: counts?.refunded,
          },
        ]
      : []),
  ];
});
function selectStatus(key: number | string) {
  status.value = String(key) || undefined;
  search();
}
const columns = computed(() => [
  {
    title: '报名人姓名',
    dataIndex: 'customerName',
    width: 110,
    ellipsis: true,
    fixed: 'left' as const,
  },
  {
    title: '报名人电话',
    dataIndex: 'customerPhone',
    width: 190,
    fixed: 'left' as const,
  },
  { title: '销售', key: 'sales', width: 120, ellipsis: true },
  { title: '填写时间', key: 'createdAt', width: 180 },
  { title: '报名时间', key: 'registeredAt', width: 180 },
  { title: '活动名称', dataIndex: 'activityName', width: 180, ellipsis: true },
  { title: '参与门店', dataIndex: 'storeName', width: 160, ellipsis: true },
  { title: '参与方式', key: 'participation', width: 110 },
  { title: '报名编号', dataIndex: 'orderNo', width: 210 },
  { title: '状态', key: 'status', width: 100 },
  { title: '操作', key: 'actions', width: 80, fixed: 'right' as const },
]);
</script>

<template>
  <RecordsContainer
    :embedded="embedded"
    :title="activityId ? '报名记录' : '活动报名记录'"
    v-bind="{ loading, failed, page, pageSize, total }"
    @reload="load"
    @change="change"
  >
    <template #filters>
      <InputSearch
        v-model:value="keyword"
        placeholder="搜索姓名、手机号、销售、活动或报名编号"
        allow-clear
        @search="search"
      />
      <Select
        v-model:value="participation"
        placeholder="全部参与方式"
        allow-clear
        :options="[
          { label: '普通报名', value: 'free' },
          { label: '拼团', value: 'group' },
          { label: '单独购买', value: 'single' },
        ]"
        @change="search"
      />
      <Tag
        v-if="customerId && !embedded"
        closable
        @close.prevent="clearFilter('customerId')"
      >
        指定客户
      </Tag>
      <Tag
        v-if="activityId && !route.params.id"
        closable
        @close.prevent="clearFilter('activityId')"
      >
        指定活动
      </Tag>
      <Button
        v-if="activityId && !embedded"
        :loading="exporting"
        :disabled="exporting"
        @click="exportList"
        >导出名单</Button
      >
    </template>
    <Tabs :active-key="status || ''" @change="selectStatus">
      <TabPane
        v-for="tab in statusTabs"
        :key="tab.key"
        :tab="`${tab.label}${tab.count == null ? '' : `（${tab.count}）`}`"
      />
    </Tabs>
    <Table
      row-key="id"
      :columns="columns"
      :data-source="items"
      :loading="loading"
      :pagination="false"
      :scroll="{ x: 1660 }"
      :row-class-name="
        (record: Registration) =>
          record.status === 'pending' ? 'registration-pending' : ''
      "
    >
      <template #bodyCell="{ column, record }">
        <span v-if="column.dataIndex === 'customerPhone'" class="order-phone">
          <a :href="`tel:${record.customerPhone}`">{{
            record.customerPhone
          }}</a>
          <Button
            size="small"
            type="link"
            @click="copyPhone(record.customerPhone)"
            >复制</Button>
        </span>
        <template v-else-if="column.key === 'participation'">
          {{
            participationLabels[
              record.participation as keyof typeof participationLabels
            ]
          }}
        </template>
        <template v-else-if="column.key === 'status'">
          <Tag :color="statusColors[record.status as Registration['status']]">
            {{ statusLabels[record.status as Registration['status']] }}
          </Tag>
        </template>
        <template v-else-if="column.key === 'sales'">
          <span :title="record.salesPhone">{{
            record.salesName || '未归属销售'
          }}</span>
        </template>
        <template v-else-if="column.key === 'createdAt'">
          {{ new Date(record.createdAt).toLocaleString() }}
        </template>
        <template v-else-if="column.key === 'registeredAt'">
          {{
            record.registeredAt
              ? new Date(record.registeredAt).toLocaleString()
              : '未提交'
          }}
        </template>
        <template v-else-if="column.dataIndex === 'orderNo'">
          {{ record.orderNo || '—' }}
        </template>
        <Button
          v-else-if="column.key === 'actions'"
          type="link"
          @click="show(record.id)"
        >
          查看
        </Button>
      </template>
    </Table>
    <template #dialogs>
      <Drawer
        :open="open"
        title="报名详情"
        width="min(720px,100vw)"
        @close="close"
      >
        <Spin v-if="detailLoading" class="block py-12 text-center" />
        <Alert
          v-else-if="detailFailed"
          type="error"
          message="报名记录加载失败"
          show-icon
        >
          <template #action>
            <Button @click="show(detailId)">重试</Button>
          </template>
        </Alert>
        <template v-else-if="detail">
          <Descriptions title="报名信息" bordered :column="1" size="small">
            <DescriptionsItem label="活动名称">
              {{ detail.activityName }}
            </DescriptionsItem>
            <DescriptionsItem label="客户姓名">
              {{ detail.customerName }}
            </DescriptionsItem>
            <DescriptionsItem label="手机号">
              <a :href="`tel:${detail.customerPhone}`">{{
                detail.customerPhone
              }}</a>
              <Button
                size="small"
                type="link"
                @click="copyPhone(detail.customerPhone)"
                >复制</Button
              >
            </DescriptionsItem>
            <DescriptionsItem label="参与门店">
              {{ detail.storeName || '未选择门店' }}
            </DescriptionsItem>
            <DescriptionsItem label="销售">
              {{ detail.salesName || '未归属销售'
              }}<span v-if="detail.salesPhone">（{{ detail.salesPhone }}）</span>
            </DescriptionsItem>
            <DescriptionsItem label="参与方式">
              {{ participationLabels[detail.participation] }}
            </DescriptionsItem>
            <DescriptionsItem label="状态">
              <Tag :color="statusColors[detail.status]">
                {{ statusLabels[detail.status] }}
              </Tag>
            </DescriptionsItem>
            <DescriptionsItem label="填写时间">
              {{ new Date(detail.createdAt).toLocaleString() }}
            </DescriptionsItem>
            <DescriptionsItem label="报名时间">
              {{
                detail.registeredAt
                  ? new Date(detail.registeredAt).toLocaleString()
                  : '未提交'
              }}
            </DescriptionsItem>
            <DescriptionsItem label="报名编号">
              {{ detail.orderNo || '—' }}
            </DescriptionsItem>
            <DescriptionsItem
              v-if="detail.participation !== 'free'"
              label="订单金额"
            >
              {{
                detail.orderId
                  ? `¥${(detail.amountCent / 100).toFixed(2)}`
                  : '—'
              }}
            </DescriptionsItem>
          </Descriptions>
          <Divider />
          <Descriptions
            v-if="detail.answers.length"
            title="报名填写内容"
            bordered
            :column="1"
            size="small"
          >
            <DescriptionsItem
              v-for="answer in detail.answers"
              :key="answer.key"
              :label="answer.label"
            >
              <span class="whitespace-pre-wrap break-words">{{
                answer.value || '—'
              }}</span>
            </DescriptionsItem>
          </Descriptions>
          <Empty
            v-else
            description="暂无报名填写内容"
            :image="Empty.PRESENTED_IMAGE_SIMPLE"
          />
          <template v-if="detail.participation !== 'free'">
            <Divider />
            <Descriptions title="支付与退款" bordered :column="1" size="small">
              <DescriptionsItem label="支付情况">
                {{
                  !detail.orderId
                    ? '未创建订单'
                    : detail.paymentInfo
                      ? '已记录支付信息'
                      : '暂无支付记录'
                }}
              </DescriptionsItem>
              <DescriptionsItem label="退款情况">
                <Tag
                  v-if="detail.refundInfo"
                  :color="
                    detail.refundInfo.status === 'success'
                      ? 'default'
                      : 'processing'
                  "
                >
                  {{
                    detail.refundInfo.status === 'success'
                      ? '已全额退款'
                      : '退款处理中'
                  }}
                </Tag>
                <span v-else>暂无退款记录</span>
              </DescriptionsItem>
            </Descriptions>
          </template>
        </template>
        <template #footer>
          <div class="flex justify-between">
            <Button
              v-if="
                canRefund &&
                detail?.orderId &&
                detail.status === 'registered' &&
                detail.participation !== 'free'
              "
              danger
              type="primary"
              @click="
                router.push({
                  path: '/orders',
                  query: { detailId: detail.orderId },
                })
              "
            >
              全额退款
            </Button>
            <span v-else />
            <Button @click="close">关闭</Button>
          </div>
        </template>
      </Drawer>
    </template>
  </RecordsContainer>
</template>

<style scoped>
.order-phone {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}
.order-phone :deep(.ant-btn) {
  flex-shrink: 0;
  padding-inline: 4px;
}

/* 未提交的留资弱化显示，避免和真正的报名记录混淆。 */
:deep(.registration-pending > td) {
  color: var(--ant-color-text-tertiary, rgb(0 0 0 / 45%));
}
</style>
