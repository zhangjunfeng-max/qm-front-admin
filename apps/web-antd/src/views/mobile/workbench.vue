<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { createIconifyIcon } from '@vben/icons';
import { useUserStore } from '@vben/stores';

import { Button, Segmented } from 'ant-design-vue';

import { getCompanyOverviewApi } from '#/api/company-overview';
import { useAuthStore } from '#/store';

import { count, dateTime, money } from './format';
import State from './state.vue';
import { useResource } from './use-resource';
const router = useRouter();
const users = useUserStore();
const auth = useAuthStore();
const manager = computed(
  () =>
    !auth.profile?.isPlatformAdmin && users.userInfo?.roles?.includes('admin'),
);
const period = ref<'month' | 'today'>('month');
const { data, loading, failed, load } = useResource((signal) =>
  getCompanyOverviewApi(signal, period.value),
);
const Calendar = createIconifyIcon('lucide:calendar-days');
const Orders = createIconifyIcon('lucide:clipboard-list');
const Trophy = createIconifyIcon('lucide:trophy');
function records(status?: string, event?: string) {
  void router.push({
    path: '/m/orders',
    query: { onlySelf: 'true', period: period.value, status, event },
  });
}
watch(period, load);
onMounted(load);
</script>
<template>
  <div class="m-row mb-3">
    <div>
      <h2 class="m-title">{{ users.userInfo?.realName }}，你好</h2>
      <span class="m-muted">我的业绩</span>
    </div>
    <Segmented
      v-model:value="period"
      :options="[
        { label: '本月', value: 'month' },
        { label: '今日', value: 'today' },
      ]"
    />
  </div>
  <State :loading="loading" :failed="failed" @retry="load">
    <template v-if="data">
      <section class="m-block">
        <div class="m-grid">
          <button class="m-metric" @click="records(undefined, 'paid')">
            <span>实收金额（元）</span><strong class="m-primary">{{
              money(data.personal.collectedCent).replace('¥', '')
            }}</strong>
          </button>
          <button class="m-metric" @click="records(undefined, 'paid')">
            <span>成交订单</span><strong>{{ count(data.personal.paidOrders)
              }}<small class="m-muted"> 人</small></strong>
          </button>
          <button
            class="m-metric"
            @click="records('registered', 'registrations')"
          >
            <span>成功报名</span><strong>{{ count(data.personal.registrations)
              }}<small class="m-muted"> 人</small></strong>
          </button>
          <RouterLink class="m-metric" to="/m/activities?status=running">
            <span>参与中的活动</span><strong>{{ count(data.joinedRunningActivities)
              }}<small class="m-muted"> 场</small></strong>
          </RouterLink>
        </div>
      </section>
      <section class="m-block">
        <div class="m-section-head m-row">
          <h3 class="m-title">待跟进</h3>
          <span class="m-muted">{{ period === 'month' ? '本月' : '今日' }}新增</span>
        </div>
        <div class="m-grid">
          <button class="m-metric" @click="records('pending')">
            <span>待报名</span><strong>{{
              count(data.personal.pendingRegistration)
            }}</strong>
</button><button class="m-metric" @click="records('pending_payment')">
            <span>待支付</span><strong>{{ count(data.personal.pendingPayment) }}</strong>
          </button>
        </div>
      </section>
    </template>
  </State>
  <div v-if="manager" class="m-toolbar">
    <RouterLink
      class="ant-btn ant-btn-primary"
      :to="{ path: '/activities', query: { create: '1' } }"
      >
创建活动
</RouterLink>
  </div>
  <section class="m-block m-quick">
    <RouterLink to="/m/activities"><Calendar />我的活动</RouterLink><RouterLink to="/m/orders"><Orders />报名记录</RouterLink><RouterLink to="/m/rankings"><Trophy />本月排行榜</RouterLink>
  </section>
  <div class="m-row m-muted">
    <span v-if="data">{{ dateTime(data.generatedAt) }} 更新</span><Button type="link" :loading="loading" @click="load">刷新</Button>
  </div>
</template>
