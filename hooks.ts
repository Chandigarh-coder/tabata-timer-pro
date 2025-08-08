import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Workout, TimerStatus, TimerPhase } from './types';

// useLocalStorage Hook
export function useLocalStorage<T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue: React.Dispatch<React.SetStateAction<T>> = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
}

// useDarkMode Hook
export function useDarkMode(): [boolean, (isDark: boolean) => void] {
    const [isDarkMode, setIsDarkMode] = useLocalStorage<boolean>('darkMode', false);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        const storedPreference = window.localStorage.getItem('darkMode');
        if (storedPreference === null) {
            setIsDarkMode(mediaQuery.matches);
        }

        const handleChange = () => {
             if (window.localStorage.getItem('darkMode') === null) {
                setIsDarkMode(mediaQuery.matches);
             }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const setDarkMode = (isDark: boolean) => {
        setIsDarkMode(isDark);
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    return [isDarkMode, setDarkMode];
}

// useAudio Hook
export function useAudio() {
  const audioContextRef = useRef<AudioContext | null>(null);

  const playBeep = useCallback((freq = 523, duration = 0.1, vol = 30) => {
    if (!audioContextRef.current) {
        try {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch(e) {
            console.error("Web Audio API is not supported in this browser");
            return;
        }
    }
    const context = audioContextRef.current;
    if (!context) return;
    
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    gainNode.gain.value = vol / 100;
    oscillator.frequency.value = freq;
    oscillator.type = 'sine';

    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + duration);
  }, []);

  return { playBeep };
}

// useVoices Hook
export function useVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return;
    }
    
    const synth = window.speechSynthesis;
    const updateVoices = () => {
      setVoices(synth.getVoices());
    };

    // If voices are already available, set them immediately
    if (synth.getVoices().length > 0) {
      updateVoices();
    }

    synth.addEventListener('voiceschanged', updateVoices);
    
    return () => {
      synth.removeEventListener('voiceschanged', updateVoices);
    };
  }, []);

  return voices;
}

// useSpeech Hook
export const useSpeech = (voiceURI: string | null) => {
  const [synth, setSynth] = useState<SpeechSynthesis | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const voicesLoaded = useRef(false);

  const updateVoices = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
        voicesLoaded.current = true;
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      setSynth(window.speechSynthesis);
      
      // Initial voices load
      updateVoices();
      
      // Set up event listener for voice changes
      window.speechSynthesis.onvoiceschanged = updateVoices;
      
      // Cleanup
      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    } else {
      console.error('Web Speech API is not supported in this browser.');
    }
  }, [updateVoices]);

  const speak = useCallback((text: string) => {
    // Check if Web Speech API is available
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      console.error('Speech synthesis not available in this browser or environment.');
      return;
    }
    
    if (!synth) {
      console.error('Speech synthesis not available');
      return;
    }

    // Create a new utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.1;

    // Always get fresh voices list when speaking
    const availableVoices = window.speechSynthesis.getVoices();
    
    if (voiceURI) {
      // First try to find the voice in the available voices
      let selectedVoice = availableVoices.find(voice => voice.voiceURI === voiceURI);
      
      // If not found, try to find a voice with matching language (as a fallback)
      if (!selectedVoice && voiceURI.includes('-')) {
        const lang = voiceURI.split('-')[0];
        selectedVoice = availableVoices.find(voice => voice.lang.startsWith(lang));
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log('Using voice:', selectedVoice.name, selectedVoice.lang);
      } else {
        console.warn(`Voice with URI ${voiceURI} not found. Using default voice.`);
        console.log('Available voices:', availableVoices.map(v => `${v.name} (${v.voiceURI})`));
      }
    }

    // Cancel any current speech and speak the new utterance
    synth.cancel();
    synth.speak(utterance);
  }, [synth, voiceURI]);

  return { speak, voices };
}

// useTimer Hook
const PREPARE_TIME = 5;

