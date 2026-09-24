<script lang="ts" setup>
import type { SystemUserApi } from '#/api';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Checkbox, Empty, List, message, Tag } from 'ant-design-vue';

import { assignUserRolesApi, getUserRoleAssignmentApi } from '#/api';
import { $t } from '#/locales';

interface ModalData {
  id: string;
}

const emits = defineEmits<{ success: [] }>();
const userId = ref<string>();
const roles = ref<SystemUserApi.RoleAssignOption[]>([]);
const selectedRoleIds = ref<string[]>([]);
const loading = ref(false);

const selectedCount = computed(() => selectedRoleIds.value.length);
const allSelected = computed(
  () => roles.value.length > 0 && selectedCount.value === roles.value.length,
);

const [Modal, modalApi] = useVbenModal<ModalData>({
  centered: true,
  confirmText: $t('system.user.assignSave'),
  fullscreenButton: false,
  async onConfirm() {
    if (!userId.value) return;
    modalApi.lock();
    try {
      await assignUserRolesApi(userId.value, selectedRoleIds.value);
      message.success($t('system.user.assignSuccess'));
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
    roles.value = [];
    selectedRoleIds.value = [];
    modalApi.setState({ loading: true });
    loading.value = true;
    try {
      if (userId.value) {
        const result = await getUserRoleAssignmentApi(userId.value);
        roles.value = result.roles;
        selectedRoleIds.value = result.selectedRoleIds;
      }
    } finally {
      loading.value = false;
      modalApi.setState({ loading: false });
    }
  },
});

function updateSelected(checked: boolean, roleId: string) {
  const current = new Set(selectedRoleIds.value);
  if (checked) current.add(roleId);
  else current.delete(roleId);
  selectedRoleIds.value = [...current];
}

function toggleAll(checked: boolean) {
  selectedRoleIds.value = checked ? roles.value.map((role) => role.id) : [];
}

defineExpose({ modalApi });
</script>

<template>
  <Modal
    :title="$t('system.user.assignRolesTitle')"
    class="!w-[var(--qm-admin-modal-width)] !max-w-[var(--qm-admin-modal-max-width)]"
  >
    <div class="mb-3 flex items-center justify-between">
      <Checkbox
        :checked="allSelected"
        @change="(event) => toggleAll(event.target.checked)"
      >
        {{ $t('system.user.selectAllRoles') }}
      </Checkbox>
      <span class="text-muted-foreground text-sm">
        {{ $t('system.user.selectedRoles', [selectedCount]) }}
      </span>
    </div>
    <div v-if="!loading && roles.length === 0" class="py-8">
      <Empty :description="$t('system.user.noRoles')" />
    </div>
    <List
      v-else
      bordered
      :loading="loading"
      class="max-h-[420px] overflow-auto"
    >
      <List.Item v-for="role in roles" :key="role.id">
        <Checkbox
          :checked="selectedRoleIds.includes(role.id)"
          @change="(event) => updateSelected(event.target.checked, role.id)"
        >
          <span class="ml-2">{{ role.roleName }}</span>
          <span class="text-muted-foreground ml-2">{{ role.roleCode }}</span>
          <Tag v-if="role.status === 0" class="ml-2" color="warning">
            {{ $t('system.user.disabled') }}
          </Tag>
        </Checkbox>
      </List.Item>
    </List>
  </Modal>
</template>
