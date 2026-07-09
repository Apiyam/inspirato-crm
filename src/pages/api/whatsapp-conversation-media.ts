import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchChatMessages } from './entities';
import { parseWhatsAppMessage } from 'utils/whatsappMessage';
import { resolveMessageMedia, ResolvedMessageMedia } from 'utils/whatsappMediaServer';

type ConversationMediaResponse = {
  items: ResolvedMessageMedia[];
  total: number;
  resolvedCount: number;
  unresolvedCount: number;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ConversationMediaResponse>,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      items: [],
      total: 0,
      resolvedCount: 0,
      unresolvedCount: 0,
      error: 'Método no permitido.',
    });
  }

  const phoneNumber = String(req.body?.phoneNumber || '').trim();
  if (!phoneNumber) {
    return res.status(400).json({
      items: [],
      total: 0,
      resolvedCount: 0,
      unresolvedCount: 0,
      error: 'phoneNumber requerido.',
    });
  }

  const messages = await fetchChatMessages(phoneNumber);
  const items: ResolvedMessageMedia[] = [];

  for (const row of messages) {
    const parsed = parseWhatsAppMessage(row as Record<string, unknown>, () => '');
    if (!parsed.hasMedia) continue;

    const item = await resolveMessageMedia(row as Record<string, unknown>);
    if (item) items.push(item);
  }

  items.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  const resolvedCount = items.filter((item) => item.resolved).length;

  return res.status(200).json({
    items,
    total: items.length,
    resolvedCount,
    unresolvedCount: items.length - resolvedCount,
  });
}
