<script setup lang="ts">
import type {
  Activity,
  ActivityInput,
  PaymentAccountOption,
} from '#/api/management';

import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue';

import {
  Alert,
  Button,
  DatePicker,
  Form,
  FormItem,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Space,
  Spin,
  Switch,
} from 'ant-design-vue';

import {
  amountToCent,
  createActivityInput,
  defaultActivity,
} from '#/api/activity-form';
import { transitionActivity } from '#/api/activity-lifecycle';
import { ActivityMediaUploadError } from '#/api/activity-media';
import {
  activityThemePreset,
  normalizeActivityThemeColor,
} from '#/api/activity-theme';
import { copyActivityInput } from '#/api/activity-workspace';
import { captureContext } from '#/api/context-lifecycle';
import {
  getActivity,
  getActivityPaymentAccounts,
  saveActivity,
} from '#/api/management';
import ActivityAssetUpload from '#/components/management/activity-asset-upload.vue';
import ActivityContactPriority from '#/components/management/activity-contact-priority.vue';
import ActivityEditorShell from '#/components/management/activity-editor-shell.vue';
import ActivityEmployeePicker from '#/components/management/activity-employee-picker.vue';
import ActivityFormFields from '#/components/management/activity-form-fields.vue';
import { useActivityMedia } from '#/components/management/activity-media';
import ActivityMiniappSelect from '#/components/management/activity-miniapp-select.vue';
import ActivityMusicSelect from '#/components/management/activity-music-select.vue';
import ActivityRulesEditor from '#/components/management/activity-rules-editor.vue';
import ActivityStoreSelect from '#/components/management/activity-store-select.vue';
import ActivityThemeSelect from '#/components/management/activity-theme-select.vue';
const props = defineProps<{
  open: boolean;
  activityId: string;
  inline?: boolean;
  copyFrom?: string;
}>();
const emit = defineEmits<{ close: []; saved: [activity: Activity] }>();
const savedId = ref('');
const effectiveId = computed(() => savedId.value || props.activityId);
const selectedEmployeeIds = ref<string[]>([]);
const employeesOpen = ref(false);
const employeesBusy = ref(false);
const storesBusy = ref(false);
const savedSubmissionError = ref('');
const submissionUncertain = ref(false);
const formErrors = reactive<Record<string, string>>({});
async function revealError() {
  await nextTick();
  const target = document.querySelector(
    '.activity-sections .ant-form-item-has-error',
  );
  target?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  target
    ?.querySelector<HTMLElement>('input, textarea, button, [tabindex]')
    ?.focus({ preventScroll: true });
}
function parsePrice(key: string, value: string) {
  try {
    return amountToCent(value);
  } catch (error) {
    formErrors[key] =
      error instanceof Error ? error.message : '请填写正确的价格';
    throw error;
  }
}
const form = reactive<ActivityInput>(defaultActivity());
const assets = useActivityMedia(form, () => effectiveId.value);
const performanceHelp =
  '仅控制当前活动业绩的查看范围，不授予员工管理、审核或角色分配权限。公司管理员可查看本公司全部活动数据。';
