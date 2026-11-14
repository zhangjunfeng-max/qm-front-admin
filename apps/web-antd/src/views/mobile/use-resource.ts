import { onBeforeUnmount, ref, shallowRef } from 'vue';

import { captureContext } from '#/api/context-lifecycle';
// One company lifetime and one active request per view. Late responses cannot repopulate it.
export function useResource<T>(fetcher: (signal: AbortSignal) => Promise<T>) {
  const data = shallowRef<T>();
  const loading = ref(false);
  const failed = ref(false);
  const context = captureContext();
  let serial = 0;
  let disposed = false;
  let controller: AbortController | undefined;
  function clear() {
    serial++;
    controller?.abort();
    data.value = undefined;
    loading.value = false;
    failed.value = false;
  }
  context.signal.addEventListener('abort', clear, { once: true });
  async function load() {
    if (disposed || context.signal.aborted) return;
    controller?.abort();
    const active = new AbortController();
    controller = active;
    const version = ++serial;
    data.value = undefined;
    loading.value = true;
    failed.value = false;
    try {
      const result = await fetcher(active.signal);
      context.assertCurrent();
      if (!disposed && version === serial) data.value = result;
    } catch {
      if (
        !disposed &&
        version === serial &&
        !active.signal.aborted &&
        !context.signal.aborted
      )
        failed.value = true;
    } finally {
      if (version === serial) loading.value = false;
    }
  }
  onBeforeUnmount(() => {
    disposed = true;
    clear();
    context.signal.removeEventListener('abort', clear);
  });
  return { data, loading, failed, load };
}
