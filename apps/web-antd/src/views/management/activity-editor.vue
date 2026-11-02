<script setup lang="ts">
import type { Activity, ActivityInput } from '#/api/management';

import { computed, reactive, ref, watch } from 'vue';

import {
  Alert,
  Button,
  DatePicker,
  Drawer,
  Form,
  FormItem,
  Input,
  InputNumber,
  message,
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
import { ActivityMediaUploadError } from '#/api/activity-media';
import {
  activityThemePreset,
  normalizeActivityThemeColor,
} from '#/api/activity-theme';
import { getActivity, saveActivity } from '#/api/management';
import ActivityAssetUpload from '#/components/management/activity-asset-upload.vue';
import ActivityContactPriority from '#/components/management/activity-contact-priority.vue';
import ActivityFormFields from '#/components/management/activity-form-fields.vue';
import { useActivityMedia } from '#/components/management/activity-media';
import ActivityMiniappSelect from '#/components/management/activity-miniapp-select.vue';
import ActivityThemeSelect from '#/components/management/activity-theme-select.vue';
const props = defineProps<{ open: boolean; activityId: string }>();
const emit = defineEmits<{ close: []; saved: [] }>();
const form = reactive<ActivityInput>(defaultActivity());
const assets = useActivityMedia(form, () => props.activityId);
const performanceHelp =
  '仅控制当前活动业绩的查看范围，不授予员工管理、审核或角色分配权限。活动管理员始终可查看当前活动全部员工业绩。';
function singleAsset(
  key: 'forwardImageUrl' | 'musicUrl' | 'posterUrl' | 'shareImageUrl',
) {
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
const musicFiles = singleAsset('musicUrl');
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
watch(
  () => form.channel,
  (channel) => {
    if (channel === 'h5') form.miniappId = null;
  },
);
const record = ref<Activity>();
const groupPrice = ref('');
const singlePrice = ref('');
let request = 0;
async function load() {
  const serial = ++request;
  assets.clear();
  failed.value = false;
  record.value = undefined;
  Object.assign(form, defaultActivity());
  groupPrice.value = '';
  singlePrice.value = '';
  if (!props.activityId) return;
  loading.value = true;
  try {
    const r = await getActivity(props.activityId);
    if (serial !== request) return;
    record.value = r;
    Object.assign(form, createActivityInput(r));
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
  () => [props.open, props.activityId],
  () => {
    if (props.open) void load();
    else {
      ++request;
      assets.clear();
    }
  },
);
async function save() {
  if (saving.value || assets.preparing.value) return;
  try {
    if (!form.name.trim()) throw new Error('请输入活动名称');
    activityThemePreset(form.theme);
    form.themeColor = normalizeActivityThemeColor(form.themeColor);
    if (
      form.channel === 'h5_miniapp' &&
      (miniappBusy.value || miniappFailed.value || !form.miniappId)
    )
      throw new Error('请选择小程序并等待加载完成');
    form.groupPriceCent = form.groupEnabled
      ? amountToCent(groupPrice.value)
      : null;
    form.singlePriceCent = form.groupEnabled
      ? amountToCent(singlePrice.value)
      : null;
    if (form.groupEnabled && form.groupPriceCent === null)
      throw new Error('请设置拼团价格');
    if (
      form.startsAt &&
      form.endsAt &&
      new Date(form.startsAt) >= new Date(form.endsAt)
    )
      throw new Error('结束时间应晚于开始时间');
    for (const f of form.formConfig.fields) {
      if (!f.label.trim()) throw new Error('请填写表单字段标题');
      if (
        ['checkbox', 'radio'].includes(f.type) &&
        (!f.options?.length || f.options.some((o) => !o.label.trim()))
      )
        throw new Error('请完整填写选择项');
    }
    saving.value = true;
    await assets.uploadPending();
    await saveActivity(props.activityId, {
      ...createActivityInput(form),
      ...(record.value ? { version: record.value.version } : {}),
    });
    message.success('活动已保存');
    emit('saved');
    emit('close');
  } catch (error) {
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
  <Drawer
    :open="open"
    :title="activityId ? '编辑活动' : '创建活动'"
    width="min(900px,100vw)"
    :body-style="{ padding: '16px 20px' }"
    :closable="!saving"
    :keyboard="!saving"
    :mask-closable="!saving"
    @close="emit('close')"
  >
    <Spin :spinning="loading">
      <Alert v-if="failed" type="error" message="活动加载失败">
        <template #action><Button @click="load">重试</Button></template>
      </Alert>
      <Form v-else layout="vertical" :disabled="saving || loading">
        <div class="activity-sections">
          <section
            aria-labelledby="activity-section-base"
            class="activity-section"
          >
            <h3 id="activity-section-base" class="activity-section-title">
              活动内容
            </h3>
            <FormItem label="活动名称" required>
              <Input v-model:value="form.name" :maxlength="160" />
            </FormItem>
            <FormItem label="活动渠道" required>
              <Select
                v-model:value="form.channel"
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
                :activity-id="activityId"
                :current="record?.miniapp"
                :disabled="saving"
              />
            </FormItem>
            <FormItem label="活动海报">
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
              tooltip="填写客户需要了解的参与方式、适用门店、使用说明等活动规则。"
              class="activity-field-wide"
            >
              <Input.TextArea
                v-model:value="form.rulesText"
                :auto-size="{ minRows: 2, maxRows: 5 }"
                :maxlength="20000"
              />
            </FormItem>
            <FormItem
              label="开始时间"
              tooltip="活动计划开始的时间，留空表示不设置开始时间。"
            >
              <DatePicker
                :value="form.startsAt || undefined"
                value-format="YYYY-MM-DDTHH:mm:ssZ"
                show-time
                class="w-full"
                @update:value="setDate('startsAt', $event)"
              />
            </FormItem>
            <FormItem
              label="结束时间"
              tooltip="活动计划结束的时间，留空表示不设置结束时间；填写后必须晚于开始时间。"
            >
              <DatePicker
                :value="form.endsAt || undefined"
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
            aria-labelledby="activity-section-group"
            class="activity-section"
          >
            <h3 id="activity-section-group" class="activity-section-title">
              拼团设置
            </h3>
            <FormItem
              label="开启拼团"
              tooltip="开启后需设置成团人数和拼团价格；关闭后作为普通营销活动。"
            >
              <Switch v-model:checked="form.groupEnabled" />
            </FormItem>
            <template v-if="form.groupEnabled">
              <FormItem
                label="成团人数"
                tooltip="团内展示的目标人数，用于显示已有几人、还差几人。未达到人数不影响已付款客户的参与资格；管理员补充的虚拟人数只用于展示，不产生订单和流水。"
                required
              >
                <InputNumber
                  v-model:value="form.groupSize"
                  :min="2"
                  :max="9999"
                  :precision="0"
                  class="w-full"
                />
              </FormItem>
              <FormItem
                label="拼团价格（元）"
                tooltip="客户选择拼团时每人支付的金额，单位为元；开启拼团后必填。"
                required
              >
                <Input
                  v-model:value="groupPrice"
                  inputmode="decimal"
                  placeholder="例如 99.00"
                />
              </FormItem>
              <FormItem
                label="单买价格（元）"
                tooltip="填写价格即允许客户单独购买，留空则不开放单买。单位为元。"
              >
                <Input
                  v-model:value="singlePrice"
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
              label="参与员工范围"
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
            <FormItem
              label="允许员工通过邀请申请加入"
              tooltip="开启后，员工可通过活动邀请申请加入；申请需经活动管理员审核后生效。"
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
              tooltip="客户姓名和手机号为固定必填字段，便于搜索订单。其他字段可配置标题、填写提示、类型和是否必填，并支持拖动排序；单选、多选需填写选项。"
              class="activity-field-wide"
            >
              <ActivityFormFields v-model="form.formConfig.fields" />
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
            <FormItem label="背景音乐" tooltip="添加活动背景音乐，可先试听。">
              <ActivityAssetUpload
                v-model="musicFiles"
                :assets="assets"
                kind="audio"
                label="背景音乐"
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
            failed ||
            assets.preparing.value > 0 ||
            (form.channel === 'h5_miniapp' &&
              (miniappBusy || miniappFailed || !form.miniappId))
          "
          @click="save"
        >
          {{
            assets.preparing.value
              ? '正在处理图片'
              : assets.progress.value || '保存活动'
          }}
        </Button>
      </Space>
    </template>
  </Drawer>
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
