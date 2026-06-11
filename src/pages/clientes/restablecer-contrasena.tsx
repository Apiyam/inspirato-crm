import * as React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Card, Stack, Typography, FormControl, FormLabel, Input, Button, Alert, CircularProgress, Box } from '@mui/joy';
import { supabaseBrowser } from 'lib/supabase/client';
import AuthPageShell, { authCardSx } from 'components/clientes/AuthPageShell';
import AppFooter from 'components/clientes/AppFooter';
import { AUTH_PATHS } from 'lib/supabase/auth-helpers';

export default function RestablecerContrasenaPage() {
  const router = useRouter();
  const [ready, setReady] = React.useState(false);
  const [validSession, setValidSession] = React.useState(false);
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  React.useEffect(() => {
    const checkSession = async () => {
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      const isRecovery = hash.includes('type=recovery') || hash.includes('type=signup');

      const { data: { session } } = await supabaseBrowser.auth.getSession();
      setValidSession(!!session || isRecovery);
      setReady(true);
    };

    const { data: listener } = supabaseBrowser.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setValidSession(!!session);
        setReady(true);
      }
    });

    void checkSession();
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setMessage({ type: 'danger', text: 'La contraseña debe tener al menos 8 caracteres.' });
      return;
    }
    if (password !== confirm) {
      setMessage({ type: 'danger', text: 'Las contraseñas no coinciden.' });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    const { error } = await supabaseBrowser.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      setMessage({ type: 'danger', text: error.message });
      return;
    }
    setMessage({ type: 'success', text: 'Contraseña actualizada. Redirigiendo al CRM...' });
    setTimeout(() => router.replace('/clientes/whatsapp?tab=chatbot'), 1800);
  };

  if (!ready) {
    return (
      <AuthPageShell maxWidth={440}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      </AuthPageShell>
    );
  }

  if (!validSession) {
    return (
      <AuthPageShell>
        <Card variant="outlined" sx={authCardSx()}>
          <Stack spacing={2} alignItems="center" textAlign="center">
            <Typography level="h4" fontWeight={700}>Enlace inválido o expirado</Typography>
            <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
              Solicita un nuevo enlace de recuperación desde la pantalla de inicio de sesión.
            </Typography>
            <Button component={Link} href="/clientes/recuperar-cuenta" sx={{ borderRadius: '12px' }}>
              Solicitar nuevo enlace
            </Button>
            <Button component={Link} href={AUTH_PATHS.login} variant="plain" color="neutral">
              Ir al login
            </Button>
          </Stack>
        </Card>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell>
      <Card component="form" onSubmit={handleSubmit} variant="outlined" sx={authCardSx()}>
        <Stack spacing={2.5}>
          <img
            src="/logo-full.png"
            alt="Inspirato"
            style={{ height: 80, objectFit: 'contain', display: 'block', margin: '0 auto' }}
          />
          <Typography level="h4" textAlign="center" fontWeight={700}>
            Nueva contraseña
          </Typography>
          <Typography level="body-sm" textAlign="center" sx={{ color: 'text.tertiary' }}>
            Elige una contraseña segura para tu cuenta.
          </Typography>

          {message && <Alert color={message.type} variant="soft">{message.text}</Alert>}

          <FormControl required>
            <FormLabel>Nueva contraseña</FormLabel>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              sx={{ borderRadius: '12px' }}
            />
          </FormControl>

          <FormControl required>
            <FormLabel>Confirmar contraseña</FormLabel>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repite la contraseña"
              sx={{ borderRadius: '12px' }}
            />
          </FormControl>

          <Button type="submit" loading={submitting} size="lg" sx={{ borderRadius: '12px', fontWeight: 700 }}>
            Guardar contraseña
          </Button>
        </Stack>
      </Card>
      <Box sx={{ mt: 3 }}>
        <AppFooter variant="auth" />
      </Box>
    </AuthPageShell>
  );
}
