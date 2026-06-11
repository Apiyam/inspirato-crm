import * as React from 'react';
import Link from 'next/link';
import { Box, Card, Stack, Typography, FormControl, FormLabel, Input, Button, Alert } from '@mui/joy';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { useAuth } from 'providers/AuthProvider';
import { supabaseBrowser } from 'lib/supabase/client';
import RedirectionInDashboard from 'components/clientes/RedirectionToLogin';
import AuthPageShell, { authCardSx } from 'components/clientes/AuthPageShell';
import AppFooter from 'components/clientes/AppFooter';
import { AUTH_PATHS, getAuthRedirectUrl } from 'lib/supabase/auth-helpers';

export default function RecuperarCuentaPage() {
  const { user, loading } = useAuth();
  const [email, setEmail] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  if (!loading && user) {
    return <RedirectionInDashboard />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    const { error } = await supabaseBrowser.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: getAuthRedirectUrl(AUTH_PATHS.resetPassword),
    });
    setSubmitting(false);
    if (error) {
      setMessage({ type: 'danger', text: error.message });
      return;
    }
    setMessage({
      type: 'success',
      text: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña. Revisa también spam.',
    });
  };

  return (
    <AuthPageShell>
      <Card component="form" onSubmit={handleSubmit} variant="outlined" sx={authCardSx()}>
        <Stack spacing={2.5}>
          <BoxLogo />
          <Typography level="h4" textAlign="center" fontWeight={700}>
            Recuperar cuenta
          </Typography>
          <Typography level="body-sm" textAlign="center" sx={{ color: 'text.tertiary' }}>
            Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
          </Typography>

          {message && <Alert color={message.type} variant="soft">{message.text}</Alert>}

          <FormControl required>
            <FormLabel>Correo electrónico</FormLabel>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@empresa.com"
              sx={{ borderRadius: '12px' }}
            />
          </FormControl>

          <Button type="submit" loading={submitting} size="lg" sx={{ borderRadius: '12px', fontWeight: 700 }}>
            Enviar enlace
          </Button>

          <Button
            component={Link}
            href={AUTH_PATHS.login}
            variant="plain"
            color="neutral"
            startDecorator={<ArrowBackRoundedIcon />}
            sx={{ alignSelf: 'center' }}
          >
            Volver al inicio de sesión
          </Button>
        </Stack>
      </Card>
      <Box sx={{ mt: 3 }}>
        <AppFooter variant="auth" />
      </Box>
    </AuthPageShell>
  );
}

function BoxLogo() {
  return (
    <img
      src="/logo-full.png"
      alt="Inspirato"
      style={{ height: 80, objectFit: 'contain', display: 'block', margin: '0 auto' }}
    />
  );
}
