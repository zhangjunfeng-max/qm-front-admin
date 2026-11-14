<script setup lang="ts">
import type { PerformanceRow } from '#/api/performance';

import { ref } from 'vue';

import { Button } from 'ant-design-vue';

import { count, money } from './format';
defineProps<{
  rows: PerformanceRow[];
  metric: string;
  userId: string;
  group?: boolean;
  nested?: boolean;
}>();
const limit = ref(20);
const score = (r: PerformanceRow, metric: string) =>
  metric === 'revenue'
    ? money(r.collectedCent)
    : `${count(r.registrations)} 人`;
</script>
<template>
  <template v-for="row in rows.slice(0, limit)" :key="row.id">
    <details v-if="group" class="m-ranking-group">
      <summary class="m-ranking-row m-group-summary">
        <span
          class="m-rank"
          :class="{
            top:
              row.rank <= 3 &&
              (metric === 'revenue' ? row.collectedCent : row.registrations) >
                0,
          }"
          >{{ row.rank }}</span>
        <div class="m-ranking-person">
          <strong>{{ row.name }}</strong><small v-if="row.activityName">{{ row.activityName }}</small><small>{{ row.members?.length ?? 0 }} 人 · 展开成员</small>
        </div>
        <strong class="m-ranking-score">{{ score(row, metric) }}</strong>
      </summary>
      <div class="m-group-members">
        <RankingRows
          :rows="row.members ?? []"
          :metric="metric"
          :user-id="userId"
          nested
        />
      </div>
    </details>
    <div v-else class="m-ranking-row" :class="{ 'm-mine': row.id === userId }">
      <span
        class="m-rank"
        :class="{
          top:
            !nested &&
            row.rank <= 3 &&
            (metric === 'revenue' ? row.collectedCent : row.registrations) > 0,
        }"
        >{{ row.rank }}</span>
      <div class="m-ranking-person">
        <strong>{{ row.name
          }}<small v-if="row.id === userId" class="!inline m-primary">
            · 我</small></strong><small v-if="row.historical">历史参与员工</small>
      </div>
      <strong class="m-ranking-score">{{ score(row, metric) }}</strong>
    </div>
  </template>
  <p v-if="!rows.length" class="m-empty-note">
    暂无{{ group ? '分组' : '员工' }}
  </p>
  <Button v-if="rows.length > limit" block type="text" @click="limit += 20">
展开更多（共 {{ rows.length }} 人{{ group ? ' / 组' : '' }}）
</Button>
</template>
