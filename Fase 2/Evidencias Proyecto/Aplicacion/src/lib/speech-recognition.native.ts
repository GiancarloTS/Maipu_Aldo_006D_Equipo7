import { requireOptionalNativeModule } from 'expo-modules-core';
import type { ExpoSpeechRecognitionOptions } from 'expo-speech-recognition';

export type SpeechRecognitionEventName = 'start' | 'end' | 'result' | 'error';

type SpeechRecognitionNativeModule = {
  start: (options: ExpoSpeechRecognitionOptions) => void;
  stop: () => void;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  addListener: (eventName: SpeechRecognitionEventName, listener: (event: any) => void) => { remove: () => void };
};

export type SpeechRecognitionClient = {
  start: (options?: { lang?: string; interimResults?: boolean; continuous?: boolean }) => void;
  stop: () => void;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  addListener: (eventName: SpeechRecognitionEventName, listener: (event: any) => void) => { remove: () => void };
};

const speechRecognitionModule = requireOptionalNativeModule<SpeechRecognitionNativeModule>('ExpoSpeechRecognition');

export async function createSpeechRecognitionClient(): Promise<SpeechRecognitionClient> {
  if (!speechRecognitionModule) {
    throw new Error('El reconocimiento de voz requiere una compilación de desarrollo; Expo Go no incluye este módulo nativo.');
  }

  return {
    start: (options) => speechRecognitionModule.start({
      lang: options?.lang ?? 'es-ES',
      interimResults: options?.interimResults ?? true,
      continuous: options?.continuous ?? false,
    }),
    stop: () => speechRecognitionModule.stop(),
    requestPermissionsAsync: async () => speechRecognitionModule.requestPermissionsAsync(),
    addListener: (eventName, listener) => {
      const subscription = speechRecognitionModule.addListener(eventName, listener);
      return { remove: () => subscription.remove() };
    },
  };
}
