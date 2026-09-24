<script lang="ts" setup>
import type { SystemMenuApi } from '#/api';

import { computed, nextTick, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { createMenuApi, getMenuDetailApi, updateMenuApi } from '#/api';
import { $t } from '#/locales';

interface ModalData {
  id?: string;
  parentId?: string;
}
type FormValues = SystemMenuApi.MenuSaveParams;
const emits = defineEmits<{ success: [] }>();
const menuId = ref<string>();
const viewMode = ref(false);
const [Form, formApi] = useVbenForm<FormValues>({
  commonConfig: {
    componentProps: { class: 'w-full' },
    labelWidth: 'var(--qm-admin-form-label-width)',
  },
  layout: 'horizontal',
  schema: [
    {
      component: 'Input',
      fieldName: 'parentId',
      label: $t('system.menu.parentId'),
    },
    {
      component: 'Select',
      fieldName: 'menuType',
      label: $t('system.menu.type'),
      componentProps: {
        options: [
          { label: $t('system.menu.catalog'), value: 'CATALOG' },
          { label: $t('system.menu.menu'), value: 'MENU' },
          { label: $t('system.menu.button'), value: 'BUTTON' },
        ],
      },
      rules: 'required',
    },
    {
      component: 'Input',
      fieldName: 'name',
      label: $t('system.menu.name'),
      rules: 'required',
    },
    {
      component: 'Input',
      fieldName: 'title',
      label: $t('system.menu.title'),
      rules: 'required',
    },
    { component: 'Input', fieldName: 'path', label: $t('system.menu.path') },
    {
      component: 'Input',
      fieldName: 'component',
      label: $t('system.menu.component'),
    },
    {
      component: 'Input',
      fieldName: 'redirect',
      label: $t('system.menu.redirect'),
    },
    { component: 'Input', fieldName: 'icon', label: $t('system.menu.icon') },
    {
      component: 'InputNumber',
      fieldName: 'sort',
      label: $t('system.menu.sort'),
      defaultValue: 0,
    },
    {
      component: 'RadioGroup',
      fieldName: 'status',
      label: $t('system.menu.status'),
      defaultValue: 1,
      componentProps: {
        optionType: 'button',
        buttonStyle: 'solid',
        options: [
          { label: $t('system.menu.enabled'), value: 1 },
          { label: $t('system.menu.disabled'), value: 0 },
        ],
      },
    },
    {
      component: 'RadioGroup',
      fieldName: 'visible',
      label: $t('system.menu.visible'),
      defaultValue: 1,
      componentProps: {
        optionType: 'button',
        buttonStyle: 'solid',
        options: [
          { label: $t('system.menu.yes'), value: 1 },
          { label: $t('system.menu.no'), value: 0 },
        ],
      },
    },
    {
      component: 'Input',
      fieldName: 'authCode',
      label: $t('system.menu.authCode'),
    },
  ],
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2',
});
const [Modal, modalApi] = useVbenModal<ModalData>({
  centered: true,
  confirmText: $t('system.menu.save'),
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues();
    modalApi.lock();
    try {
      await (menuId.value
        ? updateMenuApi(menuId.value, values)
        : createMenuApi(values));
      message.success(
        menuId.value
          ? $t('system.menu.updateSuccess')
          : $t('system.menu.createSuccess'),
      );
      emits('success');
      await modalApi.close();
    } finally {
      modalApi.unlock();
    }
  },
  async onOpenChange(isOpen) {
    if (!isOpen) return;
    const data = modalApi.getData();
    menuId.value = data?.id;
    viewMode.value = false;
    await formApi.reset();
    if (!menuId.value) {
      await formApi.setValues({
        parentId: data?.parentId || '0',
        menuType: 'MENU',
        status: 1,
        visible: 1,
        sort: 0,
      });
      return;
    }
    const detail = await getMenuDetailApi(menuId.value);
    await nextTick();
    await formApi.setValues(detail);
  },
});
const title = computed(() =>
  menuId.value ? $t('system.menu.editTitle') : $t('system.menu.createTitle'),
);
defineExpose({ modalApi });
</script>
<template>
  <Modal
    :title="title"
    class="!w-[var(--qm-admin-modal-width)] !max-w-[var(--qm-admin-modal-max-width)]"
  >
    <Form />
  </Modal>
</template>