function singleAsset(key: 'forwardImageUrl' | 'posterUrl' | 'shareImageUrl') {
  return computed({
    get: () => (form[key] ? [form[key]] : []),
    set: (urls: string[]) => {
      form[key] = urls[0] || '';
    },
  });
}
const posterFiles = singleAsset('posterUrl');
const shareFiles = singleAsset('shareImageUrl');
const forwardFiles = singleAsset('forwardImageUrl');
const detailFiles = computed({
  get: () => form.detailMedia.map((media) => media.url),
  set: (urls: string[]) => {
    form.detailMedia = urls.map((url) => ({
      url,
      type:
        form.detailMedia.find((media) => media.url === url)?.type ??
        (assets.info(url)?.contentType.startsWith('video/')
          ? 'video'
          : 'image'),
    }));
  },
});
const failed = ref(false);
const loading = ref(false);
const saving = ref(false);
const miniappBusy = ref(false);
const miniappFailed = ref(false);
const paymentAccounts = ref<PaymentAccountOption[]>([]);
const paymentStatusLoading = ref(false);
let paymentStatusRequest = 0;
watch(
  () => form.channel,
  (channel) => {
    if (channel === 'h5') form.miniappId = null;
  },
);
async function loadPaymentStatus() {
  const serial = ++paymentStatusRequest;
  if (!props.open) {
    paymentAccounts.value = [];
    return;
  }
  if (form.channel === 'h5_miniapp' && !form.miniappId) {
    paymentAccounts.value = [];
    form.paymentAccountId = null;
    return;
  }
  paymentStatusLoading.value = true;
  try {
    const result = await getActivityPaymentAccounts({
      channel: form.channel,
      miniappId: form.channel === 'h5_miniapp' ? form.miniappId : null,
    });
    if (serial === paymentStatusRequest) {
      paymentAccounts.value = result.items;
      const current = result.items.find(
        (item) => item.id === form.paymentAccountId,
      );
      form.paymentAccountId =
        current?.id ??
        result.items.find((item) => item.isDefault)?.id ??
        result.items[0]?.id ??
        null;
    }
  } catch {
    if (serial === paymentStatusRequest) paymentAccounts.value = [];
  } finally {
    if (serial === paymentStatusRequest) paymentStatusLoading.value = false;
  }
}
watch(
  () => [props.open, form.channel, form.miniappId],
  loadPaymentStatus,
  { immediate: true },
);
const record = ref<Activity>();
const coreLocked = computed(() => !!record.value && !record.value.canEditCore);
const scheduleLocked = computed(
  () => !!record.value && !record.value.canEditSchedule,
);
const groupPrice = ref('');
const singlePrice = ref('');
let request = 0;
onBeforeUnmount(() => {
  request++;
  assets.clear();
});
async function load() {
  const serial = ++request;
  assets.clear();
  failed.value = false;
  record.value = undefined;
  Object.assign(form, defaultActivity());
  groupPrice.value = '';
  singlePrice.value = '';
  savedId.value = '';
  selectedEmployeeIds.value = [];
  savedSubmissionError.value = '';
  submissionUncertain.value = false;
  loading.value = false;
  if (!props.activityId && !props.copyFrom) return;
  loading.value = true;
  try {
    const context = captureContext();
    const r = await getActivity(props.activityId || props.copyFrom!);
    context.assertCurrent();
    if (serial !== request) return;
    record.value = props.copyFrom ? undefined : r;
    Object.assign(
      form,
      props.copyFrom ? copyActivityInput(r) : createActivityInput(r),
    );
    void assets.loadPreviews();
    groupPrice.value =
      r.groupPriceCent === null ? '' : (r.groupPriceCent / 100).toFixed(2);
    singlePrice.value =
      r.singlePriceCent === null ? '' : (r.singlePriceCent / 100).toFixed(2);
  } catch {
    if (serial === request) failed.value = true;
  } finally {
    if (serial === request) loading.value = false;
  }
}
watch(
  () => [props.open, props.activityId, props.copyFrom],
  () => {
    if (props.open) void load();
    else {
      ++request;
      assets.clear();
    }
  },
  { immediate: true },
);
watch(
  () => form.employeeScope,
  (value, previous) => {
    if (value === 'selected' && previous === 'all' && !loading.value)
      employeesOpen.value = true;
  },
  { flush: 'sync' },
);
async function save(submit = false) {
  if (
    saving.value ||
    assets.preparing.value ||
    storesBusy.value ||
    employeesBusy.value
  )
    return;
  const context = captureContext();
  const serial = request;
  savedSubmissionError.value = '';
  for (const key of Object.keys(formErrors)) delete formErrors[key];
  try {
    if (submissionUncertain.value && effectiveId.value) {
      saving.value = true;
      const canonical = await getActivity(effectiveId.value);
      context.assertCurrent();
      if (serial !== request) return;
      if (
        canonical.storedStatus !== 'draft' &&
        canonical.storedStatus !== 'rejected'
      ) {
        message.success('活动提交状态已更新');
        emit('saved', canonical);
        emit('close');
        return;
      }
      if (canonical.version !== record.value?.version) {
        savedSubmissionError.value =
          '活动已被更新，请关闭后重新打开查看最新内容。';
        return;
      }
      submissionUncertain.value = false;
      saving.value = false;
    }
    if (!form.name.trim()) {
      formErrors.name = '请输入活动名称';
      throw new Error(formErrors.name);
    }
    activityThemePreset(form.theme);
    form.themeColor = normalizeActivityThemeColor(form.themeColor);
    if (
      form.channel === 'h5_miniapp' &&
      (miniappBusy.value || miniappFailed.value || !form.miniappId)
    )
      throw new Error('请选择小程序并等待加载完成');
    if (form.groupEnabled && !form.paymentAccountId)
      throw new Error('请选择本公司的收款支付账户');
    form.groupPriceCent = form.groupEnabled
      ? parsePrice('groupPrice', groupPrice.value)
      : null;
    form.singlePriceCent = form.groupEnabled
      ? parsePrice('singlePrice', singlePrice.value)
      : null;
    if (form.groupEnabled && form.groupPriceCent === null) {
      formErrors.groupPrice = '请设置拼团价格';
      throw new Error(formErrors.groupPrice);
    }
    if (
      form.startsAt &&
      form.endsAt &&
      new Date(form.startsAt) >= new Date(form.endsAt)
    ) {
      formErrors.endsAt = '结束时间应晚于开始时间';
      throw new Error(formErrors.endsAt);
    }
    for (const f of form.formConfig.fields) {
      if (!f.label.trim()) {
        formErrors.formConfig = '请填写表单字段标题';
        throw new Error(formErrors.formConfig);
      }
      if (
        ['checkbox', 'radio'].includes(f.type) &&
        (!f.options?.length || f.options.some((o) => !o.label.trim()))
      ) {
        formErrors.formConfig = '请完整填写选择项';
        throw new Error(formErrors.formConfig);
      }
    }
    saving.value = true;
    await assets.uploadPending();
    context.assertCurrent();
    if (serial !== request) return;
    const result = await saveActivity(effectiveId.value, {
      ...createActivityInput(form),
      ...(record.value ? { version: record.value.version } : {}),
      ...(form.employeeScope === 'selected' && selectedEmployeeIds.value.length
        ? { employeeIds: selectedEmployeeIds.value }
        : {}),
    });
    context.assertCurrent();
    if (serial !== request) return;
    savedId.value = result.id;
    record.value = result;
    selectedEmployeeIds.value = [];
    if (submit) {
      if (!form.posterUrl) formErrors.posterUrl = '请添加活动海报';
      if (!form.startsAt) formErrors.startsAt = '请选择开始时间';
      if (!form.endsAt) formErrors.endsAt = '请选择结束时间';
      else if (new Date(form.endsAt).getTime() <= Date.now())
        formErrors.endsAt = '结束时间必须晚于当前时间';
      if (Object.keys(formErrors).length) {
        savedSubmissionError.value = '草稿已保存，请完善标记的信息后提交审核。';
        void revealError();
        return;
      }
      try {
        const submitted = await transitionActivity(
          result.id,
          result.version,
          'submit-review',
        );
        context.assertCurrent();
        if (serial !== request) return;
        record.value = submitted;
        message.success('活动已提交审核');
        emit('saved', submitted);
        emit('close');
      } catch {
        context.assertCurrent();
        if (serial !== request) return;
        submissionUncertain.value = true;
        try {
          const canonical = await getActivity(result.id);
          context.assertCurrent();
          if (serial !== request) return;
          if (
            canonical.storedStatus !== 'draft' &&
            canonical.storedStatus !== 'rejected'
          ) {
            message.success('活动提交状态已更新');
            emit('saved', canonical);
            emit('close');
            return;
          }
          if (canonical.version === result.version)
            submissionUncertain.value = false;
        } catch {
          /* Retry reconciles the saved activity before another write. */
        }
        savedSubmissionError.value = submissionUncertain.value
          ? '草稿已保存，提交结果暂未确认。重试时将先查询活动状态。'
          : '草稿已保存，提交审核未成功。请按提示补充后重新提交。';
      }
    } else {
      message.success('活动已保存');
      emit('saved', result);
      emit('close');
    }
  } catch (error) {
    if (serial !== request) return;
    void revealError();
    if (error instanceof Error && !saving.value) message.warning(error.message);
    else if (error instanceof ActivityMediaUploadError)
      message.error(error.message);
  } finally {
    saving.value = false;
  }
}
function setDate(key: 'endsAt' | 'startsAt', value: unknown) {
  form[key] = typeof value === 'string' ? new Date(value).toISOString() : null;
}
</script>
<template>
  <ActivityEditorShell
    :open="open"
    :inline="inline"
    :title="effectiveId ? '编辑活动' : copyFrom ? '复制创建活动' : '创建活动'"
    :saving="saving"
    @close="emit('close')"
  >
    <Spin :spinning="loading">
      <Alert v-if="failed" type="error" message="活动加载失败">
        <template #action><Button @click="load">重试</Button></template>
      </Alert>
      <Form v-else layout="vertical" :disabled="saving || loading">
        <Alert
          v-if="savedSubmissionError"
          type="warning"
          show-icon
          class="mb-3"
          :message="savedSubmissionError"
        />
        <Alert
          v-if="coreLocked"
          class="mb-3"
          type="info"
          show-icon
          message="可修改活动展示资料。拼团、价格、报名表单和渠道已锁定；活动时间仅平台管理员可调整。保存后将通知平台管理员。"
        />
        <div class="activity-sections">
          <section
            aria-labelledby="activity-section-base"
            class="activity-section"
          >
            <h3 id="activity-section-base" class="activity-section-title">
              活动内容
            </h3>
            <FormItem
              label="活动名称"
              required
              :validate-status="formErrors.name ? 'error' : undefined"
              :help="formErrors.name"
            >
              <Input v-model:value="form.name" :maxlength="160" />
            </FormItem>
            <FormItem label="活动渠道" required>
              <Select
                v-model:value="form.channel"
                :disabled="saving || loading || coreLocked"
                :options="[
                  { label: 'H5', value: 'h5' },
                  { label: 'H5 + 小程序', value: 'h5_miniapp' },
                ]"
              />
            </FormItem>
            <FormItem label="活动主题" required class="activity-field-wide">
              <ActivityThemeSelect
                v-model:theme="form.theme"
                v-model:theme-color="form.themeColor"
                :disabled="saving || loading"
              />
            </FormItem>
            <FormItem
              v-if="form.channel === 'h5_miniapp'"
              label="小程序"
              required
              tooltip="每个活动只能选择当前公司的一个小程序。"
            >
              <ActivityMiniappSelect
                v-if="!loading"
                v-model="form.miniappId"
                v-model:busy="miniappBusy"
                v-model:failed="miniappFailed"
                :activity-id="effectiveId"
                :current="record?.miniapp"
                :disabled="saving || coreLocked"
              />
            </FormItem>
            <FormItem
              label="活动海报"
              :validate-status="formErrors.posterUrl ? 'error' : undefined"
              :help="formErrors.posterUrl"
            >
              <ActivityAssetUpload
                v-model="posterFiles"
                :assets="assets"
                label="活动海报"
                :disabled="saving || loading"
              />
            </FormItem>
            <FormItem
              label="客服电话优先顺序"
              tooltip="拖动或点击前移、后移调整顺序。客户联系客服时按此顺序查找电话；前一项未配置电话则继续查找下一项。默认联系销售、联系门店、联系公司。"
              class="activity-field-wide"
            >
              <ActivityContactPriority
                v-model="form.contactPhonePriority"
                :disabled="saving || loading"
              />
            </FormItem>
            <FormItem
              label="活动规则"
              tooltip="填写参与方式、使用须知等规则。可选中文字后点击上方按钮排版，也可直接输入：### 小标题、**重点内容**、1. 编号条目、- 项目条目。换行显示为新的一行，空行分段；活动页自动使用当前主题样式。不支持插入图片或网页代码。"
              class="activity-field-wide"
            >
              <ActivityRulesEditor
                v-model="form.rulesText"
                :disabled="saving || loading"
              />
            </FormItem>
            <FormItem
              label="开始时间"
              :validate-status="formErrors.startsAt ? 'error' : undefined"
              :help="formErrors.startsAt"
              tooltip="活动计划开始的时间，留空表示不设置开始时间。"
            >
              <DatePicker
                :value="form.startsAt || undefined"
                :disabled="saving || loading || scheduleLocked"
                value-format="YYYY-MM-DDTHH:mm:ssZ"
                show-time
                class="w-full"
                @update:value="setDate('startsAt', $event)"
              />
            </FormItem>
            <FormItem
              label="结束时间"
              :validate-status="formErrors.endsAt ? 'error' : undefined"
              :help="formErrors.endsAt"
              tooltip="活动计划结束的时间，留空表示不设置结束时间；填写后必须晚于开始时间。"
            >
              <DatePicker
                :value="form.endsAt || undefined"
                :disabled="saving || loading || scheduleLocked"
                value-format="YYYY-MM-DDTHH:mm:ssZ"
                show-time
                class="w-full"
                @update:value="setDate('endsAt', $event)"
              />
            </FormItem>
            <FormItem
              label="活动详情（图片 / 视频，可拖动排序）"
              tooltip="拖动图片或视频调整展示顺序，最多50项。"
              class="activity-field-wide"
            >
              <ActivityAssetUpload
                v-model="detailFiles"
                :assets="assets"
                kind="detail"
                label="详情素材"
                multiple
                :disabled="saving || loading"
              />
            </FormItem>
          </section>
          <section
            class="activity-section"
            aria-labelledby="activity-section-stores"
          >
            <h3 id="activity-section-stores" class="activity-section-title">
              参与门店
            </h3>
            <FormItem label="选择门店" class="activity-field-wide">
              <ActivityStoreSelect
                v-model="form.storeIds"
                v-model:busy="storesBusy"
                :open="open"
                :activity-id="effectiveId"
                :selected-stores="record?.stores || []"
                :disabled="saving || loading"
                allow-create
              />
            </FormItem>
          </section>
          <section
            aria-labelledby="activity-section-group"
            class="activity-section"
          >
            <h3 id="activity-section-group" class="activity-section-title">
              拼团设置
            </h3>
            <FormItem
              label="开启拼团"
              :tooltip="
                paymentAccounts.length > 0
                  ? '开启后需设置成团人数和拼团价格；关闭后作为普通营销活动。'
                  : '当前公司没有可用于此活动渠道的支付账户。'
              "
            >
              <Switch
                v-model:checked="form.groupEnabled"
                :disabled="
                  saving ||
                  loading ||
                  coreLocked ||
                  paymentStatusLoading ||
                  paymentAccounts.length === 0
                "
              />
              <div
                v-if="!paymentStatusLoading && paymentAccounts.length === 0"
                class="mt-1 text-xs text-muted-foreground"
              >
                请先让平台在支付配置中为公司绑定可用账户并配置支付渠道。
              </div>
            </FormItem>
            <template v-if="form.groupEnabled">
              <FormItem
                label="收款支付账户"
                required
                tooltip="客户支付资金将进入这里选择的账户。默认带出公司默认账户，也可以选择本公司其他可用账户。"
              >
                <Select
                  :value="form.paymentAccountId || undefined"
                  @change="
                    (value) =>
                      (form.paymentAccountId = value ? String(value) : null)
                  "
                  :disabled="saving || loading || coreLocked"
                  :options="
                    paymentAccounts.map((account) => ({
                      value: account.id,
                      label: `${account.accountName} · ${account.maskedAccount}${account.isDefault ? ' · 默认' : ''}`,
                    }))
                  "
                  class="w-full"
                  placeholder="选择收款支付账户"
                />
              </FormItem>
              <FormItem
                label="成团人数"
                tooltip="团内展示的目标人数，用于显示已有几人、还差几人。未达到人数不影响已付款客户的参与资格；管理员补充的虚拟人数只用于展示，不产生订单和流水。"
                required
              >
                <InputNumber
                  v-model:value="form.groupSize"
                  :disabled="saving || loading || coreLocked"
                  :min="2"
                  :max="9999"
                  :precision="0"
                  class="w-full"
                />
              </FormItem>
              <FormItem
                label="拼团价格（元）"
                :validate-status="formErrors.groupPrice ? 'error' : undefined"
                :help="formErrors.groupPrice"
                tooltip="客户选择拼团时每人支付的金额，单位为元；开启拼团后必填。"
                required
              >
                <Input
                  v-model:value="groupPrice"
                  :disabled="saving || loading || coreLocked"
                  inputmode="decimal"
                  placeholder="例如 99.00"
                />
              </FormItem>
              <FormItem
                label="单买价格（元）"
                :validate-status="formErrors.singlePrice ? 'error' : undefined"
                :help="formErrors.singlePrice"
                tooltip="填写价格即允许客户单独购买，留空则不开放单买。单位为元。"
              >
                <Input
                  v-model:value="singlePrice"
                  :disabled="saving || loading || coreLocked"
                  inputmode="decimal"
                  placeholder="留空表示不允许单买"
                />
              </FormItem>
            </template>
          </section>
          <section
            aria-labelledby="activity-section-staff"
            class="activity-section"
          >
            <h3 id="activity-section-staff" class="activity-section-title">
              员工与权限
            </h3>
            <FormItem
              label="可参与员工范围"
              tooltip="可选择本公司全部有效员工或指定员工。"
            >
              <Select
                v-model:value="form.employeeScope"
                :options="[
                  { label: '全部有效员工', value: 'all' },
                  { label: '指定员工', value: 'selected' },
                ]"
              />
            </FormItem>
            <FormItem v-if="form.employeeScope === 'selected'" label="指定员工">
              <Button @click="employeesOpen = true">
                {{ effectiveId ? '添加员工' : '选择员工'
                }}{{
                  selectedEmployeeIds.length
                    ? `（已选 ${selectedEmployeeIds.length} 人）`
                    : ''
                }}
              </Button>
              <span v-if="effectiveId" class="ml-2 text-muted-foreground">当前 {{ record?.memberCount || 0 }} 人</span>
            </FormItem>
            <FormItem
              label="允许员工通过邀请申请加入"
              tooltip="开启后，员工可通过活动邀请申请加入；申请需经公司管理员审核后生效。"
            >
              <Switch v-model:checked="form.employeeRegistrationEnabled" />
            </FormItem>
            <FormItem label="组员可查看业绩范围" :tooltip="performanceHelp">
              <Select
                v-model:value="form.memberPerformanceScope"
                :options="[
                  { label: '仅本人', value: 'self' },
                  { label: '本组', value: 'group' },
                  { label: '当前活动全部员工', value: 'all' },
                ]"
              />
            </FormItem>
            <FormItem label="组长可查看业绩范围" :tooltip="performanceHelp">
              <Select
                v-model:value="form.leaderPerformanceScope"
                :options="[
                  { label: '本组', value: 'group' },
                  { label: '当前活动全部员工', value: 'all' },
                ]"
              />
            </FormItem>
          </section>
          <section
            aria-labelledby="activity-section-form"
            class="activity-section"
          >
            <h3 id="activity-section-form" class="activity-section-title">
              填写表单
            </h3>
            <FormItem
              label="客户填写信息"
              :validate-status="formErrors.formConfig ? 'error' : undefined"
              :help="formErrors.formConfig"
              tooltip="客户姓名和手机号为固定必填字段，便于搜索订单。其他字段可配置标题、填写提示、类型和是否必填，并支持拖动排序；单选、多选需填写选项。"
              class="activity-field-wide"
            >
              <ActivityFormFields
                v-model="form.formConfig.fields"
                :disabled="saving || loading || coreLocked"
              />
            </FormItem>
          </section>
          <section
            aria-labelledby="activity-section-share"
            class="activity-section"
          >
            <h3 id="activity-section-share" class="activity-section-title">
              分享与音乐
            </h3>
            <FormItem
              label="分享文案"
              tooltip="用于活动分享展示，建议20字左右，避免内容过长被截断；实际展示以对应渠道为准。"
            >
              <Input
                v-model:value="form.shareText"
                :maxlength="1000"
                placeholder="建议20字左右"
              />
            </FormItem>
            <FormItem label="分享图片" tooltip="活动分享时展示的图片。">
              <ActivityAssetUpload
                v-model="shareFiles"
                :assets="assets"
                label="分享图片"
                :disabled="saving || loading"
              />
            </FormItem>
            <FormItem
              label="转发文案"
              tooltip="用于转发活动时的文案，建议20字左右；实际展示以对应渠道为准。"
            >
              <Input
                v-model:value="form.forwardText"
                :maxlength="2000"
                placeholder="建议20字左右"
              />
            </FormItem>
            <FormItem label="转发图片" tooltip="转发活动时展示的图片。">
              <ActivityAssetUpload
                v-model="forwardFiles"
                :assets="assets"
                label="转发图片"
                :disabled="saving || loading"
              />
            </FormItem>
            <FormItem
              label="背景音乐"
              tooltip="选择音乐库中的背景音乐，可试听或清空。"
            >
              <ActivityMusicSelect
                v-if="open"
                v-model="form.musicId"
                :activity-id="effectiveId"
                :current="
                  record?.musicId
                    ? {
                        id: record.musicId,
                        name: record.musicName,
                        status:
                          record.musicStatus === 'active'
                            ? 'active'
                            : 'disabled',
                      }
                    : null
                "
                :disabled="saving || loading"
              />
            </FormItem>
            <FormItem
              label="虚拟浏览量"
              tooltip="用于增加活动对外展示的浏览量，不代表真实访问人数，不产生订单或交易流水；填0表示不增加。"
            >
              <InputNumber
                v-model:value="form.virtualViewCount"
                :min="0"
                :precision="0"
                class="w-full"
              />
            </FormItem>
            <FormItem
              label="虚拟报名人数"
              tooltip="仅增加活动页的报名展示人数和动态，不产生客户、订单、支付或业绩；拼团仅展示已成团，不参与真实拼团。真实报名始终排在前面；填0关闭。"
            >
              <InputNumber
                v-model:value="form.virtualRegistrationCount"
                :min="0"
                :max="10000000000"
                :precision="0"
                class="w-full"
              />
            </FormItem>
          </section>
        </div>
      </Form>
    </Spin>
    <template #footer>
      <Space class="float-right">
        <Button :disabled="saving" @click="emit('close')">取消</Button>
        <Button
          type="primary"
          :loading="saving"
          :disabled="
            loading ||
            storesBusy ||
            employeesBusy ||
            failed ||
            assets.preparing.value > 0 ||
            (form.channel === 'h5_miniapp' &&
              (miniappBusy || miniappFailed || !form.miniappId))
          "
          @click="save(false)"
        >
          {{
            assets.preparing.value
              ? '正在处理图片'
              : assets.progress.value || (effectiveId ? '保存修改' : '保存草稿')
          }}
        </Button>
        <Button
          v-if="!record || record.canSubmitReview"
          type="primary"
          :loading="saving"
          :disabled="
            loading ||
            failed ||
            storesBusy ||
            employeesBusy ||
            assets.preparing.value > 0
          "
          @click="save(true)"
        >
          保存并提交审核
        </Button>
      </Space>
    </template>
  </ActivityEditorShell>
  <Modal
    :open="employeesOpen"
    title="选择参与员工"
    :width="680"
    :footer="null"
    @cancel="employeesOpen = false"
  >
    <ActivityEmployeePicker
      v-model="selectedEmployeeIds"
      v-model:busy="employeesBusy"
      :activity-id="effectiveId"
      :max="500"
      :open="employeesOpen"
      :disabled="saving"
    />
    <div class="mt-4 text-right">
      <Button
        type="primary"
        :disabled="employeesBusy"
        @click="employeesOpen = false"
      >
        确定
      </Button>
    </div>
  </Modal>
</template>

<style scoped>
.activity-sections {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.activity-section {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 16px;
}

.activity-field-wide,
.activity-section-title {
  grid-column: 1 / -1;
}

.activity-section + .activity-section {
  padding-top: 16px;
  border-top: 1px solid hsl(var(--border));
}

.activity-section-title {
  margin: 0 0 12px;
  font-size: 15px;
  font-weight: 600;
  line-height: 24px;
}

.activity-section :deep(.ant-form-item) {
  min-width: 0;
  margin-bottom: 12px;
}

.activity-section :deep(.ant-form-item-label) {
  padding-bottom: 4px;
}

@media (max-width: 599px) {
  .activity-section {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
