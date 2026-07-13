'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Box,
  Chip,
  IconButton,
  Input,
  Sheet,
  Snackbar,
  Stack,
  Typography,
  Button,
  Select,
  Option,
  Alert,
  Switch,
} from '@mui/joy';
import {
  Send,
  CheckCircle,
  ErrorOutline,
  Chat,
  Search,
  WhatsApp,
  ArrowBack,
  InfoOutlined,
  PauseCircleOutline,
} from '@mui/icons-material';
import { useMediaQuery } from '@mui/material';
import {
  fetchChatMessages,
  fetchClientLeads,
  markConversationRead,
  updateClientLead,
} from 'pages/api/entities';
import { formatDate } from 'utils/Utils';
import { sendAPIRequest } from 'pages/api/fileServer';
import LoadingInformation from './LoadingInformation';
import ClientDetailPanel from './ClientDetailPanel';
import { useCrmConfig } from 'hooks/useCrmConfig';
import { useAuth } from 'providers/AuthProvider';
import { ClientLead } from 'types/crm';
import { statusChipSx } from 'utils/statusHelpers';
import { parseWhatsAppMessage, ParsedWhatsAppMessage } from 'utils/whatsappMessage';
import WhatsAppMessageBubble from './WhatsAppMessageBubble';
import { supabaseBrowser } from 'lib/supabase/client';

interface WhatsAppBotProps {
  initialStatusFilter?: string;
}

const PAGE_SIZE = 15;

