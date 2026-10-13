import AsyncStorage from '@react-native-async-storage/async-storage';

import { formatTime, mapStatus, type VisualMedicationStatus } from '@/lib/linkcare-utils';
import { dispatchRelevantNotification } from '@/lib/push-notifications';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const PROFILE_NOTIFICATION_KEY = 'linkcare.profile.notifications';

function parseAnnotationContent(content: string): { category: string; detail: string } {
  const trimmed = (content ?? '').trim();
  const match = trimmed.match(/^\[(.+?)\]\s*(.*)$/);

  if (match) {
    return {
      category: match[1].trim() || 'Observación',
      detail: match[2].trim() || 'Sin detalle',
    };
  }

  return {
    category: 'Observación',
    detail: trimmed || 'Sin detalle',
  };
}

export type RoleKey = 'cuidador' | 'familiar' | 'medico';

export type MedicationRow = {
  name: string;
  time: string;
  status: VisualMedicationStatus;
};

export type ScreenData = {
  patientName: string;
  patientMeta: string;
  summary: string;
  medications: MedicationRow[];
  alerts: string[];
  history: string[];
  totalPatients?: number;
};

type UserProfile = {
  id: string;
  rol?: string | null;
  nombre?: string | null;
  paciente_id?: string | null;
  relacion?: string | null;
};

type PatientRow = {
  id: string;
  nombre: string;
  fecha_nacimiento?: string | null;
  diagnostico_principal?: string | null;
  codigo_qr_token?: string | null;
  alergias?: string | null;
  contacto_emergencia?: string | null;
};

const fallbackData: Record<RoleKey, ScreenData> = {
  cuidador: {
    patientName: 'Elena Ribeiro',
    patientMeta: '79 años · Plan Crónico',
    summary: '4 medicamentos del día',
    medications: [
      { name: 'Metformina 850mg', time: '08:00 AM', status: 'Tomado' },
      { name: 'Enalapril 10mg', time: '09:00 PM', status: 'Pendiente' },
    ],
    alerts: [
      'Horario de medicamentos en 30 minutos',
      'Revisión de presión requerida esta tarde',
    ],
    history: [
      'Se registró observación de mareo post-almuerzo.',
      'Presión reportada: 135/85.',
    ],
  },
  familiar: {
    patientName: 'Elena Ribeiro',
    patientMeta: 'Responsable: Familia Silva',
    summary: '2 de 4 medicinas registradas',
    medications: [
      { name: 'Metformina 850mg', time: '08:00 AM', status: 'Tomado' },
      { name: 'Aspirina 100mg', time: '12:00 PM', status: 'Pendiente' },
    ],
    alerts: ['Se requiere confirmación adicional de la dosis.'],
    history: [
      'Presión 135/85 reportada.',
      'Se registró observación de mareo post-almuerzo.',
    ],
  },
  medico: {
    patientName: 'Elena Ribeiro',
    patientMeta: 'Paciente atendido por el médico de turno',
    summary: '8 pacientes activos',
    medications: [
      { name: 'Metformina 850mg', time: '08:00 AM', status: 'Aprobado' },
      { name: 'Enalapril 10mg', time: '09:00 PM', status: 'Revisión' },
    ],
    alerts: ['Hay 2 medicamentos pendientes de aprobación.'],
    history: [
      'Control clínico actualizado.',
      'Se revisó evolución del paciente.',
    ],
    totalPatients: 8,
  },
};

async function getCurrentUserProfile(): Promise<UserProfile | null> {
  if (!supabase || !isSupabaseConfigured) return null;

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session?.user?.id) return null;

    const userId = sessionData.session.user.id;
    const { data: profile, error: profileError } = await supabase
      .from('usuarios')
      .select('id, rol, nombre')
      .eq('id', userId)
      .maybeSingle();

    if (profileError || !profile) return null;

    const { data: patientRelations, error: relationError } = await supabase
      .from('paciente_usuario')
      .select('paciente_id, relacion, es_principal, created_at')
      .eq('usuario_id', userId)
      .order('es_principal', { ascending: false })
      .order('created_at', { ascending: true });

    if (relationError && relationError.code !== 'PGRST116') {
      return profile as UserProfile;
    }

    return {
      ...(profile as UserProfile),
      paciente_id: patientRelations?.[0]?.paciente_id ?? null,
      relacion: patientRelations?.[0]?.relacion ?? null,
    };
  } catch {
    return null;
  }
}

async function getPatientForRole(role: RoleKey, profile: UserProfile | null): Promise<PatientRow | null> {
  if (!supabase || !isSupabaseConfigured || !profile?.id) return null;

  try {
    if (profile.paciente_id) {
      const { data: patientData, error: patientError } = await supabase
        .from('pacientes')
        .select('id, nombre, fecha_nacimiento, diagnostico_principal, codigo_qr_token, alergias, contacto_emergencia')
        .eq('id', profile.paciente_id)
        .maybeSingle();

      if (!patientError && patientData) {
        return patientData as PatientRow;
      }
    }

    const { data: patientLinks, error: linkError } = await supabase
      .from('paciente_usuario')
      .select('paciente_id, relacion, es_principal, created_at')
      .eq('usuario_id', profile.id)
      .order('es_principal', { ascending: false })
      .order('created_at', { ascending: true });

    if (linkError && linkError.code !== 'PGRST116') {
      return null;
    }

    const patientLink = patientLinks?.find((link) => link.relacion === role) ?? patientLinks?.[0];
    if (!patientLink?.paciente_id) {
      return null;
    }

    const { data: patientData, error: patientError } = await supabase
      .from('pacientes')
      .select('id, nombre, fecha_nacimiento, diagnostico_principal, codigo_qr_token, alergias, contacto_emergencia')
      .eq('id', patientLink.paciente_id)
      .maybeSingle();

    if (!patientError && patientData) {
      return patientData as PatientRow;
    }

    return null;
  } catch {
    return null;
  }
}

