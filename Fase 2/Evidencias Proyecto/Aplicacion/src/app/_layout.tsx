import { DarkTheme, DefaultTheme, Slot, ThemeProvider, router, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useColorScheme, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AppLoaderSkeleton } from '@/components/ui/skeleton';
import CareBottomTabs from '@/components/care-bottom-tabs';
import { registerPushDevice } from '@/lib/push-notifications';
import { supabase } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync();

const publicRoutes = new Set(['index', 'login', 'register', 'onboarding', 'onboarding-2']);

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const segments = useSegments();
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const rootSegment = segments[0] ?? 'index';
  const isPublicRoute = publicRoutes.has(rootSegment);

  useEffect(() => {
    if (!supabase) {
      setHasSession(false);
      return;
    }

    let active = true;
    let sessionInitialized = false;
    let registrationScheduled = false;
    const register = () => {
      if (registrationScheduled) return;
      registrationScheduled = true;
      setTimeout(() => {
        if (!active) return;
        void registerPushDevice()
          .catch(() => undefined)
          .finally(() => { registrationScheduled = false; });
      }, 0);
    };

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      sessionInitialized = true;
      setHasSession(!error && Boolean(data.session));
      if (data.session) register();
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active && sessionInitialized) setHasSession(Boolean(session));
      if (session) register();
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (hasSession === false && !isPublicRoute) {
      router.replace('/login' as any);
    }
  }, [hasSession, isPublicRoute]);

  const isCheckingProtectedRoute = hasSession === null && !isPublicRoute;
  const isRedirectingProtectedRoute = hasSession === false && !isPublicRoute;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          {isCheckingProtectedRoute || isRedirectingProtectedRoute ? <AppLoaderSkeleton /> : <Slot />}
        </View>
        <CareBottomTabs />
      </View>
    </ThemeProvider>
  );
}
