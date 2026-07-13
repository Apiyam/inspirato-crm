import ApiyamCardLayout from 'components/clientes/ApiyamLayout';
import SuperAdminGuard from 'components/clientes/SuperAdminGuard';
import TeamManagement from 'components/clientes/TeamManagement';

export default function EquipoPage() {
  return (
    <ApiyamCardLayout title="Equipo">
      <SuperAdminGuard>
        <TeamManagement />
      </SuperAdminGuard>
    </ApiyamCardLayout>
  );
}
