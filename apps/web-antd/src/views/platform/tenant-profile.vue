<script setup lang="ts">
import type { FormInstance } from 'ant-design-vue';

import type { PlatformApi, TenantUpdate } from '#/api/platform';

import { reactive, ref, watch } from 'vue';

import {
  Alert,
  Button,
  DatePicker,
  Descriptions,
  DescriptionsItem,
  Drawer,
  Form,
  FormItem,
  Input,
  message,
  Select,
  Space,
  Spin,
} from 'ant-design-vue';

import { getPlatformTenantApi, updatePlatformTenantApi } from '#/api/platform';
const props = defineProps<{
  open: boolean;
  tenantId: string;
  editing: boolean;
}>();
const emit = defineEmits<{ close: []; saved: [] }>();
const InputTextArea = Input.TextArea;
const record = ref<null | PlatformApi.Tenant>(null);
const loading = ref(false);
const failed = ref(false);
const saving = ref(false);
const formRef = ref<FormInstance>();
const form = reactive<TenantUpdate>({
  name: '',
  contactName: '',
  contactPhone: '',
  industry: '',
  address: '',
  expiresAt: null,
  remark: '',
  status: 'active',
});
let version = 0;
async function load() {
  const current = ++version;
  loading.value = true;
  failed.value = false;
  record.value = null;
  try {
    const result = await getPlatformTenantApi(props.tenantId);
    if (current !== version) return;
    record.value = result;
    Object.assign(form, {
      name: result.name,
      contactName: result.contactName,
      contactPhone: result.contactPhone,
      industry: result.industry,
      address: result.address,
      expiresAt: result.expiresAt,
      remark: result.remark,
      status: result.status,
    });
    formRef.value?.clearValidate();
  } catch {
    if (current === version) failed.value = true;
  } finally {
    if (current === version) loading.value = false;
  }
}
watch(
  () => [props.open, props.tenantId, props.editing],
  () => {
    if (props.open) void load();
    else ++version;
  },
  { immediate: true },
);
async function save() {
  if (saving.value || !record.value) return;
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }
  saving.value = true;
  try {
    await updatePlatformTenantApi(record.value.id, {
      ...form,
      expiresAt: form.expiresAt || null,
    });
    message.success('公司资料已保存');
    emit('saved');
    emit('close');
  } catch {
    /* The API client displays the server error. */
  } finally {
    saving.value = false;
  }
}
function displayDate(value: null | string) {
  return value ? new Date(value).toLocaleString() : '不限期';
}
</script>
<template>
  <Drawer
    :open="open"
    :title="editing ? '编辑公司资料' : '公司详情'"
    width="min(680px, 100vw)"
    :closable="!saving"
    :mask-closable="!saving"
    :keyboard="!saving"
    @close="emit('close')"
  >
    <Spin :spinning="loading">
      <Alert v-if="failed" type="error" message="公司资料加载失败" show-icon>
        <template #action><Button @click="load">重试</Button></template>
      </Alert>
      <Form
        v-else-if="editing && record"
        ref="formRef"
        :model="form"
        layout="vertical"
        :disabled="saving"
        @finish="save"
      >
        <FormItem
          label="公司名称"
          name="name"
          :rules="[
            { required: true, whitespace: true, message: '请输入公司名称' },
            { max: 160, message: '最多160个字符' },
          ]"
        >
          <Input v-model:value="form.name" :maxlength="160" />
        </FormItem>
        <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <FormItem label="联系人" name="contactName">
            <Input v-model:value="form.contactName" :maxlength="80" />
          </FormItem>
          <FormItem
            label="联系电话"
            name="contactPhone"
            :rules="[
              {
                pattern: /^[0-9+()\-\s]{0,32}$/,
                message: '请输入有效的联系电话',
              },
            ]"
          >
            <Input
              v-model:value="form.contactPhone"
              :maxlength="32"
              placeholder="手机号或固定电话"
            />
          </FormItem>
        </div>
        <FormItem label="所属行业" name="industry">
          <Input
            v-model:value="form.industry"
            :maxlength="80"
            placeholder="例如：摄影服务"
          />
        </FormItem>
        <FormItem label="公司地址" name="address">
          <Input v-model:value="form.address" :maxlength="300" />
        </FormItem>
        <FormItem label="服务到期时间" name="expiresAt">
          <DatePicker
            :value="form.expiresAt || undefined"
            @update:value="
              (value: unknown) =>
                (form.expiresAt = typeof value === 'string' ? value : null)
            "
            value-format="YYYY-MM-DDTHH:mm:ssZ"
            format="YYYY-MM-DD HH:mm"
            show-time
            allow-clear
            class="w-full"
            placeholder="留空表示不限期"
          />
        </FormItem>
        <FormItem label="公司状态" name="status">
          <Select
            v-model:value="form.status"
            :options="[
              { label: '正常', value: 'active' },
              { label: '已禁用', value: 'disabled' },
            ]"
          />
        </FormItem>
        <FormItem label="备注" name="remark">
          <InputTextArea
            v-model:value="form.remark"
            :maxlength="1000"
            :rows="4"
            show-count
          />
        </FormItem>
      </Form>
      <Descriptions v-else-if="record" bordered :column="1">
        <DescriptionsItem label="公司名称">{{ record.name }}</DescriptionsItem>
        <DescriptionsItem label="联系人">
          {{ record.contactName || '未设置' }}
        </DescriptionsItem>
        <DescriptionsItem label="联系电话">
          {{ record.contactPhone || '未设置' }}
        </DescriptionsItem>
        <DescriptionsItem label="所属行业">
          {{ record.industry || '未设置' }}
        </DescriptionsItem>
        <DescriptionsItem label="公司地址">
          {{ record.address || '未设置' }}
        </DescriptionsItem>
        <DescriptionsItem label="有效成员数">
          {{ record.memberCount }}
        </DescriptionsItem>
        <DescriptionsItem label="公司状态">
          {{ record.status === 'active' ? '正常' : '已禁用' }}
        </DescriptionsItem>
        <DescriptionsItem label="服务到期时间">
          {{ displayDate(record.expiresAt) }}
        </DescriptionsItem>
        <DescriptionsItem label="创建时间">
          {{ displayDate(record.createdAt) }}
        </DescriptionsItem>
        <DescriptionsItem label="更新时间">
          {{ displayDate(record.updatedAt) }}
        </DescriptionsItem>
        <DescriptionsItem label="备注">
          <span class="whitespace-pre-wrap break-words">
            {{ record.remark || '未设置' }}
          </span>
        </DescriptionsItem>
      </Descriptions>
    </Spin>
    <template #footer>
      <div class="flex justify-end">
        <Space>
          <Button :disabled="saving" @click="emit('close')">
            {{ editing ? '取消' : '关闭' }}
          </Button>
          <Button
            v-if="editing"
            type="primary"
            :loading="saving"
            :disabled="loading || failed || !record"
            @click="save"
          >
            保存
          </Button>
        </Space>
      </div>
    </template>
  </Drawer>
</template>
