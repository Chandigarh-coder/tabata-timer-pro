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

// Voice features removed

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
                        // Transition to work phase
                        break;
                    case 'work':
                        // Always go to rest after work, regardless of round position
                        nextPhase = 'rest';
                        nextTime = workout.rounds[prevStatus.currentRoundIndex].restTime;
                        // Skip rest if restTime is 0
                        if (nextTime <= 0) {
                            nextPhase = 'set_rest';
                            nextTime = workout.setRestTime;
                        }
                        break;
                    case 'rest':
                        // After rest, always go to set_rest (each exercise is treated as its own set)
                        // Check if this is the last exercise across all sets
                        if (prevStatus.currentRoundIndex >= workout.rounds.length - 1 && prevStatus.currentSet >= workout.sets) {
                            return { ...prevStatus, phase: 'finished', workoutCompleted: true, timeLeftInPhase: 0 };
                        }
                        nextPhase = 'set_rest';
                        nextTime = workout.setRestTime;
                        break;
                    case 'set_rest':
                        // Determine next phase: either next exercise or next set or finished
                        nextRoundIndex = prevStatus.currentRoundIndex + 1;
                        nextSet = prevStatus.currentSet;
                        
                        // If we've gone through all exercises, move to next set
                        if (nextRoundIndex >= workout.rounds.length) {
                            nextRoundIndex = 0; // Start from first exercise again
                            nextSet++;
                        }
                        
                        // Check if we've completed all sets
                        if (nextSet > workout.sets) {
                            return { ...prevStatus, phase: 'finished', workoutCompleted: true, timeLeftInPhase: 0 };
                        }
                        
                        nextPhase = 'work';
                        nextTime = workout.rounds[nextRoundIndex].workTime;
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
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications.');
      return;
    }

    // Permission check
    if (Notification.permission !== 'granted') {
      return;
    }
    
    // Use direct notification API to avoid service worker URL issues
    try {
      new Notification(title, {
        icon: '/logo.png',
        badge: '/logo.png',
        tag: 'tabata-timer-notification',
        requireInteraction: false,
        silent: true,
        body: '·', // Single dot character to override localhost URL
        data: null,
        ...options
      });
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }, []);

  return { showNotification };
}