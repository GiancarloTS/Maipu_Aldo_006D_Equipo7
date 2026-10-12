import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { createMedicationPrescription, getDoctorPatients, type DoctorPatient } from '@/lib/linkcare-data';

export default function NewPrescriptionScreen() {
  const params = useLocalSearchParams<{ patientId?: string }>();
  const [patients, setPatients] = useState<DoctorPatient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [frequency, setFrequency] = useState('24');
  const [startTime, setStartTime] = useState('08:00');
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  const [endDate, setEndDate] = useState('');
  const [instructions, setInstructions] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const result = await getDoctorPatients();
      if (!active) return;
      setIsLoading(false);
      if (!result.success) {
        Alert.alert('No se pudieron cargar pacientes', result.error ?? 'Intenta nuevamente.');
        return;
      }
      setPatients(result.patients);
      const requestedId = typeof params.patientId === 'string' ? params.patientId : '';
      setSelectedPatientId(result.patients.some((patient) => patient.id === requestedId)
        ? requestedId
        : result.patients[0]?.id ?? '');
    };
    void load();
    return () => { active = false; };
  }, [params.patientId]);

  const handleSave = async () => {
    const hours = Number(frequency);
    const [hourPart, minutePart] = startTime.split(':');
    const validTime = /^\d{2}:\d{2}$/.test(startTime)
      && Number(hourPart) >= 0 && Number(hourPart) <= 23
      && Number(minutePart) >= 0 && Number(minutePart) <= 59;
    const isValidDate = (value: string) => {
      const parsed = new Date(`${value}T00:00:00`);
      return /^\d{4}-\d{2}-\d{2}$/.test(value)
        && !Number.isNaN(parsed.getTime())
        && parsed.toISOString().slice(0, 10) === value;
    };

    if (!selectedPatientId || !name.trim() || !dose.trim() || !Number.isInteger(hours) || hours < 1 || !validTime || !isValidDate(startDate) || (endDate && (!isValidDate(endDate) || endDate < startDate))) {
      Alert.alert('Revisa la prescripción', 'Completa los datos y verifica que la vigencia tenga fechas válidas y término posterior al inicio.');
      return;
    }

    setIsSaving(true);
    const result = await createMedicationPrescription({
      patientId: selectedPatientId,
      nombre: name,
      dosis: dose,
      frecuenciaHoras: hours,
      horaInicio: `${startTime}:00`,
      fechaInicio: startDate,
      fechaFin: endDate,
      indicaciones: instructions,
    });
    setIsSaving(false);

    if (!result.success) {
      Alert.alert('No se pudo guardar', result.error ?? 'Intenta nuevamente.');
      return;
    }

    Alert.alert('Prescripción guardada', 'El medicamento quedó registrado para el paciente.');
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Volver a pacientes">
              <Text style={styles.backText}>←</Text>
            </Pressable>
            <Text style={styles.title}>Nueva prescripción</Text>
          </View>

          {isLoading ? (
            <View style={styles.emptyState}><Text style={styles.bodyText}>Cargando pacientes...</Text></View>
          ) : !patients.length ? (
            <View style={styles.emptyState}>
              <Text style={styles.sectionTitle}>Primero registra un paciente</Text>
              <Text style={styles.bodyText}>Las prescripciones siempre deben quedar asociadas a un paciente.</Text>
              <Pressable style={styles.primaryButton} onPress={() => router.push('/medico/patient-new' as any)} accessibilityRole="button" accessibilityLabel="Registrar paciente">
                <Text style={styles.primaryText}>Registrar paciente</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.label}>Paciente</Text>
              <View style={styles.patientList}>
                {patients.map((patient) => (
                  <Pressable key={patient.id} onPress={() => setSelectedPatientId(patient.id)} style={[styles.patientOption, selectedPatientId === patient.id && styles.patientOptionSelected]} accessibilityRole="radio" accessibilityLabel={`Paciente ${patient.nombre}`} accessibilityState={{ selected: selectedPatientId === patient.id }}>
                    <Text style={[styles.patientOptionText, selectedPatientId === patient.id && styles.patientOptionTextSelected]}>{patient.nombre}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Medicamento *</Text>
              <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="Nombre del medicamento" accessibilityLabel="Nombre del medicamento" />
              <Text style={styles.label}>Dosis *</Text>
              <TextInput value={dose} onChangeText={setDose} style={styles.input} placeholder="Ej. 850 mg" accessibilityLabel="Dosis del medicamento" />
              <Text style={styles.label}>Frecuencia *</Text>
              <TextInput value={frequency} onChangeText={setFrequency} style={styles.input} placeholder="Horas entre dosis" keyboardType="number-pad" accessibilityLabel="Frecuencia en horas" />
              <Text style={styles.label}>Hora de inicio *</Text>
              <TextInput value={startTime} onChangeText={setStartTime} style={styles.input} placeholder="HH:MM" keyboardType="numbers-and-punctuation" accessibilityLabel="Hora de inicio" />
              <Text style={styles.label}>Vigencia desde *</Text>
              <TextInput value={startDate} onChangeText={setStartDate} style={styles.input} placeholder="AAAA-MM-DD" keyboardType="numbers-and-punctuation" accessibilityLabel="Fecha de inicio de vigencia" />
              <Text style={styles.label}>Vigencia hasta</Text>
              <TextInput value={endDate} onChangeText={setEndDate} style={styles.input} placeholder="Sin fecha de término" keyboardType="numbers-and-punctuation" accessibilityLabel="Fecha de término de vigencia, opcional" />
              <Text style={styles.label}>Indicaciones</Text>
              <TextInput value={instructions} onChangeText={setInstructions} style={[styles.input, styles.multiline]} placeholder="Indicaciones adicionales" multiline accessibilityLabel="Indicaciones del medicamento" />

              <Pressable style={[styles.primaryButton, isSaving && styles.disabledButton]} onPress={handleSave} disabled={isSaving} accessibilityRole="button" accessibilityLabel={isSaving ? 'Guardando prescripción' : 'Guardar prescripción'}>
                <Text style={styles.primaryText}>{isSaving ? 'Guardando...' : 'Guardar prescripción'}</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F0F4F8' },
  flex: { flex: 1 },
  screen: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  backText: { color: '#023047', fontSize: 20, fontWeight: '700' },
  title: { color: '#023047', fontSize: 25, fontWeight: '800' },
  form: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#dfeaf1', padding: 18 },
  emptyState: { backgroundColor: '#fff', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#dfeaf1' },
  sectionTitle: { color: '#023047', fontSize: 18, fontWeight: '800', marginBottom: 8 },
  bodyText: { color: '#334155', fontSize: 14, lineHeight: 21 },
  label: { color: '#334155', fontSize: 14, fontWeight: '700', marginBottom: 7, marginTop: 4 },
  input: { minHeight: 48, borderWidth: 1, borderColor: '#94A3B8', borderRadius: 10, paddingHorizontal: 13, marginBottom: 14, color: '#0F172A', backgroundColor: '#fff' },
  multiline: { minHeight: 88, textAlignVertical: 'top', paddingTop: 12 },
  patientList: { gap: 8, marginBottom: 12 },
  patientOption: { borderWidth: 1, borderColor: '#94A3B8', borderRadius: 10, padding: 12, backgroundColor: '#fff' },
  patientOptionSelected: { borderColor: '#006B73', backgroundColor: '#E6F4F2' },
  patientOptionText: { color: '#0F172A', fontWeight: '600' },
  patientOptionTextSelected: { color: '#00545B', fontWeight: '800' },
  primaryButton: { minHeight: 50, backgroundColor: '#006B73', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  disabledButton: { opacity: 0.65 },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