export function useTimer(workout: Workout | null, isPaused: boolean) {
    const [status, setStatus] = useState<TimerStatus>({
        phase: 'prepare',
        currentSet: 1,
        currentRoundIndex: 0,
        timeLeftInPhase: PREPARE_TIME,
        totalPhaseTime: PREPARE_TIME,
        workoutCompleted: false,
    });

    useEffect(() => {
        if (!workout || isPaused || status.workoutCompleted) {
            return;
        }

        const interval = setInterval(() => {
            setStatus(prevStatus => {
                if (prevStatus.timeLeftInPhase > 1) {
                    return { ...prevStatus, timeLeftInPhase: prevStatus.timeLeftInPhase - 1 };
                }

                // Time to transition to the next phase
                let nextPhase: TimerPhase = 'work';
                let nextSet = prevStatus.currentSet;
                let nextRoundIndex = prevStatus.currentRoundIndex;
                let nextTime = 0;

                const isLastRound = prevStatus.currentRoundIndex === workout.rounds.length - 1;
                const isLastSet = prevStatus.currentSet === workout.sets;

                switch (prevStatus.phase) {
                    case 'prepare':
                        nextPhase = 'work';
                        nextTime = workout.rounds[0].workTime;
                        break;
                    case 'work':
                        if (isLastRound) {
                            if (isLastSet) {
                                return { ...prevStatus, phase: 'finished', workoutCompleted: true, timeLeftInPhase: 0 };
                            }
                            nextPhase = 'set_rest';
                            nextTime = workout.setRestTime;
                        } else {
                            nextPhase = 'rest';
                            nextTime = workout.rounds[prevStatus.currentRoundIndex].restTime;
                        }
                        break;
                    case 'rest':
                        nextPhase = 'work';
                        nextRoundIndex++;
                        nextTime = workout.rounds[nextRoundIndex].workTime;
                        break;
                    case 'set_rest':
                        nextPhase = 'work';
                        nextSet++;
                        nextRoundIndex = 0;
                        nextTime = workout.rounds[0].workTime;
                        break;
                }
                
                return {
                    ...prevStatus,
                    phase: nextPhase,
                    currentSet: nextSet,
                    currentRoundIndex: nextRoundIndex,
                    timeLeftInPhase: nextTime,
                    totalPhaseTime: nextTime,
                };
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [workout, isPaused, status.workoutCompleted]);

    const resetTimer = useCallback(() => {
        setStatus({
            phase: 'prepare',
            currentSet: 1,
            currentRoundIndex: 0,
            timeLeftInPhase: PREPARE_TIME,
            totalPhaseTime: PREPARE_TIME,
            workoutCompleted: false,
        });
    }, []);

    return { status, resetTimer };
}

// useNotifications Hook
export function useNotifications() {
  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    // Basic browser support check
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      console.warn('This browser does not support notifications or service workers.');
      return;
    }

    // Permission check
    if (Notification.permission !== 'granted') {
      // Don't log here, the settings modal already handles user feedback.
      return;
    }
    
    // Only show notification if the page is not visible, to avoid being annoying.
    if (document.hidden) {
      // Use navigator.serviceWorker.ready to ensure we have an active service worker.
      // This is the most robust way to handle this, avoiding race conditions on load.
      navigator.serviceWorker.ready.then(registration => {
        // We message the active service worker, which then shows the notification.
        // This ensures the notification is created from a trusted background context.
        if (registration.active) {
            registration.active.postMessage({
              type: 'show-notification',
              title: title,
              options: { 
                ...options,
                tag: 'tabata-timer-notification', // Use a tag to prevent spamming notifications.
                renotify: true, // Re-notify even if a notification with the same tag is active.
              },
            });
        } else {
             console.error("Service worker is ready, but no active worker found. Cannot show notification.");
        }
      }).catch(error => {
          console.error("Error with service worker readiness, cannot show notification:", error);
      });
    }
  }, []);

  return { showNotification };
}