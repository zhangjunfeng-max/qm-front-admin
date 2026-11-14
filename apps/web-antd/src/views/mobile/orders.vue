<script setup lang="ts">
import type { OrderQuery } from '#/api/customer-management';

import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { createIconifyIcon } from '@vben/icons';

import { Button, InputSearch, Pagination, Select } from 'ant-design-vue';

import { getRegistrations } from '#/api/customer-management';
import { getActivities, getActivity } from '#/api/management';

import { dateTime, dial, money, statusLabel } from './format';
import State from './state.vue';
import { useResource } from './use-resource';
const route = useRoute();
const router = useRouter();
const Phone = createIconifyIcon('lucide:phone');
const page = ref(Math.max(1, Number(route.query.page) || 1));
const keyword = ref(
  typeof route.query.keyword === 'string' ? route.query.keyword : '',
);
const status = ref(
  ['pending', 'pending_payment', 'registered'].includes(
    String(route.query.status),
  )
    ? String(route.query.status)
    : '',
);
const activityId = ref(
  typeof route.query.activityId === 'string'
    ? route.query.activityId
    : undefined,
);
const activityKeyword = ref('');
const onlySelf = ref(route.query.onlySelf === 'true');
const period = ref<OrderQuery['period']>(
  ['month', 'today'].includes(String(route.query.period))
    ? (route.query.period as OrderQuery['period'])
    : undefined,
);
const event = ref<OrderQuery['event']>(
  ['paid', 'registrations'].includes(String(route.query.event))
    ? (route.query.event as OrderQuery['event'])
    : undefined,
);
const { data, loading, failed, load } = useResource((signal) =>
  getRegistrations(
    {
      page: page.value,
      pageSize: 15,
      keyword: keyword.value.trim() || undefined,
      status: status.value || undefined,
      activityId: activityId.value,
      onlySelf: onlySelf.value,
      period: period.value,
      event: event.value,
    },
    signal,
  ),
);
const activities = useResource((signal) =>
  getActivities(
    {
      page: 1,
      pageSize: 50,
      keyword: activityKeyword.value.trim() || undefined,
    },
    signal,
  ),
);
const selectedActivity = useResource((signal) =>
  getActivity(activityId.value!, signal),
);
const options = computed(() => {
  const items =
    activities.data.value?.items.map((a) => ({ label: a.name, value: a.id })) ??
    [];
  if (activityId.value && !items.some((a) => a.value === activityId.value))
    items.unshift({
      label:
        selectedActivity.data.value?.id === activityId.value
          ? selectedActivity.data.value.name
          : '指定活动',
      value: activityId.value,
    });
  return items;
});
const statusFilters = computed(() => [
  { label: '全部', value: '' },
  { label: '待报名', value: 'pending' },
  { label: '已报名', value: 'registered' },
  ...(data.value?.hasPaymentRecords
    ? [{ label: '待支付', value: 'pending_payment' }]
    : []),
]);
watch(activityId, () => {
  if (activityId.value) void selectedActivity.load();
});

function persistFilters() {
  void router.replace({
    path: route.path,
    query: {
      activityId: activityId.value,
      status: status.value || undefined,
      onlySelf: onlySelf.value ? 'true' : undefined,
      period: period.value,
      event: event.value,
      keyword: keyword.value || undefined,
      page: String(page.value),
    },
  });
}
function search() {
  page.value = 1;
  persistFilters();
  void load();
}
function change(p: number) {
  page.value = p;
  persistFilters();
  void load();
}
function filter(value: string) {
  status.value = value;
  event.value = undefined;
  search();
}
function clearPersonal() {
  onlySelf.value = false;
  period.value = undefined;
  event.value = undefined;
  search();
}
function findActivity(value: string) {
  activityKeyword.value = value;
  void activities.load();
}
function detail(id: string) {
  void router.push({
    path: `/m/orders/${id}`,
    query: {
      activityId: activityId.value,
      status: status.value,
      onlySelf: onlySelf.value ? 'true' : undefined,
      period: period.value,
      event: event.value,
      keyword: keyword.value,
      page: page.value,
    },
  });
}
onMounted(() => {
  void load();
  void activities.load();
  if (activityId.value) void selectedActivity.load();
});
</script>
<template>
  <div class="m-toolbar">
    <InputSearch
      v-model:value="keyword"
      placeholder="搜索客户姓名、电话"
      allow-clear
      @search="search"
    /><Button :loading="loading" @click="load">刷新</Button>
  </div>
  <div class="m-toolbar">
    <Select
      v-model:value="activityId"
      class="flex-1"
      placeholder="全部活动"
      allow-clear
      show-search
      :filter-option="false"
      :options="options"
      :loading="activities.loading.value"
      @search="findActivity"
      @change="search"
    /><span class="m-muted">{{ data?.total ?? 0 }} 条</span>
  </div>
  <div v-if="onlySelf || period" class="m-row mb-3">
    <span class="m-muted">{{ onlySelf ? '本人 · ' : ''
      }}{{ period === 'today' ? '今日' : period === 'month' ? '本月' : ''
      }}{{
        event === 'paid'
          ? ' · 实际成交'
          : event === 'registrations'
            ? ' · 成功报名'
            : ''
      }}</span><Button type="link" size="small" @click="clearPersonal">查看全部</Button>
  </div>
  <div class="m-filter">
    <Button
      v-for="f in statusFilters"
      :key="f.value"
      :type="status === f.value ? 'primary' : 'default'"
      @click="filter(f.value)"
    >
      {{ f.label }}
    </Button>
  </div>
  <State
    :loading="loading"
    :failed="failed"
    :empty="!data?.items.length"
    @retry="load"
  >
    <section class="m-block">
      <article v-for="o in data?.items" :key="o.id" class="m-record">
        <div class="m-record-head">
          <button class="m-customer-name" @click="detail(o.id)">
            {{ o.customerName || '未填写姓名' }}
            <span class="m-muted">›</span>
</button><span class="m-badge" :class="o.status.replaceAll('_', '-')">{{
            statusLabel(o)
          }}</span>
        </div>
        <div class="m-row">
          <a class="m-phone" :href="dial(o.customerPhone)">{{ o.customerPhone }}<Phone /></a><strong v-if="o.participation !== 'free' && o.orderId">{{
            money(o.amountCent)
          }}</strong>
        </div>
        <p class="m-muted">{{ o.activityName }}</p>
        <div class="m-row m-record-foot">
          <span class="m-muted">销售 {{ o.salesName || '未归属' }}</span><span class="m-muted">{{ o.registeredAt ? '报名' : o.orderId ? '提交' : '留资' }}
            {{ dateTime(o.registeredAt || o.createdAt) }}</span>
        </div>
      </article>
    </section>
  </State>
  <div v-if="data?.total" class="m-pagination">
    <Pagination
      :current="page"
      :total="data.total"
      :page-size="15"
      :show-size-changer="false"
      simple
      @change="change"
    />
  </div>
</template>
