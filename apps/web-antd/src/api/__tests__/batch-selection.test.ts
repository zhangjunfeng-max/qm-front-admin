import { describe, expect, it, vi } from 'vitest';

import { collectSelection } from '../batch-selection';

describe('select all matching pages', () => {
  it('collects every page beyond the first 100 rows', async () => {
    const rows = Array.from({ length: 235 }, (_, id) => ({ id: String(id) }));
    const fetch = vi.fn(async (page: number, pageSize: number) => ({
      items: rows.slice((page - 1) * pageSize, page * pageSize),
      total: rows.length,
    }));
    expect(await collectSelection(fetch, (r) => r.id, 1000)).toEqual(rows);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('rejects oversized or changing result sets instead of silently truncating', async () => {
    await expect(
      collectSelection(
        async () => ({ items: [], total: 1001 }),
        (r: { id: string }) => r.id,
        1000,
      ),
    ).rejects.toThrow('1000');
    let page = 0;
    await expect(
      collectSelection(
        async () => ({ items: [{ id: 'same' }], total: ++page === 1 ? 2 : 3 }),
        (r) => r.id,
        1000,
      ),
    ).rejects.toThrow('变化');
  });

  it('rejects incomplete pages and propagates errors without a partial selection', async () => {
    await expect(
      collectSelection(
        async () => ({ items: [], total: 2 }),
        (r: { id: string }) => r.id,
        1000,
      ),
    ).rejects.toThrow('变化');
    await expect(
      collectSelection(
        async () => {
          throw new Error('offline');
        },
        (r: { id: string }) => r.id,
        1000,
      ),
    ).rejects.toThrow('offline');
  });
});
