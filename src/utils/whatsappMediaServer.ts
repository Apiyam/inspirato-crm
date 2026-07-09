import {
  parseWhatsAppMessage,
  WhatsAppMediaType,
  isUsableDirectMediaUrl,
  extractTwilioMediaId,
  getStoredMediaUrl,
} from './whatsappMessage';

export interface ResolvedMessageMedia {
  messageId: number;
  mediaUrl?: string;
  sourceMediaUrl?: string;
  mediaType: WhatsAppMediaType;
  mediaMime?: string;
  mediaId?: string;
  caption?: string;
  text?: string;
  timestamp: string;
  direction: 'incoming' | 'outgoing';
  resolved: boolean;
}

const formatTimestamp = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export async function resolveMessageMedia(
  row: Record<string, unknown>,
): Promise<ResolvedMessageMedia | null> {
  const parsed = parseWhatsAppMessage(row, formatTimestamp);
  if (!parsed.hasMedia) return null;

  const mediaIdForFetch =
    parsed.mediaId ||
    extractTwilioMediaId(String(row.media_url || row.mediaUrl || ''));

  const sourceMediaUrl =
    getStoredMediaUrl(row) ||
    String(row.media_url || row.mediaUrl || '') ||
    undefined;

  const mediaUrl = isUsableDirectMediaUrl(parsed.mediaUrl) ? parsed.mediaUrl : undefined;

  return {
    messageId: parsed.id,
    mediaUrl,
    sourceMediaUrl,
    mediaType: parsed.mediaType,
    mediaMime: parsed.mediaMime,
    mediaId: mediaIdForFetch || parsed.mediaId,
    caption: parsed.caption,
    text: parsed.text,
    timestamp: String(row.timestamp || row.created_at || ''),
    direction: String(row.direction) === 'outgoing' ? 'outgoing' : 'incoming',
    resolved: Boolean(mediaUrl || mediaIdForFetch),
  };
}

export const MAX_REMOTE_MEDIA_RESOLVE = 20;
