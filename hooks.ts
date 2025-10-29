import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Workout, TimerStatus, TimerPhase, TimerTransitionEvent } from './types';

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

    const [pendingTransitions, setPendingTransitions] = useState<TimerTransitionEvent[]>([]);
    const lastUpdateRef = useRef<number | null>(null);
    const leftoverMsRef = useRef<number>(0);
    const nextTransitionIdRef = useRef<number>(1);

    const transitionPhase = useCallback((currentStatus: TimerStatus): TimerStatus => {
        if (!workout) {
            return currentStatus;
        }

        switch (currentStatus.phase) {
            case 'prepare': {
                const nextRound = workout.rounds[0];
                return {
                    ...currentStatus,
                    phase: 'work',
                    currentSet: 1,
                    currentRoundIndex: 0,
                    timeLeftInPhase: nextRound.workTime,
                    totalPhaseTime: nextRound.workTime,
                };
            }
            case 'work': {
                const round = workout.rounds[currentStatus.currentRoundIndex];
                const isFinalExercise = currentStatus.currentSet === workout.sets && currentStatus.currentRoundIndex === workout.rounds.length - 1;

                if (round.restTime <= 0) {
                    if (isFinalExercise) {
                        return {
                            ...currentStatus,
                            phase: 'finished',
                            workoutCompleted: true,
                            timeLeftInPhase: 0,
                            totalPhaseTime: 0,
                        };
                    }
                    return {
                        ...currentStatus,
                        phase: 'set_rest',
                        timeLeftInPhase: workout.setRestTime,
                        totalPhaseTime: workout.setRestTime,
                    };
                }

                return {
                    ...currentStatus,
                    phase: 'rest',
                    timeLeftInPhase: round.restTime,
                    totalPhaseTime: round.restTime,
                };
            }
            case 'rest': {
                const isFinalExercise = currentStatus.currentSet === workout.sets && currentStatus.currentRoundIndex === workout.rounds.length - 1;
                if (isFinalExercise) {
                    return {
                        ...currentStatus,
                        phase: 'finished',
                        workoutCompleted: true,
                        timeLeftInPhase: 0,
                        totalPhaseTime: 0,
                    };
                }

                return {
                    ...currentStatus,
                    phase: 'set_rest',
                    timeLeftInPhase: workout.setRestTime,
                    totalPhaseTime: workout.setRestTime,
                };
            }
            case 'set_rest': {
                let nextRoundIndex = currentStatus.currentRoundIndex + 1;
                let nextSet = currentStatus.currentSet;

                if (nextRoundIndex >= workout.rounds.length) {
                    nextRoundIndex = 0;
                    nextSet += 1;
                }

                if (nextSet > workout.sets) {
                    return {
                        ...currentStatus,
                        phase: 'finished',
                        workoutCompleted: true,
                        timeLeftInPhase: 0,
                        totalPhaseTime: 0,
                    };
                }

                const nextRound = workout.rounds[nextRoundIndex];
                return {
                    ...currentStatus,
                    phase: 'work',
                    currentSet: nextSet,
                    currentRoundIndex: nextRoundIndex,
                    timeLeftInPhase: nextRound.workTime,
                    totalPhaseTime: nextRound.workTime,
                };
            }
            case 'finished':
            default:
                return currentStatus;
        }
    }, [workout]);

    const advanceTimer = useCallback((currentStatus: TimerStatus, elapsedSeconds: number, now: number) => {
        if (!workout || elapsedSeconds <= 0) {
            return { status: currentStatus, events: [] as TimerTransitionEvent[] };
        }

        let statusSnapshot = { ...currentStatus };
        let remaining = elapsedSeconds;
        const events: TimerTransitionEvent[] = [];
        let timestampCursor = now - elapsedSeconds * 1000;

        const pushEvent = (nextStatus: TimerStatus) => {
            events.push({
                id: nextTransitionIdRef.current++,
                phase: nextStatus.phase,
                set: nextStatus.currentSet,
                roundIndex: nextStatus.currentRoundIndex,
                occurredAt: timestampCursor,
            });
        };

        while (remaining > 0 && !statusSnapshot.workoutCompleted) {
            if (statusSnapshot.timeLeftInPhase <= 0) {
                const nextStatus = transitionPhase(statusSnapshot);
                if (nextStatus === statusSnapshot) {
                    break;
                }
                pushEvent(nextStatus);
                statusSnapshot = nextStatus;
                continue;
            }

            if (remaining < statusSnapshot.timeLeftInPhase) {
                return {
                    status: {
                        ...statusSnapshot,
                        timeLeftInPhase: statusSnapshot.timeLeftInPhase - remaining,
                    },
                    events,
                };
            }

            timestampCursor += statusSnapshot.timeLeftInPhase * 1000;
            remaining -= statusSnapshot.timeLeftInPhase;
            statusSnapshot = { ...statusSnapshot, timeLeftInPhase: 0 };

            const nextStatus = transitionPhase(statusSnapshot);
            if (nextStatus === statusSnapshot) {
                break;
            }

            pushEvent(nextStatus);
            statusSnapshot = nextStatus;
        }

        return { status: statusSnapshot, events };
    }, [transitionPhase, workout]);

    useEffect(() => {
        if (!workout || isPaused || status.workoutCompleted) {
            lastUpdateRef.current = null;
            leftoverMsRef.current = 0;
            return;
        }

        const tick = () => {
            const now = Date.now();

            if (lastUpdateRef.current === null) {
                lastUpdateRef.current = now;
                leftoverMsRef.current = 0;
                return;
            }

            const deltaMs = now - lastUpdateRef.current + leftoverMsRef.current;
            const elapsedSeconds = Math.floor(deltaMs / 1000);
            leftoverMsRef.current = deltaMs - elapsedSeconds * 1000;
            lastUpdateRef.current = now;

            if (elapsedSeconds > 0) {
                setStatus(prevStatus => {
                    const { status: nextStatus, events } = advanceTimer(prevStatus, elapsedSeconds, now);
                    if (events.length) {
                        setPendingTransitions(prev => [...prev, ...events]);
                    }
                    return nextStatus;
                });
            }
        };

        const intervalId = window.setInterval(tick, 250);

        const handleVisibilityChange = () => {
            if (document.hidden) {
                lastUpdateRef.current = Date.now();
            } else {
                tick();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            lastUpdateRef.current = null;
            leftoverMsRef.current = 0;
        };
    }, [advanceTimer, isPaused, status.workoutCompleted, workout]);

    const clearTransitions = useCallback(() => {
        setPendingTransitions([]);
    }, []);

    const resetTimer = useCallback(() => {
        lastUpdateRef.current = null;
        leftoverMsRef.current = 0;
        nextTransitionIdRef.current = 1;
        setPendingTransitions([]);
        setStatus({
            phase: 'prepare',
            currentSet: 1,
            currentRoundIndex: 0,
            timeLeftInPhase: PREPARE_TIME,
            totalPhaseTime: PREPARE_TIME,
            workoutCompleted: false,
        });
    }, []);

    return { status, resetTimer, pendingTransitions, clearTransitions };
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