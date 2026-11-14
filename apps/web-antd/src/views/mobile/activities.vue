<script setup lang="ts">
import type { Activity } from '#/api/management';

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { useUserStore } from '@vben/stores';

import { Button, InputSearch, Pagination, Select, Tag } from 'ant-design-vue';

import {
  activityStatusColor,
  activityStatusLabel,
} from '#/api/activity-lifecycle';
import { captureContext } from '#/api/context-lifecycle';
import { getActivities, getActivity } from '#/api/management';
import { useAuthStore } from '#/store';

import ActivityActions from './activity-actions.vue';
import { count, dateTime, money } from './format';
import Share from './share.vue';
import State from './state.vue';
import { useResource } from './use-resource';
const route = useRoute();
const users = useUserStore();
const auth = useAuthStore();
const manager = computed(
  () =>
    !auth.profile?.isPlatformAdmin && users.userInfo?.roles?.includes('admin'),
);
const sharing = ref<Activity>();
let shareRequest = 0;
const preparingShare = ref('');
async function openShare(activity: Activity) {
  const context = captureContext();
  const request = ++shareRequest;
  preparingShare.value = activity.id;
  try {
    const current = await getActivity(activity.id, context.signal);
    context.assertCurrent();
    if (request === shareRequest) sharing.value = current;
  } catch {
    /* The request client displays the failure; keep the list in place. */
  } finally {
    if (request === shareRequest) preparingShare.value = '';
  }
}
onBeforeUnmount(() => {
  shareRequest++;
});
const page = ref(1);
const keyword = ref('');
const status = ref(
  typeof route.query.status === 'string' ? route.query.status : undefined,
);
const onlyJoined = ref('joined');
const { data, loading, failed, load } = useResource((signal) =>
  getActivities(
    {
      page: page.value,
      pageSize: 10,
      keyword: keyword.value.trim() || undefined,
      status: status.value,
      onlyJoined: onlyJoined.value === 'joined',
      withPersonal: true,
    },
    signal,
  ),
);
function search() {
  page.value = 1;
  void load();
}
function change(p: number) {
  page.value = p;
  void load();
}
watch(
  () => auth.currentTenant?.id,
  () => {
    shareRequest++;
    preparingShare.value = '';
    sharing.value = undefined;
  },
);
onMounted(load);
</script>
<template>
  <div v-if="manager" class="m-toolbar">
    <RouterLink
      class="ant-btn ant-btn-primary"
      :to="{ path: '/activities', query: { create: '1' } }"
      >
创建活动
</RouterLink>
  </div>
  <div class="m-toolbar">
    <InputSearch
      v-model:value="keyword"
      placeholder="搜索活动名称"
      allow-clear
      @search="search"
    /><Button :loading="loading" @click="load">刷新</Button>
  </div>
  <div class="m-toolbar">
    <Select
      v-model:value="status"
      placeholder="全部状态"
      allow-clear
      :options="[
        { label: '进行中', value: 'running' },
        { label: '待开始', value: 'published' },
        { label: '已结束', value: 'ended' },
        { label: '草稿', value: 'draft' },
      ]"
      @change="search"
    /><Select
      v-if="manager"
      v-model:value="onlyJoined"
      :options="[
        { label: '我参与的', value: 'joined' },
        { label: '公司全部', value: 'all' },
      ]"
      @change="search"
    /><span class="m-muted">共 {{ data?.total ?? 0 }} 场</span>
  </div>
  <State
    :loading="loading"
    :failed="failed"
    :empty="!data?.items.length"
    @retry="load"
  >
    <article v-for="a in data?.items" :key="a.id" class="m-block">
      <div class="m-pad">
        <div class="m-row mb-2">
          <Tag :color="activityStatusColor(a.status)">
            {{ activityStatusLabel(a.status) }}
</Tag><span class="m-muted">{{
            a.currentRole === 'leader'
              ? '组长'
              : a.currentRole === 'member'
                ? '组员'
                : a.currentRole === 'admin'
                  ? '公司管理员'
                  : ''
          }}</span>
        </div>
        <RouterLink :to="`/m/activities/${a.id}`">
          <h2 class="m-activity-title">{{ a.name }}</h2>
        </RouterLink>
        <p v-if="a.personal" class="m-muted mb-2">
          我的{{ a.groupEnabled ? '实付业绩' : '成功报名' }}
          <strong class="m-primary">{{
            a.groupEnabled
              ? money(a.personal.collectedCent)
              : `${count(a.personal.registrations)} 人`
          }}</strong>
        </p>
        <div class="m-timing">
          <span>开始 {{ dateTime(a.startsAt) }}</span><span>结束 {{ dateTime(a.endsAt) }}</span>
        </div>
      </div>
      <div class="m-actions">
        <RouterLink :to="{ path: '/m/orders', query: { activityId: a.id } }">
          报名记录
</RouterLink><RouterLink :to="{ path: '/m/rankings', query: { activityId: a.id } }">
          业绩排行
</RouterLink><button
          type="button"
          :disabled="
            a.storedStatus !== 'published' || !a.currentRole || a.canJoin
          "
          :loading="preparingShare === a.id"
          @click="openShare(a)"
        >
          分享活动
        </button>
      </div>
      <div v-if="manager" class="m-pad">
        <ActivityActions :activity="a" @changed="load" />
      </div>
    </article>
  </State>
  <Share
    v-if="sharing"
    :activity="sharing"
    :open="true"
    @close="sharing = undefined"
  />
  <div v-if="data?.total" class="m-pagination">
    <Pagination
      :current="page"
      :total="data.total"
      :page-size="10"
      :show-size-changer="false"
      simple
      @change="change"
    />
  </div>
</template>
