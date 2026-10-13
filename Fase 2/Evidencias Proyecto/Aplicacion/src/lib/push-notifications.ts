import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerPushDevice(): Promise<void> {
  if (!Device.isDevice || Platform.OS === 'web' || !supabase) return;

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('clinical-updates', {
      name: 'Actualizaciones clínicas',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#006B73',
    });
  }

  const existingPermissions = await Notifications.getPermissionsAsync();
  const permission = existingPermissions.granted
    ? existingPermissions
    : await Notifications.requestPermissionsAsync();
  if (!permission.granted) return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return;

  const { data: tokenData } = await Notifications.getExpoPushTokenAsync({ projectId });
  const { error } = await supabase.from('push_devices').upsert({
    user_id: userId,
    expo_push_token: tokenData,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,expo_push_token' });

  if (error) throw error;
}

export async function unregisterPushDevice(): Promise<void> {
  if (!Device.isDevice || Platform.OS === 'web' || !supabase) return;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return;

    const { data: tokenData } = await Notifications.getExpoPushTokenAsync({ projectId });
    await supabase.from('push_devices')
      .delete()
      .eq('user_id', userId)
      .eq('expo_push_token', tokenData);
  } catch {
    return;
  }
}

export async function dispatchRelevantNotification(input: {
  eventId: string;
  eventType: 'prescription_pending' | 'prescription_reviewed' | 'clinical_annotation' | 'health_variable' | 'medication_administered';
  patientId: string;
}): Promise<void> {
  if (!supabase) return;

  try {
    const { error } = await supabase.functions.invoke('dispatch-app-notification', {
      body: input,
    });
    if (error) console.warn('No se pudo despachar la notificación push.');
  } catch {
    console.warn('No se pudo despachar la notificación push.');
  }
}