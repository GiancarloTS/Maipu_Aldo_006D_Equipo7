import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getMedicalPatientHistory, type MedicalPatientHistoryData } from '@/lib/linkcare-data';
import { formatTime, mapStatus } from '@/lib/linkcare-utils';

export default function MedicalPatientHistoryScreen() {
  const { patientId } = useLocalSearchParams<{ patientId?: string }>();
  const [data, setData] = useState<MedicalPatientHistoryData | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (typeof patientId !== 'string' || !patientId) {
        setErrorMessage('Falta identificar al paciente.');
        setIsLoading(false);
        return;
      }

      const result = await getMedicalPatientHistory(patientId);
      if (!active) return;
      setData(result.data ?? null);
      setErrorMessage(result.error ?? '');
      setIsLoading(false);
    };

    void load();
    return () => { active = false; };
  }, [patientId]);

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Volver a pacientes">
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>Equipo médico</Text>
          <Text style={styles.title}>Ficha clínica</Text>
        </View>
      </View>

      {isLoading ? <Text style={styles.message}>Cargando ficha clínica...</Text> : null}
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      {data ? (
        <>
          <View style={styles.patientHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{data.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</Text>
            </View>
            <View style={styles.patientIdentity}>
              <Text style={styles.patientName}>{data.name}</Text>
              <Text style={styles.patientMeta}>{data.age}</Text>
            </View>
          </View>

          <View style={styles.keyFacts}>
            <View style={styles.fact}>
              <Text style={styles.factLabel}>Alergias</Text>
              <Text style={styles.factValue}>{data.allergies}</Text>
            </View>
            <View style={styles.fact}>
              <Text style={styles.factLabel}>Emergencia</Text>
              <Text style={styles.factValue}>{data.emergencyContact}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Medicamentos</Text>
              <Text style={styles.count}>{data.medications.length}</Text>
            </View>
            {data.medications.length ? data.medications.map((medication) => (
              <View key={medication.id} style={styles.medicationRow}>
                <View style={styles.medicationMain}>
                  <Text style={styles.medicationName}>{medication.name}</Text>
                  <Text style={styles.detail}>{medication.dose} · cada {medication.frequencyHours} h</Text>
                  <Text style={styles.detail}>{formatTime(medication.startTime)} · desde {medication.startDate}{medication.endDate ? ` hasta ${medication.endDate}` : ''}</Text>
                </View>
                <Text style={[styles.status, medication.status === 'administrado' ? styles.statusDone : styles.statusPending]}>
                  {mapStatus(medication.status)}
                </Text>
              </View>
            )) : <Text style={styles.emptyText}>Sin prescripciones registradas.</Text>}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Actividad clínica</Text>
              <Text style={styles.count}>{data.events.length}</Text>
            </View>
            {data.events.length ? data.events.map((event) => (
              <View key={event.id} style={styles.eventRow}>
                <View style={styles.eventMarker} />
                <View style={styles.eventBody}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.detail}>{event.detail}</Text>
                  <Text style={styles.eventMeta}>{new Date(event.occurredAt).toLocaleString('es-CL')} · {event.recordedBy}</Text>
                </View>
              </View>
            )) : <Text style={styles.emptyText}>Sin administraciones ni anotaciones registradas.</Text>}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, backgroundColor: '#F0F4F8', paddingHorizontal: 20, paddingTop: 36, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  backButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  backText: { color: '#023047', fontSize: 20, fontWeight: '700' },
  headerText: { flex: 1 },
  eyebrow: { color: '#006B73', fontSize: 12, fontWeight: '700' },
  title: { color: '#0F172A', fontSize: 25, fontWeight: '800' },
  message: { color: '#334155', fontSize: 15, paddingVertical: 18 },
  error: { color: '#991B1B', backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14, lineHeight: 20 },
  patientHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#CBD5E1', marginBottom: 12 },
  avatar: { width: 48, height: 48, borderRadius: 15, backgroundColor: '#006B73', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontWeight: '800' },
  patientIdentity: { flex: 1 },
  patientName: { color: '#0F172A', fontSize: 20, fontWeight: '800' },
  patientMeta: { color: '#475569', marginTop: 3 },
  keyFacts: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  fact: { flex: 1, padding: 13, borderRadius: 12, backgroundColor: '#E6F4F2' },
  factLabel: { color: '#00545B', fontSize: 11, fontWeight: '800', marginBottom: 5 },
  factValue: { color: '#0F172A', fontSize: 13, lineHeight: 18, fontWeight: '600' },
  section: { marginBottom: 18 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionTitle: { color: '#0F172A', fontSize: 17, fontWeight: '800' },
  count: { color: '#475569', fontSize: 12, fontWeight: '700' },
  medicationRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 13, backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#CBD5E1' },
  medicationMain: { flex: 1 },
  medicationName: { color: '#0F172A', fontSize: 15, fontWeight: '800', marginBottom: 3 },
  detail: { color: '#334155', fontSize: 12, lineHeight: 17 },
  status: { overflow: 'hidden', borderRadius: 9, paddingHorizontal: 8, paddingVertical: 5, fontSize: 11, fontWeight: '800' },
  statusDone: { color: '#166534', backgroundColor: '#DCFCE7' },
  statusPending: { color: '#92400E', backgroundColor: '#FEF3C7' },
  emptyText: { color: '#475569', backgroundColor: '#fff', padding: 14, borderRadius: 12, lineHeight: 20 },
  eventRow: { flexDirection: 'row', gap: 11, paddingVertical: 10 },
  eventMarker: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#008B9A', marginTop: 5 },
  eventBody: { flex: 1, paddingBottom: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#CBD5E1' },
  eventTitle: { color: '#0F172A', fontSize: 14, fontWeight: '800', marginBottom: 3 },
  eventMeta: { color: '#64748B', fontSize: 11, marginTop: 4 },
});
