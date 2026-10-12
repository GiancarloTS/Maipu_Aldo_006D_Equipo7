
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppLoaderSkeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';

export default function SplashScreen() {
  const [statusText, setStatusText] = useState('Preparando sesión y datos clínicos...');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      try {
        if (!supabase) {
          if (active) {
            setStatusText('Configuración faltante. Revisa tus credenciales de Supabase.');
            setIsLoading(false);
            setTimeout(() => router.replace('/onboarding' as any), 1200);
          }
          return;
        }

        const { data, error } = await supabase.auth.getSession();

        if (!active) return;

        if (error) {
          setStatusText('No se pudo validar la sesión.');
          setIsLoading(false);
          setTimeout(() => router.replace('/onboarding' as any), 1200);
          return;
        }

        if (data.session) {
          setStatusText('Sesión activa. Entrando a tu panel...');
          setIsLoading(false);
          const { data: profile } = await supabase
            .from('usuarios')
            .select('rol')
            .eq('id', data.session.user.id)
            .maybeSingle();
          if (active) {
            router.replace(profile?.rol === 'medico' ? '/medico' as any : '/dashboard' as any);
          }
          return;
        }

        setStatusText('Bienvenido. Preparando tu experiencia...');
        setIsLoading(false);
        setTimeout(() => router.replace('/onboarding' as any), 1000);
      } catch {
        if (active) {
          setStatusText('No se pudo continuar. Intenta nuevamente.');
          setIsLoading(false);
          setTimeout(() => router.replace('/onboarding' as any), 1200);
        }
      }
    };

    checkSession();

    return () => {
      active = false;
    };
  }, []);

  // 1) Skeleton Screen: reemplaza el spinner por placeholders que respetan el layout real antes de mostrar la interfaz.
  if (isLoading) {
    return <AppLoaderSkeleton />;
  }

  return (
    <View style={styles.screen} accessible accessibilityRole="image" accessibilityLabel={`Inicio de LinkCare. ${statusText}`}>
      <View style={styles.logoWrap}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>♥</Text>
        </View>
        <Text style={styles.brand}>LinkCare</Text>
        <Text style={styles.subtext}>{statusText}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#edf7fb',
    paddingHorizontal: 24,
  },
  logoWrap: {
    alignItems: 'center',
  },
  logoBadge: {
    width: 104,
    height: 104,
    borderRadius: 32,
    backgroundColor: '#028090',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#023047',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
    marginBottom: 18,
  },
  logoText: {
    color: '#fff',
    fontSize: 42,
    fontWeight: '800',
  },
  brand: {
    color: '#023047',
    fontSize: 34,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtext: {
    color: '#4a5568',
    fontSize: 15,
    textAlign: 'center',
  },
  loader: {
    marginTop: 28,
  },
});

