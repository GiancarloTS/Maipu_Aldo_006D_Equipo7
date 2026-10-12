import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const features = [
  'Historial clínico centralizado',
  'Registro diario de medicamentos',
  'Alertas y seguimiento del paciente',
];

export default function OnboardingScreen() {
  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.topBar}>
        <View style={styles.dotRow}>
          <View style={[styles.dot, styles.activeDot]} />
          <View style={styles.dot} />
        </View>
        <Pressable onPress={() => router.replace('/login' as any)}>
          <Text style={styles.skipText}>Omitir</Text>
        </Pressable>
      </View>

      <View style={styles.illustration}>
        <Text style={styles.illustrationText}>♥</Text>
      </View>

      <Text style={styles.eyebrow}>LinkCare</Text>
      <Text style={styles.title}>Centraliza la atención del paciente</Text>
      <Text style={styles.description}>
        LinkCare reúne el historial médico, los registros diarios y las alertas del paciente en un único lugar para que el equipo y la familia actúen con rapidez y claridad.
      </Text>

      <View style={styles.list}>
        {features.map((item) => (
          <View key={item} style={styles.listRow}>
            <View style={styles.check} />
            <Text style={styles.listText}>{item}</Text>
          </View>
        ))}
      </View>

      <Pressable style={styles.primaryButton} onPress={() => router.push('/onboarding-2' as any)}>
        <Text style={styles.primaryText}>Siguiente</Text>
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
    marginBottom: 18,
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
    backgroundColor: '#dff7f8',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  illustrationText: {
    fontSize: 72,
    color: '#028090',
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
    fontSize: 34,
    fontWeight: '800',
    marginBottom: 12,
    lineHeight: 42,
  },
  description: {
    color: '#4a5568',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 18,
  },
  list: {
    marginBottom: 28,
    gap: 12,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  check: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#02c39a',
  },
  listText: {
    color: '#023047',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
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
