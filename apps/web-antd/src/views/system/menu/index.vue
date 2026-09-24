<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SystemMenuApi } from '#/api';

import { computed, onMounted } from 'vue';

import { useAccess } from '@vben/access';
import { Page, useVbenModal, VbenTableAction } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message, Modal, Space, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteMenuApi, getMenuChildrenApi } from '#/api';
import { $t } from '#/locales';

import FormModalComponent from './modules/form.vue';

const { hasAccessByCodes } = useAccess();
const canCreate = computed(() => hasAccessByCodes(['system:menu:create']));
const canUpdate = computed(() => hasAccessByCodes(['system:menu:update']));
const canDelete = computed(() => hasAccessByCodes(['system:menu:delete']));
const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: FormModalComponent,
  destroyOnClose: true,
});
const menuTypeLabels: Record<SystemMenuApi.MenuType, string> = {
  BUTTON: $t('system.menu.button'),
  CATALOG: $t('system.menu.catalog'),
  MENU: $t('system.menu.menu'),
};
const columns: VxeTableGridOptions<SystemMenuApi.MenuItem>['columns'] = [
  {
    field: 'title',
    minWidth: 280,
    slots: { default: 'title' },
    title: $t('system.menu.name'),
    treeNode: true,
  },
  {
    field: 'menuType',
    slots: { default: 'type' },
    title: $t('system.menu.type'),
    width: 120,
  },
  {
    field: 'path',
    minWidth: 220,
    showOverflow: true,
    title: $t('system.menu.path'),
  },
  {
    field: 'authCode',
    minWidth: 220,
    showOverflow: true,
    slots: { default: 'authCode' },
    title: $t('system.menu.authCode'),
  },
  {
    field: 'status',
    slots: { default: 'status' },
    title: $t('system.menu.status'),
    width: 100,
  },
  { field: 'sort', title: $t('system.menu.sort'), width: 80 },
  {
    field: 'operation',
    fixed: 'right',
    slots: { default: 'action' },
    title: $t('system.menu.operation'),
    width: 220,
  },
];
const [Grid, gridApi] = useVbenVxeGrid<SystemMenuApi.MenuItem>({
  gridOptions: {
    columns,
    height: '100%',
    keepSource: true,
    pagerConfig: { enabled: false },
    rowConfig: { keyField: 'id' },
    treeConfig: {
      hasChild: 'hasChildren',
      lazy: true,
      loadMethod: async ({ row }) => getMenuChildrenApi({ parentId: row.id }),
      parentField: 'parentId',
      rowField: 'id',
      transform: true,
    },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<SystemMenuApi.MenuItem>,
});

onMounted(async () => {
  const items = await getMenuChildrenApi({ parentId: '0' });
  await gridApi.grid.loadData(items);
});
function onRefresh() {
  gridApi.reload();
}
function onCreate(parentId = '0') {
  formModalApi.setData({ parentId }).open();
}
function onEdit(row: SystemMenuApi.MenuItem) {
  formModalApi.setData({ id: row.id }).open();
}
function onDelete(row: SystemMenuApi.MenuItem) {
  Modal.confirm({
    content: $t('system.menu.deleteConfirmContent', [row.title]),
    okButtonProps: { danger: true },
    okText: $t('system.menu.confirmDelete'),
    onOk: async () => {
      await deleteMenuApi(row.id);
      message.success($t('system.menu.deleteSuccess'));
      onRefresh();
    },
    title: $t('system.menu.deleteConfirmTitle'),
  });
}
</script>
<template>
  <Page auto-content-height>
    <FormModal @success="onRefresh" />
    <Grid class="h-full min-h-0" :table-title="$t('system.menu.listTitle')">
      <template #toolbar-tools>
        <Space>
          <Button v-if="canCreate" type="primary" @click="onCreate()">
            <Plus class="size-4" />{{ $t('system.menu.create') }}
          </Button>
        </Space>
      </template>
      <template #title="{ row }">{{ row.title }}</template>
      <template #type="{ row }">
        {{ menuTypeLabels[row.menuType] ?? row.menuType }}
      </template>
      <template #authCode="{ row }">{{ row.authCode || '-' }}</template>
      <template #status="{ row }">
        <Tag :color="row.status === 1 ? 'success' : 'error'">
          {{
            row.status === 1
              ? $t('system.menu.enabled')
              : $t('system.menu.disabled')
          }}
        </Tag>
      </template>
      <template #action="{ row }">
        <VbenTableAction
          :actions="[
            {
              key: 'add',
              text: $t('system.menu.addChild'),
              ifShow: canCreate && row.menuType !== 'BUTTON',
              onClick: () => onCreate(row.id),
            },
            {
              key: 'edit',
              text: $t('system.menu.edit'),
              ifShow: canUpdate,
              onClick: () => onEdit(row),
            },
            {
              key: 'delete',
              text: $t('system.menu.delete'),
              danger: true,
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