export async function getCurrentUserRole(): Promise<RoleKey | null> {
  const profile = await getCurrentUserProfile();
  return profile?.rol === 'cuidador' || profile?.rol === 'familiar' || profile?.rol === 'medico'
    ? profile.rol
    : null;
}

export type DashboardOverviewData = {
  patientName: string;
  patientMeta: string;
  summary: string;
  medications: MedicationRow[];
  alerts: string[];
  annotations: Array<{ title: string; detail: string; author: string }>;
};

export type ProfileSettingsData = {
  name: string;
  email: string;
  phone: string;
  role: string;
  canSelectLinkedPatient: boolean;
  linkedPatients: string[];
  linkedPatientRecords: Array<{ id: string; name: string; isPrimary: boolean }>;
  notifications: {
    medicines: boolean;
    alerts: boolean;
  };
  pin: string;
};

export type MedicationHistoryItem = {
  id: string;
  name: string;
  date: string;
  time: string;
  recorder: string;
  status: 'Administrada' | 'No administrada';
};

export type SaveAnnotationResult = {
  success: boolean;
  error?: string;
};

export type PatientSummaryData = {
  name: string;
  age: string;
  location: string;
  diagnosis: string;
  allergies: string;
  medicines: string;
  emergencyContact: string;
  qrCode: string;
};

export type MedicalPatientEvent = {
  id: string;
  title: string;
  detail: string;
  occurredAt: string;
  recordedBy: string;
};

export type HealthVariable = {
  id: string;
  type: string;
  value: string;
  unit: string | null;
  recordedAt: string;
  recordedBy: string;
};

export type MedicalPatientHistoryData = {
  id: string;
  name: string;
  age: string;
  allergies: string;
  emergencyContact: string;
  medications: Array<{
    id: string;
    name: string;
    dose: string;
    frequencyHours: number;
    startTime: string;
    startDate: string;
    endDate: string | null;
    status: string;
  }>;
  events: MedicalPatientEvent[];
};

export async function getMedicalPatientHistory(patientId: string): Promise<{ success: boolean; data?: MedicalPatientHistoryData; error?: string }> {
  if (!supabase || !isSupabaseConfigured) {
    return { success: false, error: 'Supabase no está configurado.' };
  }

  if (!patientId) {
    return { success: false, error: 'Falta identificar al paciente.' };
  }

  try {
    const profile = await getCurrentUserProfile();
    if (!profile?.id) {
      return { success: false, error: 'Inicia sesión para consultar el historial.' };
    }

    const { data: patientLink, error: linkError } = await supabase
      .from('paciente_usuario')
      .select('paciente_id')
      .eq('paciente_id', patientId)
      .eq('usuario_id', profile.id)
      .maybeSingle();

    if (linkError || !patientLink) {
      return { success: false, error: 'No tienes acceso a este paciente.' };
    }

    const { data: patient, error: patientError } = await supabase
      .from('pacientes')
      .select('id, nombre, fecha_nacimiento, alergias, contacto_emergencia')
      .eq('id', patientId)
      .maybeSingle();

    if (patientError || !patient) {
      return { success: false, error: patientError?.message ?? 'No se encontró el paciente.' };
    }

    const { data: medicationRows, error: medicationError } = await supabase
      .from('medicamentos')
      .select('id, nombre, dosis, frecuencia_horas, hora_inicio, fecha_inicio, fecha_fin, estado')
      .eq('paciente_id', patientId)
      .order('hora_inicio', { ascending: true });

    if (medicationError) {
      return { success: false, error: medicationError.message };
    }

    const medicationIds = (medicationRows ?? []).map((item) => item.id);
    const [administrationResult, annotationResult, healthResult] = medicationIds.length
      ? await Promise.all([
          supabase
            .from('registro_medicacion')
            .select('id, medicamento_id, fecha_hora, estado, observaciones, registrado_por')
            .in('medicamento_id', medicationIds)
            .order('fecha_hora', { ascending: false }),
          supabase
            .from('anotaciones')
            .select('id, contenido, fecha_hora, registrado_por')
            .eq('paciente_id', patientId)
            .order('fecha_hora', { ascending: false }),
          supabase
            .from('variables_salud')
            .select('id, tipo_variable, valor, unidad_medida, fecha_hora, registrado_por')
            .eq('paciente_id', patientId)
            .order('fecha_hora', { ascending: false }),
        ])
      : await Promise.all([
          Promise.resolve({ data: [], error: null }),
          supabase
            .from('anotaciones')
            .select('id, contenido, fecha_hora, registrado_por')
            .eq('paciente_id', patientId)
            .order('fecha_hora', { ascending: false }),
          supabase
            .from('variables_salud')
            .select('id, tipo_variable, valor, unidad_medida, fecha_hora, registrado_por')
            .eq('paciente_id', patientId)
            .order('fecha_hora', { ascending: false }),
        ]);

    if (administrationResult.error || annotationResult.error || healthResult.error) {
      return { success: false, error: administrationResult.error?.message ?? annotationResult.error?.message ?? healthResult.error?.message };
    }

    const medicationById = new Map((medicationRows ?? []).map((item) => [item.id, item]));
    const administrationEvents: MedicalPatientEvent[] = (administrationResult.data ?? []).map((record) => {
      const medication = medicationById.get(record.medicamento_id);
      return {
        id: `med-${record.id}`,
        title: `${medication?.nombre ?? 'Medicamento'} ${record.estado === 'administrado' ? 'administrado' : record.estado === 'observado' ? 'no administrado' : 'actualizado'}`,
        detail: [medication?.dosis, record.observaciones].filter(Boolean).join(' · ') || 'Sin observaciones',
        occurredAt: record.fecha_hora,
        recordedBy: record.registrado_por ? `Usuario ${record.registrado_por.slice(0, 8)}` : 'Usuario registrado',
      };
    });

    const annotationEvents: MedicalPatientEvent[] = (annotationResult.data ?? []).map((annotation) => {
      const parsed = parseAnnotationContent(annotation.contenido ?? '');
      return {
        id: `note-${annotation.id}`,
        title: parsed.category,
        detail: parsed.detail,
        occurredAt: annotation.fecha_hora,
        recordedBy: annotation.registrado_por ? `Usuario ${annotation.registrado_por.slice(0, 8)}` : 'Usuario registrado',
      };
    });

    const healthEvents: MedicalPatientEvent[] = (healthResult.data ?? []).map((variable) => ({
      id: `health-${variable.id}`,
      title: `Medición: ${variable.tipo_variable}`,
      detail: [variable.valor, variable.unidad_medida].filter(Boolean).join(' '),
      occurredAt: variable.fecha_hora,
      recordedBy: variable.registrado_por ? `Usuario ${variable.registrado_por.slice(0, 8)}` : 'Usuario registrado',
    }));

    const age = patient.fecha_nacimiento
      ? `${new Date().getFullYear() - new Date(patient.fecha_nacimiento).getFullYear()} años`
      : 'No informada';

    return {
      success: true,
      data: {
        id: patient.id,
        name: patient.nombre,
        age,
        allergies: patient.alergias ?? 'Sin alergias registradas',
        emergencyContact: patient.contacto_emergencia ?? 'Sin contacto registrado',
        medications: (medicationRows ?? []).map((medication) => ({
          id: medication.id,
          name: medication.nombre,
          dose: medication.dosis,
          frequencyHours: medication.frecuencia_horas,
          startTime: medication.hora_inicio,
          startDate: medication.fecha_inicio,
          endDate: medication.fecha_fin,
          status: medication.estado,
        })),
        events: [...administrationEvents, ...annotationEvents, ...healthEvents]
          .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt)),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudo cargar el historial clínico.',
    };
  }
}

