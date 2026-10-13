import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getDoctorPatients, getPendingMedicationApprovals, getRoleDashboardData, reviewMedicationPrescription, type DoctorPatient, type PendingMedicationApproval, type ScreenData } from '@/lib/linkcare-data';

export default function MedicoScreen() {
  const [data, setData] = useState<ScreenData | null>(null);
  const [patients, setPatients] = useState<DoctorPatient[]>([]);
  const [approvals, setApprovals] = useState<PendingMedicationApproval[]>([]);
  const [approvalError, setApprovalError] = useState('');
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useFocusEffect(useCallback(() => {
    let active = true;
    const load = async () => {
      setIsLoading(true);
      const [overview, result, approvalResult] = await Promise.all([
        getRoleDashboardData('medico'),
        getDoctorPatients(),
        getPendingMedicationApprovals(),
      ]);
      if (!active) return;
      setData(overview);
      setPatients(result.patients);
      setErrorMessage(result.error ?? '');
      setApprovals(approvalResult.approvals);
      setApprovalError(approvalResult.error ?? '');
      setIsLoading(false);
    };
    void load();
    return () => { active = false; };
  }, []));

  const handleReview = async (medicationId: string, approve: boolean) => {
    setReviewingId(medicationId);
    const result = await reviewMedicationPrescription({ medicationId, approve });
    setReviewingId(null);
    if (!result.success) {
      setApprovalError(result.error ?? 'No se pudo revisar la prescripción.');
      return;
    }
    setApprovals((current) => current.filter((item) => item.id !== medicationId));
  };

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Médico</Text>
          <Text style={styles.title}>Pacientes</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.scanButton} onPress={() => router.push('/qr-scanner' as any)} accessibilityRole="button" accessibilityLabel="Escanear o ingresar código QR de un paciente">
            <Text style={styles.qrText}>QR</Text>
          </Pressable>
          <Pressable style={styles.qrButton} onPress={() => router.push('/medico/patient-new' as any)} accessibilityRole="button" accessibilityLabel="Registrar nuevo paciente">
            <Text style={styles.qrText}>+</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.heroBanner}>
        <Text style={styles.heroLabel}>Supervisión médica</Text>
        <Text style={styles.heroTitle}>{data?.patientName ?? 'Paciente activo'}</Text>
        <Text style={styles.heroMeta}>{data?.patientMeta ?? 'Sin paciente principal'}</Text>
      </View>

      <View style={styles.cardSummary}>
        <Text style={styles.summaryLabel}>Resumen general</Text>
        <Text style={styles.summaryValue}>{data?.summary ?? 'Cargando...'}</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pacientes registrados ({patients.length})</Text>
          <Pressable style={styles.textAction} onPress={() => router.push('/medico/prescription-new' as any)} accessibilityRole="button" accessibilityLabel="Crear prescripción">
            <Text style={styles.textActionLabel}>Prescribir</Text>
          </Pressable>
        </View>
        {isLoading ? <Text style={styles.bodyText}>Cargando pacientes...</Text> : null}
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        {!isLoading && !errorMessage && patients.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.patientName}>Todavía no tienes pacientes registrados</Text>
            <Text style={styles.bodyText}>Registra al primer paciente para poder asociar prescripciones.</Text>
            <Pressable style={styles.addPatientButton} onPress={() => router.push('/medico/patient-new' as any)} accessibilityRole="button" accessibilityLabel="Registrar primer paciente">
              <Text style={styles.addPatientText}>Registrar paciente</Text>
            </Pressable>
          </View>
        ) : null}
        {patients.map((patient) => (
          <View key={patient.id} style={styles.patientCard}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{patient.nombre.split(' ').map((n) => n[0]).slice(0, 2).join('')}</Text></View>
            <Pressable
              style={styles.patientInfo}
              onPress={() => router.push({ pathname: '/medico/patient-history' as any, params: { patientId: patient.id } })}
              accessibilityRole="button"
              accessibilityLabel={`Ver ficha clínica de ${patient.nombre}`}
            >
              <Text style={styles.patientName}>{patient.nombre}</Text>
              <Text style={styles.patientStatus}>Nacimiento: {patient.fecha_nacimiento}</Text>
              <Text style={styles.patientCode}>Abrir historial clínico</Text>
            </Pressable>
            <Pressable onPress={() => router.push({ pathname: '/medico/prescription-new' as any, params: { patientId: patient.id } })} style={styles.prescribeButton} accessibilityRole="button" accessibilityLabel={`Prescribir medicamento a ${patient.nombre}`}>
              <Text style={styles.prescribeText}>+</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Prescripciones pendientes ({approvals.length})</Text>
        {approvalError ? <Text style={styles.errorText}>{approvalError}</Text> : null}
        {!approvalError && !approvals.length ? <Text style={styles.bodyText}>No hay prescripciones pendientes de revisión.</Text> : null}
        {approvals.map((item) => (
          <View key={item.id} style={styles.noteCard}>
            <Text style={styles.approvalPatient}>{item.patientName}</Text>
            <Text style={styles.noteText}>{`${item.name} · ${item.dose} · cada ${item.frequencyHours} h`}</Text>
            <View style={styles.approvalActions}>
              <Pressable
                style={[styles.approveButton, reviewingId === item.id && styles.disabledButton]}
                onPress={() => void handleReview(item.id, true)}
                disabled={reviewingId !== null}
                accessibilityRole="button"
                accessibilityLabel={`Aprobar ${item.name} para ${item.patientName}`}
              >
                <Text style={styles.approveButtonText}>{reviewingId === item.id ? 'Guardando...' : 'Aprobar'}</Text>
              </Pressable>
              <Pressable
                style={[styles.revisionButton, reviewingId === item.id && styles.disabledButton]}
                onPress={() => void handleReview(item.id, false)}
                disabled={reviewingId !== null}
                accessibilityRole="button"
                accessibilityLabel={`Enviar ${item.name} a revisión`}
              >
                <Text style={styles.revisionButtonText}>Rechazar / revisar</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    backgroundColor: '#F0F4F8',
    paddingHorizontal: 20,
    paddingTop: 44,
    paddingBottom: 28,
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
    marginBottom: 4,
  },
  title: {
    color: '#023047',
    fontSize: 28,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scanButton: {
    height: 48,
    minWidth: 58,
    paddingHorizontal: 12,
    backgroundColor: '#006B73',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrButton: {
    width: 48,
    height: 48,
    backgroundColor: '#023047',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrText: {
    color: '#fff',
    fontWeight: '700',
  },
  heroBanner: {
    backgroundColor: '#028090',
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
  },
  heroLabel: {
    color: '#d8f7f7',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  heroMeta: {
    color: '#dff8f8',
    fontSize: 13,
  },
  cardSummary: {
    backgroundColor: '#023047',
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
  },
  summaryLabel: {
    color: '#D8F7F7',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  summaryValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    color: '#4A5568',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00A896',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    color: '#1A1A2E',
    fontWeight: '700',
  },
  patientStatus: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#38A169',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  textAction: {
    backgroundColor: '#006B73',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  textActionLabel: { color: '#fff', fontWeight: '800', fontSize: 13 },
  bodyText: { color: '#334155', fontSize: 14, lineHeight: 20, marginBottom: 10 },
  errorText: { color: '#991B1B', fontSize: 14, lineHeight: 20, marginBottom: 12 },
  emptyState: { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#CBD5E1' },
  addPatientButton: { backgroundColor: '#006B73', borderRadius: 10, alignItems: 'center', paddingVertical: 12, marginTop: 12 },
  addPatientText: { color: '#fff', fontWeight: '800' },
  patientCode: { color: '#475569', fontSize: 11, marginTop: 4 },
  prescribeButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#006B73', alignItems: 'center', justifyContent: 'center' },
  prescribeText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  noteCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  noteText: {
    color: '#4A5568',
    fontSize: 12,
    lineHeight: 18,
  },
  approvalPatient: { color: '#0F172A', fontSize: 14, fontWeight: '800', marginBottom: 4 },
  approvalActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  approveButton: { flex: 1, minHeight: 40, backgroundColor: '#166534', borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  approveButtonText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  revisionButton: { flex: 1, minHeight: 40, backgroundColor: '#FEF3C7', borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  revisionButtonText: { color: '#92400E', fontSize: 12, fontWeight: '800' },
  disabledButton: { opacity: 0.6 },
  primaryButton: {
    marginTop: 10,
    backgroundColor: '#028090',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
