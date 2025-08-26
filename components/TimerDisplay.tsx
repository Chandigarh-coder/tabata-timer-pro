import React, { useState, useEffect, useReducer, useRef } from 'react';
import { Workout, AppSettings } from '../types';
import { useTimer, useAudio, useNotifications } from '../hooks';
import { PlayIcon, PauseIcon, StopIcon } from './icons';

// Sonic Mode reducer types and initial state
interface SonicModeState {
  phase: 'listen' | 'earRest';
  timeLeft: number;
  cycleCount: number;
  isActive: boolean;
}

type SonicModeAction = 
  | { type: 'TICK' }
  | { type: 'TRANSITION' }
  | { type: 'START' }
  | { type: 'STOP' };

const initialSonicModeState: SonicModeState = {
  phase: 'listen',
  timeLeft: 60 * 60, // 60 minutes in seconds
  cycleCount: 1,
  isActive: false,
};

function sonicModeReducer(state: SonicModeState, action: SonicModeAction): SonicModeState {
  switch (action.type) {
    case 'TICK':
      return {
        ...state,
        timeLeft: Math.max(0, state.timeLeft - 1),
      };
    case 'TRANSITION':
      if (state.phase === 'listen') {
        // After listening, take WHO-recommended 10-minute break
        return {
          ...state,
          phase: 'earRest',
          timeLeft: 10 * 60, // 10 minutes (WHO standard)
          cycleCount: state.cycleCount + 1,
        };
      } else {
        // After break, go back to listening
        return {
          ...state,
          phase: 'listen',
          timeLeft: 60 * 60, // 60 minutes
        };
      }
    case 'START':
      return { ...initialSonicModeState, isActive: true };
    case 'STOP':
      return { ...initialSonicModeState, isActive: false };
    default:
      return state;
  }
}

// Circular progress component
interface CircularProgressProps {
  progress: number;
  colorClass: string;
  children: React.ReactNode;
  strokeWidth?: number;
  size?: number;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  progress,
  colorClass,
  children,
  strokeWidth = 8,
  size = 200,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - progress * circumference;

