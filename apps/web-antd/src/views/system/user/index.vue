<script lang="ts" setup>
import type { Dayjs } from 'dayjs';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SystemUserApi } from '#/api';

import { computed, ref } from 'vue';

import { useAccess } from '@vben/access';
import { Page, useVbenModal, VbenTableAction } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message, Modal, Space, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { batchDeleteUsersApi, deleteUserApi, getUserPageApi } from '#/api';
import { $t } from '#/locales';

import { useColumns, useSearchFormSchema } from './data';
import AssignRolesModalComponent from './modules/assign-roles.vue';
import FormModalComponent from './modules/form.vue';

interface UserSearchValues {
  accountStatus?: 0 | 1;
  createTime?: [Dayjs, Dayjs];
  isTenantAdmin?: 0 | 1;
  keyword?: string;
  memberStatus?: 0 | 1;
}

const { hasAccessByCodes } = useAccess();
const selectedCount = ref(0);

const canCreate = computed(() => hasAccessByCodes(['system:user:create']));
const canUpdate = computed(() => hasAccessByCodes(['system:user:update']));
const canDelete = computed(() => hasAccessByCodes(['system:user:delete']));

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: FormModalComponent,
  destroyOnClose: true,
});
const [AssignRolesModal, assignRolesModalApi] = useVbenModal({
  connectedComponent: AssignRolesModalComponent,
  destroyOnClose: true,
});

const [Grid, gridApi] = useVbenVxeGrid<
  SystemUserApi.UserListItem,
  UserSearchValues
>({
  formOptions: {
    actionWrapperClass: 'col-span-full',
    resetButtonOptions: {
      content: $t('system.user.reset'),
    },
    schema: useSearchFormSchema(),
    submitButtonOptions: {
      content: $t('system.user.search'),
    },
    submitOnEnter: true,
    wrapperClass: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5',
  },
  gridEvents: {
    checkboxAll() {
      updateSelectedCount();
    },
    checkboxChange() {
      updateSelectedCount();
    },
  },
  gridOptions: {
    checkboxConfig: {
      highlight: true,
    },
    columns: useColumns(),
    height: 'auto',
    keepSource: true,
    pagerConfig: {
      pageSize: 20,
      pageSizes: [20, 50, 100, 200],
    },
    proxyConfig: {
      ajax: {
        query: async ({ page, sort }, formValues) => {
          const createTime = formValues.createTime;
          const result = await getUserPageApi({
            accountStatus: formValues.accountStatus,
            endTime: createTime?.[1]
              ?.endOf('day')
              .format('YYYY-MM-DDTHH:mm:ss'),
            isTenantAdmin: formValues.isTenantAdmin,
            keyword: formValues.keyword?.trim() || undefined,
            memberStatus: formValues.memberStatus,
            pageNum: page.currentPage,
            pageSize: page.pageSize as 20 | 50 | 100 | 200,
            sortBy: (sort.field || 'createTime') as SystemUserApi.SortField,
            sortOrder: sort.order === 'asc' ? 'asc' : 'desc',
            startTime: createTime?.[0]
              ?.startOf('day')
              .format('YYYY-MM-DDTHH:mm:ss'),
          });
          return {
            items: result.records,
            total: result.total,
          };
        },
      },
    },
    rowConfig: {
      keyField: 'id',
    },
    sortConfig: {
      defaultSort: {
        field: 'createTime',
        order: 'desc',
      },
      remote: true,
    },
    toolbarConfig: {
      custom: true,
      refresh: true,
      search: true,
      zoom: true,
    },
  } as VxeTableGridOptions<SystemUserApi.UserListItem>,
});

function updateSelectedCount() {
  selectedCount.value = gridApi.grid.getCheckboxRecords().length;
}

function onRefresh() {
  selectedCount.value = 0;
  gridApi.reload();
}

function onCreate() {
  formModalApi.setData({}).open();
}

