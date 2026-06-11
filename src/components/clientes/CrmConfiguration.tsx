'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Divider,
  FormControl,
  FormHelperText,
  FormLabel,
  IconButton,
  Input,
  Snackbar,
  Stack,
  Textarea,
  Typography,
} from '@mui/joy';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ViewCarouselRoundedIcon from '@mui/icons-material/ViewCarouselRounded';
import { useCrmConfig } from 'hooks/useCrmConfig';
import { LeadStatusConfig, TwilioCardMapping } from 'types/crm';

export default function CrmConfiguration() {
  const { config, loading, save } = useCrmConfig();
  const [draft, setDraft] = useState(config);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState('');

  useEffect(() => {
    if (!loading) setDraft(config);
  }, [config, loading]);

  const handleSave = async () => {
    setSaving(true);
    const ok = await save(draft);
    setSaving(false);
    setSnack(ok ? 'Configuración guardada correctamente' : 'Error al guardar');
  };

  const updateStatus = (index: number, field: keyof LeadStatusConfig, value: string) => {
    setDraft((prev) => {
      const next = [...prev.leadStatuses];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, leadStatuses: next };
    });
  };

  const addStatus = () => {
    setDraft((prev) => ({
      ...prev,
      leadStatuses: [
        ...prev.leadStatuses,
        { key: `estado_${Date.now()}`, label: 'Nuevo estado', color: '#B0694D' },
      ],
    }));
  };

  const removeStatus = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      leadStatuses: prev.leadStatuses.filter((_, i) => i !== index),
    }));
  };

  const updateBusinessLine = (index: number, field: 'name' | 'phones', value: string) => {
    setDraft((prev) => {
      const lines = [...prev.businessLines];
      lines[index] = { ...lines[index], [field]: value };
      return { ...prev, businessLines: lines };
    });
  };

  const updateCardMapping = (index: number, field: keyof TwilioCardMapping, value: string) => {
    setDraft((prev) => {
      const rows = [...(prev.cardMappings || [])];
      rows[index] = { ...rows[index], [field]: value };
      return { ...prev, cardMappings: rows };
    });
  };

  const addCardMapping = () => {
    setDraft((prev) => ({
      ...prev,
      cardMappings: [
        ...(prev.cardMappings || []),
        { intention: `intencion_${Date.now()}`, twilioId: '', usage: '' },
      ],
    }));
  };

  const removeCardMapping = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      cardMappings: (prev.cardMappings || []).filter((_, i) => i !== index),
    }));
  };

  const cardMappings = draft.cardMappings || [];

  return (
    <Stack spacing={2} sx={{ height: '100%', overflow: 'auto' }}>
      <Card variant="outlined" sx={{ p: 2.5, borderRadius: '16px', bgcolor: '#FFFFFF' }}>
        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
          <LocalOfferRoundedIcon sx={{ color: 'primary.500' }} />
          <Typography level="title-lg" fontWeight={700}>Estados de leads y contactos</Typography>
        </Stack>
        <Typography level="body-sm" sx={{ color: 'text.tertiary', mb: 2 }}>
          Define los estatus disponibles para clasificar conversaciones. Cada estado tiene clave interna, etiqueta visible y color.
        </Typography>

        <Box
          sx={{
            border: '1px solid',
            borderColor: 'neutral.200',
            borderRadius: '14px',
            overflow: 'hidden',
            bgcolor: 'background.surface',
          }}
        >
          {/* Encabezados — desktop */}
          <Box
            sx={{
              display: { xs: 'none', md: 'grid' },
              gridTemplateColumns: 'minmax(130px, 0.9fr) minmax(200px, 2fr) minmax(140px, 1.2fr) minmax(120px, 0.8fr) 44px',
              gap: 2,
              px: 2,
              py: 1.25,
              bgcolor: 'neutral.50',
              borderBottom: '1px solid',
              borderColor: 'neutral.200',
            }}
          >
            {['Vista previa', 'Etiqueta visible', 'Clave interna', 'Color', ''].map((col) => (
              <Typography key={col} level="body-xs" fontWeight={700} sx={{ color: 'text.tertiary', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {col}
              </Typography>
            ))}
          </Box>

          <Stack divider={<Divider />} sx={{ '--Divider-lineColor': 'var(--joy-palette-neutral-200)' }}>
            {draft.leadStatuses.map((status, index) => (
              <Box
                key={`${status.key}-${index}`}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr auto',
                    md: 'minmax(130px, 0.9fr) minmax(200px, 2fr) minmax(140px, 1.2fr) minmax(120px, 0.8fr) 44px',
                  },
                  gap: { xs: 1.5, md: 2 },
                  p: 2,
                  alignItems: { md: 'center' },
                }}
              >
                {/* Vista previa + eliminar en móvil */}
                <Box
                  sx={{
                    gridColumn: { xs: '1 / 2', md: '1' },
                    display: 'flex',
                    alignItems: 'center',
                    minWidth: 0,
                  }}
                >
                  <Chip
                    size="md"
                    sx={{
                      bgcolor: `${status.color}22`,
                      color: status.color,
                      fontWeight: 700,
                      borderRadius: '999px',
                      maxWidth: '100%',
                      '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' },
                    }}
                  >
                    {status.label || 'Sin etiqueta'}
                  </Chip>
                </Box>

                <IconButton
                  size="sm"
                  color="danger"
                  variant="soft"
                  onClick={() => removeStatus(index)}
                  sx={{
                    gridColumn: { xs: '2 / 3', md: '5' },
                    gridRow: { xs: '1', md: '1' },
                    alignSelf: 'center',
                    borderRadius: '10px',
                  }}
                  aria-label={`Eliminar estado ${status.label}`}
                >
                  <DeleteOutlineRoundedIcon />
                </IconButton>

                {/* Etiqueta */}
                <FormControl size="sm" sx={{ minWidth: 0, gridColumn: { xs: '1 / -1', md: '2' } }}>
                  <FormLabel sx={{ display: { md: 'none' }, mb: 0.5 }}>Etiqueta visible</FormLabel>
                  <Input
                    value={status.label}
                    onChange={(e) => updateStatus(index, 'label', e.target.value)}
                    placeholder="Ej. Nuevo lead"
                  />
                </FormControl>

                {/* Clave */}
                <FormControl size="sm" sx={{ minWidth: 0, gridColumn: { xs: '1 / -1', md: '3' } }}>
                  <FormLabel sx={{ display: { md: 'none' }, mb: 0.5 }}>Clave interna</FormLabel>
                  <Input
                    value={status.key}
                    onChange={(e) => updateStatus(index, 'key', e.target.value)}
                    placeholder="lead"
                    slotProps={{ input: { sx: { fontFamily: 'monospace', fontSize: 13 } } }}
                  />
                  <FormHelperText sx={{ display: { md: 'none' } }}>Usada en filtros y base de datos</FormHelperText>
                </FormControl>

                {/* Color */}
                <FormControl size="sm" sx={{ minWidth: 0, gridColumn: { xs: '1 / -1', md: '4' } }}>
                  <FormLabel sx={{ display: { md: 'none' }, mb: 0.5 }}>Color</FormLabel>
                  <Stack direction="row" spacing={1} alignItems="center">
                  <Input
                        type="color"
                        value={status.color}
                        onChange={(e) => updateStatus(index, 'color', e.target.value)}
                        sx={{
                          
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      />
                    <Input
                      size="sm"
                      value={status.color}
                      onChange={(e) => updateStatus(index, 'color', e.target.value)}
                      placeholder="#B0694D"
                      slotProps={{ input: { sx: { fontFamily: 'monospace', fontSize: 12 } } }}
                      sx={{ flex: 1, minWidth: 0 }}
                    />
                  </Stack>
                </FormControl>

              </Box>
            ))}
          </Stack>
        </Box>

        <Button startDecorator={<AddRoundedIcon />} variant="soft" onClick={addStatus} sx={{ mt: 1.5, borderRadius: '10px' }}>
          Añadir estado
        </Button>
      </Card>

     {
      /*
       <Card variant="outlined" sx={{ p: 2.5, borderRadius: '16px', bgcolor: '#FFFFFF' }}>
        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
          <NotificationsActiveRoundedIcon sx={{ color: 'success.500' }} />
          <Typography level="title-lg" fontWeight={700}>Notificaciones de nuevo contacto</Typography>
        </Stack>
        <FormControl>
          <FormLabel>Números WhatsApp (separados por comas)</FormLabel>
          <Textarea
            minRows={2}
            placeholder="5215512345678, 5215598765432"
            value={draft.newContactPhones}
            onChange={(e) => setDraft((prev) => ({ ...prev, newContactPhones: e.target.value }))}
          />
          <FormHelperText>
            Estos números recibirán alerta cuando entre un contacto nuevo al CRM.
          </FormHelperText>
        </FormControl>
      </Card>
      */
     }

      <Card variant="outlined" sx={{ p: 2.5, borderRadius: '16px', bgcolor: '#FFFFFF' }}>
        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
          <BusinessRoundedIcon sx={{ color: 'warning.500' }} />
          <Typography level="title-lg" fontWeight={700}>Líneas de negocio — venta en caliente</Typography>
        </Stack>
        <Typography level="body-sm" sx={{ color: 'text.tertiary', mb: 2 }}>
          Configura hasta 3 líneas de negocio. En cada una indica los números (separados por comas) que recibirán notificación de venta en caliente.
        </Typography>

        <Stack spacing={2}>
          {draft.businessLines.map((line, index) => (
            <Card key={index} variant="soft" sx={{ p: 2, borderRadius: '14px' }}>
              <Typography level="title-sm" fontWeight={700} sx={{ mb: 1 }}>
                Línea {index + 1}
              </Typography>
              <Stack spacing={1}>
                <FormControl>
                  <FormLabel>Nombre de la línea</FormLabel>
                  <Input
                    value={line.name}
                    onChange={(e) => updateBusinessLine(index, 'name', e.target.value)}
                    placeholder={`Línea de negocio ${index + 1}`}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Números para venta en caliente</FormLabel>
                  <Textarea
                    minRows={2}
                    value={line.phones}
                    onChange={(e) => updateBusinessLine(index, 'phones', e.target.value)}
                    placeholder="5215511111111, 5215522222222"
                  />
                </FormControl>
              </Stack>
            </Card>
          ))}
        </Stack>
      </Card>

      <Card variant="outlined" sx={{ p: 2.5, borderRadius: '16px', bgcolor: '#FFFFFF' }}>
        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
          <ViewCarouselRoundedIcon sx={{ color: 'primary.500' }} />
          <Typography level="title-lg" fontWeight={700}>Configuración de tarjetas</Typography>
        </Stack>
        <Typography level="body-sm" sx={{ color: 'text.tertiary', mb: 2 }}>
          Asocia cada intención del flujo del bot con su Content SID de Twilio. Puedes añadir o quitar filas según necesites.
        </Typography>

        <Box
          sx={{
            border: '1px solid',
            borderColor: 'neutral.200',
            borderRadius: '14px',
            overflow: 'hidden',
            bgcolor: 'background.surface',
          }}
        >
          <Box
            sx={{
              display: { xs: 'none', md: 'grid' },
              gridTemplateColumns: 'minmax(160px, 1.2fr) minmax(160px, 1fr) minmax(200px, 1.4fr) 44px',
              gap: 2,
              px: 2,
              py: 1.25,
              bgcolor: 'neutral.50',
              borderBottom: '1px solid',
              borderColor: 'neutral.200',
            }}
          >
            {['Intención', 'ID Twilio', 'Uso', ''].map((col) => (
              <Typography
                key={col}
                level="body-xs"
                fontWeight={700}
                sx={{ color: 'text.tertiary', textTransform: 'uppercase', letterSpacing: '0.06em' }}
              >
                {col}
              </Typography>
            ))}
          </Box>

          {cardMappings.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
                No hay tarjetas configuradas. Añade la primera fila.
              </Typography>
            </Box>
          ) : (
            <Stack divider={<Divider />} sx={{ '--Divider-lineColor': 'var(--joy-palette-neutral-200)' }}>
              {cardMappings.map((row, index) => (
                <Box
                  key={`${row.intention}-${index}`}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr auto',
                      md: 'minmax(160px, 1.2fr) minmax(160px, 1fr) minmax(200px, 1.4fr) 44px',
                    },
                    gap: { xs: 1.5, md: 2 },
                    p: 2,
                    alignItems: { md: 'center' },
                  }}
                >
                  <FormControl size="sm" sx={{ minWidth: 0, gridColumn: { xs: '1 / 2', md: '1' } }}>
                    <FormLabel sx={{ display: { md: 'none' }, mb: 0.5 }}>Intención</FormLabel>
                    <Input
                      value={row.intention}
                      onChange={(e) => updateCardMapping(index, 'intention', e.target.value)}
                      placeholder="greetings"
                      slotProps={{ input: { sx: { fontFamily: 'monospace', fontSize: 13 } } }}
                    />
                  </FormControl>

                  <IconButton
                    size="sm"
                    color="danger"
                    variant="soft"
                    onClick={() => removeCardMapping(index)}
                    sx={{
                      gridColumn: { xs: '2 / 3', md: '4' },
                      gridRow: { xs: '1', md: '1' },
                      alignSelf: 'center',
                      borderRadius: '10px',
                    }}
                    aria-label={`Eliminar tarjeta ${row.intention}`}
                  >
                    <DeleteOutlineRoundedIcon />
                  </IconButton>

                  <FormControl size="sm" sx={{ minWidth: 0, gridColumn: { xs: '1 / -1', md: '2' } }}>
                    <FormLabel sx={{ display: { md: 'none' }, mb: 0.5 }}>ID Twilio</FormLabel>
                    <Input
                      value={row.twilioId}
                      onChange={(e) => updateCardMapping(index, 'twilioId', e.target.value)}
                      placeholder="HCxxxxxxxx"
                      slotProps={{ input: { sx: { fontFamily: 'monospace', fontSize: 13 } } }}
                    />
                  </FormControl>

                  <FormControl size="sm" sx={{ minWidth: 0, gridColumn: { xs: '1 / -1', md: '3' } }}>
                    <FormLabel sx={{ display: { md: 'none' }, mb: 0.5 }}>Uso</FormLabel>
                    <Input
                      value={row.usage}
                      onChange={(e) => updateCardMapping(index, 'usage', e.target.value)}
                      placeholder="Ej. Saludo inicial, menú principal..."
                    />
                  </FormControl>
                </Box>
              ))}
            </Stack>
          )}
        </Box>

        <Button
          startDecorator={<AddRoundedIcon />}
          variant="soft"
          onClick={addCardMapping}
          sx={{ mt: 1.5, borderRadius: '10px' }}
        >
          Añadir tarjeta
        </Button>
      </Card>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', pb: 2 }}>
        <Button size="lg" loading={saving} onClick={handleSave} sx={{ borderRadius: '12px', px: 4 }}>
          Guardar configuración
        </Button>
      </Box>

      <Snackbar open={Boolean(snack)} autoHideDuration={3000} onClose={() => setSnack('')} color="success">
        <CheckCircleRoundedIcon /> {snack}
      </Snackbar>
    </Stack>
  );
}
