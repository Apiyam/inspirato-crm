export interface LeadStatusConfig {
  key: string;
  label: string;
  color: string;
}

export interface BusinessLineConfig {
  name: string;
  phones: string;
}

/** Mapeo intención del bot → Content SID de Twilio (tarjetas / plantillas). */
export interface TwilioCardMapping {
  intention: string;
  twilioId: string;
  usage: string;
}

export interface CrmConfig {
  leadStatuses: LeadStatusConfig[];
  newContactPhones: string;
  businessLines: BusinessLineConfig[];
  cardMappings: TwilioCardMapping[];
}

export interface ClientLead {
  id: number;
  full_name?: string;
  phone_number: string;
  status: string;
  message_text?: string;
  timestamp?: string;
}

export interface ChatMessage {
  id: number;
  user_phone: string;
  message_text: string;
  direction: 'incoming' | 'outgoing';
  timestamp: string;
}

export interface ContactSummary {
  resumen_ejecutivo: string;
  linea_negocio: string;
  linea_negocio_confianza: number;
  linea_negocio_justificacion: string;
  nombre: string;
  empresa: string;
  correo: string;
  telefono_adicional: string;
  ubicacion: string;
  cargo_rol: string;
  interes: string;
  necesidad_detectada: string;
  presupuesto_mencionado: string;
  urgencia: string;
  intencion_compra: string;
  datos_adicionales: string[];
  objeciones: string[];
  proximos_pasos_sugeridos: string[];
  tiempo_chateando: string;
  ultimo_mensaje: string;
  clasificacion_sugerida: string;
  justificacion: string;
  /** @deprecated compatibilidad con cachés antiguos */
  informacion_usuario?: string;
}

export interface LeadComment {
  id: number;
  client_lead_id: number;
  author_email?: string;
  author_name?: string;
  comment_text: string;
  created_at: string;
}

export interface ChatSummaryCache {
  id: number;
  client_lead_id: number;
  phone_number: string;
  summary: ContactSummary;
  message_count: number;
  incoming_count: number;
  outgoing_count: number;
  created_at: string;
  expires_at: string;
}

export interface MessageStats {
  total: number;
  incoming: number;
  outgoing: number;
}

export const DEFAULT_LEAD_STATUSES: LeadStatusConfig[] = [
  { key: 'lead', label: 'Nuevo lead', color: '#B0694D' },
  { key: 'contacto', label: 'Contacto', color: '#4CAF7D' },
  { key: 'prospecto', label: 'Prospecto', color: '#D4A04A' },
  { key: 'colaborador', label: 'Colaborador', color: '#7B9EC4' },
  { key: 'ignorado', label: 'Ignorado', color: '#C45C4A' },
];

export const DEFAULT_CARD_MAPPINGS: TwilioCardMapping[] = [
  { intention: 'greetings', twilioId: 'HC1234322', usage: 'Saludo inicial' },
  { intention: 'menu_servicios', twilioId: 'HC1234322', usage: 'Menú de servicios' },
  { intention: 'carrusel_regalos', twilioId: 'HC1234322', usage: 'Carrusel de regalos' },
];

export const DEFAULT_CRM_CONFIG: CrmConfig = {
  leadStatuses: DEFAULT_LEAD_STATUSES,
  newContactPhones: '',
  businessLines: [
    { name: 'Línea de negocio 1', phones: '' },
    { name: 'Línea de negocio 2', phones: '' },
    { name: 'Línea de negocio 3', phones: '' },
  ],
  cardMappings: DEFAULT_CARD_MAPPINGS,
};
