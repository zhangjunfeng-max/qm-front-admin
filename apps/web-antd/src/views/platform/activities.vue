<script setup lang="ts">
import type { PlatformActivity } from '#/api/activity-lifecycle';

import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import {
  Alert,
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Drawer,
  Empty,
  Input,
  InputSearch,
  message,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tag,
} from 'ant-design-vue';

import {
  activityStatusColor,
  activityStatusLabel,
  activityStatusOptions,
  getPlatformActivities,
  getPlatformActivity,
  reviewActivity,
} from '#/api/activity-lifecycle';
import { activityThemePreset } from '#/api/activity-theme';
import { captureContext } from '#/api/context-lifecycle';
import ActivitySchedule from '#/components/management/activity-schedule.vue';
import ListShell from '#/components/management/list-shell.vue';

import { useList } from '../management/use-list';
import ReviewMedia from './activity-review-media.vue';

const route = useRoute();
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
} = useList(getPlatformActivities);
status.value = 'pending_review';
const open = ref(false);
const selectedId = ref('');
const detail = ref<PlatformActivity>();
const detailLoading = ref(false);
const detailFailed = ref(false);
const reviewing = ref(false);
const reason = ref('');
const reasonError = ref('');
let controller: AbortController | undefined;
let requestVersion = 0;
let dialog: ReturnType<typeof Modal.confirm> | undefined;
const columns = [
  { title: '活动名称', dataIndex: 'name', ellipsis: true },
  { title: '公司', dataIndex: 'companyName', width: 190, ellipsis: true },
  { title: '活动状态', key: 'status', width: 120 },
  { title: '提交审核时间', key: 'submittedAt', width: 180 },
  {
    title: '审核未通过原因',
    dataIndex: 'reviewReason',
    width: 200,
    ellipsis: true,
  },
  { title: '操作', key: 'actions', width: 100 },
];
const canReview = computed(() => detail.value?.status === 'pending_review');
function date(value: null | string | undefined) {
  return value
    ? new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Shanghai',
        dateStyle: 'short',
        timeStyle: 'short',
        hour12: false,
      }).format(new Date(value))
    : '—';
}
function money(value: null | number | undefined) {
  return value == null ? '未设置' : `¥${(value / 100).toFixed(2)}`;
}
function scope(value: string) {
  return (
    (
      { self: '仅本人', group: '本组', all: '全部员工' } as Record<
        string,
        string
      >
    )[value] ?? value
  );
}
const formType: Record<string, string> = {
  text: '文本',
  textarea: '多行文本',
  date: '日期',
  phone: '电话',
  email: '邮箱',
  radio: '单选',
  checkbox: '多选',
  boolean: '是否',
};
async function loadDetail() {
  controller?.abort();
  const current = new AbortController();
  controller = current;
  const version = ++requestVersion;
  detail.value = undefined;
  detailFailed.value = false;
  detailLoading.value = true;
  try {
    const result = await getPlatformActivity(selectedId.value, current.signal);
    if (version === requestVersion && !current.signal.aborted)
      detail.value = result;
  } catch {
    if (version === requestVersion && !current.signal.aborted)
      detailFailed.value = true;
  } finally {
    if (version === requestVersion && !current.signal.aborted)
      detailLoading.value = false;
  }
}
function show(row: Pick<PlatformActivity, 'id'>) {
  selectedId.value = row.id;
  reason.value = '';
  reasonError.value = '';
  open.value = true;
  void loadDetail();
}
watch(
  () => route.query.activityId,
  (id) => {
    if (typeof id === 'string' && id) show({ id });
    else close();
  },
  { immediate: true },
);
function close() {
  if (reviewing.value) return;
  open.value = false;
  ++requestVersion;
  controller?.abort();
  detail.value = undefined;
  dialog?.destroy();
}
function review(decision: 'approved' | 'rejected') {
  if (!detail.value || reviewing.value) return;
  const cleanReason = reason.value.trim();
  reasonError.value = '';
  if (decision === 'rejected' && !cleanReason) {
    reasonError.value = '请填写审核未通过原因';
    return;
  }
  if ([...cleanReason].length > 1000) {
    reasonError.value = '审核原因最多1000字';
    return;
  }
  const current = { ...detail.value };
  const context = captureContext();
  dialog = Modal.confirm({
    title:
      decision === 'approved'
        ? '确认线下费用已核实并通过审核？'
        : '确认审核未通过？',
    content:
      decision === 'approved'
        ? '审核通过后，公司需要自行点击发布。'
        : cleanReason,
    async onOk() {
      context.assertCurrent();
      reviewing.value = true;
      try {
        const result = await reviewActivity(
          current.id,
          current.version,
          decision,
          cleanReason,
        );
        context.assertCurrent();
        if (open.value && selectedId.value === current.id)
          detail.value = result;
        reason.value = '';
        message.success(
          decision === 'approved' ? '活动审核已通过' : '活动审核未通过',
        );
        const queue = items.value;
        const index = queue.findIndex((item) => item.id === current.id);
        const nextId = [
          ...queue.slice(index + 1),
          ...queue.slice(0, Math.max(0, index)),
        ].find(
          (item) => item.id !== current.id && item.status === 'pending_review',
        )?.id;
        await load();
        context.assertCurrent();
        if (open.value && selectedId.value === current.id) {
          let next =
            nextId ??
            items.value.find(
              (item) =>
                item.id !== current.id && item.status === 'pending_review',
            )?.id;
          if (!next && (!status.value || status.value === 'pending_review')) {
            const pending = await getPlatformActivities({
              page: 1,
              pageSize: 1,
              keyword: keyword.value.trim() || undefined,
              status: 'pending_review',
            });
            context.assertCurrent();
            next = pending.items.find(
              (item) =>
                item.id !== current.id && item.status === 'pending_review',
            )?.id;
          }
          if (next) show({ id: next });
          else message.info('当前筛选下已无待审核活动');
        }
      } catch (error) {
        if (!context.signal.aborted) {
          void loadDetail();
          void load();
        }
        throw error;
      } finally {
        reviewing.value = false;
      }
    },
  });
}
onBeforeUnmount(() => {
  ++requestVersion;
  controller?.abort();
  dialog?.destroy();
});
</script>

