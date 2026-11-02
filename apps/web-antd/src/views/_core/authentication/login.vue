<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';
import type { Recordable } from '@vben/types';

import { AuthenticationLogin, z } from '@vben/common-ui';

import { Button, Spin } from 'ant-design-vue';

import TenantList from '#/components/tenant/tenant-list.vue';
import { useAuthStore } from '#/store';

const authStore = useAuthStore();
const formSchema: VbenFormSchema[] = [
  {
    component: 'VbenInput',
    componentProps: {
      placeholder: '请输入登录手机号',
      autocomplete: 'username',
      type: 'tel',
      inputmode: 'tel',
      maxlength: 11,
    },
    fieldName: 'phone',
    label: '手机号',
    rules: z
      .string()
      .trim()
      .regex(/^1[3-9]\d{9}$/, '请输入正确的 11 位手机号'),
  },
  {
    component: 'VbenInputPassword',
    componentProps: {
      placeholder: '请输入密码',
      autocomplete: 'current-password',
    },
    fieldName: 'password',
    label: '密码',
    rules: z.string().min(8, '密码至少 8 个字符').max(128),
  },
];

async function handleSubmit(values: Recordable<unknown>) {
  if (typeof values.phone !== 'string' || typeof values.password !== 'string')
    return;
  try {
    await authStore.authLogin({
      phone: values.phone,
      password: values.password,
    });
  } catch {
    /* The auth store displays the server's login error. */
  }
}
async function enterTenant(id: string) {
  try {
    await authStore.selectTenant(id);
  } catch {
    /* The store displays the error. */
  }
}
</script>

<template>
  <section
    v-if="authStore.tenantSelection"
    class="mx-auto w-full max-w-md py-6"
  >
    <h1 class="mb-3 text-3xl font-bold">选择公司</h1>
    <p class="text-muted-foreground mb-8">请选择本次要进入的公司</p>
    <div class="bg-card rounded-xl border shadow-sm">
      <div class="flex items-center justify-between gap-3 border-b px-6 py-5">
        <span class="truncate text-lg font-medium">
          {{
            authStore.tenantSelection.user.displayName ||
            authStore.tenantSelection.user.phone
          }}
        </span>
        <Button
          type="link"
          :disabled="authStore.loginLoading"
          @click="authStore.cancelSelection"
        >
          更换账号
        </Button>
      </div>
      <Spin :spinning="authStore.loginLoading">
        <div class="p-4">
          <TenantList
            :items="authStore.tenantSelection.tenants"
            :disabled="authStore.loginLoading"
            @select="enterTenant"
          />
        </div>
      </Spin>
    </div>
    <p class="text-muted-foreground mt-4 text-sm">
      仅展示当前账号已加入且可用的公司
    </p>
  </section>
  <AuthenticationLogin
    v-else
    :form-schema="formSchema"
    :loading="authStore.loginLoading"
    :show-code-login="false"
    :show-forget-password="false"
    :show-qrcode-login="false"
    :show-register="false"
    :show-remember-me="false"
    :show-third-party-login="false"
    title="登录管理后台"
    sub-title="使用手机号和密码登录"
    @submit="handleSubmit"
  />
</template>
