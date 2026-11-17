export type VisualMedicationStatus = 'Tomado' | 'Pendiente' | 'Aprobado' | 'Revisión';

export function calculateAge(birthDate?: string | null, today = new Date()): number | null {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;

  const [year, month, day] = birthDate.split('-').map(Number);
  const parsedDate = new Date(year, month - 1, day);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.getFullYear() !== year || parsedDate.getMonth() !== month - 1 || parsedDate.getDate() !== day) {
    return null;
  }

  let age = today.getFullYear() - year;
  if (today.getMonth() < month - 1 || (today.getMonth() === month - 1 && today.getDate() < day)) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

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

export function getCurrentMedicationStatus(
  status: string,
  frequencyHours: number,
  lastAdministration?: string | null,
  now = Date.now(),
): string {
  if (status !== 'aprobado' || !lastAdministration || !Number.isFinite(frequencyHours) || frequencyHours <= 0) {
    return status;
  }

  const administeredAt = Date.parse(lastAdministration);
  const doseIntervalMs = frequencyHours * 60 * 60 * 1000;
  return Number.isFinite(administeredAt) && now < administeredAt + doseIntervalMs
    ? 'administrado'
    : status;
}
