<script setup lang="ts">
import type { ActivityOrder, OrderDetail } from '#/api/customer-management';

import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  Alert,
  Button,
  Descriptions,
  DescriptionsItem,
  Divider,
  Drawer,
  Empty,
  InputSearch,
  Select,
  Spin,
  Table,
  Tag,
} from 'ant-design-vue';

import { getOrder, getOrders } from '#/api/customer-management';
import ListShell from '#/components/management/list-shell.vue';

import { useList } from './use-list';

const route = useRoute();
const router = useRouter();
const participation = ref<string>();
const routeStatus = computed(() =>
  route.query.status === 'pending_registration' ||
  route.query.status === 'pending_payment' ||
  route.query.status === 'confirmed'
    ? route.query.status
    : undefined,
);
const customerId = computed(() =>
  typeof route.query.customerId === 'string'
    ? route.query.customerId
    : undefined,
);
const activityId = computed(() =>
  typeof route.params.id === 'string'
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
} = useList((query) =>
  getOrders({
    ...query,
    customerId: customerId.value,
    activityId: activityId.value,
    participation: participation.value,
  }),
);
const detailFailed = ref(false);
const detailId = ref('');
const detailLoading = ref(false);
const open = ref(false);
const detail = ref<null | OrderDetail>(null);
let serial = 0;
function close() {
  serial++;
  open.value = false;
  detail.value = null;
  detailLoading.value = false;
}
async function show(id: string) {
  const current = ++serial;
  detailId.value = id;
  detail.value = null;
  detailLoading.value = true;
  detailFailed.value = false;
  open.value = true;
  try {
    const value = await getOrder(id);
    if (current === serial) detail.value = value;
  } catch {
    if (current === serial) detailFailed.value = true;
  } finally {
    if (current === serial) detailLoading.value = false;
  }
}
onBeforeUnmount(close);
status.value = routeStatus.value;
watch([customerId, activityId, routeStatus], () => {
  close();
  status.value = routeStatus.value;
  search();
});
watch(() => route.query.detailId, (id) => {
  if (typeof id === 'string' && id) void show(id);
  else close();
}, { immediate: true });
function clearFilter(key: 'activityId' | 'customerId') {
  const query = { ...route.query };
  delete query[key];
  void router.replace({ path: route.path, query });
}
const participationLabels = {
  free: '普通报名',
  group: '拼团',
  single: '单独购买',
};
const statusLabels = {
  confirmed: '已报名',
  pending_payment: '待支付',
  pending_registration: '待报名',
};
function paymentLabel(
  orderStatus: ActivityOrder['status'],
  orderParticipation: ActivityOrder['participation'],
) {
  return orderStatus === 'pending_registration'
    ? '待报名'
    : orderStatus === 'pending_payment'
      ? '待支付'
      : orderParticipation === 'free'
        ? '无需支付'
        : '已支付';
}
function unpaid() {
  status.value =
    status.value === 'pending_payment' ? undefined : 'pending_payment';
  search();
}
const columns = [
  { title: '支付状态', key: 'payment', width: 100, fixed: 'left' as const },
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
    width: 145,
    fixed: 'left' as const,
  },
  { title: '销售', key: 'sales', width: 120, ellipsis: true },
  { title: '报名时间', key: 'registeredAt', width: 180 },
  { title: '订单创建时间', key: 'createdAt', width: 180 },
  { title: '信息填写时间', key: 'contactSavedAt', width: 180 },
  { title: '活动名称', dataIndex: 'activityName', width: 180, ellipsis: true },
  { title: '订单金额', key: 'amount', width: 110 },
  { title: '参与门店', dataIndex: 'storeName', width: 160, ellipsis: true },
  { title: '参与方式', key: 'participation', width: 110 },
  { title: '订单号', dataIndex: 'orderNo', width: 210 },
  { title: '操作', key: 'actions', width: 80, fixed: 'right' as const },
];
</script>

