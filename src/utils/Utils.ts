export function convertToFriendlyUrl(url: string): string {
    return url
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Elimina acentos
        .replace(/[^a-z0-9\s-]/g, '') // Elimina caracteres especiales
        .replace(/\s+/g, '-') // Reemplaza espacios con guiones
        .replace(/-+/g, '-') // Evita guiones múltiples
        .trim(); // Elimina espacios al inicio y final
}

export function convertToFormatMoney(value: number): string {
    if (value == null || Number(value) <= 0) return "Gratis";
    return value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

export function formatDate(date: string, time: boolean = false, short: boolean = false): string {
    if(time){
        return new Date(date).toLocaleDateString('es-MX', { year: 'numeric', month: short ? 'short' : 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    else{
        return new Date(date).toLocaleDateString('es-MX', { year: 'numeric', month: short ? 'short' : 'long', day: 'numeric' });
    }
}

export function openSidebar() {
    if (typeof window !== 'undefined') {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.setProperty('--SideNavigation-slideIn', '1');
    }
  }
  
  export function closeSidebar() {
    if (typeof window !== 'undefined') {
      document.documentElement.style.removeProperty('--SideNavigation-slideIn');
      document.body.style.removeProperty('overflow');
    }
  }
  
  export function toggleSidebar() {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const slideIn = window
        .getComputedStyle(document.documentElement)
        .getPropertyValue('--SideNavigation-slideIn');
      if (slideIn) {
        closeSidebar();
      } else {
        openSidebar();
      }
    }
  }