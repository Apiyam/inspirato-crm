import { LeadStatusConfig } from 'types/crm';

export const getJoyColorFromHex = (hex: string) => {
  const map: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'neutral'> = {
    '#C9A227': 'primary',
    '#B0694D': 'primary',
    '#4CAF7D': 'success',
    '#D4A04A': 'warning',
    '#C45C4A': 'danger',
    '#7B9EC4': 'neutral',
  };
  return map[hex] || 'neutral';
};

export const statusChipSx = (status: LeadStatusConfig | undefined) => ({
  bgcolor: status ? `${status.color}22` : 'neutral.100',
  color: status?.color || '#5C564F',
  fontWeight: 600,
  borderRadius: '999px',
});
