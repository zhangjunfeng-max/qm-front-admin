<script setup lang="ts">
import type { FormInstance } from 'ant-design-vue';

import type { PlatformApi } from '#/api/platform';

import { computed, reactive, ref, watch } from 'vue';

import {
  Alert,
  Button,
  Descriptions,
  DescriptionsItem,
  Drawer,
  Empty,
  Form,
  FormItem,
  Input,
  InputPassword,
  message,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
} from 'ant-design-vue';

import {
  createPlatformUserApi,
  getPlatformUserApi,
  updatePlatformUserApi,
} from '#/api/platform';
import { useAuthStore } from '#/store';

const props = defineProps<{
  open: boolean;
  userId: string;
  editing: boolean;
}>();
const emit = defineEmits<{ close: []; saved: [] }>();
const auth = useAuthStore();
const record = ref<null | PlatformApi.UserDetail>(null);
const loading = ref(false);
const failed = ref(false);
const saving = ref(false);
const formRef = ref<FormInstance>();
const form = reactive<PlatformApi.UserCreate>({
  displayName: '',
  phone: '',
  password: '',
  status: 'active',
  isPlatformAdmin: false,
});
const creating = computed(() => !props.userId);
const self = computed(
  () => !!props.userId && props.userId === auth.profile?.id,
);
const roleNames = { admin: '公司管理员', member: '员工' };
const companyColumns = [
  { title: '公司名称', dataIndex: 'name', ellipsis: true },
  { title: '员工姓名', dataIndex: 'employeeName', ellipsis: true },
  { title: '公司角色', key: 'role', width: 120 },
  { title: '员工状态', key: 'status', width: 100 },
];
let version = 0;
async function load() {
  const current = ++version;
  record.value = null;
  failed.value = false;
  formRef.value?.clearValidate();
  Object.assign(form, {
    displayName: '',
    phone: '',
    password: '',
    status: 'active',
    isPlatformAdmin: false,
  });
  if (creating.value) {
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    const result = await getPlatformUserApi(props.userId);
    if (current !== version) return;
    record.value = result;
    Object.assign(form, {
      displayName: result.displayName,
      phone: result.phone,
      status: result.status,
      isPlatformAdmin: result.isPlatformAdmin,
    });
  } catch {
    if (current === version) failed.value = true;
  } finally {
    if (current === version) loading.value = false;
  }
}
watch(
  () => [props.open, props.userId, props.editing],
  () => {
    if (props.open) void load();
    else {
      ++version;
      form.password = '';
    }
  },
  { immediate: true },
);
async function save() {
  if (saving.value || loading.value || failed.value) return;
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }
  saving.value = true;
  try {
    const data = {
      displayName: form.displayName.trim(),
      status: form.status,
      isPlatformAdmin: form.isPlatformAdmin,
    };
    if (creating.value)
      await createPlatformUserApi({
        ...data,
        phone: form.phone.trim(),
        password: form.password,
      });
    else await updatePlatformUserApi(props.userId, data);
    form.password = '';
    message.success(creating.value ? '用户已创建' : '用户资料已保存');
    emit('saved');
    emit('close');
    if (self.value) await auth.fetchUserInfo();
  } catch {
    /* API client displays the server error. */
  } finally {
    saving.value = false;
  }
}
</script>
<template>
  <Drawer
    :open="open"
    :title="creating ? '新增用户' : editing ? '编辑用户' : '用户详情'"
    width="min(720px,100vw)"
    :closable="!saving"
    :mask-closable="!saving"
    :keyboard="!saving"
    @close="emit('close')"
  >
    <Spin :spinning="loading">
      <Alert v-if="failed" message="用户资料加载失败" type="error" show-icon>
        <template #action><Button @click="load">重试</Button></template>
      </Alert>
      <template v-else-if="!loading">
        <Form
          v-if="editing"
          ref="formRef"
          :model="form"
          layout="vertical"
          :disabled="saving"
          @finish="save"
        >
          <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <FormItem
              label="用户姓名"
              name="displayName"
              :rules="[
                { required: true, whitespace: true, message: '请输入用户姓名' },
                { max: 120, message: '最多120个字' },
              ]"
            >
              <Input v-model:value="form.displayName" :maxlength="120" />
            </FormItem>
            <FormItem
              label="手机号"
              name="phone"
              :rules="[
                {
                  required: true,
                  pattern: /^1[3-9]\d{9}$/,
                  message: '请输入有效手机号',
                },
              ]"
            >
              <Input
                v-model:value="form.phone"
                :disabled="!creating"
                :maxlength="11"
                autocomplete="off"
              />
            </FormItem>
            <FormItem
              v-if="creating"
              label="初始密码"
              name="password"
              :rules="[
                {
                  required: true,
                  min: 8,
                  max: 128,
                  message: '请输入8至128位密码',
                },
              ]"
            >
              <InputPassword
                v-model:value="form.password"
                :maxlength="128"
                autocomplete="new-password"
              />
            </FormItem>
            <FormItem
              label="账号状态"
              name="status"
              tooltip="禁用账号后，该用户将无法在任何公司登录；仅停用某家公司的员工请到员工管理操作。"
            >
              <Select
                v-model:value="form.status"
                :disabled="self"
                :options="[
                  { label: '正常', value: 'active' },
                  { label: '已禁用', value: 'disabled' },
                ]"
              />
            </FormItem>
            <FormItem
              label="平台管理员"
              name="isPlatformAdmin"
              tooltip="可管理全平台用户与公司，并切换所有公司；进入后仅查看当前公司的业务数据。"
            >
              <Switch
                v-model:checked="form.isPlatformAdmin"
                :disabled="self"
                checked-children="是"
                un-checked-children="否"
              />
            </FormItem>
          </div>
        </Form>
        <Descriptions v-else-if="record" :column="2" size="small" bordered>
          <DescriptionsItem label="用户姓名">
            {{ record.displayName }}
          </DescriptionsItem>
          <DescriptionsItem label="手机号">{{ record.phone }}</DescriptionsItem>
          <DescriptionsItem label="平台身份">
            {{ record.isPlatformAdmin ? '平台管理员' : '普通用户' }}
          </DescriptionsItem>
          <DescriptionsItem label="账号状态">
            <Tag :color="record.status === 'active' ? 'success' : 'default'">
              {{ record.status === 'active' ? '正常' : '已禁用' }}
            </Tag>
          </DescriptionsItem>
          <DescriptionsItem label="最近登录" :span="2">
            {{
              record.lastLoginAt
                ? new Date(record.lastLoginAt).toLocaleString()
                : '尚未登录'
            }}
          </DescriptionsItem>
        </Descriptions>
        <template v-if="record">
          <h3 class="mb-3 mt-6 font-medium">加入的公司</h3>
          <Table
            row-key="tenantId"
            :columns="companyColumns"
            :data-source="record.companies"
            :pagination="false"
            size="small"
            :scroll="{ x: 580 }"
          >
            <template #bodyCell="{ column, record: company }">
              <template v-if="column.key === 'role'">
                {{ roleNames[company.role as PlatformApi.UserCompany['role']] }}
              </template>
              <Tag
                v-else-if="column.key === 'status'"
                :color="company.status === 'active' ? 'success' : 'default'"
              >
                {{ company.status === 'active' ? '正常' : '已停用' }}
              </Tag>
              <template v-else-if="column.dataIndex === 'name'">
                {{ company.name
                }}<Tag v-if="company.tenantStatus === 'disabled'">
                  公司已停用
                </Tag>
              </template>
            </template>
            <template #emptyText>
              <Empty description="尚未加入任何公司" />
            </template>
          </Table>
        </template>
      </template>
    </Spin>
    <template #footer>
      <Space class="flex justify-end">
        <Button :disabled="saving" @click="emit('close')">
          {{ editing ? '取消' : '关闭' }}
        </Button>
        <Button
          v-if="editing"
          type="primary"
          :loading="saving"
          :disabled="loading || failed"
          @click="save"
        >
          保存用户
        </Button>
      </Space>
    </template>
  </Drawer>
</template>
