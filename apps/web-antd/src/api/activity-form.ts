import type { ActivityInput } from './management';

export const contactPhoneLabels = {
  store: '联系门店',
  sales: '联系销售',
  company: '联系公司',
};
export function amountToCent(value: string): null | number {
  const text = value.trim();
  if (!text) return null;
  if (!/^\d+(?:\.\d{1,2})?$/.test(text))
    throw new Error('价格应为最多两位小数的正数');
  const [whole = '0', fraction = ''] = text.split('.');
  const cent = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(cent) || cent <= 0)
    throw new Error('价格必须大于零');
  return cent;
}
export function defaultActivity(): ActivityInput {
  return {
    theme: 'festive',
    themeColor: '#E53935',
    mediaFiles: {},
    contactPhonePriority: ['sales', 'store', 'company'],
    storeIds: [],
    name: '',
    posterUrl: '',
    rulesText: '',
    detailMedia: [],
    startsAt: null,
    endsAt: null,
    groupEnabled: false,
    groupSize: 4,
    groupPriceCent: null,
    singlePriceCent: null,
    formConfig: {
      fields: [
        {
          key: 'customer_name',
          type: 'text',
          label: '客户姓名',
          placeholder: '请输入姓名',
          required: true,
        },
        {
          key: 'customer_phone',
          type: 'phone',
          label: '手机号',
          placeholder: '请输入手机号',
          required: true,
        },
      ],
    },
    shareText: '',
    shareImageUrl: '',
    forwardText: '',
    forwardImageUrl: '',
    musicUrl: '',
    virtualViewCount: 0,
    virtualRegistrationCount: 0,
    employeeScope: 'all',
    employeeRegistrationEnabled: true,
    memberPerformanceScope: 'self',
    leaderPerformanceScope: 'group',
    channel: 'h5',
    miniappId: null,
  };
}
export function createActivityInput(value: ActivityInput): ActivityInput {
  const result = defaultActivity();
  for (const key of Object.keys(result) as (keyof ActivityInput)[])
    (result as unknown as Record<string, unknown>)[key] = JSON.parse(
      JSON.stringify(value[key]),
    );
  return result;
}
