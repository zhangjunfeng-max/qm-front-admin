import { requestClient } from './request';

export function buildActivityH5Url(base: string, activityId: string): string {
  const url = new URL(base);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    base.includes('?') ||
    base.includes('#') ||
    !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(activityId)
  ) {
    throw new Error('活动链接暂不可用，请联系管理员');
  }
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  url.hash = `/pages/index/index?id=${activityId}`;
  return url.href;
}

export function promotionImageExtension(dataUrl: string): 'jpg' | 'png' | null {
  const match =
    /^data:image\/(png|jpeg);base64,(?:[A-Za-z\d+/]{4})*(?:[A-Za-z\d+/]{2}==|[A-Za-z\d+/]{3}=)?$/.exec(
      dataUrl,
    );
  if (!match || dataUrl.endsWith(',')) return null;
  return match[1] === 'png' ? 'png' : 'jpg';
}

export const generateActivityMiniappCode = (id: string, signal: AbortSignal) =>
  requestClient.post<{ dataUrl: string }>(
    `/admin/activities/${id}/miniapp-code`,
    undefined,
    { signal },
  );
