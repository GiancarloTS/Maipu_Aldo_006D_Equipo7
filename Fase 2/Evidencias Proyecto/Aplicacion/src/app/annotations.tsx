import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getDashboardOverviewData, getProfileSettingsData, type DashboardOverviewData } from '@/lib/linkcare-data';

const categories = ['Todo', 'Observación', 'Constantes', 'Alerta'] as const;

export default function AnnotationsTimelineScreen() {
  const [selectedCategory, setSelectedCategory] = useState<(typeof categories)[number]>('Todo');
  const [data, setData] = useState<DashboardOverviewData | null>(null);
  const [linkedPatients, setLinkedPatients] = useState<string[]>([]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const [next, profile] = await Promise.all([
        getDashboardOverviewData(),
        getProfileSettingsData(),
      ]);

      if (active) {
        setData(next);
        setLinkedPatients(profile.linkedPatients ?? []);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const timeline = (data?.annotations ?? []).map((item, index) => {
    const category = item.title || 'Observación';

    return {
      category,
      title: item.detail,
      author: item.author,
      date: `Registro ${index + 1}`,
    };
  });

  const visibleItems = selectedCategory === 'Todo' ? timeline : timeline.filter((item) => item.category === selectedCategory);
  const hasPatient = linkedPatients.length > 0;

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.title}>Cronología clínica</Text>
      </View>

      {!hasPatient && (
        <View style={styles.emptyStateCard}>
          <Text style={styles.emptyStateTitle}>Sin paciente vinculado</Text>
          <Text style={styles.emptyStateText}>Vincula un paciente para ver la cronología y registrar observaciones reales.</Text>
          <Pressable style={styles.emptyStateButton} onPress={() => router.push('/profile-settings' as any)}>
            <Text style={styles.emptyStateButtonText}>Vincular paciente</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.filterRow}>
        {categories.map((category) => (
          <Pressable key={category} onPress={() => setSelectedCategory(category)} style={[styles.filterPill, selectedCategory === category && styles.filterPillActive]}>
            <Text style={[styles.filterText, selectedCategory === category && styles.filterTextActive]}>{category}</Text>
          </Pressable>
        ))}
      </View>

      {visibleItems.map((item) => (
        <View key={`${item.date}-${item.title}`} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.categoryTag}>{item.category}</Text>
            <Text style={styles.dateText}>{item.date}</Text>
          </View>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.author}>Autor: {item.author}</Text>
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
    backgroundColor: '#e0f2fe',
    borderRadius: 999,
    color: '#0369a1',
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
    marginBottom: 8,
  },
  author: {
    color: '#475569',
    fontSize: 12,
  },
});
