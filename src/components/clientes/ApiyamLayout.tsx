import * as React from 'react';
import { CssVarsProvider } from '@mui/joy/styles';
import CssBaseline from '@mui/joy/CssBaseline';
import { crmTheme } from 'utils/theme';
import Box from '@mui/joy/Box';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from 'providers/AuthProvider';
import RedirectionInDashboard from './RedirectionToLogin';
import AppFooter from './AppFooter';
import { Typography } from '@mui/joy';

interface ApiyamCardLayoutProps {
  children: React.ReactNode;
  title: string;
  fullBleed?: boolean;
  hideTitle?: boolean;
}

export default function ApiyamCardLayout({
  children,
  title,
  fullBleed = false,
  hideTitle = false,
}: ApiyamCardLayoutProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <RedirectionInDashboard />;
  }

  if (!user) {
    return <RedirectionInDashboard />;
  }

  return (
    <CssVarsProvider theme={crmTheme} disableTransitionOnChange defaultColorScheme="light">
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100dvh', height: '100dvh', bgcolor: 'background.body', overflow: 'hidden' }}>
        <Sidebar />
        <Header />
        <Box
          component="main"
          className="MainContent"
          sx={{
            pt: { xs: 'var(--Header-height)', md: 0 },
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            height: '100dvh',
            overflow: 'hidden',
          }}
        >
          {!hideTitle && !fullBleed && (
            <Box sx={{ px: { xs: 2, md: 3 }, pt: { md: 2.5 }, pb: 1, flexShrink: 0 }}>
              <Typography level="h2" component="h1" sx={{ color: 'text.primary', fontWeight: 700 }}>
                {title}
              </Typography>
            </Box>
          )}

          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              px: fullBleed ? 0 : { xs: 2, md: 3 },
              pt: fullBleed ? 0 : 0,
              pb: fullBleed ? 0 : { xs: 1, md: 1.5 },
              overflowY: fullBleed ? 'hidden' : 'auto',
              overflowX: 'hidden',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {children}
          </Box>

          <AppFooter />
        </Box>
      </Box>
    </CssVarsProvider>
  );
}
