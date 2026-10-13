import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { createElement, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { createPatientForCurrentUser } from '@/lib/linkcare-data';

const formatISODate = (date: Date): string => {
  const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
  return localDate.toISOString().slice(0, 10);
};

const parseISODate = (value: string): Date | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const parsedDate = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return null;

  return formatISODate(parsedDate) === value ? parsedDate : null;
};

export default function NewPatientScreen() {
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [principalDiagnosis, setPrincipalDiagnosis] = useState('');
  const [rut, setRut] = useState('');
  const [allergies, setAllergies] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleDateChange = (_event: unknown, selectedDate?: Date) => {
    setShowDatePicker(false);

    if (!selectedDate) {
      return;
    }

    setBirthDate(formatISODate(selectedDate));
  };

  const handleSave = async () => {
    const parsedDate = parseISODate(birthDate);
    const isValidDate = !!parsedDate && birthDate <= formatISODate(new Date());
    const missingFields = [
      !name.trim() ? 'nombre completo' : null,
      !birthDate ? 'fecha de nacimiento' : null,
    ].filter((field): field is string => field !== null);

    if (missingFields.length > 0) {
      Alert.alert(
        'Paciente no válido',
        `Completa los campos obligatorios: ${missingFields.join(' y ')}.`,
      );
      return;
    }

    if (!isValidDate) {
      Alert.alert('Paciente no válido', 'La fecha de nacimiento no es válida. Selecciona una fecha válida.');
      return;
    }

    setIsSaving(true);
    const result = await createPatientForCurrentUser({
      nombre: name,
      fechaNacimiento: birthDate,
      diagnosticoPrincipal: principalDiagnosis,
      rut,
      alergias: allergies,
      contactoEmergencia: emergencyContact,
    });
    setIsSaving(false);

    if (!result.success) {
      Alert.alert('No se pudo registrar', result.error ?? 'Intenta nuevamente.');
      return;
    }

    Alert.alert('Paciente registrado', 'El paciente quedó vinculado a tu cuenta. Su QR está listo para compartir.');
    router.replace({ pathname: '/qr-patient-summary' as any, params: { patientId: result.patientId } });
  };

  const datePickerValue = birthDate ? parseISODate(birthDate) ?? new Date() : new Date();

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Volver a pacientes">
              <Text style={styles.backText}>←</Text>
            </Pressable>
            <Text style={styles.title}>Nuevo paciente</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.intro}>Datos básicos del paciente</Text>
            <Text style={styles.label}>Nombre completo *</Text>
            <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="Nombre y apellidos" autoCapitalize="words" accessibilityLabel="Nombre completo del paciente" />

            <Text style={styles.label}>Fecha de nacimiento *</Text>
            {Platform.OS === 'web' ? (
              createElement('input', {
                type: 'date',
                value: birthDate,
                max: formatISODate(new Date()),
                onChange: (event) => setBirthDate(event.currentTarget.value),
                'aria-label': 'Fecha de nacimiento',
                style: {
                  height: 48,
                  width: '100%',
                  boxSizing: 'border-box',
                  border: '1px solid #94A3B8',
                  borderRadius: 10,
                  padding: '0 13px',
                  marginBottom: 15,
                  color: '#0F172A',
                  backgroundColor: '#fff',
                  fontSize: 15,
                },
              })
            ) : (
              <>
                <Pressable style={[styles.input, styles.dateButton]} onPress={() => setShowDatePicker(true)} accessibilityRole="button" accessibilityLabel="Seleccionar fecha de nacimiento">
                  <Text style={[styles.dateText, !birthDate && styles.placeholderText]}>{birthDate || 'Selecciona la fecha'}</Text>
                </Pressable>
                {showDatePicker && (
                  <DateTimePicker
                    value={datePickerValue}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    maximumDate={new Date()}
                    onChange={handleDateChange}
                  />
                )}
              </>
            )}

            <Text style={styles.label}>Diagnóstico principal</Text>
            <TextInput value={principalDiagnosis} onChangeText={setPrincipalDiagnosis} style={styles.input} placeholder="Opcional" accessibilityLabel="Diagnóstico principal del paciente" />

            <Text style={styles.label}>RUT</Text>
            <TextInput value={rut} onChangeText={setRut} style={styles.input} placeholder="Opcional" accessibilityLabel="RUT del paciente" />

            <Text style={styles.label}>Alergias</Text>
            <TextInput value={allergies} onChangeText={setAllergies} style={styles.input} placeholder="Sin alergias conocidas" accessibilityLabel="Alergias del paciente" />

            <Text style={styles.label}>Contacto de emergencia</Text>
            <TextInput value={emergencyContact} onChangeText={setEmergencyContact} style={styles.input} placeholder="Teléfono de contacto" keyboardType="phone-pad" accessibilityLabel="Contacto de emergencia" />

            <Pressable style={[styles.primaryButton, isSaving && styles.disabledButton]} onPress={handleSave} disabled={isSaving} accessibilityRole="button" accessibilityLabel={isSaving ? 'Guardando paciente' : 'Registrar paciente'}>
              <Text style={styles.primaryText}>{isSaving ? 'Guardando...' : 'Registrar paciente'}</Text>
            </Pressable>
          </View>
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
  title: { color: '#023047', fontSize: 26, fontWeight: '800' },
  form: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#dfeaf1', padding: 18 },
  intro: { color: '#023047', fontSize: 17, fontWeight: '800', marginBottom: 18 },
  label: { color: '#334155', fontSize: 14, fontWeight: '700', marginBottom: 7 },
  input: { minHeight: 48, borderWidth: 1, borderColor: '#94A3B8', borderRadius: 10, paddingHorizontal: 13, marginBottom: 15, color: '#0F172A', backgroundColor: '#fff', justifyContent: 'center' },
  dateButton: { alignItems: 'flex-start' },
  dateText: { color: '#0F172A', fontSize: 15 },
  placeholderText: { color: '#64748B' },
  primaryButton: { minHeight: 50, backgroundColor: '#006B73', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 5 },
  disabledButton: { opacity: 0.65 },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
