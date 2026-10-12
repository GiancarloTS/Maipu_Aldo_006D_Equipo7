import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ProfileSettingsSkeleton } from '@/components/ui/skeleton';
import { getProfileSettingsData, linkPatientToCurrentUser, removePatientFromCurrentUser, saveNotificationSettings, saveProfileSettings, type ProfileSettingsData } from '@/lib/linkcare-data';
import { supabase } from '@/lib/supabase';

export default function ProfileSettingsScreen() {
  const [data, setData] = useState<ProfileSettingsData | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLinkingPatient, setIsLinkingPatient] = useState(false);
  const [removingPatientId, setRemovingPatientId] = useState<string | null>(null);
  const [patientCode, setPatientCode] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    let active = true;

    const load = async () => {
      const next = await getProfileSettingsData();
      if (active) {
        setData(next);
        setForm({
          name: next.name,
          email: next.email,
          phone: next.phone,
        });
        setIsLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const initials = (data?.name ?? 'RS').split(' ').map((part) => part[0]).slice(0, 2).join('');
  const linkedPatients = data?.linkedPatients ?? [];
  const [notifications, setNotifications] = useState({
    medicines: data?.notifications?.medicines ?? true,
    alerts: data?.notifications?.alerts ?? true,
  });

  useEffect(() => {
    if (data?.notifications) {
      setNotifications({
        medicines: data.notifications.medicines,
        alerts: data.notifications.alerts,
      });
    }
  }, [data]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    const result = await saveProfileSettings(form);
    setIsSaving(false);

    if (!result.success) {
      Alert.alert('No se pudo guardar', result.error ?? 'Revisa los datos e inténtalo otra vez.');
      return;
    }

    setData((current) => current ? {
      ...current,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || current.phone,
    } : current);
    setIsEditing(false);
    Alert.alert('Perfil actualizado', 'Los cambios se guardaron correctamente.');
  };

  const handleToggleNotifications = async (key: 'medicines' | 'alerts', value: boolean) => {
    const nextState = {
      medicines: key === 'medicines' ? value : notifications.medicines,
      alerts: key === 'alerts' ? value : notifications.alerts,
    };

    setNotifications(nextState);
    if (data) {
      setData((current) => current ? { ...current, notifications: nextState } : current);
    }

    await saveNotificationSettings(nextState);
  };

  const handleLinkPatient = async () => {
    setIsLinkingPatient(true);
    const result = await linkPatientToCurrentUser({ patientCode: patientCode.trim() });
    setIsLinkingPatient(false);

    if (!result.success) {
      Alert.alert('No se pudo vincular', result.error ?? 'Inténtalo otra vez.');
      return;
    }

    const next = await getProfileSettingsData();
    setData(next);
    setPatientCode('');
    Alert.alert('Paciente vinculado', `Se vinculó correctamente a ${result.patientName ?? 'el paciente'}.`);
  };

  const confirmRemovePatient = (patientId: string, patientName: string) => {
    Alert.alert(
      'Quitar paciente de tu cuenta',
      `${patientName} dejará de aparecer en tu cuenta. Su ficha, medicamentos e historial clínico se conservarán para los otros usuarios vinculados.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          style: 'destructive',
          onPress: () => Alert.alert(
            'Confirmación final',
            `¿Confirmas que quieres quitar a ${patientName} de tu cuenta?`,
            [
              { text: 'No quitar', style: 'cancel' },
              {
                text: 'Sí, quitar',
                style: 'destructive',
                onPress: async () => {
                  setRemovingPatientId(patientId);
                  const result = await removePatientFromCurrentUser(patientId);
                  setRemovingPatientId(null);
                  if (!result.success) {
                    Alert.alert('No se pudo quitar', result.error ?? 'Inténtalo nuevamente.');
                    return;
                  }
                  const next = await getProfileSettingsData();
                  setData(next);
                  Alert.alert('Paciente quitado', 'Se quitó de tu cuenta; la historia clínica quedó conservada.');
                },
              },
            ],
          ),
        },
      ],
    );
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);

    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch {
      // no-op: aún así se lleva al usuario al login para cerrar la sesión localmente
    } finally {
      setIsSigningOut(false);
      router.replace('/login' as any);
    }
  };

  if (isLoading) {
    return <ProfileSettingsSkeleton />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.screen}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Volver a la pantalla anterior" focusable>
              <Text style={styles.backText}>←</Text>
            </Pressable>
            <Text style={styles.title}>Perfil y ajustes</Text>
          </View>

          <View style={styles.profileCard}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
            <View style={styles.profileMeta}>
              <Text style={styles.name}>{data?.name ?? 'Cargando...'}</Text>
              <Text style={styles.role}>{data?.role ?? 'Cargando...'}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Datos personales</Text>
              <Pressable onPress={() => isEditing ? handleSaveProfile() : setIsEditing(true)} disabled={isSaving} accessibilityRole="button" accessibilityLabel={isSaving ? 'Guardando perfil' : isEditing ? 'Guardar cambios del perfil' : 'Editar perfil'} focusable>
                <Text style={styles.actionText}>{isSaving ? 'Guardando...' : isEditing ? 'Guardar' : 'Editar'}</Text>
              </Pressable>
            </View>

            {isEditing ? (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Nombre</Text>
                <TextInput
                  style={styles.input}
                  value={form.name}
                  onChangeText={(value) => setForm((current) => ({ ...current, name: value }))}
                  accessibilityLabel="Nombre de usuario"
                  accessibilityHint="Edita tu nombre completo"
                  autoComplete="name"
                />

                <Text style={styles.label}>Correo</Text>
                <TextInput
                  style={styles.input}
                  value={form.email}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onChangeText={(value) => setForm((current) => ({ ...current, email: value }))}
                  accessibilityLabel="Correo electrónico"
                  accessibilityHint="Edita tu dirección de correo"
                  autoComplete="email"
                />

                <Text style={styles.label}>Teléfono</Text>
                <TextInput
                  style={styles.input}
                  value={form.phone}
                  keyboardType="phone-pad"
                  onChangeText={(value) => setForm((current) => ({ ...current, phone: value }))}
                  accessibilityLabel="Teléfono de contacto"
                  accessibilityHint="Edita tu número telefónico"
                  autoComplete="tel"
                />
              </View>
            ) : (
              <View style={styles.infoList}>
                <View style={styles.infoCard}>
                  <Text style={styles.infoText}>Nombre: {data?.name ?? 'Sin nombre'}</Text>
                </View>
                <View style={styles.infoCard}>
                  <Text style={styles.infoText}>Correo: {data?.email ?? 'Sin correo'}</Text>
                </View>
                <View style={styles.infoCard}>
                  <Text style={styles.infoText}>Teléfono: {data?.phone ?? 'Sin teléfono'}</Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notificaciones</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Recordatorios de medicamentos</Text>
              <Switch
                value={notifications.medicines}
                onValueChange={(value) => handleToggleNotifications('medicines', value)}
                accessibilityRole="switch"
                accessibilityLabel="Recordatorios de medicamentos"
                accessibilityState={{ checked: notifications.medicines }}
              />
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Alertas clínicas</Text>
              <Switch
                value={notifications.alerts}
                onValueChange={(value) => handleToggleNotifications('alerts', value)}
                accessibilityRole="switch"
                accessibilityLabel="Alertas clínicas"
                accessibilityState={{ checked: notifications.alerts }}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pacientes vinculados</Text>
            <View style={styles.linkRow}>
              <TextInput
                value={patientCode}
                onChangeText={setPatientCode}
                placeholder="Token QR del paciente"
                autoCapitalize="characters"
                style={styles.linkInput}
                accessibilityLabel="Código del paciente"
                accessibilityHint="Ingresa el token QR del paciente"
              />
              <Pressable style={styles.linkButton} onPress={handleLinkPatient} disabled={isLinkingPatient} accessibilityRole="button" accessibilityLabel={isLinkingPatient ? 'Vinculando paciente' : 'Vincular paciente'} focusable>
                <Text style={styles.linkButtonText}>{isLinkingPatient ? 'Vinculando...' : 'Vincular'}</Text>
              </Pressable>
            </View>
            {data?.linkedPatientRecords.length ? (
              data.linkedPatientRecords.map((patient) => (
                <View key={patient.id} style={styles.linkedCard}>
                  <Text style={styles.linkedText}>{patient.name}</Text>
                  <Pressable
                    style={styles.unlinkButton}
                    onPress={() => confirmRemovePatient(patient.id, patient.name)}
                    disabled={removingPatientId === patient.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Quitar a ${patient.name} de mi cuenta`}
                  >
                    <Text style={styles.unlinkButtonText}>{removingPatientId === patient.id ? 'Quitando...' : 'Quitar'}</Text>
                  </Pressable>
                </View>
              ))
            ) : (
              <View style={styles.emptyLinkedCard}>
                <Text style={styles.emptyLinkedText}>No hay pacientes vinculados aún.</Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Seguridad</Text>
            <View style={styles.infoCard}>
              <Text style={styles.infoText}>PIN de acceso: {data?.pin ?? '4821'}</Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoText}>Información legal y términos</Text>
            </View>
          </View>

          <Pressable
            style={[styles.primaryButton, isSigningOut && styles.primaryButtonDisabled]}
            onPress={handleSignOut}
            disabled={isSigningOut}
            accessibilityRole="button"
            accessibilityLabel={isSigningOut ? 'Cerrando sesión' : 'Cerrar sesión'}
            accessibilityHint="Cierra la sesión actual"
            focusable
          >
            <Text style={styles.primaryText}>{isSigningOut ? 'Cerrando sesión...' : 'Cerrar sesión'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#edf7fb',
  },
  flex: {
    flex: 1,
  },
  screen: {
    flexGrow: 1,
    backgroundColor: '#edf7fb',
    paddingHorizontal: 20,
    paddingTop: 18,
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
    borderWidth: 1,
    borderColor: '#dbeaf2',
    shadowColor: '#023047',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
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
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dfeaf1',
    padding: 16,
    marginBottom: 18,
    shadowColor: '#023047',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#028090',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 18,
  },
  profileMeta: {
    flex: 1,
  },
  name: {
    color: '#023047',
    fontSize: 22,
    fontWeight: '800',
  },
  role: {
    color: '#64748b',
    marginTop: 4,
    fontSize: 13,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#dfeaf1',
    marginBottom: 16,
    shadowColor: '#023047',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#023047',
    fontSize: 16,
    fontWeight: '800',
  },
  actionText: {
    color: '#028090',
    fontSize: 14,
    fontWeight: '700',
  },
  formGroup: {
    gap: 8,
  },
  label: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#dbeaf2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#023047',
    fontSize: 14,
  },
  infoList: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  rowLabel: {
    color: '#475569',
    fontSize: 14,
    flex: 1,
  },
  linkedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: '#f6fbfd',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  linkedText: {
    flex: 1,
    color: '#023047',
    fontWeight: '700',
  },
  unlinkButton: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#B91C1C',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlinkButtonText: { color: '#991B1B', fontSize: 12, fontWeight: '800' },
  emptyLinkedCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#dbeaf2',
  },
  emptyLinkedText: {
    color: '#64748b',
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#f6fbfd',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9f4f7',
  },
  infoText: {
    color: '#023047',
    fontWeight: '600',
  },
  linkRow: {
    flexDirection: 'column',
    gap: 8,
    marginBottom: 12,
  },
  linkInput: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#dbeaf2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#023047',
  },
  linkButton: {
    backgroundColor: '#028090',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#028090',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  linkButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: '#028090',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 8,
    shadowColor: '#028090',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
