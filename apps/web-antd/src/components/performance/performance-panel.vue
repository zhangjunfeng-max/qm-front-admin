<script setup lang="ts">
import type { PerformanceBoard, PerformanceQuery } from '#/api/performance';

import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

import { useUserStore } from '@vben/stores';

import { Alert, Button, Segmented, Spin } from 'ant-design-vue';

import { captureContext } from '#/api/context-lifecycle';
import { getPerformanceBoard } from '#/api/performance';
import { createPerformanceFeed } from '#/api/performance-feed';
import { useAuthStore } from '#/store';
import { count, money } from '#/views/home/format';

import RankingList from './ranking-list.vue';
import SuccessCelebration from './success-celebration.vue';

const props = defineProps<{ activityId?: string }>();
const auth = useAuthStore();
const users = useUserStore();
const board = ref<PerformanceBoard>();
const failed = ref(false);
const loading = ref(false);
const metric = ref<PerformanceQuery['metric']>('revenue');
const celebration = ref<InstanceType<typeof SuccessCelebration>>();
const userId = computed(() => users.userInfo?.userId || '');
const feed = createPerformanceFeed(getPerformanceBoard, {
  data: (value) => {
    board.value = value;
  },
  reset: () => {
    board.value = undefined;
    celebration.value?.clear();
  },
  failed: (value) => {
    failed.value = value;
  },
  loading: (value) => {
    loading.value = value;
  },
  celebrate: (events) => celebration.value?.push(events),
});
let detach: (() => void) | undefined;
let disposed = false;
function bind() {
  if (disposed) return;
  detach?.();
  feed.stop();
  failed.value = false;
  if (
    !auth.currentTenant?.id ||
    !userId.value ||
    auth.switchingTenant ||
    auth.reloadingContext
  )
    return;
  const context = captureContext();
  feed.bind(
    { activityId: props.activityId, metric: metric.value },
    context.signal,
  );
  const renew = () => queueMicrotask(bind);
  context.signal.addEventListener('abort', renew, { once: true });
  detach = () => context.signal.removeEventListener('abort', renew);
}
watch(
  () => [
    auth.currentTenant?.id,
    userId.value,
    users.userInfo?.roles?.join(','),
    auth.switchingTenant,
    auth.reloadingContext,
    props.activityId,
    metric.value,
  ],
  bind,
  { immediate: true, flush: 'sync' },
);
const scopeLabel = computed(() =>
  board.value?.scope === 'self'
    ? '本人'
    : board.value?.scope === 'group'
      ? '本组'
      : props.activityId
        ? '活动'
        : '公司',
);
const updated = computed(() =>
  board.value
    ? new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Shanghai',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(new Date(board.value.generatedAt))
    : '—',
);
const amountLabel = computed(() =>
  board.value?.metric === 'revenue' ? '实付金额' : '成功报名',
);
const mainValue = computed(() =>
  board.value?.metric === 'revenue'
    ? money(board.value.summary.collectedCent)
    : `${count(board.value?.summary.registrations)} 人`,
);
const score = (row: { registrations: number; collectedCent: number }) =>
  board.value?.metric === 'revenue'
    ? money(row.collectedCent)
    : `${count(row.registrations)} 人`;
function visibility() {
  feed.visible(document.visibilityState !== 'hidden');
}
onMounted(() => {
  visibility();
  document.addEventListener('visibilitychange', visibility);
});
onUnmounted(() => {
  disposed = true;
  detach?.();
  feed.stop();
  document.removeEventListener('visibilitychange', visibility);
});
</script>
<template>
  <section class="performance-panel min-w-0">
    <div class="performance-toolbar">
      <div>
        <h2>{{ activityId ? '活动业绩排行' : '本月业绩排行' }}</h2>
        <span class="text-muted-foreground text-xs">{{ activityId ? '活动全周期' : board?.month || '本月' }} ·
          {{ scopeLabel }}数据 · {{ updated }} 更新</span>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Segmented
          v-if="!activityId"
          v-model:value="metric"
          :options="[
            { label: '成交榜', value: 'revenue' },
            { label: '报名榜', value: 'registrations' },
          ]"
          size="small"
        /><Button size="small" :loading="loading" @click="feed.refresh">
刷新
</Button>
      </div>
    </div>
    <Alert
      v-if="failed"
      class="mb-3"
      type="warning"
      show-icon
      :message="
        board ? '更新失败，当前显示上次统计结果' : '业绩数据加载失败，请重试'
      "
      >
