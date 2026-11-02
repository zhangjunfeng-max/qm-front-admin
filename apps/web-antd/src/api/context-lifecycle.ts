// One lifetime for every verified company context, including A -> B -> A switches.
let controller = new AbortController();
let revision = 0;
const storageKey = 'group-admin-session-context';
let observedContext = localStorage.getItem(storageKey);

export function captureContext() {
  const version = revision;
  const signal = controller.signal;
  return {
    signal,
    assertCurrent() {
      if (
        signal.aborted ||
        version !== revision ||
        observedContext !== localStorage.getItem(storageKey)
      )
        throw new Error('公司已切换，请重新操作');
    },
  };
}

export function invalidateContext() {
  revision++;
  observedContext = localStorage.getItem(storageKey);
  controller.abort(new Error('公司已切换，请重新操作'));
  controller = new AbortController();
}
