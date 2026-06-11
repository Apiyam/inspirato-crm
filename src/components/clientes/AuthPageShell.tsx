import Box from '@mui/joy/Box';
import CssBaseline from '@mui/joy/CssBaseline';
import GlobalStyles from '@mui/joy/GlobalStyles';

const LOGIN_BG = '/images/login-bg.jpg';

type AuthPageShellProps = {
  children: React.ReactNode;
  maxWidth?: number;
};

export default function AuthPageShell({ children, maxWidth = 440 }: AuthPageShellProps) {
  return (
    <Box sx={{ position: 'relative', minHeight: '100dvh', overflow: 'hidden' }}>
      <CssBaseline />
      <GlobalStyles styles={{ ':root': { '--Form-maxWidth': '800px' } }} />

      <Box aria-hidden sx={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden' }}>
        <Box
          sx={{
            position: 'absolute',
            inset: -24,
            backgroundImage: `url(${LOGIN_BG})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(14px)',
            transform: 'scale(1.08)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(135deg,
              rgba(26, 24, 22, 0.72) 0%,
              rgba(77, 61, 13, 0.45) 35%,
              rgba(176, 105, 77, 0.38) 70%,
              rgba(26, 24, 22, 0.65) 100%)`,
          }}
        />
      </Box>

      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: { xs: 2, sm: 3 },
          py: { xs: 4, sm: 6 },
        }}
      >
        <Box sx={{ width: '100%', maxWidth }}>{children}</Box>
      </Box>
    </Box>
  );
}

export function authCardSx() {
  return {
    p: { xs: 3, sm: 4 },
    borderRadius: '24px',
    bgcolor: 'rgba(255, 255, 255, 0.88)',
    backdropFilter: 'blur(20px) saturate(1.4)',
    WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
    border: '1px solid rgba(255, 255, 255, 0.55)',
    boxShadow: '0 24px 64px rgba(26, 24, 22, 0.28), 0 0 0 1px rgba(255,255,255,0.1) inset',
  } as const;
}