<template #action>
<Button size="small" @click="feed.refresh">重试</Button>
</template>
</Alert>
    <Spin :spinning="loading">
      <div class="performance-summary">
        <div class="performance-headline">
          <span>{{ scopeLabel }}总{{ amountLabel }}</span><strong>{{ mainValue }}</strong>
        </div>
        <template v-if="board?.metric === 'revenue'">
<div>
            <span>成交客户</span><strong>{{ count(board.summary.paidOrders) }} <small>人</small></strong>
          </div>
          <div>
            <span>退款后金额</span><strong>{{ money(board.summary.netCent) }}</strong><small>退款 {{ money(board.summary.refundedCent) }}</small>
          </div>
</template>
        <div v-if="board?.mine" class="performance-standing">
          <span>我的排名</span><strong>第 {{ board.mine.rank }} <small>名</small></strong><small>我的业绩 {{ score(board.mine) }}</small>
        </div>
      </div>
      <div
        class="performance-rankings"
        :class="{ 'performance-self': board?.scope === 'self' }"
      >
        <RankingList
          :rows="board?.employees ?? []"
          :metric="board?.metric ?? 'revenue'"
          :title="board?.scope === 'self' ? '本人业绩' : '个人排行'"
          :user-id="userId"
        />
        <RankingList
          v-if="board?.scope !== 'self'"
          :rows="board?.groups ?? []"
          :metric="board?.metric ?? 'revenue'"
          title="小组排行"
          :user-id="userId"
          group
        />
      </div>
      <div
        v-if="
          board &&
          (board.unassigned.registrations || board.unassigned.collectedCent)
        "
        class="performance-note"
      >
        未归属销售：{{ score(board.unassigned) }}，已计入{{
          scopeLabel
        }}总业绩。
      </div>
      <details
        v-if="board?.scope !== 'self' && board?.ungrouped.members?.length"
        class="performance-ungrouped"
      >
        <summary>未分组员工 · {{ score(board.ungrouped) }}</summary>
        <RankingList
          :rows="board.ungrouped.members"
          :metric="board.metric"
          title="未分组员工"
          :user-id="userId"
          nested
        />
      </details>
    </Spin>
    <SuccessCelebration ref="celebration" :user-id="userId" />
  </section>
</template>
<style scoped>
.performance-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.performance-toolbar h2 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 3px;
}
.performance-summary {
  display: flex;
  align-items: stretch;
  gap: 0;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--card));
  border-radius: 6px;
  margin-bottom: 12px;
  overflow: hidden;
  flex-wrap: wrap;
}
.performance-summary > div {
  flex: 1;
  min-width: 145px;
  padding: 14px 20px;
}
.performance-summary > div + div {
  border-left: 1px solid hsl(var(--border));
}
.performance-summary span {
  display: block;
  color: hsl(var(--muted-foreground));
  font-size: 12px;
}
.performance-summary strong {
  display: block;
  font-size: 24px;
  line-height: 1.5;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.5px;
}
.performance-summary small {
  font-size: 12px;
  font-weight: 400;
  color: hsl(var(--muted-foreground));
  letter-spacing: 0;
}
.performance-headline {
  background: hsl(var(--primary) / 0.045);
}
.performance-headline strong {
  color: hsl(var(--primary));
}
.performance-standing strong {
  font-size: 21px;
}
.performance-rankings {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
}
.performance-self {
  grid-template-columns: minmax(0, 1fr);
}
.performance-note {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  padding: 10px 2px;
}
.performance-ungrouped {
  border: 1px solid hsl(var(--border));
  border-radius: 4px;
  padding: 10px 14px;
  margin-top: 12px;
}
.performance-ungrouped summary {
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
}
.performance-ungrouped[open] summary {
  margin-bottom: 12px;
}
@media (max-width: 1100px) {
  .performance-rankings {
    grid-template-columns: minmax(0, 1fr);
  }
}
@media (max-width: 640px) {
  .performance-summary > div {
    padding: 12px;
    min-width: 45%;
    border-bottom: 1px solid hsl(var(--border));
  }
  .performance-summary strong {
    font-size: 22px;
  }
  .performance-toolbar {
    gap: 8px;
  }
  .performance-toolbar > div:last-child {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
