import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DashboardSkeleton } from '@/components/ui/skeleton';
import {
    getDashboardOverviewData,
    getPatientSummaryData,
    getProfileSettingsData,
    type DashboardOverviewData,
    type PatientSummaryData,
} from '@/lib/linkcare-data';

const roleQuickActions = {
  cuidador: [
    { label: 'Registrar paciente', route: '/patient-new', detail: 'Crear una ficha y su QR', tone: '#006B73', icon: '👤' },
    { label: 'Mostrar QR', route: '/qr-patient-summary', detail: 'Compartir con el equipo médico', tone: '#023047', icon: '📷' },
    { label: 'Medicamentos', route: '/medications-day', detail: 'Agenda del día', tone: '#028090', icon: '💊' },
    { label: 'Historial', route: '/medication-history', detail: 'Últimas dosis', tone: '#06b6d4', icon: '📋' },
    { label: 'Cronología', route: '/annotations', detail: 'Notas clínicas', tone: '#02c39a', icon: '📝' },
    { label: 'Nueva nota', route: '/annotations-new', detail: 'Registrar evento', tone: '#0f766e', icon: '✍️' },
    { label: 'Perfil', route: '/profile-settings', detail: 'Cuenta y ajustes', tone: '#475569', icon: '👤' },
  ],
  familiar: [
    { label: 'Registrar paciente', route: '/patient-new', detail: 'Crear una ficha y su QR', tone: '#006B73', icon: '👤' },
    { label: 'Mostrar QR', route: '/qr-patient-summary', detail: 'Compartir con el equipo médico', tone: '#023047', icon: '📷' },
    { label: 'Resumen', route: '/dashboard', detail: 'Vista general', tone: '#028090', icon: '📊' },
    { label: 'Medicamentos', route: '/medications-day', detail: 'Cuidados del día', tone: '#06b6d4', icon: '💊' },
    { label: 'Historial', route: '/medication-history', detail: 'Últimas dosis', tone: '#2563eb', icon: '📋' },
    { label: 'Cronología', route: '/annotations', detail: 'Notas y observaciones', tone: '#02c39a', icon: '📝' },
    { label: 'Perfil', route: '/profile-settings', detail: 'Cuenta y ajustes', tone: '#475569', icon: '👤' },
  ],
  medico: [
    { label: 'Pacientes', route: '/medico', detail: 'Vista del equipo', tone: '#028090', icon: '👥' },
    { label: 'Prescribir', route: '/medico/prescription-new', detail: 'Nueva receta', tone: '#06b6d4', icon: '💊' },
    { label: 'Escanear QR', route: '/qr-scanner', detail: 'Vincular ficha', tone: '#023047', icon: '📷' },
    { label: 'Cronología', route: '/annotations', detail: 'Observaciones clínicas', tone: '#02c39a', icon: '📝' },
    { label: 'Nueva nota', route: '/annotations-new', detail: 'Registrar evolución', tone: '#0f766e', icon: '✍️' },
    { label: 'Perfil', route: '/profile-settings', detail: 'Cuenta y ajustes', tone: '#475569', icon: '👤' },
  ],
} as const;

