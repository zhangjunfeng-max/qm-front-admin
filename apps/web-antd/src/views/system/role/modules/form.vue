<script lang="ts" setup>
import type { SystemRoleApi } from '#/api';

import { computed, nextTick, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { createRoleApi, getRoleDetailApi, updateRoleApi } from '#/api';
import { $t } from '#/locales';
import { formatDateTimeToMinute } from '#/utils/date';

import { useRoleFormSchema } from '../data';

interface ModalData {
  id?: string;
  view?: 1;
}

type RoleFormValues = SystemRoleApi.RoleSaveParams & {
  createTime?: string;
  updateTime?: string;
};

const emits = defineEmits<{ success: [] }>();
const roleId = ref<string>();
const viewMode = ref(false);

const [Form, formApi] = useVbenForm<RoleFormValues>({
  commonConfig: {
    componentProps: { class: 'w-full' },
    labelWidth: 'var(--qm-admin-form-label-width)',
  },
  layout: 'horizontal',
  schema: useRoleFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2',
});

const [Modal, modalApi] = useVbenModal<ModalData>({
  centered: true,
  confirmText: $t('system.role.save'),
  fullscreenButton: false,
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
      if (roleId.value) {
        const {
          createTime: _createTime,
          roleCode: _roleCode,
          updateTime: _updateTime,
          ...updateValues
        } = values;
        await updateRoleApi(roleId.value, updateValues);
        message.success($t('system.role.updateSuccess'));
      } else {
        await createRoleApi(values);
        message.success($t('system.role.createSuccess'));
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
    roleId.value = data?.id;
    viewMode.value = data?.view === 1 && Boolean(roleId.value);
    modalApi.setState({
      cancelText: viewMode.value
        ? $t('system.role.close')
        : $t('common.cancel'),
      loading: Boolean(roleId.value),
      showConfirmButton: !viewMode.value,
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
        componentProps: { disabled: Boolean(roleId.value) },
        fieldName: 'roleCode',
      },
      {
        componentProps: {
          maxlength: 500,
          rows: 4,
          showCount: !viewMode.value,
        },
        fieldName: 'remark',
      },
      { fieldName: 'createTime', hide: !viewMode.value },
      { fieldName: 'updateTime', hide: !viewMode.value },
    ]);
    try {
      if (roleId.value) {
        const detail = await getRoleDetailApi(roleId.value);
        await nextTick();
        await formApi.setValues({
          createTime: formatDateTimeToMinute(detail.createTime),
          remark: viewMode.value ? detail.remark || '-' : detail.remark,
          roleCode: detail.roleCode,
          roleName: detail.roleName,
          status: detail.status,
          updateTime: formatDateTimeToMinute(detail.updateTime),
        });
      }
    } finally {
      modalApi.setState({ loading: false });
    }
  },
});

const title = computed(() => {
  if (viewMode.value) return $t('system.role.detailTitle');
  return roleId.value
    ? $t('system.role.editTitle')
    : $t('system.role.createTitle');
});

defineExpose({ modalApi });
</script>

<template>
  <Modal
    :title="title"
    class="!w-[var(--qm-admin-modal-width)] !max-w-[var(--qm-admin-modal-max-width)] !min-h-[var(--qm-admin-modal-min-height)]"
  >
    <div :class="{ 'qm-admin-form-view': viewMode }">
      <Form />
    </div>
  </Modal>
</template>
