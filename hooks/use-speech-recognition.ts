'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onend: () => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new (): SpeechRecognition;
    };
  }
}

interface UseSpeechRecognitionProps {
  onResult?: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

function checkSpeechRecognitionSupport(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function useSpeechRecognition({
  onResult,
  onError,
}: UseSpeechRecognitionProps = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported] = useState(() => checkSpeechRecognitionSupport());
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isStartingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          const text = result[0].transcript;

          if (result.isFinal) {
            if (onResult) onResult(text.trim(), true);
          } else {
            interimTranscript += text;
            if (onResult) onResult(text, false);
          }
        }

        // Only show interim transcript in state - final results are handled via onResult callback
        // This prevents double-counting when displaying cumulative + current transcript
        setTranscript(interimTranscript);
      };

      recognition.onend = () => {
        setIsListening(false);
        isStartingRef.current = false;
      };

      recognition.onerror = (event) => {
        if (event.error === 'no-speech') {
          // Ignore no-speech errors as they just mean silence
          return;
        }

        console.warn('Speech recognition error:', event.error);

        if (onError) onError(event.error);
        setIsListening(false);
        isStartingRef.current = false;
      };

      recognitionRef.current = recognition;
    }
  }, [onResult, onError]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening && !isStartingRef.current) {
      try {
        isStartingRef.current = true;
        recognitionRef.current.start();
        setIsListening(true);
        // Don't reset transcript - let it accumulate
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        isStartingRef.current = false;
        setIsListening(false);
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && (isListening || isStartingRef.current)) {
      try {
        recognitionRef.current.stop();
        // Also abort to immediately stop processing
        recognitionRef.current.abort();
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      }
      setIsListening(false);
      isStartingRef.current = false;
      setTranscript(''); // Clear interim transcript
    }
  }, [isListening]);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported,
  };
}
