'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  FormLabel,
  Input,
  Option,
  Select,
  Sheet,
  Stack,
  Table,
  Typography,
} from '@mui/joy';
import GroupAddRoundedIcon from '@mui/icons-material/GroupAddRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { useAuth } from 'providers/AuthProvider';
import type { InviteStatus, UserInvite, UserRole } from 'types/crm';
import { formatDate } from 'utils/Utils';

const statusLabel: Record<InviteStatus, string> = {
  pending: 'Pendiente',
  accepted: 'Aceptada',
  revoked: 'Revocada',
};

const statusColor: Record<InviteStatus, 'warning' | 'success' | 'neutral'> = {
  pending: 'warning',
  accepted: 'success',
  revoked: 'neutral',
};

export default function TeamManagement() {
  const { session } = useAuth();
  const [invites, setInvites] = useState<UserInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('ejecutivo');

  const authHeaders = useCallback(() => {
    if (!session?.access_token) return null;
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    };
  }, [session?.access_token]);

  const loadInvites = useCallback(async () => {
    const headers = authHeaders();
    if (!headers) return;
    setLoading(true);
    try {
      const response = await fetch('/api/invite-user', { headers });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar el equipo.');
      setInvites(payload.invites || []);
    } catch (err: unknown) {
      setMessage({
        type: 'danger',
        text: err instanceof Error ? err.message : 'Error al cargar invitaciones.',
      });
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    void loadInvites();
  }, [loadInvites]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const headers = authHeaders();
    if (!headers) {
      setMessage({ type: 'danger', text: 'Sesión no disponible.' });
      return;
    }
    setInviting(true);
    setMessage(null);
    try {
      const response = await fetch('/api/invite-user', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: email.trim(),
          full_name: fullName.trim(),
          role,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'No se pudo invitar.');
      setEmail('');
      setFullName('');
      setRole('ejecutivo');
      setMessage({ type: 'success', text: `Invitación enviada a ${payload.email}.` });
      await loadInvites();
    } catch (err: unknown) {
      setMessage({
        type: 'danger',
        text: err instanceof Error ? err.message : 'Error al invitar.',
      });
    } finally {
      setInviting(false);
    }
  };

  return (
    <Stack spacing={2.5}>
      <Sheet variant="outlined" sx={{ p: 2.5, borderRadius: '16px' }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <GroupAddRoundedIcon sx={{ color: 'primary.500' }} />
          <Typography level="title-md" fontWeight={700}>
            Invitar miembro
          </Typography>
        </Stack>
        <Typography level="body-sm" sx={{ color: 'text.tertiary', mb: 2 }}>
          El ejecutivo ve Inicio, Inbox, Contactos y Mi cuenta. El superadmin tiene acceso completo.
        </Typography>

        <Box
          component="form"
          onSubmit={handleInvite}
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1.5,
            alignItems: 'flex-end',
          }}
        >
          <FormControl required sx={{ flex: '1 1 200px', minWidth: 180 }}>
            <FormLabel>Correo</FormLabel>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="coleaga@empresa.com"
            />
          </FormControl>
          <FormControl sx={{ flex: '1 1 160px', minWidth: 140 }}>
            <FormLabel>Nombre</FormLabel>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Opcional"
            />
          </FormControl>
          <FormControl required sx={{ flex: '0 1 160px', minWidth: 140 }}>
            <FormLabel>Rol</FormLabel>
            <Select value={role} onChange={(_, v) => setRole((v as UserRole) || 'ejecutivo')}>
              <Option value="ejecutivo">Ejecutivo</Option>
              <Option value="superadmin">Superadmin</Option>
            </Select>
          </FormControl>
          <Button type="submit" loading={inviting} sx={{ borderRadius: '10px' }}>
            Enviar invitación
          </Button>
        </Box>

        {message && (
          <Alert color={message.type} variant="soft" sx={{ mt: 2 }}>
            {message.text}
          </Alert>
        )}
      </Sheet>

      <Sheet variant="outlined" sx={{ p: 2.5, borderRadius: '16px' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Typography level="title-md" fontWeight={700}>
            Registro de invitaciones
          </Typography>
          <Button
            size="sm"
            variant="soft"
            startDecorator={<RefreshRoundedIcon />}
            loading={loading}
            onClick={() => void loadInvites()}
          >
            Actualizar
          </Button>
        </Stack>

        {invites.length === 0 && !loading ? (
          <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
            Aún no hay invitaciones registradas.
          </Typography>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="sm" sx={{ '& th': { whiteSpace: 'nowrap' } }}>
              <thead>
                <tr>
                  <th>Correo</th>
                  <th>Nombre</th>
                  <th>Rol</th>
                  <th>Estatus</th>
                  <th>Invitado</th>
                  <th>Aceptado</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((invite) => (
                  <tr key={invite.id}>
                    <td>{invite.email}</td>
                    <td>{invite.full_name || '—'}</td>
                    <td>
                      <Chip size="sm" variant="soft">
                        {invite.role === 'superadmin' ? 'Superadmin' : 'Ejecutivo'}
                      </Chip>
                    </td>
                    <td>
                      <Chip size="sm" color={statusColor[invite.status]} variant="solid">
                        {statusLabel[invite.status]}
                      </Chip>
                    </td>
                    <td>{invite.created_at ? formatDate(invite.created_at, true, true) : '—'}</td>
                    <td>{invite.accepted_at ? formatDate(invite.accepted_at, true, true) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Box>
        )}
      </Sheet>
    </Stack>
  );
}
