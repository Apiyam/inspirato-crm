import ApiyamCardLayout from 'components/clientes/ApiyamLayout';
import ConfigurationBot from 'components/clientes/ConfigurationBot';
import SuperAdminGuard from 'components/clientes/SuperAdminGuard';

export default function WhatsAppBotPage() {
  return (
    <ApiyamCardLayout title="Configuración de tu Asistente Bot Camila">
      <SuperAdminGuard>
        <ConfigurationBot />
      </SuperAdminGuard>
    </ApiyamCardLayout>
  );
}
