// Screen width selects a presentation only; API authorization is unchanged.
export function mobileDestination(
  path: string,
  width: number,
  platform: boolean,
  desktop: boolean,
  query: Record<string, unknown> = {},
  manager = false,
): string | undefined {
  if (platform && path.startsWith('/m/')) return '/home';
  if (platform || desktop || width > 767 || path.startsWith('/m/')) return;
  if (
    manager &&
    ((path === '/activities' && query.create === '1') ||
      (/^\/activities\/[^/]+$/.test(path) &&
        (query.edit === '1' || query.tab === 'members')))
  )
    return;
  const exact: Record<string, string> = {
    '/home': '/m/workbench',
    '/activities': '/m/activities',
    '/registrations': '/m/orders',
    '/orders': '/m/orders',
    '/account': '/m/me',
  };
  if (exact[path]) return exact[path];
  const registrations = /^\/activities\/([^/]+)\/(?:registrations|orders)$/.exec(
    path,
  );
  if (registrations)
    return `/m/orders?activityId=${encodeURIComponent(registrations[1]!)}`;
  const activity = /^\/activities\/([^/]+)$/.exec(path);
  if (activity) return `/m/activities/${activity[1]}`;
}
export const desktopPreferenceKey = 'group-admin-desktop-view';
export function prefersDesktop() {
  return localStorage.getItem(desktopPreferenceKey) === 'yes';
}

// A login return target must remain within authenticated company/platform routes.
export function loginDestination(value: unknown, fallback: string) {
  if (
    typeof value !== 'string' ||
    value.length > 2048 ||
    /[\\\r\n]/.test(value)
  )
    return fallback;
  return /^\/(?:m(?:\/|$)|home(?:[?#]|$)|activities(?:[/?#]|$)|registrations(?:[/?#]|$)|orders(?:[/?#]|$)|account(?:[?#]|$)|platform\/)/.test(
    value,
  )
    ? value
    : fallback;
}