export async function getPatientHealthVariables(patientId?: string): Promise<{ success: boolean; patientId?: string; patientName?: string; variables: HealthVariable[]; error?: string }> {
  if (!supabase || !isSupabaseConfigured) {
    return { success: false, variables: [], error: 'Supabase no está configurado.' };
  }

  try {
    const profile = await getCurrentUserProfile();
    if (!profile?.id) return { success: false, variables: [], error: 'Inicia sesión para consultar mediciones.' };

    let selectedPatientId = patientId || profile.paciente_id || '';
    if (selectedPatientId) {
      const { data: link, error: linkError } = await supabase
        .from('paciente_usuario')
        .select('paciente_id')
        .eq('paciente_id', selectedPatientId)
        .eq('usuario_id', profile.id)
        .maybeSingle();
      if (linkError || !link) return { success: false, variables: [], error: 'No tienes acceso a este paciente.' };
    } else {
      const role = profile.rol as RoleKey;
      const patient = await getPatientForRole(role, profile);
      selectedPatientId = patient?.id ?? '';
    }

    if (!selectedPatientId) return { success: true, variables: [] };

    const [{ data: patient, error: patientError }, { data: rows, error }] = await Promise.all([
      supabase.from('pacientes').select('nombre').eq('id', selectedPatientId).maybeSingle(),
      supabase
        .from('variables_salud')
        .select('id, tipo_variable, valor, unidad_medida, fecha_hora, registrado_por')
        .eq('paciente_id', selectedPatientId)
        .order('fecha_hora', { ascending: false })
        .limit(100),
    ]);

    if (patientError || error) return { success: false, variables: [], error: patientError?.message ?? error?.message };

    return {
      success: true,
      patientId: selectedPatientId,
      patientName: patient?.nombre ?? 'Paciente',
      variables: (rows ?? []).map((row) => ({
        id: row.id,
        type: row.tipo_variable,
        value: row.valor,
        unit: row.unidad_medida,
        recordedAt: row.fecha_hora,
        recordedBy: row.registrado_por,
      })),
    };
  } catch (error) {
    return { success: false, variables: [], error: error instanceof Error ? error.message : 'No se pudieron cargar las mediciones.' };
  }
}

export async function saveHealthVariable(input: { patientId: string; type: string; value: string; unit?: string }): Promise<{ success: boolean; error?: string }> {
  if (!supabase || !isSupabaseConfigured) return { success: false, error: 'Supabase no está configurado.' };
  if (!input.patientId || !input.type.trim() || !input.value.trim()) {
    return { success: false, error: 'Completa el tipo y el valor de la medición.' };
  }

  try {
    const { data: variableId, error } = await supabase.rpc('save_health_variable', {
      p_paciente_id: input.patientId,
      p_tipo_variable: input.type.trim(),
      p_valor: input.value.trim(),
      p_unidad_medida: input.unit?.trim() || null,
    });
    if (error) return { success: false, error: error.message };
    if (variableId) {
      await dispatchRelevantNotification({
        eventId: variableId,
        eventType: 'health_variable',
        patientId: input.patientId,
      });
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'No se pudo guardar la medición.' };
  }
}

