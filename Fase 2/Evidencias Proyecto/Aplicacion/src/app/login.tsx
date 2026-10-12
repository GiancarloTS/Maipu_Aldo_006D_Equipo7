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

export default function LoginRoleSelectionScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 350);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = async () => {
    const normalizedEmail = email.trim();
    setErrorMessage('');

    if (!normalizedEmail) {
      setErrorMessage('Ingresa tu correo para continuar.');
      return;
    }

    if (!password.trim()) {
      setErrorMessage('Ingresa tu contraseña para continuar.');
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage('Falta la configuración de Supabase. Revisa las variables de entorno.');
      Alert.alert(
        'Configuración requerida',
        'Agrega EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY en tu archivo .env antes de iniciar sesión.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        const lower = error.message.toLowerCase();

        if (lower.includes('invalid login credentials') || lower.includes('invalid email or password')) {
          setErrorMessage('Correo o contraseña incorrectos.');
        } else if (lower.includes('email not confirmed')) {
          setErrorMessage('Primero confirma tu correo antes de iniciar sesión.');
        } else {
          setErrorMessage(error.message);
        }

        setIsSubmitting(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile) {
        setErrorMessage('La cuenta no tiene un perfil asociado. Revisa los permisos de la tabla usuarios.');
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      router.replace(profile.rol === 'medico' ? '/medico' as any : '/dashboard' as any);
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
            <Text style={styles.subtitle}>Acceso seguro</Text>

            {errorMessage ? <Text style={styles.errorBox}>{errorMessage}</Text> : null}

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
              accessibilityHint="Escribe tu correo para iniciar sesión"
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
              textContentType="password"
              style={styles.input}
              accessibilityLabel="Contraseña"
              accessibilityHint="Escribe tu contraseña para iniciar sesión"
              autoComplete="current-password"
            />

            <Pressable style={styles.primaryButton} onPress={handleLogin} disabled={isSubmitting} accessibilityRole="button" accessibilityLabel={isSubmitting ? 'Iniciando sesión' : 'Iniciar sesión'} focusable>
              <Text style={styles.primaryText}>{isSubmitting ? 'Ingresando...' : 'Iniciar sesión'}</Text>
            </Pressable>

            <Pressable style={styles.linkButton} onPress={() => router.push('/register' as any)} accessibilityRole="button" accessibilityLabel="Crear una nueva cuenta" focusable>
              <Text style={styles.linkText}>Crear cuenta</Text>
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
