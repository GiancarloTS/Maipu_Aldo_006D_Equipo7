import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { getPatientHealthVariables, saveHealthVariable, type HealthVariable } from '@/lib/linkcare-data';

const commonTypes = ['Presión arterial', 'Temperatura', 'Frecuencia cardíaca', 'Saturación de oxígeno', 'Glucosa', 'Peso'];

export default function HealthVariablesScreen() {
  const { patientId: requestedPatientId } = useLocalSearchParams<{ patientId?: string }>();
  const [patientId, setPatientId] = useState('');
  const [patientName, setPatientName] = useState('Paciente');
  const [variables, setVariables] = useState<HealthVariable[]>([]);
  const [selectedType, setSelectedType] = useState(commonTypes[0]);
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadVariables = useCallback(async () => {
    setIsLoading(true);
    const result = await getPatientHealthVariables(typeof requestedPatientId === 'string' ? requestedPatientId : undefined);
    setPatientId(result.patientId ?? '');
    setPatientName(result.patientName ?? 'Paciente');
    setVariables(result.variables);
    setErrorMessage(result.error ?? '');
    setIsLoading(false);
  }, [requestedPatientId]);

  useFocusEffect(useCallback(() => {
    void loadVariables();
  }, [loadVariables]));

  const handleSave = async () => {
    if (!patientId || !selectedType.trim() || !value.trim()) {
      setErrorMessage('Selecciona el paciente y completa tipo y valor.');
      return;
    }

    setIsSaving(true);
    const result = await saveHealthVariable({ patientId, type: selectedType, value, unit });
    setIsSaving(false);
    if (!result.success) {
      Alert.alert('No se pudo guardar', result.error ?? 'Revisa los datos e inténtalo nuevamente.');
      return;
    }

    setValue('');
    setUnit('');
    await loadVariables();
    Alert.alert('Medición registrada', 'La variable de salud quedó asociada al historial del paciente.');
  };

  return (
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Volver">
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>Registro clínico</Text>
          <Text style={styles.title}>Variables de salud</Text>
        </View>
      </View>

      <Text style={styles.patientName}>{patientName}</Text>

      <View style={styles.form}>
        <Text style={styles.sectionTitle}>Nueva medición</Text>
        <View style={styles.typeList}>
          {commonTypes.map((type) => (
            <Pressable
              key={type}
              onPress={() => setSelectedType(type)}
              style={[styles.typeOption, selectedType === type && styles.typeOptionSelected]}
              accessibilityRole="radio"
              accessibilityState={{ selected: selectedType === type }}
            >
              <Text style={[styles.typeText, selectedType === type && styles.typeTextSelected]}>{type}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>Tipo de medición</Text>
        <TextInput value={selectedType} onChangeText={setSelectedType} style={styles.input} accessibilityLabel="Tipo de variable de salud" />
        <Text style={styles.label}>Valor</Text>
        <TextInput value={value} onChangeText={setValue} style={styles.input} placeholder="Ej. 130/85" accessibilityLabel="Valor de la medición" />
        <Text style={styles.label}>Unidad (opcional)</Text>
        <TextInput value={unit} onChangeText={setUnit} style={styles.input} placeholder="Ej. mmHg" accessibilityLabel="Unidad de la medición" />
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        <Pressable style={[styles.saveButton, (isSaving || !patientId) && styles.disabledButton]} onPress={() => void handleSave()} disabled={isSaving || !patientId} accessibilityRole="button">
          <Text style={styles.saveText}>{isSaving ? 'Guardando...' : 'Registrar medición'}</Text>
        </Pressable>
      </View>

      <View style={styles.historyHeader}>
        <Text style={styles.sectionTitle}>Mediciones recientes</Text>
        <Text style={styles.count}>{variables.length}</Text>
      </View>
      {isLoading ? <Text style={styles.emptyText}>Cargando mediciones...</Text> : null}
      {!isLoading && !variables.length ? <Text style={styles.emptyText}>Todavía no hay mediciones registradas.</Text> : null}
      {variables.map((item) => (
        <View key={item.id} style={styles.variableRow}>
          <View style={styles.variableMain}>
            <Text style={styles.variableType}>{item.type}</Text>
            <Text style={styles.variableValue}>{item.value}{item.unit ? ` ${item.unit}` : ''}</Text>
          </View>
          <Text style={styles.dateText}>{new Date(item.recordedAt).toLocaleString('es-CL')}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, backgroundColor: '#F0F4F8', paddingHorizontal: 20, paddingTop: 38, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backButton: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  backText: { color: '#023047', fontSize: 20, fontWeight: '700' },
  headerText: { flex: 1 },
  eyebrow: { color: '#006B73', fontSize: 12, fontWeight: '800' },
  title: { color: '#0F172A', fontSize: 24, fontWeight: '800' },
  patientName: { color: '#334155', fontSize: 14, fontWeight: '700', marginBottom: 14 },
  form: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#CBD5E1', padding: 16, marginBottom: 24 },
  sectionTitle: { color: '#0F172A', fontSize: 16, fontWeight: '800' },
  typeList: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginVertical: 12 },
  typeOption: { borderWidth: 1, borderColor: '#94A3B8', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 8 },
  typeOptionSelected: { backgroundColor: '#E6F4F2', borderColor: '#006B73' },
  typeText: { color: '#334155', fontSize: 12, fontWeight: '600' },
  typeTextSelected: { color: '#00545B', fontWeight: '800' },
  label: { color: '#334155', fontSize: 13, fontWeight: '700', marginBottom: 6, marginTop: 5 },
  input: { minHeight: 46, borderWidth: 1, borderColor: '#94A3B8', borderRadius: 9, paddingHorizontal: 12, color: '#0F172A', marginBottom: 8 },
  errorText: { color: '#991B1B', fontSize: 13, marginVertical: 6 },
  saveButton: { minHeight: 48, backgroundColor: '#006B73', borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  disabledButton: { opacity: 0.55 },
  saveText: { color: '#fff', fontWeight: '800' },
  historyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  count: { color: '#475569', fontSize: 12, fontWeight: '700' },
  emptyText: { color: '#475569', backgroundColor: '#fff', padding: 14, borderRadius: 10, lineHeight: 20 },
  variableRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#CBD5E1' },
  variableMain: { flex: 1 },
  variableType: { color: '#334155', fontSize: 12, fontWeight: '700' },
  variableValue: { color: '#0F172A', fontSize: 16, fontWeight: '800', marginTop: 3 },
  dateText: { color: '#64748B', fontSize: 11, textAlign: 'right', maxWidth: 120 },
});