export async function getPatientSummaryData(patientId?: string): Promise<PatientSummaryData> {
  const empty: PatientSummaryData = {
    name: 'Sin paciente asociado',
    age: 'Sin datos',
    location: 'Sin ubicación',
    diagnosis: 'Sin diagnóstico asignado',
    allergies: 'Sin alergias registradas',
    medicines: 'Sin medicamentos registrados',
    emergencyContact: 'Sin contacto de emergencia',
    qrCode: '',
  };

  if (!supabase || !isSupabaseConfigured) {
    return empty;
  }

  try {
    const profile = await getCurrentUserProfile();
    let patient = patientId
      ? (await supabase
          .from('pacientes')
          .select('id, nombre, fecha_nacimiento, diagnostico_principal, codigo_qr_token, alergias, contacto_emergencia')
          .eq('id', patientId)
          .maybeSingle()).data as PatientRow | null
      : null;

    patient ??= await getPatientForRole('cuidador', profile)
      ?? await getPatientForRole('familiar', profile)
      ?? await getPatientForRole('medico', profile);

    if (!patient) {
      return empty;
    }

    const { data: medicationRows } = await supabase
      .from('medicamentos')
      .select('nombre')
      .eq('paciente_id', patient.id)
      .limit(3);

    const age = patient.fecha_nacimiento
      ? `${new Date().getFullYear() - new Date(patient.fecha_nacimiento).getFullYear()} años`
      : 'Edad no disponible';

    return {
      name: patient.nombre,
      age,
      location: 'Hospital Central',
      diagnosis: patient.diagnostico_principal?.trim() || 'Sin diagnóstico asignado',
      allergies: patient.alergias ?? 'Sin alergias registradas',
      medicines: (medicationRows ?? []).map((item) => item.nombre).join(', ') || 'Sin medicamentos registrados',
      emergencyContact: patient.contacto_emergencia ?? '+56 9 8765 4321',
      qrCode: patient.codigo_qr_token ?? '',
    };
  } catch {
    return empty;
  }
}

export async function getDashboardOverviewData(): Promise<DashboardOverviewData> {
  const empty: DashboardOverviewData = {
    patientName: 'Sin paciente asociado',
    patientMeta: 'Asocia un paciente desde tu perfil',
    summary: 'No hay pacientes vinculados',
    medications: [],
    alerts: ['Vincula un paciente para ver la agenda y las alertas.'],
    annotations: [],
  };

  if (!supabase || !isSupabaseConfigured) {
    return empty;
  }

  try {
    const profile = await getCurrentUserProfile();
    const role = profile?.rol === 'familiar' || profile?.rol === 'medico' ? profile.rol : 'cuidador';
    const patient = await getPatientForRole(role, profile);

    if (!patient) {
      return empty;
    }

    const { data: medicamentoData } = await supabase
      .from('medicamentos')
      .select('nombre, hora_inicio, estado')
      .eq('paciente_id', patient.id)
      .order('hora_inicio', { ascending: true })
      .limit(4);

    const medications = (medicamentoData ?? []).map((item) => ({
      name: item.nombre,
      time: formatTime(item.hora_inicio),
      status: mapStatus(item.estado),
    }));

    const patientAge = patient.fecha_nacimiento
      ? new Date().getFullYear() - new Date(patient.fecha_nacimiento).getFullYear()
      : 0;

    const { data: annotationData } = await supabase
      .from('anotaciones')
      .select('contenido, fecha_hora, registrado_por')
      .eq('paciente_id', patient.id)
      .order('fecha_hora', { ascending: false })
      .limit(2);

    const annotations = (annotationData ?? []).map((item) => {
      const parsed = parseAnnotationContent(item.contenido ?? '');
      return {
        title: parsed.category,
        detail: parsed.detail,
        author: item.registrado_por ? 'Equipo LinkCare' : 'Equipo LinkCare',
      };
    });

    return {
      patientName: patient.nombre,
      patientMeta: patientAge ? `${patientAge} años · Plan Crónico` : 'Paciente activo',
      summary: `${medications.length || 0} medicamentos del día`,
      medications: medications.length ? medications : [],
      alerts: medications.some((item) => item.status === 'Pendiente')
        ? ['Hay medicamentos pendientes de registro.']
        : ['Sin alertas nuevas.'],
      annotations: annotations.length ? annotations : [],
    };
  } catch {
    return empty;
  }
}

async function readStoredNotificationSettings(): Promise<{ medicines: boolean; alerts: boolean }> {
  if (supabase && isSupabaseConfigured) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (userId) {
        const { data: preferences } = await supabase
          .from('notification_preferences')
          .select('medicines, alerts')
          .eq('user_id', userId)
          .maybeSingle();
        if (preferences) return preferences;
      }
    } catch {}
  }

  try {
    const raw = await AsyncStorage.getItem(PROFILE_NOTIFICATION_KEY);
    if (!raw) {
      return { medicines: true, alerts: true };
    }

    const parsed = JSON.parse(raw) as Partial<{ medicines: boolean; alerts: boolean }>;
    return {
      medicines: parsed.medicines ?? true,
      alerts: parsed.alerts ?? true,
    };
  } catch {
    return { medicines: true, alerts: true };
  }
}

export async function saveNotificationSettings(input: { medicines: boolean; alerts: boolean }): Promise<{ success: boolean; error?: string }> {
  try {
    const preferences = {
      medicines: Boolean(input.medicines),
      alerts: Boolean(input.alerts),
    };
    if (supabase && isSupabaseConfigured) {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (sessionError || !userId) return { success: false, error: 'Inicia sesión para guardar las preferencias.' };

      const { error } = await supabase.from('notification_preferences').upsert({
        user_id: userId,
        ...preferences,
        updated_at: new Date().toISOString(),
      });
      if (error) return { success: false, error: error.message };
    }

    await AsyncStorage.setItem(PROFILE_NOTIFICATION_KEY, JSON.stringify(preferences));
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudieron guardar las notificaciones.',
    };
  }
}

export async function getLinkedPatientByCode(patientCode: string): Promise<{ success: boolean; error?: string; patientId?: string; patientName?: string }> {
  if (!supabase || !isSupabaseConfigured) {
    return { success: false, error: 'Supabase no está configurado.' };
  }

  if (!patientCode.trim()) return { success: false, error: 'Ingresa un código QR válido.' };

  try {
    const { data: patient, error } = await supabase
      .from('pacientes')
      .select('id, nombre')
      .eq('codigo_qr_token', patientCode.trim())
      .maybeSingle();

    if (error || !patient) {
      return { success: false, error: 'El código no es válido o el paciente no está asociado a tu cuenta.' };
    }

    return { success: true, patientId: patient.id, patientName: patient.nombre };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudo validar el código QR.',
    };
  }
}

