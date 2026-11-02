import type { ActivityInput, ActivityMediaFile } from '#/api/management';

import { onBeforeUnmount, reactive, ref } from 'vue';

import imageCompression from 'browser-image-compression';
import compressionWorkerUrl from 'browser-image-compression/dist/browser-image-compression.js?url';

import {
  previewActivityMedia,
  uploadActivityMedia,
} from '#/api/activity-media';

const IMAGE_TARGET = 400 * 1024;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const types: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
};
export function formatFileSize(size: number) {
  return size < 1024 * 1024
    ? `${(size / 1024).toFixed(1)} KB`
    : `${(size / 1024 / 1024).toFixed(2)} MB`;
}

async function compressImage(file: File) {
  if (file.size <= IMAGE_TARGET) return file;
  // 动画保留完整帧，避免静态图片压缩器将其变为第一帧。
  if (file.type !== 'image/jpeg') {
    const header = new TextDecoder('latin1').decode(await file.arrayBuffer());
    if (header.includes('acTL') || header.includes('ANIM')) return file;
  }
  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(new Error('图片处理超时，请重新选择')),
    60_000,
  );
  try {
    const image = await imageCompression.loadImage(
      await imageCompression.getDataUrlFromFile(file),
    );
    // 仅按宽度等比缩小；长海报不按最长边压成难以阅读的小图。
    const longestEdge = Math.max(image.width, image.height);
    const result = await imageCompression(file, {
      maxSizeMB: IMAGE_TARGET / 1024 / 1024,
      maxWidthOrHeight: Math.round(
        longestEdge * Math.min(1, 1440 / image.width),
      ),
      initialQuality: 0.85,
      maxIteration: 4,
      alwaysKeepResolution: true,
      fileType: file.type === 'image/jpeg' ? 'image/jpeg' : 'image/webp',
      useWebWorker: true,
      libURL: new URL(compressionWorkerUrl, window.location.href).href,
      preserveExif: false,
      signal: controller.signal,
    });
    if (result.size >= file.size) return file;
    const extension =
      result.type === 'image/jpeg' ? 'jpg' : result.type.split('/')[1];
    return new File([result], file.name.replace(/\.[^.]+$/, `.${extension}`), {
      type: result.type,
      lastModified: file.lastModified,
    });
  } catch {
    throw new Error('图片暂时无法使用，请更换图片后重试');
  } finally {
    window.clearTimeout(timeout);
  }
}

export function useActivityMedia(
  form: ActivityInput,
  activityId: () => string,
) {
  const local = new Map<string, File>();
  const previews = reactive<Record<string, string>>({});
  const preparing = ref(0);
  const progress = ref('');
  let generation = 0;
  function urls() {
    return [
      form.posterUrl,
      ...form.detailMedia.map((media) => media.url),
      form.shareImageUrl,
      form.forwardImageUrl,
      form.musicUrl,
    ].filter(Boolean);
  }
  function clear() {
    generation++;
    for (const url of local.keys()) URL.revokeObjectURL(url);
    local.clear();
    for (const url of Object.keys(previews)) delete previews[url];
    progress.value = '';
  }
  onBeforeUnmount(clear);
  async function prepare(file: File, kind: 'audio' | 'image' | 'video') {
    const serial = generation;
    const type = types[file.name.split('.').pop()?.toLowerCase() || ''];
    if (!type?.startsWith(`${kind}/`))
      throw new Error(
        kind === 'image'
          ? '请选择 JPG、PNG 或 WebP 图片'
          : kind === 'video'
            ? '请选择 MP4 或 WebM 视频'
            : '请选择 MP3、M4A、WAV 或 OGG 音乐',
      );
    if (file.size === 0) throw new Error('文件为空，请重新选择');
    if (file.size > 50 * 1024 * 1024)
      throw new Error('文件过大，请选择不超过50MB的文件');
    preparing.value++;
    try {
      const normalized = new File([file], file.name, { type });
      const prepared =
        kind === 'image' ? await compressImage(normalized) : normalized;
      if (kind === 'image' && prepared.size > 4 * 1024 * 1024)
        throw new Error('图片过大，请更换图片（最大4MB）');
      if (
        prepared.size > (kind === 'video' ? 50 * 1024 * 1024 : MAX_UPLOAD_BYTES)
      )
        throw new Error('音乐过大，请选择不超过10MB的文件');
      if (serial !== generation) return;
      const url = URL.createObjectURL(prepared);
      local.set(url, prepared);
      form.mediaFiles[url] = {
        name: prepared.name,
        size: prepared.size,
        originalSize: file.size,
        contentType: prepared.type,
      };
      previews[url] = url;
      return url;
    } finally {
      preparing.value--;
    }
  }
  async function loadPreviews() {
    const serial = generation;
    await Promise.allSettled(
      urls().map(async (url) => {
        const result = await previewActivityMedia(url, activityId());
        if (serial === generation) previews[url] = result.url;
      }),
    );
  }
  function replace(before: string, after: string) {
    for (const key of [
      'posterUrl',
      'shareImageUrl',
      'forwardImageUrl',
      'musicUrl',
    ] as const) {
      if (form[key] === before) form[key] = after;
    }
    form.detailMedia = form.detailMedia.map((media) =>
      media.url === before ? { ...media, url: after } : media,
    );
  }
  async function uploadPending() {
    const serial = generation;
    const assertCurrent = () => {
      if (serial !== generation) throw new Error('编辑页面已关闭，请重新操作');
    };
    const pending = [...new Set(urls())].filter((url) => local.has(url));
    try {
      for (const [index, url] of pending.entries()) {
        assertCurrent();
        progress.value = `正在保存 ${index + 1}/${pending.length}`;
        const remote = await uploadActivityMedia(local.get(url)!, activityId());
        assertCurrent();
        form.mediaFiles[remote] = form.mediaFiles[url]!;
        delete form.mediaFiles[url];
        previews[remote] = url;
        replace(url, remote);
        // 成功的文件立即复用；后续某张失败或活动保存失败，重试也不重复上传。
      }
      assertCurrent();
      const active = new Set(urls());
      form.mediaFiles = Object.fromEntries(
        Object.entries(form.mediaFiles).filter(([url]) => active.has(url)),
      );
    } finally {
      progress.value = '';
    }
  }
  function info(url: string): ActivityMediaFile | undefined {
    return form.mediaFiles[url];
  }
  return {
    session: () => generation,
    clear,
    prepare,
    loadPreviews,
    previews,
    preparing,
    progress,
    uploadPending,
    info,
  };
}
