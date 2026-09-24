import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';
import type { SystemDictApi } from '#/api';

import { z } from '#/adapter/form';
import { $t } from '#/locales';
import { formatDateTimeToMinute } from '#/utils/date';

const statusOptions = () => [
  { label: $t('system.dict.enabled'), value: 1 },
  { label: $t('system.dict.disabled'), value: 0 },
];
export function useSearchFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        allowClear: true,
        placeholder: $t('system.dict.keywordPlaceholder'),
      },
      fieldName: 'keyword',
      label: $t('system.dict.keyword'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: statusOptions(),
        placeholder: $t('system.dict.all'),
      },
      fieldName: 'status',
      label: $t('system.dict.status'),
    },
    {
      component: 'RangePicker',
      componentProps: { allowClear: true, class: 'w-full' },
      fieldName: 'createTime',
      label: $t('system.dict.createTime'),
    },
  ];
}
export function useColumns(): VxeTableGridColumns<SystemDictApi.DictListItem> {
  return [
    { type: 'checkbox', width: 50 },
    { title: $t('system.dict.sequence'), type: 'seq', width: 70 },
    {
      field: 'dictName',
      minWidth: 180,
      sortable: true,
      title: $t('system.dict.dictName'),
    },
    {
      field: 'dictCode',
      minWidth: 180,
      sortable: true,
      title: $t('system.dict.dictCode'),
    },
    {
      field: 'status',
      slots: { default: 'status' },
      sortable: true,
      title: $t('system.dict.status'),
      width: 110,
    },
    { field: 'remark', minWidth: 220, title: $t('system.dict.remark') },
    {
      field: 'createTime',
      formatter: ({ cellValue }) => formatDateTimeToMinute(cellValue),
      sortable: true,
      title: $t('system.dict.createTime'),
      width: 180,
    },
    {
      field: 'operation',
      fixed: 'right',
      slots: { default: 'action' },
      title: $t('system.dict.operation'),
      width: 270,
    },
  ];
}
export function useDictFormSchema(): VbenFormSchema<SystemDictApi.DictSaveParams>[] {
  return [
    {
      component: 'Input',
      fieldName: 'dictName',
      label: $t('system.dict.dictName'),
      rules: z.string().min(1, $t('system.dict.dictNameRequired')).max(64),
    },
    {
      component: 'Input',
      fieldName: 'dictCode',
      label: $t('system.dict.dictCode'),
      rules: z
        .string()
        .min(1, $t('system.dict.dictCodeRequired'))
        .max(64)
        .regex(/^[A-Za-z0-9_.:-]+$/, $t('system.dict.dictCodeInvalid')),
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
      label: $t('system.dict.status'),
    },
    {
      component: 'Textarea',
      componentProps: { maxlength: 500, rows: 4, showCount: true },
      fieldName: 'remark',
      label: $t('system.dict.remark'),
      rules: z.string().max(500).optional(),
      wrapperClass: 'md:col-span-2',
    },
  ];
}
