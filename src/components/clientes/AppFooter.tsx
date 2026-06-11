import { Box, Link, Typography } from '@mui/joy';

const YEAR = new Date().getFullYear();

type AppFooterProps = {
  variant?: 'app' | 'auth';
};

export default function AppFooter({ variant = 'app' }: AppFooterProps) {
  const isAuth = variant === 'auth';

  return (
    <Box
      component="footer"
      sx={{
        flexShrink: 0,
        py: isAuth ? 0 : 1.25,
        px: isAuth ? 0 : { xs: 2, md: 3 },
        textAlign: 'center',
        borderTop: isAuth ? 'none' : '1px solid',
        borderColor: 'neutral.200',
        bgcolor: isAuth ? 'transparent' : 'background.surface',
      }}
    >
      <Typography
        level="body-xs"
        sx={{
          color: isAuth ? 'rgba(255,255,255,0.72)' : 'text.tertiary',
          lineHeight: 1.6,
        }}
      >
        {YEAR} — Inspirato CRM © Realizado con ☕ por{' '}
        <Link
          href="https://apiyam.com"
          target="_blank"
          rel="noopener noreferrer"
          underline="hover"
          sx={{ color: isAuth ? 'rgba(255,255,255,0.9)' : 'primary.600', fontWeight: 600 }}
        >
          Apiyam
        </Link>
      </Typography>
    </Box>
  );
}