export async function linkPatientToCurrentUser(input: { patientCode: string }): Promise<{ success: boolean; error?: string; patientId?: string; patientName?: string }> {
  if (!supabase || !isSupabaseConfigured) {
    return { success: false, error: 'Supabase no está configurado.' };
  }

  const normalizedCode = input.patientCode.trim();
  if (!normalizedCode) {
    return { success: false, error: 'Ingresa un código QR o identificador del paciente.' };
  }

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session?.user?.id) {
      return { success: false, error: 'No hay sesión activa.' };
    }

    const { data: patientId, error: linkError } = await supabase.rpc('link_patient_to_current_user', {
      p_patient_code: normalizedCode,
    });

    if (linkError || !patientId) {
      return { success: false, error: linkError?.message ?? 'No se encontró un paciente con ese código QR.' };
    }

    const { data: patient, error: patientError } = await supabase
      .from('pacientes')
      .select('nombre')
      .eq('id', patientId)
      .maybeSingle();

    if (patientError || !patient) {
      return { success: false, error: patientError?.message ?? 'El vínculo se creó, pero no se pudo cargar el paciente.' };
    }

    return { success: true, patientId, patientName: patient.nombre };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudo vincular el paciente.',
    };
  }
}

export async function removePatientFromCurrentUser(patientId: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase || !isSupabaseConfigured) {
    return { success: false, error: 'Supabase no está configurado.' };
  }

  if (!patientId) {
    return { success: false, error: 'No se pudo identificar al paciente.' };
  }

  try {
    const { error } = await supabase.rpc('remove_patient_link_for_current_user', {
      p_patient_id: patientId,
    });
    return error ? { success: false, error: error.message } : { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudo quitar el paciente de tu cuenta.',
    };
  }
}

export async function selectPatientForCurrentUser(patientId: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase || !isSupabaseConfigured) {
    return { success: false, error: 'Supabase no está configurado.' };
  }

  if (!patientId) {
    return { success: false, error: 'No se pudo identificar al paciente.' };
  }

  try {
    const { error } = await supabase.rpc('select_patient_for_current_user', {
      p_patient_id: patientId,
    });
    return error ? { success: false, error: error.message } : { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudo seleccionar el paciente.',
    };
  }
}

export async function getProfileSettingsData(): Promise<ProfileSettingsData> {
  const fallback: ProfileSettingsData = {
    name: 'Usuario',
    email: 'sin-correo@linkcare.cl',
    phone: 'Sin teléfono',
    role: 'Sin rol asignado',
    canSelectLinkedPatient: false,
    linkedPatients: [],
    linkedPatientRecords: [],
    notifications: {
      medicines: true,
      alerts: true,
    },
    pin: '4821',
  };

  const savedNotifications = await readStoredNotificationSettings();
  const resolvedFallback = {
    ...fallback,
    notifications: savedNotifications,
  };

  if (!supabase || !isSupabaseConfigured) {
    return resolvedFallback;
  }

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session?.user?.id) {
      return resolvedFallback;
    }

    const userId = sessionData.session.user.id;
    const { data: currentUser, error: userError } = await supabase
      .from('usuarios')
      .select('nombre, rol, email, telefono')
      .eq('id', userId)
      .maybeSingle();

    if (userError || !currentUser) {
      return resolvedFallback;
    }

    const { data: links, error: linksError } = await supabase
      .from('paciente_usuario')
      .select('paciente_id, relacion, es_principal, created_at')
      .eq('usuario_id', userId)
      .eq('relacion', currentUser.rol)
      .order('es_principal', { ascending: false })
      .order('created_at', { ascending: true })
      .order('paciente_id', { ascending: true });

    const linkedPatients: string[] = [];
    const linkedPatientRecords: { id: string; name: string; isPrimary: boolean }[] = [];
    let hasPrimaryPatient = false;

    if (!linksError && links?.length) {
      for (const link of links) {
        const { data: patient } = await supabase
          .from('pacientes')
          .select('nombre')
          .eq('id', link.paciente_id)
          .maybeSingle();

        if (patient?.nombre) {
          linkedPatients.push(patient.nombre);
          const isPrimary = link.es_principal === true && !hasPrimaryPatient;
          if (isPrimary) {
            hasPrimaryPatient = true;
          }
          linkedPatientRecords.push({
            id: link.paciente_id,
            name: patient.nombre,
            isPrimary,
          });
        }
      }
    }

    const roleLabel = currentUser.rol === 'cuidador'
      ? 'Cuidador responsable'
      : currentUser.rol === 'medico'
        ? 'Equipo médico'
        : 'Familiar responsable';

    return {
      name: currentUser.nombre ?? fallback.name,
      email: currentUser.email ?? fallback.email,
      phone: currentUser.telefono ?? fallback.phone,
      role: roleLabel,
      canSelectLinkedPatient: currentUser.rol === 'cuidador' || currentUser.rol === 'familiar',
      linkedPatients,
      linkedPatientRecords,
      notifications: savedNotifications,
      pin: '4821',
    };
  } catch {
    return resolvedFallback;
  }
}

