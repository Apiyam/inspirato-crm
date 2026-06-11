import { ContactSummary } from 'types/crm';

export function normalizeContactSummary(raw: Partial<ContactSummary> | null | undefined): ContactSummary | null {
  if (!raw) return null;

  return {
    resumen_ejecutivo: raw.resumen_ejecutivo || raw.informacion_usuario || 'Sin información suficiente.',
    linea_negocio: raw.linea_negocio || 'No determinada',
    linea_negocio_confianza: typeof raw.linea_negocio_confianza === 'number' ? raw.linea_negocio_confianza : 0,
    linea_negocio_justificacion: raw.linea_negocio_justificacion || '',
    nombre: raw.nombre || 'No identificado',
    empresa: raw.empresa || 'No mencionada',
    correo: raw.correo || 'No mencionado',
    telefono_adicional: raw.telefono_adicional || 'No mencionado',
    ubicacion: raw.ubicacion || 'No mencionada',
    cargo_rol: raw.cargo_rol || 'No mencionado',
    interes: raw.interes || 'No identificado con claridad',
    necesidad_detectada: raw.necesidad_detectada || 'No determinada',
    presupuesto_mencionado: raw.presupuesto_mencionado || 'No mencionado',
    urgencia: raw.urgencia || 'no_determinada',
    intencion_compra: raw.intencion_compra || 'No determinada',
    datos_adicionales: Array.isArray(raw.datos_adicionales) ? raw.datos_adicionales.filter(Boolean) : [],
    objeciones: Array.isArray(raw.objeciones) ? raw.objeciones.filter(Boolean) : [],
    proximos_pasos_sugeridos: Array.isArray(raw.proximos_pasos_sugeridos)
      ? raw.proximos_pasos_sugeridos.filter(Boolean)
      : [],
    tiempo_chateando: raw.tiempo_chateando || '',
    ultimo_mensaje: raw.ultimo_mensaje || '',
    clasificacion_sugerida: raw.clasificacion_sugerida || 'lead',
    justificacion: raw.justificacion || '',
  };
}

export const isMeaningfulValue = (value: string) => {
  const normalized = (value || '').trim().toLowerCase();
  return (
    normalized.length > 0 &&
    !['no identificado', 'no mencionado', 'no mencionada', 'no determinada', 'no determinado', 'sin información'].includes(
      normalized,
    )
  );
};
