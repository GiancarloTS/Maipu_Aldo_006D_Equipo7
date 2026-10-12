import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getRoleDashboardData, type ScreenData } from '@/lib/linkcare-data';

export default function FamiliarScreen() {
  const [data, setData] = useState<ScreenData | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const next = await getRoleDashboardData('familiar');
      if (active) setData(next);
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Familiar</Text>
          <Text style={styles.title}>Seguimiento</Text>
        </View>
        <Pressable style={styles.qrButton} onPress={() => router.push('/qr-scanner' as any)}>
          <Text style={styles.qrText}>QR</Text>
        </Pressable>
      </View>

      <View style={styles.heroBanner}>
        <Text style={styles.heroLabel}>Seguimiento familiar</Text>
        <Text style={styles.heroTitle}>{data?.patientName ?? 'Cargando...'}</Text>
        <Text style={styles.heroMeta}>{data?.patientMeta ?? 'Cargando...'}</Text>
      </View>

      <View style={styles.cardSummary}>
        <Text style={styles.summaryLabel}>Resumen del día</Text>
        <Text style={styles.summaryValue}>{data?.summary ?? 'Cargando...'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Medicamentos</Text>
        {(data?.medications ?? []).map((item) => (
          <View key={`${item.name}-${item.time}`} style={styles.medicationCard}>
            <View style={styles.icon}><Text style={styles.iconText}>✓</Text></View>
            <View style={styles.medInfo}>
              <Text style={styles.medName}>{item.name}</Text>
              <Text style={styles.medTime}>{item.time}</Text>
            </View>
            <Text style={item.status === 'Tomado' ? styles.okBadge : styles.pendingBadge}>{item.status}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Historial reciente</Text>
        {(data?.history ?? []).map((item) => (
          <View key={item} style={styles.noteCard}>
            <Text style={styles.noteText}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
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
  qrButton: {
    width: 48,
    height: 48,
    backgroundColor: '#02C39A',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrText: {
    color: '#fff',
    fontWeight: '700',
  },
  heroBanner: {
    backgroundColor: '#0f766e',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  heroLabel: {
    color: '#d8fdf1',
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
    color: '#dffcf4',
    fontSize: 13,
  },
  cardSummary: {
    backgroundColor: '#023047',
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
  },
  summaryLabel: {
    color: '#A7F3D0',
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
  medicationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  icon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#00A896',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  iconText: {
    color: '#fff',
    fontWeight: '700',
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    color: '#1A1A2E',
    fontWeight: '700',
    marginBottom: 3,
  },
  medTime: {
    color: '#64748B',
    fontSize: 12,
  },
  okBadge: {
    color: '#38A169',
    backgroundColor: '#DFF7ED',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 10,
    fontWeight: '700',
  },
  pendingBadge: {
    color: '#B7791F',
    backgroundColor: '#FFF4D5',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 10,
    fontWeight: '700',
  },
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
