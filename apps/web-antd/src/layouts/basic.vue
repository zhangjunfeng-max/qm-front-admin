<script lang="ts" setup>
import type { NotificationItem } from '@vben/layouts';

import { computed, onBeforeUnmount, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';

import { AuthenticationLoginExpiredModal } from '@vben/common-ui';
import { useWatermark } from '@vben/hooks';
import {
  BasicLayout,
  LockScreen,
  Notification,
  UserDropdown,
} from '@vben/layouts';
import { preferences, usePreferences } from '@vben/preferences';
import { useAccessStore, useUserStore } from '@vben/stores';

import { Alert, Button, message, Modal } from 'ant-design-vue';

import TenantSwitcher from '#/components/tenant/tenant-switcher.vue';
import { useAuthStore } from '#/store';
import { useNotificationStore } from '#/store/notifications';
import LoginForm from '#/views/_core/authentication/login.vue';

const notices = useNotificationStore();
const notifications = computed<NotificationItem[]>(() =>
  notices.items.map((item) => ({
    ...item,
    avatar: '',
    date: new Date(item.createdAt).toLocaleString('zh-CN'),
  })),
);
onMounted(() => notices.start());
onBeforeUnmount(() => notices.stop());

const router = useRouter();
const userStore = useUserStore();
const authStore = useAuthStore();
const accessStore = useAccessStore();
const { destroyWatermark, updateWatermark } = useWatermark();
const { isDark } = usePreferences();
const showDot = computed(() => notices.unreadCount > 0);

const menus = computed(() => [
  {
    handler: () => router.push('/account'),
    icon: 'lucide:user',
    text: '当前账号',
  },
]);

const avatar = computed(() => {
  return userStore.userInfo?.avatar ?? preferences.app.defaultAvatar;
});

async function handleLogout() {
  await authStore.logout(false);
}

async function noticeAction(action: () => Promise<unknown>) {
  try {
    await action();
  } catch {
    message.error('操作失败，请重试');
  }
}
function handleClick(item: NotificationItem) {
  if (item.id)
    void noticeAction(() =>
      notices.activate(String(item.id), (link) => router.push(link)),
    );
}

watch(
  () => ({
    enable: preferences.app.watermark,
    content: preferences.app.watermarkContent,
    isDark: isDark.value,
  }),
  async ({ enable, content, isDark: isDarkValue }) => {
    if (enable) {
      const watermarkColor = isDarkValue
        ? 'rgba(255, 255, 255, 0.12)'
        : 'rgba(0, 0, 0, 0.12)';

      await updateWatermark({
        advancedStyle: {
          colorStops: [
            {
              color: watermarkColor,
              offset: 0,
            },
            {
              color: watermarkColor,
              offset: 1,
            },
          ],
          type: 'linear',
        },
        content:
          content ||
          `${userStore.userInfo?.username} - ${userStore.userInfo?.realName}`,
      });
    } else {
      destroyWatermark();
    }
  },
  {
    immediate: true,
  },
);
</script>

<template>
  <BasicLayout
    :avatar
    :text="userStore.userInfo?.realName"
    @clear-preferences-and-logout="handleLogout"
    @logout="handleLogout"
  >
    <template #header-left-10><TenantSwitcher /></template>
    <template #user-dropdown>
      <UserDropdown
        :avatar
        :menus
        :text="userStore.userInfo?.realName"
        :description="userStore.userInfo?.username"
        :tag-text="
          authStore.profile?.isPlatformAdmin
            ? '平台管理员'
            : userStore.userInfo?.roles?.includes('owner')
              ? '所有者'
              : userStore.userInfo?.roles?.includes('admin')
                ? '管理员'
                : '成员'
        "
        @clear-preferences-and-logout="handleLogout"
        @logout="handleLogout"
      />
    </template>
    <template #notification>
      <Notification
        :dot="showDot"
        :notifications="notifications"
        @clear="noticeAction(notices.clear)"
        @read="
          (item) => item.id && noticeAction(() => notices.read(String(item.id)))
        "
        @remove="
          (item) =>
            item.id && noticeAction(() => notices.remove(String(item.id)))
        "
        @make-all="noticeAction(notices.readAll)"
        @on-click="handleClick"
        @view-all="router.push('/notifications')"
        @open-change="(open) => open && notices.refresh()"
      >
        <template #content="{ item }">
          <div class="min-w-0 flex-1 pr-12">
            <p class="truncate font-semibold">{{ item.title }}</p>
            <p
              class="my-2 line-clamp-2 whitespace-pre-wrap break-words text-xs text-muted-foreground"
            >
              {{ item.message }}
            </p>
            <p class="text-xs text-muted-foreground">{{ item.date }}</p>
            <span
              v-if="!item.isRead"
              class="absolute right-2 top-2 size-2 rounded-full bg-primary"
            ></span>
          </div>
          <Button
            size="small"
            class="absolute right-3 top-1/2"
            @click.stop="
              noticeAction(() =>
                item.isRead
                  ? notices.remove(String(item.id))
                  : notices.read(String(item.id)),
              )
            "
          >
            {{ item.isRead ? '删除' : '已读' }}
          </Button>
        </template>
      </Notification>
    </template>
    <template #extra>
      <Modal
        :open="!!notices.selected"
        :title="notices.selected?.title"
        :footer="null"
        @cancel="notices.selected = undefined"
      >
        <p class="mb-4 text-xs text-muted-foreground">
          {{
            notices.selected &&
              new Date(notices.selected.createdAt).toLocaleString('zh-CN')
          }}
        </p>
        <p class="whitespace-pre-wrap break-words">
          {{ notices.selected?.message }}
        </p>
      </Modal>
      <Alert
        v-if="notices.failed"
        message="通知加载失败"
        type="error"
        closable
        class="fixed bottom-4 right-4 z-50"
      >
        <template #action>
          <Button size="small" @click="notices.refresh">重试</Button>
        </template>
      </Alert>
      <AuthenticationLoginExpiredModal
        v-model:open="accessStore.loginExpired"
        :avatar
      >
        <LoginForm />
      </AuthenticationLoginExpiredModal>
    </template>
    <template #lock-screen>
      <LockScreen :avatar @to-login="handleLogout" />
    </template>
  </BasicLayout>
</template>