export async function saveProfileSettings(input: { name: string; email: string; phone: string }): Promise<{ success: boolean; error?: string }> {
  if (!supabase || !isSupabaseConfigured) {
    return { success: false, error: 'Supabase no está configurado.' };
  }

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session?.user?.id) {
      return { success: false, error: 'No hay sesión activa.' };
    }

    const userId = sessionData.session.user.id;
    const trimmedName = input.name.trim();
    const trimmedEmail = input.email.trim().toLowerCase();
    const trimmedPhone = input.phone.trim();

    if (!trimmedName || !trimmedEmail) {
      return { success: false, error: 'Nombre y correo son obligatorios.' };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return { success: false, error: 'Ingresa un correo electrónico válido.' };
    }

    const nextProfile = {
      nombre: trimmedName,
      email: trimmedEmail,
      telefono: trimmedPhone || null,
      updated_at: new Date().toISOString(),
    };

    const { error: profileError } = await supabase
      .from('usuarios')
      .update(nextProfile)
      .eq('id', userId);

    if (profileError) {
      return { success: false, error: profileError.message };
    }

    if (sessionData.session.user.email !== trimmedEmail) {
      const { error: authError } = await supabase.auth.updateUser({ email: trimmedEmail });
      if (authError) {
        return { success: false, error: authError.message };
      }
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudo guardar el perfil.',
    };
  }
}

export async function getMedicationHistoryData(): Promise<MedicationHistoryItem[]> {
  const empty: MedicationHistoryItem[] = [];

  if (!supabase || !isSupabaseConfigured) {
    return empty;
  }

  try {
    const profile = await getCurrentUserProfile();
    const patient = await getPatientForRole('cuidador', profile);

    if (!patient) {
      return empty;
    }

    const { data: medicationRows, error: medError } = await supabase
      .from('medicamentos')
      .select('id, nombre, hora_inicio')
      .eq('paciente_id', patient.id)
      .order('hora_inicio', { ascending: true });

    if (medError || !medicationRows?.length) {
      return empty;
    }

    const { data: records, error: recordsError } = await supabase
      .from('registro_medicacion')
      .select('id, medicamento_id, estado, fecha_hora, registrado_por')
      .in('medicamento_id', medicationRows.map((medication) => medication.id))
      .order('fecha_hora', { ascending: false });

    if (recordsError || !records?.length) return empty;
    const medicationNames = new Map(medicationRows.map((medication) => [medication.id, medication.nombre]));

    return records.map((record) => ({
      id: record.id,
      name: medicationNames.get(record.medicamento_id) ?? 'Medicamento',
      date: record.fecha_hora,
      time: new Date(record.fecha_hora).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
      recorder: record.registrado_por ? `Usuario ${record.registrado_por.slice(0, 8)}` : 'Usuario no disponible',
      status: record.estado === 'administrado' ? 'Administrada' : 'No administrada',
    }));
  } catch {
    return empty;
  }
}

