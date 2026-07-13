import * as React from 'react';
import GlobalStyles from '@mui/joy/GlobalStyles';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import Card from '@mui/joy/Card';
import Chip from '@mui/joy/Chip';
import Divider from '@mui/joy/Divider';
import IconButton from '@mui/joy/IconButton';
import Avatar from '@mui/joy/Avatar';
import List from '@mui/joy/List';
import ListItem from '@mui/joy/ListItem';
import ListItemButton, { listItemButtonClasses } from '@mui/joy/ListItemButton';
import ListItemContent from '@mui/joy/ListItemContent';
import Typography from '@mui/joy/Typography';
import Sheet from '@mui/joy/Sheet';
import Stack from '@mui/joy/Stack';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import QuestionAnswerRoundedIcon from '@mui/icons-material/QuestionAnswerRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import ContactsRoundedIcon from '@mui/icons-material/ContactsRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import { useAuth } from 'providers/AuthProvider';
import { useRouter } from 'next/router';
import { closeSidebar } from 'utils/Utils';
import { ClientLead } from 'types/crm';

const baseUrl = '/clientes';

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: boolean;
  superAdminOnly?: boolean;
};

const navItems: NavItem[] = [
  { label: 'Inicio', href: baseUrl, icon: <HomeRoundedIcon /> },
  { label: 'Inbox', href: `${baseUrl}/whatsapp?tab=chatbot`, icon: <QuestionAnswerRoundedIcon />, badge: true },
  { label: 'Contactos', href: `${baseUrl}/whatsapp?tab=contactos`, icon: <ContactsRoundedIcon /> },
  { label: 'Asistente IA Camila', href: `${baseUrl}/bot`, icon: <SettingsRoundedIcon />, superAdminOnly: true },
  { label: 'Configuración CRM', href: `${baseUrl}/configuracion`, icon: <TuneRoundedIcon />, superAdminOnly: true },
  { label: 'Equipo', href: `${baseUrl}/equipo`, icon: <GroupRoundedIcon />, superAdminOnly: true },
  { label: 'Mi cuenta', href: `${baseUrl}/cuenta`, icon: <PersonRoundedIcon /> },
];

