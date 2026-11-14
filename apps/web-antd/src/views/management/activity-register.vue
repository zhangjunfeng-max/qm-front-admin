<script setup lang="ts">
import type { Invitation } from '#/api/management';

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
import IcpFooter from '#/components/icp-footer.vue';
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
  role: 'member' as const,
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
  saving.value = true;
  try {
    await registerForActivity({
      token,
      ...form,
      groupId: form.groupId,
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
  <main class="invitation-page bg-background-deep">
    <Card class="invitation-card" title="员工加入活动">
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
          message="邀请不可用或加载失败，请联系公司管理员"
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
          <p class="mb-4 break-words text-muted-foreground">
            申请加入 {{ info.tenantName }} · {{ info.activityName }}
          </p>
          <FormItem label="姓名" required>
            <Input
              v-model:value="form.displayName"
              :maxlength="120"
              autocomplete="name"
              placeholder="请输入姓名"
            />
          </FormItem>
          <FormItem label="手机号" required>
            <Input
              v-model:value="form.phone"
              :maxlength="11"
              type="tel"
              inputmode="numeric"
              autocomplete="tel"
              placeholder="请输入手机号"
            />
          </FormItem>
          <FormItem label="登录密码" required>
            <InputPassword
              v-model:value="form.password"
              autocomplete="current-password"
              placeholder="请输入登录密码"
            />
            <p class="mt-1 text-xs text-muted-foreground">
              已有账号请输入原密码；新账号请设置登录密码。
            </p>
          </FormItem>
          <FormItem label="所属小组">
            <Select
              :value="form.groupId || undefined"
              placeholder="请选择所属小组（选填）"
              @update:value="
                form.groupId = typeof $event === 'string' ? $event : null
              "
              allow-clear
              :options="
                info.groups.map((g) => ({ label: g.name, value: g.id }))
              "
              @clear="form.groupId = null"
            />
          </FormItem>
          <Alert class="mb-4" type="info" message="提交后由公司管理员审核。" />
          <Button type="primary" block html-type="submit" :loading="saving">
            确认并提交申请
          </Button>
        </Form>
      </Spin>
    </Card>
    <IcpFooter />
  </main>
</template>

<style scoped>
.invitation-page {
  min-height: 100vh;
  min-height: 100dvh;
  padding: max(20px, env(safe-area-inset-top))
    max(16px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom))
    max(16px, env(safe-area-inset-left));
}

.invitation-card {
  width: 100%;
  max-width: 480px;
  margin: 24px auto;
  border-radius: 8px;
}

.invitation-card :deep(.ant-card-head) {
  min-height: 52px;
}

.invitation-card :deep(.ant-form-item) {
  margin-bottom: 18px;
}

.invitation-card :deep(.ant-alert) {
  margin-bottom: 16px;
}

.invitation-card :deep(.ant-form-item-label) {
  padding-bottom: 6px;
}

.invitation-card :deep(.ant-input),
.invitation-card :deep(.ant-select-selector),
.invitation-card :deep(.ant-input-affix-wrapper) {
  font-size: 16px;
}

.invitation-card :deep(.ant-input:not(.ant-input-affix-wrapper input)),
.invitation-card :deep(.ant-input-affix-wrapper),
.invitation-card :deep(.ant-select-selector),
.invitation-card :deep(.ant-btn) {
  min-height: 44px;
}

.invitation-card :deep(.ant-select-single) {
  height: 44px;
}

@media (max-width: 575px) {
  .invitation-card {
    margin: 0 auto;
  }

  .invitation-card :deep(.ant-card-body),
  .invitation-card :deep(.ant-card-head) {
    padding-right: 18px;
    padding-left: 18px;
  }

  .invitation-card :deep(.ant-result) {
    padding: 20px 0;
  }
}
</style>
