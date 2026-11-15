import type {
  Announcement,
  Notice,
  NoticeDetail,
  NoticeQuery,
  notificationApi,
  NotificationScope,
  RecipientQuery,
} from '../api/notifications';

import { ref } from 'vue';

// Every binding owns a distinct lifetime, including returning to the same company.
export function createNotificationCenter(api: typeof notificationApi) {
  const items = ref<Notice[]>([]);
  const selected = ref<NoticeDetail>();
  const openingId = ref('');
  const unreadCount = ref(0);
  const canPublish = ref(false);
  const loading = ref(false);
  const failed = ref(false);
  const contextVersion = ref(0);
  const revision = ref(0);
  const refreshVersion = ref(0);
  const scope = ref<NotificationScope | null>(null);
  let key = '';
  let controller = new AbortController();
  let inflight: null | Promise<void> = null;
  let timer: ReturnType<typeof setInterval> | undefined;
  let active = false;
  let dataVersion = 0;
  let detachContext: (() => void) | undefined;

  function bind(
    nextScope: NotificationScope | null,
    nextKey: string,
    signal?: AbortSignal,
  ) {
    if (
      scope.value === nextScope &&
      key === nextKey &&
      !controller.signal.aborted
    )
      return;
    detachContext?.();
    detachContext = undefined;
    controller.abort();
    controller = new AbortController();
    key = nextKey;
    scope.value = nextScope;
    items.value = [];
    selected.value = undefined;
    openingId.value = '';
    unreadCount.value = 0;
    canPublish.value = false;
    loading.value = false;
    failed.value = false;
    inflight = null;
    // Synchronous subscribers must see the complete new binding and cleared UI.
    ++contextVersion.value;
    if (signal) {
      const reset = () => bind(null, '');
      signal.addEventListener('abort', reset, { once: true });
      detachContext = () => signal.removeEventListener('abort', reset);
      if (signal.aborted) reset();
    }
    if (active && scope.value) foregroundRefresh();
  }
  async function run<T>(
    operation: (
      currentScope: NotificationScope,
      signal: AbortSignal,
    ) => Promise<T>,
  ): Promise<T | undefined> {
    if (!scope.value) return;
    const current = controller;
    const version = contextVersion.value;
    try {
      const value = await operation(scope.value, current.signal);
      if (current.signal.aborted || version !== contextVersion.value) return;
      return value;
    } catch (error) {
      if (!current.signal.aborted && version === contextVersion.value)
        throw error;
    }
  }
  function refresh(): Promise<void> {
    if (inflight) return inflight;
    if (!scope.value) return Promise.resolve();
    const version = contextVersion.value;
    loading.value = true;
    const currentData = dataVersion;
    const pending = run((current, signal) =>
      api.list(current, { page: 1, pageSize: 10, status: 'all' }, signal),
    )
      .then((value) => {
        if (!value || currentData !== dataVersion) return;
        items.value = value.items;
        unreadCount.value = value.unreadCount;
        canPublish.value = value.canPublish;
        failed.value = false;
        ++refreshVersion.value;
      })
      .catch(() => {
        if (version === contextVersion.value) failed.value = true;
      })
      .finally(() => {
        if (version !== contextVersion.value) return;
        loading.value = false;
        inflight = null;
      });
    inflight = pending;
    return pending;
  }
  async function list(query: NoticeQuery) {
    const currentData = dataVersion;
    const result = await run((current, signal) =>
      api.list(current, query, signal),
    );
    if (currentData !== dataVersion) return;
    if (result) {
      unreadCount.value = result.unreadCount;
      canPublish.value = result.canPublish;
    }
    return result;
  }
  async function mutate(operation: Parameters<typeof run<void>>[0]) {
    const version = contextVersion.value;
    await run(operation);
    if (version !== contextVersion.value || !scope.value) return;
    ++dataVersion;
    ++revision.value;
    // A list started before this mutation may still contain its old read/delete state.
    if (inflight) await inflight;
    if (version !== contextVersion.value) return;
    await refresh();
    return version === contextVersion.value ? true : undefined;
  }
  async function open(id: string): Promise<NoticeDetail | undefined> {
    const version = contextVersion.value;
    const result = await run((current, signal) =>
      api.detail(current, id, signal),
    );
    if (!result || version !== contextVersion.value) return;
    if (!(await mutate((current, signal) => api.read(current, id, signal))))
      return;
    // The server checks current target access. Limit navigation to known business routes as well.
    const allowed =
      scope.value === 'platform'
        ? /^\/platform\/activities\?activityId=[\w-]+$/
        : /^\/activities\/[\w-]+(?:\/(?:orders|members)(?:\?detailId=[\w-]+)?)?$/;
    return {
      ...result,
      isRead: true,
      link: allowed.test(result.link) ? result.link : '',
    };
  }
  async function activate(id: string, navigate: (link: string) => unknown) {
    if (openingId.value) return;
    const version = contextVersion.value;
    openingId.value = id;
    try {
      const result = await open(id);
      if (!result || version !== contextVersion.value) return;
      if (result.kind === 'activity_changed') selected.value = result;
      else if (result.link) await navigate(result.link);
      else selected.value = result;
    } finally {
      if (version === contextVersion.value) openingId.value = '';
    }
  }
  async function publish(body: Announcement) {
    const result = await run((current, signal) =>
      api.publish(current, body, signal),
    );
    if (result) {
      ++dataVersion;
      ++revision.value;
      void refresh();
    }
    return result;
  }
  function foregroundRefresh() {
    if (document.visibilityState === 'visible') void refresh();
  }
  function start() {
    if (active) return;
    active = true;
    foregroundRefresh();
    timer = setInterval(foregroundRefresh, 10_000);
    document.addEventListener('visibilitychange', foregroundRefresh);
  }
  function stop() {
    active = false;
    clearInterval(timer);
    document.removeEventListener('visibilitychange', foregroundRefresh);
    detachContext?.();
    detachContext = undefined;
    bind(null, '');
  }
  return {
    items,
    selected,
    openingId,
    unreadCount,
    canPublish,
    loading,
    failed,
    contextVersion,
    revision,
    refreshVersion,
    scope,
    bind,
    start,
    stop,
    refresh,
    list,
    open,
    activate,
    publish,
    recipients: (query: RecipientQuery) =>
      run((current, signal) => api.recipients(current, query, signal)),
    read: (id: string) =>
      mutate((current, signal) => api.read(current, id, signal)),
    readAll: () => mutate((current, signal) => api.readAll(current, signal)),
    remove: (id: string) =>
      mutate((current, signal) => api.remove(current, id, signal)),
    clear: () => mutate((current, signal) => api.clear(current, signal)),
  };
}
