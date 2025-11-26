'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

type RecordingMode = 'idle' | 'ptt' | 'toggle';

interface UseSpacebarRecordingProps {
  isListening: boolean;
  startListening: () => void;
  stopListening: () => void;
  onStopRecording: () => Promise<void>;
  onStopPTT: () => Promise<void>;
}

interface UseSpacebarRecordingReturn {
  recordingMode: RecordingMode;
  toggleRecording: () => Promise<void>;
  resetRecordingMode: () => void;
}

const DOUBLE_TAP_WINDOW_MS = 300;
const HOLD_THRESHOLD_MS = 200;

export function useSpacebarRecording({
  isListening,
  startListening,
  stopListening,
  onStopRecording,
  onStopPTT,
}: UseSpacebarRecordingProps): UseSpacebarRecordingReturn {
  const [recordingMode, setRecordingMode] = useState<RecordingMode>('idle');

  const spacebarDownTimeRef = useRef<number | null>(null);
  const lastSpaceTapTimeRef = useRef<number | null>(null);
  const isSpacebarHeldRef = useRef(false);
  const pttActiveRef = useRef(false);

  const resetRecordingMode = useCallback(() => {
    setRecordingMode('idle');
    pttActiveRef.current = false;
  }, []);

  const toggleRecording = useCallback(async () => {
    if (isListening) {
      resetRecordingMode();
      await onStopRecording();
    } else {
      setRecordingMode('toggle');
      startListening();
    }
  }, [isListening, startListening, onStopRecording, resetRecordingMode]);

  // Keyboard handlers
  useEffect(() => {
    const isInputFocused = () => {
      const el = document.activeElement;
      return (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el as HTMLElement)?.isContentEditable
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInputFocused() || e.code !== 'Space') return;

      e.preventDefault();
      if (isSpacebarHeldRef.current) return;
      isSpacebarHeldRef.current = true;

      const now = Date.now();
      spacebarDownTimeRef.current = now;

      const timeSinceLastTap = lastSpaceTapTimeRef.current
        ? now - lastSpaceTapTimeRef.current
        : Infinity;

      if (recordingMode === 'idle' && timeSinceLastTap < DOUBLE_TAP_WINDOW_MS) {
        // Double-tap -> toggle mode
        lastSpaceTapTimeRef.current = null;
        setRecordingMode('toggle');
        startListening();
      } else if (recordingMode === 'idle' && !isListening) {
        // Start PTT
        pttActiveRef.current = true;
        setRecordingMode('ptt');
        startListening();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (isInputFocused() || e.code !== 'Space') return;

      const now = Date.now();
      const holdDuration = spacebarDownTimeRef.current
        ? now - spacebarDownTimeRef.current
        : 0;

      isSpacebarHeldRef.current = false;
      spacebarDownTimeRef.current = null;

      if (recordingMode === 'toggle' && holdDuration < HOLD_THRESHOLD_MS) {
        // Tap in toggle mode -> stop
        setRecordingMode('idle');
        onStopRecording();
      } else if (pttActiveRef.current) {
        pttActiveRef.current = false;
        if (holdDuration >= HOLD_THRESHOLD_MS) {
          // Proper hold release -> stop PTT with analysis
          setRecordingMode('idle');
          onStopPTT();
        } else {
          // Quick tap -> record time for double-tap detection
          lastSpaceTapTimeRef.current = now;
          setRecordingMode('idle');
          stopListening();
        }
      } else if (recordingMode === 'idle') {
        // Tap in idle -> record for double-tap
        lastSpaceTapTimeRef.current = now;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    recordingMode,
    isListening,
    startListening,
    stopListening,
    onStopRecording,
    onStopPTT,
  ]);

  // Window blur -> stop PTT
  useEffect(() => {
    const handleBlur = () => {
      if (pttActiveRef.current) {
        pttActiveRef.current = false;
        isSpacebarHeldRef.current = false;
        setRecordingMode('idle');
        onStopPTT();
      }
    };

    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [onStopPTT]);

  return { recordingMode, toggleRecording, resetRecordingMode };
}
