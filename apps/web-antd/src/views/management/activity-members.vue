<script setup lang="ts">
import type {
  Activity,
  ActivityEmployee,
  ActivityGroup,
  ActivityRole,
  EmployeeBatchInput,
} from '#/api/management';

import { computed, onMounted, reactive, ref, watch } from 'vue';

import { useUserStore } from '@vben/stores';

import {
  Alert,
  Button,
  Form,
  FormItem,
  Input,
  InputSearch,
  message,
  Modal,
  Pagination,
  Select,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';

import {
  assignActivityEmployee,
  batchActivityEmployees,
  getActivityEmployees,
  getActivityGroups,
  reviewApplication,
} from '#/api/management';
import ActivityEmployeePicker from '#/components/management/activity-employee-picker.vue';

const props = defineProps<{ activity: Activity; myGroupId?: null | string }>();
const emit = defineEmits<{ changed: [] }>();
const user = useUserStore();
const tenantAdmin = computed(() =>
  user.userInfo?.roles?.some((r) => ['admin', 'owner'].includes(r)),
);
const groups = ref<ActivityGroup[]>([]);
const items = ref<ActivityEmployee[]>([]);

const failed = ref(false);
const loading = ref(false);
const open = ref(false);
const saving = ref(false);
const groupId = ref<string>();
const keyword = ref('');
const page = ref(1);
const pageSize = ref(20);
const role = ref<string>();
const status = ref<string>();
const total = ref(0);
const mode = ref<'assign' | 'review'>('assign');
const target = ref<ActivityEmployee>();
const form = reactive({
  userId: '',
  role: 'member' as ActivityRole,
  groupId: null as null | string,
  status: 'approved' as 'approved' | 'disabled',
  decision: 'approved' as 'approved' | 'rejected',
  remark: '',
});
let serial = 0;

const roleOptions = computed(() => [
  { label: '组员', value: 'member' },
  { label: '组长', value: 'leader' },
  ...(tenantAdmin.value ? [{ label: '活动管理员', value: 'admin' }] : []),
]);
const groupOptions = computed(() =>
  groups.value.map((g) => ({ label: g.name, value: g.id })),
);
async function load() {
  const n = ++serial;
  loading.value = true;
  failed.value = false;
  try {
    const r = await getActivityEmployees(props.activity.id, {
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value || undefined,
      status: status.value,
      role: role.value,
      groupId: groupId.value,
    });
    if (n === serial) {
      items.value = r.items;
      total.value = r.total;
      for (const row of r.items)
        if (selected.value.has(row.userId)) selected.value.set(row.userId, row);
    }
  } catch {
    if (n === serial) {
      failed.value = true;
      items.value = [];
    }
  } finally {
    if (n === serial) loading.value = false;
  }
}
function search() {
  clearSelection();
  page.value = 1;
  void load();
}
function change(p: number, s: number) {
  page.value = s === pageSize.value ? p : 1;
  pageSize.value = s;
  void load();
}
function edit(row: ActivityEmployee, review = false) {
  target.value = row;
  mode.value = review ? 'review' : 'assign';
  Object.assign(form, {
    userId: row?.userId || '',
    role: row?.role || 'member',
    groupId: row?.groupId || null,
    status: row?.status === 'disabled' ? 'disabled' : 'approved',
    decision: 'approved',
    remark: '',
  });
  open.value = true;
}
watch(
  () => form.role,
  (value) => {
    if (value === 'admin') form.groupId = null;
  },
);
async function save() {
  if (saving.value) return;
  if (!form.userId) {
    message.warning('请选择员工');
    return;
  }
  if (form.role === 'leader' && !form.groupId) {
    message.warning('请为组长选择小组');
    return;
  }
  saving.value = true;
  try {
    if (mode.value === 'review')
      await reviewApplication(props.activity.id, form.userId, {
        decision: form.decision,
        role: form.role,
        groupId: form.groupId,
        remark: form.remark,
      });
    else
      await assignActivityEmployee(props.activity.id, form.userId, {
        role: form.role,
        groupId: form.groupId,
        status: form.status,
      });
    message.success(mode.value === 'review' ? '申请已处理' : '活动员工已保存');
    open.value = false;
    await load();
    emit('changed');
  } catch {
  } finally {
    saving.value = false;
  }
}
const statusText: Record<string, string> = {
  pending: '待审核',
  approved: '已加入',
  rejected: '已驳回',
  disabled: '已停用',
};
const roleText: Record<string, string> = {
  member: '组员',
  leader: '组长',
  admin: '活动管理员',
};
function canReview(row: ActivityEmployee) {
  return (
    props.activity.canReviewApplications &&
    row.status === 'pending' &&
    row.userId !== user.userInfo?.userId &&
    (tenantAdmin.value ||
      (props.activity.currentRole === 'admin' && row.role !== 'admin') ||
      (props.activity.currentRole === 'leader' &&
        row.role === 'member' &&
        !!props.myGroupId &&
        row.groupId === props.myGroupId))
  );
}
const selected = ref(new Map<string, ActivityEmployee>());
const selectedRows = computed(() => [...selected.value.values()]);
const batchOpen = ref(false);
const batchSaving = ref(false);
const batchAction = ref<'add' | 'adjust' | 'review' | 'status'>('add');
const addIds = ref<string[]>([]);
const pickerBusy = ref(false);
const batchForm = reactive({
  role: 'member' as ActivityRole,
  groupId: null as null | string,
  status: 'approved' as 'approved' | 'disabled',
  decision: 'approved' as 'approved' | 'rejected',
  remark: '',
});
const batchTitle = computed(
  () =>
    ({
      add: '批量添加活动员工',
      adjust: '批量调整角色与小组',
      status: batchForm.status === 'approved' ? '批量启用员工' : '批量停用员工',
      review:
        batchForm.decision === 'approved' ? '批量通过申请' : '批量驳回申请',
    })[batchAction.value],
);
const canAdjust = (row: ActivityEmployee) =>
  props.activity.canManageMembers &&
  (tenantAdmin.value || row.role !== 'admin') &&
  ['approved', 'disabled'].includes(row.status);
const canBatchAdjust = computed(
  () => selectedRows.value.length > 0 && selectedRows.value.every(canAdjust),
);
const canBatchReview = computed(
  () => selectedRows.value.length > 0 && selectedRows.value.every(canReview),
);
const rowSelection = computed(() => ({
  selectedRowKeys: [...selected.value.keys()],
  preserveSelectedRowKeys: true,
  onChange: (keys: (number | string)[]) => {
    if (keys.length > 1000) {
      message.warning('每次最多选择 1000 人');
      return;
    }
    const known = new Map([
      ...selected.value,
      ...items.value.map((row) => [row.userId, row] as const),
    ]);
    selected.value = new Map(
      keys.map(String).flatMap((key) => {
        const row = known.get(key);
        return row ? [[key, row] as const] : [];
      }),
    );
  },
  getCheckboxProps: (row: ActivityEmployee) => ({
    disabled: !canAdjust(row) && !canReview(row),
  }),
}));
function clearSelection() {
  selected.value = new Map();
}
function openBatch(
  action: typeof batchAction.value,
  value?: 'approved' | 'disabled' | 'rejected',
) {
  batchAction.value = action;
  addIds.value = [];
  pickerBusy.value = false;
  Object.assign(batchForm, {
    role: 'member',
    groupId: null,
    status: action === 'status' ? value : 'approved',
    decision: action === 'review' ? value : 'approved',
    remark: '',
  });
  batchOpen.value = true;
}
watch(
  () => batchForm.role,
  (value) => {
    if (value === 'admin') batchForm.groupId = null;
  },
);
async function saveBatch() {
  if (batchSaving.value || (batchAction.value === 'add' && pickerBusy.value))
    return;
  const ids =
    batchAction.value === 'add' ? addIds.value : [...selected.value.keys()];
  if (ids.length === 0) {
    message.warning('请先选择员工');
    return;
  }
  const action = batchAction.value;
  let data: EmployeeBatchInput;
  if (action === 'add' || action === 'adjust') {
    if (batchForm.role === 'leader' && !batchForm.groupId) {
      message.warning('请为组长选择小组');
      return;
    }
    data = {
      action,
      userIds: ids,
      role: batchForm.role,
      groupId: batchForm.groupId,
    };
  } else if (action === 'status')
    data = { action, userIds: ids, status: batchForm.status };
  else {
    if (batchForm.decision === 'rejected' && !batchForm.remark.trim()) {
      message.warning('请填写驳回原因');
      return;
    }
    data = {
      action,
      userIds: ids,
      decision: batchForm.decision,
      remark: batchForm.remark,
    };
  }
  batchSaving.value = true;
  try {
    const result = await batchActivityEmployees(props.activity.id, data);
    message.success(
      `已处理 ${result.changed} 人${result.skipped ? `，跳过已加入的 ${result.skipped} 人` : ''}`,
    );
    batchOpen.value = false;
    clearSelection();
    await load();
    emit('changed');
  } catch {
  } finally {
    batchSaving.value = false;
  }
}

let groupSerial = 0;
async function loadGroups() {
  const request = ++groupSerial;
  try {
    const result = await getActivityGroups(props.activity.id);
    if (request === groupSerial) groups.value = result.items;
  } catch {
    if (request === groupSerial) failed.value = true;
  }
}
async function refresh() {
  await Promise.all([load(), loadGroups()]);
}
watch(
  () => props.activity,
  () => {
    clearSelection();
    batchOpen.value = false;
    open.value = false;
    void refresh();
  },
);
onMounted(refresh);
</script>
<template>
  <div class="flex min-h-[480px] flex-col">
    <div class="mb-4 flex shrink-0 flex-wrap gap-3">
      <InputSearch
        v-model:value="keyword"
        placeholder="搜索姓名、手机号"
        allow-clear
        class="w-60"
        @search="search"
      />
      <Select
        v-model:value="status"
        placeholder="全部状态"
        allow-clear
        class="w-32"
        :options="
          Object.entries(statusText).map(([value, label]) => ({ value, label }))
        "
        @change="search"
      />
      <Select
        v-model:value="role"
        placeholder="全部角色"
        allow-clear
        class="w-36"
        :options="
          Object.entries(roleText).map(([value, label]) => ({ value, label }))
        "
        @change="search"
      />
      <Select
        v-model:value="groupId"
        placeholder="全部小组"
        allow-clear
        class="w-36"
        :options="groupOptions"
        @change="search"
      />
      <Button
        v-if="activity.canManageMembers"
        type="primary"
        @click="openBatch('add')"
      >
        批量添加员工
      </Button>
      <Button @click="refresh">刷新</Button>
    </div>
    <div
      v-if="activity.canManageMembers || activity.canReviewApplications"
      class="mb-3 flex flex-wrap items-center gap-2"
    >
      <span class="text-sm text-muted-foreground">已选 {{ selected.size }} 人</span>
      <Button size="small" :disabled="!selected.size" @click="clearSelection">
        清空选择
      </Button>
      <template v-if="activity.canManageMembers">
        <Button
          size="small"
          :disabled="!canBatchAdjust"
          @click="openBatch('adjust')"
        >
          批量调整
        </Button>
        <Button
          size="small"
          :disabled="!canBatchAdjust"
          @click="openBatch('status', 'approved')"
        >
          批量启用
        </Button>
        <Button
          size="small"
          danger
          :disabled="!canBatchAdjust"
          @click="openBatch('status', 'disabled')"
        >
          批量停用
        </Button>
      </template>
      <template v-if="activity.canReviewApplications">
        <Button
          size="small"
          :disabled="!canBatchReview"
          @click="openBatch('review', 'approved')"
        >
          批量通过
        </Button>
        <Button
          size="small"
          danger
          :disabled="!canBatchReview"
          @click="openBatch('review', 'rejected')"
        >
          批量驳回
        </Button>
      </template>
    </div>
    <Alert v-if="failed" type="error" message="活动员工加载失败" class="mb-3">
      <template #action><Button @click="refresh">重试</Button></template>
    </Alert>
    <div class="min-h-0 flex-1 overflow-auto">
      <Table
        row-key="userId"
        :data-source="items"
        :row-selection="
          activity.canManageMembers || activity.canReviewApplications
            ? rowSelection
            : undefined
        "
        :loading="loading"
        :pagination="false"
        :scroll="{ x: 900 }"
        :columns="[
          { title: '姓名', dataIndex: 'displayName', ellipsis: true },
          { title: '手机号', dataIndex: 'phone', width: 140 },
          { title: '活动角色', key: 'role', width: 120 },
          { title: '所属小组', dataIndex: 'groupName', width: 140 },
          { title: '状态', key: 'status', width: 100 },
          { title: '审核说明', dataIndex: 'reviewRemark', ellipsis: true },
          { title: '操作', key: 'actions', width: 150 },
        ]"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'role'">
            {{ roleText[record.role] }}
          </template>
          <Tag
            v-else-if="column.key === 'status'"
            :color="
              record.status === 'pending'
                ? 'processing'
                : record.status === 'approved'
                  ? 'success'
                  : 'default'
            "
          >
            {{ statusText[record.status] }}
          </Tag>
          <Space v-else-if="column.key === 'actions'" :size="0">
            <Button
              v-if="
                activity.canManageMembers &&
                (tenantAdmin || record.role !== 'admin') &&
                record.status !== 'pending'
              "
              type="link"
              @click="edit(record as ActivityEmployee)"
            >
              调整
            </Button>
            <Button
              v-if="canReview(record as ActivityEmployee)"
              type="link"
              @click="edit(record as ActivityEmployee, true)"
            >
              审核
            </Button>
          </Space>
        </template>
      </Table>
    </div>
    <div class="mt-4 flex shrink-0 justify-end border-t border-border pt-4">
      <Pagination
        :current="page"
        :page-size="pageSize"
        :total="total"
        show-size-changer
        :show-total="(n: number) => `共 ${n} 人`"
        @change="change"
      />
    </div>
    <Modal
      :open="open"
      :title="
        mode === 'review'
          ? '审核加入申请'
          : target
            ? '调整活动员工'
            : '指定活动员工'
      "
      :confirm-loading="saving"
      @ok="save"
      @cancel="open = false"
    >
      <Form layout="vertical">
        <FormItem label="员工" required>
          <Input
            v-if="target"
            :value="`${target.displayName} · ${target.phone}`"
            disabled
          />
        </FormItem>
        <FormItem v-if="mode === 'review'" label="审核结果">
          <Select
            v-model:value="form.decision"
            :options="[
              { label: '通过', value: 'approved' },
              { label: '驳回', value: 'rejected' },
            ]"
          />
        </FormItem>
        <FormItem label="活动角色">
          <Select
            v-model:value="form.role"
            :options="roleOptions"
            :disabled="activity.currentRole === 'leader' && !tenantAdmin"
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
            :options="groupOptions"
            :disabled="activity.currentRole === 'leader' && !tenantAdmin"
            @clear="form.groupId = null"
          />
        </FormItem>
        <FormItem v-if="mode === 'assign'" label="状态">
          <Select
            v-model:value="form.status"
            :options="[
              { label: '已加入', value: 'approved' },
              { label: '已停用', value: 'disabled' },
            ]"
          />
        </FormItem>
        <FormItem v-else label="审核说明">
          <Input.TextArea
            v-model:value="form.remark"
            :rows="3"
            :maxlength="1000"
          />
        </FormItem>
      </Form>
    </Modal>
    <Modal
      :open="batchOpen"
      :title="batchTitle"
      :width="batchAction === 'add' ? 820 : 520"
      :confirm-loading="batchSaving"
      :ok-button-props="{ disabled: batchAction === 'add' && pickerBusy }"
      :cancel-button-props="{ disabled: batchSaving }"
      :closable="!batchSaving"
      :mask-closable="false"
      ok-text="确认提交"
      @ok="saveBatch"
      @cancel="batchOpen = false"
    >
      <ActivityEmployeePicker
        v-if="batchAction === 'add'"
        v-model="addIds"
        v-model:busy="pickerBusy"
        :disabled="batchSaving"
        :activity-id="activity.id"
        :open="batchOpen"
      />
      <p v-else class="text-sm text-muted-foreground">
        已选 {{ selected.size }} 人
      </p>
      <Form layout="vertical" class="mt-4" :disabled="batchSaving">
        <template v-if="batchAction === 'add' || batchAction === 'adjust'">
          <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <FormItem label="活动角色" required>
              <Select v-model:value="batchForm.role" :options="roleOptions" />
            </FormItem>
            <FormItem
              v-if="batchForm.role !== 'admin'"
              label="所属小组"
              :required="batchForm.role === 'leader'"
            >
              <Select
                :value="batchForm.groupId || undefined"
                :options="groupOptions"
                allow-clear
                placeholder="不分组"
                @update:value="
                  batchForm.groupId = typeof $event === 'string' ? $event : null
                "
              />
            </FormItem>
          </div>
        </template>
        <FormItem
          v-if="batchAction === 'review'"
          :label="batchForm.decision === 'rejected' ? '驳回原因' : '审核说明'"
          :required="batchForm.decision === 'rejected'"
        >
          <Input.TextArea
            v-model:value="batchForm.remark"
            :rows="3"
            :maxlength="1000"
          />
        </FormItem>
      </Form>
    </Modal>
  </div>
</template>
