<script setup lang="ts">
import type { TableColumnsType } from 'ant-design-vue';

import type { PerformanceRow } from '#/api/performance';

import { computed, ref, watch } from 'vue';

import { createIconifyIcon } from '@vben/icons';

import {
  Button,
  Card,
  Empty,
  Modal,
  Pagination,
  Table,
  Tag,
} from 'ant-design-vue';

import { count, money } from '#/views/home/format';

const props = withDefaults(
  defineProps<{
    rows: PerformanceRow[];
    metric: 'registrations' | 'revenue';
    title: string;
    group?: boolean;
    userId?: string;
    full?: boolean;
    nested?: boolean;
  }>(),
  { group: false, full: false, nested: false, userId: '' },
);
const Trophy = createIconifyIcon('lucide:trophy');
const fullOpen = ref(false);
const page = ref(1);
const pageSize = ref(20);
const expanded = ref<string[]>([]);
const score = (row: PerformanceRow) =>
  props.metric === 'revenue' ? row.collectedCent : row.registrations;
const hasScore = (row: PerformanceRow) => score(row) > 0;
const total = computed(() =>
  props.rows.reduce((sum, row) => sum + score(row), 0),
);
const shown = computed(() =>
  props.full || props.nested
    ? props.rows.slice(
        (page.value - 1) * pageSize.value,
        page.value * pageSize.value,
      )
    : props.rows.slice(0, 10),
);
const columns = computed<TableColumnsType<PerformanceRow>>(() => [
  { key: 'rank', title: '排名', width: 64, align: 'center' },
  { key: 'name', title: props.group ? '活动小组' : '员工', ellipsis: true },
  ...(props.metric === 'revenue'
    ? [
        {
          key: 'paidOrders',
          title: '成交客户',
          width: 88,
          align: 'right' as const,
        },
      ]
    : []),
  {
    key: 'score',
    title: props.metric === 'revenue' ? '实付金额' : '成功报名',
    width: 125,
    align: 'right',
  },
]);
watch(
  () => props.rows.length,
  () => {
    page.value = Math.min(
      page.value,
      Math.max(1, Math.ceil(props.rows.length / pageSize.value)),
    );
  },
);
</script>

<template>
  <component
    :is="nested ? 'div' : Card"
    size="small"
    class="ranking-list min-w-0"
    :bordered="!nested"
    :data-ranking="group ? 'groups' : 'employees'"
  >
    <div v-if="!nested" class="ranking-heading">
      <div>
        <h3>{{ title }}</h3>
        <span class="ranking-caption">共 {{ count(rows.length) }} {{ group ? '组' : '人' }} ·
          {{ rows.filter(hasScore).length }}
          {{ group ? '组' : '人' }}已有业绩</span>
      </div>
      <div class="ranking-total">
        <span>{{ group ? '小组合计' : '员工合计' }}</span><strong>{{
          metric === 'revenue' ? money(total) : `${count(total)} 人`
        }}</strong>
      </div>
    </div>
    <Table
      v-model:expanded-row-keys="expanded"
      :columns="columns"
      :data-source="shown"
      :pagination="false"
      :scroll="{ x: group ? 460 : 410 }"
      row-key="id"
      size="small"
      :row-expandable="(row: PerformanceRow) => group && !!row.members?.length"
      :row-class-name="
        (row: PerformanceRow) => (row.id === userId ? 'ranking-mine' : '')
      "
    >
      <template #emptyText>
<Empty
          :image="Empty.PRESENTED_IMAGE_SIMPLE"
          :description="group ? '暂无小组' : '暂无员工'"
      />
</template>
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'rank'">
          <span
            v-if="record.rank <= 3 && hasScore(record as PerformanceRow)"
            class="ranking-medal"
            :class="`ranking-medal-${record.rank}`"
            ><Trophy /><b>{{ record.rank }}</b></span>
          <span v-else class="ranking-number">{{ record.rank }}</span>
        </template>
        <template v-else-if="column.key === 'name'">
          <div class="ranking-name" :title="record.name">
            <span>{{ record.name }}</span><Tag v-if="record.id === userId" color="processing">我</Tag><span v-if="record.historical" class="ranking-caption">历史业绩</span>
          </div>
          <div
            v-if="group"
            class="ranking-caption truncate"
            :title="record.activityName"
          >
            {{ record.activityName }}
          </div>
        </template>
        <template v-else-if="column.key === 'paidOrders'">
{{ count(record.paidOrders) }} 人
</template>
        <template v-else-if="column.key === 'score'">
