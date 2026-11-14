<script setup lang="ts">
import type { FormInstance, TableColumnsType, UploadProps } from 'ant-design-vue';

import type { PlatformApi } from '#/api/platform';

import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Alert,
  Button,
  Card,
  Checkbox,
  Drawer,
  Form,
  FormItem,
  Input,
  message,
  Pagination,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Upload,
} from 'ant-design-vue';

import {
  bindPlatformPaymentAccountApi,
  createPlatformPaymentAccountApi,
  getPlatformPaymentAccountApi,
  getPlatformPaymentAccountsApi,
  getPlatformPaymentMiniappsApi,
  getPlatformTenantsApi,
  unbindPlatformPaymentAccountApi,
  updatePlatformPaymentAccountApi,
} from '#/api/platform';

const route = useRoute();
const tableRegion = ref<HTMLElement>();
const items = ref<PlatformApi.PaymentAccount[]>([]);
const tenants = ref<PlatformApi.Tenant[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const tenantId = ref(
  typeof route.query.tenantId === 'string' ? route.query.tenantId : undefined,
);
const provider = ref<PlatformApi.PaymentProvider>();
const status = ref<'active' | 'disabled'>();
const loading = ref(false);
const failed = ref(false);
let requestVersion = 0;

const accountOpen = ref(false);
const accountSaving = ref(false);
const accountId = ref('');
const privateKeyName = ref('');
const publicKeyName = ref('');
const accountFormRef = ref<FormInstance>();

function emptyAccount(): PlatformApi.PaymentAccountInput {
  return {
    provider: 'wechat',
    accountName: '',
    externalAccountId: '',
    callbackKey: '',
    capabilities: ['wechat_jsapi', 'wechat_miniapp'],
    apiV3Key: '',
    merchantPrivateKey: '',
    merchantSerialNumber: '',
    wechatPayPublicKey: '',
    wechatPayPublicKeyId: '',
    status: 'active',
    version: 0,
  };
}

const accountForm = reactive<PlatformApi.PaymentAccountInput>(emptyAccount());
const bindingOpen = ref(false);
const bindingSaving = ref(false);
const bindingAccount = ref<PlatformApi.PaymentAccount>();
const bindingTenantId = ref<string>();
const bindingMiniapps = ref<PlatformApi.MiniappOption[]>([]);
const bindingForm = reactive<PlatformApi.PaymentBindingInput>({
  tenantAlias: '',
  isDefault: false,
  status: 'active',
  enableJsapi: true,
  miniappIds: [],
});

const providerLabels: Record<PlatformApi.PaymentProvider, string> = {
  aggregate: '聚合支付',
  alipay: '支付宝',
  wechat: '微信支付',
};
const tenantOptions = computed(() =>
  tenants.value.map((tenant) => ({ label: tenant.name, value: tenant.id })),
);
const miniappOptions = computed(() =>
  bindingMiniapps.value.map((item) => ({
    disabled:
      item.status !== 'active' || item.authorizationStatus !== 'authorized',
    label: `${item.name} · ${item.appid}`,
    value: item.id,
  })),
);

const columns: TableColumnsType<PlatformApi.PaymentAccount> = [
  {
    title: '支付账户',
    key: 'account',
    width: 220,
    fixed: 'left',
    ellipsis: true,
  },
  { title: '服务商', key: 'provider', width: 110 },
  { title: '账户标识', key: 'externalAccountId', width: 160 },
  { title: '支持能力', key: 'capabilities', width: 210 },
  { title: '绑定公司', key: 'bindings', width: 280 },
  { title: '状态', key: 'status', width: 90 },
  { title: '更新时间', key: 'updatedAt', width: 180 },
  { title: '操作', key: 'actions', width: 220, fixed: 'right' },
];

const pagination = computed(() => ({
  current: page.value,
  pageSize: pageSize.value,
  total: total.value,
  showSizeChanger: true,
  showTotal: (count: number) => `共 ${count} 个支付账户`,
}));

async function load() {
  const version = ++requestVersion;
  loading.value = true;
  failed.value = false;
  try {
    const result = await getPlatformPaymentAccountsApi({
      page: page.value,
      pageSize: pageSize.value,
      provider: provider.value,
      status: status.value,
      tenantId: tenantId.value,
    });
    if (version !== requestVersion) return;
    items.value = result.items;
    total.value = result.total;
  } catch {
    if (version === requestVersion) failed.value = true;
  } finally {
    if (version === requestVersion) loading.value = false;
  }
}

async function loadTenants() {
  try {
    const result = await getPlatformTenantsApi({ page: 1, pageSize: 100 });
    tenants.value = result.items;
  } catch {
    tenants.value = [];
  }
}

function search() {
  page.value = 1;
  void load();
}

function changePage(current: number, nextSize: number) {
  page.value = nextSize === pageSize.value ? current : 1;
  pageSize.value = nextSize;
  void load();
}

function openCreate() {
  accountId.value = '';
  Object.assign(accountForm, emptyAccount());
  privateKeyName.value = '';
  publicKeyName.value = '';
  accountOpen.value = true;
}

async function openEdit(account: PlatformApi.PaymentAccount) {
  const value = await getPlatformPaymentAccountApi(account.id);
  accountId.value = value.id;
  Object.assign(accountForm, {
    provider: value.provider,
    accountName: value.accountName,
    externalAccountId: value.externalAccountId,
    callbackKey: value.callbackKey,
    capabilities: value.capabilities,
    apiV3Key: '',
    merchantPrivateKey: '',
    merchantSerialNumber: value.merchantSerialNumber,
    wechatPayPublicKey: '',
    wechatPayPublicKeyId: value.callbackKey,
    status: value.status,
    version: value.version,
  });
  privateKeyName.value = value.hasPrivateKey ? '已配置，留空不修改' : '';
  publicKeyName.value = value.hasWechatPayPublicKey
    ? '已配置，留空不修改'
    : '';
  accountOpen.value = true;
}

function selectPem(
  target: 'merchantPrivateKey' | 'wechatPayPublicKey',
): UploadProps['beforeUpload'] {
  return async (file) => {
    if (!/\.pem$/i.test(file.name) || file.size > 64 * 1024) {
      message.error('请选择不超过 64KB 的 PEM 文件');
      return Upload.LIST_IGNORE;
    }
    accountForm[target] = await file.text();
    if (target === 'merchantPrivateKey') privateKeyName.value = file.name;
    else publicKeyName.value = file.name;
    return Upload.LIST_IGNORE;
  };
}

async function saveAccount() {
  await accountFormRef.value?.validate();
  if (
    accountForm.provider === 'wechat' &&
    accountForm.callbackKey !== accountForm.wechatPayPublicKeyId
  ) {
    message.error('回调键必须与微信支付公钥 ID 一致');
    return;
  }
  accountSaving.value = true;
  try {
    const saved = accountId.value
      ? await updatePlatformPaymentAccountApi(accountId.value, {
          ...accountForm,
        })
      : await createPlatformPaymentAccountApi({ ...accountForm });
    message.success(accountId.value ? '支付账户已更新' : '支付账户已创建');
    accountOpen.value = false;
    await load();
    if (!accountId.value) openBinding(saved);
  } catch (error) {
    if (error instanceof Error) message.error(error.message);
  } finally {
    accountSaving.value = false;
  }
}

function openBinding(account: PlatformApi.PaymentAccount) {
  bindingAccount.value = account;
  const preferred =
    account.bindings.find((item) => item.tenantId === tenantId.value) ??
    account.bindings[0];
  bindingTenantId.value = preferred?.tenantId ?? tenantId.value;
  bindingForm.tenantAlias = preferred?.tenantAlias || '';
  bindingForm.isDefault = preferred?.isDefault || false;
  bindingForm.status = preferred?.status || 'active';
  bindingForm.enableJsapi = preferred?.enableJsapi ?? true;
  bindingForm.miniappIds = [...(preferred?.miniappIds || [])];
  bindingOpen.value = true;
  if (bindingTenantId.value) void loadBindingMiniapps();
}

async function loadBindingMiniapps() {
  if (!bindingTenantId.value) {
    bindingMiniapps.value = [];
    return;
  }
  try {
    const result = await getPlatformPaymentMiniappsApi(bindingTenantId.value);
    bindingMiniapps.value = result.items;
  } catch {
    bindingMiniapps.value = [];
  }
}

function chooseBindingTenant(value: unknown) {
  const tenant = String(value ?? '');
  if (!tenant) return;
  const binding = bindingAccount.value?.bindings.find(
    (item) => item.tenantId === tenant,
  );
  bindingTenantId.value = tenant;
  bindingForm.tenantAlias = binding?.tenantAlias || '';
  bindingForm.isDefault = binding?.isDefault || false;
  bindingForm.status = binding?.status || 'active';
  bindingForm.enableJsapi = binding?.enableJsapi ?? true;
  bindingForm.miniappIds = [...(binding?.miniappIds || [])];
  void loadBindingMiniapps();
}

async function saveBinding() {
  if (!bindingAccount.value || !bindingTenantId.value) {
    message.error('请选择公司');
    return;
  }
  bindingSaving.value = true;
  try {
    await bindPlatformPaymentAccountApi(
      bindingAccount.value.id,
      bindingTenantId.value,
      { ...bindingForm },
    );
    message.success('公司支付授权已保存');
    await load();
    bindingOpen.value = false;
  } catch (error) {
    if (error instanceof Error) message.error(error.message);
  } finally {
    bindingSaving.value = false;
  }
}

async function unbind(tenant: string) {
  if (!bindingAccount.value) return;
  try {
    await unbindPlatformPaymentAccountApi(bindingAccount.value.id, tenant);
    message.success('公司授权已解除');
    const value = await getPlatformPaymentAccountApi(bindingAccount.value.id);
    bindingAccount.value = value;
    if (bindingTenantId.value === tenant) {
      bindingTenantId.value = undefined;
      bindingMiniapps.value = [];
    }
    await load();
  } catch (error) {
    if (error instanceof Error) message.error(error.message);
  }
}

watch(bindingTenantId, loadBindingMiniapps);
onMounted(async () => {
  await Promise.all([loadTenants(), load()]);
});
</script>

<template>
  <Page
    title="支付配置"
    description="平台统一维护支付账户，并将账户授权给一个或多个公司"
    auto-content-height
    content-class="flex flex-col gap-4"
  >
    <template #extra>
      <Button type="primary" @click="openCreate">新增支付账户</Button>
      <Button :loading="loading" @click="load">刷新</Button>
    </template>
    <Alert
      v-if="failed"
      class="shrink-0"
      type="error"
      show-icon
      message="支付账户加载失败"
    >
      <template #action
        ><Button size="small" @click="load">重试</Button></template
      >
    </Alert>
    <Card
      class="flex min-h-[480px] flex-1 flex-col"
      :body-style="{
        display: 'flex',
        flexDirection: 'column',
        flex: '1',
        minHeight: 0,
      }"
    >
      <div class="mb-4 flex shrink-0 flex-wrap gap-3">
        <Select
          v-model:value="tenantId"
          :options="tenantOptions"
          allow-clear
          show-search
          option-filter-prop="label"
          placeholder="全部公司"
          class="w-56"
          @change="search"
        />
        <Select
          v-model:value="provider"
          :options="[
            { label: '微信支付', value: 'wechat' },
            { label: '支付宝', value: 'alipay' },
            { label: '聚合支付', value: 'aggregate' },
          ]"
          allow-clear
          placeholder="全部服务商"
          class="w-40"
          @change="search"
        />
        <Select
          v-model:value="status"
          :options="[
            { label: '启用', value: 'active' },
            { label: '停用', value: 'disabled' },
          ]"
          allow-clear
          placeholder="全部状态"
          class="w-36"
          @change="search"
        />
      </div>
      <div ref="tableRegion" class="min-h-0 flex-1 overflow-auto">
        <Table
          :columns="columns"
          :data-source="items"
          :loading="loading"
          :pagination="false"
          :scroll="{ x: 1450 }"
          :sticky="{ getContainer: () => tableRegion! }"
          row-key="id"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'account'">
              <div class="font-medium">{{ record.accountName }}</div>
              <div class="text-xs text-muted-foreground">
                {{ record.callbackKey }}
              </div>
            </template>
            <template v-else-if="column.key === 'provider'">
              {{ providerLabels[record.provider as PlatformApi.PaymentProvider] }}
            </template>
            <template v-else-if="column.key === 'externalAccountId'">
              {{ record.maskedAccount }}
            </template>
            <template v-else-if="column.key === 'capabilities'">
              <Space :size="[4, 4]" wrap>
                <Tag v-for="item in record.capabilities" :key="item">
                  {{ item }}
                </Tag>
              </Space>
            </template>
            <template v-else-if="column.key === 'bindings'">
              <Space :size="[4, 4]" wrap>
                <Tag
                  v-for="binding in record.bindings"
                  :key="binding.tenantId"
                  :color="binding.isDefault ? 'blue' : undefined"
                >
                  {{ binding.tenantAlias || binding.tenantName
                  }}{{ binding.isDefault ? ' · 默认' : '' }}
                </Tag>
                <span v-if="record.bindings.length === 0">未授权公司</span>
              </Space>
            </template>
            <Tag
              v-else-if="column.key === 'status'"
              :color="record.status === 'active' ? 'success' : 'default'"
            >
              {{ record.status === 'active' ? '启用' : '停用' }}
            </Tag>
            <template v-else-if="column.key === 'updatedAt'">
              {{ new Date(record.updatedAt).toLocaleString() }}
            </template>
            <Space v-else-if="column.key === 'actions'" :size="0">
              <Button
                type="link"
                size="small"
                @click="openEdit(record as PlatformApi.PaymentAccount)"
              >
                编辑
              </Button>
              <Button
                type="link"
                size="small"
                @click="openBinding(record as PlatformApi.PaymentAccount)"
              >
                公司授权
              </Button>
            </Space>
          </template>
        </Table>
      </div>
      <div class="mt-4 flex shrink-0 justify-end border-t border-border pt-4">
        <Pagination v-bind="pagination" responsive @change="changePage" />
      </div>
    </Card>

    <Drawer
      :open="accountOpen"
      :title="accountId ? '编辑支付账户' : '新增支付账户'"
      width="min(760px, 100vw)"
      :destroy-on-close="true"
      @close="accountOpen = false"
    >
      <Alert
        class="mb-4"
        type="info"
        show-icon
        message="支付账户可以授权给多个公司；密钥只保存在服务端，接口不会回显。"
      />
      <Form
        ref="accountFormRef"
        :model="accountForm"
        layout="vertical"
      >
        <div class="grid grid-cols-1 gap-x-4 md:grid-cols-2">
          <FormItem
            label="服务商"
            name="provider"
            :rules="[{ required: true, message: '请选择服务商' }]"
          >
            <Select
              v-model:value="accountForm.provider"
              :options="[
                { label: '微信支付', value: 'wechat' },
                { label: '支付宝（待接入）', value: 'alipay', disabled: true },
                {
                  label: '聚合支付（待接入）',
                  value: 'aggregate',
                  disabled: true,
                },
              ]"
            />
          </FormItem>
          <FormItem
            label="账户名称"
            name="accountName"
            :rules="[{ required: true, message: '请输入账户名称' }]"
          >
            <Input v-model:value="accountForm.accountName" :maxlength="120" />
          </FormItem>
          <FormItem
            label="微信商户号"
            name="externalAccountId"
            :rules="[
              {
                required: true,
                pattern: /^[0-9]{8,32}$/,
                message: '请输入正确商户号',
              },
            ]"
          >
            <Input
              v-model:value="accountForm.externalAccountId"
              :maxlength="32"
            />
          </FormItem>
          <FormItem
            label="微信支付公钥 ID"
            name="callbackKey"
            :rules="[{ required: true, message: '请输入微信支付公钥 ID' }]"
          >
            <Input
              v-model:value="accountForm.callbackKey"
              :maxlength="64"
              @change="accountForm.wechatPayPublicKeyId = accountForm.callbackKey"
            />
          </FormItem>
          <FormItem
            label="商户 API 证书序列号"
            name="merchantSerialNumber"
            :rules="[
              {
                required: true,
                pattern: /^[0-9A-Fa-f]{40}$/,
                message: '请输入 40 位证书序列号',
              },
            ]"
          >
            <Input
              v-model:value="accountForm.merchantSerialNumber"
              :maxlength="40"
            />
          </FormItem>
          <FormItem label="APIv3 密钥" name="apiV3Key">
            <Input.Password
              v-model:value="accountForm.apiV3Key"
              :placeholder="
                accountId ? '已配置时留空，不修改' : '请输入 32 位 APIv3 密钥'
              "
              :maxlength="32"
            />
          </FormItem>
        </div>
        <FormItem label="商户 API 私钥">
          <Upload
            accept=".pem"
            :before-upload="selectPem('merchantPrivateKey')"
            :show-upload-list="false"
          >
            <Button>{{ privateKeyName || '选择 PEM 文件' }}</Button>
          </Upload>
        </FormItem>
        <FormItem label="微信支付公钥">
          <Upload
            accept=".pem"
            :before-upload="selectPem('wechatPayPublicKey')"
            :show-upload-list="false"
          >
            <Button>{{ publicKeyName || '选择 PEM 文件' }}</Button>
          </Upload>
        </FormItem>
        <FormItem label="状态">
          <Switch
            :checked="accountForm.status === 'active'"
            checked-children="启用"
            un-checked-children="停用"
            @change="
              (checked) =>
                (accountForm.status = checked ? 'active' : 'disabled')
            "
          />
        </FormItem>
      </Form>
      <template #footer>
        <Space>
          <Button @click="accountOpen = false">取消</Button>
          <Button type="primary" :loading="accountSaving" @click="saveAccount">
            保存
          </Button>
        </Space>
      </template>
    </Drawer>

    <Drawer
      :open="bindingOpen"
      title="公司支付授权"
      width="min(760px, 100vw)"
      :destroy-on-close="true"
      @close="bindingOpen = false"
    >
      <Alert
        class="mb-4"
        type="info"
        show-icon
        message="同一个支付账户可以授权给多个公司。每家公司可以单独设置别名、默认账户和小程序。"
      />
      <div class="mb-5">
        <div class="mb-2 text-sm font-medium">已授权公司</div>
        <Space v-if="bindingAccount?.bindings.length" direction="vertical">
          <div
            v-for="binding in bindingAccount.bindings"
            :key="binding.tenantId"
            class="flex items-center gap-2"
          >
            <Tag :color="binding.isDefault ? 'blue' : undefined">
              {{ binding.tenantName
              }}{{ binding.isDefault ? ' · 默认' : '' }}
            </Tag>
            <Button
              type="link"
              size="small"
              @click="chooseBindingTenant(binding.tenantId)"
            >
              编辑
            </Button>
            <Button
              danger
              type="link"
              size="small"
              @click="unbind(binding.tenantId)"
            >
              解除
            </Button>
          </div>
        </Space>
        <div v-else class="text-sm text-muted-foreground">尚未授权公司</div>
      </div>
      <Form layout="vertical">
        <FormItem label="授权公司" required>
          <Select
            :value="bindingTenantId"
            :options="tenantOptions"
            show-search
            option-filter-prop="label"
            placeholder="选择公司"
            @change="chooseBindingTenant"
          />
        </FormItem>
        <FormItem label="公司内显示名称">
          <Input
            v-model:value="bindingForm.tenantAlias"
            :maxlength="120"
            placeholder="例如：摄影主收款账户"
          />
        </FormItem>
        <FormItem label="支持的支付渠道">
          <Space direction="vertical">
            <Checkbox v-model:checked="bindingForm.enableJsapi">
              微信公众号 H5 支付
            </Checkbox>
            <Select
              v-model:value="bindingForm.miniappIds"
              mode="multiple"
              :options="miniappOptions"
              option-filter-prop="label"
              placeholder="选择该账户支持的小程序"
              class="w-full min-w-80"
            />
          </Space>
        </FormItem>
        <FormItem label="公司默认账户">
          <Switch v-model:checked="bindingForm.isDefault" />
        </FormItem>
        <FormItem label="授权状态">
          <Switch
            :checked="bindingForm.status === 'active'"
            checked-children="启用"
            un-checked-children="停用"
            @change="
              (checked) =>
                (bindingForm.status = checked ? 'active' : 'disabled')
            "
          />
        </FormItem>
      </Form>
      <template #footer>
        <Space>
          <Button @click="bindingOpen = false">取消</Button>
          <Button type="primary" :loading="bindingSaving" @click="saveBinding">
            保存授权
          </Button>
        </Space>
      </template>
    </Drawer>
  </Page>
</template>
