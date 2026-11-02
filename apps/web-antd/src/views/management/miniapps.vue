<script setup lang="ts">
import type { Miniapp, MiniappInput } from '#/api/management';

import { computed, reactive, ref } from 'vue';

import {
  Button,
  Drawer,
  Form,
  FormItem,
  Input,
  InputSearch,
  message,
  Select,
  Space,
  Switch,
  Table,
  Tag,
} from 'ant-design-vue';

import { getMiniapps, saveMiniapp } from '#/api/management';
import ListShell from '#/components/management/list-shell.vue';
import { useAuthStore } from '#/store';

import { useList } from './use-list';
const auth = useAuthStore();
const canMaintain = computed(() => !!auth.profile?.isPlatformAdmin);
const {
  items,
  total,
  page,
  pageSize,
  keyword,
  status,
  loading,
  failed,
  load,
  search,
  change,
} = useList(getMiniapps);
const editingId = ref('');
const open = ref(false);
const saving = ref(false);
const authorizationLabels = {
  pending: '待授权',
  authorized: '已授权',
  unauthorized: '已取消授权',
};
const form = reactive<MiniappInput>({
  name: '',
  appid: '',
  principalName: '',
  status: 'active',
  authorizationStatus: 'pending',
  remark: '',
});
function edit(app?: Miniapp) {
  if (!canMaintain.value) return;
  editingId.value = app?.id || '';
  Object.assign(form, {
    name: app?.name || '',
    appid: app?.appid || '',
    principalName: app?.principalName || '',
    status: app?.status || 'active',
    authorizationStatus: app?.authorizationStatus || 'pending',
    remark: app?.remark || '',
  });
  open.value = true;
}
async function save() {
  if (saving.value || !canMaintain.value) return;
  if (!form.name.trim()) {
    message.warning('请填写小程序名称');
    return;
  }
  if (!/^wx[0-9a-f]{16}$/.test(form.appid.trim())) {
    message.warning('请填写有效的微信小程序 AppID');
    return;
  }
  saving.value = true;
  try {
    await saveMiniapp(editingId.value, { ...form, appid: form.appid.trim() });
    message.success('小程序已保存');
    open.value = false;
    await load();
  } catch {
  } finally {
    saving.value = false;
  }
}
const columns = computed(() => [
  { title: '小程序名称', dataIndex: 'name', ellipsis: true },
  { title: 'AppID', dataIndex: 'appid', width: 205 },
  { title: '主体名称', dataIndex: 'principalName', ellipsis: true },
  { title: '授权状态', key: 'authorizationStatus', width: 120 },
  { title: '状态', key: 'status', width: 90 },
  { title: '更新时间', key: 'updatedAt', width: 180 },
  ...(canMaintain.value ? [{ title: '操作', key: 'actions', width: 80 }] : []),
]);
</script>
<template>
  <ListShell
    title="小程序"
    description="活动可选择当前公司的一个小程序"
    v-bind="{ loading, failed, page, pageSize, total }"
    @reload="load"
    @change="change"
  >
    <template #extra>
      <Button v-if="canMaintain" type="primary" @click="edit()">
        新增小程序
      </Button>
    </template>
    <template #filters>
      <InputSearch
        v-model:value="keyword"
        placeholder="搜索名称、AppID或主体名称"
        allow-clear
        @search="search"
      />
      <Select
        v-model:value="status"
        placeholder="全部状态"
        allow-clear
        :options="[
          { label: '启用', value: 'active' },
          { label: '已停用', value: 'disabled' },
        ]"
        @change="search"
      />
    </template>
    <Table
      row-key="id"
      :columns="columns"
      :data-source="items"
      :loading="loading"
      :pagination="false"
      :scroll="{ x: 1000 }"
    >
      <template #bodyCell="{ column, record }">
        <Tag
          v-if="column.key === 'status'"
          :color="record.status === 'active' ? 'success' : 'default'"
        >
          {{ record.status === 'active' ? '启用' : '已停用' }}
        </Tag>
        <Tag
          v-else-if="column.key === 'authorizationStatus'"
          :color="
            record.authorizationStatus === 'authorized' ? 'success' : 'warning'
          "
        >
          {{
            authorizationLabels[
              record.authorizationStatus as keyof typeof authorizationLabels
            ]
          }}
        </Tag>
        <template v-else-if="column.key === 'updatedAt'">
          {{ new Date(record.updatedAt).toLocaleString() }}
        </template>
        <Button
          v-else-if="column.key === 'actions'"
          type="link"
          @click="edit(record as Miniapp)"
        >
          编辑
        </Button>
      </template>
    </Table>
    <template #dialogs>
      <Drawer
        :open="open"
        :title="editingId ? '编辑小程序' : '新增小程序'"
        width="min(640px,100vw)"
        :mask-closable="!saving"
        :closable="!saving"
        :keyboard="!saving"
        @close="open = false"
      >
        <Form layout="vertical" :disabled="saving" class="miniapp-form">
          <FormItem label="小程序名称" required>
            <Input v-model:value="form.name" :maxlength="160" />
          </FormItem>
          <FormItem
            label="AppID"
            required
            tooltip="填写微信小程序后台的AppID，创建后不可修改。"
          >
            <Input
              v-model:value="form.appid"
              :maxlength="18"
              :disabled="!!editingId"
            />
          </FormItem>
          <FormItem label="主体名称">
            <Input v-model:value="form.principalName" :maxlength="160" />
          </FormItem>
          <FormItem
            label="授权状态"
            tooltip="请根据微信小程序的实际授权情况选择。"
          >
            <Select
              v-model:value="form.authorizationStatus"
              :options="
                Object.entries(authorizationLabels).map(([value, label]) => ({
                  value,
                  label,
                }))
              "
            />
          </FormItem>
          <FormItem label="启用小程序">
            <Switch
              :checked="form.status === 'active'"
              @update:checked="form.status = $event ? 'active' : 'disabled'"
            />
          </FormItem>
          <FormItem label="备注" class="miniapp-field-wide">
            <Input.TextArea
              v-model:value="form.remark"
              :maxlength="1000"
              :auto-size="{ minRows: 2, maxRows: 4 }"
            />
          </FormItem>
        </Form>
        <template #footer>
          <Space class="float-right">
            <Button :disabled="saving" @click="open = false">取消</Button>
            <Button type="primary" :loading="saving" @click="save">
              保存小程序
            </Button>
          </Space>
        </template>
      </Drawer>
    </template>
  </ListShell>
</template>
<style scoped>
.miniapp-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 16px;
}

.miniapp-form :deep(.ant-form-item) {
  min-width: 0;
  margin-bottom: 12px;
}

.miniapp-form :deep(.ant-form-item-label) {
  padding-bottom: 4px;
}

.miniapp-field-wide {
  grid-column: 1/-1;
}

@media (max-width: 599px) {
  .miniapp-form {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
