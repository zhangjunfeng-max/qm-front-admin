<script lang="ts" setup>
import type { SystemDictApi } from '#/api';

import { computed, ref } from 'vue';

import { useVbenModal, VbenTableAction } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, Empty, message, Modal, Table, Tag } from 'ant-design-vue';

import {
  batchDeleteDictItemsApi,
  deleteDictItemApi,
  getDictItemsApi,
} from '#/api';
import { $t } from '#/locales';

import ItemFormComponent from './item-form.vue';
interface ModalData {
  id: string;
  name: string;
}
const dictId = ref<string>();
const dictName = ref('');
const items = ref<SystemDictApi.DictItem[]>([]);
const loading = ref(false);
const selectedItemIds = ref<string[]>([]);
const [ItemForm, itemFormApi] = useVbenModal({
  connectedComponent: ItemFormComponent,
  destroyOnClose: true,
});
const columns = [
  { title: $t('system.dict.itemName'), dataIndex: 'itemName', key: 'itemName' },
  { title: $t('system.dict.itemCode'), dataIndex: 'itemCode', key: 'itemCode' },
  { title: $t('system.dict.sort'), dataIndex: 'sort', key: 'sort', width: 90 },
  {
    title: $t('system.dict.color'),
    dataIndex: 'color',
    key: 'color',
    width: 110,
  },
  { title: $t('system.dict.icon'), dataIndex: 'icon', key: 'icon' },
  { title: $t('system.dict.status'), key: 'status', width: 100 },
  { title: $t('system.dict.operation'), key: 'operation', width: 150 },
];
const [ModalComponent, modalApi] = useVbenModal<ModalData>({
  centered: true,
  fullscreenButton: false,
  async onOpenChange(isOpen) {
    if (!isOpen) return;
    const data = modalApi.getData();
    if (!data) return;
    modalApi.setState({
      cancelText: $t('system.dict.close'),
      showConfirmButton: false,
    });
    dictId.value = data.id;
    dictName.value = data.name;
    await reload();
  },
});
async function reload() {
  if (!dictId.value) return;
  loading.value = true;
  selectedItemIds.value = [];
  try {
    items.value = await getDictItemsApi(dictId.value);
  } finally {
    loading.value = false;
  }
}
function onSelectionChange(keys: (number | string)[]) {
  selectedItemIds.value = keys.map(String);
}
function onCreate() {
  const currentDictId = dictId.value;
  if (!currentDictId) return;
  itemFormApi.setData({ dictId: currentDictId }).open();
}
function onEdit(item: SystemDictApi.DictItem) {
  const currentDictId = dictId.value;
  if (!currentDictId) return;
  itemFormApi.setData({ dictId: currentDictId, item }).open();
}
function onDelete(item: SystemDictApi.DictItem) {
  const currentDictId = dictId.value;
  if (!currentDictId) return;
  Modal.confirm({
    title: $t('system.dict.deleteItemConfirmTitle'),
    content: $t('system.dict.deleteItemConfirmContent', [item.itemName]),
    okButtonProps: { danger: true },
    okText: $t('system.dict.confirmDelete'),
    onOk: async () => {
      await deleteDictItemApi(currentDictId, item.id);
      await reload();
    },
  });
}
function onBatchDelete() {
  const currentDictId = dictId.value;
  if (!currentDictId || selectedItemIds.value.length === 0) {
    message.warning($t('system.dict.selectDeleteItems'));
    return;
  }
  Modal.confirm({
    title: $t('system.dict.batchDeleteItemsConfirmTitle'),
    content: $t('system.dict.batchDeleteItemsConfirmContent', [
      selectedItemIds.value.length,
    ]),
    okButtonProps: { danger: true },
    okText: $t('system.dict.confirmDelete'),
    onOk: async () => {
      await batchDeleteDictItemsApi(currentDictId, selectedItemIds.value);
      message.success(
        $t('system.dict.batchDeleteItemsSuccess', [
          selectedItemIds.value.length,
        ]),
      );
      await reload();
    },
  });
}
const rowSelection = computed(() => ({
  selectedRowKeys: selectedItemIds.value,
  onChange: onSelectionChange,
}));
defineExpose({ modalApi });
</script>
<template>
  <ModalComponent
    :title="dictName"
    class="!w-[var(--qm-admin-modal-width)] !max-w-[var(--qm-admin-modal-max-width)] !min-h-[var(--qm-admin-modal-min-height)]"
  >
    <ItemForm @success="reload" />
    <div class="mb-3 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Button
          v-if="selectedItemIds.length > 0"
          danger
          size="small"
          @click="onBatchDelete"
        >
          {{ $t('system.dict.batchDeleteItems') }}
          ({{ selectedItemIds.length }})
        </Button>
        <span
          v-if="selectedItemIds.length > 0"
          class="text-muted-foreground text-sm"
        >
          {{ $t('system.dict.selectedItems', [selectedItemIds.length]) }}
        </span>
      </div>
      <Button size="small" type="primary" @click="onCreate">
        <Plus class="size-4" />
        {{ $t('system.dict.createItem') }}
      </Button>
    </div>
    <Empty
      v-if="!loading && items.length === 0"
      :description="$t('system.dict.noItems')"
    /><Table
      v-else
      :columns="columns"
      :data-source="items"
      :loading="loading"
      :pagination="false"
      row-key="id"
      :row-selection="rowSelection"
      :scroll="{ y: 500 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <Tag :color="record.status === 1 ? 'success' : 'error'">
            {{
              record.status === 1
                ? $t('system.dict.enabled')
                : $t('system.dict.disabled')
            }}
          </Tag>
</template><template v-else-if="column.key === 'operation'">
          <VbenTableAction
            :actions="[
              {
                key: 'edit',
                text: $t('system.dict.edit'),
                onClick: () => onEdit(record as SystemDictApi.DictItem),
              },
              {
                key: 'delete',
                text: $t('system.dict.delete'),
                danger: true,
                onClick: () => onDelete(record as SystemDictApi.DictItem),
              },
            ]"
            align="center"
            divider
          />
        </template>
      </template>
    </Table>
  </ModalComponent>
</template>
