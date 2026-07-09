import { buildGetFileInfoPayload, GetFileInfoParams } from 'utils/n8nFileInfo';

const n8nWebhookUrl = () =>
  process.env.NEXT_PUBLIC_N8N_WHATSAPP_WEBHOOK_URL ||
  process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL ||
  '';

export const sendAPIRequest = async (payload: Record<string, unknown>) => {
  const response = await fetch(n8nWebhookUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return response.json();
};

/** N8N responde con el binario del archivo (no JSON). */
export const getFileBinaryRequest = async (params: GetFileInfoParams): Promise<Response> => {
  const webhook = n8nWebhookUrl();
  if (!webhook) {
    throw new Error('Webhook de N8N no configurado.');
  }

  const response = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildGetFileInfoPayload(params)),
  });

  return response;
};
