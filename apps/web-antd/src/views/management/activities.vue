<script setup lang="ts">
import type { Activity } from '#/api/management';

import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useUserStore } from '@vben/stores';

import { Button, InputSearch, Select, Space, Table, Tag } from 'ant-design-vue';

import {
  activityStatusColor,
  activityStatusLabel,
  activityStatusOptions,
} from '#/api/activity-lifecycle';
import { activityListActions } from '#/api/activity-workspace';
import { captureContext } from '#/api/context-lifecycle';
import { getActivities, getActivity } from '#/api/management';
import ActivityActions from '#/components/management/activity-actions.vue';
import ActivityPreview from '#/components/management/activity-preview.vue';
import ActivityPromotion from '#/components/management/activity-promotion.vue';
import ListShell from '#/components/management/list-shell.vue';
import { useAuthStore } from '#/store';

import ActivityEditor from './activity-editor.vue';
import { useList } from './use-list';
const auth = useAuthStore();
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
} = useList((params) =>
  getActivities({
    ...params,
    onlyJoined: !canCreate.value || route.query.onlyJoined === 'true',
    withSummary: true,
  }),
);
watch(() => route.query.onlyJoined, search);
const router = useRouter();
const user = useUserStore();
const canCreate = computed(() =>
  user.userInfo?.roles?.some((r) => ['admin'].includes(r)),
);
const editId = ref('');
const copyFrom = ref('');
const sharing = ref<Activity>();
const previewId = ref('');
const open = ref(false);
let shareRequest = 0;
onBeforeUnmount(() => {
  shareRequest++;
});
function edit(id = '') {
  if (id) {
    void router.push({ path: `/activities/${id}`, query: { edit: '1' } });
    return;
  }
  editId.value = '';
  copyFrom.value = '';
  open.value = true;
}
function duplicate(id: string) {
  editId.value = '';
  copyFrom.value = id;
  open.value = true;
}
async function action(record: Activity, value: string) {
  if (value === 'edit') return edit(record.id);
  if (value === 'preview') {
    previewId.value = record.id;
    return;
  }
  if (value === 'share') {
    const context = captureContext();
    const request = ++shareRequest;
    const latest = await getActivity(record.id);
    context.assertCurrent();
    if (request !== shareRequest) return;
    sharing.value = latest;
    return;
  }
  if (value === 'copy') return duplicate(record.id);
  if (value === 'records') {
    void router.push(`/activities/${record.id}/registrations`);
    return;
  }
  void router.push({
    path: `/activities/${record.id}`,
    query: value === 'ranking' ? { ranking: '1' } : {},
  });
}
const actionLabels: Record<string, string> = {
  edit: '编辑',
  preview: '预览',
  share: '分享',
  copy: '复制创建',
  records: '报名记录',
  ranking: '排行',
  progress: '审核进度',
};
function visibleActions(record: Activity) {
  return activityListActions(record).filter((value) => {
    if (['publish', 'restore', 'submit-review'].includes(value)) return false;
    if (['copy', 'edit', 'preview'].includes(value)) return record.canEdit;
    if (['ranking', 'records', 'share'].includes(value))
      return record.performanceScope !== 'none';
    return true;
  });
}
watch(
  () => [route.query.create, route.query.copyFrom],
  () => {
    if (canCreate.value && route.query.create === '1') {
      if (typeof route.query.copyFrom === 'string')
        duplicate(route.query.copyFrom);
      else edit();
    }
  },
  { immediate: true },
);
function closeEditor() {
  open.value = false;
  if (route.query.create || route.query.copyFrom) {
    const { create: _create, copyFrom: _copy, ...query } = route.query;
    void router.replace({ query });
  }
}
// Keep the current list position and filters in the URL when opening another task.
page.value = Math.max(1, Number(route.query.page) || 1);
pageSize.value = Math.max(1, Number(route.query.pageSize) || 20);
keyword.value =
  typeof route.query.keyword === 'string' ? route.query.keyword : '';
status.value =
  typeof route.query.status === 'string' ? route.query.status : undefined;
