'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Input,
  Sheet,
  Stack,
  Textarea,
  Typography,
} from '@mui/joy';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import {
  createLeadComment,
  fetchChatMessages,
  fetchLeadComments,
  getMessageStats,
  updateClientLead,
} from 'pages/api/entities';
import { useAuth } from 'providers/AuthProvider';
import { useCrmConfig } from 'hooks/useCrmConfig';
import { ClientLead, ContactSummary, LeadComment, MessageStats } from 'types/crm';
import { statusChipSx } from 'utils/statusHelpers';
import { isMeaningfulValue, normalizeContactSummary } from 'utils/contactSummary';
import { formatDate } from 'utils/Utils';
import BusinessCenterRoundedIcon from '@mui/icons-material/BusinessCenterRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import WorkRoundedIcon from '@mui/icons-material/WorkRounded';
import { Option, Select } from '@mui/joy';

interface ClientDetailPanelProps {
  contact: ClientLead | null;
  onClose: () => void;
  onUpdated?: (contact: ClientLead) => void;
}

export default function ClientDetailPanel({ contact, onClose, onUpdated }: ClientDetailPanelProps) {
  const { user } = useAuth();
  const { config, getStatusLabel } = useCrmConfig();
  const [nameEdition, setNameEdition] = useState('');
  const [statusEdition, setStatusEdition] = useState('');
  const [stats, setStats] = useState<MessageStats>({ total: 0, incoming: 0, outgoing: 0 });
  const [comments, setComments] = useState<LeadComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [summary, setSummary] = useState<ContactSummary | null>(null);
  const [summaryCached, setSummaryCached] = useState(false);
  const [summaryExpires, setSummaryExpires] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [savingComment, setSavingComment] = useState(false);
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contact) return;
    setShowStickyHeader(false);

    setNameEdition(contact.full_name || '');
    setStatusEdition(contact.status || 'lead');
    setSummary(null);
    setSummaryError('');

    const load = async () => {
      setLoadingData(true);
      const [messageStats, leadComments] = await Promise.all([
        getMessageStats(contact.phone_number),
        fetchLeadComments(contact.id),
      ]);
      setStats(messageStats);
      setComments(leadComments);
      setLoadingData(false);
      await loadSummary(contact, false);
    };

    load();
  }, [contact?.id]);

  useEffect(() => {
    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyHeader(!entry.isIntersecting),
      { root, threshold: 0, rootMargin: '-4px 0px 0px 0px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [contact?.id]);

  const loadSummary = async (lead: ClientLead, forceRefresh: boolean) => {
    setLoadingSummary(true);
    setSummaryError('');
    try {
      const messages = await fetchChatMessages(lead.phone_number);
      const response = await fetch('/api/whatsapp-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact: lead, messages, forceRefresh }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'No se pudo generar el resumen.');
      const normalized = normalizeContactSummary(payload.summary);
      setSummary(normalized);
      setSummaryCached(Boolean(payload.cached));
      setSummaryExpires(payload.expiresAt || '');
      if (payload.messageStats) setStats(payload.messageStats);
      if (normalized && isMeaningfulValue(normalized.nombre) && !lead.full_name?.trim()) {
        setNameEdition(normalized.nombre);
      }
    } catch (error: unknown) {
      setSummaryError(error instanceof Error ? error.message : 'Error al generar resumen.');
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!contact) return;
    const updated = await updateClientLead(contact.id, {
      full_name: nameEdition.trim(),
      status: statusEdition,
    });
    if (updated && onUpdated) {
      onUpdated({ ...contact, full_name: nameEdition.trim(), status: statusEdition });
    }
  };

  const handleAddComment = async () => {
    if (!contact || !newComment.trim()) return;
    setSavingComment(true);
    const created = await createLeadComment({
      client_lead_id: contact.id,
      author_email: user?.email,
      author_name: user?.user_metadata?.full_name || user?.email?.split('@')[0],
      comment_text: newComment.trim(),
    });
    setSavingComment(false);
    if (created) {
      setComments((prev) => [created, ...prev]);
      setNewComment('');
    }
  };

  if (!contact) return null;

  const statusConfig = config.leadStatuses.find((s) => s.key === contact.status);

  return (
    <Sheet
      sx={{
        width: { xs: '100%', md: '58vw', xl: '52vw' },
        minWidth: { md: 680, lg: 760 },
        maxWidth: { md: 1100 },
        flex: { md: '1 1 680px' },
        height: '100%',
        borderLeft: '1px solid',
        borderColor: 'neutral.200',
        bgcolor: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'lg',
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'neutral.200', flexShrink: 0 }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <PersonRoundedIcon sx={{ color: 'primary.500' }} />
          <Typography level="title-lg" fontWeight={700}>Ficha de cliente</Typography>
        </Stack>
        <IconButton size="sm" variant="plain" onClick={onClose}><CloseRoundedIcon /></IconButton>
      </Stack>

      <Box ref={scrollRef} sx={{ flex: 1, overflow: 'auto', px: 2.5, py: 2, position: 'relative' }}>
        <Stack spacing={2.5}>
          {/* Cabecera + stats + edición — ancho completo */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1.4fr 1fr' },
              gap: 2,
              alignItems: 'start',
            }}
          >
            <Card variant="soft" sx={{ p: 2, borderRadius: '16px', bgcolor: 'neutral.50', height: '100%' }}>
              <Typography level="h3" fontWeight={700}>{contact.full_name || 'Sin nombre'} 
                {statusConfig && (
                  <Chip size="sm" sx={{ ml: 1, ...statusChipSx(statusConfig) }}>
                    {getStatusLabel(contact.status)}
                  </Chip>
                )}
              </Typography>
              <Typography level="body-md" sx={{ color: 'text.tertiary', mt: 0.5 }}>{contact.phone_number}</Typography>
              
            </Card>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, height: '100%' }}>
              {[
                { label: 'Total', value: stats.total, color: 'primary.500' },
                { label: 'Recibidos', value: stats.incoming, color: '#4CAF7D' },
                { label: 'Enviados', value: stats.outgoing, color: '#7B9EC4' },
              ].map((item) => (
                <Card key={item.label} variant="soft" sx={{ p: 1.5, textAlign: 'center', borderRadius: '14px', bgcolor: 'neutral.50' }}>
                  <Typography level="h3" sx={{ color: item.color }}>{item.value}</Typography>
                  <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>{item.label}</Typography>
                </Card>
              ))}
            </Box>
          </Box>

          <Card variant="outlined" sx={{ p: 2, borderRadius: '14px' }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr auto' },
                gap: 1.5,
                alignItems: 'end',
              }}
            >
              <FormRow label="Nombre">
                <Input value={nameEdition} onChange={(e) => setNameEdition(e.target.value)} />
              </FormRow>
              <FormRow label="Estatus">
                <Select value={statusEdition} onChange={(_, v) => setStatusEdition(v || 'lead')}>
                  {config.leadStatuses.map((s) => (
                    <Option key={s.key} value={s.key}>{s.label}</Option>
                  ))}
                </Select>
              </FormRow>
              <Button onClick={handleSaveProfile} sx={{ borderRadius: '10px', height: 40 }}>
                Guardar
              </Button>
            </Box>
          </Card>

          <Box ref={sentinelRef} sx={{ height: 1 }} aria-hidden />

          {showStickyHeader && (
            <Box
              sx={{
                position: 'sticky',
                top: -10,
                zIndex: 30,
                mx: -2.5,
                px: 2.5,
                py: 1.25,
                bgcolor: 'rgba(255,255,255,0.96)',
                backdropFilter: 'blur(8px)',
                borderBottom: '1px solid',
                borderColor: 'neutral.200',
                boxShadow: 'sm',
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography level="title-sm" fontWeight={700} noWrap>
                    {nameEdition || contact.full_name || 'Sin nombre'}
                  </Typography>
                  <Typography level="body-xs" sx={{ color: 'text.tertiary' }} noWrap>
                    {contact.phone_number}
                  </Typography>
                </Box>
                <Chip size="sm" sx={{ flexShrink: 0, ...statusChipSx(statusConfig) }}>
                  {getStatusLabel(statusEdition || contact.status)}
                </Chip>
                <Stack direction="row" spacing={0.75} sx={{ flexShrink: 0, display: { xs: 'none', sm: 'flex' } }}>
                  {[
                    { label: 'Total', value: stats.total },
                    { label: 'Rec.', value: stats.incoming },
                    { label: 'Env.', value: stats.outgoing },
                  ].map((s) => (
                    <Box
                      key={s.label}
                      sx={{ px: 0.75, py: 0.25, borderRadius: '8px', bgcolor: 'neutral.50', textAlign: 'center', minWidth: 40 }}
                    >
                      <Typography level="body-xs" fontWeight={700}>{s.value}</Typography>
                      <Typography level="body-xs" sx={{ color: 'text.tertiary', fontSize: 10 }}>{s.label}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Stack>
            </Box>
          )}

          <Divider />

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography level="title-md" fontWeight={700}>Análisis IA del chat</Typography>
            <Button
              size="sm"
              variant="soft"
              startDecorator={<RefreshRoundedIcon />}
              loading={loadingSummary}
              onClick={() => loadSummary(contact, true)}
            >
              Actualizar
            </Button>
          </Stack>

          {summaryCached && (
            <Box sx={{ px: 1.25, py: 0.75, borderRadius: '10px', bgcolor: 'success.50' }}>
              <Typography level="body-xs" sx={{ color: 'success.700', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                Caché vigente{summaryExpires ? ` · expira ${formatDate(summaryExpires, true)}` : ''}
              </Typography>
            </Box>
          )}

          {summaryError && <Alert color="danger" size="sm">{summaryError}</Alert>}
          {loadingSummary && !summary && (
            <Stack alignItems="center" py={3}><CircularProgress size="sm" /></Stack>
          )}

          {summary && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(12, 1fr)',
                gap: 2,
                alignItems: 'start',
              }}
            >
              {/* Columna izquierda — oportunidad y contexto */}
              <Stack spacing={1.5} sx={{ gridColumn: { xs: '1 / -1', lg: '1 / 7' } }}>
                <Card variant="soft" sx={{ p: 2, borderRadius: '14px', bgcolor: 'primary.50', border: 'none', boxShadow: 'none' }}>
                  <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                    <BusinessCenterRoundedIcon sx={{ color: 'primary.600', fontSize: 20 }} />
                    <Typography level="title-sm" fontWeight={700}>Línea de negocio</Typography>
                  </Stack>
                  <Box sx={{ display: 'inline-block', maxWidth: '100%', px: 1.5, py: 0.75, borderRadius: '10px', bgcolor: 'primary.500' }}>
                    <Typography level="title-md" fontWeight={700} sx={{ color: '#fff', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {summary.linea_negocio}
                    </Typography>
                  </Box>
                  {summary.linea_negocio_confianza > 0 && (
                    <Typography level="body-xs" sx={{ color: 'text.tertiary', mt: 0.75 }}>
                      Confianza: {Math.round(summary.linea_negocio_confianza * 100)}%
                    </Typography>
                  )}
                  {summary.linea_negocio_justificacion && (
                    <Typography level="body-sm" sx={{ mt: 0.75, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {summary.linea_negocio_justificacion}
                    </Typography>
                  )}
                </Card>

                <Card variant="outlined" sx={{ p: 2, borderRadius: '14px', bgcolor: 'primary.50' }}>
                  <Typography level="title-sm" fontWeight={700} sx={{ mb: 1 }}>Resumen ejecutivo</Typography>
                  <Typography level="body-sm" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {summary.resumen_ejecutivo}
                  </Typography>
                </Card>

                <Card variant="outlined" sx={{ p: 2, borderRadius: '14px' }}>
                  <Typography level="title-sm" fontWeight={700} sx={{ mb: 1 }}>Interés comercial</Typography>
                  <SummaryRow label="Interés" value={summary.interes} />
                  <SummaryRow label="Necesidad detectada" value={summary.necesidad_detectada} />
                  <SummaryRow label="Presupuesto" value={summary.presupuesto_mencionado} />
                  <SummaryRow label="Urgencia" value={summary.urgencia} />
                  <SummaryRow label="Intención de compra" value={summary.intencion_compra} />
                </Card>
              </Stack>

              {/* Columna derecha — perfil y acciones */}
              <Stack spacing={1.5} sx={{ gridColumn: { xs: '1 / -1', lg: '7 / -1' } }}>
                <Card variant="outlined" sx={{ p: 2, borderRadius: '14px' }}>
                  <Typography level="title-sm" fontWeight={700} sx={{ mb: 1.5 }}>Datos del cliente</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
                    <DataPill label="Nombre" value={summary.nombre} icon={<PersonRoundedIcon fontSize="small" />} />
                    <DataPill label="Empresa" value={summary.empresa} icon={<BusinessCenterRoundedIcon fontSize="small" />} />
                    <DataPill label="Correo" value={summary.correo} icon={<EmailRoundedIcon fontSize="small" />} />
                    <DataPill label="Tel. adicional" value={summary.telefono_adicional} />
                    <DataPill label="Ubicación" value={summary.ubicacion} icon={<LocationOnRoundedIcon fontSize="small" />} />
                    <DataPill label="Cargo / rol" value={summary.cargo_rol} icon={<WorkRoundedIcon fontSize="small" />} />
                  </Box>
                </Card>

                {summary.datos_adicionales.length > 0 && (
                  <SummaryListCard title="Datos adicionales relevantes" items={summary.datos_adicionales} />
                )}
                {summary.objeciones.length > 0 && (
                  <SummaryListCard title="Objeciones detectadas" items={summary.objeciones} color="warning" />
                )}
                {summary.proximos_pasos_sugeridos.length > 0 && (
                  <SummaryListCard title="Próximos pasos sugeridos" items={summary.proximos_pasos_sugeridos} color="success" />
                )}
              </Stack>

              {/* Meta del chat — 12 columnas */}
              <Card
                variant="outlined"
                sx={{ gridColumn: '1 / -1', p: 2, borderRadius: '14px', bgcolor: 'neutral.50' }}
              >
                <Typography level="title-sm" fontWeight={700} sx={{ mb: 1.5 }}>
                  Actividad del chat
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 2 }}>
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <SummaryRow label="Tiempo entre primer y último mensaje" value={summary.tiempo_chateando} />
                  </Box>
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <SummaryRow label="Último mensaje" value={summary.ultimo_mensaje} />
                  </Box>
                  <Box sx={{ gridColumn: { xs: '1 / -1', md: '1 / 7' } }}>
                    <SummaryRow label="Clasificación sugerida" value={getStatusLabel(summary.clasificacion_sugerida)} />
                  </Box>
                  <Box sx={{ gridColumn: { xs: '1 / -1', md: '7 / -1' } }}>
                    <SummaryRow label="Justificación" value={summary.justificacion} />
                  </Box>
                </Box>
              </Card>
            </Box>
          )}

          <Divider />

          {/* Comentarios — ancho completo */}
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
              <ChatBubbleOutlineRoundedIcon sx={{ color: 'primary.500', fontSize: 20 }} />
              <Typography level="title-md" fontWeight={700}>Comentarios privados</Typography>
            </Stack>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                gap: 2,
                alignItems: 'start',
              }}
            >
              <Stack spacing={1}>
                <Textarea
                  minRows={3}
                  placeholder="Nota interna visible solo para tu equipo..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <Button
                  size="sm"
                  startDecorator={<SendRoundedIcon />}
                  loading={savingComment}
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  sx={{ alignSelf: 'flex-start', borderRadius: '10px' }}
                >
                  Añadir comentario
                </Button>
              </Stack>

              <Stack spacing={1}>
                {loadingData && <CircularProgress size="sm" />}
                {comments.length === 0 && !loadingData && (
                  <Typography level="body-sm" sx={{ color: 'text.tertiary', py: 2 }}>Sin comentarios aún.</Typography>
                )}
                {comments.map((comment) => (
                  <Card key={comment.id} variant="soft" sx={{ p: 1.5, borderRadius: '12px', bgcolor: 'neutral.50' }}>
                    <Typography level="body-xs" sx={{ color: 'text.tertiary', mb: 0.5 }}>
                      {comment.author_name || comment.author_email || 'Equipo'} · {formatDate(comment.created_at, true)}
                    </Typography>
                    <Typography level="body-sm" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {comment.comment_text}
                    </Typography>
                  </Card>
                ))}
              </Stack>
            </Box>
          </Box>
        </Stack>
      </Box>
    </Sheet>
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography level="body-xs" sx={{ color: 'text.tertiary', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </Typography>
      {children}
    </Box>
  );
}

function SummaryRow({ label, value, fullWidth }: { label: string; value: string; fullWidth?: boolean }) {
  if (!value?.trim()) return null;
  return (
    <Box sx={{ mb: fullWidth ? 0 : 1.25, width: '100%' }}>
      <Typography level="body-xs" sx={{ color: 'text.tertiary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </Typography>
      <Typography
        level="body-sm"
        sx={{
          mt: 0.35,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
          lineHeight: 1.55,
          width: '100%',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

function DataPill({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  const visible = isMeaningfulValue(value);
  return (
    <Box sx={{ p: 1.25, borderRadius: '10px', bgcolor: 'neutral.50' }}>
      <Stack direction="row" spacing={0.5} alignItems="center" mb={0.25}>
        {icon}
        <Typography level="body-xs" sx={{ color: 'text.tertiary', fontWeight: 600 }}>{label}</Typography>
      </Stack>
      <Typography
        level="body-sm"
        sx={{
          color: visible ? 'text.primary' : 'text.tertiary',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
        }}
      >
        {visible ? value : '—'}
      </Typography>
    </Box>
  );
}

const listAccentStyles = {
  neutral: { bg: 'neutral.50', text: 'text.primary' },
  warning: { bg: 'warning.50', text: 'warning.900' },
  success: { bg: 'success.50', text: 'success.900' },
} as const;

function SummaryListCard({
  title,
  items,
  color = 'neutral',
}: {
  title: string;
  items: string[];
  color?: 'neutral' | 'warning' | 'success';
}) {
  const accent = listAccentStyles[color];

  return (
    <Card variant="outlined" sx={{ p: 2, borderRadius: '14px', height: '100%' }}>
      <Typography level="title-sm" fontWeight={700} sx={{ mb: 1 }}>{title}</Typography>
      <Stack spacing={1}>
        {items.map((item, index) => (
          <Box key={`${index}-${item.slice(0, 24)}`} sx={{ width: '100%', p: 1.25, borderRadius: '10px', bgcolor: accent.bg }}>
            <Typography
              level="body-sm"
              sx={{ color: accent.text, whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere', lineHeight: 1.5 }}
            >
              {item}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Card>
  );
}
