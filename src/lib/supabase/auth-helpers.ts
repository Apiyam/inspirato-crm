/** URL base para redirects de Supabase Auth (recuperar contraseña, confirmar email). */
export function getAuthRedirectUrl(path: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${path}`;
  }
  const origin = process.env.NEXT_PUBLIC_APP_PUBLIC_ORIGIN || 'http://localhost:3000';
  return `${origin.replace(/\/$/, '')}${path}`;
}

export const AUTH_PATHS = {
  login: '/clientes/login',
  recuperar: '/clientes/recuperar-cuenta',
  resetPassword: '/clientes/restablecer-contrasena',
  cuenta: '/clientes/cuenta',
} as const;