export default function WhatsAppBot({ initialStatusFilter = 'lead' }: WhatsAppBotProps) {
  const { config, getStatusLabel } = useCrmConfig();
  const { user } = useAuth();
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [messageSnackbar, setMessageSnackbar] = useState('');
  const [snackbarColor, setSnackbarColor] = useState<'success' | 'danger'>('success');
  const [selectedChat, setSelectedChat] = useState<ClientLead | null>(null);
  const [detailContact, setDetailContact] = useState<ClientLead | null>(null);
  const [message, setMessage] = useState('');
  const [clientLeads, setClientLeads] = useState<ClientLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ParsedWhatsAppMessage[]>([]);
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [botFilter, setBotFilter] = useState<'all' | 'paused' | 'active'>('all');
  const [searchConversation, setSearchConversation] = useState('');
  const [sortBy, setSortBy] = useState('unread');
  const [page, setPage] = useState(1);
  const isMobile = useMediaQuery('(max-width: 1100px)');
  const selectedChatRef = useRef(selectedChat);
  selectedChatRef.current = selectedChat;

  const showToast = useCallback((text: string, color: 'success' | 'danger' = 'success') => {
    setMessageSnackbar(text);
    setSnackbarColor(color);
    setOpenSnackbar(true);
  }, []);

  const mapChatMessages = useCallback(
    (chats: Record<string, unknown>[]) =>
      chats.map((chat) => parseWhatsAppMessage(chat, (ts) => formatDate(ts, true))),
    [],
  );

  const loadConversations = useCallback(async () => {
    const leads = await fetchClientLeads();
    if (!leads) return;
    setClientLeads(leads);
    const current = selectedChatRef.current;
    if (current) {
      const fresh = leads.find((l: ClientLead) => l.id === current.id);
      if (fresh) setSelectedChat((prev) => (prev ? { ...prev, ...fresh } : prev));
    }
  }, []);

  const loadMessages = useCallback(
    async (phoneNumber: string) => {
      const chats = await fetchChatMessages(phoneNumber);
      if (chats) setChatMessages(mapChatMessages(chats));
    },
    [mapChatMessages],
  );

  const markReadAndRefresh = useCallback(
    async (phoneNumber: string) => {
      await markConversationRead(phoneNumber, user?.id);
      setClientLeads((prev) =>
        prev.map((lead) =>
          lead.phone_number === phoneNumber ? { ...lead, unread_count: 0 } : lead,
        ),
      );
      void loadConversations();
    },
    [user?.id, loadConversations],
  );

  const selectChat = useCallback(
    async (chat: ClientLead) => {
      setSelectedChat(chat);
      if ((chat.unread_count || 0) > 0) {
        await markReadAndRefresh(chat.phone_number);
      } else {
        await markConversationRead(chat.phone_number, user?.id);
      }
    },
    [markReadAndRefresh, user?.id],
  );

  useEffect(() => {
    if (!selectedChat) return;
    void loadMessages(selectedChat.phone_number);
  }, [selectedChat?.id, selectedChat?.phone_number, loadMessages]);

  // Carga inicial + Realtime (sin poll)
  useEffect(() => {
    void loadConversations();

    const channel = supabaseBrowser
      .channel('inbox-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          const row = (payload.new || payload.old) as { user_phone?: string; direction?: string } | null;
          void loadConversations();

          const openPhone = selectedChatRef.current?.phone_number;
          if (!openPhone || !row?.user_phone) return;
          if (row.user_phone !== openPhone) return;

          void loadMessages(openPhone);
          if (payload.eventType === 'INSERT' && row.direction === 'incoming') {
            void markReadAndRefresh(openPhone);
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'client_lead' },
        () => {
          void loadConversations();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversation_read_state' },
        () => {
          void loadConversations();
        },
      )
      .subscribe();

    return () => {
      void supabaseBrowser.removeChannel(channel);
    };
  }, [loadConversations, loadMessages, markReadAndRefresh]);

  const handleStatusChange = async (status: string) => {
    if (!selectedChat) return;
    const updated = await updateClientLead(selectedChat.id, { status });
    if (updated) {
      const next = { ...selectedChat, status };
      setSelectedChat(next);
      setClientLeads((prev) => prev.map((l) => (l.id === selectedChat.id ? next : l)));
    }
  };

  const handleBotPausedChange = async (paused: boolean) => {
    if (!selectedChat) return;
    const updated = await updateClientLead(selectedChat.id, { bot_paused: paused });
    if (updated) {
      const next = { ...selectedChat, bot_paused: paused };
      setSelectedChat(next);
      setClientLeads((prev) => prev.map((l) => (l.id === selectedChat.id ? next : l)));
      showToast(paused ? 'Bot pausado para este contacto' : 'Bot reactivado para este contacto');
    }
  };

  const handleSend = async () => {
    if (!message.trim() || !selectedChat) return;
    const textToSend = message.trim();
    setLoading(true);
    try {
      await sendAPIRequest({
        phone_number: selectedChat.phone_number,
        message: textToSend,
        action: 'message',
      });
      setMessage('');
      showToast('Mensaje enviado');
      await loadMessages(selectedChat.phone_number);
      await loadConversations();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'No se pudo enviar el mensaje.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedChats = useMemo(() => {
    const query = searchConversation.trim().toLowerCase();
    const filtered = clientLeads.filter((chat) => {
      const matchesStatus = statusFilter === 'all' || chat.status === statusFilter;
      const matchesBot =
        botFilter === 'all' ||
        (botFilter === 'paused' && chat.bot_paused) ||
        (botFilter === 'active' && !chat.bot_paused);
      const matchesQuery =
        !query ||
        (chat.full_name || '').toLowerCase().includes(query) ||
        chat.phone_number.toLowerCase().includes(query) ||
        (chat.message_text || '').toLowerCase().includes(query);
      return matchesStatus && matchesBot && matchesQuery;
    });

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return (a.full_name || '').localeCompare(b.full_name || '', 'es');
        case 'name_desc':
          return (b.full_name || '').localeCompare(a.full_name || '', 'es');
        case 'first_date':
          return new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime();
        case 'status':
          return (a.status || '').localeCompare(b.status || '', 'es');
        case 'last_date':
          return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
        case 'unread':
        default: {
          const unreadDiff = (b.unread_count || 0) - (a.unread_count || 0);
          if (unreadDiff !== 0) return unreadDiff;
          return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
        }
      }
    });
  }, [clientLeads, searchConversation, sortBy, statusFilter, botFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedChats.length / PAGE_SIZE));
  const paginatedChats = filteredAndSortedChats.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => setPage(1), [searchConversation, sortBy, statusFilter, botFilter]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const openDetail = (chat: ClientLead) => {
    setDetailContact(chat);
    if (isMobile) setSelectedChat(null);
  };

  return (
    <Box sx={{ display: 'flex', height: '100%', minHeight: 0, bgcolor: 'background.body' }}>
      {(!isMobile || (!selectedChat && !detailContact)) && (
        <Sheet
          sx={{
            width: { xs: '100%', md: 320, lg: 360 },
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid',
            borderColor: 'neutral.200',
            bgcolor: 'neutral.100',
            height: '100%',
          }}
        >
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'neutral.200' }}>
            <Typography level="title-md" fontWeight={700}>
              Conversaciones
            </Typography>
            <Input
              size="sm"
              value={searchConversation}
              onChange={(e) => setSearchConversation(e.target.value)}
              startDecorator={<Search />}
              placeholder="Buscar..."
              sx={{ mt: 1, borderRadius: '12px', bgcolor: '#FFFFFF' }}
            />
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Select size="sm" value={statusFilter} onChange={(_, v) => setStatusFilter(v || 'all')} sx={{ flex: 1 }}>
                <Option value="all">Todos los estados</Option>
                {config.leadStatuses.map((s) => (
                  <Option key={s.key} value={s.key}>
                    {s.label}
                  </Option>
                ))}
              </Select>
              <Select
                size="sm"
                value={botFilter}
                onChange={(_, v) => setBotFilter((v as typeof botFilter) || 'all')}
                sx={{ flex: 1 }}
              >
                <Option value="all">Bot: todos</Option>
                <Option value="active">Bot activo</Option>
                <Option value="paused">Bot pausado</Option>
              </Select>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Select size="sm" value={sortBy} onChange={(_, v) => setSortBy(v || 'unread')} sx={{ flex: 1 }}>
                <Option value="unread">No leídos</Option>
                <Option value="last_date">Recientes</Option>
                <Option value="first_date">Antiguos</Option>
                <Option value="name_asc">A-Z</Option>
              </Select>
            </Stack>
          </Box>

          <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
            {paginatedChats.length === 0 && (
              <Alert variant="soft" sx={{ m: 1 }}>
                No hay conversaciones
              </Alert>
            )}
            {paginatedChats.map((chat) => {
              const statusCfg = config.leadStatuses.find((s) => s.key === chat.status);
              const active = selectedChat?.id === chat.id;
              const unread = chat.unread_count || 0;
              return (
                <Box
                  key={chat.id}
                  onClick={() => void selectChat(chat)}
                  sx={{
                    p: 1.5,
                    mb: 0.75,
                    borderRadius: '14px',
                    cursor: 'pointer',
                    bgcolor: active ? '#FFFFFF' : unread > 0 ? 'primary.50' : chat.bot_paused ? 'warning.50' : 'transparent',
                    border: '1px solid',
                    borderColor: active ? 'primary.300' : chat.bot_paused ? 'warning.300' : 'transparent',
                    borderLeft: chat.bot_paused ? '4px solid' : undefined,
                    borderLeftColor: chat.bot_paused ? 'warning.500' : undefined,
                    boxShadow: active ? 'sm' : chat.bot_paused ? 'xs' : 'none',
                    '&:hover': { bgcolor: chat.bot_paused ? 'warning.100' : '#FFFFFF' },
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <Typography level="title-sm" fontWeight={unread > 0 ? 800 : 700} noWrap>
                          {chat.full_name || chat.phone_number}
                        </Typography>
                        {unread > 0 && (
                          <Chip size="sm" color="danger" variant="solid" sx={{ minWidth: 20, borderRadius: '999px', px: 0.75 }}>
                            {unread > 99 ? '99+' : unread}
                          </Chip>
                        )}
                      </Stack>
                      <Typography
                        level="body-xs"
                        noWrap
                        sx={{ color: 'text.tertiary', mt: 0.25, fontWeight: unread > 0 ? 600 : 400 }}
                      >
                        {chat.message_text || 'Sin mensajes'}
                      </Typography>
                    </Box>
                    <IconButton
                      size="sm"
                      variant="plain"
                      aria-label="Ver ficha del cliente"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDetail(chat);
                      }}
                    >
                      <InfoOutlined fontSize="small" />
                    </IconButton>
                  </Stack>
                  <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.75 }}>
                    <Chip size="sm" sx={statusChipSx(statusCfg)}>
                      {getStatusLabel(chat.status)}
                    </Chip>
                    {chat.bot_paused && (
                      <Chip
                        size="sm"
                        color="warning"
                        variant="solid"
                        startDecorator={<PauseCircleOutline sx={{ fontSize: 14 }} />}
                        sx={{ fontWeight: 700, borderRadius: '999px' }}
                      >
                        Bot pausado
                      </Chip>
                    )}
                    <Typography level="body-xs" sx={{ color: 'text.tertiary', ml: 'auto' }}>
                      {chat.timestamp ? formatDate(chat.timestamp, true, true) : ''}
                    </Typography>
                  </Stack>
                </Box>
              );
            })}
          </Box>

          <Stack
            direction="row"
            justifyContent="center"
            spacing={1}
            sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'neutral.200' }}
          >
            <Button size="sm" variant="outlined" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Ant
            </Button>
            <Typography level="body-xs" sx={{ alignSelf: 'center' }}>
              {page}/{totalPages}
            </Typography>
            <Button size="sm" variant="outlined" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Sig
            </Button>
          </Stack>
        </Sheet>
      )}

      {(!isMobile || (selectedChat && !detailContact)) && (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%', bgcolor: '#FFFFFF' }}>
          {selectedChat ? (
            <>
              <Box
                sx={{
                  p: 2,
                  borderBottom: '1px solid',
                  borderColor: selectedChat.bot_paused ? 'warning.400' : 'neutral.200',
                  bgcolor: selectedChat.bot_paused ? 'warning.50' : 'primary.50',
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1}>
                  {isMobile && (
                    <IconButton onClick={() => setSelectedChat(null)}>
                      <ArrowBack />
                    </IconButton>
                  )}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                      <Typography level="title-md" fontWeight={700} noWrap>
                        {selectedChat.full_name || 'Sin nombre'}
                      </Typography>
                      {selectedChat.bot_paused && (
                        <Chip
                          size="sm"
                          color="warning"
                          variant="solid"
                          startDecorator={<PauseCircleOutline sx={{ fontSize: 14 }} />}
                          sx={{ fontWeight: 700 }}
                        >
                          Bot pausado
                        </Chip>
                      )}
                    </Stack>
                    <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                      {selectedChat.phone_number}
                    </Typography>
                  </Box>
                  <Select size="sm" value={selectedChat.status} onChange={(_, v) => handleStatusChange(v || 'lead')}>
                    {config.leadStatuses.map((s) => (
                      <Option key={s.key} value={s.key}>
                        {s.label}
                      </Option>
                    ))}
                  </Select>
                  <IconButton variant="soft" onClick={() => openDetail(selectedChat)}>
                    <InfoOutlined />
                  </IconButton>
                </Stack>

                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1.25, gap: 1 }}>
                  <Button
                    size="sm"
                    variant="soft"
                    color="success"
                    component="a"
                    href={`https://wa.me/${selectedChat.phone_number}`}
                    target="_blank"
                    startDecorator={<WhatsApp />}
                  >
                    Enviar WhatsApp
                  </Button>

                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      px: 1.5,
                      py: 0.75,
                      borderRadius: '12px',
                      flexShrink: 0,
                      border: '2px solid',
                      borderColor: selectedChat.bot_paused ? 'warning.500' : 'neutral.300',
                      bgcolor: selectedChat.bot_paused ? 'warning.100' : '#FFFFFF',
                      boxShadow: selectedChat.bot_paused ? 'sm' : 'none',
                    }}
                  >
                    <PauseCircleOutline
                      sx={{
                        fontSize: 20,
                        color: selectedChat.bot_paused ? 'warning.700' : 'neutral.500',
                      }}
                    />
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography
                        level="body-xs"
                        fontWeight={800}
                        sx={{ color: selectedChat.bot_paused ? 'warning.800' : 'text.secondary', lineHeight: 1.2 }}
                      >
                        {selectedChat.bot_paused ? 'BOT PAUSADO' : 'Pausar bot'}
                      </Typography>
                      <Typography
                        level="body-xs"
                        sx={{ color: selectedChat.bot_paused ? 'warning.700' : 'text.tertiary', fontSize: 10 }}
                      >
                        {selectedChat.bot_paused ? 'Sin respuestas automáticas' : 'Respuestas automáticas ON'}
                      </Typography>
                    </Box>
                    <Switch
                      checked={Boolean(selectedChat.bot_paused)}
                      onChange={(e) => handleBotPausedChange(e.target.checked)}
                      color="warning"
                      slotProps={{
                        track: {
                          sx: selectedChat.bot_paused ? { bgcolor: 'warning.500 !important' } : undefined,
                        },
                      }}
                    />
                  </Box>
                </Stack>
              </Box>

              {selectedChat.bot_paused && (
                <Alert
                  color="warning"
                  variant="soft"
                  startDecorator={<PauseCircleOutline />}
                  sx={{
                    borderRadius: 0,
                    borderBottom: '1px solid',
                    borderColor: 'warning.300',
                    fontWeight: 700,
                    py: 1,
                  }}
                >
                  Bot pausado — Camila no responderá automáticamente a este contacto
                </Alert>
              )}

              <Box
                sx={{
                  flex: 1,
                  overflow: 'auto',
                  p: 2,
                  bgcolor: 'background.body',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                }}
              >
                {chatMessages.map((msg) => (
                  <WhatsAppMessageBubble key={msg.id} message={msg} />
                ))}
              </Box>

              <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'neutral.200', display: 'flex', gap: 1 }}>
                {!loading ? (
                  <>
                    <Input
                      placeholder="Escribe un mensaje..."
                      fullWidth
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && void handleSend()}
                      sx={{ borderRadius: '12px' }}
                    />
                    <IconButton color="primary" variant="solid" onClick={() => void handleSend()} disabled={!message.trim()}>
                      <Send />
                    </IconButton>
                  </>
                ) : (
                  <LoadingInformation title="Enviando..." />
                )}
              </Box>
            </>
          ) : (
            <Stack flex={1} alignItems="center" justifyContent="center" spacing={1} sx={{ color: 'text.tertiary' }}>
              <Chat sx={{ fontSize: 56, opacity: 0.35 }} />
              <Typography level="body-md">
                Selecciona una conversación o haz clic en un cliente para ver su ficha
              </Typography>
            </Stack>
          )}
        </Box>
      )}

      {detailContact && (!isMobile || detailContact) && (
        <ClientDetailPanel
          contact={detailContact}
          onClose={() => setDetailContact(null)}
          onUpdated={(updated) => {
            setClientLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
            if (selectedChat?.id === updated.id) setSelectedChat(updated);
            setDetailContact(updated);
          }}
        />
      )}

      <Snackbar
        open={openSnackbar}
        onClose={() => setOpenSnackbar(false)}
        autoHideDuration={snackbarColor === 'danger' ? 4000 : 2000}
        color={snackbarColor}
        variant="solid"
      >
        {snackbarColor === 'success' ? <CheckCircle /> : <ErrorOutline />} {messageSnackbar}
      </Snackbar>
    </Box>
  );
}
