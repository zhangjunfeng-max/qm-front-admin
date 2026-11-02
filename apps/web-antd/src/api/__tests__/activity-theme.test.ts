import { expect, it } from 'vitest';

import { createActivityInput, defaultActivity } from '../activity-form';
import {
  activityThemePreset,
  normalizeActivityThemeColor,
} from '../activity-theme';

it('keeps a selected preset and custom color through editing payload creation', () => {
  const form = defaultActivity();
  Object.assign(form, { theme: 'sky', themeColor: '#123456' });
  expect(createActivityInput(form)).toMatchObject({
    theme: 'sky',
    themeColor: '#123456',
  });
  const preset = activityThemePreset('playful');
  Object.assign(form, { theme: preset.value, themeColor: preset.color });
  expect(createActivityInput(form)).toMatchObject({
    theme: 'playful',
    themeColor: '#F59A23',
  });
});

it('rejects CSS fragments and normalizes six digit hex colors', () => {
  expect(normalizeActivityThemeColor('#abC123')).toBe('#ABC123');
  for (const value of ['', '#abc', 'red', '#123456;display:none']) {
    expect(() => normalizeActivityThemeColor(value)).toThrow();
  }
});
