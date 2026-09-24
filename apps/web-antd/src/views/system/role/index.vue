<script lang="ts" setup>
import type { Dayjs } from 'dayjs';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SystemRoleApi } from '#/api';

import { computed, ref } from 'vue';

import { useAccess } from '@vben/access';
import { Page, useVbenModal, VbenTableAction } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message, Modal, Space, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { batchDeleteRolesApi, deleteRoleApi, getRolePageApi } from '#/api';
import { $t } from '#/locales';

import { useColumns, useSearchFormSchema } from './data';
import AssignMenusModalComponent from './modules/assign-menus.vue';
import FormModalComponent from './modules/form.vue';

interface RoleSearchValues {
  createTime?: [Dayjs, Dayjs];
  keyword?: string;
  status?: 0 | 1;
}

const { hasAccessByCodes } = useAccess();
const selectedCount = ref(0);

const canCreate = computed(() => hasAccessByCodes(['system:role:create']));
const canUpdate = computed(() => hasAccessByCodes(['system:role:update']));
const canDelete = computed(() => hasAccessByCodes(['system:role:delete']));

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: FormModalComponent,
  destroyOnClose: true,
});
const [AssignMenusModal, assignMenusModalApi] = useVbenModal({
  connectedComponent: AssignMenusModalComponent,
  destroyOnClose: true,
});

const [Grid, gridApi] = useVbenVxeGrid<
  SystemRoleApi.RoleListItem,
  RoleSearchValues
>({
  formOptions: {
    actionWrapperClass: 'col-span-full',
    resetButtonOptions: { content: $t('system.role.reset') },
    schema: useSearchFormSchema(),
    submitButtonOptions: { content: $t('system.role.search') },
    submitOnEnter: true,
    wrapperClass: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
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
    checkboxConfig: { highlight: true },
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
          const result = await getRolePageApi({
            endTime: createTime?.[1]
              ?.endOf('day')
              .format('YYYY-MM-DDTHH:mm:ss'),
            keyword: formValues.keyword?.trim() || undefined,
            pageNum: page.currentPage,
            pageSize: page.pageSize as 20 | 50 | 100 | 200,
            sortBy: (sort.field || 'createTime') as SystemRoleApi.SortField,
            sortOrder: sort.order === 'asc' ? 'asc' : 'desc',
            startTime: createTime?.[0]
              ?.startOf('day')
              .format('YYYY-MM-DDTHH:mm:ss'),
            status: formValues.status,
          });
          return { items: result.records, total: result.total };
        },
      },
    },
    rowConfig: { keyField: 'id' },
    sortConfig: {
      defaultSort: { field: 'createTime', order: 'desc' },
      remote: true,
    },
    toolbarConfig: {
      custom: true,
      refresh: true,
      search: true,
      zoom: true,
    },
  } as VxeTableGridOptions<SystemRoleApi.RoleListItem>,
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

function onEdit(row: SystemRoleApi.RoleListItem) {
  formModalApi.setData({ id: row.id }).open();
}

function onDetail(row: SystemRoleApi.RoleListItem) {
  formModalApi.setData({ id: row.id, view: 1 }).open();
}

function onAssignMenus(row: SystemRoleApi.RoleListItem) {
  assignMenusModalApi.setData({ id: row.id }).open();
}

async function deleteRows(rows: SystemRoleApi.RoleListItem[]) {
  const firstRow = rows[0];
  await (rows.length === 1 && firstRow
    ? deleteRoleApi(firstRow.id)
    : batchDeleteRolesApi(rows.map((row) => row.id)));
  message.success(
    rows.length === 1
      ? $t('system.role.deleteSuccess')
      : $t('system.role.batchDeleteSuccess', [rows.length]),
  );
  onRefresh();
}

function onDelete(row: SystemRoleApi.RoleListItem) {
  Modal.confirm({
    content: $t('system.role.deleteConfirmContent', [row.roleName]),
    okButtonProps: { danger: true },
    okText: $t('system.role.confirmDelete'),
    onOk: () => deleteRows([row]),
    title: $t('system.role.deleteConfirmTitle'),
  });
}

function onBatchDelete() {
  const rows = gridApi.grid.getCheckboxRecords();
  if (rows.length === 0) {
    message.warning($t('system.role.selectDeleteRoles'));
    return;
  }
  Modal.confirm({
    content: $t('system.role.batchDeleteConfirmContent', [rows.length]),
    okButtonProps: { danger: true },
    okText: $t('system.role.confirmDelete'),
    onOk: () => deleteRows(rows),
    title: $t('system.role.batchDeleteConfirmTitle'),
  });
}
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="onRefresh" />
    <AssignMenusModal />
    <Grid :table-title="$t('system.role.listTitle')">
      <template #toolbar-tools>
        <Space>
          <Button
            v-if="canDelete"
            danger
            :disabled="selectedCount === 0"
            @click="onBatchDelete"
          >
            {{ $t('system.role.batchDelete') }}
            <span v-if="selectedCount > 0">({{ selectedCount }})</span>
          </Button>
          <Button v-if="canCreate" type="primary" @click="onCreate">
            <Plus class="size-4" />
            {{ $t('system.role.create') }}
          </Button>
        </Space>
      </template>
      <template #status="{ row }">
        <Tag :color="row.status === 1 ? 'success' : 'error'">
          {{
            row.status === 1
              ? $t('system.role.enabled')
              : $t('system.role.disabled')
          }}
        </Tag>
      </template>
      <template #action="{ row }">
        <VbenTableAction
          :actions="[
            {
              key: 'detail',
              text: $t('system.role.detail'),
              onClick: () => onDetail(row),
            },
            {
              key: 'edit',
              text: $t('system.role.edit'),
              ifShow: canUpdate,
              onClick: () => onEdit(row),
            },
            {
              key: 'assign-menus',
              text: $t('system.role.assignMenus'),
              ifShow: canUpdate,
              onClick: () => onAssignMenus(row),
            },
            {
              danger: true,
              key: 'delete',
              text: $t('system.role.delete'),
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
