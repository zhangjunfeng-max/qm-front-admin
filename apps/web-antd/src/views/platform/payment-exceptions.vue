<script setup lang="ts">
import type { TableColumnsType } from 'ant-design-vue';

import type { PlatformApi } from '#/api/platform';

import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Alert,
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Drawer,
  Input,
  message,
  Pagination,
  Select,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';

import {
  getPlatformPaymentExceptionsApi,
  resolvePlatformPaymentExceptionApi,
} from '#/api/platform';

const tableRegion = ref<HTMLElement>();
const items = ref<PlatformApi.PaymentException[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const status = ref<'ignored' | 'open' | 'resolved'>();
const type = ref<string>();
const loading = ref(false);
const failed = ref(false);
let requestVersion = 0;

const detailOpen = ref(false);
const selected = ref<PlatformApi.PaymentException>();
const resolutionNote = ref('');
const resolving = ref(false);

const severityLabels: Record<PlatformApi.PaymentException['severity'], string> = {
  critical: '严重',
  warning: '警告',
  info: '提示',
};
const typeLabels: Record<string, string> = {
  callback_mismatch: '回调数据不匹配',
  duplicate_payment: '同一订单重复支付',
  reconcile_failed: '支付补偿失败',
  refund_abnormal: '退款异常',
  refund_callback_mismatch: '退款回调不匹配',
  refund_request_unknown: '退款提交结果待确认',
  settlement_failed: '支付到账但结算失败',
  unknown_refund: '未知退款交易',
  unknown_transaction: '未知支付交易',
};
const columns: TableColumnsType<PlatformApi.PaymentException> = [
  { title: '级别', key: 'severity', width: 90, fixed: 'left' },
  { title: '异常类型', key: 'type', width: 180 },
  { title: '公司', dataIndex: 'tenantName', key: 'tenantName', width: 160 },
  { title: '订单号', dataIndex: 'orderNo', key: 'orderNo', width: 190 },
  { title: '支付交易号', dataIndex: 'outTradeNo', key: 'outTradeNo', width: 220 },
  { title: '金额', key: 'amount', width: 100 },
  { title: '状态', key: 'status', width: 90 },
  { title: '发生时间', key: 'createdAt', width: 180 },
  { title: '操作', key: 'actions', width: 100, fixed: 'right' },
];
const pagination = computed(() => ({
  current: page.value,
  pageSize: pageSize.value,
  total: total.value,
  showSizeChanger: true,
  showTotal: (count: number) => `共 ${count} 条支付异常`,
}));

async function load() {
  const version = ++requestVersion;
  loading.value = true;
  failed.value = false;
  try {
    const result = await getPlatformPaymentExceptionsApi({
      page: page.value,
      pageSize: pageSize.value,
      status: status.value,
      type: type.value,
    });
    if (version !== requestVersion) return;
    items.value = result.items;
    total.value = result.total;
  } catch {
    if (version === requestVersion) failed.value = true;
  } finally {
    if (version === requestVersion) loading.value = false;
  }
}

function search() {
  page.value = 1;
  void load();
}

function changePage(current: number, nextSize: number) {
  page.value = nextSize === pageSize.value ? current : 1;
  pageSize.value = nextSize;
  void load();
}

function show(row: PlatformApi.PaymentException) {
  selected.value = row;
  resolutionNote.value = row.resolutionNote;
  detailOpen.value = true;
}

async function resolve(row: PlatformApi.PaymentException, next: 'ignored' | 'resolved') {
  if (!resolutionNote.value.trim()) {
    message.error('请填写处理说明');
    return;
  }
  resolving.value = true;
  try {
    await resolvePlatformPaymentExceptionApi(row.id, {
      status: next,
      note: resolutionNote.value.trim(),
    });
    message.success(next === 'resolved' ? '异常已标记为已解决' : '异常已忽略');
    detailOpen.value = false;
    await load();
  } catch (error) {
    if (error instanceof Error) message.error(error.message);
  } finally {
    resolving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <Page
    title="支付异常"
    description="处理重复支付、未知交易、退款和补偿任务异常"
    auto-content-height
    content-class="flex flex-col gap-4"
  >
    <template #extra>
      <Button :loading="loading" @click="load">刷新</Button>
    </template>
    <Alert
      v-if="failed"
      class="shrink-0"
      type="error"
      show-icon
      message="支付异常加载失败"
    >
      <template #action
        ><Button size="small" @click="load">重试</Button></template
      >
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
        <Select
          v-model:value="status"
          :options="[
            { label: '待处理', value: 'open' },
            { label: '已解决', value: 'resolved' },
            { label: '已忽略', value: 'ignored' },
          ]"
          allow-clear
          placeholder="全部状态"
          class="w-36"
          @change="search"
        />
        <Select
          v-model:value="type"
          :options="
            Object.entries(typeLabels).map(([value, label]) => ({
              value,
              label,
            }))
          "
          allow-clear
          placeholder="全部异常类型"
          class="w-52"
          @change="search"
        />
      </div>
      <div ref="tableRegion" class="min-h-0 flex-1 overflow-auto">
        <Table
          :columns="columns"
          :data-source="items"
          :loading="loading"
          :pagination="false"
          :scroll="{ x: 1320 }"
          :sticky="{ getContainer: () => tableRegion! }"
          row-key="id"
        >
          <template #bodyCell="{ column, record }">
            <Tag
              v-if="column.key === 'severity'"
              :color="
                record.severity === 'critical'
                  ? 'error'
                  : record.severity === 'warning'
                    ? 'warning'
                    : 'default'
              "
            >
              {{
                severityLabels[
                  record.severity as PlatformApi.PaymentException['severity']
                ]
              }}
            </Tag>
            <template v-else-if="column.key === 'type'">
              {{ typeLabels[record.exceptionType] || record.exceptionType }}
            </template>
            <template v-else-if="column.key === 'amount'">
              ¥{{ (record.amountCent / 100).toFixed(2) }}
            </template>
            <Tag
              v-else-if="column.key === 'status'"
              :color="
                record.status === 'open'
                  ? 'error'
                  : record.status === 'resolved'
                    ? 'success'
                    : 'default'
              "
            >
              {{
                record.status === 'open'
                  ? '待处理'
                  : record.status === 'resolved'
                    ? '已解决'
                    : '已忽略'
              }}
            </Tag>
            <template v-else-if="column.key === 'createdAt'">
              {{ new Date(record.createdAt).toLocaleString() }}
            </template>
            <Button
              v-else-if="column.key === 'actions'"
              type="link"
              @click="show(record as PlatformApi.PaymentException)"
            >
              查看
            </Button>
          </template>
        </Table>
      </div>
      <div class="mt-4 flex shrink-0 justify-end border-t border-border pt-4">
        <Pagination v-bind="pagination" responsive @change="changePage" />
      </div>
    </Card>

    <Drawer
      :open="detailOpen"
      title="支付异常详情"
      width="min(760px, 100vw)"
      @close="detailOpen = false"
    >
      <template v-if="selected">
        <Alert
          v-if="selected.exceptionType === 'duplicate_payment'"
          class="mb-4"
          type="warning"
          show-icon
          message="系统已阻止第二笔重复入账。请在原微信商户平台核对并退回多收款项，再标记处理结果。"
        />
        <Descriptions bordered :column="1" size="small">
          <DescriptionsItem label="异常类型">
            {{ typeLabels[selected.exceptionType] || selected.exceptionType }}
          </DescriptionsItem>
          <DescriptionsItem label="级别">
            {{ severityLabels[selected.severity] }}
          </DescriptionsItem>
          <DescriptionsItem label="公司">
            {{ selected.tenantName || '未知公司' }}
          </DescriptionsItem>
          <DescriptionsItem label="订单号">
            {{ selected.orderNo || '—' }}
          </DescriptionsItem>
          <DescriptionsItem label="支付交易号">
            {{ selected.outTradeNo || '—' }}
          </DescriptionsItem>
          <DescriptionsItem label="服务商交易号">
            {{ selected.externalTransactionId || '—' }}
          </DescriptionsItem>
          <DescriptionsItem label="涉及金额">
            ¥{{ (selected.amountCent / 100).toFixed(2) }}
          </DescriptionsItem>
          <DescriptionsItem label="发生时间">
            {{ new Date(selected.createdAt).toLocaleString() }}
          </DescriptionsItem>
        </Descriptions>
        <div class="mt-5 text-sm font-medium">异常详情</div>
        <pre
          class="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-all rounded border border-border bg-muted p-3 text-xs"
          >{{ JSON.stringify(selected.details, null, 2) }}</pre
        >
        <template v-if="selected.status === 'open'">
          <div class="mb-2 mt-5 text-sm">处理说明</div>
          <Input.TextArea
            v-model:value="resolutionNote"
            :rows="4"
            :maxlength="1000"
            show-count
            placeholder="说明核对结果、退款情况或忽略原因"
          />
        </template>
        <template v-else>
          <div class="mb-2 mt-5 text-sm">处理说明</div>
          <div class="rounded border border-border p-3 text-sm">
            {{ selected.resolutionNote || '—' }}
          </div>
        </template>
      </template>
      <template #footer>
        <Space>
          <Button @click="detailOpen = false">关闭</Button>
          <template v-if="selected?.status === 'open'">
            <Button
              :loading="resolving"
              @click="resolve(selected, 'ignored')"
            >
              忽略
            </Button>
            <Button
              type="primary"
              :loading="resolving"
              @click="resolve(selected, 'resolved')"
            >
              标记已解决
            </Button>
          </template>
        </Space>
      </template>
    </Drawer>
  </Page>
</template>
