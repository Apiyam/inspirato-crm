import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchCachedSummary, fetchCrmConfig, saveCachedSummary } from './entities';
import { DEFAULT_CRM_CONFIG } from 'types/crm';
import { normalizeContactSummary } from 'utils/contactSummary';
import type { ContactSummary } from 'types/crm';

type SummaryResponse = {
  summary?: ContactSummary;
  cached?: boolean;
  messageStats?: { total: number; incoming: number; outgoing: number };
  expiresAt?: string;
  error?: string;
};

const normalizeText = (value: string) =>
  (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const isIgnoredStatus = (statusValue: string) => normalizeText(statusValue) === 'ignorado';

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

const formatHumanDuration = (start?: string, end?: string) => {
  if (!start || !end) return 'No hay suficiente historial para calcularlo';
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return 'No hay suficiente historial para calcularlo';
  }

  const ms = Math.max(0, endDate.getTime() - startDate.getTime());
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} día${days === 1 ? '' : 's'}`);
  if (hours > 0) parts.push(`${hours} hora${hours === 1 ? '' : 's'}`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} min`);

  return parts.join(', ');
};

const buildIgnoredSummary = (readableChatTime: string, fallbackLastMessage: string): ContactSummary =>
  normalizeContactSummary({
    resumen_ejecutivo: 'El contacto está marcado como ignorado en el CRM.',
    linea_negocio: 'No evaluada',
    linea_negocio_confianza: 0,
    linea_negocio_justificacion: 'Contacto con estatus ignorado.',
    interes: 'No evaluado.',
    necesidad_detectada: 'No evaluada.',
    tiempo_chateando: readableChatTime,
    ultimo_mensaje: fallbackLastMessage,
    clasificacion_sugerida: 'ignorado',
    justificacion: 'Se omite el análisis comercial por estatus ignorado.',
  })!;

