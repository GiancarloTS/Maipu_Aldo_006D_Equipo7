import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { getPatientSummaryData, getProfileSettingsData, type PatientSummaryData } from '@/lib/linkcare-data';

export default function QRPatientSummaryScreen() {
  const { patientId } = useLocalSearchParams<{ patientId?: string }>();
  const [data, setData] = useState<PatientSummaryData | null>(null);
  const [linkedPatients, setLinkedPatients] = useState<string[]>([]);
  const [activePatientId, setActivePatientId] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      const [next, profile] = await Promise.all([
        getPatientSummaryData(typeof patientId === 'string' ? patientId : undefined),
        getProfileSettingsData(),
      ]);

      if (active) {
        setData(next);
        setLinkedPatients(profile.linkedPatients ?? []);
        setActivePatientId(
          typeof patientId === 'string' && patientId
            ? patientId
            : (profile.linkedPatientRecords.find((patient) => patient.isPrimary) ?? profile.linkedPatientRecords[0])?.id ?? '',
        );
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [patientId]);

  const criticalData = [
    { label: 'Diagnóstico principal', value: data?.diagnosis ?? 'Sin datos' },
    { label: 'Alergias', value: data?.allergies ?? 'Sin datos' },
    { label: 'Medicamentos críticos', value: data?.medicines ?? 'Sin datos' },
    { label: 'Contacto de emergencia', value: data?.emergencyContact ?? 'Sin datos' },
  ];

  const hasPatient = linkedPatients.length > 0;

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <View>
          <Text style={styles.eyebrow}>INFORMACIÓN PARA EL CUIDADO</Text>
          <Text style={styles.title}>Ficha del paciente</Text>
        </View>
      </View>

      {!hasPatient && (
        <View style={styles.emptyStateCard}>
          <Text style={styles.emptyStateTitle}>No hay un paciente vinculado</Text>
          <Text style={styles.emptyStateText}>Registra un paciente o vincula uno existente con su token QR.</Text>
          <Pressable style={styles.emptyStateButton} onPress={() => router.push('/profile-settings' as any)}>
            <Text style={styles.emptyStateButtonText}>Vincular paciente</Text>
          </Pressable>
          <Pressable style={styles.registerButton} onPress={() => router.push('/patient-new' as any)} accessibilityRole="button" accessibilityLabel="Registrar paciente">
            <Text style={styles.registerButtonText}>Registrar paciente</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.profileHeader}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{(data?.name ?? 'Paciente').split(' ').map((part) => part[0]).slice(0, 2).join('')}</Text></View>
        <View>
          <Text style={styles.name}>{data?.name ?? 'Cargando paciente...'}</Text>
          <Text style={styles.meta}>{data?.age ?? 'Edad no disponible'} · {data?.location ?? 'Ubicación no disponible'}</Text>
        </View>
      </View>

      {criticalData.map((item) => (
        <View key={item.label} style={styles.infoCard}>
          <Text style={styles.label}>{item.label}</Text>
          <Text style={styles.value}>{item.value}</Text>
        </View>
      ))}

      <View style={styles.qrCard}>
        <Text style={styles.qrLabel}>QR para mostrar al equipo médico</Text>
        {hasPatient && data?.qrCode ? (
          <View style={styles.qrCodeFrame}>
            <QRCode value={data.qrCode} size={190} backgroundColor="#FFFFFF" color="#0F172A" />
          </View>
        ) : (
          <Text style={styles.qrValue}>Registra o vincula un paciente para generar su QR.</Text>
        )}
        {data?.qrCode ? <Text style={styles.qrToken}>{data.qrCode}</Text> : null}
      </View>

      <Pressable
        style={styles.primaryButton}
        onPress={() => router.push({ pathname: '/annotations' as any, params: { patientId: activePatientId } })}
        accessibilityRole="button"
        accessibilityLabel="Ver historial clínico completo"
      >
        <Text style={styles.primaryText}>Ver historial clínico completo</Text>
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
    fontSize: 25,
    fontWeight: '800',
  },
  eyebrow: {
    color: '#006B73',
    fontSize: 10,
    letterSpacing: 0.8,
    fontWeight: '800',
    marginBottom: 2,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#dfeaf1',
    marginBottom: 18,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: '#028090',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#fff',
    fontWeight: '800',
  },
  name: {
    color: '#023047',
    fontSize: 22,
    fontWeight: '800',
  },
  meta: {
    color: '#64748b',
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#dfeaf1',
    marginBottom: 12,
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
  registerButton: {
    borderWidth: 1,
    borderColor: '#006B73',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  registerButtonText: { color: '#00545B', fontWeight: '700' },
  qrCard: {
    backgroundColor: '#E6F4F2',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#C4E8E2',
    marginBottom: 18,
  },
  qrLabel: {
    color: '#006B73',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  qrValue: {
    color: '#023047',
    fontSize: 15,
    fontWeight: '700',
  },
  qrCodeFrame: {
    alignSelf: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    marginVertical: 12,
  },
  qrToken: {
    color: '#334155',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  label: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  value: {
    color: '#023047',
    fontSize: 17,
    fontWeight: '700',
  },
  primaryButton: {
    marginTop: 14,
    backgroundColor: '#006B73',
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
