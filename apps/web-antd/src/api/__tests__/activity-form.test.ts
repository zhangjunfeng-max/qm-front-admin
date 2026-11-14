import { reactive } from 'vue';

import { describe, expect, it } from 'vitest';

import {
  amountToCent,
  createActivityInput,
  defaultActivity,
} from '../activity-form';
describe('activity editing payload', () => {
  it('converts decimal prices without fractional cents and keeps empty price disabled', () => {
    expect(amountToCent('19.99')).toBe(1999);
    expect(amountToCent('')).toBeNull();
    expect(() => amountToCent('1.999')).toThrow();
    expect(() => amountToCent('-1')).toThrow();
  });
  it('preserves fixed customer fields and strips read-only properties', () => {
    const value = Object.assign(defaultActivity(), {
      id: 'ignored',
      status: 'archived',
      canJoin: false,
    canEdit: true,
      virtualRegistrationCount: 123,
    });
    const input = createActivityInput(reactive(value));
    expect(input).not.toHaveProperty('id');
    expect(input).not.toHaveProperty('status');
    expect(input.virtualRegistrationCount).toBe(123);
    expect(input.formConfig.fields.slice(0, 2)).toEqual([
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
    ]);
  });
});
