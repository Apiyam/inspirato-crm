import { useCallback, useEffect, useState } from 'react';
import { fetchCrmConfig, updateCrmConfig } from 'pages/api/entities';
import { CrmConfig, DEFAULT_CRM_CONFIG } from 'types/crm';

export function useCrmConfig() {
  const [config, setConfig] = useState<CrmConfig>(DEFAULT_CRM_CONFIG);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const data = await fetchCrmConfig();
    setConfig(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const save = async (next: CrmConfig) => {
    const updated = await updateCrmConfig(next);
    if (updated) {
      setConfig(next);
      return true;
    }
    return false;
  };

  const getStatusLabel = (key: string) =>
    config.leadStatuses.find((s) => s.key === key)?.label || key;

  const getStatusColor = (key: string) =>
    config.leadStatuses.find((s) => s.key === key)?.color || '#A39A8C';

  return { config, loading, reload, save, getStatusLabel, getStatusColor };
}
