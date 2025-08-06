import React from 'react';
import type { AppSettings, Workout, ToastMessage } from '../types';
import { CloseIcon, FolderOpenIcon, TrashIcon } from './icons';
import { useVoices } from '../hooks';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-center" onClick={onClose}>
      <div
        className="bg-gradient-to-br from-orange-200 via-pink-200 to-cyan-200 dark:from-red-900 dark:via-purple-900 dark:to-teal-700 rounded-lg shadow-2xl p-6 w-11/12 max-w-md m-4 transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">{title}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
            <CloseIcon />
          </button>
        </div>
        <div>{children}</div>
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
  const Toggle = ({ id, label, checked, onChange }: { id?: string; label: string; checked: boolean; onChange: (checked: boolean) => void }) => (
    <label className="flex items-center justify-between cursor-pointer py-3 border-b border-slate-200 dark:border-slate-700">
      <span className="text-slate-700 dark:text-slate-300">{label}</span>
      <div className="relative">
        <input id={id} type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <div className={`block w-14 h-8 rounded-full transition ${checked ? 'bg-brand-cyan-600' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
        <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${checked ? 'transform translate-x-6' : ''}`}></div>
      </div>
    </label>
  );

  const voices = useVoices();
  const supportedVoices = voices.filter(voice => {
    const isEnglish = voice.lang.startsWith('en');
    const isSpanish = voice.lang.startsWith('es');
    const isFemale = /female|woman|femenina|mulher|latina/i.test(voice.name);
    const hasLatinaVibe = /latina|hispanic|mexican|spanish|español/i.test(voice.name);
    const isBritish = /en-GB|british|UK|England/i.test(voice.lang) || /british|UK|England/i.test(voice.name);
    
    return (isEnglish || isSpanish) && (isFemale || hasLatinaVibe) && !isBritish;
  });

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

  const previewVoice = (voice: SpeechSynthesisVoice | null) => {
    const synth = window.speechSynthesis;
    synth.cancel();
    
    const utterance = new SpeechSynthesisUtterance(
      "Hello, testing the voice. Three, two, one, let's go!"
    );
    
    // If a specific voice is provided, use it; otherwise, use the default voice
    if (voice) {
      utterance.voice = voice;
    }
    
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    synth.speak(utterance);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings">
      <div className="space-y-2">
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Sound Effects</h3>
            <Toggle 
              id="soundEffects"
              label=""
              checked={settings.soundOn} 
              onChange={(val) => onSettingsChange(s => ({...s, soundOn: val}))} 
            />
          </div>
          <p className="text-sm text-gray-500 mt-1">Play sound effects during workout</p>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Voice Assistant</h3>
            <Toggle 
              id="voiceAssistant"
              label=""
              checked={settings.voiceOn} 
              onChange={(val) => onSettingsChange(s => ({...s, voiceOn: val}))} 
            />
          </div>
          <p className="text-sm text-gray-500 mt-1">Use voice assistant during workout</p>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Voice (English/Spanish)</h3>
          </div>
          <select 
            value={settings.voiceURI || ''} 
            onChange={(e) => onSettingsChange(s => ({...s, voiceURI: e.target.value || ''}))}
            className="w-full p-2 border rounded"
          >
            <option value="">Default System Voice</option>
            {supportedVoices.map(voice => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>
          <button 
            onClick={() => {
              // If voiceURI is empty, it means "Default System Voice" is selected
              if (!settings.voiceURI) {
                previewVoice(null);
              } else {
                const selectedVoice = supportedVoices.find(v => v.voiceURI === settings.voiceURI);
                if (selectedVoice) previewVoice(selectedVoice);
              }
            }}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Preview Voice
          </button>
          <p className="text-sm text-gray-500 mt-1">Select a voice for announcements</p>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Visual Notifications</h3>
            <Toggle 
              id="visualNotifications"
              label=""
              checked={settings.notificationsOn} 
              onChange={handleNotificationToggle} 
            />
          </div>
          <p className="text-sm text-gray-500 mt-1">Show visual notifications during workout</p>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between">
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
          </div>
          {settings.sonicModeOn && (
            <div className="mt-2 ml-8">
              <label htmlFor="sonicModeCycles" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Cycles before extended break
              </label>
              <input
                id="sonicModeCycles"
                type="number"
                min="1" max="10"
                value={settings.sonicModeCycles}
                onChange={(e) => onSettingsChange({ ...settings, sonicModeCycles: parseInt(e.target.value) || 3 })}
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
              />
            </div>
          )}
          <p className="text-sm text-gray-500 mt-1">Long-duration audio sessions with ear protection reminders</p>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Dark Mode</h3>
            <Toggle 
              id="darkMode"
              label=""
              checked={settings.darkMode} 
              onChange={(val) => onSettingsChange(s => ({...s, darkMode: val}))}
            />
          </div>
          <p className="text-sm text-gray-500 mt-1">Use dark mode for the application</p>
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