export default function DashboardScreen() {
  const [data, setData] = useState<DashboardOverviewData | null>(null);
  const [patientSummary, setPatientSummary] = useState<PatientSummaryData | null>(null);
  const [linkedPatients, setLinkedPatients] = useState<string[]>([]);
  const [roleKey, setRoleKey] = useState<keyof typeof roleQuickActions>('cuidador');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAllActions, setShowAllActions] = useState(false);

  const loadDashboard = useCallback(async (isActive: () => boolean = () => true) => {
    setIsRefreshing(true);
    try {
      const [nextData, profileData, summaryData] = await Promise.all([
        getDashboardOverviewData(),
        getProfileSettingsData(),
        getPatientSummaryData(),
      ]);

      if (!isActive()) return;

      const nextRole = profileData.role.toLowerCase().includes('familiar')
        ? 'familiar'
        : profileData.role.toLowerCase().includes('médico') || profileData.role.toLowerCase().includes('equipo')
          ? 'medico'
          : 'cuidador';

      setData(nextData);
      setPatientSummary(summaryData);
      setLinkedPatients(profileData.linkedPatients ?? []);
      setRoleKey(nextRole);
    } finally {
      if (isActive()) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(useCallback(() => {
    let active = true;
    void loadDashboard(() => active);
    return () => {
      active = false;
    };
  }, [loadDashboard]));

  const medicationList = data?.medications ?? [];
  const annotations = data?.annotations ?? [];
  const pendingCount = medicationList.filter((med) => med.status === 'Pendiente').length;
  const takenCount = medicationList.filter((med) => med.status === 'Tomado').length;
  const quickActions = roleQuickActions[roleKey];
  const visibleActions = showAllActions ? quickActions : quickActions.slice(0, 4);
  const hasMoreActions = quickActions.length > 4;
  const roleTitle = roleKey === 'familiar' ? 'Seguimiento familiar' : roleKey === 'medico' ? 'Panel médico' : 'Cuidador';
  const heroLabel = roleKey === 'familiar' ? 'Responsable del paciente' : roleKey === 'medico' ? 'Supervisión clínica' : 'Paciente activo';
  const activePatientName = patientSummary?.name ?? data?.patientName ?? 'Paciente activo';
  const hasLinkedPatient = linkedPatients.length > 0;
  // 2) Ley de Hick: se reducen opciones visibles para disminuir la carga cognitiva y se revela el resto progresivamente.
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.screen}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadDashboard()} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>{roleTitle}</Text>
            <Text style={styles.title}>{data?.patientName ?? 'Cargando...'}</Text>
          </View>
          <Pressable style={styles.profileBadge} onPress={() => router.push('/profile-settings' as any)}>
            <Text style={styles.profileText}>{(data?.patientName ?? 'ER').split(' ').map((part) => part[0]).slice(0, 2).join('')}</Text>
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <Text style={styles.heroLabel}>{heroLabel}</Text>
            <Text style={styles.liveBadge}>En línea</Text>
          </View>
          <Text style={styles.heroText}>{data?.patientMeta ?? 'Cargando...'}</Text>
          <Text style={styles.heroMeta}>{data?.summary ?? 'Cargando...'}</Text>
          <View style={styles.patientContextRow}>
            <Text style={styles.patientContextLabel}>Paciente activo</Text>
            <Text style={styles.patientContextValue}>{activePatientName}</Text>
          </View>
        </View>

        {!hasLinkedPatient && (
          <View style={styles.emptyStateCard}>
            <Text style={styles.emptyStateTitle}>Aún no tienes un paciente vinculado</Text>
            <Text style={styles.emptyStateText}>Enlaza al paciente desde tu perfil para que el dashboard quede conectado a la persona correcta.</Text>
            <View style={styles.emptyStateActions}>
              <Pressable style={styles.emptyStateButton} onPress={() => router.push('/patient-new' as any)} accessibilityRole="button" accessibilityLabel="Registrar un paciente">
                <Text style={styles.emptyStateButtonText}>Registrar paciente</Text>
              </Pressable>
              <Pressable style={styles.emptyStateSecondaryButton} onPress={() => router.push('/profile-settings' as any)} accessibilityRole="button" accessibilityLabel="Vincular paciente existente">
                <Text style={styles.emptyStateSecondaryText}>Vincular existente</Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricNumber}>{takenCount}</Text>
            <Text style={styles.metricLabel}>Tomadas</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricNumber}>{pendingCount}</Text>
            <Text style={styles.metricLabel}>Pendientes</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricNumber}>{annotations.length}</Text>
            <Text style={styles.metricLabel}>Notas</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Resumen clínico</Text>
            <Pressable onPress={() => router.push('/qr-patient-summary' as any)} accessibilityRole="button" accessibilityLabel="Ver ficha del paciente" focusable>
              <Text style={styles.linkText}>Ver ficha</Text>
            </Pressable>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>{patientSummary?.name ?? data?.patientName ?? 'Sin paciente vinculado'}</Text>
            <Text style={styles.summaryMeta}>{patientSummary?.age ?? 'Edad no disponible'} · {patientSummary?.location ?? 'Ficha clínica'}</Text>
            <Text style={styles.summaryPrompt}>Diagnóstico, alergias y tratamientos disponibles en la ficha completa.</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Acciones rápidas</Text>
          </View>
          <View style={styles.grid}>
            {visibleActions.map((item) => (
              <Pressable
                key={`${roleKey}-${item.label}`}
                style={[styles.quickCard, { backgroundColor: item.tone }]}
                onPress={() => router.push(item.route as any)}
                accessibilityRole="button"
                accessibilityLabel={`Abrir ${item.label}`}
                accessibilityHint={item.detail}
                focusable
              >
                <Text style={styles.quickIcon}>{item.icon}</Text>
                <Text style={styles.quickText}>{item.label}</Text>
                <Text style={styles.quickDetail}>{item.detail}</Text>
              </Pressable>
            ))}
          </View>

          {hasMoreActions && (
            <Pressable
              style={styles.moreActionsButton}
              onPress={() => setShowAllActions((current) => !current)}
              accessibilityRole="button"
              accessibilityLabel={showAllActions ? 'Ocultar acciones adicionales' : 'Ver más acciones'}
              accessibilityState={{ expanded: showAllActions }}
              accessibilityHint="Muestra o oculta las acciones menos frecuentes"
              focusable
            >
              <Text style={styles.moreActionsText}>{showAllActions ? 'Ver menos' : 'Ver más'}</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Medicamentos del día</Text>
            <Pressable onPress={() => router.push('/medication-history' as any)} accessibilityRole="button" accessibilityLabel="Ir al historial de medicamentos" focusable>
              <Text style={styles.linkText}>Historial</Text>
            </Pressable>
          </View>

          {medicationList.map((med) => (
            <View key={`${med.name}-${med.time}`} style={styles.itemCard}>
              <View style={[styles.itemIcon, med.status === 'Tomado' ? styles.iconOk : med.status === 'Pendiente' ? styles.iconPending : styles.iconLate]} />
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>{med.name}</Text>
                <Text style={styles.itemTime}>{med.time}</Text>
              </View>
              <Text style={[styles.statusBadge, med.status === 'Tomado' ? styles.statusOk : med.status === 'Pendiente' ? styles.statusPending : styles.statusLate]}>
                {med.status}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Anotaciones recientes</Text>
            <Pressable onPress={() => router.push('/annotations-new' as any)} accessibilityRole="button" accessibilityLabel="Crear una nueva anotación" focusable>
              <Text style={styles.linkText}>Nueva</Text>
            </Pressable>
          </View>

          {annotations.map((item) => (
            <View key={`${item.title}-${item.detail}`} style={styles.noteCard}>
              <Text style={styles.noteTitle}>{item.title}</Text>
              <Text style={styles.noteDetail}>{item.detail}</Text>
              <Text style={styles.noteAuthor}>{item.author}</Text>
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#edf7fb',
  },
  screen: {
    flexGrow: 1,
    backgroundColor: '#edf7fb',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  eyebrow: {
    color: '#028090',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    color: '#023047',
    fontSize: 30,
    fontWeight: '800',
  },
  profileBadge: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#023047',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: {
    color: '#fff',
    fontWeight: '700',
  },
  heroCard: {
    backgroundColor: '#023047',
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
    shadowColor: '#023047',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroLabel: {
    color: '#d9f5f8',
    fontSize: 12,
    fontWeight: '700',
  },
  liveBadge: {
    backgroundColor: '#dff7ed',
    color: '#15803d',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  heroText: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 6,
  },
  heroMeta: {
    color: '#c8eff4',
    fontSize: 13,
  },
  patientContextRow: {
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  patientContextLabel: {
    color: '#c8ecf1',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  patientContextValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  emptyStateCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dceaf1',
    padding: 16,
    marginBottom: 18,
  },
  emptyStateTitle: {
    color: '#023047',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptyStateText: {
    color: '#4a5568',
    lineHeight: 20,
    marginBottom: 12,
  },
  emptyStateButton: {
    backgroundColor: '#028090',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptyStateActions: {
    gap: 10,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  emptyStateSecondaryButton: {
    borderWidth: 1,
    borderColor: '#006B73',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptyStateSecondaryText: {
    color: '#00545B',
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dfeaf1',
    padding: 14,
    alignItems: 'center',
  },
  metricNumber: {
    color: '#023047',
    fontSize: 26,
    fontWeight: '800',
  },
  metricLabel: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dfeaf1',
    padding: 16,
  },
  summaryTitle: {
    color: '#023047',
    fontSize: 22,
    fontWeight: '800',
  },
  summaryMeta: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },
  summaryPrompt: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 6,
  },
  quickCard: {
    width: '47%',
    minHeight: 104,
    borderRadius: 20,
    padding: 14,
    justifyContent: 'flex-end',
    shadowColor: '#023047',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  moreActionsButton: {
    marginTop: 12,
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  moreActionsText: {
    color: '#023047',
    fontWeight: '700',
  },
  quickIcon: {
    fontSize: 21,
    marginBottom: 14,
  },
  quickText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  quickDetail: {
    color: '#e6f6ff',
    fontSize: 11,
    marginTop: 4,
  },
  section: {
    marginBottom: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#023047',
    fontSize: 17,
    fontWeight: '800',
  },
  linkText: {
    color: '#028090',
    fontWeight: '700',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 10,
  },
  itemIcon: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 12,
  },
  iconOk: {
    backgroundColor: '#02c39a',
  },
  iconPending: {
    backgroundColor: '#f59e0b',
  },
  iconLate: {
    backgroundColor: '#ef4444',
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    color: '#023047',
    fontWeight: '700',
    marginBottom: 3,
  },
  itemTime: {
    color: '#64748b',
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 10,
    fontWeight: '700',
  },
  statusOk: {
    backgroundColor: '#dff7ed',
    color: '#15803d',
  },
  statusPending: {
    backgroundColor: '#fff4d5',
    color: '#b45309',
  },
  statusLate: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
  },
  noteCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  noteTitle: {
    color: '#023047',
    fontWeight: '800',
    marginBottom: 6,
  },
  noteDetail: {
    color: '#475569',
    lineHeight: 20,
  },
  noteAuthor: {
    color: '#028090',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
});

