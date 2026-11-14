import { expect, it } from 'vitest';

import { posterTextLines } from '../../utils/activity-share-poster';

const ctx = {
  measureText: (text: string) => ({ width: Array.from(text).length * 10 }) as TextMetrics,
};
it('wraps mixed Chinese and Latin copy by measured width and limits the final line', () => {
  expect(posterTextLines(ctx, '春日活动ABCDEF限时预约报名', 60, 2)).toEqual(['春日活动AB', 'CDEF限…']);
  expect(posterTextLines(ctx, '   预约\n报名  ', 80, 3)).toEqual(['预约 报名']);
  expect(posterTextLines(ctx, '', 60, 2)).toEqual([]);
  const lines = posterTextLines(ctx, '😀春日亲子活动'.repeat(6), 60, 3);
  expect(lines).toHaveLength(3);
  expect(lines.every(line => ctx.measureText(line).width <= 60)).toBe(true);
  expect(lines.at(-1)?.endsWith('…')).toBe(true);
});
