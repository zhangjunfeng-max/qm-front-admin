<script setup lang="ts">
import type {
  Activity,
  ActivityEmployee,
  ActivityGroup,
  ActivityRole,
} from '#/api/management';

import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Alert,
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Form,
  FormItem,
  Input,
  message,
  Modal,
  Select,
  Space,
  Spin,
  TabPane,
  Tabs,
  Tag,
} from 'ant-design-vue';
import QRCode from 'qrcode';

import { contactPhoneLabels } from '#/api/activity-form';
import {
  activityStatusColor,
  activityStatusLabel,
} from '#/api/activity-lifecycle';
import { activityThemePreset } from '#/api/activity-theme';
import {
  applyActivity,
  getActivity,
  getActivityGroups,
  getActivityInvitation,
  getMyMembership,
} from '#/api/management';
import ActivityActions from '#/components/management/activity-actions.vue';
import ActivityPromotion from '#/components/management/activity-promotion.vue';

import ActivityEditor from './activity-editor.vue';
import ActivityGroups from './activity-groups.vue';
import ActivityMembers from './activity-members.vue';
import ActivityStores from './activity-stores.vue';
const route = useRoute();
const router = useRouter();
const id = computed(() => String(route.params.id));
const activity = ref<Activity>();
const membership = ref<ActivityEmployee | null>(null);
const groups = ref<ActivityGroup[]>([]);
const applying = ref(false);
const applyOpen = ref(false);
const editOpen = ref(false);
const failed = ref(false);
const invitationOpen = ref(false);
const promotionOpen = ref(false);
const inviteUrl = ref('');
const inviting = ref(false);
const loading = ref(false);
const qrDataUrl = ref('');
const form = reactive({
  role: 'member' as ActivityRole,
  groupId: null as null | string,
});
let detailRequest = 0;
onBeforeUnmount(() => {
  ++detailRequest;
});
async function load() {
  const request = ++detailRequest;
  const activityId = id.value;
  loading.value = true;
  failed.value = false;
  try {
    const [a, m] = await Promise.all([
      getActivity(activityId),
      getMyMembership(activityId),
    ]);
    if (request !== detailRequest) return;
    activity.value = a;
    membership.value = m;
  } catch {
    if (request === detailRequest) failed.value = true;
  } finally {
    if (request === detailRequest) loading.value = false;
  }
}
async function openApply() {
  try {
    groups.value = (await getActivityGroups(id.value)).items;
    form.role = 'member';
    form.groupId = null;
    applyOpen.value = true;
  } catch {}
}
async function apply() {
  if (form.role === 'leader' && !form.groupId) {
    message.warning('请选择小组');
    return;
  }
  applying.value = true;
  try {
    await applyActivity(id.value, {
      role: form.role,
      groupId: form.role === 'admin' ? null : form.groupId,
    });
    message.success('申请已提交，请等待审核');
    applyOpen.value = false;
    await load();
  } catch {
  } finally {
    applying.value = false;
  }
}
async function invitation(reset = false) {
  inviting.value = true;
  try {
    const r = await getActivityInvitation(id.value, reset);
    inviteUrl.value = new URL(r.registrationPath, window.location.origin).href;
    qrDataUrl.value = await QRCode.toDataURL(inviteUrl.value, {
      width: 240,
      margin: 2,
    });
    invitationOpen.value = true;
  } catch {
  } finally {
    inviting.value = false;
  }
}
async function copy() {
  try {
    await navigator.clipboard.writeText(inviteUrl.value);
    message.success('邀请链接已复制');
  } catch {
    message.info('请选中并复制下方链接');
  }
}
watch(id, () => {
  promotionOpen.value = false;
  activity.value = undefined;
  membership.value = null;
  void load();
});
onMounted(load);
</script>
<template>
  <Page
    :title="activity?.name || '活动详情'"
    content-class="flex flex-col gap-4"
  >
    <template #extra>
      <Space wrap>
        <Button v-if="activity && activity.performanceScope !== 'none'" @click="router.push(`/activities/${id}/orders`)">订单管理</Button>
        <Button v-if="activity && activity.performanceScope !== 'none'" @click="promotionOpen = true">活动推广</Button>
        <ActivityActions v-if="activity" :activity="activity" @changed="load" />
        <Button v-if="activity?.canEdit" @click="editOpen = true">
          编辑活动
        </Button>
        <Button
          v-if="
            activity?.canManageMembers && activity.employeeRegistrationEnabled
          "
          :loading="inviting"
          @click="invitation()"
        >
          员工邀请
        </Button>
        <Button
          v-if="
            activity &&
            !['archived', 'ended'].includes(activity.status) &&
            activity.employeeRegistrationEnabled &&
            activity.employeeScope === 'all' &&
            activity.currentRole !== 'admin' &&
            (!membership || membership.status === 'rejected')
          "
          @click="openApply"
        >
          申请加入
        </Button>
        <Button :loading="loading" @click="load">刷新</Button>
      </Space>
    </template>
    <Alert v-if="failed" type="error" message="活动详情加载失败">
      <template #action><Button @click="load">重试</Button></template>
    </Alert>
    <Spin :spinning="loading">
      <template v-if="activity">
        <Alert
          v-if="activity.status === 'rejected'"
          type="error"
          class="mb-4"
          show-icon
          :message="`审核未通过：${activity.reviewReason}`"
        />
        <Alert
          v-if="activity.status === 'approved'"
          type="success"
          class="mb-4"
          show-icon
          message="审核已通过，点击发布后活动才会对外展示。"
        />
        <Card>
          <Descriptions :column="{ xs: 1, sm: 2, lg: 3 }">
            <DescriptionsItem label="活动状态">
              <Tag :color="activityStatusColor(activity.status)">
                {{ activityStatusLabel(activity.status) }}
              </Tag>
            </DescriptionsItem>
            <DescriptionsItem label="提交审核时间">
{{
              activity.submittedAt
                ? new Date(activity.submittedAt).toLocaleString()
                : '—'
            }}
