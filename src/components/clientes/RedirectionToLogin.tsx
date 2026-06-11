import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from 'providers/AuthProvider';
import { CircularProgress, Box } from '@mui/joy';

const RedirectionInDashboard = () => {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.push('/clientes/whatsapp?tab=chatbot');
    } else {
      router.push('/clientes/login');
    }
  }, [router, user, loading]);

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.body' }}>
      <CircularProgress />
    </Box>
  );
};

export default RedirectionInDashboard;