  return (
    <div className="relative mx-auto w-[min(56vw,30vh)] h-[min(56vw,30vh)]">
      <svg className="w-full h-full" viewBox="0 0 200 200">
        <circle
          className="text-slate-200 dark:text-slate-700"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx="100"
          cy="100"
        />
        <circle
          className={`transform -rotate-90 origin-center transition-all duration-1000 ease-linear ${colorClass}`}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx="100"
          cy="100"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
};

interface TimerDisplayProps {
  workout: Workout | null;
  settings: AppSettings;
  isPaused: boolean;
  setPaused: React.Dispatch<React.SetStateAction<boolean>>;
  onStop: () => void;
  isSonicModeActive: boolean;
}

const TimerDisplay: React.FC<TimerDisplayProps> = ({ 
  workout, 
  settings, 
  isPaused, 
  setPaused, 
  onStop, 
  isSonicModeActive 
}) => {
  // Debug logging removed - timer functionality confirmed working
  
  const { status, resetTimer } = useTimer(workout, isPaused);
  const { playBeep } = useAudio();
  const { showNotification } = useNotifications();

  
  
  // Initialize Sonic Mode reducer
  const [sonicModeState, dispatchSonicModeAction] = useReducer(sonicModeReducer, initialSonicModeState);
  const { phase: sonicPhase, timeLeft: sonicTimeLeft, cycleCount: sonicCycleCount } = sonicModeState;

  // Handle Sonic Mode timer ticks and transitions
  React.useEffect(() => {
    if (!isSonicModeActive || isPaused) return;

    const timer = setInterval(() => {
      dispatchSonicModeAction({ type: 'TICK' });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSonicModeActive, isPaused]);

  // Handle Sonic Mode phase transitions
  React.useEffect(() => {
    if (isSonicModeActive && sonicTimeLeft <= 0) {
      dispatchSonicModeAction({ type: 'TRANSITION' });
    }
  }, [isSonicModeActive, sonicTimeLeft]);

  // Handle Sonic Mode activation/deactivation
  React.useEffect(() => {
    if (isSonicModeActive) {
      dispatchSonicModeAction({ type: 'START' });
    } else {
      dispatchSonicModeAction({ type: 'STOP' });
    }
  }, [isSonicModeActive]);

  const { phase, currentSet, currentRoundIndex, timeLeftInPhase, totalPhaseTime, workoutCompleted } = status;

  const currentRound = workout && workout.rounds[currentRoundIndex];

  // Avoid overlapping sounds: play the first immediately, then if another fires within window, delay it slightly
  const lastPhaseSoundRef = useRef<{ t: number; src: 'tabata' | 'sonic' | '' }>({ t: 0, src: '' });
  const requestPhaseSound = (src: 'tabata' | 'sonic', fn: () => void) => {
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const windowMs = 600; // sounds within this window are considered conflicting
    const delayMs = 350;  // delay the second sound so they don’t overlap
    const last = lastPhaseSoundRef.current;
    if (now - last.t < windowMs) {
      // schedule the new sound slightly later so both cues are heard without overlap
      const scheduledAt = now + delayMs;
      lastPhaseSoundRef.current = { t: scheduledAt, src };
      setTimeout(() => {
        fn();
      }, delayMs);
      return;
    }
    lastPhaseSoundRef.current = { t: now, src };
    fn();
  };

  useEffect(() => {
    if (workoutCompleted) {
        // Play completion chime sequence
        if(settings.soundOn) {
          playBeep(880, 0.2);
          setTimeout(() => playBeep(988, 0.2), 250);
          setTimeout(() => playBeep(1047, 0.3), 500);
        }
        if(settings.notificationsOn) showNotification("FINISHED!");
        setTimeout(onStop, 3000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workoutCompleted, settings.soundOn, settings.notificationsOn, onStop, playBeep, showNotification]);

  useEffect(() => {
    // Announce phase changes
    if (isPaused) return;
    
    // Allow phase change announcements even if currentRound is null (for set_rest, finished phases)
    if (!currentRound && phase !== 'set_rest' && phase !== 'finished') return;

    // Critical state transition beep and notification - only when phase actually changes
    const currentPhaseKey = `${phase}-${currentSet}-${currentRoundIndex}`;
    const hasPhaseChanged = previousPhaseRef.current !== '' && previousPhaseRef.current !== currentPhaseKey;
    
    // Phase change detection logic
    
    // Update the previous phase reference immediately after checking for changes
    const previousPhaseKey = previousPhaseRef.current;
    previousPhaseRef.current = currentPhaseKey;
    
    if (hasPhaseChanged) {
        let announcement = '';
        switch (phase) {
          case 'prepare':
              announcement = 'PREPARE';
              break;
          case 'work':
              announcement = currentRound?.exerciseName?.toUpperCase() || 'WORK';
              break;
          case 'rest':
              announcement = 'REST';
              break;
          case 'set_rest':
              announcement = 'SET REST';
              break;
        }
        
        // Phase transition confirmed
        
        // Show notification for phase change
        if (announcement && settings.notificationsOn) {
            showNotification(announcement);
        }
        
        // Play phase transition beep
        if (settings.soundOn && !workoutCompleted) {
            playBeep(784, 0.3); // G5 - Louder state change beep
        }
    }
    
    // Countdown beeps for last 3 seconds of any phase
    if (settings.soundOn && timeLeftInPhase <= 3 && timeLeftInPhase > 0) {
        playBeep(523, 0.1); // C5 - Countdown beeps
    }
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, totalPhaseTime, timeLeftInPhase, settings, workout, currentRound, isPaused, playBeep, showNotification, currentSet, currentRoundIndex, workoutCompleted]);
  
  const handleStop = () => {
    resetTimer();
    onStop();
  };
  
  const progress = totalPhaseTime > 0 ? (totalPhaseTime - timeLeftInPhase) / totalPhaseTime : 0;
  
  const phaseInfo = React.useMemo(() => {
    switch(phase) {
        case 'prepare': return { text: 'PREPARE', color: 'text-yellow-500' };
        case 'work': return { text: 'WORK', color: 'text-brand-orange-500' };
        case 'rest': return { text: 'REST', color: 'text-green-500' };
        case 'set_rest': return { text: 'SET REST', color: 'text-blue-500' };
        case 'finished': return { text: 'FINISHED!', color: 'text-brand-cyan-500' };
        default: return { text: '', color: 'text-slate-100' };
    }
  }, [phase]);

  

  const [volume, setVolume] = useState<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const previousPhaseRef = useRef<string>('');

  // Handle side-effects of phase transitions (notifications, noise, beeps)
  React.useEffect(() => {
    if (!isSonicModeActive) return;

    switch (sonicPhase) {
      case 'listen':
        if (sonicTimeLeft === 60 * 60) { // Only announce at the start of the phase
          if (settings.soundOn) {
            // Two short beeps to signal start
            requestPhaseSound('sonic', () => playBeep(880, 0.15));
            setTimeout(() => requestPhaseSound('sonic', () => playBeep(880, 0.15)), 250);
          }
          if (settings.notificationsOn) {
            showNotification('SONIC MODE');
          }
        }
        break;
      case 'earRest':
        if (sonicTimeLeft === 10 * 60) { // Only announce at the start of the break
          if (settings.soundOn) {
            // Lower chime to signal rest
            requestPhaseSound('sonic', () => playBeep(440, 0.3));
          }
          if (settings.notificationsOn) {
            showNotification('EAR REST');
          }
        }
        break;
    }
  }, [sonicPhase, isSonicModeActive, showNotification, sonicCycleCount, sonicTimeLeft, playBeep, settings.soundOn]);

  // Initialize audio context and analyser for volume monitoring
  React.useEffect(() => {
    if (isSonicModeActive && sonicPhase === 'listen') {
      let running = true;
      const initAudio = async () => {
        try {
          const context = new (window.AudioContext || (window as any).webkitAudioContext)();
          const analyserNode = context.createAnalyser();
          analyserNode.fftSize = 2048;

          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          const source = context.createMediaStreamSource(stream);
          source.connect(analyserNode);

          audioContextRef.current = context;
          micStreamRef.current = stream;

          // Start volume monitoring
          const dataArray = new Uint8Array(analyserNode.frequencyBinCount);

          const checkVolume = () => {
            if (!running) return;
            analyserNode.getByteFrequencyData(dataArray);

            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }

            const average = sum / dataArray.length;
            const volumePercent = Math.min(100, Math.max(0, (average / 255) * 100));
            setVolume(volumePercent);

            rafIdRef.current = requestAnimationFrame(checkVolume);
          };

          rafIdRef.current = requestAnimationFrame(checkVolume);
        } catch (err) {
          console.error('Error initializing audio:', err);
        }
      };

      initAudio();

      // Clean up when leaving listen phase or deactivating Sonic Mode
      return () => {
        running = false;
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
        if (micStreamRef.current) {
          micStreamRef.current.getTracks().forEach((track) => track.stop());
          micStreamRef.current = null;
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
      };
    }

    // If not in listen phase, ensure any previous resources are cleaned
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
        micStreamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [isSonicModeActive, sonicPhase]);

  // Render
  if (!workout) {
    return null;
  }

  const sonicPhaseBase = sonicPhase === 'listen' ? 60 * 60 : 10 * 60;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-6 gap-4 sm:gap-6 overflow-x-hidden">
      {/* Sonic Mode status bar */}
      {isSonicModeActive && (
        <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg bg-slate-100 dark:bg-slate-800 rounded-xl p-3 sm:p-4 shadow-lg mx-auto">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm sm:text-base font-medium text-slate-700 dark:text-slate-300 truncate">
              Sonic Mode: {sonicPhase === 'listen' ? 'Active' : 'Ear Rest'}
            </span>
            <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-mono">
              {Math.floor(sonicTimeLeft / 60)}:{String(sonicTimeLeft % 60).padStart(2, '0')}
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 sm:h-2.5">
            <div
              className={`h-2 sm:h-2.5 rounded-full transition-all duration-1000 ${sonicPhase === 'listen' ? 'bg-blue-500' : 'bg-green-500'}`}
              style={{ width: `${(sonicTimeLeft / sonicPhaseBase) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Main timer display */}
      <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg mx-auto">
        {/* Status info */}
        <div className="text-center mb-4 sm:mb-6">
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 px-2 leading-tight">
            Set {currentSet}/{workout.sets} · Exercise {phase === 'set_rest' ? workout.rounds.length : (currentRoundIndex + 1)}/{workout.rounds.length}
          </p>
        </div>

        {/* Circular timer */}
        <div className="relative">
          <CircularProgress progress={progress} colorClass={phaseInfo.color}>
            <div className={`text-sm sm:text-base font-bold uppercase tracking-widest mb-1 sm:mb-2 ${phaseInfo.color}`}>
              {phaseInfo.text}
            </div>
            <div className="font-mono font-bold text-[clamp(1.5rem,8vw,3rem)] sm:text-[clamp(2rem,6vw,3.5rem)] my-2 sm:my-3">
              {String(Math.floor(timeLeftInPhase / 60)).padStart(2, '0')}:{String(timeLeftInPhase % 60).padStart(2, '0')}
            </div>
            <div className="text-base sm:text-lg lg:text-xl font-semibold px-3 sm:px-4 max-w-[90%] text-center">
              {phase === 'work' && currentRound?.exerciseName && (
                <div className="truncate">
                  {currentRound.exerciseName}
                </div>
              )}
            </div>
          </CircularProgress>
        </div>

        {/* Next exercise info */}
        <div className="mt-4 sm:mt-6 h-6 sm:h-8 text-center">
          {phase !== 'set_rest' && phase !== 'finished' && phase !== 'prepare' && currentRound && (
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 px-4">
              <span className="text-slate-400 dark:text-slate-500">Next:</span>{' '}
              <span className="font-medium">
                {phase === 'work' ? 'Rest' : (currentRoundIndex < workout.rounds.length - 1 ? workout.rounds[currentRoundIndex + 1]?.exerciseName : 'Set Rest')}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Control buttons */}
      <div className="flex justify-center gap-4 sm:gap-6 mt-4 sm:mt-6">
        <button
          onClick={handleStop}
          className="p-3 sm:p-4 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 transition-all hover:scale-110 shadow-lg"
          aria-label="Stop timer"
        >
          <StopIcon className="w-6 h-6 sm:w-7 sm:h-7" />
        </button>
        <button
          onClick={() => setPaused(!isPaused)}
          className="p-4 sm:p-5 rounded-full bg-brand-cyan-600 hover:bg-brand-cyan-700 text-white shadow-lg hover:shadow-xl transition-all hover:scale-110"
          aria-label={isPaused ? 'Resume' : 'Pause'}
        >
          {isPaused ? <PlayIcon className="w-7 h-7 sm:w-8 sm:h-8" /> : <PauseIcon className="w-7 h-7 sm:w-8 sm:h-8" />}
        </button>
      </div>

      {/* Volume indicator and warnings (Sonic Mode) */}
      {isSonicModeActive && (
        <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg mx-auto space-y-3 sm:space-y-4">
          {/* Volume meter */}
          <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-3 sm:p-4 shadow-lg">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-500 dark:text-slate-400">Audio Level</span>
              <span className="text-slate-500 dark:text-slate-400 font-mono">{Math.round(volume)}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 sm:h-2.5">
              <div
                className={`h-2 sm:h-2.5 rounded-full transition-all duration-300 ${volume > 60 ? 'bg-red-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(100, volume)}%` }}
              />
            </div>
            <p className="text-xs sm:text-sm mt-2 text-center">
              {volume > 60 ? (
                <span className="text-red-500 dark:text-red-400">⚠️ Volume too high! Lower to protect hearing</span>
              ) : (
                <span className="text-green-600 dark:text-green-400">✓ Safe listening level</span>
              )}
            </p>
          </div>
          
          {/* Safety info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 sm:p-4 text-center">
            {sonicPhase === 'listen' ? (
              <p className="text-sm sm:text-base text-blue-700 dark:text-blue-300">
                🎧 Keep volume under 60% for safe listening<br />
                <span className="text-xs sm:text-sm opacity-75">(WHO 60/60 rule)</span>
              </p>
            ) : (
              <p className="text-sm sm:text-base text-orange-700 dark:text-orange-300">
                🛑 Remove earbuds and rest in quiet environment<br />
                <span className="text-xs sm:text-sm opacity-75">(&lt;55 dBA recommended)</span>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TimerDisplay;