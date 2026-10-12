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
    Text,
    TextInput,
    View,
} from 'react-native';

import { AuthFormSkeleton } from '@/components/ui/skeleton';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const roles = [
  { key: 'cuidador', label: 'Cuidador' },
  { key: 'familiar', label: 'Familiar' },
  { key: 'medico', label: 'Equipo médico' },
] as const;

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<(typeof roles)[number]['key']>('cuidador');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 350);
    return () => clearTimeout(timer);
  }, []);

  const handleRegister = async () => {
    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    setErrorMessage('');

    if (!trimmedName) {
      setErrorMessage('Ingresa tu nombre completo para continuar.');
      return;
    }

    if (!normalizedEmail) {
      setErrorMessage('Ingresa un correo válido.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setErrorMessage('El correo debe tener formato válido.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage('Falta la configuración de Supabase.');
      Alert.alert(
        'Configuración requerida',
        'Agrega EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY antes de crear la cuenta.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: trimmedName,
            role: selectedRole,
          },
        },
      });

      if (error) {
        const lower = error.message.toLowerCase();

        if (lower.includes('user already registered') || lower.includes('already registered')) {
          setErrorMessage('Ese correo ya está registrado.');
        } else if (lower.includes('password')) {
          setErrorMessage('La contraseña no cumple con los requisitos de seguridad.');
        } else {
          setErrorMessage(error.message);
        }

        setIsSubmitting(false);
        return;
      }

      const userId = data.user?.id;
      if (!userId) {
        setErrorMessage('La cuenta se creó, pero no se pudo crear el perfil asociado.');
        setIsSubmitting(false);
        return;
      }

      const { error: profileError } = await supabase.from('usuarios').insert([
        {
          id: userId,
          nombre: trimmedName,
          email: normalizedEmail,
          rol: selectedRole,
          telefono: null,
          activo: true,
        },
      ]);

      if (profileError) {
        setErrorMessage(`No se pudo crear el perfil del usuario. Revisá permisos/RLS: ${profileError.message}`);
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      Alert.alert(
        'Cuenta creada',
        'Tu usuario se registró correctamente. Revisa tu correo para confirmar la cuenta antes de iniciar sesión.'
      );
      router.replace('/login' as any);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Ocurrió un error inesperado.');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <AuthFormSkeleton />;
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
          <View style={styles.card}>
            <Text style={styles.brand}>LinkCare</Text>
            <Text style={styles.subtitle}>Crear cuenta</Text>

            <View style={styles.roleRow}>
              {roles.map((role) => (
                <Pressable
                  key={role.key}
                  onPress={() => setSelectedRole(role.key)}
                  style={[styles.roleButton, selectedRole === role.key && styles.roleButtonSelected]}
                  accessibilityRole="button"
                  accessibilityLabel={`Seleccionar rol ${role.label}`}
                  accessibilityState={{ selected: selectedRole === role.key }}
                  focusable
                >
                  <Text style={[styles.roleText, selectedRole === role.key && styles.roleTextSelected]}>
                    {role.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {errorMessage ? <Text style={styles.errorBox}>{errorMessage}</Text> : null}

            <TextInput
              value={name}
              onChangeText={(value) => {
                setName(value);
                if (errorMessage) setErrorMessage('');
              }}
              placeholder="Nombre completo"
              autoCapitalize="words"
              textContentType="name"
              style={styles.input}
              accessibilityLabel="Nombre completo"
              accessibilityHint="Escribe tu nombre y apellidos"
              autoComplete="name"
            />

            <TextInput
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                if (errorMessage) setErrorMessage('');
              }}
              placeholder="correo@ejemplo.com"
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              autoCorrect={false}
              style={styles.input}
              accessibilityLabel="Correo electrónico"
              accessibilityHint="Escribe tu dirección de correo"
              autoComplete="email"
            />

            <TextInput
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                if (errorMessage) setErrorMessage('');
              }}
              placeholder="Contraseña"
              secureTextEntry
              textContentType="newPassword"
              style={styles.input}
              accessibilityLabel="Contraseña"
              accessibilityHint="Crea una contraseña de al menos seis caracteres"
              autoComplete="new-password"
            />

            <TextInput
              value={confirmPassword}
              onChangeText={(value) => {
                setConfirmPassword(value);
                if (errorMessage) setErrorMessage('');
              }}
              placeholder="Confirmar contraseña"
              secureTextEntry
              textContentType="newPassword"
              style={styles.input}
              accessibilityLabel="Confirmar contraseña"
              accessibilityHint="Repite la contraseña para confirmar"
              autoComplete="new-password"
            />

            <Pressable style={styles.primaryButton} onPress={handleRegister} disabled={isSubmitting} accessibilityRole="button" accessibilityLabel={isSubmitting ? 'Creando cuenta' : 'Registrarse'} focusable>
              <Text style={styles.primaryText}>{isSubmitting ? 'Creando cuenta...' : 'Registrarse'}</Text>
            </Pressable>

            <Pressable style={styles.linkButton} onPress={() => router.replace('/login' as any)} accessibilityRole="button" accessibilityLabel="Ir al inicio de sesión" focusable>
              <Text style={styles.linkText}>Ya tengo cuenta</Text>
            </Pressable>
          </View>
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
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 24,
    shadowColor: '#023047',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  brand: {
    color: '#023047',
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    color: '#4a5568',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dce8ef',
    backgroundColor: '#f7fafc',
    alignItems: 'center',
  },
  roleButtonSelected: {
    backgroundColor: '#028090',
    borderColor: '#028090',
  },
  roleText: {
    color: '#4a5568',
    fontSize: 12,
    fontWeight: '700',
  },
  roleTextSelected: {
    color: '#fff',
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 12,
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#dbeaf2',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
    color: '#023047',
    fontSize: 15,
  },
  primaryButton: {
    backgroundColor: '#028090',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  linkButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 10,
  },
  linkText: {
    color: '#0f766e',
    fontWeight: '700',
  },
});
