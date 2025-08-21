import React, { useState, useCallback, useEffect, useMemo, SetStateAction } from 'react';
import type { Workout, AppSettings, ToastMessage } from './types';
import { useLocalStorage, useDarkMode } from './hooks';
import WorkoutSetup from './components/WorkoutSetup';
import TimerDisplay from './components/TimerDisplay';
import { SettingsModal, SavedWorkoutsModal } from './components/Modals';
import { SettingsIcon } from './components/icons';
import { ToastContainer } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';

const DEFAULT_WORKOUT: Workout = {
  id: crypto.randomUUID(),
  name: 'My First Tabata',
  sets: 8,
  setRestTime: 60,
  rounds: [
    { id: crypto.randomUUID(), exerciseName: 'Push Ups', workTime: 20, restTime: 10 },
    { id: crypto.randomUUID(), exerciseName: 'Squats', workTime: 20, restTime: 10 },
    { id: crypto.randomUUID(), exerciseName: 'Burpees', workTime: 20, restTime: 10 },
    { id: crypto.randomUUID(), exerciseName: 'Jumping Jacks', workTime: 20, restTime: 10 },
  ],
};

const App: React.FC = () => {
  const [currentWorkout, setCurrentWorkout] = useState<Workout>(DEFAULT_WORKOUT);
  const [savedWorkouts, setSavedWorkouts] = useLocalStorage<Workout[]>('savedWorkouts', []);
  const [view, setView] = useState<'setup' | 'timer'>('setup');
  const [isPaused, setPaused] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  // State for managing Sonic Mode
  const [isSonicModeActive, setSonicModeActive] = useState(false);

  const [isDarkMode, setDarkMode] = useDarkMode();
  const [settings, setSettings] = useLocalStorage<AppSettings>('appSettings', {
      soundOn: true,
      darkMode: isDarkMode,
      notificationsOn: false,
      sonicModeOn: false,
      sonicModeCycles: 3,
      noiseSystemOn: true,
      tabataNoiseType: 'beep',
      sonicNoiseType: 'click',
      noiseVolume: 0.5,
  });
  
  
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
  const [isLoadModalOpen, setLoadModalOpen] = useState(false);

  // Sync dark mode between setting and system hook
  useEffect(() => {
    setDarkMode(settings.darkMode);
  }, [settings.darkMode, setDarkMode]);

  // Register Service Worker for reliable notifications
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => {
          console.error('Service worker registration failed: ', err);
        });
      });
    }
  }, []);

  // One-time migration: force fixed noise types
  useEffect(() => {
    setSettings((s) => {
      const next = { ...s };
      let changed = false;
      if (s.tabataNoiseType !== 'beep') { next.tabataNoiseType = 'beep'; changed = true; }
      if (s.sonicNoiseType !== 'click') { next.sonicNoiseType = 'click'; changed = true; }
      return changed ? next : s;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartWorkout = useCallback(() => {
    setView('timer');
    setPaused(false);
    
    // Start Sonic Mode if enabled in settings
    if (settings.sonicModeOn) {
      setSonicModeActive(true);
    }
  }, [settings]);

  const handleStopWorkout = useCallback(() => {
    setView('setup');
    setPaused(true);
    setSonicModeActive(false);
  }, []);

  const handleSonicMode = useCallback(() => {
    setView('timer');
    setSonicModeActive(true);
  }, []);
  
  // Handle settings changes and update Sonic Mode state accordingly
  const handleSettingsChange = useCallback((value: SetStateAction<AppSettings>) => {
    setSettings(prevSettings => {
      const newSettings = typeof value === 'function' ? value(prevSettings) : value;
      
      // Update Sonic Mode state based on settings
      if (newSettings.sonicModeOn && view === 'timer') {
        setSonicModeActive(true);
      } else if (!newSettings.sonicModeOn) {
        setSonicModeActive(false);
      }
      
      return newSettings;
    });
  }, [setSettings, view]);

  const addToast = useCallback((message: string, type: ToastMessage['type'] = 'success') => {
    const id = crypto.randomUUID();
    setToasts((prevToasts) => [...prevToasts, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);
  
  const handleSaveWorkout = useCallback(() => {
    const isExisting = savedWorkouts.some(w => w.id === currentWorkout.id);
    if (isExisting) {
        setSavedWorkouts(savedWorkouts.map(w => w.id === currentWorkout.id ? currentWorkout : w));
    } else {
        setSavedWorkouts([...savedWorkouts, { ...currentWorkout, id: crypto.randomUUID() }]);
    }
    addToast(`Workout "${currentWorkout.name}" saved!`, 'success');
  }, [currentWorkout, savedWorkouts, setSavedWorkouts, addToast]);

  const handleLoadWorkout = useCallback((workoutToLoad: Workout) => {
    setCurrentWorkout(workoutToLoad);
    setLoadModalOpen(false);
  }, []);
  
  const handleDeleteWorkout = useCallback((workoutId: string) => {
    if (window.confirm("Are you sure you want to delete this workout?")) {
        setSavedWorkouts(savedWorkouts.filter(w => w.id !== workoutId));
    }
  }, [savedWorkouts, setSavedWorkouts]);

  const memoizedWorkoutSetup = useMemo(() => (
    <WorkoutSetup 
        workout={currentWorkout} 
        setWorkout={setCurrentWorkout} 
        onStart={handleStartWorkout}
        onSave={handleSaveWorkout}
        onLoad={() => setLoadModalOpen(true)}
    />
  ), [currentWorkout, handleStartWorkout, handleSaveWorkout]);
  

  return (
    <ErrorBoundary>
      <div className="min-h-[100svh] overflow-hidden bg-gradient-to-br from-orange-200 via-pink-200 to-cyan-200 dark:from-red-900 dark:via-purple-900 dark:to-teal-700">
        <button
          onClick={() => setSettingsModalOpen(true)}
          className="fixed top-4 right-4 z-20 p-3 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-full text-slate-600 dark:text-slate-300 shadow-md hover:shadow-lg transition"
          aria-label="Open Settings"
        >
          <SettingsIcon />
        </button>
        <main className="container min-h-[100svh] mx-auto px-3 sm:px-4 py-0 sm:py-0 flex items-center justify-center">
          {view === 'setup' ? memoizedWorkoutSetup : (
            <TimerDisplay
              workout={currentWorkout}
              settings={settings}
              isPaused={isPaused}
              setPaused={setPaused}
              onStop={handleStopWorkout}
              isSonicModeActive={isSonicModeActive}
            />
          )}
        </main>
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
        <SettingsModal 
          isOpen={isSettingsModalOpen}
          onClose={() => setSettingsModalOpen(false)}
          settings={settings}
          onSettingsChange={handleSettingsChange}
          addToast={addToast}
          onSonicMode={handleSonicMode}
        />
        <SavedWorkoutsModal
          isOpen={isLoadModalOpen}
          onClose={() => setLoadModalOpen(false)}
          savedWorkouts={savedWorkouts}
          onLoad={handleLoadWorkout}
          onDelete={handleDeleteWorkout}
        />
      </div>
    </ErrorBoundary>
  );
};

export default App;