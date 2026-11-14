<script setup lang="ts">
import type { PerformanceBoard, PerformanceQuery } from '#/api/performance';

import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { useUserStore } from '@vben/stores';

import { Button, Segmented } from 'ant-design-vue';

import { captureContext } from '#/api/context-lifecycle';
import { getPerformanceBoard } from '#/api/performance';
import { createPerformanceFeed } from '#/api/performance-feed';
import SuccessCelebration from '#/components/performance/success-celebration.vue';

import { count, dateTime, money } from './format';
import RankingRows from './ranking-rows.vue';
import State from './state.vue';
const route = useRoute();
const activityId =
  typeof route.query.activityId === 'string'
    ? route.query.activityId
    : undefined;
const users = useUserStore();
const userId = computed(() => String(users.userInfo?.userId ?? ''));
const context = captureContext();
const metric = ref<PerformanceQuery['metric']>('revenue');
const tab = ref('employees');
const board = ref<PerformanceBoard>();
const failed = ref(false);
const loading = ref(false);
const celebration = ref<InstanceType<typeof SuccessCelebration>>();
const feed = createPerformanceFeed(getPerformanceBoard, {
  data: (v) => {
    board.value = v;
  },
  reset: () => {
    board.value = undefined;
    celebration.value?.clear();
  },
  failed: (v) => {
    failed.value = v;
  },
  loading: (v) => {
    loading.value = v;
  },
  celebrate: (events) => celebration.value?.push(events),
});
function bind() {
  feed.bind({ activityId, metric: metric.value }, context.signal);
}
function visibility() {
  feed.visible(document.visibilityState !== 'hidden');
}
const invalidate = () => {
  feed.stop();
  board.value = undefined;
  failed.value = false;
  celebration.value?.clear();
};
context.signal.addEventListener('abort', invalidate, { once: true });
watch(metric, bind);
onMounted(() => {
  visibility();
  document.addEventListener('visibilitychange', visibility);
  bind();
});
onUnmounted(() => {
  feed.stop();
  document.removeEventListener('visibilitychange', visibility);
  context.signal.removeEventListener('abort', invalidate);
});
const scope = computed(() =>
  board.value?.scope === 'self'
    ? '本人'
    : board.value?.scope === 'group'
      ? '本组'
      : activityId
        ? '活动'
        : '公司',
);
const score = (row: { collectedCent: number; registrations: number }) =>
  board.value?.metric === 'revenue'
    ? money(row.collectedCent)
    : `${count(row.registrations)} 人`;
</script>
<template>
  <div class="m-row mb-3">
    <div>
      <h2 class="m-title">
        {{ activityId ? '活动业绩排行' : '公司本月排行' }}
      </h2>
      <span class="m-muted">{{ activityId ? '活动全周期' : board?.month || '本月' }} ·
        {{ scope }}数据</span>
    </div>
    <Button size="small" :loading="loading" @click="feed.refresh">刷新</Button>
  </div>
  <Segmented
    v-if="!activityId"
    v-model:value="metric"
    block
    class="mb-3"
    :options="[
      { label: '成交金额榜', value: 'revenue' },
      { label: '报名人数榜', value: 'registrations' },
    ]"
  />
  <div v-if="failed && board" class="m-warning">
    更新失败，当前为上次统计结果
    <Button size="small" type="link" @click="feed.refresh">重试</Button>
  </div>
  <State
    :loading="loading && !board"
    :failed="failed && !board"
    @retry="feed.refresh"
    >
<template v-if="board">
      <section class="m-block">
        <div class="m-ranking-total">
          <div>
            <span class="m-muted">{{ scope }}总{{
                board.metric === 'revenue' ? '实付金额' : '成功报名'
              }}</span><strong class="block">{{ score(board.summary) }}</strong>
          </div>
          <div v-if="board.mine" class="text-right">
            <span class="m-muted">我的排名</span><strong class="block">第 {{ board.mine.rank }} 名</strong><span class="m-muted">{{ score(board.mine) }}</span>
          </div>
        </div>
        <div v-if="board.metric === 'revenue'" class="m-row m-pad m-muted">
          <span>成交 {{ count(board.summary.paidOrders) }} 单</span><span>退款 {{ money(board.summary.refundedCent) }}</span>
        </div>
      </section>
      <Segmented
        v-if="board.scope !== 'self'"
        v-model:value="tab"
        block
        class="mb-3"
        :options="[
          { label: '个人榜', value: 'employees' },
          { label: '小组榜', value: 'groups' },
        ]"
      />
      <section class="m-block">
        <RankingRows
          :key="`${tab}:${board.metric}`"
          :rows="
            tab === 'groups' && board.scope !== 'self'
              ? board.groups
              : board.employees
          "
          :metric="board.metric"
          :user-id="userId"
          :group="tab === 'groups' && board.scope !== 'self'"
        />
      </section>
      <details
        v-if="
          tab === 'groups' &&
          board.scope !== 'self' &&
          board.ungrouped.members?.length
        "
        class="m-block"
      >
        <summary class="m-list-link">
          未分组员工 <strong>{{ score(board.ungrouped) }}</strong>
        </summary>
        <RankingRows
          :rows="board.ungrouped.members"
          :metric="board.metric"
          :user-id="userId"
          nested
        />
      </details>
      <p
        v-if="board.unassigned.collectedCent || board.unassigned.registrations"
        class="m-muted"
      >
        未归属销售 {{ score(board.unassigned) }}，已计入总业绩
      </p>
      <p class="m-muted text-center">
        {{ dateTime(board.generatedAt) }} 更新 · 每 30 秒刷新
      </p>
    </template>
</State><SuccessCelebration ref="celebration" :user-id="userId" />
</template>
