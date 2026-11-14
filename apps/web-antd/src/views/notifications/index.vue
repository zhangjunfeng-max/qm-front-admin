<script setup lang="ts">
import type { Announcement, Notice } from '#/api/notifications';

import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import {
  Alert,
  Button,
  Form,
  Input,
  message,
  Modal,
  Pagination,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';

import ListShell from '#/components/management/list-shell.vue';
import { useNotificationStore } from '#/store/notifications';

const center = useNotificationStore();
const router = useRouter();
const items = ref<Notice[]>([]);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const status = ref<'all' | 'unread'>('all');
const loading = ref(false);
const failed = ref(false);
const publishing = ref(false);
const sendOpen = ref(false);
const formError = ref('');
const draft = reactive({
  title: '',
  message: '',
  audience: 'all' as Announcement['audience'],
  roles: [] as NonNullable<Announcement['roles']>,
  recipients: [] as string[],
});
let requestId = '';
let attemptedBody = '';
let listVersion = 0;
let recipientVersion = 0;
let searchTimer: ReturnType<typeof setTimeout> | undefined;
const recipientPage = ref(1);
const recipientKeyword = ref('');
const recipientTotal = ref(0);
const recipientLoading = ref(false);
const recipientFailed = ref(false);
const recipientOptions = ref<{ label: string; value: string }[]>([]);
const selectedLabels = new Map<string, string>();
const platform = computed(() => center.scope === 'platform');
const roleOptions = [
  { label: '管理员', value: 'admin' },
  { label: '成员', value: 'member' },
];
const columns = [
  { title: '通知标题', dataIndex: 'title', ellipsis: true },
  { title: '内容', dataIndex: 'message', ellipsis: true },
  { title: '状态', key: 'status', width: 90 },
  { title: '时间', key: 'createdAt', width: 180 },
  { title: '操作', key: 'actions', width: 190 },
];
async function load() {
  const current = ++listVersion;
  const context = center.contextVersion;
  loading.value = true;
  failed.value = false;
  try {
    const result = await center.list({
      page: page.value,
      pageSize: pageSize.value,
      status: status.value,
    });
    if (!result || current !== listVersion || context !== center.contextVersion)
      return;
    if (result.total > 0 && (page.value - 1) * pageSize.value >= result.total) {
      page.value = Math.ceil(result.total / pageSize.value);
      void load();
      return;
    }
    items.value = result.items;
    total.value = result.total;
  } catch {
    if (current === listVersion && context === center.contextVersion)
      failed.value = true;
  } finally {
    if (current === listVersion && context === center.contextVersion)
      loading.value = false;
  }
}
function change(next: number, size: number) {
  page.value = size === pageSize.value ? next : 1;
  pageSize.value = size;
  void load();
}
function filter(value: 'all' | 'unread') {
  status.value = value;
  page.value = 1;
  void load();
}
async function action(operation: () => Promise<unknown>) {
  try {
    await operation();
  } catch {
    message.error('操作失败，请重试');
  }
}
function show(id: string) {
  void action(() => center.activate(id, (link) => router.push(link)));
}
function resetDraft() {
  draft.title = '';
  draft.message = '';
  draft.audience = 'all';
  draft.roles = [];
  draft.recipients = [];
  requestId = '';
  attemptedBody = '';
  formError.value = '';
  selectedLabels.clear();
  recipientOptions.value = [];
  recipientKeyword.value = '';
  recipientPage.value = 1;
  recipientTotal.value = 0;
}
async function loadRecipients() {
  if (!sendOpen.value || !center.canPublish) return;
  const current = ++recipientVersion;
  const context = center.contextVersion;
  recipientLoading.value = true;
  recipientFailed.value = false;
  try {
    const result = await center.recipients({
      keyword: recipientKeyword.value,
      page: recipientPage.value,
      pageSize: 20,
    });
    if (
      !result ||
      current !== recipientVersion ||
      context !== center.contextVersion ||
      !sendOpen.value
    )
      return;
    for (const item of result.items) selectedLabels.set(item.id, item.name);
    const currentItems = result.items.map((item) => ({
      value: item.id,
      label: item.name,
    }));
    const ids = new Set(currentItems.map((item) => item.value));
    recipientOptions.value = [
      ...draft.recipients
        .filter((id) => !ids.has(id))
        .map((id) => ({
          value: id,
          label: selectedLabels.get(id) || '已选择',
        })),
      ...currentItems,
    ];
    recipientTotal.value = result.total;
  } catch {
    if (current === recipientVersion && context === center.contextVersion)
      recipientFailed.value = true;
  } finally {
    if (current === recipientVersion && context === center.contextVersion)
      recipientLoading.value = false;
  }
}
function searchRecipients(keyword: string) {
  clearTimeout(searchTimer);
  ++recipientVersion;
  recipientKeyword.value = keyword;
  recipientPage.value = 1;
  searchTimer = setTimeout(() => void loadRecipients(), 250);
}
function openSend() {
  sendOpen.value = true;
  if (platform.value || draft.audience === 'users') void loadRecipients();
}
function closeSend() {
  if (publishing.value) return;
  sendOpen.value = false;
  ++recipientVersion;
  clearTimeout(searchTimer);
}
async function send() {
  if (publishing.value) return;
  const title = draft.title.trim();
  const body = draft.message.trim();
  formError.value = '';
  if (!title || !body) {
    formError.value = '请填写标题和内容';
    return;
  }
  if ([...title].length > 80 || [...body].length > 2000) {
    formError.value = '标题最多80字，内容最多2000字';
    return;
  }
  if (
    !platform.value &&
    draft.audience === 'roles' &&
    draft.roles.length === 0
  ) {
    formError.value = '请选择接收角色';
    return;
  }
  const needsRecipients = platform.value || draft.audience === 'users';
  const limit = platform.value ? 100 : 1000;
  if (
    needsRecipients &&
    (!draft.recipients.length || draft.recipients.length > limit)
  ) {
    formError.value = `请选择1至${limit}${platform.value ? '家公司' : '名员工'}`;
    return;
  }
  const payload: Omit<Announcement, 'requestId'> = {
    title,
    message: body,
    audience: platform.value ? 'all' : draft.audience,
  };
  if (platform.value) payload.companyIds = [...draft.recipients];
  else if (draft.audience === 'roles') payload.roles = [...draft.roles];
  else if (draft.audience === 'users') payload.userIds = [...draft.recipients];
  const fingerprint = JSON.stringify(payload);
  if (!requestId || attemptedBody !== fingerprint) {
    requestId = crypto.randomUUID();
    attemptedBody = fingerprint;
  }
  publishing.value = true;
  const context = center.contextVersion;
  try {
    const result = await center.publish({ ...payload, requestId });
    if (!result || context !== center.contextVersion) return;
    message.success(`已发送给${result.recipients}人`);
    sendOpen.value = false;
    resetDraft();
  } catch {
    if (context === center.contextVersion) formError.value = '发送失败，请重试';
  } finally {
    if (context === center.contextVersion) publishing.value = false;
  }
}
watch(
  () => draft.audience,
  (value) => {
    draft.recipients = [];
    draft.roles = [];
    if (value === 'users') void loadRecipients();
  },
);
watch(
  () => center.revision,
  () => void load(),
);
watch(
  () => center.contextVersion,
  () => {
    ++listVersion;
    ++recipientVersion;
    clearTimeout(searchTimer);
    items.value = [];
    total.value = 0;
    page.value = 1;
    failed.value = false;
    loading.value = false;
    sendOpen.value = false;
    publishing.value = false;
    recipientLoading.value = false;
    resetDraft();
    if (center.scope) void load();
  },
  { flush: 'sync' },
);
onBeforeUnmount(() => {
  ++listVersion;
  ++recipientVersion;
  clearTimeout(searchTimer);
});
void load();
</script>

<template>
  <ListShell
    title="通知中心"
    v-bind="{ loading, failed, page, pageSize, total }"
    @reload="load"
    @change="change"
  >
    <template #extra>
      <Button v-if="center.canPublish" type="primary" @click="openSend">
        发布公告
      </Button>
    </template>
    <template #filters>
      <Button
        :type="status === 'all' ? 'primary' : 'default'"
        @click="filter('all')"
      >
        全部
      </Button>
      <Button
        :type="status === 'unread' ? 'primary' : 'default'"
        @click="filter('unread')"
      >
        未读
      </Button>
      <span class="text-muted-foreground">{{ center.unreadCount }} 条未读</span>
      <Button :disabled="!center.unreadCount" @click="action(center.readAll)">
        全部已读
      </Button>
      <Popconfirm title="确认清空全部通知？" @confirm="action(center.clear)">
        <Button :disabled="!total" danger>清空通知</Button>
      </Popconfirm>
    </template>
    <Table
      :data-source="items"
      :columns="columns"
      row-key="id"
      :pagination="false"
      :loading="loading"
      :scroll="{ x: 850 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <Tag :color="record.isRead ? undefined : 'blue'">
            {{ record.isRead ? '已读' : '未读' }}
          </Tag>
        </template>
        <template v-else-if="column.key === 'createdAt'">
          {{ new Date(record.createdAt).toLocaleString('zh-CN') }}
        </template>
        <template v-else-if="column.key === 'actions'">
          <Space>
            <Button
              type="link"
              size="small"
              :loading="center.openingId === record.id"
              @click="show(record.id)"
            >
              查看
            </Button>
            <Button
              v-if="!record.isRead"
              type="link"
              size="small"
              @click="action(() => center.read(record.id))"
            >
              已读
            </Button>
            <Popconfirm
              title="确认删除这条通知？"
              @confirm="action(() => center.remove(record.id))"
            >
              <Button type="link" size="small" danger>删除</Button>
            </Popconfirm>
          </Space>
        </template>
      </template>
    </Table>
    <template #dialogs>
      <Modal
        :open="sendOpen"
        title="发布公告"
        :confirm-loading="publishing"
        :mask-closable="false"
        :closable="!publishing"
        :cancel-button-props="{ disabled: publishing }"
        ok-text="发送"
        destroy-on-close
        @ok="send"
        @cancel="closeSend"
      >
        <Form layout="vertical" :disabled="publishing">
          <Form.Item label="标题" required>
            <Input
              id="notice-title"
              v-model:value="draft.title"
              :maxlength="80"
              placeholder="请输入公告标题"
            />
          </Form.Item>
          <Form.Item label="内容" required>
            <Input.TextArea
              id="notice-message"
              v-model:value="draft.message"
              :rows="6"
              :maxlength="2000"
              show-count
              placeholder="请输入公告内容"
            />
          </Form.Item>
          <Form.Item v-if="!platform" label="接收范围" required>
            <Select
              v-model:value="draft.audience"
              :options="[
                { label: '全体员工', value: 'all' },
                { label: '指定角色', value: 'roles' },
                { label: '指定员工', value: 'users' },
              ]"
            />
          </Form.Item>
          <Form.Item
            v-if="!platform && draft.audience === 'roles'"
            label="接收角色"
            required
          >
            <Select
              v-model:value="draft.roles"
              mode="multiple"
              :options="roleOptions"
              placeholder="请选择角色"
            />
          </Form.Item>
          <Form.Item
            v-if="platform || draft.audience === 'users'"
            :label="platform ? '接收公司' : '接收员工'"
            required
            :extra="
              platform
                ? '发送给所选公司的全体有效员工，最多100家公司'
                : '最多选择1000名员工'
            "
          >
            <Select
              v-model:value="draft.recipients"
              mode="multiple"
              show-search
              :filter-option="false"
              :options="recipientOptions"
              :loading="recipientLoading"
              :max-tag-count="3"
              :placeholder="platform ? '搜索并选择公司' : '搜索并选择员工'"
              @search="searchRecipients"
            >
              <template #dropdownRender="{ menuNode }">
                <component :is="menuNode" />
                <div class="border-t border-border p-2" @mousedown.prevent>
                  <Pagination
                    :current="recipientPage"
                    :total="recipientTotal"
                    :page-size="20"
                    size="small"
                    simple
                    @change="
                      (value) => {
                        recipientPage = value;
                        loadRecipients();
                      }
                    "
                  />
                  <Button
                    v-if="recipientFailed"
                    type="link"
                    size="small"
                    @click="loadRecipients"
                  >
                    加载失败，重试
                  </Button>
                </div>
              </template>
            </Select>
          </Form.Item>
          <Alert v-if="formError" :message="formError" type="error" show-icon />
        </Form>
      </Modal>
    </template>
  </ListShell>
</template>
