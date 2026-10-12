import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { createPatientForCurrentUser } from '@/lib/linkcare-data';

export default function NewPatientScreen() {
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [rut, setRut] = useState('');
  const [allergies, setAllergies] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const parsedDate = new Date(`${birthDate}T00:00:00`);
    const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(birthDate)
      && !Number.isNaN(parsedDate.getTime())
      && parsedDate.toISOString().slice(0, 10) === birthDate
      && parsedDate <= new Date();

    if (!name.trim() || !isValidDate) {
      Alert.alert('Revisa los datos', 'Ingresa el nombre y una fecha de nacimiento válida en formato AAAA-MM-DD.');
      return;
    }

    setIsSaving(true);
    const result = await createPatientForCurrentUser({
      nombre: name,
      fechaNacimiento: birthDate,
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
            <TextInput value={birthDate} onChangeText={setBirthDate} style={styles.input} placeholder="AAAA-MM-DD" keyboardType="numbers-and-punctuation" accessibilityLabel="Fecha de nacimiento" accessibilityHint="Formato año-mes-día" />

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
  input: { minHeight: 48, borderWidth: 1, borderColor: '#94A3B8', borderRadius: 10, paddingHorizontal: 13, marginBottom: 15, color: '#0F172A', backgroundColor: '#fff' },
  primaryButton: { minHeight: 50, backgroundColor: '#006B73', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 5 },
  disabledButton: { opacity: 0.65 },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
