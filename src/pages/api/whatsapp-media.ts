import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchMessageById } from './entities';
import {
  parseWhatsAppMessage,
  isUsableDirectMediaUrl,
  extractTwilioMediaId,
  getStoredMediaUrl,
} from 'utils/whatsappMessage';
import { fetchMediaBinaryFromN8n } from 'utils/n8nFileInfo';
import { resolveMessageMedia } from 'utils/whatsappMediaServer';

type MediaResponse = {
  mediaUrl?: string;
  mediaType?: string;
  mediaMime?: string;
  caption?: string;
  text?: string;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MediaResponse | Buffer>,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido.' });
  }

  const bodyMediaId = String(req.body?.media_id || '').trim();
  const bodyMediaUrl = String(req.body?.media_url || '').trim();
  const messageId = Number(req.body?.messageId);

  if (bodyMediaId) {
    const response = await fetchMediaBinaryFromN8n({
      mediaId: bodyMediaId,
      mediaUrl: bodyMediaUrl || undefined,
    });

    if (!response?.ok) {
      return res.status(404).json({ error: 'No se encontró media para este media_id.' });
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        const data = (await response.json()) as { error?: string };
        return res.status(404).json({ error: data.error || 'No se encontró media para este media_id.' });
      } catch {
        return res.status(404).json({ error: 'No se encontró media para este media_id.' });
      }
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    res.setHeader('Content-Type', contentType || 'application/octet-stream');
    const disposition = response.headers.get('content-disposition');
    if (disposition) res.setHeader('Content-Disposition', disposition);
    return res.status(200).send(buffer);
  }

  if (!messageId) {
    return res.status(400).json({ error: 'media_id o messageId requerido.' });
  }

  const row = await fetchMessageById(messageId);
  if (!row) {
    return res.status(404).json({ error: 'Mensaje no encontrado.' });
  }

  const parsed = parseWhatsAppMessage(row as Record<string, unknown>, () => '');
  if (isUsableDirectMediaUrl(parsed.mediaUrl)) {
    return res.status(200).json({
      mediaUrl: parsed.mediaUrl,
      mediaType: parsed.mediaType,
      mediaMime: parsed.mediaMime,
      caption: parsed.caption,
      text: parsed.text,
    });
  }

  const resolvedMediaId =
    parsed.mediaId ||
    extractTwilioMediaId(String(row.media_url || '')) ||
    extractTwilioMediaId(parsed.mediaUrl);

  if (resolvedMediaId) {
    const response = await fetchMediaBinaryFromN8n({
      mediaId: resolvedMediaId,
      mediaUrl: getStoredMediaUrl(row as Record<string, unknown>) || String(row.media_url || ''),
    });

    if (response?.ok) {
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const buffer = Buffer.from(await response.arrayBuffer());
        res.setHeader('Content-Type', contentType || 'application/octet-stream');
        const disposition = response.headers.get('content-disposition');
        if (disposition) res.setHeader('Content-Disposition', disposition);
        return res.status(200).send(buffer);
      }
    }
  }

  const resolved = await resolveMessageMedia(row as Record<string, unknown>);
  if (resolved?.mediaUrl && isUsableDirectMediaUrl(resolved.mediaUrl)) {
    return res.status(200).json({
      mediaUrl: resolved.mediaUrl,
      mediaType: resolved.mediaType,
      mediaMime: resolved.mediaMime,
      caption: resolved.caption,
      text: resolved.text,
    });
  }

  return res.status(404).json({
    error: 'No se encontró media descargable para este mensaje.',
    text: parsed.text,
    caption: parsed.caption,
  });
}
