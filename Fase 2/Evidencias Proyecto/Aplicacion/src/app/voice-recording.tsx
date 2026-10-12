import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { saveClinicalAnnotation } from '@/lib/linkcare-data';
import { createSpeechRecognitionClient, type SpeechRecognitionClient } from '@/lib/speech-recognition';

const categories = ['Observación', 'Consulta', 'Alergia', 'Seguimiento'] as const;

export default function VoiceRecordingScreen() {
  const { category } = useLocalSearchParams<{ category?: string }>();
  const initialCategory = categories.includes(category as (typeof categories)[number])
    ? category as (typeof categories)[number]
    : 'Observación';
  const [selectedCategory, setSelectedCategory] = useState<(typeof categories)[number]>(initialCategory);
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [recognitionError, setRecognitionError] = useState('');
  const recognitionClient = useRef<SpeechRecognitionClient | null>(null);
  const lastFinalTranscript = useRef('');

  useEffect(() => () => {
    recognitionClient.current?.stop();
    recognitionClient.current = null;
  }, []);

  const toggleRecording = async () => {
    if (isRecording) {
      recognitionClient.current?.stop();
      return;
    }

    setTranscript('');
    lastFinalTranscript.current = '';
    setRecognitionError('');

    try {
      const client = await createSpeechRecognitionClient();
      recognitionClient.current = client;

      const handleStart = () => {
        setIsRecording(true);
        setRecognitionError('');
      };
      const handleEnd = () => setIsRecording(false);
      const handleResult = (event: any) => {
        if (!event?.isFinal) return;

        const latest = event.results?.[event.results.length - 1];
        const finalTranscript = latest?.transcript?.trim();
        if (!finalTranscript || finalTranscript === lastFinalTranscript.current) return;

        lastFinalTranscript.current = finalTranscript;
        setTranscript((current) => `${current}${current && finalTranscript ? ' ' : ''}${finalTranscript}`.trim());
      };
      const handleError = (event: any) => {
        setIsRecording(false);
        setRecognitionError(event?.message || 'No se pudo reconocer la voz. Inténtalo nuevamente.');
      };

      client.addListener('start', handleStart);
      client.addListener('end', handleEnd);
      client.addListener('result', handleResult);
      client.addListener('error', handleError);

      const permission = await client.requestPermissionsAsync();
      if (!permission.granted) {
        setRecognitionError('Se requiere permiso del microfono y reconocimiento de voz.');
        return;
      }

      client.start({ lang: 'es-ES', interimResults: true, continuous: false });
    } catch (error) {
      setIsRecording(false);
      const message = error instanceof Error ? error.message : String(error);
      setRecognitionError(
        message.includes('native module')
          ? 'Reconocimiento de voz no está disponible en esta versión de la aplicación. Reinicia la app y reinstala el módulo nativo.'
          : 'No se pudo iniciar el reconocimiento de voz. Inténtalo nuevamente.',
      );
    }
  };

  const handleSave = async () => {
    if (!transcript.trim()) {
      Alert.alert('Falta contenido', 'La transcripción está vacía.');
      return;
    }

    setIsSaving(true);
    const result = await saveClinicalAnnotation({
      category: selectedCategory,
      comment: transcript,
      isVoiceRecording: true,
    });

    setIsSaving(false);

    if (!result.success) {
      Alert.alert('No se pudo guardar', result.error ?? 'Intenta nuevamente.');
      return;
    }

    Alert.alert('Guardado', 'La nota por voz quedó registrada correctamente.');
    router.back();
  };

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.title}>Registro por voz</Text>
      </View>

      <View style={styles.recordingPanel}>
        <Pressable onPress={toggleRecording} style={[styles.recordButton, isRecording && styles.recordingActive]}>
          <Text style={styles.recordButtonText}>{isRecording ? 'Detener' : 'Grabar'}</Text>
        </Pressable>
        <Text style={styles.recordState}>{isRecording ? 'Grabando en tiempo real' : 'Listo para grabar'}</Text>
      </View>

      <Text style={styles.label}>Categoría</Text>
      <View style={styles.chips}>
        {categories.map((category) => (
          <Pressable key={category} onPress={() => setSelectedCategory(category)} style={[styles.chip, selectedCategory === category && styles.chipActive]}>
            <Text style={[styles.chipText, selectedCategory === category && styles.chipTextActive]}>{category}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Transcripción</Text>
      <TextInput
        multiline
        value={transcript}
        onChangeText={setTranscript}
        placeholder="Transcripción"
        style={styles.textArea}
      />

      {recognitionError ? <Text style={styles.errorText}>{recognitionError}</Text> : null}

      <View style={styles.actionRow}>
        <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
          <Text style={styles.secondaryText}>Descartar</Text>
        </Pressable>
        <Pressable style={styles.primaryButton} onPress={handleSave} disabled={isSaving}>
          <Text style={styles.primaryText}>{isSaving ? 'Guardando...' : 'Guardar'}</Text>
        </Pressable>
      </View>
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
  recordingPanel: {
    backgroundColor: '#023047',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  recordButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#028090',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  recordingActive: {
    backgroundColor: '#dc2626',
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  recordState: {
    color: '#d7f7fb',
    fontSize: 14,
    fontWeight: '700',
  },
  label: {
    color: '#023047',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  chips: {
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
    paddingVertical: 8,
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
  errorText: {
    color: '#b91c1c',
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dfeaf1',
    alignItems: 'center',
  },
  secondaryText: {
    color: '#023047',
    fontWeight: '700',
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#028090',
    alignItems: 'center',
  },
  primaryText: {
    color: '#fff',
    fontWeight: '700',
  },
});
