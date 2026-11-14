import { captureContext } from './context-lifecycle';
import { requestClient } from './request';

export interface MusicOption {
  id: string;
  name: string;
  status: 'active' | 'disabled';
}
export interface MusicInput {
  name: string;
  fileUrl: string;
  size: number;
  contentType: string;
  licenseSource: string;
  status: 'active' | 'disabled';
  sortOrder: number;
  version: number;
}
export interface Music extends MusicInput {
  id: string;
  createdAt: string;
  updatedAt: string;
}
export interface MusicQuery {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: 'active' | 'disabled';
}
interface MusicPage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
export const getMusic = (params: MusicQuery) =>
  requestClient.get<MusicPage<Music>>('/platform/music', { params });
export const saveMusic = (id: string, input: MusicInput) =>
  id
    ? requestClient.put<Music>(`/platform/music/${id}`, input)
    : requestClient.post<Music>('/platform/music', input);
export const getMusicOptions = (params: MusicQuery) =>
  requestClient.get<MusicPage<MusicOption>>('/admin/music', { params });
export const previewMusic = (id: string, platform = false) =>
  requestClient.get<{ url: string; expiresAt: string }>(
    `/${platform ? 'platform' : 'admin'}/music/${id}/preview`,
  );

const audioTypes: Record<string, string> = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
};
export function normalizeMusicFile(file: File) {
  const contentType =
    audioTypes[file.name.split('.').pop()?.toLowerCase() ?? ''];
  if (!contentType) throw new Error('请选择 MP3、M4A、WAV 或 OGG 音乐');
  if (!file.size || file.size > 10 * 1024 * 1024)
    throw new Error('音乐文件应大于0且不超过10MB');
  return new File([file], file.name, { type: contentType });
}
export class MusicUploadError extends Error {}

export async function uploadMusic(file: File) {
  const normalized = normalizeMusicFile(file);
  const context = captureContext();
  const ticket = await requestClient.post<{
    fileUrl: string;
    uploadUrl: string;
    method: string;
    headers: Record<string, string>;
  }>('/platform/music/files/presign-upload', {
    filename: normalized.name,
    contentType: normalized.type,
    size: normalized.size,
  });
  context.assertCurrent();
  const response = await fetch(ticket.uploadUrl, {
    method: ticket.method,
    headers: ticket.headers,
    body: normalized,
    credentials: 'omit',
    signal: context.signal,
  }).catch(() => {
    context.assertCurrent();
    throw new MusicUploadError('音乐上传失败，请检查网络后重试');
  });
  context.assertCurrent();
  if (!response.ok) throw new MusicUploadError('音乐上传失败，请重试');
  return ticket.fileUrl;
}
