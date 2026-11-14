<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import { Button, Tag } from 'ant-design-vue';

import {
  activityStatusColor,
  activityStatusLabel,
} from '#/api/activity-lifecycle';
import { getActivity } from '#/api/management';
import { getPerformanceBoard } from '#/api/performance';

import ActivityActions from './activity-actions.vue';
import { count, dateTime, money } from './format';
import Share from './share.vue';
import State from './state.vue';
import { useResource } from './use-resource';
const route = useRoute();
const id = String(route.params.id);
const share = ref(route.query.share === '1');
const { data, loading, failed, load } = useResource(async (signal) => {
  const activity = await getActivity(id, signal);
  return activity;
});
const stats = useResource((signal) =>
  getPerformanceBoard({ activityId: id }, signal),
);
const published = computed(
  () =>
    data.value?.storedStatus === 'published' &&
    (data.value.currentRole === 'admin' || !data.value.canJoin),
);
onMounted(() => {
  void load();
  void stats.load();
});
</script>
<template>
  <State :loading="loading" :failed="failed" @retry="load">
    <template v-if="data">
      <section class="m-block m-pad">
        <div class="m-row mb-2">
          <Tag :color="activityStatusColor(data.status)">
            {{ activityStatusLabel(data.status) }}
</Tag><span class="m-muted">{{
            data.groupEnabled ? '团购活动' : '报名活动'
          }}</span>
        </div>
        <h2 class="m-activity-title">{{ data.name }}</h2>
        <div class="m-timing">
          <span>开始 {{ dateTime(data.startsAt) }}</span><span>结束 {{ dateTime(data.endsAt) }}</span>
        </div>
      </section>
      <section class="m-block">
        <div class="m-section-head m-row">
          <h3 class="m-title">我的活动业绩</h3>
          <Button
            size="small"
            type="link"
            :loading="stats.loading.value"
            @click="stats.load"
          >
            刷新
          </Button>
        </div>
        <State
          :loading="stats.loading.value"
          :failed="stats.failed.value"
          @retry="stats.load"
        >
          <div class="m-grid">
            <RouterLink
              class="m-metric"
              :to="{
                path: '/m/orders',
                query: {
                  activityId: id,
                  onlySelf: 'true',
                  event: data.groupEnabled ? 'paid' : 'registrations',
                  status: data.groupEnabled ? undefined : 'registered',
                },
              }"
            >
              <span>{{ data.groupEnabled ? '实付金额' : '成功报名' }}</span><strong class="m-primary">{{
                data.groupEnabled
                  ? money(stats.data.value?.mine?.collectedCent)
                  : count(stats.data.value?.mine?.registrations)
              }}</strong>
            </RouterLink>
            <RouterLink
              class="m-metric"
              :to="{ path: '/m/rankings', query: { activityId: id } }"
            >
              <span>个人排名</span><strong>{{
                  stats.data.value?.mine?.rank
                    ? `第 ${stats.data.value.mine.rank}`
                    : '—'
                }}<small v-if="stats.data.value?.mine?.rank" class="m-muted">
                  名</small></strong>
            </RouterLink>
          </div>
        </State>
      </section>
      <section class="m-block">
        <RouterLink
          class="m-list-link"
          :to="{ path: '/m/orders', query: { activityId: id } }"
        >
          <span>报名记录</span><span class="m-muted">查看及跟进 ›</span>
</RouterLink><RouterLink
          class="m-list-link"
          :to="{ path: '/m/rankings', query: { activityId: id } }"
        >
          <span>活动业绩排行榜</span><span class="m-muted">个人 · 小组 ›</span>
        </RouterLink>
      </section>
      <ActivityActions :activity="data" @changed="load" />
      <Button
        type="primary"
        block
        size="large"
        :disabled="!published || !data.currentRole"
        @click="share = true"
      >
        分享活动
      </Button>
      <p v-if="data.storedStatus !== 'published'" class="m-muted mt-2">
        活动发布后可分享
      </p>
      <p
        v-else-if="
          (data.canJoin && data.currentRole !== 'admin') || !data.currentRole
        "
        class="m-muted mt-2"
      >
        加入活动后可分享推广
      </p>
      <Share :activity="data" :open="share" @close="share = false" />
    </template>
  </State>
</template>