export async function saveClinicalAnnotation(input: {
  category: string;
  comment: string;
  pressure?: string;
  temperature?: string;
  heartRate?: string;
  oxygen?: string;
  isVoiceRecording?: boolean;
}): Promise<SaveAnnotationResult> {
  if (!supabase || !isSupabaseConfigured) {
    return { success: false, error: 'Supabase no está configurado.' };
  }

  try {
    const profile = await getCurrentUserProfile();
    if (!profile?.id) {
      return { success: false, error: 'No hay sesión activa disponible.' };
    }

    const patient = await getPatientForRole('cuidador', profile)
      ?? await getPatientForRole('familiar', profile)
      ?? await getPatientForRole('medico', profile);

    if (!patient?.id) {
      return { success: false, error: 'No se pudo identificar al paciente asociado.' };
    }

    const detailParts = [input.comment.trim()];
    if (input.pressure) detailParts.push(`Presión: ${input.pressure}`);
    if (input.temperature) detailParts.push(`Temperatura: ${input.temperature}`);
    if (input.heartRate) detailParts.push(`FC: ${input.heartRate}`);
    if (input.oxygen) detailParts.push(`SatO₂: ${input.oxygen}`);

    const finalContent = detailParts.filter(Boolean).join(' • ');
    const categoryLabel = input.category?.trim() || 'Observación';
    const persistedContent = `[${categoryLabel}] ${finalContent}`;

    const { data: annotationId, error } = await supabase.rpc('save_clinical_annotation', {
      p_paciente_id: patient.id,
      p_contenido: persistedContent,
      p_es_registro_voz: input.isVoiceRecording ?? false,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (annotationId) {
      await dispatchRelevantNotification({
        eventId: annotationId,
        eventType: 'clinical_annotation',
        patientId: patient.id,
      });
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudo guardar la anotación.',
    };
  }
}

export type DoctorPatient = {
  id: string;
  nombre: string;
  fecha_nacimiento: string;
  codigo_qr_token: string;
  alergias: string | null;
  contacto_emergencia: string | null;
};

export type PatientMedication = {
  id: string;
  paciente_id: string;
  nombre: string;
  dosis: string;
  hora_inicio: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  estado: string;
};

export type PendingMedicationApproval = {
  id: string;
  patientName: string;
  name: string;
  dose: string;
  frequencyHours: number;
};

export async function getDoctorPatients(): Promise<{ success: boolean; patients: DoctorPatient[]; error?: string }> {
  if (!supabase || !isSupabaseConfigured) {
    return { success: false, patients: [], error: 'Supabase no está configurado.' };
  }

  try {
    const profile = await getCurrentUserProfile();
    if (!profile?.id || profile.rol !== 'medico') {
      return { success: false, patients: [], error: 'Esta función está disponible para el equipo médico.' };
    }

    const { data: links, error: linksError } = await supabase
      .from('paciente_usuario')
      .select('paciente_id')
      .eq('usuario_id', profile.id)
      .eq('relacion', 'medico');

    if (linksError) {
      return { success: false, patients: [], error: linksError.message };
    }

    const patientIds = (links ?? []).map((link) => link.paciente_id);
    if (!patientIds.length) {
      return { success: true, patients: [] };
    }

    const { data: patients, error: patientsError } = await supabase
      .from('pacientes')
      .select('id, nombre, fecha_nacimiento, codigo_qr_token, alergias, contacto_emergencia')
      .in('id', patientIds)
      .order('nombre', { ascending: true });

    if (patientsError) {
      return { success: false, patients: [], error: patientsError.message };
    }

    return { success: true, patients: (patients ?? []) as DoctorPatient[] };
  } catch (error) {
    return {
      success: false,
      patients: [],
      error: error instanceof Error ? error.message : 'No se pudo cargar la lista de pacientes.',
    };
  }
}

export async function createPatientForCurrentUser(input: {
  nombre: string;
  fechaNacimiento: string;
  diagnosticoPrincipal?: string;
  rut?: string;
  alergias?: string;
  contactoEmergencia?: string;
}): Promise<{ success: boolean; patientId?: string; error?: string }> {
  if (!supabase || !isSupabaseConfigured) {
    return { success: false, error: 'Supabase no está configurado.' };
  }

  const profile = await getCurrentUserProfile();
  if (!profile?.id || !['medico', 'cuidador', 'familiar'].includes(profile.rol ?? '')) {
    return { success: false, error: 'Inicia sesión con un perfil válido para registrar pacientes.' };
  }

  const nombre = input.nombre.trim();
  if (!nombre || !input.fechaNacimiento) {
    return { success: false, error: 'El nombre y la fecha de nacimiento son obligatorios.' };
  }

  try {
    const { data: patientId, error } = await supabase.rpc('create_patient_for_current_user', {
      p_nombre: nombre,
      p_fecha_nacimiento: input.fechaNacimiento,
      p_diagnostico_principal: input.diagnosticoPrincipal?.trim() || null,
      p_rut: input.rut?.trim() || null,
      p_alergias: input.alergias?.trim() || null,
      p_contacto_emergencia: input.contactoEmergencia?.trim() || null,
    });

    if (error || !patientId) {
      return { success: false, error: error?.message ?? 'No se pudo crear el paciente.' };
    }

    return { success: true, patientId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudo registrar el paciente.',
    };
  }
}

export async function createMedicationPrescription(input: {
  patientId: string;
  nombre: string;
  dosis: string;
  frecuenciaHoras: number;
  horaInicio: string;
  fechaInicio: string;
  fechaFin?: string;
  indicaciones?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!supabase || !isSupabaseConfigured) {
    return { success: false, error: 'Supabase no está configurado.' };
  }

  const profile = await getCurrentUserProfile();
  if (!profile?.id || profile.rol !== 'medico') {
    return { success: false, error: 'Solo un médico puede prescribir medicamentos.' };
  }

  if (!input.patientId || !input.nombre.trim() || !input.dosis.trim() || input.frecuenciaHoras < 1 || !input.horaInicio || !input.fechaInicio) {
    return { success: false, error: 'Completa paciente, medicamento, dosis, frecuencia, hora y fecha de inicio.' };
  }

  if (input.fechaFin && input.fechaFin < input.fechaInicio) {
    return { success: false, error: 'La fecha de término no puede ser anterior al inicio.' };
  }

  try {
    const { data: prescription, error } = await supabase.from('medicamentos').insert({
      paciente_id: input.patientId,
      recetado_por: profile.id,
      nombre: input.nombre.trim(),
      dosis: input.dosis.trim(),
      frecuencia_horas: input.frecuenciaHoras,
      hora_inicio: input.horaInicio,
      fecha_inicio: input.fechaInicio,
      fecha_fin: input.fechaFin || null,
      indicaciones: input.indicaciones?.trim() || null,
      estado: 'pendiente',
    }).select('id').single();

    if (error) return { success: false, error: error.message };
    if (prescription?.id) {
      await dispatchRelevantNotification({
        eventId: prescription.id,
        eventType: 'prescription_pending',
        patientId: input.patientId,
      });
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudo guardar la prescripción.',
    };
  }
}

export async function getPendingMedicationApprovals(): Promise<{ success: boolean; approvals: PendingMedicationApproval[]; error?: string }> {
  if (!supabase || !isSupabaseConfigured) {
    return { success: false, approvals: [], error: 'Supabase no está configurado.' };
  }

  const profile = await getCurrentUserProfile();
  if (!profile?.id || profile.rol !== 'medico') {
    return { success: false, approvals: [], error: 'Solo un médico puede consultar las prescripciones pendientes.' };
  }

  try {
    const { data: links, error: linksError } = await supabase
      .from('paciente_usuario')
      .select('paciente_id')
      .eq('usuario_id', profile.id)
      .eq('relacion', 'medico');

    if (linksError) return { success: false, approvals: [], error: linksError.message };
    const patientIds = (links ?? []).map((link) => link.paciente_id);
    if (!patientIds.length) return { success: true, approvals: [] };

    const { data: medications, error: medicationsError } = await supabase
      .from('medicamentos')
      .select('id, paciente_id, nombre, dosis, frecuencia_horas')
      .in('paciente_id', patientIds)
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: true });

    if (medicationsError) return { success: false, approvals: [], error: medicationsError.message };
    if (!medications?.length) return { success: true, approvals: [] };

    const medicationPatientIds = [...new Set(medications.map((medication) => medication.paciente_id))];
    const { data: patients, error: patientsError } = await supabase
      .from('pacientes')
      .select('id, nombre')
      .in('id', medicationPatientIds);

    if (patientsError) return { success: false, approvals: [], error: patientsError.message };
    const patientNames = new Map((patients ?? []).map((patient) => [patient.id, patient.nombre]));

    return {
      success: true,
      approvals: medications.map((medication) => ({
        id: medication.id,
        patientName: patientNames.get(medication.paciente_id) ?? 'Paciente',
        name: medication.nombre,
        dose: medication.dosis,
        frequencyHours: medication.frecuencia_horas,
      })),
    };
  } catch (error) {
    return {
      success: false,
      approvals: [],
      error: error instanceof Error ? error.message : 'No se pudieron consultar las prescripciones pendientes.',
    };
  }
}

