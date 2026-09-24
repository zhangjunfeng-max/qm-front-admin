<script lang="ts" setup>
import type { SystemDictApi } from '#/api';

import { computed, nextTick, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { createDictApi, getDictDetailApi, updateDictApi } from '#/api';
import { $t } from '#/locales';

import { useDictFormSchema } from '../data';
interface ModalData {
  id?: string;
  view?: 1;
}
const emits = defineEmits<{ success: [] }>();
const dictId = ref<string>();
const viewMode = ref(false);
const [Form, formApi] = useVbenForm<SystemDictApi.DictSaveParams>({
  commonConfig: {
    componentProps: { class: 'w-full' },
    labelWidth: 'var(--qm-admin-form-label-width)',
  },
  layout: 'horizontal',
  schema: useDictFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2',
});
const [Modal, modalApi] = useVbenModal<ModalData>({
  centered: true,
  confirmText: $t('system.dict.save'),
  async onConfirm() {
    if (viewMode.value) {
      await modalApi.close();
      return;
    }
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues();
    modalApi.lock();
    try {
      if (dictId.value) {
        const { dictCode: _dictCode, ...updateValues } = values;
        await updateDictApi(dictId.value, updateValues);
        message.success($t('system.dict.updateSuccess'));
      } else {
        await createDictApi(values);
        message.success($t('system.dict.createSuccess'));
      }
      emits('success');
      await modalApi.close();
    } finally {
      modalApi.unlock();
    }
  },
  async onOpenChange(isOpen) {
    if (!isOpen) return;
    const data = modalApi.getData();
    dictId.value = data?.id;
    viewMode.value = data?.view === 1 && Boolean(dictId.value);
    modalApi.setState({
      showConfirmButton: !viewMode.value,
      cancelText: viewMode.value
        ? $t('system.dict.close')
        : $t('common.cancel'),
      loading: Boolean(dictId.value),
    });
    await formApi.reset();
    formApi.setState({
      commonConfig: {
        disabled: viewMode.value,
        hideRequiredMark: viewMode.value,
      },
    });
    formApi.updateSchema([
      {
        componentProps: { disabled: Boolean(dictId.value) },
        fieldName: 'dictCode',
      },
    ]);
    if (dictId.value) {
      const detail = await getDictDetailApi(dictId.value);
      await nextTick();
      await formApi.setValues(detail);
    }
    modalApi.setState({ loading: false });
  },
});
const title = computed(() => {
  if (viewMode.value) return $t('system.dict.detailTitle');
  return dictId.value
    ? $t('system.dict.editTitle')
    : $t('system.dict.createTitle');
});
defineExpose({ modalApi });
</script>
<template>
  <Modal
    :title="title"
    class="!w-[var(--qm-admin-modal-width)] !max-w-[var(--qm-admin-modal-max-width)] !min-h-[var(--qm-admin-modal-min-height)]"
  >
    <Form />
  </Modal>
</template>
