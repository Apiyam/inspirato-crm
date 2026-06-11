const n8nWebhookUrl = () =>
  process.env.NEXT_PUBLIC_N8N_WHATSAPP_WEBHOOK_URL ||
  process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL ||
  "";

export const sendAPIRequest = async (payload: Record<string, unknown>) => {
    const response = await fetch(
        n8nWebhookUrl(),
        {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    return response.json();
}


