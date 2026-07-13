import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { InviteStatus, UserInvite, UserRole } from 'types/crm';

type InviteListResponse = {
  invites?: UserInvite[];
  error?: string;
};

type InviteCreateResponse = {
  ok?: boolean;
  invite?: UserInvite;
  error?: string;
  email?: string;
  role?: UserRole;
};

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getAuthClient(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function requireSuperAdmin(token: string, admin: SupabaseClient) {
  const callerClient = getAuthClient(token);
  const { data: userData, error: userError } = await callerClient.auth.getUser();
  if (userError || !userData.user) {
    return { error: 'Sesión inválida.', status: 401 as const };
  }

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileError || profile?.role !== 'superadmin') {
    return { error: 'Solo un superadmin puede gestionar el equipo.', status: 403 as const };
  }

  return { user: userData.user };
}

async function syncInviteStatuses(admin: SupabaseClient) {
  const { data: pending } = await admin
    .from('user_invites')
    .select('id, email, invited_user_id, status')
    .eq('status', 'pending');

  if (!pending?.length) return;

  for (const row of pending) {
    let authUser = null as {
      id: string;
      email?: string;
      email_confirmed_at?: string | null;
      last_sign_in_at?: string | null;
    } | null;

    if (row.invited_user_id) {
      const { data } = await admin.auth.admin.getUserById(row.invited_user_id);
      authUser = data.user
        ? {
            id: data.user.id,
            email: data.user.email,
            email_confirmed_at: data.user.email_confirmed_at,
            last_sign_in_at: data.user.last_sign_in_at,
          }
        : null;
    } else {
      const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const users = listed.data?.users || [];
      const targetEmail = String(row.email || '').toLowerCase();
      const found = users.find((u) => (u.email || '').toLowerCase() === targetEmail);
      if (found) {
        authUser = {
          id: found.id,
          email: found.email,
          email_confirmed_at: found.email_confirmed_at,
          last_sign_in_at: found.last_sign_in_at,
        };
      }
    }

    if (!authUser) continue;

    const accepted = Boolean(authUser.email_confirmed_at || authUser.last_sign_in_at);
    if (!accepted) {
      if (!row.invited_user_id) {
        await admin
          .from('user_invites')
          .update({ invited_user_id: authUser.id, updated_at: new Date().toISOString() })
          .eq('id', row.id);
      }
      continue;
    }

    await admin
      .from('user_invites')
      .update({
        status: 'accepted' satisfies InviteStatus,
        invited_user_id: authUser.id,
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id);
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<InviteListResponse | InviteCreateResponse>,
) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  const admin = getAdminClient();
  if (!admin) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY no configurada en el servidor.' });
  }

  const auth = await requireSuperAdmin(token, admin);
  if ('error' in auth && auth.error) {
    return res.status(auth.status).json({ error: auth.error });
  }

  if (req.method === 'GET') {
    await syncInviteStatuses(admin);
    const { data, error } = await admin
      .from('user_invites')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ invites: (data || []) as UserInvite[] });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido.' });
  }

  const email = String(req.body?.email || '')
    .trim()
    .toLowerCase();
  const fullName = String(req.body?.full_name || '').trim();
  const roleRaw = String(req.body?.role || 'ejecutivo').trim().toLowerCase();
  const role: UserRole = roleRaw === 'superadmin' ? 'superadmin' : 'ejecutivo';

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Correo inválido.' });
  }

  const { data: existingPending } = await admin
    .from('user_invites')
    .select('id')
    .eq('status', 'pending')
    .ilike('email', email)
    .maybeSingle();

  if (existingPending) {
    return res.status(400).json({ error: 'Ya hay una invitación pendiente para este correo.' });
  }

  const redirectTo = process.env.NEXT_PUBLIC_APP_PUBLIC_ORIGIN
    ? `${process.env.NEXT_PUBLIC_APP_PUBLIC_ORIGIN.replace(/\/$/, '')}/clientes/restablecer-contrasena`
    : undefined;

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: {
      role,
      full_name: fullName || undefined,
    },
    redirectTo,
  });

  if (inviteError) {
    return res.status(400).json({ error: inviteError.message || 'No se pudo enviar la invitación.' });
  }

  if (invited.user?.id) {
    await admin.from('profiles').upsert({
      id: invited.user.id,
      role,
      email,
      full_name: fullName || null,
      updated_at: new Date().toISOString(),
    });
  }

  const { data: inviteRow, error: insertError } = await admin
    .from('user_invites')
    .insert({
      email,
      full_name: fullName || null,
      role,
      status: 'pending',
      invited_by: auth.user!.id,
      invited_user_id: invited.user?.id || null,
    })
    .select()
    .single();

  if (insertError) {
    return res.status(500).json({ error: insertError.message });
  }

  return res.status(200).json({
    ok: true,
    email,
    role,
    invite: inviteRow as UserInvite,
  });
}
