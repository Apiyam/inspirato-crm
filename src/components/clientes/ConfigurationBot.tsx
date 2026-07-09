'use client';

import { useState, useEffect } from 'react';
import { Box, Button, Card, Snackbar, Stack, Textarea, Typography } from '@mui/joy';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import CheckCircle from '@mui/icons-material/CheckCircle';
import { fetchSettings, updateSettings } from 'pages/api/entities';

export default function ConfigurationBot() {
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [settings, setSettings] = useState('');
  const [messageSnackbar, setMessageSnackbar] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings().then((settingsData) => {
      if (settingsData?.bot) setSettings(settingsData.bot);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const updated = await updateSettings({ bot: settings });
    setSaving(false);
    setMessageSnackbar(updated ? 'Configuración actualizada' : 'Error al actualizar');
    setOpenSnackbar(true);
  };

  return (
    <Stack spacing={2}>
      <Card variant="outlined" sx={{ p: 2.5, borderRadius: '16px', bgcolor: '#FFFFFF' }}>
        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
          <AutoAwesomeRoundedIcon sx={{ color: 'primary.500' }} />
          <Typography level="title-lg" fontWeight={700}>Prompt del asistente IA</Typography>
        </Stack>
        <Typography level="body-sm" sx={{ color: 'text.tertiary', mb: 2 }}>
          Define el comportamiento, tono y reglas de respuesta del bot de WhatsApp.
        </Typography>
        <Textarea
          minRows={14}
          value={settings.replace(/\\n/g, '\n')}
          onChange={(e) => setSettings(e.target.value)}
          slotProps={{
            textarea: {
              style: { resize: 'vertical' },
            },
          }}
          sx={{
            width: '100%',
            minHeight: 360,
            maxHeight: 'min(55vh, 520px)',
            overflowY: 'auto',
            fontFamily: 'monospace',
            fontSize: 14,
            borderRadius: '12px',
            '& textarea': {
              minHeight: '360px !important',
              maxHeight: 'min(55vh, 520px) !important',
              overflowY: 'auto !important',
            },
          }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Button loading={saving} onClick={handleSave} sx={{ borderRadius: '12px', px: 3 }}>
            Guardar configuración del bot
          </Button>
        </Box>
      </Card>

      <Snackbar open={openSnackbar} onClose={() => setOpenSnackbar(false)} autoHideDuration={2500} color="success" variant="solid">
        <CheckCircle /> {messageSnackbar}
      </Snackbar>
    </Stack>
  );
}
