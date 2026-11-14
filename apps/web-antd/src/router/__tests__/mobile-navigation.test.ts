import { expect, it } from 'vitest';

import { mobileDestination } from '../mobile-navigation';
it('routes a phone employee home and operational deep links without redirect loops', () => {
  expect(mobileDestination('/home', 390, false, false)).toBe('/m/workbench');
  expect(mobileDestination('/activities/abc/registrations', 390, false, false)).toBe(
    '/m/orders?activityId=abc',
  );
  expect(mobileDestination('/activities/abc', 390, false, false)).toBe(
    '/m/activities/abc',
  );
  expect(mobileDestination('/m/orders', 390, false, false)).toBeUndefined();
});
it('preserves desktop, platform and explicit desktop preference', () => {
  expect(mobileDestination('/home', 1280, false, false)).toBeUndefined();
  expect(mobileDestination('/home', 390, true, false)).toBeUndefined();
  expect(mobileDestination('/home', 390, false, true)).toBeUndefined();
  expect(mobileDestination('/m/workbench', 390, true, false)).toBe('/home');
});

it('keeps company managers in the shared create, edit and personnel workspace', () => {
  expect(
    mobileDestination('/activities', 390, false, false, { create: '1' }, true),
  ).toBeUndefined();
  expect(
    mobileDestination(
      '/activities/abc',
      390,
      false,
      false,
      { edit: '1' },
      true,
    ),
  ).toBeUndefined();
  expect(
    mobileDestination(
      '/activities/abc',
      390,
      false,
      false,
      { tab: 'members' },
      true,
    ),
  ).toBeUndefined();
  expect(
    mobileDestination(
      '/activities/abc',
      390,
      false,
      false,
      { edit: '1' },
      false,
    ),
  ).toBe('/m/activities/abc');
  expect(
    mobileDestination('/m/activities', 390, true, false, { create: '1' }, true),
  ).toBe('/home');
});