watch([page, pageSize, status], () => {
  void router.replace({
    query: {
      ...route.query,
      page: String(page.value),
      pageSize: String(pageSize.value),
      status: status.value,
      keyword: keyword.value || undefined,
    },
  });
});
function filter() {
  search();
  void router.replace({
    query: {
      ...route.query,
      page: '1',
      keyword: keyword.value || undefined,
      status: status.value,
    },
  });
}
const roleLabels: Record<string, string> = {
  admin: '公司管理员',
  leader: '组长',
  member: '组员',
};
function scrollKey() {
  return `group-activity-list-position:${localStorage.getItem('group-admin-session-context') || ''}:${route.query.onlyJoined || ''}:${page.value}:${pageSize.value}:${keyword.value}:${status.value || ''}`;
}
let tableRegion: HTMLElement | null = null;
function rememberScroll() {
  try {
    if (tableRegion)
      sessionStorage.setItem(scrollKey(), String(tableRegion.scrollTop));
  } catch {
    /* Optional position restoration. */
  }
}
onMounted(() => {
  tableRegion = document.querySelector('.management-table-region');
  tableRegion?.addEventListener('scroll', rememberScroll, { passive: true });
});
watch(loading, async (value) => {
  if (value) return;
  await nextTick();
  try {
    if (tableRegion)
      tableRegion.scrollTop = Number(sessionStorage.getItem(scrollKey()) || 0);
  } catch {
    /* Storage can be disabled. */
  }
});
onBeforeUnmount(() =>
  tableRegion?.removeEventListener('scroll', rememberScroll),
);
const columns = [
  { title: '活动名称', key: 'name', ellipsis: true, minWidth: 220 },
  { title: '活动状态', key: 'status', width: 110 },
  { title: '活动时间', key: 'schedule', width: 190 },
  { title: '收款账户', key: 'paymentAccount', width: 180 },
  { title: '真实业绩', key: 'performance', width: 170 },
  { title: '参与人员', key: 'people', width: 130 },
  { title: '操作', key: 'actions', width: 260, fixed: 'right' as const },
];
</script>
<template>
  <ListShell
    :title="
      !canCreate || route.query.onlyJoined === 'true'
        ? '我参加的活动'
        : '活动管理'
    "
    :description="canCreate ? '管理本公司活动与参与员工' : undefined"
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
        @search="filter"
      />
      <Select
        v-model:value="status"
        placeholder="全部状态"
        class="w-36"
        allow-clear
        :options="activityStatusOptions"
        @change="filter"
      />
    </template>
    <Table
      row-key="id"
      :columns="columns"
      :data-source="items"
      :loading="loading"
      :pagination="false"
      :scroll="{ x: 1100 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'">
          <Button
            type="link"
            class="max-w-full truncate !px-0 font-medium"
            :title="record.name"
            @click="router.push(`/activities/${record.id}`)"
          >
            {{ record.name }}
          </Button>
          <div class="text-xs text-muted-foreground">
            {{ record.groupEnabled ? '拼团活动' : '营销活动' }} ·
            {{ roleLabels[record.currentRole] || '尚未加入' }}
          </div>
        </template>
        <template v-else-if="column.key === 'schedule'">
          <div>
            {{
              record.startsAt
                ? new Date(record.startsAt).toLocaleString()
                : '未设置开始时间'
            }}
          </div>
          <div class="text-xs text-muted-foreground">
            至
            {{
              record.endsAt
                ? new Date(record.endsAt).toLocaleString()
                : '未设置结束时间'
            }}
          </div>
        </template>
        <template v-else-if="column.key === 'performance'">
          <Button
            v-if="record.summary"
            type="link"
            class="!px-0"
            @click="action(record as Activity, 'records')"
          >
            {{ record.summary.registrations }} 人报名<span
              v-if="record.groupEnabled"
            >
              · 净收 ¥{{
                (
                  (record.summary.netRevenueCent ??
                    record.summary.collectedCent) / 100
                ).toFixed(2)
              }}</span>
          </Button>
          <span v-else>—</span>
          <div
            v-if="
              record.summary?.pendingRegistration ||
              record.summary?.pendingPayment
            "
            class="flex gap-2 text-xs"
          >
            <Button
              v-if="record.summary.pendingRegistration"
              type="link"
              size="small"
              class="!p-0"
              @click="
                router.push({
                  path: `/activities/${record.id}/registrations`,
                  query: { status: 'pending' },
                })
              "
              >
待报名 {{ record.summary.pendingRegistration }}
</Button>
            <Button
              v-if="record.summary.pendingPayment"
              type="link"
              size="small"
              class="!p-0 !text-orange-600"
              @click="
                router.push({
                  path: `/activities/${record.id}/registrations`,
                  query: { status: 'pending_payment' },
                })
              "
              >
待支付 {{ record.summary.pendingPayment }}
</Button>
          </div>
          <div v-if="record.summary" class="text-xs text-muted-foreground">
            {{
              { all: '整个活动', group: '本组', self: '本人' }[
                record.summary.scope as 'all' | 'group' | 'self'
              ]
            }}
          </div>
        </template>
        <template v-else-if="column.key === 'paymentAccount'">
          <div v-if="record.paymentAccount">
            <div class="truncate">{{ record.paymentAccount.accountName }}</div>
            <div class="text-xs text-muted-foreground">
              {{ record.paymentAccount.maskedAccount }}
            </div>
          </div>
          <span v-else class="text-muted-foreground">无需支付</span>
        </template>
        <template v-else-if="column.key === 'people'">
          {{ record.memberCount }} 人 · {{ record.groupCount }} 组
        </template>
        <Tag
          v-else-if="column.key === 'status'"
          :color="activityStatusColor(record.status)"
        >
          {{ activityStatusLabel(record.status) }}
        </Tag>
        <template v-else-if="column.key === 'role'">
          {{ roleLabels[record.currentRole] || '—' }}
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
            v-for="value in visibleActions(record as Activity)"
            :key="value"
            type="link"
            size="small"
            @click="action(record as Activity, value)"
          >
            {{ actionLabels[value] }}
          </Button>
          <ActivityActions
            :activity="record as Activity"
            :actions="
              activityListActions(record as Activity).filter((value) =>
                ['submit-review', 'publish', 'restore'].includes(value),
              )
            "
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
        :copy-from="copyFrom"
        @close="closeEditor"
        @saved="load"
      />
      <ActivityPromotion
        v-if="sharing"
        :open="!!sharing"
        :activity="sharing"
        :sales-id="!auth.profile?.isPlatformAdmin && !sharing.canJoin ? user.userInfo?.userId : undefined"
        @close="sharing = undefined"
      />
      <ActivityPreview
        :open="!!previewId"
        :activity-id="previewId"
        @close="previewId = ''"
      />
    </template>
  </ListShell>
</template>

<style scoped>
.activity-table-actions :deep(.ant-btn-link) {
  padding-inline: 4px;
}
</style>
