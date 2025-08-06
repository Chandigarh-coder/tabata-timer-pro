import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
  const [view, setView] = useState<'setup' | 'timer' | 'sonic'>('setup');
  const [isPaused, setPaused] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const [isDarkMode, setDarkMode] = useDarkMode();
  const [settings, setSettings] = useLocalStorage<AppSettings>('appSettings', {
      soundOn: true,
      voiceOn: true,
      darkMode: isDarkMode,
      notificationsOn: false,
      voiceURI: undefined,
      sonicModeOn: false,
      sonicModeCycles: 3,
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

  const handleStartWorkout = useCallback(() => {
    setView('timer');
    setPaused(false);
  }, []);

  const handleStopWorkout = useCallback(() => {
    setView('setup');
    setPaused(true);
  }, []);

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
      <div className="min-h-screen bg-gradient-to-br from-orange-200 via-pink-200 to-cyan-200 dark:from-red-900 dark:via-purple-900 dark:to-teal-700">
        <button
          onClick={() => setSettingsModalOpen(true)}
          className="fixed top-4 right-4 z-20 p-3 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-full text-slate-600 dark:text-slate-300 shadow-md hover:shadow-lg transition"
          aria-label="Open Settings"
        >
          <SettingsIcon />
        </button>
        <main className="container mx-auto px-4 py-8">
          {view === 'setup' ? memoizedWorkoutSetup :
           view === 'timer' ? (
            <TimerDisplay
              workout={currentWorkout}
              onBack={() => setView('setup')}
              settings={settings}
              isPaused={isPaused}
              setPaused={setPaused}
              onStop={() => setView('setup')}
              isSonicMode={false}
            />
          ) : (
            <TimerDisplay
              workout={null}
              onBack={() => setView('setup')}
              settings={settings}
              isPaused={false}
              setPaused={() => {}}
              onStop={() => {}}
              isSonicMode={true}
            />
          )}
        </main>
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
        <SettingsModal 
          isOpen={isSettingsModalOpen}
          onClose={() => setSettingsModalOpen(false)}
          settings={settings}
          onSettingsChange={setSettings}
          addToast={addToast}
          onSonicMode={() => setView('sonic')}
        />
      </div>
    </ErrorBoundary>
  );
};

export default App;