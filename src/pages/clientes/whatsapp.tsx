import ApiyamCardLayout from 'components/clientes/ApiyamLayout';
import { Box, Tab, TabList, Tabs } from '@mui/joy';
import { useRouter } from 'next/router';
import { SyntheticEvent } from 'react';
import WhatsAppContacts from 'components/clientes/WhatsAppContacts';
import WhatsAppBot from 'components/clientes/WhatsAppBot';

export default function WhatsAppBotPage() {
  const router = useRouter();
  const currentTab = router.query.tab === 'contactos' ? 'contactos' : 'chatbot';

  const handleTabChange = (_event: SyntheticEvent | null, value: string | null) => {
    const selectedTab = value || 'chatbot';
    router.replace(
      { pathname: router.pathname, query: { ...router.query, tab: selectedTab } },
      undefined,
      { shallow: true },
    );
  };

  return (
    <ApiyamCardLayout title="Inbox" fullBleed hideTitle>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
        <Box sx={{ px: 2, pt: 1.5, pb: 1, flexShrink: 0 }}>
          <Tabs value={currentTab} onChange={handleTabChange}>
            <TabList sx={{ borderRadius: '12px', bgcolor: '#FFFFFF', p: 0.5, boxShadow: 'sm', width: 'fit-content' }}>
              <Tab value="chatbot" sx={{ borderRadius: '10px', fontWeight: 600 }}>Conversaciones</Tab>
              <Tab value="contactos" sx={{ borderRadius: '10px', fontWeight: 600 }}>Contactos</Tab>
            </TabList>
          </Tabs>
        </Box>
        <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {currentTab === 'contactos' && <WhatsAppContacts />}
          {currentTab === 'chatbot' && <WhatsAppBot initialStatusFilter="lead" />}
        </Box>
      </Box>
    </ApiyamCardLayout>
  );
}
