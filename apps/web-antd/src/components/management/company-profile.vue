<script setup lang="ts">
import type { CompanyInput } from '#/api/management';

import { onMounted, reactive, ref } from 'vue';

import {
  Alert,
  Button,
  Card,
  Form,
  FormItem,
  Input,
  message,
  Spin,
} from 'ant-design-vue';

import { getCompany, saveCompany } from '#/api/management';
const failed = ref(false);
const loading = ref(false);
const saving = ref(false);
const form = reactive<CompanyInput>({
  name: '',
  contactName: '',
  contactPhone: '',
  industry: '',
  address: '',
  remark: '',
});
async function load() {
  if (loading.value || saving.value) return;
  loading.value = true;
  failed.value = false;
  try {
    const value = await getCompany();
    for (const k of Object.keys(form) as (keyof CompanyInput)[])
      form[k] = value[k];
  } catch {
    failed.value = true;
  } finally {
    loading.value = false;
  }
}
async function save() {
  if (saving.value || loading.value || failed.value) return;
  if (!form.name.trim()) {
    message.warning('请输入公司名称');
    return;
  }
  saving.value = true;
  try {
    await saveCompany({ ...form });
    message.success('公司资料已保存');
  } catch {
  } finally {
    saving.value = false;
  }
}
onMounted(load);
</script>
<template>
  <Card title="公司资料" class="max-w-4xl">
    <template #extra>
      <Button :loading="loading" :disabled="saving" @click="load">刷新</Button>
    </template>
    <Spin :spinning="loading">
      <Alert v-if="failed" type="error" message="公司资料加载失败">
        <template #action>
          <Button @click="load">重试</Button>
        </template>
      </Alert>
      <Form v-else layout="vertical" :disabled="saving || loading">
        <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <FormItem label="公司名称" required>
            <Input v-model:value="form.name" :maxlength="160" />
          </FormItem>
          <FormItem label="联系人">
            <Input v-model:value="form.contactName" :maxlength="80" />
          </FormItem>
          <FormItem label="联系电话">
            <Input v-model:value="form.contactPhone" :maxlength="32" />
          </FormItem>
          <FormItem label="所属行业">
            <Input v-model:value="form.industry" :maxlength="80" />
          </FormItem>
        </div>
        <FormItem label="公司地址">
          <Input v-model:value="form.address" :maxlength="300" />
        </FormItem>
        <FormItem label="备注">
          <Input.TextArea
            v-model:value="form.remark"
            :maxlength="1000"
            :rows="3"
          />
        </FormItem>
        <Button type="primary" :loading="saving" @click="save">
          保存资料
        </Button>
      </Form>
    </Spin>
  </Card>
</template>
