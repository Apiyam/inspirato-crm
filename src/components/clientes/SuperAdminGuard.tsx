'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Alert, CircularProgress, Stack, Typography } from '@mui/joy';
import { useAuth } from 'providers/AuthProvider';

/** Bloquea rutas de configuración si el usuario no es superadmin. */
export default function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const { loading, user, isSuperAdmin, profileReady, profile } = useAuth();
  const router = useRouter();

  const ready = !loading && profileReady && Boolean(user);
  const denied = ready && Boolean(profile) && !isSuperAdmin;

  useEffect(() => {
    if (!denied) return;
    void router.replace('/clientes/whatsapp?tab=chatbot');
  }, [denied, router]);

  if (!ready) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 240 }} spacing={1}>
        <CircularProgress size="sm" />
        <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
          Verificando permisos...
        </Typography>
      </Stack>
    );
  }

  if (!isSuperAdmin) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 240 }} spacing={1.5} px={2}>
        {!profile ? (
          <Alert color="warning" variant="soft" sx={{ maxWidth: 520 }}>
            No se encontró tu perfil en la tabla <strong>profiles</strong>. Ejecuta la migración
            005 y luego en SQL Editor:
            <br />
            <code>
              UPDATE public.profiles SET role = &apos;superadmin&apos; WHERE email =
              &apos;tu@correo.com&apos;;
            </code>
            <br />
            Después recarga la página.
          </Alert>
        ) : (
          <>
            <CircularProgress size="sm" />
            <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
              Sin permiso de superadmin (rol actual: {profile.role}). Redirigiendo...
            </Typography>
          </>
        )}
      </Stack>
    );
  }

  return <>{children}</>;
}
