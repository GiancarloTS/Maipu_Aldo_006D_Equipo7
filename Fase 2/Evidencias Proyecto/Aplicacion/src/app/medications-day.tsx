import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getCaregiverMedications, getDashboardOverviewData, getProfileSettingsData, recordMedicationAdministration, type DashboardOverviewData, type PatientMedication } from '@/lib/linkcare-data';
import { formatTime, mapStatus } from '@/lib/linkcare-utils';

export default function MedicationsDayScreen() {
  const [data, setData] = useState<DashboardOverviewData | null>(null);
  const [medications, setMedications] = useState<PatientMedication[]>([]);
  const [linkedPatients, setLinkedPatients] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [canAdminister, setCanAdminister] = useState(false);
  const [savingMedicationId, setSavingMedicationId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');

  useFocusEffect(useCallback(() => {
    let active = true;

    const load = async () => {
      const [next, profile, schedule] = await Promise.all([
        getDashboardOverviewData(),
        getProfileSettingsData(),
        getCaregiverMedications(),
      ]);

      if (active) {
        setData(next);
        setLinkedPatients(profile.linkedPatients ?? []);
        setMedications(schedule.medications);
        setCanAdminister(schedule.canAdminister);
        setLoadError(schedule.error ?? '');
        setIsLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []));

  const today = new Date().toLocaleDateString('sv-SE');
  const medicationSchedule = medications.map((med) => {
    const isInDateRange = med.fecha_inicio <= today && (!med.fecha_fin || med.fecha_fin >= today);
    const canRecordDose = med.estado === 'aprobado' && isInDateRange;
    return {
      id: med.id,
      time: formatTime(med.hora_inicio),
      name: med.nombre,
      dose: med.dosis,
      status: !isInDateRange ? 'Fuera de vigencia' : mapStatus(med.estado),
      tone: med.estado === 'administrado' ? 'ok' : med.estado === 'pendiente' ? 'pending' : 'late',
      canRecordDose,
      source: med,
    };
  });

  const summary = `${medicationSchedule.filter((med) => med.status === 'Tomado').length} tomadas · ${medicationSchedule.filter((med) => med.status === 'Pendiente').length} pendientes · ${medicationSchedule.filter((med) => med.status === 'Revisión').length} revisión`;
  const hasPatient = linkedPatients.length > 0;

  const confirmAdministration = (medication: PatientMedication, isAdministered: boolean) => {
    const resultText = isAdministered ? 'administrada' : 'no administrada';
    Alert.alert(
      isAdministered ? 'Confirmar dosis administrada' : 'Confirmar dosis no administrada',
      `¿Confirmas que la dosis de ${medication.nombre} (${medication.dosis}) fue ${resultText}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setSavingMedicationId(medication.id);
            const result = await recordMedicationAdministration({
              medicationId: medication.id,
              isAdministered,
            });
            setSavingMedicationId(null);
            if (!result.success) {
              Alert.alert('No se pudo registrar', result.error ?? 'Intenta nuevamente.');
              return;
            }
            if (isAdministered) {
              setMedications((current) => current.map((item) => item.id === medication.id ? { ...item, estado: 'administrado' } : item));
            }
            Alert.alert(
              isAdministered ? 'Dosis administrada' : 'Dosis no administrada',
              'Se guardaron la hora y el usuario responsable en el historial.',
            );
          },
        },
      ],
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.title}>Agenda del día</Text>
      </View>

      {!hasPatient && (
        <View style={styles.emptyStateCard}>
          <Text style={styles.emptyStateTitle}>No hay paciente vinculado</Text>
          <Text style={styles.emptyStateText}>Asocia un paciente para ver la agenda real de medicamentos.</Text>
          <Pressable style={styles.emptyStateButton} onPress={() => router.push('/profile-settings' as any)}>
            <Text style={styles.emptyStateButtonText}>Vincular paciente</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Resumen</Text>
        <Text style={styles.summaryValue}>{isLoading ? 'Cargando agenda...' : summary}</Text>
      </View>

      {!isLoading && !hasPatient && (
        <Text style={styles.emptyText}>No hay un paciente vinculado a esta cuenta.</Text>
      )}
      {!isLoading && loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}
      {!isLoading && hasPatient && !loadError && medicationSchedule.length === 0 ? (
        <Text style={styles.emptyText}>No hay medicamentos registrados para este paciente.</Text>
      ) : null}

      {medicationSchedule.map((med) => (
        <View key={`${med.time}-${med.name}`} style={styles.medCard}>
          <View style={styles.timeBlock}>
            <Text style={styles.timeText}>{med.time}</Text>
          </View>
          <View style={styles.medInfo}>
            <Text style={styles.medName}>{med.name}</Text>
            <Text style={styles.medMeta}>{med.dose} · Paciente: {data?.patientName ?? 'Paciente vinculado'}</Text>
          </View>
          <Text style={[styles.stateBadge, med.tone === 'ok' ? styles.ok : med.tone === 'pending' ? styles.pending : med.tone === 'late' ? styles.late : styles.planned]}>{med.status}</Text>
          {canAdminister && med.canRecordDose && (
            <Pressable
              style={[styles.administerButton, savingMedicationId === med.id && styles.disabledButton]}
              onPress={() => confirmAdministration(med.source, true)}
              disabled={savingMedicationId === med.id}
              accessibilityRole="button"
              accessibilityLabel={`Registrar administración de ${med.name}`}
            >
              <Text style={styles.administerText}>{savingMedicationId === med.id ? 'Guardando...' : 'Marcar administrada'}</Text>
            </Pressable>
          )}
          {canAdminister && med.canRecordDose && (
            <Pressable
              style={[styles.notAdministerButton, savingMedicationId === med.id && styles.disabledButton]}
              onPress={() => confirmAdministration(med.source, false)}
              disabled={savingMedicationId === med.id}
              accessibilityRole="button"
              accessibilityLabel={`Registrar que no se administró ${med.name}`}
            >
              <Text style={styles.notAdministerText}>No administrada</Text>
            </Pressable>
          )}
        </View>
      ))}

      {!canAdminister && hasPatient && (
        <Text style={styles.readOnlyHint}>Puedes consultar la agenda. El registro de administración corresponde al cuidador.</Text>
      )}

      <Pressable style={styles.primaryButton} onPress={() => router.push('/medication-history' as any)}>
        <Text style={styles.primaryText}>Ver historial</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    backgroundColor: '#f0f4f8',
    paddingHorizontal: 20,
    paddingTop: 42,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backText: {
    color: '#023047',
    fontSize: 20,
    fontWeight: '700',
  },
  title: {
    color: '#023047',
    fontSize: 28,
    fontWeight: '800',
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
  emptyStateButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  summaryCard: {
    backgroundColor: '#023047',
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
  },
  summaryLabel: {
    color: '#d9f5f8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  summaryValue: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  medCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dfeaf1',
    padding: 14,
    marginBottom: 12,
  },
  timeBlock: {
    backgroundColor: '#e8f6fb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 12,
  },
  timeText: {
    color: '#028090',
    fontWeight: '800',
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    color: '#023047',
    fontWeight: '800',
    marginBottom: 4,
  },
  medMeta: {
    color: '#64748b',
    fontSize: 12,
  },
  stateBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 10,
    fontWeight: '800',
  },
  ok: { backgroundColor: '#dff7ed', color: '#15803d' },
  pending: { backgroundColor: '#fff4d5', color: '#b45309' },
  late: { backgroundColor: '#fee2e2', color: '#b91c1c' },
  planned: { backgroundColor: '#e0f2fe', color: '#0369a1' },
  emptyText: { color: '#475569', fontSize: 14, marginBottom: 14 },
  administerButton: { minHeight: 40, width: '100%', flexBasis: '100%', backgroundColor: '#006B73', borderRadius: 10, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  administerText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  notAdministerButton: { minHeight: 40, width: '100%', flexBasis: '100%', backgroundColor: '#fff', borderWidth: 1, borderColor: '#B91C1C', borderRadius: 10, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  notAdministerText: { color: '#991B1B', fontWeight: '800', fontSize: 12 },
  disabledButton: { opacity: 0.6 },
  errorText: { color: '#991B1B', fontSize: 14, lineHeight: 20, marginBottom: 14 },
  readOnlyHint: { color: '#475569', fontSize: 13, lineHeight: 18, marginTop: 2, marginBottom: 14 },
  primaryButton: {
    marginTop: 12,
    backgroundColor: '#028090',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
