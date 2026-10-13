import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function OnboardingSecondScreen() {
  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.topBar}>
        <View style={styles.dotRow}>
          <View style={styles.dot} />
          <View style={[styles.dot, styles.activeDot]} />
        </View>
        <Pressable onPress={() => router.replace('/login' as any)}>
          <Text style={styles.skipText}>Omitir</Text>
        </Pressable>
      </View>

      <View style={styles.illustration}>
        <View style={styles.qrFrame}>
          <View style={styles.qrCenter} />
        </View>
      </View>

      <Text style={styles.eyebrow}>Código QR</Text>
      <Text style={styles.title}>Consulta rápida de información esencial</Text>
      <Text style={styles.description}>
        El equipo médico puede escanear el QR del paciente para acceder al diagnóstico, alergias, medicación crítica y contacto de emergencia en segundos, reduciendo tiempos y evitando errores.
      </Text>

      <View style={styles.cardList}>
        <View style={styles.cardItem}>
          <Text style={styles.cardTitle}>Diagnóstico</Text>
          <Text style={styles.cardText}>Sin diagnóstico registrado</Text>
        </View>
        <View style={styles.cardItem}>
          <Text style={styles.cardTitle}>Alergias</Text>
          <Text style={styles.cardText}>Penicilina</Text>
        </View>
      </View>

      <Pressable style={styles.primaryButton} onPress={() => router.replace('/login' as any)}>
        <Text style={styles.primaryText}>Continuar</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    backgroundColor: '#f3f9fb',
    paddingHorizontal: 24,
    paddingTop: 52,
    paddingBottom: 32,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#c9d7df',
  },
  activeDot: {
    backgroundColor: '#028090',
    width: 28,
  },
  skipText: {
    color: '#028090',
    fontWeight: '700',
  },
  illustration: {
    width: '100%',
    height: 220,
    backgroundColor: '#e8f4ff',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  qrFrame: {
    width: 170,
    height: 170,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 10,
    borderColor: '#023047',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCenter: {
    width: 70,
    height: 70,
    borderRadius: 18,
    backgroundColor: '#028090',
    opacity: 0.8,
  },
  eyebrow: {
    color: '#028090',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 1,
  },
  title: {
    color: '#023047',
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 10,
    lineHeight: 40,
  },
  description: {
    color: '#4a5568',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  cardList: {
    gap: 12,
    marginBottom: 24,
  },
  cardItem: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#dfeaf1',
  },
  cardTitle: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardText: {
    color: '#023047',
    fontSize: 18,
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: '#028090',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
