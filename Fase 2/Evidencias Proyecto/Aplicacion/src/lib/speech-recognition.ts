import { Platform } from 'react-native';

export type SpeechRecognitionClient = {
  start: (options?: { lang?: string; interimResults?: boolean; continuous?: boolean }) => void;
  stop: () => void;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  addListener: (eventName: 'start' | 'end' | 'result' | 'error', listener: (event: any) => void) => { remove: () => void };
};

export async function createSpeechRecognitionClient(): Promise<SpeechRecognitionClient> {
  const platformClient = await import(
    Platform.OS === 'web' ? '@/lib/speech-recognition.web' : '@/lib/speech-recognition.native'
  );
  return platformClient.createSpeechRecognitionClient();
}
