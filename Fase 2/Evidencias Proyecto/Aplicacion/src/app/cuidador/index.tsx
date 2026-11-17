import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { UserRound } from 'lucide-react-native';

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
    <ScrollView contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>LINKCARE · CUIDADOR</Text>
          <Text style={styles.title}>Panel de atención</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.qrButton} onPress={() => router.push('/qr-scanner' as any)} accessibilityRole="button" accessibilityLabel="Escanear código QR">
            <Text style={styles.qrText}>QR</Text>
          </Pressable>
          <Pressable style={styles.profileButton} onPress={() => router.push('/profile-settings' as any)} accessibilityRole="button" accessibilityLabel="Abrir perfil">
            <UserRound size={20} color="#023047" />
          </Pressable>
        </View>
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
          <View key={item.id} style={styles.medicationCard}>
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
    color: '#006B73',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  title: {
    color: '#023047',
    fontSize: 25,
    fontWeight: '800',
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  profileButton: { width: 46, height: 46, backgroundColor: '#fff', borderRadius: 15, borderWidth: 1, borderColor: '#DCEAF1', alignItems: 'center', justifyContent: 'center' },
  qrButton: {
    width: 46,
    height: 46,
    backgroundColor: '#006B73',
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrText: {
    color: '#fff',
    fontWeight: '700',
  },
  heroBanner: {
    backgroundColor: '#023047',
    borderRadius: 22,
    padding: 20,
    marginBottom: 18,
  },
  heroLabel: {
    color: '#9BE3D5',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 23,
    fontWeight: '800',
    marginBottom: 4,
  },
  heroMeta: {
    color: '#D5E8EE',
    fontSize: 13,
    lineHeight: 19,
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
    borderColor: '#DCEAF1',
  },
  statValue: {
    color: '#023047',
    fontSize: 28,
    fontWeight: '700',
  },
  statLabel: {
    color: '#475569',
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
    backgroundColor: '#028090',
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
    color: '#023047',
    fontWeight: '800',
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
    borderColor: '#DCEAF1',
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
