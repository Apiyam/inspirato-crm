'use client';

import { useState } from 'react';
import {
  Box,
  CircularProgress,
  IconButton,
  Modal,
  ModalDialog,
  Stack,
  Typography,
} from '@mui/joy';
import ImageRoundedIcon from '@mui/icons-material/ImageRounded';
import VideocamRoundedIcon from '@mui/icons-material/VideocamRounded';
import AudiotrackRoundedIcon from '@mui/icons-material/AudiotrackRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import EmojiEmotionsRoundedIcon from '@mui/icons-material/EmojiEmotionsRounded';
import InsertDriveFileRoundedIcon from '@mui/icons-material/InsertDriveFileRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import {
  mediaTypeLabel,
  ParsedWhatsAppMessage,
  WhatsAppMediaType,
} from 'utils/whatsappMessage';

const mediaIconSx = { fontSize: 16 };

function MediaIcon({ type }: { type: WhatsAppMediaType }) {
  switch (type) {
    case 'image':
      return <ImageRoundedIcon sx={mediaIconSx} />;
    case 'video':
      return <VideocamRoundedIcon sx={mediaIconSx} />;
    case 'audio':
      return <AudiotrackRoundedIcon sx={mediaIconSx} />;
    case 'document':
      return <DescriptionRoundedIcon sx={mediaIconSx} />;
    case 'sticker':
      return <EmojiEmotionsRoundedIcon sx={mediaIconSx} />;
    default:
      return <InsertDriveFileRoundedIcon sx={mediaIconSx} />;
  }
}

interface WhatsAppMessageBubbleProps {
  message: ParsedWhatsAppMessage;
}

export default function WhatsAppMessageBubble({ message }: WhatsAppMessageBubbleProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mediaUrl, setMediaUrl] = useState<string | undefined>(message.mediaUrl);
  const [resolvedType, setResolvedType] = useState<WhatsAppMediaType>(message.mediaType);

  const isUser = message.from === 'user';

  const openMedia = async () => {
    if (!message.hasMedia) return;

    setOpen(true);
    setError('');

    if (mediaUrl) return;

    setLoading(true);
    try {
      const response = await fetch('/api/whatsapp-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: message.id }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar el archivo.');
      setMediaUrl(payload.mediaUrl);
      if (payload.mediaType) setResolvedType(payload.mediaType);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar media.');
    } finally {
      setLoading(false);
    }
  };

  const renderMediaPreview = () => {
    if (loading) {
      return (
        <Stack alignItems="center" py={3}>
          <CircularProgress size="sm" />
          <Typography level="body-sm" sx={{ mt: 1 }}>Cargando archivo...</Typography>
        </Stack>
      );
    }

    if (error) {
      return <Typography level="body-sm" color="danger">{error}</Typography>;
    }

    if (!mediaUrl) {
      return (
        <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
          No hay URL de media disponible para este mensaje.
        </Typography>
      );
    }

    if (resolvedType === 'image' || resolvedType === 'sticker') {
      return (
        <Box
          component="img"
          src={mediaUrl}
          alt={message.caption || 'Imagen de WhatsApp'}
          sx={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '12px', objectFit: 'contain' }}
        />
      );
    }

    if (resolvedType === 'video') {
      return (
        <Box
          component="video"
          src={mediaUrl}
          controls
          sx={{ width: '100%', maxHeight: '70vh', borderRadius: '12px' }}
        />
      );
    }

    if (resolvedType === 'audio') {
      return <Box component="audio" src={mediaUrl} controls sx={{ width: '100%' }} />;
    }

    return (
      <Stack spacing={1} alignItems="flex-start">
        <Typography level="body-sm">Documento / archivo adjunto</Typography>
        <IconButton
          component="a"
          href={mediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          variant="soft"
          color="primary"
        >
          <OpenInNewRoundedIcon />
        </IconButton>
      </Stack>
    );
  };

  return (
    <>
      <Box
        sx={{
          alignSelf: isUser ? 'flex-start' : 'flex-end',
          bgcolor: isUser ? '#FFFFFF' : 'primary.100',
          color: 'text.primary',
          p: 1.5,
          borderRadius: '16px',
          maxWidth: '72%',
          boxShadow: 'sm',
          border: '1px solid',
          borderColor: isUser ? 'neutral.200' : 'primary.200',
        }}
      >
        {message.text && (
          <Typography
            component="div"
            level="body-sm"
            sx={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              overflowWrap: 'anywhere',
            }}
          >
            {message.text}
          </Typography>
        )}

        {message.hasMedia && (
          <Box
            component="button"
            type="button"
            onClick={openMedia}
            sx={{
              mt: message.text ? 1 : 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.75,
              px: 1,
              py: 0.5,
              border: '1px solid',
              borderColor: isUser ? 'neutral.300' : 'primary.300',
              borderRadius: '999px',
              bgcolor: isUser ? 'neutral.50' : 'primary.50',
              cursor: 'pointer',
              font: 'inherit',
              color: 'inherit',
              '&:hover': { opacity: 0.85 },
            }}
          >
            <MediaIcon type={message.mediaType} />
            <Typography level="body-xs" fontWeight={600}>
              {mediaTypeLabel[message.mediaType]}
            </Typography>
          </Box>
        )}

        <Typography level="body-xs" sx={{ textAlign: 'right', mt: 0.5, opacity: 0.6 }}>
          {message.time}
        </Typography>
      </Box>

      <Modal open={open} onClose={() => setOpen(false)}>
        <ModalDialog sx={{ width: 'min(720px, 95vw)', maxHeight: '90vh', overflow: 'auto' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography level="title-md">{mediaTypeLabel[resolvedType]}</Typography>
            <IconButton size="sm" variant="plain" onClick={() => setOpen(false)}>
              <CloseRoundedIcon />
            </IconButton>
          </Stack>

          {message.caption && (
            <Typography
              level="body-sm"
              sx={{ mb: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
            >
              {message.caption}
            </Typography>
          )}

          {renderMediaPreview()}
        </ModalDialog>
      </Modal>
    </>
  );
}
