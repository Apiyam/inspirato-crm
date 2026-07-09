'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Button,
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
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import {
  extractTwilioMediaId,
  getStoredMediaUrl,
  isUsableDirectMediaUrl,
  mediaTypeLabel,
  ParsedWhatsAppMessage,
  WhatsAppMediaType,
} from 'utils/whatsappMessage';
import {
  fetchAndAutoDownloadMedia,
  guessDownloadFilename,
  triggerBlobDownload,
  triggerFileDownload,
} from 'utils/mediaFileInfoClient';

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

function isPreviewType(type: WhatsAppMediaType): boolean {
  return type === 'image' || type === 'video' || type === 'sticker';
}

function getMediaIdForFetch(message: ParsedWhatsAppMessage): string | undefined {
  return message.mediaId || extractTwilioMediaId(message.mediaUrl);
}

interface WhatsAppMessageBubbleProps {
  message: ParsedWhatsAppMessage;
}

export default function WhatsAppMessageBubble({ message }: WhatsAppMessageBubbleProps) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const [mediaUrl, setMediaUrl] = useState<string | undefined>(
    isUsableDirectMediaUrl(message.mediaUrl) ? message.mediaUrl : undefined,
  );
  const [downloadFilename, setDownloadFilename] = useState<string | undefined>();
  const [resolvedType] = useState<WhatsAppMediaType>(message.mediaType);

  const isUser = message.from === 'user';

  const preferredFilename =
    guessDownloadFilename(message.text) ||
    guessDownloadFilename(message.caption) ||
    undefined;

  useEffect(() => {
    return () => {
      if (mediaUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(mediaUrl);
      }
    };
  }, [mediaUrl]);

  const handleMediaClick = async () => {
    if (!message.hasMedia || downloading) return;

    setDownloadError('');
    setDownloading(true);

    try {
      if (mediaUrl && isUsableDirectMediaUrl(mediaUrl)) {
        triggerFileDownload(mediaUrl, preferredFilename);
        if (isPreviewType(message.mediaType)) setOpen(true);
        return;
      }

      const mediaId = getMediaIdForFetch(message);
      if (!mediaId) {
        throw new Error('Este mensaje no tiene media_id para consultar el archivo.');
      }

      const file = await fetchAndAutoDownloadMedia(
        {
          mediaId,
          mediaUrl: getStoredMediaUrl(message.raw) || message.mediaUrl,
        },
        preferredFilename,
      );

      setMediaUrl((prev) => {
        if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
        return file.blobUrl;
      });
      setDownloadFilename(file.filename);

      if (isPreviewType(message.mediaType)) {
        setOpen(true);
      }
    } catch (err: unknown) {
      setDownloadError(err instanceof Error ? err.message : 'Error al descargar el archivo.');
    } finally {
      setDownloading(false);
    }
  };

  const handleRedownload = () => {
    if (!mediaUrl) return;
    triggerBlobDownload(mediaUrl, downloadFilename || preferredFilename || 'archivo');
  };

  const renderMediaPreview = () => {
    if (!mediaUrl) {
      return (
        <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
          Haz clic en el adjunto para descargarlo.
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
      <Typography level="body-sm">
        Archivo descargado. Revisa tu carpeta de descargas.
      </Typography>
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
            onClick={handleMediaClick}
            disabled={downloading}
            sx={{
              mt: message.text ? 1 : 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.75,
              px: 1.25,
              py: 0.625,
              minWidth: 128,
              border: '1px solid',
              borderColor: downloadError
                ? 'danger.300'
                : isUser
                  ? 'neutral.300'
                  : 'primary.300',
              borderRadius: '999px',
              bgcolor: downloading
                ? isUser
                  ? 'neutral.100'
                  : 'primary.200'
                : isUser
                  ? 'neutral.50'
                  : 'primary.50',
              cursor: downloading ? 'wait' : 'pointer',
              font: 'inherit',
              color: 'inherit',
              '&:hover': { opacity: downloading ? 1 : 0.85 },
              '&:disabled': { cursor: 'wait' },
            }}
          >
            {downloading ? (
              <>
                <CircularProgress size="sm" thickness={5} sx={{ '--CircularProgress-size': '16px' }} />
                <Typography level="body-xs" fontWeight={600}>
                  Descargando...
                </Typography>
              </>
            ) : (
              <>
                <MediaIcon type={message.mediaType} />
                <Typography level="body-xs" fontWeight={600}>
                  {mediaTypeLabel[message.mediaType]}
                </Typography>
              </>
            )}
          </Box>
        )}

        {downloadError && (
          <Typography level="body-xs" color="danger" sx={{ mt: 0.5 }}>
            {downloadError}
          </Typography>
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

          {mediaUrl && (
            <Button
              size="sm"
              variant="outlined"
              startDecorator={<DownloadRoundedIcon />}
              sx={{ mt: 1.5, alignSelf: 'flex-start' }}
              onClick={handleRedownload}
            >
              Volver a descargar
            </Button>
          )}
        </ModalDialog>
      </Modal>
    </>
  );
}
