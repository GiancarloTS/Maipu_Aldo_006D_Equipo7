import { DarkTheme, DefaultTheme, Slot, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import CareBottomTabs from '@/components/care-bottom-tabs';
import { registerPushDevice } from '@/lib/push-notifications';
import { supabase } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (!supabase) return;

    let active = true;
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

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) register();
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) register();
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          <Slot />
        </View>
        <CareBottomTabs />
      </View>
    </ThemeProvider>
  );
}
