import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { getProfileSettingsData, saveClinicalAnnotation } from '@/lib/linkcare-data';

const categories = ['Observación', 'Constantes', 'Alerta', 'Nota'] as const;

export default function NewAnnotationScreen() {
  const [selectedCategory, setSelectedCategory] = useState<(typeof categories)[number]>('Observación');
  const [comment, setComment] = useState('');
  const [pressure, setPressure] = useState('');
  const [temperature, setTemperature] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [oxygen, setOxygen] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [linkedPatients, setLinkedPatients] = useState<string[]>([]);
  const [canWriteAnnotation, setCanWriteAnnotation] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const profile = await getProfileSettingsData();
      if (active) {
        setLinkedPatients(profile.linkedPatients ?? []);
        setCanWriteAnnotation(/cuidador|familiar|médico|equipo/i.test(profile.role));
        setProfileLoaded(true);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async () => {
    if (!comment.trim()) {
      Alert.alert('Falta información', 'Escribe una observación o síntoma antes de guardar.');
      return;
    }

    if (!linkedPatients.length) {
      Alert.alert('Paciente no vinculado', 'Primero vincula un paciente desde el perfil para registrar una anotación.');
      router.push('/profile-settings' as any);
      return;
    }

    if (!canWriteAnnotation) {
      Alert.alert('Permiso requerido', 'Solo un médico o cuidador vinculado al paciente puede registrar una anotación.');
      return;
    }

    setIsSaving(true);
    const result = await saveClinicalAnnotation({
      category: selectedCategory,
      comment,
      pressure: pressure.trim(),
      temperature: temperature.trim(),
      heartRate: heartRate.trim(),
      oxygen: oxygen.trim(),
    });

    setIsSaving(false);

    if (!result.success) {
      Alert.alert('No se pudo guardar', result.error ?? 'Intenta nuevamente.');
      return;
    }

    Alert.alert('Guardado', 'La anotación quedó registrada en el historial clínico.');
    router.back();
  };

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.title}>Nueva anotación</Text>
      </View>

      {!linkedPatients.length && (
        <View style={styles.emptyStateCard}>
          <Text style={styles.emptyStateTitle}>No hay un paciente asociado</Text>
          <Text style={styles.emptyStateText}>Para guardar anotaciones, vincula primero la persona a la que corresponde el cuidado.</Text>
          <Pressable style={styles.emptyStateButton} onPress={() => router.push('/profile-settings' as any)}>
            <Text style={styles.emptyStateButtonText}>Vincular paciente</Text>
          </Pressable>
        </View>
      )}

      {profileLoaded && linkedPatients.length > 0 && !canWriteAnnotation && (
        <View style={styles.emptyStateCard}>
          <Text style={styles.emptyStateTitle}>No tienes permiso para registrar notas</Text>
          <Text style={styles.emptyStateText}>El perfil familiar puede consultar la ficha; las anotaciones corresponden al médico o cuidador vinculado.</Text>
        </View>
      )}

      <Text style={styles.label}>Tipo de registro</Text>
      <View style={styles.chipRow}>
        {categories.map((category) => (
          <Pressable key={category} onPress={() => setSelectedCategory(category)} style={[styles.chip, selectedCategory === category && styles.chipActive]}>
            <Text style={[styles.chipText, selectedCategory === category && styles.chipTextActive]}>{category}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Comentarios</Text>
      <TextInput
        multiline
        value={comment}
        onChangeText={setComment}
        placeholder="Describe la evolución, síntoma o incidencia..."
        style={styles.textArea}
      />

      <Pressable
        style={styles.voiceButton}
        onPress={() => router.push({ pathname: '/voice-recording' as any, params: { category: selectedCategory } })}
        disabled={!profileLoaded || !canWriteAnnotation || !linkedPatients.length}
        accessibilityRole="button"
        accessibilityLabel="Dictar una nota por voz"
      >
        <Text style={styles.voiceButtonText}>Dictar con voz</Text>
      </Pressable>

      <Text style={styles.label}>Constantes opcionales</Text>
      <View style={styles.grid}>
        <TextInput value={pressure} onChangeText={setPressure} placeholder="Presión" style={styles.input} />
        <TextInput value={temperature} onChangeText={setTemperature} placeholder="Temperatura" style={styles.input} />
        <TextInput value={heartRate} onChangeText={setHeartRate} placeholder="FC" style={styles.input} />
        <TextInput value={oxygen} onChangeText={setOxygen} placeholder="SatO₂" style={styles.input} />
      </View>

      <Pressable style={styles.primaryButton} onPress={handleSave} disabled={isSaving || !profileLoaded || !canWriteAnnotation || !linkedPatients.length} accessibilityRole="button" accessibilityLabel={isSaving ? 'Guardando anotación' : 'Guardar anotación'}>
        <Text style={styles.primaryText}>{isSaving ? 'Guardando...' : 'Guardar anotación'}</Text>
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
    paddingBottom: 32,
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
  label: {
    color: '#023047',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  chip: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dfeaf1',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chipActive: {
    backgroundColor: '#028090',
    borderColor: '#028090',
  },
  chipText: {
    color: '#023047',
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#fff',
  },
  textArea: {
    minHeight: 140,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dfeaf1',
    padding: 14,
    textAlignVertical: 'top',
    color: '#023047',
    marginBottom: 18,
  },
  voiceButton: {
    backgroundColor: '#E6F4F2',
    borderWidth: 1,
    borderColor: '#006B73',
    borderRadius: 15,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 18,
  },
  voiceButtonText: {
    color: '#006B73',
    fontWeight: '800',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  input: {
    width: '48%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dfeaf1',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#023047',
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
    fontSize: 16,
    fontWeight: '700',
  },
});
