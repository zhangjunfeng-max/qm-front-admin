<script setup lang="ts">
import type { TableColumnsType } from 'ant-design-vue';

import type { CompanyPerformance } from '#/api/company-overview';

import { computed } from 'vue';

import { Card, Empty, Table, Tooltip } from 'ant-design-vue';

import { count, money } from './format';

const props = defineProps<{
  failed: boolean;
  group?: boolean;
  items: CompanyPerformance[];
  loading: boolean;
  title: string;
}>();
const columns = computed<TableColumnsType<CompanyPerformance>>(() => [
  { title: '排名', key: 'rank', width: 56, align: 'center' },
  { title: props.group ? '小组 / 活动' : '员工', key: 'name', ellipsis: true },
  { title: '净收入', key: 'netRevenueCent', width: 115, align: 'right' },
  { title: '成交', key: 'paidOrders', width: 66, align: 'right' },
  { title: '报名', key: 'registrations', width: 66, align: 'right' },
]);
</script>

<template>
  <Card :title="title" size="small" class="min-w-0">
    <div class="min-h-[280px] min-w-0">
      <Table
        :columns="columns"
        :data-source="items"
        :loading="loading"
        :pagination="false"
        :scroll="{ x: 450 }"
        row-key="id"
        size="small"
      >
        <template #emptyText>
          <Empty
            :description="failed ? '加载失败，请重试' : '暂无业绩数据'"
            :image="Empty.PRESENTED_IMAGE_SIMPLE"
          />
        </template>
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'rank'">
            <span
              class="inline-flex size-6 items-center justify-center rounded-md text-xs font-semibold tabular-nums"
              :class="
                index < 3
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground bg-muted'
              "
            >
              {{ index + 1 }}
            </span>
          </template>
          <template v-else-if="column.key === 'name'">
            <Tooltip :title="record.name || '未命名员工'">
              <div class="truncate font-medium">
                {{ record.name || '未命名员工' }}
              </div>
            </Tooltip>
            <Tooltip v-if="group" :title="record.activityName">
              <div class="text-muted-foreground truncate text-xs">
                {{ record.activityName }}
              </div>
            </Tooltip>
          </template>
          <template v-else-if="column.key === 'netRevenueCent'">
            <span class="font-medium tabular-nums">
              {{ money(record.netRevenueCent) }}
            </span>
          </template>
          <template v-else-if="column.key === 'paidOrders'">
            {{ count(record.paidOrders) }}
          </template>
          <template v-else-if="column.key === 'registrations'">
            {{ count(record.registrations) }}
          </template>
        </template>
      </Table>
    </div>
  </Card>
</template>
