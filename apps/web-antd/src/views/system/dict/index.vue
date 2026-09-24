<script lang="ts" setup>
import type { Dayjs } from 'dayjs';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SystemDictApi } from '#/api';

import { computed, ref } from 'vue';

import { useAccess } from '@vben/access';
import { Page, useVbenModal, VbenTableAction } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message, Modal, Space, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteDictApi, getDictPageApi } from '#/api';
import { $t } from '#/locales';

import { useColumns, useSearchFormSchema } from './data';
import FormModalComponent from './modules/form.vue';
import ItemsModalComponent from './modules/items.vue';
interface DictSearchValues {
  createTime?: [Dayjs, Dayjs];
  keyword?: string;
  status?: 0 | 1;
}
const { hasAccessByCodes } = useAccess();
const selectedCount = ref(0);
const canCreate = computed(() => hasAccessByCodes(['system:dict:create']));
const canUpdate = computed(() => hasAccessByCodes(['system:dict:update']));
const canDelete = computed(() => hasAccessByCodes(['system:dict:delete']));
const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: FormModalComponent,
  destroyOnClose: true,
});
const [ItemsModal, itemsModalApi] = useVbenModal({
  connectedComponent: ItemsModalComponent,
  destroyOnClose: true,
});
const [Grid, gridApi] = useVbenVxeGrid<
  SystemDictApi.DictListItem,
  DictSearchValues
>({
  formOptions: {
    actionWrapperClass: 'col-span-full',
    resetButtonOptions: { content: $t('system.dict.reset') },
    schema: useSearchFormSchema(),
    submitButtonOptions: { content: $t('system.dict.search') },
    submitOnEnter: true,
    wrapperClass: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
  },
  gridEvents: {
    checkboxAll: () => updateSelectedCount(),
    checkboxChange: () => updateSelectedCount(),
  },
  gridOptions: {
    checkboxConfig: { highlight: true },
    columns: useColumns(),
    height: 'auto',
    pagerConfig: { pageSize: 20, pageSizes: [20, 50, 100, 200] },
    proxyConfig: {
      ajax: {
        query: async ({ page, sort }, values) => {
          const time = values.createTime;
          const result = await getDictPageApi({
            endTime: time?.[1]?.endOf('day').format('YYYY-MM-DDTHH:mm:ss'),
            keyword: values.keyword?.trim() || undefined,
            pageNum: page.currentPage,
            pageSize: page.pageSize as 20 | 50 | 100 | 200,
            sortBy: (sort.field || 'createTime') as SystemDictApi.SortField,
            sortOrder: sort.order === 'asc' ? 'asc' : 'desc',
            startTime: time?.[0]?.startOf('day').format('YYYY-MM-DDTHH:mm:ss'),
            status: values.status,
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
    toolbarConfig: { custom: true, refresh: true, search: true, zoom: true },
  } as VxeTableGridOptions<SystemDictApi.DictListItem>,
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
function onEdit(row: SystemDictApi.DictListItem) {
  formModalApi.setData({ id: row.id }).open();
}
function onDetail(row: SystemDictApi.DictListItem) {
  formModalApi.setData({ id: row.id, view: 1 }).open();
}
function onItems(row: SystemDictApi.DictListItem) {
  itemsModalApi.setData({ id: row.id, name: row.dictName }).open();
}
function onDelete(row: SystemDictApi.DictListItem) {
  Modal.confirm({
    title: $t('system.dict.deleteConfirmTitle'),
    content: $t('system.dict.deleteConfirmContent', [row.dictName]),
    okButtonProps: { danger: true },
    okText: $t('system.dict.confirmDelete'),
    onOk: async () => {
      await deleteDictApi(row.id);
      message.success($t('system.dict.deleteSuccess'));
      onRefresh();
    },
  });
}
</script>
<template>
  <Page auto-content-height>
    <FormModal @success="onRefresh" /><ItemsModal /><Grid
      :table-title="$t('system.dict.listTitle')"
    >
      <template #toolbar-tools>
        <Space>
          <Button v-if="canCreate" type="primary" @click="onCreate">
            <Plus class="size-4" />{{ $t('system.dict.create') }}
          </Button>
        </Space>
</template><template #status="{ row }">
        <Tag :color="row.status === 1 ? 'success' : 'error'">
          {{
            row.status === 1
              ? $t('system.dict.enabled')
              : $t('system.dict.disabled')
          }}
        </Tag>
</template><template #action="{ row }">
        <VbenTableAction
          :actions="[
            {
              key: 'detail',
              text: $t('system.dict.detail'),
              onClick: () => onDetail(row),
            },
            {
              key: 'edit',
              text: $t('system.dict.edit'),
              ifShow: canUpdate,
              onClick: () => onEdit(row),
            },
            {
              key: 'items',
              text: $t('system.dict.manageItems'),
              ifShow: canUpdate,
              onClick: () => onItems(row),
            },
            {
              key: 'delete',
              text: $t('system.dict.delete'),
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