export default function Sidebar() {
  const { user, signOut, isSuperAdmin, profile } = useAuth();
  const router = useRouter();
  const [unreadTotal, setUnreadTotal] = React.useState(0);

  React.useEffect(() => {
    const loadUnread = async () => {
      try {
        const { fetchClientLeads } = await import('pages/api/entities');
        const leads = (await fetchClientLeads()) as ClientLead[] | null;
        const count = (leads || []).reduce((sum, l) => sum + (l.unread_count || 0), 0);
        setUnreadTotal(count);
      } catch {
        setUnreadTotal(0);
      }
    };
    void loadUnread();
    const timer = setInterval(() => void loadUnread(), 30_000);
    return () => clearInterval(timer);
  }, []);

  const visibleNav = React.useMemo(
    () => navItems.filter((item) => !item.superAdminOnly || isSuperAdmin),
    [isSuperAdmin],
  );

  const isActive = (href: string) => {
    if (href === baseUrl) return router.pathname === baseUrl;
    if (href.includes('tab=chatbot')) return router.pathname === '/clientes/whatsapp' && router.query.tab !== 'contactos';
    if (href.includes('tab=contactos')) return router.pathname === '/clientes/whatsapp' && router.query.tab === 'contactos';
    if (href === `${baseUrl}/cuenta`) return router.pathname === '/clientes/cuenta';
    if (href === `${baseUrl}/equipo`) return router.pathname === '/clientes/equipo';
    return router.pathname === href;
  };

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Usuario';

  const initials = displayName
    .split(' ')
    .map((p: string) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Sheet
      className="Sidebar"
      sx={{
        position: { xs: 'fixed', md: 'sticky' },
        transform: {
          xs: 'translateX(calc(100% * (var(--SideNavigation-slideIn, 0) - 1)))',
          md: 'none',
        },
        transition: 'transform 0.4s, width 0.4s',
        zIndex: 10000,
        height: '100dvh',
        width: 'var(--Sidebar-width)',
        top: 0,
        p: 2,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        bgcolor: 'neutral.100',
        borderRight: '1px solid',
        borderColor: 'neutral.200',
      }}
    >
      <GlobalStyles
        styles={(theme) => ({
          ':root': {
            '--Sidebar-width': '240px',
            [theme.breakpoints.up('lg')]: {
              '--Sidebar-width': '260px',
            },
          },
        })}
      />
      <Box
        className="Sidebar-overlay"
        sx={{
          position: 'fixed',
          zIndex: 9998,
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          opacity: 'var(--SideNavigation-slideIn)',
          backgroundColor: 'rgba(26, 24, 22, 0.28)',
          transition: 'opacity 0.4s',
          transform: {
            xs: 'translateX(calc(100% * (var(--SideNavigation-slideIn, 0) - 1) + var(--SideNavigation-slideIn, 0) * var(--Sidebar-width, 0px)))',
            lg: 'translateX(-100%)',
          },
        }}
        onClick={() => closeSidebar()}
      />

      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', px: 0.5, pt: 0.5 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <img src="/logo-full.png" alt="Inspirato CRM" height={80} />
        </Box>
      </Box>
      <Divider sx={{ borderColor: 'neutral.200' }} />
      <Typography level="body-xs" sx={{ color: 'text.tertiary', textAlign: 'center' }}>
        CRM y Asistente IA
      </Typography>

      <Box
        sx={{
          minHeight: 0,
          overflow: 'hidden auto',
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          [`& .${listItemButtonClasses.root}`]: {
            gap: 1.5,
            borderRadius: '12px',
            py: 1,
            px: 1.5,
            color: 'text.secondary',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.6)' },
          },
        }}
      >
        <List size="sm" sx={{ gap: 0.5, '--ListItem-radius': '12px' }}>
          {visibleNav.map((item) => {
            const active = isActive(item.href);
            return (
              <ListItem key={item.href}>
                <ListItemButton
                  component="a"
                  href={item.href}
                  selected={active}
                  sx={{
                    ...(active && {
                      bgcolor: '#FFFFFF',
                      color: 'primary.600',
                      boxShadow: 'sm',
                      fontWeight: 600,
                      '&:hover': { bgcolor: '#FFFFFF' },
                    }),
                  }}
                >
                  {item.icon}
                  <ListItemContent>
                    <Typography level="title-sm">{item.label}</Typography>
                  </ListItemContent>
                  {item.badge && unreadTotal > 0 && (
                    <Chip size="sm" color="danger" variant="solid" sx={{ minWidth: 22, borderRadius: '999px' }}>
                      {unreadTotal > 99 ? '99+' : unreadTotal}
                    </Chip>
                  )}
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>

        {isSuperAdmin && (
          <Box sx={{ mt: 'auto', pt: 2 }}>
            <Card
              variant="outlined"
              sx={{ p: 2, borderRadius: '16px', bgcolor: '#FFFFFF', borderColor: 'neutral.200', boxShadow: 'sm' }}
            >
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <AutoAwesomeRoundedIcon sx={{ color: 'primary.500', fontSize: 20 }} />
                <Typography level="title-sm" sx={{ fontWeight: 600 }}>
                  Asistente IA
                </Typography>
              </Stack>
              <Typography level="body-xs" sx={{ color: 'text.tertiary', mb: 1.5 }}>
                Configura respuestas automáticas y reglas del bot.
              </Typography>
              <Button size="sm" variant="solid" color="primary" component="a" href={`${baseUrl}/bot`} sx={{ borderRadius: '10px' }}>
                Configurar bot
              </Button>
            </Card>
          </Box>
        )}
      </Box>

      <Divider sx={{ borderColor: 'neutral.200' }} />

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <Box
          component="a"
          href={`${baseUrl}/cuenta`}
          sx={{
            display: 'flex',
            gap: 1,
            alignItems: 'center',
            flex: 1,
            minWidth: 0,
            textDecoration: 'none',
            color: 'inherit',
            borderRadius: '12px',
            p: 0.5,
            '&:hover': { bgcolor: 'rgba(255,255,255,0.5)' },
          }}
        >
          <Avatar size="sm" sx={{ bgcolor: 'primary.500' }}>
            {initials}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography level="title-sm" noWrap>
              {displayName}
            </Typography>
            <Typography level="body-xs" noWrap sx={{ color: 'text.tertiary' }}>
              {isSuperAdmin ? 'Superadmin' : 'Ejecutivo'}
              {user?.email ? ` · ${user.email}` : ''}
            </Typography>
          </Box>
        </Box>
        <IconButton
          size="sm"
          variant="plain"
          color="neutral"
          onClick={async () => {
            await signOut();
            router.push('/clientes/login');
          }}
          aria-label="Cerrar sesión"
        >
          <LogoutRoundedIcon fontSize="small" />
        </IconButton>
      </Box>
    </Sheet>
  );
}
