import type { ListQuery, PageResult } from '#/api/management';

import { onBeforeUnmount, onMounted, ref } from 'vue';
export function useList<T>(fetcher: (q: ListQuery) => Promise<PageResult<T>>) {
  const items = ref<T[]>([]);
  const total = ref(0);
  const page = ref(1);
  const pageSize = ref(20);
  const keyword = ref('');
  const status = ref<string>();
  const loading = ref(false);
  const failed = ref(false);
  let serial = 0;
  async function load() {
    const request = ++serial;
    loading.value = true;
    failed.value = false;
    try {
      const r = await fetcher({
        page: page.value,
        pageSize: pageSize.value,
        keyword: keyword.value.trim() || undefined,
        status: status.value,
      });
      if (request === serial) {
        items.value = r.items;
        total.value = r.total;
      }
    } catch {
      if (request === serial) {
        failed.value = true;
        items.value = [];
        total.value = 0;
      }
    } finally {
      if (request === serial) loading.value = false;
    }
  }
  function search() {
    page.value = 1;
    void load();
  }
  function change(p: number, s: number) {
    page.value = s === pageSize.value ? p : 1;
    pageSize.value = s;
    void load();
  }
  onBeforeUnmount(() => {
    ++serial;
  });
  onMounted(load);
  return {
    items,
    total,
    page,
    pageSize,
    keyword,
    status,
    loading,
    failed,
    load,
    search,
    change,
  };
}
