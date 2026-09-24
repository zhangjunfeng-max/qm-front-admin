import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';
import type { SystemRoleApi } from '#/api';

import { z } from '#/adapter/form';
import { $t } from '#/locales';
import { formatDateTimeToMinute } from '#/utils/date';

const statusOptions = () => [
  { label: $t('system.role.enabled'), value: 1 },
  { label: $t('system.role.disabled'), value: 0 },
];

export function useSearchFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        allowClear: true,
        placeholder: $t('system.role.keywordPlaceholder'),
      },
      fieldName: 'keyword',
      label: $t('system.role.keyword'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: statusOptions(),
        placeholder: $t('system.role.all'),
      },
      fieldName: 'status',
      label: $t('system.role.status'),
    },
    {
      component: 'RangePicker',
      componentProps: {
        allowClear: true,
        class: 'w-full',
        showTime: false,
      },
      fieldName: 'createTime',
      label: $t('system.role.createTime'),
    },
  ];
}

export function useColumns(): VxeTableGridColumns<SystemRoleApi.RoleListItem> {
  return [
    { type: 'checkbox', width: 50 },
    { title: $t('system.role.sequence'), type: 'seq', width: 70 },
    {
      field: 'roleCode',
      minWidth: 180,
      sortable: true,
      title: $t('system.role.roleCode'),
    },
    {
      field: 'roleName',
      minWidth: 180,
      sortable: true,
      title: $t('system.role.roleName'),
    },
    {
      field: 'status',
      slots: { default: 'status' },
      sortable: true,
      title: $t('system.role.status'),
      width: 120,
    },
    {
      field: 'remark',
      minWidth: 220,
      title: $t('system.role.remark'),
    },
    {
      field: 'createTime',
      formatter: ({ cellValue }) => formatDateTimeToMinute(cellValue),
      sortable: true,
      title: $t('system.role.createTime'),
      width: 180,
    },
    {
      field: 'updateTime',
      formatter: ({ cellValue }) => formatDateTimeToMinute(cellValue),
      sortable: true,
      title: $t('system.role.updateTime'),
      width: 180,
    },
    {
      field: 'operation',
      fixed: 'right',
      slots: { default: 'action' },
      title: $t('system.role.operation'),
      width: 230,
    },
  ];
}

export function useRoleFormSchema(): VbenFormSchema<SystemRoleApi.RoleSaveParams>[] {
  return [
    {
      component: 'Input',
      fieldName: 'roleCode',
      label: $t('system.role.roleCode'),
      rules: z
        .string()
        .min(1, $t('system.role.roleCodeRequired'))
        .max(64, $t('system.role.roleCodeTooLong'))
        .regex(/^[A-Za-z0-9_.:-]+$/, $t('system.role.roleCodeInvalid')),
    },
    {
      component: 'Input',
      fieldName: 'roleName',
      label: $t('system.role.roleName'),
      rules: z
        .string()
        .min(1, $t('system.role.roleNameRequired'))
        .max(64, $t('system.role.roleNameTooLong')),
    },
    {
      component: 'RadioGroup',
      componentProps: {
        buttonStyle: 'solid',
        optionType: 'button',
        options: statusOptions(),
      },
      defaultValue: 1,
      fieldName: 'status',
      label: $t('system.role.status'),
    },
    {
      component: 'Textarea',
      componentProps: {
        maxlength: 500,
        rows: 4,
        showCount: true,
      },
      fieldName: 'remark',
      label: $t('system.role.remark'),
      rules: z.string().max(500).optional(),
      wrapperClass: 'md:col-span-2',
    },
    {
      component: 'Input',
      fieldName: 'createTime',
      hide: true,
      label: $t('system.role.createTime'),
    },
    {
      component: 'Input',
      fieldName: 'updateTime',
      hide: true,
      label: $t('system.role.updateTime'),
    },
  ];
}
