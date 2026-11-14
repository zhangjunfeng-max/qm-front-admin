export interface SharePosterInput {
  imageUrl?: string;
  codeUrl: string;
  name: string;
  text: string;
  color: string;
  channel: 'h5' | 'miniapp';
  signal: AbortSignal;
}

async function loadImage(url: string, signal: AbortSignal) {
  signal.throwIfAborted();
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const timeout = window.setTimeout(
      () => finish(new Error('图片加载超时')),
      15000,
    );
    function finish(error?: Error) {
      window.clearTimeout(timeout);
      signal.removeEventListener('abort', abort);
      image.onload = null;
      image.onerror = null;
      if (error) {
        image.src = '';
        reject(error);
      } else resolve(image);
    }
    function abort() {
      finish(new DOMException('Aborted', 'AbortError'));
    }
    signal.addEventListener('abort', abort, { once: true });
    image.crossOrigin = 'anonymous';
    image.onload = () => finish();
    image.onerror = () => finish(new Error('分享图片暂时无法加载'));
    image.src = url;
  });
}

// Canvas wraps by measured glyph width so both Chinese copy and long Latin
// words fit without shrinking the QR code or drawing over its quiet zone.
export function posterTextLines(
  ctx: Pick<CanvasRenderingContext2D, 'measureText'>,
  text: string,
  width: number,
  limit: number,
) {
  const glyphs = Array.from(text.replaceAll(/\s+/g, ' ').trim());
  const lines: string[] = [];
  let line = '';
  for (let i = 0; i < glyphs.length; i++) {
    const glyph = glyphs[i]!;
    if (ctx.measureText(line + glyph).width > width && line) {
      if (lines.length === limit - 1) {
        while (line && ctx.measureText(line + '…').width > width)
          line = Array.from(line).slice(0, -1).join('');
        lines.push(line + '…');
        return lines;
      }
      lines.push(line);
      line = glyph;
    } else line += glyph;
  }
  if (line) lines.push(line);
  return lines;
}

export async function createSharePoster(
  input: SharePosterInput,
): Promise<string> {
  const [hero, code] = await Promise.all([
    input.imageUrl ? loadImage(input.imageUrl, input.signal) : undefined,
    loadImage(input.codeUrl, input.signal),
  ]);
  input.signal.throwIfAborted();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('当前浏览器无法生成海报');
  const width = 750;
  const heroHeight = hero
    ? Math.min(
        1500,
        Math.round((width * hero.naturalHeight) / hero.naturalWidth),
      )
    : 0;
  ctx.font = '600 38px "PingFang SC", "Microsoft YaHei", sans-serif';
  const title = posterTextLines(ctx, input.name, 450, 2);
  ctx.font = '28px "PingFang SC", "Microsoft YaHei", sans-serif';
  const copy = posterTextLines(
    ctx,
    input.text === input.name ? '' : input.text,
    450,
    3,
  );
  const footerHeight = Math.max(
    294,
    64 + title.length * 50 + (copy.length ? 18 + copy.length * 40 : 0),
  );
  canvas.width = width;
  canvas.height = heroHeight + footerHeight;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, canvas.height);
  if (hero) {
    ctx.fillStyle = '#F5F5F5';
    ctx.fillRect(0, 0, width, heroHeight);
    const scale = Math.min(
      width / hero.naturalWidth,
      heroHeight / hero.naturalHeight,
    );
    const w = hero.naturalWidth * scale;
    ctx.drawImage(hero, (width - w) / 2, 0, w, heroHeight);
  }
  ctx.fillStyle = /^#[\dA-Fa-f]{6}$/.test(input.color)
    ? input.color
    : '#D85036';
  ctx.fillRect(32, heroHeight + 30, 40, 5);
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#202124';
  ctx.font = '600 38px "PingFang SC", "Microsoft YaHei", sans-serif';
  let y = heroHeight + 52;
  for (const line of title) {
    ctx.fillText(line, 32, y);
    y += 50;
  }
  ctx.fillStyle = '#64666B';
  ctx.font = '28px "PingFang SC", "Microsoft YaHei", sans-serif';
  y += 18;
  for (const line of copy) {
    ctx.fillText(line, 32, y);
    y += 40;
  }
  // A separate white zone keeps even a dark source image away from the code.
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(506, heroHeight + 24, 220, 220);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(code, 518, heroHeight + 36, 196, 196);
  ctx.imageSmoothingEnabled = true;
  ctx.fillStyle = '#64666B';
  ctx.font = '24px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    input.channel === 'miniapp' ? '微信扫码参与活动' : '长按识别 · 参与活动',
    616,
    heroHeight + 248,
  );
  input.signal.throwIfAborted();
  return canvas.toDataURL('image/png');
}