export async function reviewMedicationPrescription(input: { medicationId: string; approve: boolean }): Promise<{ success: boolean; error?: string }> {
  if (!supabase || !isSupabaseConfigured) {
    return { success: false, error: 'Supabase no está configurado.' };
  }

  try {
    const { data: reviewedId, error } = await supabase.rpc('review_medication_prescription', {
      p_medicamento_id: input.medicationId,
      p_aprobada: input.approve,
    });
    if (error) return { success: false, error: error.message };
    if (reviewedId) {
      const { data: medication } = await supabase
        .from('medicamentos')
        .select('paciente_id')
        .eq('id', input.medicationId)
        .maybeSingle();
      if (medication?.paciente_id) {
        await dispatchRelevantNotification({
          eventId: reviewedId,
          eventType: 'prescription_reviewed',
          patientId: medication.paciente_id,
        });
      }
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudo revisar la prescripción.',
    };
  }
}

export async function getCaregiverMedications(): Promise<{ success: boolean; medications: PatientMedication[]; canAdminister: boolean; error?: string }> {
  if (!supabase || !isSupabaseConfigured) {
    return { success: false, medications: [], canAdminister: false, error: 'Supabase no está configurado.' };
  }

  try {
    const profile = await getCurrentUserProfile();
    if (!profile?.id || (profile.rol !== 'cuidador' && profile.rol !== 'familiar')) {
      return { success: false, medications: [], canAdminister: false, error: 'Esta agenda está disponible para cuidadores y familiares.' };
    }

    const { data: links, error: linksError } = await supabase
      .from('paciente_usuario')
      .select('paciente_id')
      .eq('usuario_id', profile.id)
      .eq('relacion', profile.rol);

    if (linksError) {
      return { success: false, medications: [], canAdminister: profile.rol === 'cuidador', error: linksError.message };
    }

    const patientIds = (links ?? []).map((link) => link.paciente_id);
    if (!patientIds.length) {
      return { success: true, medications: [], canAdminister: profile.rol === 'cuidador' };
    }

    const { data: medications, error: medicationsError } = await supabase
      .from('medicamentos')
      .select('id, paciente_id, nombre, dosis, hora_inicio, fecha_inicio, fecha_fin, estado')
      .in('paciente_id', patientIds)
      .order('hora_inicio', { ascending: true });

    if (medicationsError) {
      return { success: false, medications: [], canAdminister: profile.rol === 'cuidador', error: medicationsError.message };
    }

    return { success: true, medications: (medications ?? []) as PatientMedication[], canAdminister: profile.rol === 'cuidador' };
  } catch (error) {
    return {
      success: false,
      medications: [],
      canAdminister: false,
      error: error instanceof Error ? error.message : 'No se pudo cargar la agenda de medicamentos.',
    };
  }
}

export async function recordMedicationAdministration(input: {
  medicationId: string;
  isAdministered: boolean;
  observations?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!supabase || !isSupabaseConfigured) {
    return { success: false, error: 'Supabase no está configurado.' };
  }

  const profile = await getCurrentUserProfile();
  if (!profile?.id || profile.rol !== 'cuidador') {
    return { success: false, error: 'Solo un cuidador puede registrar la administración.' };
  }

  try {
    const { data: medication } = await supabase
      .from('medicamentos')
      .select('paciente_id')
      .eq('id', input.medicationId)
      .maybeSingle();
    const { data: recordId, error } = await supabase.rpc('register_medication_administration', {
      p_medicamento_id: input.medicationId,
      p_observaciones: input.observations?.trim() || null,
      p_administrado: input.isAdministered,
    });

    if (error) return { success: false, error: error.message };
    if (recordId && medication?.paciente_id) {
      await dispatchRelevantNotification({
        eventId: recordId,
        eventType: 'medication_administered',
        patientId: medication.paciente_id,
      });
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudo registrar la administración.',
    };
  }
}

export async function getRoleDashboardData(role: RoleKey): Promise<ScreenData> {
  const empty: ScreenData = {
    patientName: 'Sin paciente asociado',
    patientMeta: 'Asocia un paciente para ver los datos',
    summary: 'No hay paciente vinculado',
    medications: [],
    alerts: ['Sin alertas disponibles.'],
    history: [],
  };

  if (!supabase || !isSupabaseConfigured) {
    return empty;
  }

  try {
    const profile = await getCurrentUserProfile();
    const patient = await getPatientForRole(role, profile);

    if (!patient) {
      return empty;
    }

    const { data: medicamentoData } = await supabase
      .from('medicamentos')
      .select('nombre, hora_inicio, estado')
      .eq('paciente_id', patient.id)
      .order('hora_inicio', { ascending: true })
      .limit(4);

    const medications = (medicamentoData ?? []).map((item) => ({
      name: item.nombre,
      time: formatTime(item.hora_inicio),
      status: mapStatus(item.estado),
    }));

    const patientAge = patient.fecha_nacimiento
      ? new Date().getFullYear() - new Date(patient.fecha_nacimiento).getFullYear()
      : 0;

    const totalPatients = role === 'medico'
      ? (await supabase.from('pacientes').select('*', { count: 'exact', head: true })).count ?? undefined
      : undefined;

    const summary = role === 'medico'
      ? `${totalPatients ?? 1} pacientes activos`
      : `${medications.length || 0} medicamentos del día`;

    return {
      patientName: patient.nombre,
      patientMeta: patientAge ? `${patientAge} años · Plan Crónico` : 'Paciente activo',
      summary,
      medications: medications.length ? medications : empty.medications,
      alerts: medications.some((item) => item.status === 'Pendiente')
        ? ['Hay medicamentos pendientes de registro.']
        : ['Sin alertas nuevas.'],
      history: empty.history,
      totalPatients,
    };
  } catch {
    return empty;
  }
}
