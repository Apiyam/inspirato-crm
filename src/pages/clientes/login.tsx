import * as React from 'react';
import Link from 'next/link';
import { Box, Typography, Stack, Card, Input, Button, FormControl, FormLabel, Alert } from '@mui/joy';
import { useAuth } from 'providers/AuthProvider';
import { supabaseBrowser } from 'lib/supabase/client';
import RedirectionInDashboard from 'components/clientes/RedirectionToLogin';
import { useRouter } from 'next/router';
import AuthPageShell, { authCardSx } from 'components/clientes/AuthPageShell';
import AppFooter from 'components/clientes/AppFooter';
import { AUTH_PATHS } from 'lib/supabase/auth-helpers';

export default function ApiyamLoginClients() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  if (!loading && user) {
    return <RedirectionInDashboard />;
  }

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    const { error: authError } = await supabaseBrowser.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setSubmitting(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    router.replace('/clientes/whatsapp?tab=chatbot');
  };

  return (
    <AuthPageShell>
      <Card component="form" onSubmit={handleLogin} variant="outlined" sx={authCardSx()}>
        <Stack spacing={2.5}>
          <Box
            component="img"
            src="/logo-full.png"
            alt="Inspirato"
            sx={{
              height: { xs: 88, sm: 108 },
              width: 'auto',
              maxWidth: '100%',
              objectFit: 'contain',
              display: 'block',
              mx: 'auto',
            }}
          />

          <Box sx={{ textAlign: 'center' }}>
            <Typography level="h3" sx={{ fontWeight: 700, color: 'text.primary', letterSpacing: '-0.02em' }}>
              Inspirato CRM y Asistente IA
            </Typography>
            <Typography level="body-sm" sx={{ color: 'text.tertiary', mt: 0.5 }}>
              Gestiona conversaciones, contactos y tu bot desde un solo lugar.
            </Typography>
          </Box>

          {error && <Alert color="danger" variant="soft">{error}</Alert>}

          <FormControl required>
            <FormLabel>Correo electrónico</FormLabel>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@empresa.com"
              sx={{ borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.7)' }}
            />
          </FormControl>

          <FormControl required>
            <FormLabel>Contraseña</FormLabel>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              sx={{ borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.7)' }}
            />
          </FormControl>

          <Button
            type="submit"
            loading={submitting}
            size="lg"
            sx={{
              borderRadius: '12px',
              fontWeight: 700,
              mt: 0.5,
              boxShadow: '0 4px 16px rgba(176, 105, 77, 0.35)',
            }}
          >
            Entrar al CRM
          </Button>

          <Typography level="body-sm" textAlign="center">
            <Link href={AUTH_PATHS.recuperar} style={{ color: 'inherit' }}>
              ¿Olvidaste tu contraseña?
            </Link>
          </Typography>
        </Stack>
      </Card>

      <Box sx={{ mt: 3 }}>
        <AppFooter variant="auth" />
      </Box>
    </AuthPageShell>
  );
}