</DescriptionsItem>
            <DescriptionsItem label="平台审核时间">
{{
              activity.reviewedAt
                ? new Date(activity.reviewedAt).toLocaleString()
                : '—'
            }}
</DescriptionsItem>
            <DescriptionsItem label="发布时间">
{{
              activity.publishedAt
                ? new Date(activity.publishedAt).toLocaleString()
                : '—'
            }}
</DescriptionsItem>
            <DescriptionsItem
              v-if="activity.performanceScope !== 'none'"
              label="活动主题"
            >
              <Space :size="6">
                {{ activityThemePreset(activity.theme).label }}
                <span
                  class="border-border inline-block size-3 rounded-full border"
                  :style="{ backgroundColor: activity.themeColor }"
                ></span>
                {{ activity.themeColor !== activityThemePreset(activity.theme).color ? '（自定义）' : '' }}
              </Space>
            </DescriptionsItem>
            <DescriptionsItem label="玩法">
              {{
                activity.groupEnabled
                  ? `${activity.groupSize} 人拼团`
                  : '营销活动'
              }}
            </DescriptionsItem>
            <DescriptionsItem label="活动渠道">
              {{ activity.channel === 'h5' ? 'H5' : 'H5 + 小程序' }}
            </DescriptionsItem>
            <DescriptionsItem label="虚拟报名人数">
              {{ activity.virtualRegistrationCount }}
            </DescriptionsItem>
            <DescriptionsItem v-if="activity.miniapp" label="小程序" :span="2">
              {{ activity.miniapp.name }}（{{ activity.miniapp.appid }}）
              <Tag
                v-if="activity.miniapp.status === 'disabled'"
                color="warning"
              >
                已停用
              </Tag>
              <Tag
                v-if="activity.miniapp.authorizationStatus !== 'authorized'"
                color="warning"
              >
                未授权
              </Tag>
            </DescriptionsItem>
            <DescriptionsItem label="参与员工">
              {{ activity.memberCount }} 人
            </DescriptionsItem>
            <DescriptionsItem label="员工范围">
              {{
                activity.employeeScope === 'all' ? '全部有效员工' : '指定员工'
              }}
            </DescriptionsItem>
            <DescriptionsItem label="参与门店" :span="3">
              <Space v-if="activity.stores.length" wrap>
                <Tag v-for="store in activity.stores" :key="store.id">
                  {{ store.name
                  }}{{ store.status === 'disabled' ? '（已停用）' : '' }}
                </Tag>
              </Space>
              <span v-else class="text-muted-foreground">未配置</span>
            </DescriptionsItem>
            <DescriptionsItem
              v-if="activity.contactPhonePriority?.length"
              label="客服电话顺序"
              :span="3"
            >
              {{
                activity.contactPhonePriority
                  .map((source) => contactPhoneLabels[source])
                  .join(' → ')
              }}
            </DescriptionsItem>
            <DescriptionsItem label="组员业绩范围">
              {{
                { self: '仅本人', group: '本组', all: '当前活动全部员工' }[
                  activity.memberPerformanceScope
                ]
              }}
            </DescriptionsItem>
            <DescriptionsItem label="组长业绩范围">
              {{
                activity.leaderPerformanceScope === 'all'
                  ? '当前活动全部员工'
                  : '本组'
              }}
            </DescriptionsItem>
          </Descriptions>
        </Card>
        <Alert
          v-if="membership?.status === 'pending'"
          class="mt-4"
          type="info"
          message="您的加入申请正在审核，通过后角色权限生效。"
        />
        <Alert
          v-if="membership?.status === 'rejected'"
          class="mt-4"
          type="warning"
          :message="`申请已驳回：${membership.reviewRemark || '请联系管理员'}`"
        />
        <Card v-if="activity.performanceScope !== 'none'" class="mt-4">
          <Tabs>
            <TabPane key="employees" tab="活动员工与申请">
              <ActivityMembers
                :activity="activity"
                :my-group-id="membership?.groupId"
                @changed="load"
              />
            </TabPane>
            <TabPane key="stores" tab="参与门店">
              <ActivityStores :activity="activity" @changed="load" />
            </TabPane>
            <TabPane key="groups" tab="员工分组">
              <ActivityGroups :activity="activity" @changed="load" />
            </TabPane>
          </Tabs>
        </Card>
      </template>
    </Spin>
    <ActivityPromotion
      v-if="activity && activity.performanceScope !== 'none'"
      :open="promotionOpen"
      :activity="activity"
      @close="promotionOpen = false"
    />
    <ActivityEditor
      :open="editOpen"
      :activity-id="id"
      @close="editOpen = false"
      @saved="load"
    />
    <Modal
      :open="applyOpen"
      title="申请加入活动"
      :confirm-loading="applying"
      @ok="apply"
      @cancel="applyOpen = false"
    >
      <Form layout="vertical">
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
            :options="groups.map((g) => ({ label: g.name, value: g.id }))"
            @clear="form.groupId = null"
          />
        </FormItem>
        <Alert
          type="info"
          message="申请角色须经审核后生效，审核人可调整批准的角色和小组。"
        />
      </Form>
    </Modal>
    <Modal
      :open="invitationOpen"
      title="员工加入邀请"
      :footer="null"
      @cancel="invitationOpen = false"
    >
      <p class="mb-3">
        将链接发给员工，填写资料并申请角色，审核通过后加入活动。
      </p>
      <img
        v-if="qrDataUrl"
        :src="qrDataUrl"
        alt="员工加入二维码"
        class="mx-auto mb-4 h-60 w-60"
      />
      <Input.TextArea :value="inviteUrl" readonly :rows="3" />
      <Space class="mt-4">
        <Button type="primary" @click="copy">复制链接</Button>
        <Button
          danger
          :loading="inviting"
          @click="
            Modal.confirm({
              title: '重新生成邀请？',
              content: '原邀请链接将立即失效。',
              onOk: () => invitation(true),
            })
          "
        >
          重置邀请链接
        </Button>
      </Space>
    </Modal>
  </Page>
</template>
