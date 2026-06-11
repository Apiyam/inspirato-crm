import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchMessageById } from './entities';
import { parseWhatsAppMessage } from 'utils/whatsappMessage';

type MediaResponse = {
  mediaUrl?: string;
  mediaType?: string;
  mediaMime?: string;
  caption?: string;
  text?: string;
  error?: string;
};

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

async function fetchMediaFromWebhook(payload: Record<string, unknown>) {
  const webhook =
    process.env.NEXT_PUBLIC_N8N_WHATSAPP_WEBHOOK_URL ||
    process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
  if (!webhook) return null;

  const response = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'get_media',
      ...payload,
    }),
  });

  if (!response.ok) return null;
  const data = await response.json();
  return (
    data?.media_url ||
    data?.mediaUrl ||
    data?.url ||
    data?.link ||
    data?.file_url ||
    null
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<MediaResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido.' });
  }

  const messageId = Number(req.body?.messageId);
  if (!messageId) {
    return res.status(400).json({ error: 'messageId requerido.' });
  }

  const row = await fetchMessageById(messageId);
  if (!row) {
    return res.status(404).json({ error: 'Mensaje no encontrado.' });
  }

  const parsed = parseWhatsAppMessage(row as Record<string, unknown>, formatTimestamp);

  if (parsed.mediaUrl) {
    return res.status(200).json({
      mediaUrl: parsed.mediaUrl,
      mediaType: parsed.mediaType,
      mediaMime: parsed.mediaMime,
      caption: parsed.caption,
      text: parsed.text,
    });
  }

  if (parsed.mediaId || parsed.hasMedia) {
    const remoteUrl = await fetchMediaFromWebhook({
      message_id: messageId,
      media_id: parsed.mediaId,
      user_phone: row.user_phone,
      phone_number: row.user_phone,
    });

    if (remoteUrl) {
      return res.status(200).json({
        mediaUrl: remoteUrl,
        mediaType: parsed.mediaType,
        mediaMime: parsed.mediaMime,
        caption: parsed.caption,
        text: parsed.text,
      });
    }
  }

  return res.status(404).json({
    error: 'No se encontró media para este mensaje.',
    text: parsed.text,
    caption: parsed.caption,
  });
}
