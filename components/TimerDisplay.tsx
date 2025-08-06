import React, { useEffect, useMemo, useState, useReducer } from 'react';
import type { Workout, AppSettings } from '../types';
import { useTimer, useAudio, useNotifications, useSpeech } from '../hooks';
import { sonicModeReducer, initialSonicModeState } from '../reducers';
import { PlayIcon, PauseIcon, StopIcon } from './icons';

const CircularProgress: React.FC<{ progress: number; children: React.ReactNode; colorClass: string }> = ({ progress, children, colorClass }) => {
  const strokeWidth = 8;
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - progress * circumference;

  return (
    <div className="relative w-64 h-64 md:w-80 md:h-80">
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
  onBack: () => void;
  settings: AppSettings;
  isPaused: boolean;
  setPaused: React.Dispatch<React.SetStateAction<boolean>>;
  onStop: () => void;
  isSonicMode: boolean;
}

const TimerDisplay: React.FC<TimerDisplayProps> = ({ workout, onBack, settings, isPaused, setPaused, onStop, isSonicMode }) => {
  const { status, resetTimer } = useTimer(workout, isPaused);
  const { speak } = useSpeech(settings.voiceURI || null);
  const { playBeep } = useAudio();
  const { showNotification } = useNotifications();

  const [sonicModeState, dispatchSonicModeAction] = useReducer(sonicModeReducer, initialSonicModeState);
  const { phase: sonicPhase, timeLeft: sonicTimeLeft, cycleCount: sonicCycleCount, isActive: sonicModeActive } = sonicModeState;

  const { phase, currentSet, currentRoundIndex, timeLeftInPhase, totalPhaseTime, workoutCompleted } = status;

  const currentRound = workout && workout.rounds[currentRoundIndex];

  useEffect(() => {
    if (workoutCompleted) {
        const message = "Workout completed. Well done!";
        if(settings.voiceOn) {
          speak(message);
        }
        if(settings.soundOn) playBeep(880, 0.5);
        if(settings.notificationsOn) showNotification("Workout Finished!", { body: "Great job completing your workout." });
        setTimeout(onStop, 3000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workoutCompleted, settings.voiceOn, settings.soundOn, settings.notificationsOn, onStop, playBeep, showNotification]);

  useEffect(() => {
    // Announce phase changes
    if (isPaused || !currentRound) return;

    let announcement = '';
    let notificationBody = '';

    if (timeLeftInPhase === totalPhaseTime) {
      switch (phase) {
        case 'prepare':
            announcement = 'Get ready';
            notificationBody = `The ${workout.name} workout is about to start.`;
            break;
        case 'work':
            announcement = currentRound.exerciseName;
            const nextIsLastRound = currentRoundIndex === workout.rounds.length - 1;
            notificationBody = `Next: ${nextIsLastRound ? 'Set Rest' : 'Rest'}`;
            break;
        case 'rest':
            announcement = 'Rest';
            const nextRound = workout.rounds[currentRoundIndex + 1];
            notificationBody = `Next: ${nextRound ? nextRound.exerciseName : 'Work'}`;
            break;
        case 'set_rest':
            announcement = 'Rest between sets';
            notificationBody = `Next: ${workout.rounds[0].exerciseName}`;
            break;
      }
    }
    
    if (announcement) {
        if (settings.voiceOn) {
          speak(announcement);
        }
        if (settings.notificationsOn) showNotification(announcement, { body: notificationBody });
    }
    
    if (settings.soundOn && timeLeftInPhase === totalPhaseTime && phase !== 'prepare') {
        playBeep(659, 0.2); // E5
    }

    if (settings.soundOn && timeLeftInPhase <= 3 && timeLeftInPhase > 0) {
        playBeep(523, 0.1); // C5
    }
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, totalPhaseTime, timeLeftInPhase, settings, workout, currentRound, isPaused, playBeep, showNotification]);
  
  const handleStop = () => {
    resetTimer();
    onStop();
  };
  
  const progress = totalPhaseTime > 0 ? (totalPhaseTime - timeLeftInPhase) / totalPhaseTime : 0;
  
  const phaseInfo = useMemo(() => {
    switch(phase) {
        case 'prepare': return { text: 'PREPARE', color: 'text-yellow-500' };
        case 'work': return { text: 'WORK', color: 'text-brand-orange-500' };
        case 'rest': return { text: 'REST', color: 'text-green-500' };
        case 'set_rest': return { text: 'SET REST', color: 'text-blue-500' };
        case 'finished': return { text: 'FINISHED!', color: 'text-brand-cyan-500' };
        default: return { text: '', color: 'text-slate-100' };
    }
  }, [phase]);

  const startTimer = () => {
    if (settings.sonicModeOn) {
      dispatchSonicModeAction({ type: 'START', settings });
    } else {
      setPaused(false);
    }
  };

  const stopTimer = () => {
    setPaused(true);
  };

  const [volume, setVolume] = useState<number>(0);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [micSource, setMicSource] = useState<MediaStreamAudioSourceNode | null>(null);

  // Handle Sonic Mode timer ticks
  useEffect(() => {
    if (!sonicModeActive) return;

    const timer = setInterval(() => {
      dispatchSonicModeAction({ type: 'TICK' });
    }, 1000);

    return () => clearInterval(timer);
  }, [sonicModeActive]);

  // Handle Sonic Mode phase transitions
  useEffect(() => {
    if (sonicModeActive && sonicTimeLeft === 0) {
      dispatchSonicModeAction({ type: 'TRANSITION', settings });
    }
  }, [sonicModeActive, sonicTimeLeft, settings]);

  // Handle side-effects of phase transitions (notifications, speech)
  useEffect(() => {
    if (!sonicModeActive) return;

    switch (sonicPhase) {
      case 'listen':
        if (sonicTimeLeft === 60 * 60) { // Only announce at the start of the phase
          const message = `Sonic Mode listening phase ${sonicCycleCount} of ${settings.sonicModeCycles}. Keep volume under 60 percent for hearing safety.`;
          speak(message);
          showNotification(`🎧 Sonic Mode: Listening Phase ${sonicCycleCount}/${settings.sonicModeCycles}`, { body: 'Keep volume under 60% (≈80 dBA)' });
        }
        break;
      case 'earRest':
        speak('Ear break. Remove earbuds and let your ears rest.');
        showNotification('🛑 Ear Break', { body: 'Remove earbuds and rest your ears' });
        break;
      case 'extendedBreak':
        speak('Great job! Take a longer break now to protect your hearing health.');
        showNotification('✅ Great job!', { body: 'Take a longer break now to protect your hearing health.' });
        break;
    }
  }, [sonicPhase, sonicModeActive, speak, showNotification, settings.sonicModeCycles, sonicCycleCount, sonicTimeLeft]);

  useEffect(() => {
    // Initialize audio context and analyser for volume monitoring
    if (sonicModeActive && sonicPhase === 'listen') {
      const initAudio = async () => {
        try {
          const context = new (window.AudioContext || (window as any).webkitAudioContext)();
          const analyserNode = context.createAnalyser();
          analyserNode.fftSize = 2048;
          
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          const source = context.createMediaStreamSource(stream);
          source.connect(analyserNode);
          
          setAudioContext(context);
          setMicStream(stream);
          setMicSource(source);
          
          // Start volume monitoring
          const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
          
          const checkVolume = () => {
            analyserNode.getByteFrequencyData(dataArray);
            
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            
            const average = sum / dataArray.length;
            const volumePercent = Math.min(100, Math.max(0, average / 255 * 100));
            
            setVolume(volumePercent);
            
            requestAnimationFrame(checkVolume);
          };
          
          checkVolume();
        } catch (err) {
          console.error('Error initializing audio:', err);
        }
      };
      
      initAudio();
    }
    
    return () => {
      if (micSource) {
        micSource.disconnect();
      }
      if (micStream) {
        micStream.getTracks().forEach(track => track.stop());
      }
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [sonicModeActive, sonicPhase]);

  // If in dedicated Sonic Mode, we don't show the workout controls
  if (isSonicMode && !workout) {
    return (
      <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800 rounded-3xl shadow-xl overflow-hidden">
        <div className="p-8">
          <h2 className="text-3xl font-bold text-center text-brand-cyan-700 dark:text-brand-cyan-400 mb-6">Sonic Mode</h2>
          <div className="text-center">
            <p className="text-lg text-slate-700 dark:text-slate-300 mb-4">Protecting your hearing during long listening sessions</p>
            <div className="flex justify-center space-x-4 mb-6">
              <button 
                onClick={() => dispatchSonicModeAction({ type: 'START', settings })}
                className="px-6 py-3 bg-brand-cyan-600 hover:bg-brand-cyan-700 text-white font-semibold rounded-full transition duration-300"
              >
                Start Sonic Mode
              </button>
              <button 
                onClick={onBack}
                className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-full transition duration-300"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If there's no workout, we cannot show the main timer
  if (!workout) {
    return null;
  }

  return (
    <div className="h-full flex flex-col items-center text-slate-800 dark:text-slate-100 p-4 md:p-6">
      <div className="flex-1 flex flex-col items-center justify-center w-full overflow-hidden">
        <div className="text-center mb-4 md:mb-8">
            <p className="text-lg text-slate-500 dark:text-slate-400">Set {currentSet} / {workout.sets}</p>
            <p className="text-lg text-slate-500 dark:text-slate-400">Round {phase === 'set_rest' ? workout.rounds.length : (currentRoundIndex ?? 0) + 1} / {workout.rounds.length}</p>
        </div>

        <CircularProgress progress={progress} colorClass={phaseInfo.color}>
            <div className={`text-xl font-bold uppercase tracking-widest ${phaseInfo.color}`}>
                {phaseInfo.text}
            </div>
            <div className="text-6xl md:text-7xl font-mono font-bold my-2">
                {String(Math.floor(timeLeftInPhase / 60)).padStart(2, '0')}:{String(timeLeftInPhase % 60).padStart(2, '0')}
            </div>
            <div className="text-lg md:text-xl font-semibold h-14 truncate px-2">
                {phase === 'work' && currentRound?.exerciseName}
            </div>
        </CircularProgress>

        <div className="mt-4 md:mt-8 h-8 text-center">
            {phase !== 'set_rest' && phase !== 'finished' && phase !== 'prepare' && currentRound && (
                <p className="text-base text-slate-500 dark:text-slate-400">
                    Next: {phase === 'work' ? 'Rest' : (currentRoundIndex < workout.rounds.length - 1 ? workout.rounds[currentRoundIndex + 1]?.exerciseName : 'Set Rest')}
                </p>
            )}
        </div>
      </div>

      <div className="w-full flex items-center justify-center space-x-8 pt-4">
        <button onClick={handleStop} className="p-4 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 transition">
          <StopIcon className="w-8 h-8"/>
        </button>
        <button onClick={isPaused ? startTimer : stopTimer} className="p-6 rounded-full bg-brand-cyan-600 hover:bg-brand-cyan-700 text-white shadow-lg transform hover:scale-105 transition">
          {isPaused ? <PlayIcon className="w-10 h-10" /> : <PauseIcon className="w-10 h-10" />}
        </button>
      </div>

      {settings.sonicModeOn && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Sonic Mode 🎶🛡️</h3>
            <button 
              onClick={() => sonicModeActive ? dispatchSonicModeAction({ type: 'STOP' }) : dispatchSonicModeAction({ type: 'START', settings })}
              className={`px-4 py-2 rounded ${sonicModeActive ? 'bg-red-500 text-white' : 'bg-brand-cyan-600 text-white'}`}
            >
              {sonicModeActive ? 'Stop' : 'Start'}
            </button>
          </div>
          
          {sonicModeActive && (
            <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
              <div className="mb-2">
                <div className="flex justify-between text-sm">
                  <span>Phase: {sonicPhase === 'listen' ? 'Listening' : sonicPhase === 'earRest' ? 'Ear Rest' : 'Extended Break'}</span>
                  <span>Cycle: {sonicCycleCount}/{settings.sonicModeCycles}</span>
                </div>
                <div className="text-lg font-bold">
                  {Math.floor(sonicTimeLeft / 60)}:{String(sonicTimeLeft % 60).padStart(2, '0')}
                </div>
              </div>
              
              {sonicPhase === 'listen' && (
                <div className="text-sm text-blue-600 dark:text-blue-400">
                  🎧 Keep volume under 60% (≈80 dBA) for hearing safety
                </div>
              )}
              
              {sonicPhase === 'earRest' && (
                <div className="text-sm text-yellow-600 dark:text-yellow-400">
                  🛑 Remove earbuds and let your ears rest
                </div>
              )}
              
              {sonicPhase === 'extendedBreak' && (
                <div className="text-sm text-green-600 dark:text-green-400">
                  ✅ Great job! Take a longer break to protect your hearing
                </div>
              )}
              
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                ⚠️ Limit listening above 85 dBA to under 2 hours/day. For ≤80 dBA, stay under 8 hours.
              </div>
            </div>
          )}
        </div>
      )}
      
      {sonicModeActive && sonicPhase === 'listen' && (
        <div className="mt-4">
          <div className="text-sm mb-2">Current Volume: {volume.toFixed(0)}%</div>
          <div className="w-full bg-gray-200 rounded-full h-4 dark:bg-gray-700">
            <div 
              className="bg-brand-cyan-600 h-4 rounded-full transition-all duration-200" 
              style={{ width: `${volume}%` }}
            ></div>
          </div>
          <div className="text-xs mt-2 text-slate-500 dark:text-slate-400">
            Keep below 60% for safe listening
          </div>
        </div>
      )}
    </div>
  );
};

export default TimerDisplay;