'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Divider,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Stack,
  Typography,
} from '@mui/joy';
import { useAuth } from 'providers/AuthProvider';
import { supabaseBrowser } from 'lib/supabase/client';

export default function AccountSettings() {
  const { user } = useAuth();

  const [fullName, setFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [msg, setMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFullName(user.user_metadata?.full_name || user.user_metadata?.name || '');
    setNewEmail(user.email || '');
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setMsg(null);

    const trimmedName = fullName.trim();
    const trimmedEmail = newEmail.trim();
    const emailChanged = trimmedEmail && trimmedEmail !== user.email;

    const { error: profileError } = await supabaseBrowser.auth.updateUser({
      data: { full_name: trimmedName },
      ...(emailChanged ? { email: trimmedEmail } : {}),
    });

    if (!profileError) {
      await supabaseBrowser
        .from('profiles')
        .update({
          full_name: trimmedName,
          ...(emailChanged ? { email: trimmedEmail } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
    }

    setSaving(false);
    if (profileError) {
      setMsg({ type: 'danger', text: profileError.message });
      return;
    }

    setMsg({
      type: 'success',
      text: emailChanged
        ? 'Perfil guardado. Revisa el nuevo correo para confirmar el cambio.'
        : 'Perfil actualizado.',
    });
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;
    if (newPassword.length < 8) {
      setMsg({ type: 'danger', text: 'La nueva contraseña debe tener al menos 8 caracteres.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMsg({ type: 'danger', text: 'Las contraseñas nuevas no coinciden.' });
      return;
    }

    setSavingPassword(true);
    setMsg(null);

    const { error: signInError } = await supabaseBrowser.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (signInError) {
      setSavingPassword(false);
      setMsg({ type: 'danger', text: 'La contraseña actual no es correcta.' });
      return;
    }

    const { error } = await supabaseBrowser.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      setMsg({ type: 'danger', text: error.message });
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setMsg({ type: 'success', text: 'Contraseña actualizada.' });
  };

  return (
    <Stack spacing={3} sx={{ maxWidth: 860 }}>
      {msg && (
        <Alert color={msg.type} variant="soft">
          {msg.text}
        </Alert>
      )}

      <Box
        component="form"
        onSubmit={handleSaveProfile}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          p: 2.5,
          borderRadius: '16px',
          border: '1px solid',
          borderColor: 'neutral.200',
          bgcolor: '#FFFFFF',
        }}
      >
        <Typography level="title-md" fontWeight={700}>
          Tu perfil
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <FormControl sx={{ flex: '1 1 240px' }}>
            <FormLabel>Nombre</FormLabel>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Tu nombre"
            />
          </FormControl>
          <FormControl sx={{ flex: '1 1 240px' }}>
            <FormLabel>Correo</FormLabel>
            <Input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="tu@empresa.com"
            />
            <FormHelperText>Si cambias el correo, deberás confirmarlo por email.</FormHelperText>
          </FormControl>
        </Box>
        <Button type="submit" loading={saving} sx={{ alignSelf: 'flex-start', borderRadius: '10px' }}>
          Guardar cambios
        </Button>
      </Box>

      <Box
        component="form"
        onSubmit={handleSavePassword}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          p: 2.5,
          borderRadius: '16px',
          border: '1px solid',
          borderColor: 'neutral.200',
          bgcolor: '#FFFFFF',
        }}
      >
        <Typography level="title-md" fontWeight={700}>
          Contraseña
        </Typography>
        <FormControl required sx={{ maxWidth: 320 }}>
          <FormLabel>Contraseña actual</FormLabel>
          <Input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
          />
        </FormControl>
        <Divider />
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <FormControl required sx={{ flex: '1 1 220px' }}>
            <FormLabel>Nueva contraseña</FormLabel>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
            />
          </FormControl>
          <FormControl required sx={{ flex: '1 1 220px' }}>
            <FormLabel>Confirmar</FormLabel>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite la nueva"
            />
          </FormControl>
        </Box>
        <Button
          type="submit"
          loading={savingPassword}
          variant="soft"
          sx={{ alignSelf: 'flex-start', borderRadius: '10px' }}
        >
          Actualizar contraseña
        </Button>
      </Box>
    </Stack>
  );
}
