/** Changing only a URL fragment does not reload the app or discard company state. */
export function reloadDocument(
  href: string,
  browser: {
    history: Pick<History, 'replaceState'>;
    location: Pick<Location, 'href' | 'reload' | 'replace'>;
  } = window,
) {
  const current = new URL(browser.location.href);
  const target = new URL(href, current);
  if (
    target.origin === current.origin &&
    target.pathname === current.pathname &&
    target.search === current.search
  ) {
    browser.history.replaceState(null, '', target.href);
    browser.location.reload();
  } else {
    browser.location.replace(target.href);
  }
}
