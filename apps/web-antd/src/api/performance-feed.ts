import type {
  PerformanceBoard,
  PerformanceEvent,
  PerformanceQuery,
} from './performance';

import { responseStatus } from './session';

type Fetcher = (
  query: PerformanceQuery,
  signal: AbortSignal,
) => Promise<PerformanceBoard>;
interface Observer {
  data: (value: PerformanceBoard) => void;
  reset: () => void;
  failed: (value: boolean) => void;
  loading: (value: boolean) => void;
  celebrate: (events: PerformanceEvent[]) => void;
}

// One request lifetime and one polling timer per authorized company/activity.
export function createPerformanceFeed(fetcher: Fetcher, observer: Observer) {
  let version = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let request: AbortController | undefined;
  let detach: (() => void) | undefined;
  let query: PerformanceQuery | undefined;
  let contextSignal: AbortSignal | undefined;
  let cursor: string | undefined;
  let shown = true;
  const seen = new Set<string>();
  function clearTimer() {
    clearTimeout(timer);
    timer = undefined;
  }
  function stop() {
    version++;
    clearTimer();
    request?.abort();
    detach?.();
    detach = undefined;
    query = undefined;
    cursor = undefined;
    seen.clear();
    observer.reset();
    observer.loading(false);
  }
  function schedule() {
    clearTimer();
    if (query && shown && !contextSignal?.aborted)
      timer = setTimeout(() => void refresh(), 30000);
  }
  async function refresh() {
    if (!query || !shown || contextSignal?.aborted) return;
    const current = version;
    request?.abort();
    const controller = new AbortController();
    request = controller;
    observer.loading(cursor === undefined);
    observer.failed(false);
    try {
      const result = await fetcher(
        { ...query, after: cursor },
        controller.signal,
      );
      if (
        current !== version ||
        controller.signal.aborted ||
        contextSignal?.aborted
      )
        return;
      const initial = cursor === undefined;
      cursor = result.cursor;
      observer.data(result);
      const events = result.events.filter((event) => {
        if (seen.has(event.id)) return false;
        seen.add(event.id);
        return true;
      });
      if (!initial && events.length) observer.celebrate(events);
      // The server cursor excludes older events. Keep a bounded overlap guard.
      while (seen.size > 2000) seen.delete(seen.values().next().value!);
    } catch (error) {
      if (
        current === version &&
        !controller.signal.aborted &&
        !contextSignal?.aborted
      ) {
        if ([401, 403].includes(responseStatus(error) ?? 0)) {
          cursor = undefined;
          seen.clear();
          observer.reset();
        }
        observer.failed(true);
      }
    } finally {
      if (current === version && request === controller) {
        observer.loading(false);
        schedule();
      }
    }
  }
  function bind(params: PerformanceQuery, signal: AbortSignal) {
    stop();
    if (signal.aborted) return;
    query = params;
    contextSignal = signal;
    const abort = () => stop();
    signal.addEventListener('abort', abort, { once: true });
    detach = () => signal.removeEventListener('abort', abort);
    void refresh();
  }
  function visible(value: boolean) {
    if (shown === value) return;
    shown = value;
    clearTimer();
    if (value) void refresh();
  }
  return { bind, stop, refresh, visible };
}