function onEdit(row: SystemUserApi.UserListItem) {
  formModalApi.setData({ id: row.id }).open();
}

function onDetail(row: SystemUserApi.UserListItem) {
  formModalApi.setData({ id: row.id, view: 1 }).open();
}

function onAssignRoles(row: SystemUserApi.UserListItem) {
  assignRolesModalApi.setData({ id: row.id }).open();
}

async function deleteRows(rows: SystemUserApi.UserListItem[]) {
  const firstRow = rows[0];
  await (rows.length === 1 && firstRow
    ? deleteUserApi(firstRow.id)
    : batchDeleteUsersApi(rows.map((row) => row.id)));
  message.success(
    rows.length === 1
      ? $t('system.user.deleteSuccess')
      : $t('system.user.batchDeleteSuccess', [rows.length]),
  );
  onRefresh();
}

function onDelete(row: SystemUserApi.UserListItem) {
  Modal.confirm({
    content: $t('system.user.deleteConfirmContent', [row.username]),
    okButtonProps: { danger: true },
    okText: $t('system.user.confirmDelete'),
    onOk: () => deleteRows([row]),
    title: $t('system.user.deleteConfirmTitle'),
  });
}

function onBatchDelete() {
  const rows = gridApi.grid.getCheckboxRecords();
  if (rows.length === 0) {
    message.warning($t('system.user.selectDeleteUsers'));
    return;
  }
  Modal.confirm({
    content: $t('system.user.batchDeleteConfirmContent', [rows.length]),
    okButtonProps: { danger: true },
    okText: $t('system.user.confirmDelete'),
    onOk: () => deleteRows(rows),
    title: $t('system.user.batchDeleteConfirmTitle'),
  });
}
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="onRefresh" />
    <AssignRolesModal />
    <Grid :table-title="$t('system.user.listTitle')">
      <template #toolbar-tools>
        <Space>
          <Button
            v-if="canDelete"
            danger
            :disabled="selectedCount === 0"
            @click="onBatchDelete"
          >
            {{ $t('system.user.batchDelete') }}
            <span v-if="selectedCount > 0">({{ selectedCount }})</span>
          </Button>
          <Button v-if="canCreate" type="primary" @click="onCreate">
            <Plus class="size-4" />
            {{ $t('system.user.create') }}
          </Button>
        </Space>
      </template>
      <template #tenantAdmin="{ row }">
        <Tag :color="row.isTenantAdmin === 1 ? 'blue' : 'default'">
          {{
            row.isTenantAdmin === 1
              ? $t('system.user.yes')
              : $t('system.user.no')
          }}
        </Tag>
      </template>
      <template #accountStatus="{ row }">
        <Tag :color="row.accountStatus === 1 ? 'success' : 'error'">
          {{
            row.accountStatus === 1
              ? $t('system.user.enabled')
              : $t('system.user.disabled')
          }}
        </Tag>
      </template>
      <template #memberStatus="{ row }">
        <Tag :color="row.memberStatus === 1 ? 'success' : 'warning'">
          {{
            row.memberStatus === 1
              ? $t('system.user.enabled')
              : $t('system.user.disabled')
          }}
        </Tag>
      </template>
      <template #action="{ row }">
        <VbenTableAction
          :actions="[
            {
              key: 'detail',
              text: $t('system.user.detail'),
              onClick: () => onDetail(row),
            },
            {
              key: 'edit',
              text: $t('system.user.edit'),
              ifShow: canUpdate,
              onClick: () => onEdit(row),
            },
            {
              key: 'assign-roles',
              text: $t('system.user.assignRoles'),
              ifShow: canUpdate,
              onClick: () => onAssignRoles(row),
            },
            {
              danger: true,
              key: 'delete',
              text: $t('system.user.delete'),
              ifShow: canDelete,
              onClick: () => onDelete(row),
            },
          ]"
          align="center"
          divider
        />
      </template>
    </Grid>
  </Page>
</template>
