/** Fetch all matching pages before changing selection; never return a partial set. */
export async function collectSelection<T>(
  fetchPage: (
    page: number,
    pageSize: number,
  ) => Promise<{ items: T[]; total: number }>,
  key: (row: T) => string,
  limit: number,
): Promise<T[]> {
  const rows = new Map<string, T>();
  let expected: number | undefined;
  for (let page = 1; ; page++) {
    const result = await fetchPage(page, 100);
    if (result.total > limit)
      throw new Error(`每次最多选择 ${limit} 条，请缩小筛选范围后重试`);
    if (expected !== undefined && result.total !== expected)
      throw new Error('列表已变化，请刷新后重新选择');
    expected = result.total;
    const before = rows.size;
    for (const row of result.items) rows.set(key(row), row);
    if (rows.size === expected) return [...rows.values()];
    if (rows.size > expected || rows.size === before)
      throw new Error('列表已变化，请刷新后重新选择');
  }
}
