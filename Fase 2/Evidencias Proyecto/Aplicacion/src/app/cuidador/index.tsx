import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getRoleDashboardData, type ScreenData } from '@/lib/linkcare-data';

export default function CuidadorScreen() {
  const [data, setData] = useState<ScreenData | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const next = await getRoleDashboardData('cuidador');
      if (active) setData(next);
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const medications = data?.medications ?? [];
  const alerts = data?.alerts ?? [];

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Cuidador</Text>
          <Text style={styles.title}>Panel de atención</Text>
        </View>
        <Pressable style={styles.qrButton} onPress={() => router.push('/qr-scanner' as any)}>
          <Text style={styles.qrText}>QR</Text>
        </Pressable>
      </View>

      <View style={styles.heroBanner}>
        <Text style={styles.heroLabel}>Atención activa</Text>
        <Text style={styles.heroTitle}>{data?.patientName ?? 'Cargando...'}</Text>
        <Text style={styles.heroMeta}>{data?.patientMeta ?? 'Cargando...'}</Text>
      </View>

      <View style={styles.rowCards}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{medications.length || 0}</Text>
          <Text style={styles.statLabel}>Medicamentos</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{alerts.length || 0}</Text>
          <Text style={styles.statLabel}>Alertas</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Medicamentos del día</Text>

        {medications.map((item) => (
          <View key={`${item.name}-${item.time}`} style={styles.medicationCard}>
            <View style={styles.icon}><Text style={styles.iconText}>+</Text></View>
            <View style={styles.medInfo}>
              <Text style={styles.medName}>{item.name}</Text>
              <Text style={styles.medTime}>{item.time}</Text>
            </View>
            <Text style={item.status === 'Tomado' ? styles.okBadge : styles.pendingBadge}>{item.status}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Alertas</Text>
        {alerts.map((alert) => (
          <View key={alert} style={styles.alertRow}>
            <View style={styles.alertDot} />
            <Text style={styles.alertText}>{alert}</Text>
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
    backgroundColor: '#028090',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrText: {
    color: '#fff',
    fontWeight: '700',
  },
  heroBanner: {
    backgroundColor: '#023047',
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
  },
  heroLabel: {
    color: '#c8ecf1',
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
    color: '#dfeef2',
    fontSize: 13,
  },
  rowCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statValue: {
    color: '#023047',
    fontSize: 28,
    fontWeight: '700',
  },
  statLabel: {
    color: '#4A5568',
    fontSize: 12,
    marginTop: 4,
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
    backgroundColor: '#02C39A',
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
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  alertDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E53E3E',
    marginRight: 10,
  },
  alertText: {
    color: '#4A5568',
    fontSize: 12,
    flex: 1,
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