<strong
            class="ranking-score"
            :class="{
              'ranking-score-zero': !hasScore(record as PerformanceRow),
            }"
            >{{
              metric === 'revenue'
                ? money(record.collectedCent)
                : `${count(record.registrations)} 人`
            }}</strong>
          <div
            v-if="metric === 'revenue' && record.refundedCent"
            class="ranking-caption"
          >
            退款 {{ money(record.refundedCent) }}
          </div>
</template>
      </template>
      <template v-if="group" #expandedRowRender="{ record }">
        <RankingList
          :rows="record.members ?? []"
          :metric="metric"
          title="组内排行"
          :user-id="userId"
          nested
        />
      </template>
    </Table>
    <div
      v-if="(full || nested) && rows.length > pageSize"
      class="ranking-footer"
    >
      <Pagination
        v-model:current="page"
        v-model:page-size="pageSize"
        :total="rows.length"
        :show-total="(n: number) => `共 ${n} 条`"
        :page-size-options="['20', '50', '100']"
        size="small"
        show-size-changer
      />
    </div>
    <div
      v-else-if="!full && !nested && rows.length > 10"
      class="ranking-footer"
    >
      <span class="ranking-caption">已展示前10名 · 共 {{ rows.length }} {{ group ? '组' : '人' }}</span><Button type="link" size="small" @click="fullOpen = true">
查看全部
</Button>
    </div>
  </component>
  <Modal
    v-if="fullOpen"
    v-model:open="fullOpen"
    :title="title"
    :width="980"
    :footer="null"
    destroy-on-close
    wrap-class-name="performance-ranking-modal"
    >
<RankingList
      :rows="rows"
      :metric="metric"
      :title="title"
      :group="group"
      :user-id="userId"
      full
  />
</Modal>
</template>

<style scoped>
.ranking-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.ranking-heading h3 {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 3px;
}
.ranking-caption {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  font-weight: 400;
}
.ranking-total {
  text-align: right;
  flex-shrink: 0;
}
.ranking-total span {
  display: block;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}
.ranking-total strong {
  font-size: 21px;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.4px;
}
.ranking-score {
  font-size: 15px;
  font-variant-numeric: tabular-nums;
  color: hsl(var(--primary));
}
.ranking-score-zero {
  color: hsl(var(--muted-foreground));
  font-weight: 500;
}
.ranking-name {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-weight: 500;
}
.ranking-name > span:first-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ranking-name :deep(.ant-tag) {
  margin: 0;
  line-height: 18px;
}
.ranking-number {
  color: hsl(var(--muted-foreground));
  font-variant-numeric: tabular-nums;
}
.ranking-medal {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 27px;
  height: 29px;
}
.ranking-medal :deep(svg) {
  width: 26px;
  height: 26px;
  opacity: 0.22;
}
.ranking-medal b {
  position: absolute;
  top: 3px;
  font-size: 12px;
}
.ranking-medal-1 {
  color: #b98919;
}
.ranking-medal-2 {
  color: #7a8999;
}
.ranking-medal-3 {
  color: #a56a43;
}
.ranking-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
}
.ranking-list :deep(.ranking-mine > td) {
  background: hsl(var(--primary) / 0.065) !important;
}
.ranking-list :deep(.ant-table-expanded-row > td) {
  padding: 8px 12px !important;
}
.ranking-list :deep(.ant-table-cell) {
  padding-top: 10px;
  padding-bottom: 10px;
}
.ranking-list :deep(.ant-card-body) {
  padding: 16px;
}
.ranking-list :deep(.ant-table-thead > tr > th) {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}
</style>
