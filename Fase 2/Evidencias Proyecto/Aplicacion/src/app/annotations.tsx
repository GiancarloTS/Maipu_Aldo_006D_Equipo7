import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getMedicalPatientHistory, getProfileSettingsData, type MedicalPatientHistoryData } from '@/lib/linkcare-data';

const categories = ['Todo', 'Medicamentos', 'Observaciones', 'Salud'] as const;

export default function AnnotationsTimelineScreen() {
  const { patientId: requestedPatientId } = useLocalSearchParams<{ patientId?: string }>();
  const [selectedCategory, setSelectedCategory] = useState<(typeof categories)[number]>('Todo');
  const [data, setData] = useState<MedicalPatientHistoryData | null>(null);
  const [patientId, setPatientId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage('');
      setData(null);
      const profile = await getProfileSettingsData();
      const selectedPatientId = typeof requestedPatientId === 'string' && requestedPatientId
        ? requestedPatientId
        : (profile.linkedPatientRecords.find((patient) => patient.isPrimary) ?? profile.linkedPatientRecords[0])?.id ?? '';

      if (!selectedPatientId) {
        if (active) {
          setData(null);
          setPatientId('');
          setIsLoading(false);
        }
        return;
      }

      const result = await getMedicalPatientHistory(selectedPatientId);
      if (!active) return;
      setPatientId(selectedPatientId);
      setData(result.data ?? null);
      setErrorMessage(result.error ?? '');
      setIsLoading(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, [requestedPatientId]);

  const timeline = data?.events ?? [];
  const visibleItems = selectedCategory === 'Todo'
    ? timeline
    : timeline.filter((item) => item.category === selectedCategory);

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <View>
          <Text style={styles.eyebrow}>HISTORIAL DEL PACIENTE</Text>
          <Text style={styles.title}>Cronología clínica</Text>
        </View>
      </View>

      {data ? <Text style={styles.patientName}>{data.name}</Text> : null}

      {isLoading ? <Text style={styles.emptyStateText}>Cargando historial clínico...</Text> : null}
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      {!isLoading && !patientId && (
        <View style={styles.emptyStateCard}>
          <Text style={styles.emptyStateTitle}>Sin paciente vinculado</Text>
          <Text style={styles.emptyStateText}>Vincula un paciente para ver la cronología y registrar observaciones reales.</Text>
          <Pressable style={styles.emptyStateButton} onPress={() => router.push('/profile-settings' as any)}>
            <Text style={styles.emptyStateButtonText}>Vincular paciente</Text>
          </Pressable>
        </View>
      )}

      {patientId ? (
        <View style={styles.filterRow}>
          {categories.map((category) => (
            <Pressable key={category} onPress={() => setSelectedCategory(category)} style={[styles.filterPill, selectedCategory === category && styles.filterPillActive]}>
              <Text style={[styles.filterText, selectedCategory === category && styles.filterTextActive]}>{category}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {!isLoading && data && !visibleItems.length ? (
        <Text style={styles.emptyStateText}>No hay registros para mostrar en esta categoría.</Text>
      ) : null}

      {visibleItems.map((item) => (
        <View key={item.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.categoryTag}>{item.category}</Text>
            <Text style={styles.dateText}>{new Date(item.occurredAt).toLocaleString('es-CL')}</Text>
          </View>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.eventDetail}>{item.detail}</Text>
          <Text style={styles.author}>Registrado por: {item.recordedBy}</Text>
        </View>
      ))}
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
    marginBottom: 18,
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
    fontSize: 24,
    fontWeight: '800',
  },
  eyebrow: {
    color: '#006B73',
    fontSize: 10,
    letterSpacing: 0.8,
    fontWeight: '800',
    marginBottom: 2,
  },
  patientName: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 14,
  },
  errorText: {
    color: '#991b1b',
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 14,
    lineHeight: 20,
    marginBottom: 14,
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
    backgroundColor: '#006B73',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptyStateButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  filterPill: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dfeaf1',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterPillActive: {
    backgroundColor: '#006B73',
    borderColor: '#006B73',
  },
  filterText: {
    color: '#023047',
    fontWeight: '700',
  },
  filterTextActive: {
    color: '#fff',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#dfeaf1',
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryTag: {
    backgroundColor: '#E6F4F2',
    borderRadius: 999,
    color: '#006B73',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  dateText: {
    color: '#64748b',
    fontSize: 11,
  },
  cardTitle: {
    color: '#023047',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  eventDetail: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  author: {
    color: '#475569',
    fontSize: 12,
  },
});
