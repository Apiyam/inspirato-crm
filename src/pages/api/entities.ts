import { getAll, query, queryOne, updateOne } from './supabase';
import { supabase } from './supabase';
import {
  ChatSummaryCache,
  ContactSummary,
  CrmConfig,
  DEFAULT_CRM_CONFIG,
  LeadComment,
  MessageStats,
} from 'types/crm';
export const fetchClientLeads = async () => {
  const clientLeads = await getAll('get_client_leads');
  return clientLeads?.sort(
    (a: { unread_count?: number; timestamp?: string }, b: { unread_count?: number; timestamp?: string }) => {
      const unreadDiff = (b.unread_count || 0) - (a.unread_count || 0);
      if (unreadDiff !== 0) return unreadDiff;
      return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
    },
  );
};

export const markConversationRead = async (phoneNumber: string, userId?: string) => {
  const phone = phoneNumber.trim();
  if (!phone) return null;

  const payload: Record<string, unknown> = {
    phone_number: phone,
    last_read_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (userId) payload.updated_by = userId;

  const { data, error } = await supabase
    .from('conversation_read_state')
    .upsert(payload, { onConflict: 'phone_number' })
    .select()
    .single();

  if (error || !data) return null;
  return data;
};

export const updateClientLead = async (clientId: number, payload: Record<string, unknown>) => {
  const updated = await updateOne('client_lead', clientId, payload);
  return updated;
};

export const fetchChatMessages = async (phoneNumber: string) => {
  const chatMessages = await query('messages', 'user_phone', phoneNumber);
  if (!chatMessages) return [];
  return chatMessages.sort(
    (a: { timestamp: string }, b: { timestamp: string }) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
};

export const fetchMessageById = async (messageId: number) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('id', messageId)
    .maybeSingle();
  if (error || !data) return null;
  return data;
};

export const getMessageStats = async (phoneNumber: string): Promise<MessageStats> => {
  const messages = await fetchChatMessages(phoneNumber);
  const incoming = messages.filter((m: { direction: string }) => m.direction === 'incoming').length;
  const outgoing = messages.filter((m: { direction: string }) => m.direction === 'outgoing').length;
  return { total: messages.length, incoming, outgoing };
};

export const fetchSettings = async () => {
  const settings = await queryOne('settings', 'id', '1');
  return settings;
};

export const updateSettings = async (payload: Record<string, unknown>) => {
  const updated = await updateOne('settings', 1, payload);
  return updated;
};

const parseCrmConfig = (raw: unknown): CrmConfig => {
  if (!raw) return DEFAULT_CRM_CONFIG;
  if (typeof raw === 'string') {
    try {
      return { ...DEFAULT_CRM_CONFIG, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_CRM_CONFIG;
    }
  }
  if (typeof raw === 'object') {
    return {
      ...DEFAULT_CRM_CONFIG,
      ...(raw as CrmConfig),
      leadStatuses:
        (raw as CrmConfig).leadStatuses?.length > 0
          ? (raw as CrmConfig).leadStatuses
          : DEFAULT_CRM_CONFIG.leadStatuses,
      businessLines:
        (raw as CrmConfig).businessLines?.length === 3
          ? (raw as CrmConfig).businessLines
          : DEFAULT_CRM_CONFIG.businessLines,
      cardMappings: Array.isArray((raw as CrmConfig).cardMappings)
        ? (raw as CrmConfig).cardMappings
        : DEFAULT_CRM_CONFIG.cardMappings,
    };
  }
  return DEFAULT_CRM_CONFIG;
};

export const fetchCrmConfig = async (): Promise<CrmConfig> => {
  const settings = await fetchSettings();
  return parseCrmConfig(settings?.crm_config);
};

export const updateCrmConfig = async (config: CrmConfig) => {
  return updateSettings({ crm_config: config });
};

export const fetchLeadComments = async (clientLeadId: number): Promise<LeadComment[]> => {
  const { data, error } = await supabase
    .from('client_lead_comment')
    .select('*')
    .eq('client_lead_id', clientLeadId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data as LeadComment[];
};

export const createLeadComment = async (payload: {
  client_lead_id: number;
  author_email?: string;
  author_name?: string;
  comment_text: string;
}) => {
  const { data, error } = await supabase
    .from('client_lead_comment')
    .insert(payload)
    .select()
    .single();
  if (error || !data) return null;
  return data as LeadComment;
};

export const fetchCachedSummary = async (
  clientLeadId: number,
): Promise<ChatSummaryCache | null> => {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('chat_summary_cache')
    .select('*')
    .eq('client_lead_id', clientLeadId)
    .gt('expires_at', now)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data as ChatSummaryCache;
};

export const saveCachedSummary = async (payload: {
  client_lead_id: number;
  phone_number: string;
  summary: ContactSummary;
  message_count: number;
  incoming_count: number;
  outgoing_count: number;
}) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 1);

  await supabase.from('chat_summary_cache').delete().eq('client_lead_id', payload.client_lead_id);

  const { data, error } = await supabase
    .from('chat_summary_cache')
    .insert({
      ...payload,
      summary: payload.summary,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error || !data) return null;
  return data as ChatSummaryCache;
};
