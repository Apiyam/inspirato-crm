import { buildGetFileInfoPayload, GetFileInfoParams } from 'utils/n8nFileInfo';

const n8nWebhookUrl = () =>
  process.env.NEXT_PUBLIC_N8N_WHATSAPP_WEBHOOK_URL ||
  process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL ||
  '';

export const sendAPIRequest = async (payload: Record<string, unknown>) => {
  const webhook = n8nWebhookUrl();
  if (!webhook) {
    throw new Error('Webhook de N8N no configurado.');
  }

  const response = await fetch(webhook, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const contentType = response.headers.get('content-type') || '';
  let data: unknown = null;

  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    const text = await response.text().catch(() => '');
    data = text ? { message: text } : null;
  }

  if (!response.ok) {
    const errObj = data as { error?: string; message?: string } | null;
    throw new Error(
      errObj?.error || errObj?.message || `Error al contactar N8N (${response.status}).`,
    );
  }

  return data;
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
