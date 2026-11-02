<script setup lang="ts">
import type { TenantCreate } from '#/api/platform';

import { reactive, ref, watch } from 'vue';

import {
  Button,
  DatePicker,
  Drawer,
  Form,
  FormItem,
  Input,
  InputPassword,
  message,
  Select,
  Space,
} from 'ant-design-vue';

import { createPlatformTenantApi } from '#/api/platform';
const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: []; saved: [] }>();
const saving = ref(false);
const defaults = (): TenantCreate => ({
  name: '',
  ownerPhone: '',
  ownerName: '',
  ownerPassword: '',
  contactName: '',
  contactPhone: '',
  industry: '',
  address: '',
  expiresAt: null,
  remark: '',
  status: 'active',
});
const form = reactive(defaults());
watch(
  () => props.open,
  (open) => {
    if (open) Object.assign(form, defaults());
  },
);
async function save() {
  if (saving.value) return;
  if (
    !form.name.trim() ||
    !form.ownerName.trim() ||
    !/^1[3-9]\d{9}$/.test(form.ownerPhone)
  ) {
    message.warning('请填写公司名称、所有者姓名和有效手机号');
    return;
  }
  saving.value = true;
  try {
    await createPlatformTenantApi({
      ...form,
      ownerPassword: form.ownerPassword || undefined,
    });
    message.success('公司已创建');
    emit('saved');
    emit('close');
  } catch {
  } finally {
    saving.value = false;
  }
}
</script>
<template>
  <Drawer
    :open="open"
    title="新增公司"
    width="min(680px,100vw)"
    :mask-closable="!saving"
    @close="emit('close')"
  >
    <Form layout="vertical" :disabled="saving">
      <FormItem label="公司名称" required>
        <Input v-model:value="form.name" :maxlength="160" />
      </FormItem>
      <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        <FormItem label="所有者姓名" required>
          <Input v-model:value="form.ownerName" :maxlength="120" />
        </FormItem>
        <FormItem label="所有者手机号" required>
          <Input v-model:value="form.ownerPhone" :maxlength="11" />
        </FormItem>
      </div>
      <FormItem label="所有者初始密码">
        <InputPassword
          v-model:value="form.ownerPassword"
          autocomplete="new-password"
        />
        <p class="mt-1 text-xs text-muted-foreground">
          新账号需设置密码；已有账号复用原密码，不会被重置。
        </p>
      </FormItem>
      <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        <FormItem label="联系人">
          <Input v-model:value="form.contactName" :maxlength="80" />
        </FormItem>
        <FormItem label="联系电话">
          <Input v-model:value="form.contactPhone" :maxlength="32" />
        </FormItem>
      </div>
      <FormItem label="所属行业">
        <Input v-model:value="form.industry" :maxlength="80" />
      </FormItem>
      <FormItem label="地址">
        <Input v-model:value="form.address" :maxlength="300" />
      </FormItem>
      <FormItem label="服务到期时间">
        <DatePicker
          :value="form.expiresAt || undefined"
          value-format="YYYY-MM-DDTHH:mm:ssZ"
          show-time
          class="w-full"
          @update:value="
            form.expiresAt =
              typeof $event === 'string' ? new Date($event).toISOString() : null
          "
        />
      </FormItem>
      <FormItem label="状态">
        <Select
          v-model:value="form.status"
          :options="[
            { label: '正常', value: 'active' },
            { label: '已禁用', value: 'disabled' },
          ]"
        />
      </FormItem>
      <FormItem label="备注">
        <Input.TextArea
          v-model:value="form.remark"
          :rows="3"
          :maxlength="1000"
        />
      </FormItem>
    </Form>
    <template #footer>
      <Space class="float-right">
        <Button @click="emit('close')">取消</Button>
        <Button type="primary" :loading="saving" @click="save">创建公司</Button>
      </Space>
    </template>
  </Drawer>
</template>
