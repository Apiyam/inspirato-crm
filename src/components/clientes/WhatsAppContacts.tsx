'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  IconButton,
  Input,
  Option,
  Select,
  Sheet,
  Skeleton,
  Stack,
  Table,
  Typography,
} from '@mui/joy';
import {
  ChevronRightRounded,
  ContactsRounded,
  PhoneRounded,
  Search,
} from '@mui/icons-material';
import { fetchClientLeads } from 'pages/api/entities';
import { formatDate } from 'utils/Utils';
import ClientDetailPanel from './ClientDetailPanel';
import { useCrmConfig } from 'hooks/useCrmConfig';
import { ClientLead } from 'types/crm';
import { statusChipSx } from 'utils/statusHelpers';
import { brandColors } from 'utils/theme';

const PAGE_SIZE = 12;

function getInitials(name?: string, phone?: string): string {
  const src = (name || phone || '?').trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '—';
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Hace ${days} d`;
  return formatDate(dateStr, true, true);
}

function ContactRowSkeleton() {
  return (
    <tr>
      <td colSpan={5}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 0.5 }}>
          <Skeleton variant="circular" width={40} height={40} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="35%" />
            <Skeleton variant="text" width="55%" />
          </Box>
          <Skeleton variant="rectangular" width={72} height={24} sx={{ borderRadius: '999px' }} />
        </Stack>
      </td>
    </tr>
  );
}

export default function WhatsAppContacts() {
  const { config, getStatusLabel } = useCrmConfig();
  const [contacts, setContacts] = useState<ClientLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [detailContact, setDetailContact] = useState<ClientLead | null>(null);

  useEffect(() => {
    fetchClientLeads().then((leads) => {
      setContacts(leads || []);
      setLoading(false);
    });
  }, []);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: contacts.length };
    for (const contact of contacts) {
      const key = contact.status || 'sin_estatus';
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return contacts
      .filter((contact) => {
        const matchesStatus = statusFilter === 'all' || contact.status === statusFilter;
        if (!matchesStatus) return false;
        if (!query) return true;
        return (
          (contact.full_name || '').toLowerCase().includes(query) ||
          contact.phone_number.toLowerCase().includes(query) ||
          (contact.message_text || '').toLowerCase().includes(query)
        );
      })
      .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
  }, [contacts, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredContacts.length / PAGE_SIZE));
  const paginatedContacts = filteredContacts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <Box sx={{ display: 'flex', height: '100%', minHeight: 0, bgcolor: 'background.body' }}>
      <Sheet
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          bgcolor: 'transparent',
        }}
      >
        {/* Header */}
        <Box sx={{ px: { xs: 2, md: 3 }, pt: 2.5, pb: 2 }}>
          <Stack
            direction={{ xs: 'column', lg: 'row' }}
            spacing={2}
            alignItems={{ lg: 'flex-end' }}
            justifyContent="space-between"
          >
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                <ContactsRounded sx={{ color: 'primary.500', fontSize: 22 }} />
                <Typography level="h4" fontWeight={700} sx={{ letterSpacing: '-0.02em' }}>
                  Contactos
                </Typography>
              </Stack>
              <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
                {filteredContacts.length} de {contacts.length} contactos
                {search.trim() ? ' · filtrado por búsqueda' : ''}
              </Typography>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', lg: 'auto' } }}>
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                startDecorator={<Search sx={{ color: 'text.tertiary' }} />}
                placeholder="Buscar nombre, teléfono o mensaje..."
                sx={{
                  minWidth: { sm: 280 },
                  borderRadius: '12px',
                  bgcolor: '#FFFFFF',
                  boxShadow: 'xs',
                  '--Input-focusedThickness': '2px',
                }}
              />
              <Select
                value={statusFilter}
                onChange={(_, v) => { setStatusFilter(v || 'all'); setPage(1); }}
                sx={{ minWidth: 180, borderRadius: '12px', bgcolor: '#FFFFFF', boxShadow: 'xs' }}
              >
                <Option value="all">Todos los estados</Option>
                {config.leadStatuses.map((s) => (
                  <Option key={s.key} value={s.key}>{s.label}</Option>
                ))}
              </Select>
            </Stack>
          </Stack>

          {/* Quick filters */}
          <Stack direction="row" spacing={0.75} sx={{ mt: 2, flexWrap: 'wrap', gap: 0.75 }}>
            <Chip
              size="sm"
              variant={statusFilter === 'all' ? 'solid' : 'soft'}
              color={statusFilter === 'all' ? 'primary' : 'neutral'}
              onClick={() => { setStatusFilter('all'); setPage(1); }}
              sx={{ borderRadius: '999px', cursor: 'pointer', fontWeight: 600 }}
            >
              Todos ({statusCounts.all || 0})
            </Chip>
            {config.leadStatuses.map((s) => (
              <Chip
                key={s.key}
                size="sm"
                variant={statusFilter === s.key ? 'solid' : 'soft'}
                onClick={() => { setStatusFilter(s.key); setPage(1); }}
                sx={{
                  borderRadius: '999px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  ...(statusFilter === s.key
                    ? { bgcolor: s.color, color: '#FFFFFF' }
                    : { bgcolor: `${s.color}18`, color: s.color }),
                }}
              >
                {s.label} ({statusCounts[s.key] || 0})
              </Chip>
            ))}
          </Stack>
        </Box>

        {/* Table card */}
        <Box sx={{ flex: 1, overflow: 'auto', px: { xs: 2, md: 3 }, pb: 2 }}>
          <Card
            variant="outlined"
            sx={{
              borderRadius: '16px',
              borderColor: 'neutral.200',
              bgcolor: '#FFFFFF',
              boxShadow: 'sm',
              overflow: 'hidden',
            }}
          >
            <Table
              stickyHeader
              hoverRow
              sx={{
                '--TableCell-headBackground': 'var(--joy-palette-primary-50)',
                '--TableRow-hoverBackground': 'var(--joy-palette-neutral-50)',
                '& thead th': {
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'text.tertiary',
                  borderBottom: '1px solid',
                  borderColor: 'neutral.200',
                  py: 1.5,
                },
                '& tbody td': {
                  borderBottom: '1px solid',
                  borderColor: 'neutral.100',
                  py: 1.75,
                  verticalAlign: 'middle',
                },
                '& tbody tr:last-child td': { borderBottom: 'none' },
                '& tbody tr': {
                  transition: 'background-color 0.15s ease',
                },
                '& tbody tr[data-selected="true"]': {
                  bgcolor: 'primary.50',
                  boxShadow: 'inset 3px 0 0 var(--joy-palette-primary-500)',
                },
              }}
            >
              <thead>
                <tr>
                  <th style={{ width: '32%' }}>Contacto</th>
                  <th style={{ width: '12%' }}>Estado</th>
                  <th style={{ width: '36%' }}>Último mensaje</th>
                  <th style={{ width: '14%' }}>Actividad</th>
                  <th style={{ width: 48 }} />
                </tr>
              </thead>
              <tbody>
                {loading &&
                  Array.from({ length: 6 }).map((_, i) => <ContactRowSkeleton key={i} />)}

                {!loading && paginatedContacts.map((contact) => {
                  const statusCfg = config.leadStatuses.find((s) => s.key === contact.status);
                  const selected = detailContact?.id === contact.id;
                  const accent = statusCfg?.color || brandColors.coffee;

                  return (
                    <tr
                      key={contact.id}
                      onClick={() => setDetailContact(contact)}
                      style={{ cursor: 'pointer' }}
                      data-selected={selected}
                    >
                      <td>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar
                            size="sm"
                            sx={{
                              bgcolor: `${accent}22`,
                              color: accent,
                              fontWeight: 700,
                              fontSize: 13,
                              border: '2px solid',
                              borderColor: `${accent}33`,
                            }}
                          >
                            {getInitials(contact.full_name, contact.phone_number)}
                          </Avatar>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography level="title-sm" fontWeight={700} noWrap>
                              {contact.full_name || 'Sin nombre'}
                            </Typography>
                            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.25 }}>
                              <PhoneRounded sx={{ fontSize: 13, color: 'text.tertiary' }} />
                              <Typography level="body-xs" sx={{ color: 'text.tertiary' }} noWrap>
                                {contact.phone_number}
                              </Typography>
                            </Stack>
                          </Box>
                        </Stack>
                      </td>
                      <td>
                        <Chip size="sm" sx={statusChipSx(statusCfg)}>
                          {getStatusLabel(contact.status)}
                        </Chip>
                      </td>
                      <td>
                        <Typography
                          level="body-sm"
                          sx={{
                            color: contact.message_text ? 'text.secondary' : 'text.tertiary',
                            fontStyle: contact.message_text ? 'normal' : 'italic',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            lineHeight: 1.45,
                            maxWidth: 420,
                          }}
                        >
                          {contact.message_text || 'Sin mensajes aún'}
                        </Typography>
                      </td>
                      <td>
                        <Typography level="body-sm" fontWeight={600} sx={{ color: 'text.primary' }}>
                          {formatRelativeTime(contact.timestamp)}
                        </Typography>
                        {contact.timestamp && (
                          <Typography level="body-xs" sx={{ color: 'text.tertiary', mt: 0.25 }}>
                            {formatDate(contact.timestamp, true, true)}
                          </Typography>
                        )}
                      </td>
                      <td>
                        <IconButton
                          size="sm"
                          variant="soft"
                          color="primary"
                          onClick={(e) => { e.stopPropagation(); setDetailContact(contact); }}
                          sx={{ borderRadius: '10px' }}
                        >
                          <ChevronRightRounded />
                        </IconButton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>

            {!loading && paginatedContacts.length === 0 && (
              <Stack alignItems="center" spacing={1.5} sx={{ py: 6, px: 3 }}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: '16px',
                    bgcolor: 'neutral.100',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ContactsRounded sx={{ color: 'primary.400', fontSize: 28 }} />
                </Box>
                <Typography level="title-md" fontWeight={700}>
                  No hay contactos
                </Typography>
                <Typography level="body-sm" sx={{ color: 'text.tertiary', textAlign: 'center', maxWidth: 320 }}>
                  {search.trim() || statusFilter !== 'all'
                    ? 'Prueba con otro término de búsqueda o cambia el filtro de estado.'
                    : 'Cuando lleguen conversaciones de WhatsApp, aparecerán aquí.'}
                </Typography>
                {(search.trim() || statusFilter !== 'all') && (
                  <Button
                    size="sm"
                    variant="soft"
                    onClick={() => { setSearch(''); setStatusFilter('all'); setPage(1); }}
                  >
                    Limpiar filtros
                  </Button>
                )}
              </Stack>
            )}
          </Card>
        </Box>

        {/* Pagination */}
        <Stack
          direction="row"
          spacing={1}
          justifyContent="space-between"
          alignItems="center"
          sx={{
            px: { xs: 2, md: 3 },
            py: 1.75,
            borderTop: '1px solid',
            borderColor: 'neutral.200',
            bgcolor: '#FFFFFF',
          }}
        >
          <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
            Mostrando{' '}
            <Typography component="span" fontWeight={700} sx={{ color: 'text.primary' }}>
              {paginatedContacts.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}
              –
              {(page - 1) * PAGE_SIZE + paginatedContacts.length}
            </Typography>
            {' '}de {filteredContacts.length}
          </Typography>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Typography level="body-sm" sx={{ color: 'text.tertiary', mr: 0.5 }}>
              {page} / {totalPages}
            </Typography>
            <Button
              size="sm"
              variant="outlined"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              sx={{ borderRadius: '10px' }}
            >
              Anterior
            </Button>
            <Button
              size="sm"
              variant="solid"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              sx={{ borderRadius: '10px' }}
            >
              Siguiente
            </Button>
          </Stack>
        </Stack>
      </Sheet>

      {detailContact && (
        <ClientDetailPanel
          contact={detailContact}
          onClose={() => setDetailContact(null)}
          onUpdated={(updated) => {
            setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
            setDetailContact(updated);
          }}
        />
      )}
    </Box>
  );
}
