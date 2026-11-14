import { captureContext } from './context-lifecycle';
import { requestClient } from './request';

interface UploadTicket {
  fileUrl: string;
  uploadUrl: string;
  method: string;
  headers: Record<string, string>;
}
export class ActivityMediaUploadError extends Error {}
function filePath(activityId: string) {
  return activityId ? `/admin/activities/${activityId}/files` : '/admin/files';
}
export async function uploadActivityMedia(file: File, activityId: string) {
  if (file.type.startsWith('audio/') || /\.(mp3|m4a|wav|ogg)$/i.test(file.name))
    throw new ActivityMediaUploadError('请从音乐库选择背景音乐');
  const context = captureContext();
  const ticket = await requestClient.post<UploadTicket>(
    `${filePath(activityId)}/presign-upload`,
    { filename: file.name, contentType: file.type, size: file.size },
  );
  // COS 直传不经过业务请求客户端，避免把登录凭证发送到存储域名。
  context.assertCurrent();
  const response = await fetch(ticket.uploadUrl, {
    method: ticket.method,
    headers: ticket.headers,
    body: file,
    credentials: 'omit',
    signal: context.signal,
  }).catch(() => {
    throw new ActivityMediaUploadError('上传失败，请检查网络后重试');
  });
  context.assertCurrent();
  if (!response.ok) throw new ActivityMediaUploadError('上传失败，请稍后重试');
  return ticket.fileUrl;
}
export const previewActivityMedia = (fileUrl: string, activityId: string) =>
  requestClient.post<{ url: string; expiresAt: string }>(
    `${filePath(activityId)}/presign-read`,
    { fileUrl },
  );
