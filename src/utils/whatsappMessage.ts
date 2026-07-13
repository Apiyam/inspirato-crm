export type WhatsAppMediaType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'unknown';

export interface ParsedWhatsAppMessage {
  id: number;
  from: 'user' | 'client';
  text: string;
  time: string;
  mediaType: WhatsAppMediaType;
  mediaUrl?: string;
  mediaMime?: string;
  mediaId?: string;
  caption?: string;
  hasMedia: boolean;
  raw: Record<string, unknown>;
}

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp|svg)(\?.*)?$/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v|3gp)(\?.*)?$/i;
const AUDIO_EXT = /\.(mp3|ogg|wav|m4a|aac|opus)(\?.*)?$/i;
const DOC_EXT = /\.(pdf|docx?|xlsx?|pptx?|txt|zip|rar)(\?.*)?$/i;

export function formatMessageText(text?: string | null): string {
  if (!text) return '';
  return String(text).replace(/\\n/g, '\n');
}

const inferTypeFromUrl = (url: string): WhatsAppMediaType => {
  if (IMAGE_EXT.test(url)) return 'image';
  if (VIDEO_EXT.test(url)) return 'video';
  if (AUDIO_EXT.test(url)) return 'audio';
  if (DOC_EXT.test(url)) return 'document';
  return 'unknown';
};

const inferTypeFromMime = (mime?: string): WhatsAppMediaType => {
  if (!mime) return 'unknown';
  const m = mime.toLowerCase();
  if (m.startsWith('image/')) return 'image';
  if (m.startsWith('video/')) return 'video';
  if (m.startsWith('audio/')) return 'audio';
  if (m.includes('sticker')) return 'sticker';
  if (m.startsWith('application/') || m.includes('pdf')) return 'document';
  return 'unknown';
};

const pickString = (raw: Record<string, unknown>, keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
};

const tryParseJsonMessage = (text: string): Record<string, unknown> | null => {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
  try {
    const parsed = JSON.parse(trimmed);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

/** URLs de la API de Twilio requieren auth — no son descargables en el browser. */
export function isTwilioApiUrl(url?: string): boolean {
  if (!url) return false;
  return /api\.twilio\.com/i.test(url);
}

/** URL pública usable directamente (CDN, Storage, etc.). */
export function isUsableDirectMediaUrl(url?: string): boolean {
  if (!url) return false;
  return !isTwilioApiUrl(url);
}

/** Extrae ME… o MM… de una URL de media de Twilio. */
export function extractTwilioMediaId(url?: string): string | undefined {
  if (!url) return undefined;
  const mediaMatch = url.match(/\/Media\/(ME[a-f0-9]+)/i);
  if (mediaMatch) return mediaMatch[1];
  const messageMatch = url.match(/\/Messages\/(MM[a-f0-9]+)/i);
  if (messageMatch) return messageMatch[1];
  return undefined;
}

export function sanitizeMediaFields(
  mediaUrl?: string,
  mediaId?: string,
): { mediaUrl?: string; mediaId?: string } {
  let url = mediaUrl;
  let id = mediaId;

  if (url && isTwilioApiUrl(url)) {
    id = id || extractTwilioMediaId(url);
    url = undefined;
  }

  return { mediaUrl: url, mediaId: id };
}

export function getStoredMediaUrl(raw: Record<string, unknown>): string | undefined {
  for (const key of ['media_url', 'mediaUrl', 'image_url', 'attachment_url', 'file_url']) {
    const value = raw[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

export function parseWhatsAppMessage(
  raw: Record<string, unknown>,
  formatTime: (timestamp: string) => string,
): ParsedWhatsAppMessage {
  const id = Number(raw.id) || 0;
  const direction = String(raw.direction || '');
  const from: 'user' | 'client' = direction === 'incoming' ? 'user' : 'client';
  const timestamp = String(raw.timestamp || raw.created_at || '');
  const time = timestamp ? formatTime(timestamp) : '';

  let text = formatMessageText(pickString(raw, ['message_text', 'text', 'body', 'caption']));
  let mediaUrl = pickString(raw, [
    'media_url',
    'mediaUrl',
    'image_url',
    'attachment_url',
    'file_url',
    'media_link',
  ]);
  let mediaId = pickString(raw, ['media_id', 'mediaId', 'whatsapp_media_id']);
  let mediaMime = pickString(raw, ['media_mime', 'media_mime_type', 'mime_type', 'mimetype']);
  let explicitType = pickString(raw, ['message_type', 'media_type', 'type', 'msg_type']);

  const jsonPayload = text ? tryParseJsonMessage(text) : null;
  if (jsonPayload) {
    text =
      formatMessageText(
        pickString(jsonPayload, ['caption', 'body', 'text', 'message', 'message_text']),
      ) || '';
    mediaUrl =
      mediaUrl ||
      pickString(jsonPayload, ['media_url', 'mediaUrl', 'media', 'image', 'file']);
    mediaId = mediaId || pickString(jsonPayload, ['media_id', 'mediaId']);
    mediaMime = mediaMime || pickString(jsonPayload, ['mime_type', 'mimetype', 'mime']);
    explicitType = explicitType || pickString(jsonPayload, ['type', 'message_type', 'media_type']);
  }

  // Solo hay archivo descargable si media_id y media_url existen (no nulos).
  const sourceMediaUrl = mediaUrl;
  const sourceMediaId = mediaId || extractTwilioMediaId(sourceMediaUrl);
  const hasMedia = Boolean(sourceMediaId && sourceMediaUrl);

  const loweredType = (explicitType || '').toLowerCase();
  let mediaType: WhatsAppMediaType = 'text';

  if (hasMedia) {
    if (loweredType.includes('image') || loweredType === 'img') mediaType = 'image';
    else if (loweredType.includes('video')) mediaType = 'video';
    else if (loweredType.includes('audio') || loweredType.includes('ptt') || loweredType.includes('voice')) {
      mediaType = 'audio';
    } else if (loweredType.includes('document') || loweredType.includes('file')) mediaType = 'document';
    else if (loweredType.includes('sticker')) mediaType = 'sticker';
    else if (mediaUrl) mediaType = inferTypeFromUrl(mediaUrl);
    else if (mediaMime) mediaType = inferTypeFromMime(mediaMime);
    else mediaType = 'unknown';

    if (mediaType === 'text') mediaType = 'unknown';
  }

  const sanitized = sanitizeMediaFields(mediaUrl, mediaId);
  mediaUrl = sanitized.mediaUrl;
  mediaId = sanitized.mediaId || sourceMediaId;

  return {
    id,
    from,
    text,
    time,
    mediaType: hasMedia ? mediaType : 'text',
    mediaUrl,
    mediaMime,
    mediaId,
    caption: text,
    hasMedia,
    raw,
  };
}

export const mediaTypeLabel: Record<WhatsAppMediaType, string> = {
  text: 'Texto',
  image: 'Imagen',
  video: 'Video',
  audio: 'Audio',
  document: 'Documento',
  sticker: 'Sticker',
  unknown: 'Archivo',
};
