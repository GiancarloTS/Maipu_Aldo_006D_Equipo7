import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getMedicationHistoryData, getProfileSettingsData, type MedicationHistoryItem } from '@/lib/linkcare-data';

const filters = ['7 días', '30 días', '90 días'] as const;

const parseDateValue = (value: string): number => {
  const normalized = value.trim();
  const [dayPart, monthPart, yearPart] = normalized.split('/');

  if (!dayPart || !monthPart || !yearPart) {
    return Number.NaN;
  }

  const day = Number(dayPart);
  const month = Number(monthPart);
  const year = Number(yearPart);

  if ([day, month, year].some((part) => Number.isNaN(part))) {
    return Number.NaN;
  }

  return new Date(year, month - 1, day).getTime();
};

export default function MedicationHistoryScreen() {
  const [selectedFilter, setSelectedFilter] = useState<(typeof filters)[number]>('7 días');
  const [history, setHistory] = useState<MedicationHistoryItem[]>([]);
  const [linkedPatients, setLinkedPatients] = useState<string[]>([]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const [next, profile] = await Promise.all([
        getMedicationHistoryData(),
        getProfileSettingsData(),
      ]);

      if (active) {
        setHistory(next);
        setLinkedPatients(profile.linkedPatients ?? []);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const daysMap = {
    '7 días': 7,
    '30 días': 30,
    '90 días': 90,
  } as const;

  const visibleHistory = history.filter((item) => {
    const cutoff = daysMap[selectedFilter];
    const itemDate = parseDateValue(item.date);

    if (Number.isNaN(itemDate)) {
      return true;
    }

    const diffInDays = (Date.now() - itemDate) / (1000 * 60 * 60 * 24);
    return diffInDays <= cutoff;
  });

  const hasPatient = linkedPatients.length > 0;
  const takenCount = history.filter((item) => item.status === 'Administrada').length;
  const missedCount = history.filter((item) => item.status === 'No administrada').length;

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.title}>Historial</Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{takenCount}</Text>
          <Text style={styles.summaryLabel}>Administradas</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{missedCount}</Text>
          <Text style={styles.summaryLabel}>Pendientes</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {filters.map((item) => (
          <Pressable
            key={item}
            onPress={() => setSelectedFilter(item)}
            style={[styles.filterPill, selectedFilter === item && styles.filterPillActive]}
          >
            <Text style={[styles.filterText, selectedFilter === item && styles.filterTextActive]}>{item}</Text>
          </Pressable>
        ))}
      </View>

      {!hasPatient && (
        <View style={styles.emptyStateCard}>
          <Text style={styles.emptyStateTitle}>No hay paciente asociado</Text>
          <Text style={styles.emptyStateText}>Vincula un paciente para ver el historial real de medicación.</Text>
          <Pressable style={styles.emptyStateButton} onPress={() => router.push('/profile-settings' as any)}>
            <Text style={styles.emptyStateButtonText}>Vincular paciente</Text>
          </Pressable>
        </View>
      )}

      {visibleHistory.map((item) => (
        <View key={`${item.name}-${item.date}`} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.medName}>{item.name}</Text>
            <Text style={[styles.statusBadge, item.status === 'Administrada' ? styles.ok : styles.missed]}>{item.status}</Text>
          </View>
          <Text style={styles.meta}>Fecha: {item.date}</Text>
          <Text style={styles.meta}>Registrado por: {item.recorder}</Text>
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
    fontSize: 28,
    fontWeight: '800',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#dfeaf1',
    alignItems: 'center',
  },
  summaryValue: {
    color: '#023047',
    fontSize: 24,
    fontWeight: '800',
  },
  summaryLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  filterPill: {
    backgroundColor: '#fff',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#dfeaf1',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterPillActive: {
    backgroundColor: '#028090',
    borderColor: '#028090',
  },
  filterText: {
    color: '#023047',
    fontWeight: '700',
  },
  filterTextActive: {
    color: '#fff',
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
  medName: {
    color: '#023047',
    fontSize: 17,
    fontWeight: '800',
  },
  statusBadge: {
    borderRadius: 999,
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  ok: {
    backgroundColor: '#dff7ed',
    color: '#15803d',
  },
  missed: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
  },
  meta: {
    color: '#475569',
    fontSize: 13,
    marginBottom: 4,
  },
});