<template>
  <ListShell
    title="活动审核"
    description="审核各公司提交的活动，费用线下对接确认"
    v-bind="{ loading, failed, page, pageSize, total }"
    @reload="load"
    @change="change"
  >
    <template #filters>
      <InputSearch
        v-model:value="keyword"
        placeholder="搜索活动或公司名称"
        allow-clear
        :maxlength="80"
        @search="search"
      />
      <Select
        v-model:value="status"
        placeholder="全部状态"
        allow-clear
        :options="activityStatusOptions"
        @change="search"
      />
    </template>
    <Table
      row-key="id"
      :columns="columns"
      :data-source="items"
      :pagination="false"
      :loading="loading"
      :scroll="{ x: 1100 }"
    >
      <template #bodyCell="{ column, record }">
        <Tag
          v-if="column.key === 'status'"
          :color="activityStatusColor(record.status)"
        >
          {{ activityStatusLabel(record.status) }}
        </Tag>
        <template v-else-if="column.key === 'submittedAt'">
          {{ date(record.submittedAt) }}
        </template>
        <Button
          v-else-if="column.key === 'actions'"
          type="link"
          size="small"
          @click="show(record as PlatformActivity)"
        >
          {{ record.status === 'pending_review' ? '审核' : '查看' }}
        </Button>
      </template>
      <template #emptyText>
        <Empty description="暂无活动" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
      </template>
    </Table>
    <template #dialogs>
      <Drawer
        :open="open"
        title="活动审核详情"
        width="min(960px, 100vw)"
        :closable="!reviewing"
        :mask-closable="!reviewing"
        :keyboard="!reviewing"
        destroy-on-close
        @close="close"
      >
        <Alert
          v-if="detailFailed"
          type="error"
          message="活动详情加载失败"
          show-icon
        >
          <template #action><Button @click="loadDetail">重试</Button></template>
        </Alert>
        <Spin :spinning="detailLoading">
          <template v-if="detail">
            <Alert
              v-if="detail.reviewReason"
              type="error"
              class="mb-4"
              :message="`审核未通过：${detail.reviewReason}`"
              show-icon
            />
            <Card size="small" class="mb-4" title="活动信息">
              <Descriptions :column="{ xs: 1, sm: 2 }">
                <DescriptionsItem label="活动名称">
                  {{ detail.name }}
                </DescriptionsItem>
                <DescriptionsItem label="公司">
                  {{ detail.companyName }}
                </DescriptionsItem>
                <DescriptionsItem label="状态">
                  <Tag :color="activityStatusColor(detail.status)">
                    {{ activityStatusLabel(detail.status) }}
                  </Tag>
                </DescriptionsItem>
                <DescriptionsItem label="活动主题">
                  <Space :size="6">
                    {{ activityThemePreset(detail.theme).label }}
                    <span
                      class="border-border inline-block size-3 rounded-full border"
                      :style="{ backgroundColor: detail.themeColor }"
                    ></span>
                    {{
                      detail.themeColor !==
                      activityThemePreset(detail.theme).color
                        ? '（自定义）'
                        : ''
                    }}
                  </Space>
                </DescriptionsItem>
                <DescriptionsItem label="活动渠道">
                  {{ detail.channel === 'h5' ? 'H5' : 'H5 + 小程序' }}
                </DescriptionsItem>
                <DescriptionsItem label="开始时间">
                  {{ date(detail.startsAt) }}
                </DescriptionsItem>
                <DescriptionsItem label="结束时间">
                  {{ date(detail.endsAt) }}
                </DescriptionsItem>
                <DescriptionsItem label="玩法">
                  {{
                    detail.groupEnabled
                      ? `${detail.groupSize}人拼团`
                      : '营销活动'
                  }}
                </DescriptionsItem>
                <DescriptionsItem label="拼团价格">
                  {{
                    detail.groupEnabled
                      ? money(detail.groupPriceCent)
                      : '未开启拼团'
                  }}
                </DescriptionsItem>
                <DescriptionsItem label="单买价格">
                  {{ money(detail.singlePriceCent) }}
                </DescriptionsItem>
                <DescriptionsItem label="虚拟浏览量">
                  {{ detail.virtualViewCount }}
                </DescriptionsItem>
                <DescriptionsItem label="虚拟报名人数">
                  {{ detail.virtualRegistrationCount }}
                </DescriptionsItem>
                <DescriptionsItem label="小程序" :span="2">
                  {{
                    detail.miniapp
                      ? `${detail.miniapp.name}（${detail.miniapp.appid}）`
                      : '未配置'
                  }}
                </DescriptionsItem>
                <DescriptionsItem label="参与门店" :span="2">
                  {{
                    detail.stores
                      .map(
                        (x) =>
                          x.name +
                          (x.status === 'disabled' ? '（已停用）' : ''),
                      )
                      .join('、') || '未配置'
                  }}
                </DescriptionsItem>
                <DescriptionsItem label="提交审核时间">
                  {{ date(detail.submittedAt) }}
                </DescriptionsItem>
                <DescriptionsItem label="平台审核时间">
                  {{ date(detail.reviewedAt) }}
                </DescriptionsItem>
                <DescriptionsItem label="发布时间">
                  {{ date(detail.publishedAt) }}
                </DescriptionsItem>
              </Descriptions>
            </Card>
            <Card size="small" title="活动海报" class="mb-4">
              <ReviewMedia
                v-if="detail.posterUrl"
                :activity-id="detail.id"
                :url="detail.posterUrl"
                kind="image"
              />
              <span v-else>未配置</span>
            </Card>
            <Card size="small" title="活动规则" class="mb-4">
              <p class="whitespace-pre-wrap break-words">
                {{ detail.rulesText || '未配置' }}
              </p>
            </Card>
            <Card size="small" title="活动详情素材" class="mb-4">
              <div v-if="detail.detailMedia.length" class="flex flex-col gap-4">
                <div
                  v-for="(media, index) in detail.detailMedia"
                  :key="`${index}-${media.url}`"
                >
                  <div class="text-muted-foreground mb-2 text-xs">
                    第 {{ index + 1 }} 项 ·
                    {{ media.type === 'image' ? '图片' : '视频' }}
                  </div>
                  <ReviewMedia
                    :activity-id="detail.id"
                    :url="media.url"
                    :kind="media.type"
                  />
                </div>
              </div>
              <span v-else>未配置</span>
            </Card>
            <Card size="small" title="填写表单" class="mb-4">
              <div
                v-for="field in detail.formConfig.fields"
                :key="field.key"
                class="border-border border-b py-2 last:border-0"
              >
                <div>
                  {{ field.label }} · {{ formType[field.type] }} ·
                  {{ field.required ? '必填' : '选填' }}
                </div>
                <div
                  v-if="field.placeholder"
                  class="text-muted-foreground text-xs"
                >
                  {{ field.placeholder }}
                </div>
                <div
                  v-if="field.options?.length"
                  class="text-muted-foreground text-xs"
                >
                  {{ field.options.map((x) => x.label).join(' / ') }}
                </div>
              </div>
            </Card>
            <Card size="small" title="分享与转发" class="mb-4">
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p class="mb-2 whitespace-pre-wrap">
                    分享文案：{{ detail.shareText || '未配置' }}
                  </p>
                  <ReviewMedia
                    v-if="detail.shareImageUrl"
                    :activity-id="detail.id"
                    :url="detail.shareImageUrl"
                    kind="image"
                  />
                </div>
                <div>
                  <p class="mb-2 whitespace-pre-wrap">
                    转发文案：{{ detail.forwardText || '未配置' }}
                  </p>
                  <ReviewMedia
                    v-if="detail.forwardImageUrl"
                    :activity-id="detail.id"
                    :url="detail.forwardImageUrl"
                    kind="image"
                  />
                </div>
              </div>
            </Card>
            <Card size="small" title="员工与其他设置" class="mb-4">
              <Descriptions :column="{ xs: 1, sm: 2 }">
                <DescriptionsItem label="参与员工范围">
                  {{
                    detail.employeeScope === 'all' ? '全部有效员工' : '指定员工'
                  }}
                </DescriptionsItem>
                <DescriptionsItem label="允许邀请申请加入">
                  {{ detail.employeeRegistrationEnabled ? '是' : '否' }}
                </DescriptionsItem>
                <DescriptionsItem label="组员业绩范围">
                  {{ scope(detail.memberPerformanceScope) }}
                </DescriptionsItem>
                <DescriptionsItem label="组长业绩范围">
                  {{ scope(detail.leaderPerformanceScope) }}
                </DescriptionsItem>
                <DescriptionsItem label="联系电话顺序" :span="2">
                  {{
                    detail.contactPhonePriority
                      .map(
                        (x) =>
                          ({ sales: '销售', store: '门店', company: '公司' })[
                            x
                          ],
                      )
                      .join(' → ')
                  }}
                </DescriptionsItem>
              </Descriptions>
              <ReviewMedia
                v-if="detail.musicUrl"
                :activity-id="detail.id"
                :url="detail.musicUrl"
                kind="audio"
              />
            </Card>
            <div v-if="canReview" class="pb-3">
              <label for="activity-review-reason" class="mb-2 block"
                >审核未通过原因</label
              >
              <Input.TextArea
                id="activity-review-reason"
                v-model:value="reason"
                :rows="3"
                :maxlength="1000"
                show-count
                placeholder="审核未通过时必填"
                :disabled="reviewing"
                @input="reasonError = ''"
              />
              <p v-if="reasonError" class="mt-2 text-red-500" role="alert">
                {{ reasonError }}
              </p>
            </div>
          </template>
        </Spin>
        <template #footer>
          <Space class="flex justify-end" wrap>
            <Button :disabled="reviewing" @click="close">关闭</Button>
            <ActivitySchedule
              v-if="detail && !reviewing"
              :activity="detail"
              @changed="
                (updated) => {
                  detail = updated;
                  void load();
                }
              "
            />
            <Button
              v-if="canReview"
              danger
              :loading="reviewing"
              @click="review('rejected')"
            >
              审核未通过
            </Button>
            <Button
              v-if="canReview"
              type="primary"
              :loading="reviewing"
              @click="review('approved')"
            >
              审核通过
            </Button>
          </Space>
        </template>
      </Drawer>
    </template>
  </ListShell>
</template>
