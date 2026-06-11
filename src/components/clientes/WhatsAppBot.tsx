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
} from '@mui/joy';
import {
  Send,
  CheckCircle,
  Chat,
  Search,
  WhatsApp,
  ArrowBack,
  EditNoteOutlined,
  InfoOutlined,
} from '@mui/icons-material';
import { useMediaQuery } from '@mui/material';
import { fetchChatMessages, fetchClientLeads, updateClientLead } from 'pages/api/entities';
import { formatDate } from 'utils/Utils';
import { sendAPIRequest } from 'pages/api/fileServer';
import LoadingInformation from './LoadingInformation';
import ClientDetailPanel from './ClientDetailPanel';
import { useCrmConfig } from 'hooks/useCrmConfig';
import { ClientLead } from 'types/crm';
import { statusChipSx } from 'utils/statusHelpers';
import { parseWhatsAppMessage, ParsedWhatsAppMessage } from 'utils/whatsappMessage';
import WhatsAppMessageBubble from './WhatsAppMessageBubble';

interface WhatsAppBotProps {
  initialStatusFilter?: string;
}

const PAGE_SIZE = 15;
const REFRESH_INTERVAL_MS = 20_000;

export default function WhatsAppBot({ initialStatusFilter = 'lead' }: WhatsAppBotProps) {
  const { config, getStatusLabel } = useCrmConfig();
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [messageSnackbar, setMessageSnackbar] = useState('');
  const [selectedChat, setSelectedChat] = useState<ClientLead | null>(null);
  const [detailContact, setDetailContact] = useState<ClientLead | null>(null);
  const [message, setMessage] = useState('');
  const [clientLeads, setClientLeads] = useState<ClientLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ParsedWhatsAppMessage[]>([]);
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [searchConversation, setSearchConversation] = useState('');
  const [sortBy, setSortBy] = useState('last_date');
  const [page, setPage] = useState(1);
  const [name, setName] = useState('');
  const isMobile = useMediaQuery('(max-width: 1100px)');
  const selectedChatRef = useRef(selectedChat);
  selectedChatRef.current = selectedChat;

  const mapChatMessages = useCallback(
    (chats: Record<string, unknown>[]) =>
      chats.map((chat) =>
        parseWhatsAppMessage(chat, (ts) => formatDate(ts, true)),
      ),
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

  useEffect(() => {
    if (!selectedChat) return;
    loadMessages(selectedChat.phone_number);
  }, [selectedChat?.id, selectedChat?.phone_number, loadMessages]);

  useEffect(() => {
    const refresh = () => {
      void loadConversations();
      const chat = selectedChatRef.current;
      if (chat) void loadMessages(chat.phone_number);
    };
    refresh();
    const timer = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [loadConversations, loadMessages]);

  const handleNameChange = async () => {
    if (!selectedChat) return;
    const updated = await updateClientLead(selectedChat.id, { full_name: name });
    if (updated) {
      setMessageSnackbar('Cliente actualizado');
      setOpenSnackbar(true);
      const next = { ...selectedChat, full_name: name };
      setSelectedChat(next);
      setClientLeads((prev) => prev.map((l) => (l.id === selectedChat.id ? next : l)));
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!selectedChat) return;
    const updated = await updateClientLead(selectedChat.id, { status });
    if (updated) {
      const next = { ...selectedChat, status };
      setSelectedChat(next);
      setClientLeads((prev) => prev.map((l) => (l.id === selectedChat.id ? next : l)));
    }
  };

  const handleSend = async () => {
    if (!message.trim() || !selectedChat) return;
    setLoading(true);
    await sendAPIRequest({
      phone_number: selectedChat.phone_number,
      message,
      action: 'message',
    });
    await loadMessages(selectedChat.phone_number);
    setMessage('');
    setLoading(false);
  };

  const filteredAndSortedChats = useMemo(() => {
    const query = searchConversation.trim().toLowerCase();
    const filtered = clientLeads.filter((chat) => {
      const matchesStatus = statusFilter === 'all' || chat.status === statusFilter;
      const matchesQuery =
        !query ||
        (chat.full_name || '').toLowerCase().includes(query) ||
        chat.phone_number.toLowerCase().includes(query) ||
        (chat.message_text || '').toLowerCase().includes(query);
      return matchesStatus && matchesQuery;
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
        default:
          return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
      }
    });
  }, [clientLeads, searchConversation, sortBy, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedChats.length / PAGE_SIZE));
  const paginatedChats = filteredAndSortedChats.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => setPage(1), [searchConversation, sortBy, statusFilter]);
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
            <Typography level="title-md" fontWeight={700}>Conversaciones</Typography>
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
                <Option value="all">Todos</Option>
                {config.leadStatuses.map((s) => (
                  <Option key={s.key} value={s.key}>{s.label}</Option>
                ))}
              </Select>
              <Select size="sm" value={sortBy} onChange={(_, v) => setSortBy(v || 'last_date')} sx={{ flex: 1 }}>
                <Option value="last_date">Recientes</Option>
                <Option value="first_date">Antiguos</Option>
                <Option value="name_asc">A-Z</Option>
              </Select>
            </Stack>
          </Box>

          <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
            {paginatedChats.length === 0 && (
              <Alert variant="soft" sx={{ m: 1 }}>No hay conversaciones</Alert>
            )}
            {paginatedChats.map((chat) => {
              const statusCfg = config.leadStatuses.find((s) => s.key === chat.status);
              const active = selectedChat?.id === chat.id;
              return (
                <Box
                  key={chat.id}
                  onClick={() => {
                    setSelectedChat(chat);
                    setName('');
                  }}
                  sx={{
                    p: 1.5,
                    mb: 0.75,
                    borderRadius: '14px',
                    cursor: 'pointer',
                    bgcolor: active ? '#FFFFFF' : 'transparent',
                    border: '1px solid',
                    borderColor: active ? 'primary.300' : 'transparent',
                    boxShadow: active ? 'sm' : 'none',
                    '&:hover': { bgcolor: '#FFFFFF' },
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography level="title-sm" fontWeight={700}>
                        {chat.full_name || chat.phone_number}
                      </Typography>
                      <Typography level="body-xs" noWrap sx={{ color: 'text.tertiary', mt: 0.25 }}>
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
                    <Chip size="sm" sx={statusChipSx(statusCfg)}>{getStatusLabel(chat.status)}</Chip>
                    <Typography level="body-xs" sx={{ color: 'text.tertiary', ml: 'auto' }}>
                      {chat.timestamp ? formatDate(chat.timestamp, true, true) : ''}
                    </Typography>
                  </Stack>
                </Box>
              );
            })}
          </Box>

          <Stack direction="row" justifyContent="center" spacing={1} sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'neutral.200' }}>
            <Button size="sm" variant="outlined" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Ant</Button>
            <Typography level="body-xs" sx={{ alignSelf: 'center' }}>{page}/{totalPages}</Typography>
            <Button size="sm" variant="outlined" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Sig</Button>
          </Stack>
        </Sheet>
      )}

      {(!isMobile || (selectedChat && !detailContact)) && (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%', bgcolor: '#FFFFFF' }}>
          {selectedChat ? (
            <>
              <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'neutral.200', bgcolor: 'primary.50' }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  {isMobile && (
                    <IconButton onClick={() => setSelectedChat(null)}><ArrowBack /></IconButton>
                  )}
                  <Box sx={{ flex: 1 }}>
                    <Typography level="title-md" fontWeight={700}>{selectedChat.full_name || 'Sin nombre'}</Typography>
                    <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>{selectedChat.phone_number}</Typography>
                  </Box>
                  <Select size="sm" value={selectedChat.status} onChange={(_, v) => handleStatusChange(v || 'lead')}>
                    {config.leadStatuses.map((s) => (
                      <Option key={s.key} value={s.key}>{s.label}</Option>
                    ))}
                  </Select>
                  <IconButton variant="soft" onClick={() => openDetail(selectedChat)}><InfoOutlined /></IconButton>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
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
                </Stack>
              </Box>

              <Box sx={{ flex: 1, overflow: 'auto', p: 2, bgcolor: 'background.body', display: 'flex', flexDirection: 'column', gap: 1 }}>
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
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      sx={{ borderRadius: '12px' }}
                    />
                    <IconButton color="primary" variant="solid" onClick={handleSend} disabled={!message.trim()}>
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
              <Typography level="body-md">Selecciona una conversación o haz clic en un cliente para ver su ficha</Typography>
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

      <Snackbar open={openSnackbar} onClose={() => setOpenSnackbar(false)} autoHideDuration={2000} color="success" variant="solid">
        <CheckCircle /> {messageSnackbar}
      </Snackbar>
    </Box>
  );
}
