import { router, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import TabBar, { type TabName } from '@/components/navbar';
import { getCurrentUserRole, type RoleKey } from '@/lib/linkcare-data';
import { supabase } from '@/lib/supabase';

const routes: Record<TabName, string> = {
  home: '/dashboard',
  medications: '/medications-day',
  qr: '/qr-patient-summary',
  notes: '/annotations',
  profile: '/profile-settings',
};

export default function CareBottomTabs() {
  const segments = useSegments();
  const [role, setRole] = useState<RoleKey | null>(null);
  const currentSegment = segments[segments.length - 1] ?? '';
  const isAuthRoute = ['index', 'login', 'register', 'onboarding', 'onboarding-2'].includes(currentSegment);

  useEffect(() => {
    let active = true;
    const loadRole = async () => {
      const nextRole = await getCurrentUserRole();
      if (active) setRole(nextRole);
    };

    void loadRole();

    const subscription = supabase?.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setRole(null);
        return;
      }

      setTimeout(() => void loadRole(), 0);
    }).data.subscription;

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  if ((role !== 'cuidador' && role !== 'familiar') || isAuthRoute) {
    return null;
  }

  const activeTab: TabName = currentSegment === 'medications-day' || currentSegment === 'medication-history'
    ? 'medications'
    : currentSegment === 'qr-patient-summary'
      ? 'qr'
      : currentSegment === 'annotations' || currentSegment === 'annotations-new'
        ? 'notes'
        : currentSegment === 'profile-settings'
          ? 'profile'
          : 'home';

  return (
    <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#FFFFFF' }}>
      <TabBar
        activeTab={activeTab}
        primaryLabel="Mostrar código QR al equipo médico"
        onChange={(tab) => router.navigate(routes[tab] as any)}
      />
    </SafeAreaView>
  );
}
