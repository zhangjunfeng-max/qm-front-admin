<script setup lang="ts">
import type { ActivityRole, Invitation } from '#/api/management';

import { onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  Alert,
  Button,
  Card,
  Form,
  FormItem,
  Input,
  InputPassword,
  message,
  Result,
  Select,
  Spin,
} from 'ant-design-vue';

import { readInvitation, registerForActivity } from '#/api/management';
const route = useRoute();
const router = useRouter();
const token = String(route.query.token || '');
const info = ref<Invitation>();
const done = ref(false);
const failed = ref(false);
const loading = ref(false);
const saving = ref(false);
const form = reactive({
  phone: '',
  displayName: '',
  password: '',
  role: 'member' as ActivityRole,
  groupId: null as null | string,
});
async function load() {
  loading.value = true;
  failed.value = false;
  try {
    info.value = await readInvitation(token);
  } catch {
    failed.value = true;
  } finally {
    loading.value = false;
  }
}
async function submit() {
  if (saving.value) return;
  if (!/^1[3-9]\d{9}$/.test(form.phone.trim()) || !form.displayName.trim()) {
    message.warning('请填写有效手机号和姓名');
    return;
  }
  if (form.role === 'leader' && !form.groupId) {
    message.warning('请选择小组');
    return;
  }
  saving.value = true;
  try {
    await registerForActivity({
      token,
      ...form,
      groupId: form.role === 'admin' ? null : form.groupId,
    });
    done.value = true;
  } catch (error) {
    message.error(
      (error as { response?: { data?: { message?: string } } })?.response?.data
        ?.message ||
        (error instanceof Error ? error.message : '提交失败，请稍后重试'),
    );
  } finally {
    saving.value = false;
  }
}
onMounted(load);
</script>
<template>
  <Card class="mx-auto my-6 w-full max-w-lg" title="员工加入活动">
    <Spin :spinning="loading">
      <Result
        v-if="done"
        status="success"
        title="申请已提交"
        sub-title="请等待管理员审核，通过后可使用手机号和密码登录后台。"
      >
        <template #extra>
          <Button type="primary" @click="router.push('/auth/login')">
            返回登录
          </Button>
        </template>
      </Result>
      <Alert
        v-else-if="failed"
        type="error"
        message="邀请不可用或加载失败，请联系活动管理员"
      >
        <template #action><Button @click="load">重试</Button></template>
      </Alert>
      <Form
        v-else-if="info"
        layout="vertical"
        :model="form"
        :disabled="saving"
        @finish="submit"
      >
        <p class="mb-5 text-muted-foreground">
          申请加入 {{ info.tenantName }} · {{ info.activityName }}
        </p>
        <FormItem label="姓名" required>
          <Input v-model:value="form.displayName" :maxlength="120" />
        </FormItem>
        <FormItem label="手机号" required>
          <Input
            v-model:value="form.phone"
            :maxlength="11"
            autocomplete="username"
          />
        </FormItem>
        <FormItem label="登录密码" required>
          <InputPassword
            v-model:value="form.password"
            autocomplete="current-password"
          />
          <p class="mt-1 text-xs text-muted-foreground">
            已有账号请输入原密码；新账号请设置登录密码。
          </p>
        </FormItem>
        <FormItem label="申请角色">
          <Select
            v-model:value="form.role"
            :options="[
              { label: '组员', value: 'member' },
              { label: '组长', value: 'leader' },
              { label: '活动管理员', value: 'admin' },
            ]"
          />
        </FormItem>
        <FormItem
          v-if="form.role !== 'admin'"
          label="所属小组"
          :required="form.role === 'leader'"
        >
          <Select
            :value="form.groupId || undefined"
            @update:value="
              form.groupId = typeof $event === 'string' ? $event : null
            "
            allow-clear
            :options="info.groups.map((g) => ({ label: g.name, value: g.id }))"
            @clear="form.groupId = null"
          />
        </FormItem>
        <Alert
          class="mb-4"
          type="info"
          message="提交后须经审核；申请角色不会立即授予权限。"
        />
        <Button type="primary" block html-type="submit" :loading="saving">
          确认并提交申请
        </Button>
      </Form>
    </Spin>
  </Card>
</template>
