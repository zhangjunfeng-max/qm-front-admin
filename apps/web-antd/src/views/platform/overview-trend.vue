<script setup lang="ts">
import type { EchartsUIType } from '@vben/plugins/echarts';

import type { OverviewDay } from '#/api/platform-overview';

import { onMounted, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

const props = defineProps<{ items: OverviewDay[] }>();
const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);
function render() {
  void renderEcharts({
    animation: false,
    grid: { top: 45, right: 16, bottom: 12, left: 8, containLabel: true },
    legend: { data: ['新增活动', '新增公司'], right: 8, top: 0 },
    tooltip: { trigger: 'axis', confine: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: props.items.map((item) => item.date.slice(5)),
    },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      {
        name: '新增活动',
        type: 'line',
        color: '#1677ff',
        symbolSize: 5,
        data: props.items.map((item) => item.newActivities),
      },
      {
        name: '新增公司',
        type: 'line',
        color: '#16a34a',
        symbolSize: 5,
        data: props.items.map((item) => item.newCompanies),
      },
    ],
  });
}
watch(() => props.items, render, { flush: 'post' });
onMounted(render);
</script>

<template>
  <EchartsUI ref="chartRef" class="h-[240px] w-full" />
</template>
