import { useEffect, useMemo, useState } from 'react';
import { Box, Card, Chip, Divider, Stack, Typography } from '@mui/joy';
import ApiyamCardLayout from 'components/clientes/ApiyamLayout';
import { fetchClientLeads } from 'pages/api/entities';
import { useCrmConfig } from 'hooks/useCrmConfig';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, CartesianGrid, XAxis, YAxis } from 'recharts';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function DashboardPage() {
  const { config, getStatusLabel } = useCrmConfig();
  const [leads, setLeads] = useState<any[]>([]);

  useEffect(() => {
    const loadLeads = async () => {
      const data = await fetchClientLeads();
      setLeads(data || []);
    };
    loadLeads();
  }, []);

  const botKpis = useMemo(() => {
    const totalLeads = leads.length;
    const leadCount = leads.filter((lead) => lead.status === 'lead').length;
    const contactCount = leads.filter((lead) => lead.status === 'contacto').length;
    const prospectCount = leads.filter((lead) => lead.status === 'prospecto').length;
    const ignoredCount = leads.filter((lead) => lead.status === 'ignorado').length;
    return { totalLeads, leadCount, contactCount, prospectCount, ignoredCount };
  }, [leads]);

  const leadStatusChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const lead of leads) {
      const status = lead.status || 'sin_estatus';
      counts[status] = (counts[status] || 0) + 1;
    }
    return Object.entries(counts).map(([name, value]) => ({
      name: getStatusLabel(name),
      value,
      key: name,
      color: config.leadStatuses.find((s) => s.key === name)?.color || '#A39A8C',
    }));
  }, [leads, config.leadStatuses, getStatusLabel]);

  const monthlyActivityData = useMemo(() => {
    const map: Record<string, { month: string; leads: number }> = {};
    for (let i = 0; i < 6; i += 1) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      map[key] = { month: MONTHS[date.getMonth()], leads: 0 };
    }

    for (const lead of leads) {
      const date = new Date(lead.timestamp);
      if (Number.isNaN(date.getTime())) continue;
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (map[key]) map[key].leads += 1;
    }

    return Object.values(map).reverse();
  }, [leads]);

  const recentConversations = useMemo(() => {
    return [...leads]
      .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
      .slice(0, 6);
  }, [leads]);

  return (
    <ApiyamCardLayout title="Inicio">
      <Stack spacing={2}>
        <Card
          variant="outlined"
          sx={{
            p: 2.5,
            borderRadius: '16px',
            bgcolor: '#FFFFFF',
            borderColor: 'neutral.200',
            boxShadow: 'sm',
          }}
        >
          <Typography level="h3" sx={{ color: 'text.primary' }}>
            Panel de conversaciones
          </Typography>
          <Typography level="body-sm" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Resumen de actividad del bot y estado de tus contactos de WhatsApp.
          </Typography>
        </Card>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
            gap: 1.5,
          }}
        >
          {[
            { label: 'Conversaciones totales', value: botKpis.totalLeads },
            { label: 'Pendientes de atender', value: botKpis.leadCount },
            { label: 'Contactos activos', value: botKpis.contactCount },
            { label: 'Prospectos', value: botKpis.prospectCount },
          ].map((kpi) => (
            <Card
              key={kpi.label}
              variant="outlined"
              sx={{ borderRadius: '16px', bgcolor: '#FFFFFF', borderColor: 'neutral.200', boxShadow: 'sm', p: 2 }}
            >
              <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
                {kpi.label}
              </Typography>
              <Typography level="h2" sx={{ color: 'text.primary', mt: 0.5 }}>
                {kpi.value}
              </Typography>
            </Card>
          ))}
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '1.2fr 1fr' },
            gap: 1.5,
          }}
        >
          <Card variant="outlined" sx={{ minHeight: 320, borderRadius: '16px', bgcolor: '#FFFFFF', borderColor: 'neutral.200', boxShadow: 'sm', p: 2 }}>
            <Typography level="title-md">Actividad mensual</Typography>
            <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
              Nuevas conversaciones en los últimos 6 meses.
            </Typography>
            <Divider sx={{ my: 1.5, borderColor: 'neutral.200' }} />
            <Box sx={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyActivityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EBE5D8" />
                  <XAxis dataKey="month" tick={{ fill: '#736B60', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#736B60', fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="leads" fill="#B0694D" name="Conversaciones" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Card>

          <Card variant="outlined" sx={{ minHeight: 320, borderRadius: '16px', bgcolor: '#FFFFFF', borderColor: 'neutral.200', boxShadow: 'sm', p: 2 }}>
            <Typography level="title-md">Distribución por estatus</Typography>
            <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
              Clasificación de tu base de conversaciones.
            </Typography>
            <Divider sx={{ my: 1.5, borderColor: 'neutral.200' }} />
            <Box sx={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={leadStatusChartData} dataKey="value" nameKey="name" outerRadius={90} labelLine={false}>
                    {leadStatusChartData.map((entry, index) => (
                      <Cell key={`${entry.key}-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Card>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
            gap: 1.5,
          }}
        >
          <Card variant="outlined" sx={{ borderRadius: '16px', bgcolor: '#FFFFFF', borderColor: 'neutral.200', boxShadow: 'sm', p: 2 }}>
            <Typography level="title-md">Estado del bot</Typography>
            <Divider sx={{ my: 1.5, borderColor: 'neutral.200' }} />
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip variant="soft" sx={{ bgcolor: 'primary.50', color: 'primary.700' }}>
                Nuevos: {botKpis.leadCount}
              </Chip>
              <Chip variant="soft" sx={{ bgcolor: 'success.50', color: 'success.700' }}>
                Contactos: {botKpis.contactCount}
              </Chip>
              <Chip variant="soft" sx={{ bgcolor: 'warning.50', color: 'warning.700' }}>
                Prospectos: {botKpis.prospectCount}
              </Chip>
              <Chip variant="soft" sx={{ bgcolor: 'danger.50', color: 'danger.700' }}>
                Ignorados: {botKpis.ignoredCount}
              </Chip>
            </Stack>
          </Card>

          <Card variant="outlined" sx={{ borderRadius: '16px', bgcolor: '#FFFFFF', borderColor: 'neutral.200', boxShadow: 'sm', p: 2 }}>
            <Typography level="title-md">Conversaciones recientes</Typography>
            <Divider sx={{ my: 1.5, borderColor: 'neutral.200' }} />
            <Stack spacing={1}>
              {recentConversations.length === 0 && (
                <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
                  Aún no hay conversaciones registradas.
                </Typography>
              )}
              {recentConversations.map((item) => (
                <Box
                  key={item.id || item.phone}
                  sx={{
                    p: 1.5,
                    borderRadius: '12px',
                    border: '1px solid',
                    borderColor: 'neutral.200',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 1,
                    bgcolor: 'background.body',
                  }}
                >
                  <Typography level="body-sm">{item.name || item.phone || 'Sin nombre'}</Typography>
                  <Chip size="sm" variant="soft" sx={{ bgcolor: 'neutral.100', color: 'text.secondary' }}>
                    {getStatusLabel(item.status) || 'Sin estatus'}
                  </Chip>
                </Box>
              ))}
            </Stack>
          </Card>
        </Box>
      </Stack>
    </ApiyamCardLayout>
  );
}
