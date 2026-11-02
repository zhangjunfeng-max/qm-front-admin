<script setup lang="ts">
import { Page } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import { Alert, Card, Descriptions, DescriptionsItem } from 'ant-design-vue';

import { useAuthStore } from '#/store';
const authStore = useAuthStore();
const userStore = useUserStore();
</script>

<template>
  <Page title="当前账号">
    <Card>
      <Descriptions :column="1">
        <DescriptionsItem label="姓名">
          {{ userStore.userInfo?.realName }}
        </DescriptionsItem>
        <DescriptionsItem label="账号">
          {{ userStore.userInfo?.username }}
        </DescriptionsItem>
        <DescriptionsItem label="当前公司">
          {{ authStore.currentTenant?.name || '平台管理（尚未选择公司）' }}
        </DescriptionsItem>
      </Descriptions>
      <Alert
        v-if="userStore.userInfo?.roles?.includes('member')"
        class="mt-4"
        type="info"
        show-icon
        message="当前为普通成员账号，公司信息与成员列表需由公司所有者或管理员查看。"
      />
    </Card>
  </Page>
</template>
