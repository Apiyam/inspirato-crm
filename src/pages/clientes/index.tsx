import { useEffect, useMemo, useState } from 'react';
import { Box, Card, Chip, Divider, Stack, Typography } from '@mui/joy';
import ApiyamCardLayout from 'components/clientes/ApiyamLayout';
import { fetchClientLeads } from 'pages/api/entities';
import { useCrmConfig } from 'hooks/useCrmConfig';
import { ClientLead } from 'types/crm';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function formatAvg(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export default function DashboardPage() {
  const { config, getStatusLabel } = useCrmConfig();
  const [leads, setLeads] = useState<ClientLead[]>([]);

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
    const botPausedCount = leads.filter((lead) => lead.bot_paused).length;
    const botActiveCount = totalLeads - botPausedCount;
    const totalMessages = leads.reduce((sum, lead) => sum + (lead.message_count || 0), 0);
    const avgMessages = totalLeads > 0 ? totalMessages / totalLeads : 0;
    const totalIncoming = leads.reduce((sum, lead) => sum + (lead.incoming_count || 0), 0);
    const totalOutgoing = leads.reduce((sum, lead) => sum + (lead.outgoing_count || 0), 0);
    return {
      totalLeads,
      leadCount,
      contactCount,
      prospectCount,
      ignoredCount,
      botPausedCount,
      botActiveCount,
      totalMessages,
      avgMessages,
      totalIncoming,
      totalOutgoing,
    };
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
      const date = new Date(lead.timestamp || '');
      if (Number.isNaN(date.getTime())) continue;
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (map[key]) map[key].leads += 1;
    }

    return Object.values(map).reverse();
  }, [leads]);

  const botStateChartData = useMemo(
    () => [
      { name: 'Bot activo', value: botKpis.botActiveCount, fill: '#4CAF7D' },
      { name: 'Bot pausado', value: botKpis.botPausedCount, fill: '#D4A04A' },
    ],
    [botKpis.botActiveCount, botKpis.botPausedCount],
  );

  const botMessageFlowData = useMemo(
    () => [
      { name: 'Recibidos', value: botKpis.totalIncoming, fill: '#7B9EC4' },
      { name: 'Enviados', value: botKpis.totalOutgoing, fill: '#B0694D' },
    ],
    [botKpis.totalIncoming, botKpis.totalOutgoing],
  );

  const topConversationsByMessages = useMemo(() => {
    return [...leads]
      .sort((a, b) => (b.message_count || 0) - (a.message_count || 0))
      .slice(0, 8)
      .map((lead) => ({
        name: (lead.full_name || lead.phone_number || 'Sin nombre').slice(0, 18),
        mensajes: lead.message_count || 0,
      }));
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
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(5, 1fr)' },
            gap: 1.5,
          }}
        >
          {[
            { label: 'Conversaciones totales', value: botKpis.totalLeads },
            { label: 'Pendientes de atender', value: botKpis.leadCount },
            { label: 'Contactos activos', value: botKpis.contactCount },
            { label: 'Prospectos', value: botKpis.prospectCount },
            { label: 'Promedio mensajes / conversación', value: formatAvg(botKpis.avgMessages) },
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
          <Card variant="outlined" sx={{ minHeight: 340, borderRadius: '16px', bgcolor: '#FFFFFF', borderColor: 'neutral.200', boxShadow: 'sm', p: 2 }}>
            <Typography level="title-md">Estado del bot</Typography>
            <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
              Contactos con bot activo vs pausado y flujo de mensajes.
            </Typography>
            <Divider sx={{ my: 1.5, borderColor: 'neutral.200' }} />
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
              <Chip variant="soft" sx={{ bgcolor: 'success.50', color: 'success.700' }}>
                Activos: {botKpis.botActiveCount}
              </Chip>
              <Chip variant="soft" sx={{ bgcolor: 'warning.50', color: 'warning.700' }}>
                Pausados: {botKpis.botPausedCount}
              </Chip>
              <Chip variant="soft" sx={{ bgcolor: 'primary.50', color: 'primary.700' }}>
                Total mensajes: {botKpis.totalMessages}
              </Chip>
            </Stack>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 1.5,
                height: 220,
              }}
            >
              <Box sx={{ height: '100%' }}>
                <Typography level="body-xs" fontWeight={700} sx={{ color: 'text.tertiary', mb: 0.5 }}>
                  Bot activo vs pausado
                </Typography>
                <ResponsiveContainer width="100%" height="90%">
                  <BarChart data={botStateChartData} layout="vertical" margin={{ left: 8, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EBE5D8" />
                    <XAxis type="number" tick={{ fill: '#736B60', fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={88} tick={{ fill: '#736B60', fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" name="Contactos" radius={[0, 6, 6, 0]}>
                      {botStateChartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
              <Box sx={{ height: '100%' }}>
                <Typography level="body-xs" fontWeight={700} sx={{ color: 'text.tertiary', mb: 0.5 }}>
                  Mensajes recibidos vs enviados
                </Typography>
                <ResponsiveContainer width="100%" height="90%">
                  <BarChart data={botMessageFlowData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EBE5D8" />
                    <XAxis dataKey="name" tick={{ fill: '#736B60', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#736B60', fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" name="Mensajes" radius={[6, 6, 0, 0]}>
                      {botMessageFlowData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          </Card>

          <Card variant="outlined" sx={{ borderRadius: '16px', bgcolor: '#FFFFFF', borderColor: 'neutral.200', boxShadow: 'sm', p: 2 }}>
            <Typography level="title-md">Conversaciones recientes</Typography>
            <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
              Últimas interacciones con nombre del contacto y volumen de mensajes.
            </Typography>
            <Divider sx={{ my: 1.5, borderColor: 'neutral.200' }} />
            <Stack spacing={1}>
              {recentConversations.length === 0 && (
                <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
                  Aún no hay conversaciones registradas.
                </Typography>
              )}
              {recentConversations.map((item) => (
                <Box
                  key={item.id || item.phone_number}
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
                  <Box sx={{ minWidth: 0 }}>
                    <Typography level="title-sm" fontWeight={700} noWrap>
                      {item.full_name || item.phone_number || 'Sin nombre'}
                    </Typography>
                    {item.full_name && (
                      <Typography level="body-xs" sx={{ color: 'text.tertiary' }} noWrap>
                        {item.phone_number}
                      </Typography>
                    )}
                  </Box>
                  <Stack direction="row" spacing={0.5} flexShrink={0}>
                    <Chip size="sm" variant="soft" sx={{ bgcolor: 'neutral.100', color: 'text.secondary' }}>
                      {getStatusLabel(item.status) || 'Sin estatus'}
                    </Chip>
                    <Chip size="sm" variant="soft" color="primary">
                      {item.message_count ?? 0} msgs
                    </Chip>
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Card>
        </Box>

        <Card variant="outlined" sx={{ minHeight: 300, borderRadius: '16px', bgcolor: '#FFFFFF', borderColor: 'neutral.200', boxShadow: 'sm', p: 2 }}>
          <Typography level="title-md">Top conversaciones por volumen</Typography>
          <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
            Contactos con más mensajes intercambiados.
          </Typography>
          <Divider sx={{ my: 1.5, borderColor: 'neutral.200' }} />
          <Box sx={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topConversationsByMessages} margin={{ bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EBE5D8" />
                <XAxis dataKey="name" tick={{ fill: '#736B60', fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={56} />
                <YAxis tick={{ fill: '#736B60', fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="mensajes" fill="#B0694D" name="Mensajes" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Card>
      </Stack>
    </ApiyamCardLayout>
  );
}
