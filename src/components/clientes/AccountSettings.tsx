'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Divider,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Stack,
  Typography,
} from '@mui/joy';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import { useAuth } from 'providers/AuthProvider';
import { supabaseBrowser } from 'lib/supabase/client';

export default function AccountSettings() {
  const { user } = useAuth();

  const [fullName, setFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);
  const [emailMsg, setEmailMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFullName(user.user_metadata?.full_name || user.user_metadata?.name || '');
    setNewEmail(user.email || '');
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    const { error } = await supabaseBrowser.auth.updateUser({
      data: { full_name: fullName.trim() },
    });
    setSavingProfile(false);
    if (error) {
      setProfileMsg({ type: 'danger', text: error.message });
      return;
    }
    setProfileMsg({ type: 'success', text: 'Nombre actualizado correctamente.' });
  };

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;
    const trimmed = newEmail.trim();
    if (trimmed === user.email) {
      setEmailMsg({ type: 'danger', text: 'El correo es el mismo que el actual.' });
      return;
    }
    setSavingEmail(true);
    setEmailMsg(null);
    const { error } = await supabaseBrowser.auth.updateUser({ email: trimmed });
    setSavingEmail(false);
    if (error) {
      setEmailMsg({ type: 'danger', text: error.message });
      return;
    }
    setEmailMsg({
      type: 'success',
      text: 'Te enviamos un enlace de confirmación al nuevo correo. Debes aceptarlo para completar el cambio.',
    });
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;
    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'danger', text: 'La nueva contraseña debe tener al menos 8 caracteres.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'danger', text: 'Las contraseñas nuevas no coinciden.' });
      return;
    }
    setSavingPassword(true);
    setPasswordMsg(null);

    const { error: signInError } = await supabaseBrowser.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (signInError) {
      setSavingPassword(false);
      setPasswordMsg({ type: 'danger', text: 'La contraseña actual no es correcta.' });
      return;
    }

    const { error } = await supabaseBrowser.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      setPasswordMsg({ type: 'danger', text: error.message });
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordMsg({ type: 'success', text: 'Contraseña actualizada correctamente.' });
  };

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 640 }}>
      <Card variant="outlined" sx={{ p: 2.5, borderRadius: '16px' }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <PersonRoundedIcon sx={{ color: 'primary.500' }} />
          <Typography level="title-md" fontWeight={700}>Perfil</Typography>
        </Stack>
        <Box component="form" onSubmit={handleSaveProfile}>
          <Stack spacing={2}>
            <FormControl>
              <FormLabel>Nombre completo</FormLabel>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Tu nombre"
              />
            </FormControl>
            {profileMsg && <Alert color={profileMsg.type} variant="soft">{profileMsg.text}</Alert>}
            <Button type="submit" loading={savingProfile} sx={{ alignSelf: 'flex-start', borderRadius: '10px' }}>
              Guardar nombre
            </Button>
          </Stack>
        </Box>
      </Card>

      <Card variant="outlined" sx={{ p: 2.5, borderRadius: '16px' }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <EmailRoundedIcon sx={{ color: 'primary.500' }} />
          <Typography level="title-md" fontWeight={700}>Correo electrónico</Typography>
        </Stack>
        <Box component="form" onSubmit={handleSaveEmail}>
          <Stack spacing={2}>
            <FormControl>
              <FormLabel>Correo actual</FormLabel>
              <Input value={user?.email || ''} readOnly sx={{ bgcolor: 'neutral.50' }} />
            </FormControl>
            <FormControl>
              <FormLabel>Nuevo correo</FormLabel>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="nuevo@empresa.com"
              />
              <FormHelperText>
                Supabase enviará un enlace de confirmación al nuevo correo antes de aplicar el cambio.
              </FormHelperText>
            </FormControl>
            {emailMsg && <Alert color={emailMsg.type} variant="soft">{emailMsg.text}</Alert>}
            <Button type="submit" loading={savingEmail} variant="soft" sx={{ alignSelf: 'flex-start', borderRadius: '10px' }}>
              Cambiar correo
            </Button>
          </Stack>
        </Box>
      </Card>

      <Card variant="outlined" sx={{ p: 2.5, borderRadius: '16px' }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <LockRoundedIcon sx={{ color: 'primary.500' }} />
          <Typography level="title-md" fontWeight={700}>Contraseña</Typography>
        </Stack>
        <Box component="form" onSubmit={handleSavePassword}>
          <Stack spacing={2}>
            <FormControl required>
              <FormLabel>Contraseña actual</FormLabel>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
              />
            </FormControl>
            <Divider />
            <FormControl required>
              <FormLabel>Nueva contraseña</FormLabel>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
              />
            </FormControl>
            <FormControl required>
              <FormLabel>Confirmar nueva contraseña</FormLabel>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la nueva contraseña"
              />
            </FormControl>
            {passwordMsg && <Alert color={passwordMsg.type} variant="soft">{passwordMsg.text}</Alert>}
            <Button type="submit" loading={savingPassword} sx={{ alignSelf: 'flex-start', borderRadius: '10px' }}>
              Actualizar contraseña
            </Button>
          </Stack>
        </Box>
      </Card>
    </Stack>
  );
}
