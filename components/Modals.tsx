import React from 'react';
import type { AppSettings, Workout, ToastMessage } from '../types';
import { CloseIcon, FolderOpenIcon, TrashIcon } from './icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-center p-3 sm:p-4" onClick={onClose}>
      <div
        className="bg-gradient-to-br from-orange-200 via-pink-200 to-cyan-200 dark:from-red-900 dark:via-purple-900 dark:to-teal-700 rounded-lg shadow-2xl w-full max-w-sm sm:max-w-md max-h-[90vh] m-0 sm:m-2 p-4 overflow-hidden grid grid-rows-[auto,1fr]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">{title}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="overflow-y-auto pr-1">
          {children}
        </div>
      </div>
    </div>
  );
};

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSettingsChange: React.Dispatch<React.SetStateAction<AppSettings>>;
  addToast: (message: string, type: ToastMessage['type']) => void;
  onSonicMode: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSettingsChange, addToast, onSonicMode }) => {
  const Toggle = ({ id, label, checked, onChange, disabled }: { id?: string; label: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) => (
    <label className={`flex items-center justify-between py-2 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
      <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
      <div className="relative">
        <input
          id={id}
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
        <div className={`block w-12 h-7 rounded-full transition ${checked ? 'bg-brand-cyan-600' : 'bg-slate-300 dark:bg-slate-600'} ${disabled ? 'opacity-50' : ''}`}></div>
        <div className={`dot absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform ${checked ? 'transform translate-x-5' : ''} ${disabled ? 'opacity-50' : ''}`}></div>
      </div>
    </label>
  );

  // No voice features

  const handleNotificationToggle = async (checked: boolean) => {
    if (!checked) {
        onSettingsChange(s => ({...s, notificationsOn: false}));
        return;
    }

    if (!('Notification' in window)) {
        addToast('This browser does not support notifications.', 'error');
        onSettingsChange(s => ({...s, notificationsOn: false}));
        return;
    }
    
    if (Notification.permission === 'granted') {
        onSettingsChange(s => ({...s, notificationsOn: true}));
        return;
    }

    if (Notification.permission === 'denied') {
        addToast('Please enable notifications in your browser settings to use this feature.', 'warning');
        onSettingsChange(s => ({...s, notificationsOn: false}));
        return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
        onSettingsChange(s => ({...s, notificationsOn: true}));
    } else {
        onSettingsChange(s => ({...s, notificationsOn: false}));
    }
  };

  // Noise previews disabled by design

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings">
      <div className="space-y-2">
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-800 dark:text-white">Sound Effects</h3>
            <Toggle 
              id="soundEffects"
              label=""
              checked={settings.soundOn} 
              onChange={(val) => onSettingsChange(s => ({...s, soundOn: val}))} 
            />
          </div>
          <p className="text-xs text-gray-500 mt-1 hidden sm:block">Play sound effects during workout</p>
        </div>

        {/* Voice settings removed */}


        <div className="mb-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-800 dark:text-white">Visual Notifications</h3>
            <Toggle 
              id="visualNotifications"
              label=""
              checked={settings.notificationsOn} 
              onChange={handleNotificationToggle} 
            />
          </div>
          <p className="text-xs text-gray-500 mt-1 hidden sm:block">Show visual notifications during workout</p>
          {settings.notificationsOn && (
            <button
              onClick={() => {
                console.log('Test notification button clicked');
                if ('Notification' in window && Notification.permission === 'granted') {
                  try {
                    new Notification('TEST NOTIFICATION', {
                      icon: '/logo.png',
                      badge: '/logo.png',
                      tag: 'tabata-timer-test',
                      requireInteraction: false,
                      silent: true,
                      body: '·',
                      data: null
                    });
                  } catch (error) {
                    console.error('Test notification error:', error);
                  }
                }
              }}
              className="mt-2 px-3 py-1.5 text-sm bg-brand-cyan-600 hover:bg-brand-cyan-700 text-white rounded-lg transition"
            >
              Test Notification
            </button>
          )}
        </div>

        <div className="mb-3">
          <Toggle 
            id="sonicMode"
            label="Enable Sonic Mode (hearing protection)"
            checked={settings.sonicModeOn}
            onChange={(checked) => {
              onSettingsChange({ ...settings, sonicModeOn: checked });
              if (checked) {
                onSonicMode();
              }
            }}
          />
          {settings.sonicModeOn && (
            <div className="mt-2">
              <label htmlFor="sonicModeCycles" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Cycles before extended break
              </label>
              <input
                id="sonicModeCycles"
                type="number"
                min="1" max="10"
                value={settings.sonicModeCycles}
                onChange={(e) => onSettingsChange({ ...settings, sonicModeCycles: parseInt(e.target.value) || 3 })}
                className="w-28 p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
              />
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1 hidden sm:block">Long-duration audio sessions with ear protection reminders</p>
        </div>

        <div className="mb-2">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-800 dark:text-white">Dark Mode</h3>
            <Toggle 
              id="darkMode"
              label=""
              checked={settings.darkMode} 
              onChange={(val) => onSettingsChange(s => ({...s, darkMode: val}))}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1 hidden sm:block">Use dark mode for the application</p>
        </div>
      </div>
    </Modal>
  );
};

interface SavedWorkoutsModalProps {
    isOpen: boolean;
    onClose: () => void;
    savedWorkouts: Workout[];
    onLoad: (workout: Workout) => void;
    onDelete: (workoutId: string) => void;
}

export const SavedWorkoutsModal: React.FC<SavedWorkoutsModalProps> = ({isOpen, onClose, savedWorkouts, onLoad, onDelete}) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Load Workout">
            <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
                {savedWorkouts.length === 0 ? (
                    <p className="text-slate-500 dark:text-slate-400 text-center py-4">No saved workouts.</p>
                ) : (
                    savedWorkouts.map(workout => (
                        <div key={workout.id} className="bg-slate-100 dark:bg-slate-700 p-3 rounded-lg flex items-center justify-between">
                            <div className="flex-grow">
                                <p className="font-semibold text-slate-800 dark:text-slate-100">{workout.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{workout.sets} Sets, {workout.rounds.length} Rounds</p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button onClick={() => onLoad(workout)} className="p-2 text-green-600 hover:text-green-500 dark:text-green-500 dark:hover:text-green-400 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600">
                                    <FolderOpenIcon className="w-5 h-5" />
                                </button>
                                <button onClick={() => onDelete(workout.id)} className="p-2 text-red-600 hover:text-red-500 dark:text-red-500 dark:hover:text-red-400 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600">
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </Modal>
    );
};