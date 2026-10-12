import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

export type SpeechRecognitionEventName = 'start' | 'end' | 'result' | 'error';

export type SpeechRecognitionClient = {
  start: (options?: { lang?: string; interimResults?: boolean; continuous?: boolean }) => void;
  stop: () => void;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  addListener: (eventName: SpeechRecognitionEventName, listener: (event: any) => void) => { remove: () => void };
};

export async function createSpeechRecognitionClient(): Promise<SpeechRecognitionClient> {
  return {
    start: (options) => ExpoSpeechRecognitionModule.start({
      lang: options?.lang ?? 'es-ES',
      interimResults: options?.interimResults ?? true,
      continuous: options?.continuous ?? false,
    }),
    stop: () => ExpoSpeechRecognitionModule.stop(),
    requestPermissionsAsync: async () => ExpoSpeechRecognitionModule.requestPermissionsAsync(),
    addListener: (eventName, listener) => {
      const subscription = ExpoSpeechRecognitionModule.addListener(eventName, listener);
      return { remove: () => subscription.remove() };
    },
  };
}
