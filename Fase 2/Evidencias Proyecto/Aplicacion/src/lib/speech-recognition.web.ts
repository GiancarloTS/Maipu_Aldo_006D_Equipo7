type WebSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  addEventListener: (type: string, listener: (event: any) => void) => void;
  removeEventListener: (type: string, listener: (event: any) => void) => void;
};

type SpeechRecognitionConstructor = new () => WebSpeechRecognition;

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

export type SpeechRecognitionEventName = 'start' | 'end' | 'result' | 'error';

export type SpeechRecognitionClient = {
  start: (options?: { lang?: string; interimResults?: boolean; continuous?: boolean }) => void;
  stop: () => void;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  addListener: (eventName: SpeechRecognitionEventName, listener: (event: any) => void) => { remove: () => void };
};

export async function createSpeechRecognitionClient(): Promise<SpeechRecognitionClient> {
  const webWindow = globalThis as unknown as SpeechRecognitionWindow;
  const SpeechRecognitionClass = webWindow.SpeechRecognition ?? webWindow.webkitSpeechRecognition;

  if (!SpeechRecognitionClass) {
    throw new Error('Web Speech Recognition is not available in this browser.');
  }

  const recognition = new SpeechRecognitionClass();
  recognition.lang = 'es-ES';
  recognition.interimResults = true;
  recognition.continuous = false;

  return {
    start: () => recognition.start(),
    stop: () => recognition.stop(),
    requestPermissionsAsync: async () => ({ granted: true }),
    addListener: (eventName, listener) => {
      const eventListener = (event: any) => listener(event);
      recognition.addEventListener(eventName, eventListener);
      return {
        remove: () => recognition.removeEventListener(eventName, eventListener),
      };
    },
  };
}
