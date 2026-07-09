import { isTwilioApiUrl } from './whatsappMessage';

export interface FileInfoResult {
  mediaUrl?: string;
  mediaMime?: string;
  raw?: Record<string, unknown>;
}

const pickString = (raw: Record<string, unknown>, keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
};

export function parseFileInfoResponse(data: unknown): FileInfoResult | null {
  if (!data || typeof data !== 'object') return null;
  const raw = data as Record<string, unknown>;
  const mediaUrlRaw = pickString(raw, ['media_url', 'mediaUrl', 'url', 'link', 'file_url']);
  const mediaUrl = mediaUrlRaw && !isTwilioApiUrl(mediaUrlRaw) ? mediaUrlRaw : undefined;
  const mediaMime = pickString(raw, ['media_mime', 'mediaMime', 'mime_type', 'mimetype']);
  if (!mediaUrl && !mediaMime) return null;
  return { mediaUrl, mediaMime, raw };
}

export function getN8nWebhookUrl(): string | null {
  const webhook =
    process.env.NEXT_PUBLIC_N8N_WHATSAPP_WEBHOOK_URL ||
    process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
  return webhook || null;
}

export interface GetFileInfoParams {
  mediaId: string;
  mediaUrl?: string;
}

export function buildGetFileInfoPayload(params: GetFileInfoParams): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    action: 'get-file-info',
    media_id: params.mediaId.trim(),
  };
  const mediaUrl = params.mediaUrl?.trim();
  if (mediaUrl) payload.media_url = mediaUrl;
  return payload;
}

/** Descarga binaria desde N8N (misma ruta base que el envío de mensajes). */
export async function fetchMediaBinaryFromN8n(
  params: GetFileInfoParams,
): Promise<Response | null> {
  const webhook = getN8nWebhookUrl();
  if (!webhook || !params.mediaId.trim()) return null;

  try {
    return await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildGetFileInfoPayload(params)),
    });
  } catch {
    return null;
  }
}
