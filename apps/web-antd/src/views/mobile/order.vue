<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';

import { getRegistration } from '#/api/customer-management';

import { dateTime, dial, money, statusLabel } from './format';
import State from './state.vue';
import { useResource } from './use-resource';
const route = useRoute();
const { data, loading, failed, load } = useResource((signal) =>
  getRegistration(String(route.params.id), signal),
);
onMounted(load);
</script>
<template>
  <State :loading="loading" :failed="failed" @retry="load">
<template v-if="data">
      <section class="m-block m-pad">
        <div class="m-row mb-2">
          <h2 class="m-title">{{ data.customerName }}</h2>
          <span class="m-badge" :class="data.status.replaceAll('_', '-')">{{
            statusLabel(data)
          }}</span>
        </div>
        <a class="m-phone" :href="dial(data.customerPhone)">{{ data.customerPhone }} · 拨打</a>
        <dl class="m-dl">
          <div>
            <dt>活动</dt>
            <dd>{{ data.activityName }}</dd>
          </div>
          <div>
            <dt>销售</dt>
            <dd>
              {{ data.salesName || '未归属'
              }}<a
                v-if="data.salesPhone"
                :href="dial(data.salesPhone)"
                class="ml-2"
                >联系销售</a>
            </dd>
          </div>
          <div v-if="data.storeName">
            <dt>参与门店</dt>
            <dd>{{ data.storeName }}</dd>
          </div>
          <div v-if="data.orderNo">
            <dt>报名编号</dt>
            <dd>{{ data.orderNo }}</dd>
          </div>
          <div v-if="data.participation !== 'free' && data.orderId">
            <dt>参与金额</dt>
            <dd>{{ money(data.amountCent) }}</dd>
          </div>
          <div>
            <dt>报名时间</dt>
            <dd>
              {{
                data.registeredAt ? dateTime(data.registeredAt) : '尚未完成报名'
              }}
            </dd>
          </div>
          <div v-if="data.orderCreatedAt">
            <dt>提交时间</dt>
            <dd>{{ dateTime(data.orderCreatedAt) }}</dd>
          </div>
          <div>
            <dt>填写时间</dt>
            <dd>{{ dateTime(data.createdAt) }}</dd>
          </div>
        </dl>
      </section>
      <section class="m-block m-pad">
        <h3 class="m-title mb-2">填写信息</h3>
        <dl v-if="data.answers.length" class="m-dl">
          <div v-for="answer in data.answers" :key="answer.key">
            <dt>{{ answer.label }}</dt>
            <dd>{{ answer.value || '—' }}</dd>
          </div>
        </dl>
        <p v-else class="m-muted">暂无其他填写信息</p>
      </section>
      <section
        v-if="data.orderId && data.participation !== 'free'"
        class="m-block m-pad"
      >
        <h3 class="m-title mb-2">支付与退款</h3>
        <dl class="m-dl">
          <div>
            <dt>支付状态</dt>
            <dd>
              {{
                data.paymentInfo?.status === 'success' ? '已支付' : '尚未支付'
              }}
            </dd>
          </div>
          <div v-if="data.paymentInfo?.status === 'success'">
            <dt>实付金额</dt>
            <dd>{{ money(Number(data.paymentInfo.amountCent)) }}</dd>
          </div>
          <div v-if="typeof data.paymentInfo?.paidAt === 'string'">
            <dt>支付时间</dt>
            <dd>{{ dateTime(data.paymentInfo.paidAt) }}</dd>
          </div>
          <div>
            <dt>退款状态</dt>
            <dd>
              {{
                data.refundInfo?.status === 'success' ? '已退款' : '暂无退款'
              }}
            </dd>
          </div>
          <div v-if="data.refundInfo?.status === 'success'">
            <dt>退款金额</dt>
            <dd>{{ money(Number(data.refundInfo.amountCent)) }}</dd>
          </div>
        </dl>
      </section>
    </template>
</State>
</template>
