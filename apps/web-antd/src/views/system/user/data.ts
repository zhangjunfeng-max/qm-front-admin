import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';
import type { SystemUserApi } from '#/api';

import { z } from '#/adapter/form';
import { $t } from '#/locales';
import { formatDateTimeToMinute } from '#/utils/date';

const statusOptions = () => [
  { label: $t('system.user.enabled'), value: 1 },
  { label: $t('system.user.disabled'), value: 0 },
];

export function useSearchFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        allowClear: true,
        placeholder: $t('system.user.keywordPlaceholder'),
      },
      fieldName: 'keyword',
      label: $t('system.user.keyword'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: statusOptions(),
        placeholder: $t('system.user.all'),
      },
      fieldName: 'accountStatus',
      label: $t('system.user.accountStatus'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: statusOptions(),
        placeholder: $t('system.user.all'),
      },
      fieldName: 'memberStatus',
      label: $t('system.user.memberStatus'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: [
          { label: $t('system.user.yes'), value: 1 },
          { label: $t('system.user.no'), value: 0 },
        ],
        placeholder: $t('system.user.all'),
      },
      fieldName: 'isTenantAdmin',
      label: $t('system.user.tenantAdmin'),
    },
    {
      component: 'RangePicker',
      componentProps: {
        allowClear: true,
        class: 'w-full',
        showTime: false,
      },
      fieldName: 'createTime',
      label: $t('system.user.createTime'),
    },
  ];
}

export function useColumns(): VxeTableGridColumns<SystemUserApi.UserListItem> {
  return [
    {
      type: 'checkbox',
      width: 50,
    },
    {
      title: $t('system.user.sequence'),
      type: 'seq',
      width: 70,
    },
    {
      field: 'username',
      minWidth: 150,
      sortable: true,
      title: $t('system.user.username'),
    },
    {
      field: 'realName',
      minWidth: 140,
      sortable: true,
      title: $t('system.user.realName'),
    },
    {
      field: 'isTenantAdmin',
      slots: { default: 'tenantAdmin' },
      sortable: true,
      title: $t('system.user.tenantAdmin'),
      width: 130,
    },
    {
      field: 'accountStatus',
      slots: { default: 'accountStatus' },
      sortable: true,
      title: $t('system.user.accountStatus'),
      width: 120,
    },
    {
      field: 'memberStatus',
      slots: { default: 'memberStatus' },
      sortable: true,
      title: $t('system.user.memberStatus'),
      width: 120,
    },
    {
      field: 'description',
      minWidth: 180,
      title: $t('system.user.description'),
    },
    {
      field: 'createTime',
      formatter: ({ cellValue }) => formatDateTimeToMinute(cellValue),
      sortable: true,
      title: $t('system.user.createTime'),
      width: 180,
    },
    {
      field: 'updateTime',
      formatter: ({ cellValue }) => formatDateTimeToMinute(cellValue),
      sortable: true,
      title: $t('system.user.updateTime'),
      width: 180,
    },
    {
      field: 'operation',
      fixed: 'right',
      slots: { default: 'action' },
      title: $t('system.user.operation'),
      width: 230,
    },
  ];
}

export function useUserFormSchema(): VbenFormSchema<SystemUserApi.UserSaveParams>[] {
  return [
    {
      component: 'Input',
      fieldName: 'username',
      label: $t('system.user.username'),
      rules: z
        .string()
        .min(1, $t('system.user.usernameRequired'))
        .max(64, $t('system.user.usernameTooLong'))
        .regex(/^[A-Za-z0-9_.-]+$/, $t('system.user.usernameInvalid')),
    },
    {
      component: 'InputPassword',
      componentProps: {
        autocomplete: 'new-password',
      },
      fieldName: 'password',
      label: $t('system.user.password'),
      rules: z
        .string()
        .min(6, $t('system.user.passwordLength'))
        .max(72, $t('system.user.passwordLength')),
    },
    {
      component: 'Input',
      fieldName: 'realName',
      label: $t('system.user.realName'),
      rules: z.string().min(1, $t('system.user.realNameRequired')).max(64),
    },
    {
      component: 'Input',
      fieldName: 'avatar',
      label: $t('system.user.avatar'),
      rules: z.string().max(512).optional(),
    },
    {
      component: 'RadioGroup',
      componentProps: {
        buttonStyle: 'solid',
        optionType: 'button',
        options: statusOptions(),
      },
      defaultValue: 1,
      fieldName: 'accountStatus',
      label: $t('system.user.accountStatus'),
    },
    {
      component: 'RadioGroup',
      componentProps: {
        buttonStyle: 'solid',
        optionType: 'button',
        options: statusOptions(),
      },
      defaultValue: 1,
      fieldName: 'memberStatus',
      label: $t('system.user.memberStatus'),
    },
    {
      component: 'RadioGroup',
      componentProps: {
        buttonStyle: 'solid',
        optionType: 'button',
        options: [
          { label: $t('system.user.yes'), value: 1 },
          { label: $t('system.user.no'), value: 0 },
        ],
      },
      defaultValue: 0,
      fieldName: 'isTenantAdmin',
      label: $t('system.user.tenantAdmin'),
    },
    {
      component: 'Textarea',
      componentProps: {
        maxlength: 255,
        rows: 4,
        showCount: true,
      },
      fieldName: 'description',
      label: $t('system.user.description'),
      wrapperClass: 'md:col-span-2',
    },
    {
      component: 'Input',
      fieldName: 'createTime',
      hide: true,
      label: $t('system.user.createTime'),
    },
    {
      component: 'Input',
      fieldName: 'updateTime',
      hide: true,
      label: $t('system.user.updateTime'),
    },
  ];
}
