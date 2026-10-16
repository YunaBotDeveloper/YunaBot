import type {Attachment} from 'discord.js';
import sharp from 'sharp';

export type ImageKind = 'png' | 'jpeg' | 'gif' | 'webp';

export interface CheckOptions {
  maxBytes?: number;
  maxPixels?: number;
  allowed?: ImageKind[];
  deepDecode?: boolean;
  timeoutMs?: number;
}

export type CheckResult =
  | {ok: true; kind: ImageKind; width: number; height: number; buffer: Buffer}
  | {ok: false; reason: string};

const fail = (reason: string): CheckResult => ({ok: false, reason});

export function sniffImage(buf: Uint8Array): ImageKind | null {
  const has = (sig: number[], offset = 0) =>
    buf.length >= offset + sig.length &&
    sig.every((b, i) => buf[offset + i] === b);

  if (has([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  if (has([0xff, 0xd8, 0xff])) return 'jpeg';
  if (has([0x47, 0x49, 0x46, 0x38])) return 'gif';
  if (has([0x52, 0x49, 0x46, 0x46]) && has([0x57, 0x45, 0x42, 0x50], 8))
    return 'webp';
  return null;
}

export async function checkImageAttachment(
  att: Attachment,
  opts: CheckOptions = {},
): Promise<CheckResult> {
  const {
    maxBytes = 8 * 1024 * 1024,
    maxPixels = 40_000_000,
    allowed = ['png', 'jpeg', 'gif', 'webp'],
    deepDecode = true,
    timeoutMs = 10_000,
  } = opts;

  if (att.size > maxBytes)
    return fail(`File too big (max ${Math.round(maxBytes / 1024 / 1024)} MB).`);

  let buffer: Buffer;
  try {
    const res = await fetch(att.url, {signal: AbortSignal.timeout(timeoutMs)});
    if (!res.ok) return fail(`Download failed (HTTP ${res.status}).`);
    buffer = Buffer.from(await res.arrayBuffer());
  } catch {
    return fail('Download failed or timed out.');
  }

  if (buffer.length > maxBytes) return fail('File too big.');

  const kind = sniffImage(buffer);
  if (!kind) return fail('Not an image (bad file signature).');
  if (!allowed.includes(kind)) return fail(`Format ${kind} not allowed.`);

  try {
    const sharpOpts = {limitInputPixels: maxPixels, failOn: 'error' as const};
    const meta = await sharp(buffer, sharpOpts).metadata();
    if (!meta.width || !meta.height) return fail('Image has no dimensions.');

    if (deepDecode) await sharp(buffer, sharpOpts).stats();

    return {ok: true, kind, width: meta.width, height: meta.height, buffer};
  } catch {
    return fail('Corrupt or unreadable image.');
  }
}