export default async function handler(req: NextApiRequest, res: NextApiResponse<SummaryResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo no permitido.' });
  }

  const contact = req.body?.contact;
  const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const forceRefresh = Boolean(req.body?.forceRefresh);
  const clientLeadId = Number(contact?.id);

  if (!contact) {
    return res.status(400).json({ error: 'No se recibio informacion del contacto.' });
  }

  const incomingCount = messages.filter((m: { direction?: string }) => m.direction === 'incoming').length;
  const outgoingCount = messages.filter((m: { direction?: string }) => m.direction === 'outgoing').length;
  const messageStats = { total: messages.length, incoming: incomingCount, outgoing: outgoingCount };

  if (!forceRefresh && clientLeadId) {
    const cached = await fetchCachedSummary(clientLeadId);
    if (cached?.summary) {
      const summary = normalizeContactSummary(cached.summary as Partial<ContactSummary>);
      return res.status(200).json({
        summary: summary || undefined,
        cached: true,
        messageStats: {
          total: cached.message_count,
          incoming: cached.incoming_count,
          outgoing: cached.outgoing_count,
        },
        expiresAt: cached.expires_at,
      });
    }
  }

  const compactMessages = messages.slice(-150).map((message: Record<string, string>) => ({
    direction: message.direction || message.from || '',
    text: message.message_text || message.text || '',
    timestamp: message.timestamp || message.time || '',
  }));

  const fallbackLastMessage = compactMessages.length
    ? compactMessages[compactMessages.length - 1].text
    : contact.message_text || 'Sin mensaje reciente';

  const firstTimestamp = compactMessages[0]?.timestamp;
  const lastTimestamp = compactMessages[compactMessages.length - 1]?.timestamp;
  const readableDuration = formatHumanDuration(firstTimestamp, lastTimestamp);
  const readableChatTime =
    firstTimestamp && lastTimestamp
      ? `${readableDuration} (del ${formatTimestamp(firstTimestamp)} al ${formatTimestamp(lastTimestamp)})`
      : 'No hay suficiente historial para calcularlo';

  if (isIgnoredStatus(contact.status || '')) {
    const summary = buildIgnoredSummary(readableChatTime, fallbackLastMessage);
    return res.status(200).json({ summary, messageStats });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  if (!apiKey) {
    return res.status(500).json({
      error: 'Falta OPENAI_API_KEY en el entorno. Configura tu archivo .env.local.',
    });
  }

  const crmConfig = await fetchCrmConfig().catch(() => DEFAULT_CRM_CONFIG);
  const businessLines = crmConfig.businessLines?.length ? crmConfig.businessLines : DEFAULT_CRM_CONFIG.businessLines;
  const statusKeys = (crmConfig.leadStatuses?.length ? crmConfig.leadStatuses : DEFAULT_CRM_CONFIG.leadStatuses).map(
    (s) => s.key,
  );

  const businessLinesBlock = businessLines
    .map((line, index) => `  ${index + 1}. "${line.name}"`)
    .join('\n');

  const prompt = `
Eres un analista CRM experto. Analiza la conversación de WhatsApp y extrae TODA la información posible del cliente.

OBJETIVO PRINCIPAL: determinar a cuál LÍNEA DE NEGOCIO está interesado el contacto y perfilar al cliente con el máximo detalle.

LÍNEAS DE NEGOCIO CONFIGURADAS (elige UNA como principal, o "No determinada" / "Múltiple"):
${businessLinesBlock}

ESTATUS VÁLIDOS para clasificacion_sugerida: ${statusKeys.join(' | ')}

Reglas:
- Extrae datos SOLO si aparecen en la conversación o se infieren con alta confianza contextual.
- Si un dato no aparece, usa exactamente: "No identificado", "No mencionado", "No mencionada" o "No determinada" según corresponda.
- linea_negocio debe ser el nombre EXACTO de una línea configurada arriba, o "No determinada", o "Múltiple".
- datos_adicionales, objeciones y proximos_pasos_sugeridos son arrays de strings (pueden estar vacíos).
- urgencia: "alta" | "media" | "baja" | "no_determinada"
- linea_negocio_confianza: número entre 0 y 1

Devuelve SOLO JSON válido con esta estructura exacta:
{
  "resumen_ejecutivo": "síntesis ejecutiva del contacto y oportunidad",
  "linea_negocio": "nombre exacto de línea o No determinada o Múltiple",
  "linea_negocio_confianza": 0.85,
  "linea_negocio_justificacion": "por qué encaja en esa línea",
  "nombre": "nombre completo si se conoce",
  "empresa": "empresa u organización",
  "correo": "email si se mencionó",
  "telefono_adicional": "otro teléfono si se mencionó",
  "ubicacion": "ciudad, país o dirección",
  "cargo_rol": "puesto o rol profesional",
  "interes": "producto/servicio de interés",
  "necesidad_detectada": "problema o necesidad que busca resolver",
  "presupuesto_mencionado": "rango o monto si se mencionó",
  "urgencia": "alta|media|baja|no_determinada",
  "intencion_compra": "nivel de intención de compra o contratación",
  "datos_adicionales": ["cualquier dato relevante extra"],
  "objeciones": ["dudas o frenos detectados"],
  "proximos_pasos_sugeridos": ["acciones recomendadas para el equipo comercial"],
  "tiempo_chateando": "duración legible del intercambio",
  "ultimo_mensaje": "último mensaje relevante del cliente",
  "clasificacion_sugerida": "uno de los estatus válidos",
  "justificacion": "por qué ese estatus"
}

Datos del contacto en CRM:
${JSON.stringify(
  {
    full_name: contact.full_name || 'Sin nombre',
    phone_number: contact.phone_number || 'Sin teléfono',
    current_status: contact.status || 'sin estado',
  },
  null,
  2,
)}

Historial de mensajes (más recientes al final):
${JSON.stringify(compactMessages, null, 2)}

Referencia de tiempo del chat (usar este estilo en tiempo_chateando):
${readableChatTime}
`;

  try {
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.15,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'Eres un analista CRM B2B/B2C. Respondes únicamente JSON válido. Priorizas identificar línea de negocio y extraer datos de contacto comerciales.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!openAIResponse.ok) {
      const errorPayload = await openAIResponse.text();
      return res.status(500).json({ error: `OpenAI devolvio error: ${errorPayload}` });
    }

    const completion = await openAIResponse.json();
    const content = completion?.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    const suggestedStatus = statusKeys.includes(parsed.clasificacion_sugerida)
      ? parsed.clasificacion_sugerida
      : 'lead';

    const summary = normalizeContactSummary({
      ...parsed,
      tiempo_chateando: parsed.tiempo_chateando || readableChatTime,
      ultimo_mensaje: parsed.ultimo_mensaje || fallbackLastMessage,
      clasificacion_sugerida: suggestedStatus,
    });

    if (!summary) {
      return res.status(500).json({ error: 'No se pudo normalizar el resumen.' });
    }

    if (clientLeadId) {
      await saveCachedSummary({
        client_lead_id: clientLeadId,
        phone_number: contact.phone_number || '',
        summary,
        message_count: messageStats.total,
        incoming_count: messageStats.incoming,
        outgoing_count: messageStats.outgoing,
      });
    }

    return res.status(200).json({ summary, cached: false, messageStats });
  } catch (error: unknown) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Error interno al generar el resumen.',
    });
  }
}
