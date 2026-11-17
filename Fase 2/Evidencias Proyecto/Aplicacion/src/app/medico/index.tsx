import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChevronRight, QrCode, Search, UserRound, UserRoundPlus } from 'lucide-react-native';

import { getDoctorPatients, getPendingMedicationApprovals, reviewMedicationPrescription, type DoctorPatient, type PendingMedicationApproval } from '@/lib/linkcare-data';

export default function MedicoScreen() {
  const [patients, setPatients] = useState<DoctorPatient[]>([]);
  const [approvals, setApprovals] = useState<PendingMedicationApproval[]>([]);
  const [approvalError, setApprovalError] = useState('');
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [patientSearch, setPatientSearch] = useState('');

  useFocusEffect(useCallback(() => {
    let active = true;
    const load = async () => {
      setIsLoading(true);
      const [result, approvalResult] = await Promise.all([
        getDoctorPatients(),
        getPendingMedicationApprovals(),
      ]);
      if (!active) return;
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
    try {
      const result = await reviewMedicationPrescription({ medicationId, approve });
      if (!result.success) {
        setApprovalError(result.error ?? 'No se pudo revisar la prescripción.');
        return;
      }
      setApprovals((current) => current.filter((item) => item.id !== medicationId));
    } catch (error) {
      setApprovalError(error instanceof Error ? error.message : 'No se pudo revisar la prescripción.');
    } finally {
      setReviewingId(null);
    }
  };

  const filteredPatients = patients.filter((patient) =>
    patient.nombre.toLocaleLowerCase('es').includes(patientSearch.trim().toLocaleLowerCase('es')),
  );

  return (
    <ScrollView
      contentContainerStyle={styles.screen}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>LINKCARE · EQUIPO MÉDICO</Text>
          <Text style={styles.title}>Panel clínico</Text>
          <Text style={styles.headerSubtitle}>Pacientes, tratamientos y revisiones en un mismo lugar.</Text>
        </View>
        <Pressable
          style={styles.profileButton}
          onPress={() => router.push('/profile-settings' as any)}
          accessibilityRole="button"
          accessibilityLabel="Abrir perfil y ajustes"
        >
          <UserRound size={21} color="#023047" />
        </Pressable>
      </View>

      <View style={styles.heroBanner}>
        <Text style={styles.heroLabel}>SUPERVISIÓN MÉDICA</Text>
        <Text style={styles.heroTitle}>Cuidado coordinado, información clara.</Text>
        <Text style={styles.heroMeta}>Accede a las fichas clínicas y gestiona las prescripciones de tus pacientes.</Text>
        <View style={styles.heroActions}>
          <Pressable
            style={styles.heroPrimaryAction}
            onPress={() => router.push('/medico/patient-new' as any)}
            accessibilityRole="button"
            accessibilityLabel="Registrar un paciente"
          >
            <UserRoundPlus size={18} color="#fff" />
            <Text style={styles.heroPrimaryActionText}>Nuevo paciente</Text>
          </Pressable>
          <Pressable
            style={styles.heroSecondaryAction}
            onPress={() => router.push('/qr-scanner' as any)}
            accessibilityRole="button"
            accessibilityLabel="Escanear o ingresar código QR de un paciente"
          >
            <QrCode size={18} color="#fff" />
            <Text style={styles.heroSecondaryActionText}>Escanear QR</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{isLoading ? '—' : patients.length}</Text>
          <Text style={styles.metricLabel}>Pacientes registrados</Text>
        </View>
        <View style={[styles.metricCard, styles.metricCardAttention]}>
          <Text style={styles.metricValue}>{isLoading ? '—' : approvals.length}</Text>
          <Text style={styles.metricLabel}>Prescripciones por revisar</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Revisión de prescripciones</Text>
            <Text style={styles.sectionSubtitle}>Pendientes de aprobación</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{approvals.length}</Text>
          </View>
        </View>
        {approvalError ? <Text style={styles.errorText}>{approvalError}</Text> : null}
        {isLoading ? <Text style={styles.bodyText}>Cargando revisiones...</Text> : null}
        {!isLoading && !approvalError && !approvals.length ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Todo revisado</Text>
            <Text style={styles.bodyText}>No hay prescripciones pendientes de aprobación.</Text>
          </View>
        ) : null}
        {approvals.map((item) => (
          <View key={item.id} style={styles.approvalCard}>
            <View style={styles.approvalHeader}>
              <View style={styles.approvalIcon}>
                <Text style={styles.approvalIconText}>Rx</Text>
              </View>
              <View style={styles.approvalInfo}>
                <Text style={styles.approvalPatient}>{item.patientName}</Text>
                <Text style={styles.noteText}>{item.name}</Text>
              </View>
              <View style={styles.pendingBadge}><Text style={styles.pendingBadgeText}>Revisar</Text></View>
            </View>
            <Text style={styles.approvalDose}>{`${item.dose} · cada ${item.frequencyHours} h`}</Text>
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
                <Text style={styles.revisionButtonText}>Enviar a revisión</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Mis pacientes</Text>
            <Text style={styles.sectionSubtitle}>{isLoading ? 'Cargando...' : `${patients.length} registrados`}</Text>
          </View>
          <Pressable
            style={styles.textAction}
            onPress={() => router.push('/medico/prescription-new' as any)}
            accessibilityRole="button"
            accessibilityLabel="Crear una prescripción"
          >
            <Text style={styles.textActionLabel}>Prescribir</Text>
          </Pressable>
        </View>

        <View style={styles.searchBox}>
          <Search size={18} color="#64748B" />
          <TextInput
            value={patientSearch}
            onChangeText={setPatientSearch}
            placeholder="Buscar por nombre"
            placeholderTextColor="#64748B"
            style={styles.searchInput}
            accessibilityLabel="Buscar paciente por nombre"
            returnKeyType="search"
          />
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        {isLoading ? <Text style={styles.bodyText}>Cargando pacientes...</Text> : null}
        {!isLoading && !errorMessage && !patients.length ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Aún no tienes pacientes</Text>
            <Text style={styles.bodyText}>Registra a una persona para consultar su ficha y gestionar sus tratamientos.</Text>
            <Pressable style={styles.addPatientButton} onPress={() => router.push('/medico/patient-new' as any)} accessibilityRole="button" accessibilityLabel="Registrar primer paciente">
              <Text style={styles.addPatientText}>Registrar paciente</Text>
            </Pressable>
          </View>
        ) : null}
        {!isLoading && patients.length > 0 && !filteredPatients.length ? (
          <Text style={styles.emptySearch}>No encontramos pacientes con ese nombre.</Text>
        ) : null}
        {filteredPatients.map((patient) => (
          <View key={patient.id} style={styles.patientCard}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{patient.nombre.split(' ').map((n) => n[0]).slice(0, 2).join('')}</Text></View>
            <Pressable
              style={({ pressed }) => [styles.patientInfo, pressed && styles.patientInfoPressed]}
              onPress={() => router.push({ pathname: '/medico/patient-history' as any, params: { patientId: patient.id } })}
              accessibilityRole="button"
              accessibilityLabel={`Ver ficha clínica de ${patient.nombre}`}
            >
              <Text style={styles.patientName}>{patient.nombre}</Text>
              <Text style={styles.patientStatus}>Nacimiento: {patient.fecha_nacimiento}</Text>
              <Text style={styles.patientCode}>Abrir ficha clínica</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push({ pathname: '/medico/prescription-new' as any, params: { patientId: patient.id } })}
              style={styles.prescribeButton}
              accessibilityRole="button"
              accessibilityLabel={`Prescribir medicamento a ${patient.nombre}`}
            >
              <Text style={styles.prescribeText}>+</Text>
            </Pressable>
            <Pressable
              style={styles.openPatientButton}
              onPress={() => router.push({ pathname: '/medico/patient-history' as any, params: { patientId: patient.id } })}
              accessibilityRole="button"
              accessibilityLabel={`Abrir ficha clínica de ${patient.nombre}`}
            >
              <ChevronRight size={18} color="#64748B" />
            </Pressable>
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
  headerCopy: {
    flex: 1,
    paddingRight: 10,
  },
  eyebrow: {
    color: '#006B73',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  title: {
    color: '#023047',
    fontSize: 30,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  profileButton: {
    width: 48,
    height: 48,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DCEAF1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  heroBanner: {
    backgroundColor: '#023047',
    borderRadius: 22,
    padding: 20,
    marginBottom: 14,
  },
  heroLabel: {
    color: '#9BE3D5',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 23,
    fontWeight: '800',
    lineHeight: 29,
    marginBottom: 7,
  },
  heroMeta: {
    color: '#D5E8EE',
    fontSize: 13,
    lineHeight: 19,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 17,
  },
  heroPrimaryAction: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 9,
    backgroundColor: '#008B9A',
    borderRadius: 12,
  },
  heroPrimaryActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  heroSecondaryAction: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 9,
    borderColor: '#4C7887',
    borderWidth: 1,
    borderRadius: 12,
  },
  heroSecondaryActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    minHeight: 88,
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DCEAF1',
    padding: 15,
  },
  metricCardAttention: {
    backgroundColor: '#E6F4F2',
    borderColor: '#C4E8E2',
  },
  metricValue: {
    color: '#023047',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 3,
  },
  metricLabel: {
    color: '#475569',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#023047',
    fontSize: 18,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 3,
  },
  countBadge: {
    minWidth: 30,
    height: 30,
    paddingHorizontal: 8,
    borderRadius: 15,
    backgroundColor: '#DDF3EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    color: '#006B73',
    fontSize: 13,
    fontWeight: '800',
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 11,
    borderWidth: 1,
    borderColor: '#DCEAF1',
    marginBottom: 10,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#028090',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
  },
  patientInfo: {
    flex: 1,
    paddingVertical: 5,
    paddingRight: 5,
  },
  patientInfoPressed: {
    opacity: 0.7,
  },
  patientName: {
    color: '#023047',
    fontSize: 14,
    fontWeight: '800',
  },
  patientStatus: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  patientCode: { color: '#475569', fontSize: 11, marginTop: 4 },
  prescribeButton: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#E6F4F2', alignItems: 'center', justifyContent: 'center', marginRight: 3 },
  prescribeText: { color: '#006B73', fontSize: 22, fontWeight: '800' },
  openPatientButton: {
    width: 28,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#fff',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#DCEAF1',
    paddingHorizontal: 13,
    marginTop: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    minHeight: 44,
    color: '#023047',
    fontSize: 14,
  },
  emptySearch: {
    color: '#475569',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DCEAF1',
    fontSize: 13,
  },
  noteText: {
    color: '#334155',
    fontSize: 13,
    lineHeight: 18,
  },
  approvalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DCEAF1',
    padding: 14,
    marginBottom: 10,
  },
  approvalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  approvalIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: '#E6F4F2',
  },
  approvalIconText: {
    color: '#006B73',
    fontSize: 14,
    fontWeight: '900',
  },
  approvalInfo: {
    flex: 1,
  },
  approvalPatient: { color: '#023047', fontSize: 14, fontWeight: '800', marginBottom: 2 },
  pendingBadge: {
    backgroundColor: '#FFF4D5',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  pendingBadgeText: { color: '#9A5B00', fontSize: 10, fontWeight: '800' },
  approvalDose: {
    color: '#475569',
    fontSize: 12,
    marginTop: 11,
  },
  approvalActions: { flexDirection: 'row', gap: 9, marginTop: 13 },
  approveButton: { flex: 1, minHeight: 42, backgroundColor: '#006B73', borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  approveButtonText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  revisionButton: { flex: 1, minHeight: 42, backgroundColor: '#FFF4D5', borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  revisionButtonText: { color: '#8A4B08', fontSize: 12, fontWeight: '800' },
  disabledButton: { opacity: 0.6 },
  emptyTitle: {
    color: '#023047',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  emptyState: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#DCEAF1' },
  addPatientButton: { backgroundColor: '#006B73', borderRadius: 11, alignItems: 'center', paddingVertical: 12, marginTop: 10 },
  addPatientText: { color: '#fff', fontWeight: '800' },
  textAction: { backgroundColor: '#006B73', paddingHorizontal: 13, paddingVertical: 9, borderRadius: 11 },
  textActionLabel: { color: '#fff', fontWeight: '800', fontSize: 12 },
  bodyText: { color: '#475569', fontSize: 13, lineHeight: 19, marginBottom: 8 },
  errorText: { color: '#991B1B', backgroundColor: '#FEF2F2', borderRadius: 11, padding: 12, fontSize: 13, lineHeight: 19, marginBottom: 10 },
});
