'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  IconButton,
  Modal,
  ModalDialog,
  Stack,
  Typography,
} from '@mui/joy';
import CollectionsRoundedIcon from '@mui/icons-material/CollectionsRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import AudiotrackRoundedIcon from '@mui/icons-material/AudiotrackRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import { ConversationMediaItem } from 'types/crm';
import { formatDate } from 'utils/Utils';
import {
  fetchAndAutoDownloadMedia,
  guessDownloadFilename,
  triggerBlobDownload,
  triggerFileDownload,
} from 'utils/mediaFileInfoClient';
import { mediaTypeLabel, WhatsAppMediaType, isUsableDirectMediaUrl } from 'utils/whatsappMessage';

type MediaFilter = 'all' | WhatsAppMediaType;

interface ConversationMediaGalleryProps {
  phoneNumber: string;
}

export default function ConversationMediaGallery({ phoneNumber }: ConversationMediaGalleryProps) {
  const [items, setItems] = useState<ConversationMediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<MediaFilter>('all');
  const [stats, setStats] = useState({ total: 0, resolvedCount: 0, unresolvedCount: 0 });
  const [selected, setSelected] = useState<ConversationMediaItem | null>(null);
  const [selectedFilename, setSelectedFilename] = useState<string | undefined>();
  const [resolvingMedia, setResolvingMedia] = useState(false);
  const [modalError, setModalError] = useState('');

  const loadMedia = useCallback(async () => {
    if (!phoneNumber) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/whatsapp-conversation-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar la galería.');
      setItems(payload.items || []);
      setStats({
        total: payload.total || 0,
        resolvedCount: payload.resolvedCount || 0,
        unresolvedCount: payload.unresolvedCount || 0,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar media.');
    } finally {
      setLoading(false);
    }
  }, [phoneNumber]);

  useEffect(() => {
    void loadMedia();
  }, [loadMedia]);

  useEffect(() => {
    return () => {
      if (selected?.mediaUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(selected.mediaUrl);
      }
    };
  }, [selected?.mediaUrl]);

  const filteredItems = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((item) => item.mediaType === filter);
  }, [filter, items]);

  const filterOptions: { key: MediaFilter; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'image', label: 'Imágenes' },
    { key: 'video', label: 'Videos' },
    { key: 'audio', label: 'Audio' },
    { key: 'document', label: 'Documentos' },
  ];

  const renderPreview = (item: ConversationMediaItem) => {
    if (!item.resolved || !item.mediaUrl) {
      return (
        <Stack alignItems="center" justifyContent="center" sx={{ height: '100%', p: 1 }}>
          <DescriptionRoundedIcon sx={{ color: 'text.tertiary', fontSize: 28 }} />
          <Typography level="body-xs" sx={{ color: 'text.tertiary', mt: 0.5, textAlign: 'center' }}>
            Descargar
          </Typography>
        </Stack>
      );
    }

    if (item.mediaType === 'image' || item.mediaType === 'sticker') {
      return (
        <Box
          component="img"
          src={item.mediaUrl}
          alt={item.caption || 'Imagen'}
          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      );
    }

    if (item.mediaType === 'video') {
      return (
        <Box
          component="video"
          src={item.mediaUrl}
          muted
          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      );
    }

    return (
      <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
        {item.mediaType === 'audio' ? (
          <AudiotrackRoundedIcon sx={{ fontSize: 32, color: 'primary.500' }} />
        ) : (
          <DescriptionRoundedIcon sx={{ fontSize: 32, color: 'primary.500' }} />
        )}
        <Typography level="body-xs" fontWeight={600} sx={{ mt: 0.5 }}>
          {mediaTypeLabel[item.mediaType as WhatsAppMediaType] || 'Archivo'}
        </Typography>
      </Stack>
    );
  };

  const openItem = async (item: ConversationMediaItem) => {
    setSelected(item);
    setModalError('');
    setSelectedFilename(undefined);

    if (item.mediaUrl?.startsWith('blob:')) return;

    const filename =
      guessDownloadFilename(item.caption) ||
      guessDownloadFilename(item.text) ||
      undefined;

    if (item.mediaUrl && isUsableDirectMediaUrl(item.mediaUrl)) {
      triggerFileDownload(item.mediaUrl, filename);
      return;
    }

    if (!item.mediaId) return;

    setResolvingMedia(true);
    try {
      const file = await fetchAndAutoDownloadMedia(
        {
          mediaId: item.mediaId,
          mediaUrl: item.sourceMediaUrl || item.mediaUrl,
        },
        filename,
      );

      const updated: ConversationMediaItem = {
        ...item,
        mediaUrl: file.blobUrl,
        mediaMime: file.mimeType || item.mediaMime,
        resolved: true,
      };
      setSelectedFilename(file.filename);
      setSelected(updated);
      setItems((prev) => prev.map((row) => (row.messageId === item.messageId ? updated : row)));
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'No se pudo descargar el archivo.');
    } finally {
      setResolvingMedia(false);
    }
  };

  const renderModalContent = (item: ConversationMediaItem) => {
    if (resolvingMedia) {
      return (
        <Stack alignItems="center" py={3}>
          <CircularProgress size="sm" />
          <Typography level="body-sm" sx={{ mt: 1 }}>Descargando archivo...</Typography>
        </Stack>
      );
    }

    if (modalError) {
      return <Typography level="body-sm" color="danger">{modalError}</Typography>;
    }

    if (!item.mediaUrl) {
      return (
        <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
          {item.mediaId
            ? 'Haz clic para descargar el archivo.'
            : 'Este mensaje no tiene media_id.'}
        </Typography>
      );
    }

    if (item.mediaType === 'image' || item.mediaType === 'sticker') {
      return (
        <Box
          component="img"
          src={item.mediaUrl}
          alt={item.caption || 'Imagen'}
          sx={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '12px', objectFit: 'contain' }}
        />
      );
    }

    if (item.mediaType === 'video') {
      return (
        <Box component="video" src={item.mediaUrl} controls sx={{ width: '100%', maxHeight: '70vh', borderRadius: '12px' }} />
      );
    }

    if (item.mediaType === 'audio') {
      return <Box component="audio" src={item.mediaUrl} controls sx={{ width: '100%' }} />;
    }

    return (
      <Typography level="body-sm">
        Archivo descargado. Revisa tu carpeta de descargas.
      </Typography>
    );
  };

  return (
    <Card variant="outlined" sx={{ p: 2, borderRadius: '14px' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} mb={1.5}>
        <Stack direction="row" spacing={1} alignItems="center">
          <CollectionsRoundedIcon sx={{ color: 'primary.500' }} />
          <Box>
            <Typography level="title-md" fontWeight={700}>Galería de archivos</Typography>
            <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
              {stats.total} archivos · {stats.resolvedCount} disponibles
              {stats.unresolvedCount > 0 ? ` · ${stats.unresolvedCount} pendientes` : ''}
            </Typography>
          </Box>
        </Stack>
        <Button
          size="sm"
          variant="soft"
          startDecorator={<RefreshRoundedIcon />}
          loading={loading}
          onClick={() => loadMedia()}
        >
          Actualizar
        </Button>
      </Stack>

      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
        {filterOptions.map((option) => (
          <Chip
            key={option.key}
            size="sm"
            variant={filter === option.key ? 'solid' : 'soft'}
            color={filter === option.key ? 'primary' : 'neutral'}
            onClick={() => setFilter(option.key)}
            sx={{ cursor: 'pointer', borderRadius: '999px' }}
          >
            {option.label}
          </Chip>
        ))}
      </Stack>

      {error && (
        <Typography level="body-sm" color="danger" sx={{ mb: 1 }}>
          {error}
        </Typography>
      )}

      {loading && items.length === 0 && (
        <Stack alignItems="center" py={3}>
          <CircularProgress size="sm" />
          <Typography level="body-sm" sx={{ mt: 1, color: 'text.tertiary' }}>
            Cargando archivos de la conversación...
          </Typography>
        </Stack>
      )}

      {!loading && filteredItems.length === 0 && (
        <Typography level="body-sm" sx={{ color: 'text.tertiary', py: 2 }}>
          No hay archivos multimedia en esta conversación.
        </Typography>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: 1,
        }}
      >
        {filteredItems.map((item) => (
          <Box
            key={item.messageId}
            component="button"
            type="button"
            onClick={() => openItem(item)}
            sx={{
              aspectRatio: '1',
              border: '1px solid',
              borderColor: 'neutral.200',
              borderRadius: '12px',
              overflow: 'hidden',
              bgcolor: 'neutral.50',
              cursor: 'pointer',
              p: 0,
              position: 'relative',
              '&:hover': { borderColor: 'primary.300', boxShadow: 'sm' },
            }}
          >
            {renderPreview(item)}
            <Box
              sx={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                px: 0.75,
                py: 0.5,
                bgcolor: 'rgba(0,0,0,0.55)',
              }}
            >
              <Typography level="body-xs" sx={{ color: '#FFF', fontSize: 10 }} noWrap>
                {mediaTypeLabel[item.mediaType as WhatsAppMediaType] || 'Archivo'}
                {' · '}
                {item.direction === 'incoming' ? 'Recibido' : 'Enviado'}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)}>
        <ModalDialog sx={{ width: 'min(720px, 95vw)', maxHeight: '90vh', overflow: 'auto' }}>
          {selected && (
            <>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography level="title-md">
                  {mediaTypeLabel[selected.mediaType as WhatsAppMediaType] || 'Archivo'}
                </Typography>
                <IconButton size="sm" variant="plain" onClick={() => setSelected(null)}>
                  <CloseRoundedIcon />
                </IconButton>
              </Stack>
              <Typography level="body-xs" sx={{ color: 'text.tertiary', mb: 1.5 }}>
                {formatDate(selected.timestamp, true, true)}
                {' · '}
                {selected.direction === 'incoming' ? 'Recibido' : 'Enviado'}
              </Typography>
              {selected.caption && (
                <Typography level="body-sm" sx={{ mb: 1.5, whiteSpace: 'pre-wrap' }}>
                  {selected.caption}
                </Typography>
              )}
              {renderModalContent(selected)}
              {selected.mediaUrl && (
                <Button
                  size="sm"
                  variant="outlined"
                  startDecorator={<OpenInNewRoundedIcon />}
                  sx={{ mt: 1.5, alignSelf: 'flex-start' }}
                  onClick={() => {
                    if (!selected.mediaUrl) return;
                    triggerBlobDownload(
                      selected.mediaUrl,
                      selectedFilename ||
                        guessDownloadFilename(selected.caption) ||
                        guessDownloadFilename(selected.text) ||
                        'archivo',
                    );
                  }}
                >
                  Volver a descargar
                </Button>
              )}
            </>
          )}
        </ModalDialog>
      </Modal>
    </Card>
  );
}
