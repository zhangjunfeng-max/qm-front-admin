<script lang="ts" setup>
import type { SystemUserApi } from '#/api';

import { computed, nextTick, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { createUserApi, getUserDetailApi, updateUserApi } from '#/api';
import { $t } from '#/locales';
import { formatDateTimeToMinute } from '#/utils/date';

import { useUserFormSchema } from '../data';

interface ModalData {
  id?: string;
  view?: 1;
}

type UserFormValues = SystemUserApi.UserSaveParams & {
  createTime?: string;
  updateTime?: string;
};

const emits = defineEmits<{ success: [] }>();
const userId = ref<string>();
const viewMode = ref(false);

const [Form, formApi] = useVbenForm<UserFormValues>({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
    labelWidth: 'var(--qm-admin-form-label-width)',
  },
  layout: 'horizontal',
  schema: useUserFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2',
});

const [Modal, modalApi] = useVbenModal<ModalData>({
  centered: true,
  confirmText: $t('system.user.save'),
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
      if (!userId.value) {
        await createUserApi(values);
        message.success($t('system.user.createSuccess'));
      } else if (userId.value) {
        const {
          createTime: _createTime,
          password: _password,
          updateTime: _updateTime,
          username: _username,
          ...updateValues
        } = values;
        await updateUserApi(userId.value, updateValues);
        message.success($t('system.user.updateSuccess'));
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
    userId.value = data?.id;
    viewMode.value = data?.view === 1 && Boolean(userId.value);
    modalApi.setState({
      cancelText: viewMode.value
        ? $t('system.user.close')
        : $t('common.cancel'),
      loading: Boolean(userId.value),
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
        componentProps: { disabled: Boolean(userId.value) },
        fieldName: 'username',
      },
      {
        fieldName: 'password',
        hide: Boolean(userId.value),
      },
      {
        componentProps: {
          maxlength: 255,
          rows: 4,
          showCount: !viewMode.value,
        },
        fieldName: 'description',
      },
      {
        fieldName: 'createTime',
        hide: !viewMode.value,
      },
      {
        fieldName: 'updateTime',
        hide: !viewMode.value,
      },
    ]);
    try {
      if (userId.value) {
        const detail = await getUserDetailApi(userId.value);
        await nextTick();
        await formApi.setValues({
          accountStatus: detail.accountStatus,
          avatar: viewMode.value ? detail.avatar || '-' : detail.avatar,
          createTime: formatDateTimeToMinute(detail.createTime),
          description: viewMode.value
            ? detail.description || '-'
            : detail.description,
          isTenantAdmin: detail.isTenantAdmin,
          memberStatus: detail.memberStatus,
          realName: detail.realName,
          updateTime: formatDateTimeToMinute(detail.updateTime),
          username: detail.username,
        });
      }
    } finally {
      modalApi.setState({ loading: false });
    }
  },
});

const title = computed(() => {
  if (viewMode.value) return $t('system.user.detailTitle');
  return userId.value
    ? $t('system.user.editTitle')
    : $t('system.user.createTitle');
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
