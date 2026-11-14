import { describe, expect, it, vi } from 'vitest';

vi.mock('../request', () => ({ requestClient: {} }));
import { defaultActivity } from '../activity-form';
import { activityListActions, copyActivityInput } from '../activity-workspace';
import type { Activity } from '../management';

describe('activity workspace', () => {
  it('copies configuration without schedule, participants or history', () => {
    const source = {
      ...defaultActivity(),
      name: '活动',
      startsAt: '2026-11-12',
      endsAt: '2026-11-13',
      employeeScope: 'selected' as const,
      id: 'source',
      version: 9,
      status: 'published',
      memberCount: 8,
    };
    const copy = copyActivityInput(source);
    expect(copy.name).toBe('活动（副本）');
    expect(copy.startsAt).toBeNull();
    expect(copy.endsAt).toBeNull();
    expect(copy.employeeScope).toBe('selected');
    expect(copy).not.toHaveProperty('id');
    expect(copy).not.toHaveProperty('version');
    copy.formConfig.fields[0]!.label = '新姓名';
    expect(source.formConfig.fields[0]!.label).toBe('客户姓名');
  });
  it('keeps frequent state actions visible and archive out of running list', () => {
    expect(activityListActions({ status: 'running' } as Activity)).toEqual([
      'records',
      'share',
      'ranking',
      'edit',
    ]);
    expect(activityListActions({ status: 'draft' } as Activity)).toEqual([
      'edit',
      'preview',
      'submit-review',
    ]);
    expect(activityListActions({ status: 'ended' } as Activity)).toContain(
      'copy',
    );
    expect(activityListActions({ status: 'archived' } as Activity)).toEqual([
      'records',
      'restore',
    ]);
  });
});
