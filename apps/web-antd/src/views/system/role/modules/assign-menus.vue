<script lang="ts" setup>
import type { Key } from 'ant-design-vue/es/_util/type';

import type { SystemRoleApi } from '#/api';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Empty, message, Spin, Tag, Tree } from 'ant-design-vue';

import { assignRoleMenusApi, getRoleMenuAssignmentApi } from '#/api';
import { $t } from '#/locales';

interface ModalData {
  id: string;
}

interface TreeNode {
  key: string;
  title: string;
  menuType: SystemRoleApi.MenuAssignNode['menuType'];
  authCode?: string;
  children?: TreeNode[];
}

const emits = defineEmits<{ success: [] }>();
const roleId = ref<string>();
const treeData = ref<TreeNode[]>([]);
const checkedKeys = ref<Key[]>([]);
const loading = ref(false);

const selectedCount = computed(() => checkedKeys.value.length);

const [Modal, modalApi] = useVbenModal<ModalData>({
  centered: true,
  confirmText: $t('system.role.assignSave'),
  fullscreenButton: false,
  async onConfirm() {
    if (!roleId.value) return;
    modalApi.lock();
    try {
      await assignRoleMenusApi(roleId.value, checkedKeys.value.map(String));
      message.success($t('system.role.assignSuccess'));
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
    treeData.value = [];
    checkedKeys.value = [];
    modalApi.setState({ loading: true });
    loading.value = true;
    try {
      if (roleId.value) {
        const result = await getRoleMenuAssignmentApi(roleId.value);
        treeData.value = result.menus.map(toTreeNode);
        checkedKeys.value = result.selectedMenuIds;
      }
    } finally {
      loading.value = false;
      modalApi.setState({ loading: false });
    }
  },
});

function toTreeNode(node: SystemRoleApi.MenuAssignNode): TreeNode {
  return {
    authCode: node.authCode,
    children: node.children?.map(toTreeNode),
    key: node.id,
    menuType: node.menuType,
    title: node.title,
  };
}

function onCheck(keys: Key[] | { checked: Key[]; halfChecked: Key[] }) {
  checkedKeys.value = Array.isArray(keys) ? keys : keys.checked;
}

defineExpose({ modalApi });
</script>

<template>
  <Modal
    :title="$t('system.role.assignMenusTitle')"
    class="!w-[var(--qm-admin-modal-width)] !max-w-[var(--qm-admin-modal-max-width)]"
  >
    <div class="mb-3 flex items-center justify-between">
      <span class="text-muted-foreground text-sm">
        {{ $t('system.role.selectedMenus', [selectedCount]) }}
      </span>
      <span class="text-muted-foreground text-xs">
        {{ $t('system.role.assignMenusHint') }}
      </span>
    </div>
    <div v-if="!loading && treeData.length === 0" class="py-8">
      <Empty :description="$t('system.role.noMenus')" />
    </div>
    <div v-else class="max-h-[520px] overflow-auto rounded border p-3">
      <Spin :spinning="loading">
        <Tree
          checkable
          block-node
          :checked-keys="checkedKeys"
          :tree-data="treeData"
          @check="onCheck"
        >
          <template #title="{ title, menuType, authCode }">
            <span class="qm-admin-menu-tree-title">
              <span>{{ title }}</span>
              <Tag color="blue">
                {{ $t(`system.menu.${menuType.toLowerCase()}`) }}
              </Tag>
              <span v-if="authCode" class="text-muted-foreground text-xs">
                {{ authCode }}
              </span>
            </span>
          </template>
        </Tree>
      </Spin>
    </div>
  </Modal>
</template>
