export type VisualMedicationStatus = 'Tomado' | 'Pendiente' | 'Aprobado' | 'Revisión';

export function formatTime(value?: string | null): string {
  if (!value) return 'Sin horario';

  const [hourValue, minuteValue] = value.split(':');
  const hour = Number(hourValue ?? 0);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const normalizedHour = hour % 12 || 12;

  return `${normalizedHour}:${minuteValue ?? '00'} ${suffix}`;
}

export function mapStatus(rawStatus?: string | null): VisualMedicationStatus {
  switch (rawStatus) {
    case 'administrado':
      return 'Tomado';
    case 'pendiente':
      return 'Pendiente';
    case 'aprobado':
      return 'Aprobado';
    case 'revision':
      return 'Revisión';
    case 'revisión':
      return 'Revisión';
    default:
      return 'Pendiente';
  }
}