<template>
  <ListShell
    :title="activityId ? '订单管理' : '活动订单'"
    v-bind="{ loading, failed, page, pageSize, total }"
    @reload="load"
    @change="change"
  >
    <template #filters>
      <InputSearch
        v-model:value="keyword"
        placeholder="搜索姓名、手机号、销售、活动或订单号"
        allow-clear
        @search="search"
      />
      <Button
        :type="status === 'pending_payment' ? 'primary' : 'default'"
        @click="unpaid"
      >
        待支付
      </Button>
      <Select
        v-model:value="status"
        placeholder="全部状态"
        allow-clear
        :options="[
          { label: '待报名', value: 'pending_registration' },
          { label: '已报名', value: 'confirmed' },
          { label: '待支付', value: 'pending_payment' },
        ]"
        @change="search"
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
        v-if="customerId"
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
    </template>
    <Table
      row-key="id"
      :columns="columns"
      :data-source="items"
      :loading="loading"
      :pagination="false"
      :scroll="{ x: 1965 }"
      :row-class-name="
        (record: ActivityOrder) =>
          record.status === 'pending_payment' ? 'order-unpaid' : ''
      "
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'participation'">
          {{
            record.orderNo
              ? participationLabels[
                  record.participation as keyof typeof participationLabels
                ]
              : '—'
          }}
        </template>
        <template v-else-if="column.key === 'amount'">
          {{
            record.orderNo ? `¥${(record.amountCent / 100).toFixed(2)}` : '—'
          }}
        </template>
        <Tag
          v-else-if="column.key === 'payment'"
          :color="record.status === 'confirmed' ? 'success' : 'warning'"
        >
          {{ paymentLabel(record.status, record.participation) }}
        </Tag>
        <template v-else-if="column.key === 'sales'">
          <span :title="record.salesPhone">{{
            record.salesName || '未归属销售'
          }}</span>
        </template>
        <template v-else-if="column.key === 'registeredAt'">
          {{
            record.registeredAt
              ? new Date(record.registeredAt).toLocaleString()
              : '未完成报名'
          }}
        </template>
        <template v-else-if="column.key === 'createdAt'">
          {{
            record.orderNo
              ? new Date(record.createdAt).toLocaleString()
              : '未创建订单'
          }}
        </template>
        <template v-else-if="column.key === 'contactSavedAt'">
          {{
            record.contactSavedAt
              ? new Date(record.contactSavedAt).toLocaleString()
              : '—'
          }}
        </template>
        <template v-else-if="column.dataIndex === 'orderNo'">
          {{ record.orderNo || '未创建订单' }}
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
        :title="
          detail?.status === 'pending_registration' ? '报名信息' : '订单详情'
        "
        width="min(720px,100vw)"
        @close="close"
      >
        <Spin v-if="detailLoading" class="block py-12 text-center" />
        <Alert
          v-else-if="detailFailed"
          type="error"
          message="订单加载失败"
          show-icon
        >
          <template #action>
            <Button @click="show(detailId)">重试</Button>
          </template>
        </Alert>
        <template v-else-if="detail">
          <Descriptions title="订单信息" bordered :column="1" size="small">
            <DescriptionsItem label="支付状态">
              <Tag
                :color="detail.status === 'confirmed' ? 'success' : 'warning'"
              >
                {{ paymentLabel(detail.status, detail.participation) }}
              </Tag>
            </DescriptionsItem>
            <DescriptionsItem label="订单号">
              {{ detail.orderNo || '未创建订单' }}
            </DescriptionsItem>
            <DescriptionsItem label="活动名称">
              {{ detail.activityName }}
            </DescriptionsItem>
            <DescriptionsItem label="客户姓名">
              {{ detail.customerName }}
            </DescriptionsItem>
            <DescriptionsItem label="手机号">
              {{ detail.customerPhone }}
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
            <DescriptionsItem label="订单金额">
              {{
                detail.orderNo
                  ? `¥${(detail.amountCent / 100).toFixed(2)}`
                  : '—'
              }}
            </DescriptionsItem>
            <DescriptionsItem label="订单状态">
              {{ statusLabels[detail.status] }}
            </DescriptionsItem>
            <DescriptionsItem label="报名时间">
              {{
                detail.registeredAt
                  ? new Date(detail.registeredAt).toLocaleString()
                  : '未完成报名'
              }}
            </DescriptionsItem>
            <DescriptionsItem label="订单创建时间">
              {{
                detail.orderNo
                  ? new Date(detail.createdAt).toLocaleString()
                  : '未创建订单'
              }}
            </DescriptionsItem>
            <DescriptionsItem label="信息填写时间">
              {{
                detail.contactSavedAt
                  ? new Date(detail.contactSavedAt).toLocaleString()
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
          <Divider />
          <Descriptions title="支付与退款" bordered :column="1" size="small">
            <DescriptionsItem label="支付情况">
              {{
                !detail.orderNo
                  ? '未创建订单'
                  : detail.participation === 'free'
                    ? '无需支付'
                    : detail.paymentInfo
                      ? '已记录支付信息'
                      : '暂无支付记录'
              }}
            </DescriptionsItem>
            <DescriptionsItem label="退款情况">
              {{ detail.refundInfo ? '已记录退款信息' : '暂无退款记录' }}
            </DescriptionsItem>
          </Descriptions>
        </template>
        <template #footer>
          <Button class="float-right" @click="close">关闭</Button>
        </template>
      </Drawer>
    </template>
  </ListShell>
</template>

<style scoped>
:deep(.order-unpaid > td) {
  background-color: rgb(250 173 20 / 8%);
}
</style>
