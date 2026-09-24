<script lang="ts" setup>
import type { SystemDictApi } from '#/api';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm, z } from '#/adapter/form';
import { createDictItemApi, updateDictItemApi } from '#/api';
import { $t } from '#/locales';
interface ModalData {
  dictId: string;
  item?: SystemDictApi.DictItem;
}
const emits = defineEmits<{ success: [] }>();
const dictId = ref<string>();
const itemId = ref<string>();
const [Form, formApi] = useVbenForm<SystemDictApi.DictItemSaveParams>({
  commonConfig: {
    componentProps: { class: 'w-full' },
    labelWidth: 'var(--qm-admin-form-label-width)',
  },
  layout: 'horizontal',
  schema: [
    {
      component: 'Input',
      fieldName: 'itemName',
      label: $t('system.dict.itemName'),
      rules: z.string().min(1, $t('system.dict.itemNameRequired')).max(64),
    },
    {
      component: 'Input',
      fieldName: 'itemCode',
      label: $t('system.dict.itemCode'),
      rules: z.string().min(1, $t('system.dict.itemCodeRequired')).max(64),
    },
    {
      component: 'InputNumber',
      componentProps: { min: 0, max: 999_999, class: 'w-full' },
      fieldName: 'sort',
      label: $t('system.dict.sort'),
    },
    { component: 'Input', fieldName: 'color', label: $t('system.dict.color') },
    { component: 'Input', fieldName: 'icon', label: $t('system.dict.icon') },
    {
      component: 'RadioGroup',
      componentProps: {
        buttonStyle: 'solid',
        optionType: 'button',
        options: [
          { label: $t('system.dict.enabled'), value: 1 },
          { label: $t('system.dict.disabled'), value: 0 },
        ],
      },
      defaultValue: 1,
      fieldName: 'status',
      label: $t('system.dict.status'),
    },
  ],
  showDefaultActions: false,
});
const [Modal, modalApi] = useVbenModal<ModalData>({
  centered: true,
  confirmText: $t('system.dict.save'),
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues();
    const currentDictId = dictId.value;
    if (!currentDictId) return;
    const currentItemId = itemId.value;
    modalApi.lock();
    try {
      await (currentItemId
        ? updateDictItemApi(currentDictId, currentItemId, values)
        : createDictItemApi(currentDictId, values));
      message.success($t('system.dict.itemSaveSuccess'));
      emits('success');
      await modalApi.close();
    } finally {
      modalApi.unlock();
    }
  },
  async onOpenChange(isOpen) {
    if (!isOpen) return;
    const data = modalApi.getData();
    if (!data) return;
    dictId.value = data.dictId;
    itemId.value = data.item?.id;
    await formApi.reset();
    if (data.item) await formApi.setValues(data.item);
  },
});
defineExpose({ modalApi });
</script>
<template>
  <Modal
    :title="
      itemId
        ? $t('system.dict.editItemTitle')
        : $t('system.dict.createItemTitle')
    "
    class="!w-[var(--qm-admin-modal-width)] !max-w-[var(--qm-admin-modal-max-width)] !min-h-[var(--qm-admin-modal-min-height)]"
  >
    <Form />
  </Modal>
</template>
