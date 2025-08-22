export interface Round {
  id: string;
  exerciseName: string;
  workTime: number;
  restTime: number;
}

export interface Workout {
  id:string;
  name: string;
  sets: number;
  setRestTime: number;
  rounds: Round[];
}

export type TimerPhase = 'prepare' | 'work' | 'rest' | 'set_rest' | 'finished';

export interface TimerStatus {
  phase: TimerPhase;
  currentSet: number;
  currentRoundIndex: number;
  timeLeftInPhase: number;
  totalPhaseTime: number;
  workoutCompleted: boolean;
}

export interface AppSettings {
  soundOn: boolean;
  notificationsOn: boolean;
  darkMode: boolean;
  sonicModeOn: boolean;
  sonicModeCycles: number; // Number of cycles before extended break
}

export type NoiseType = 'white' | 'pink' | 'brown' | 'beep' | 'chime' | 'click' | 'none';

export interface NoisePattern {
  type: NoiseType;
  duration: number; // in milliseconds
  volume: number; // 0-1
  frequency?: number; // For beep/chime sounds
}

export type ToastType = 'success' | 'info' | 'error' | 'warning';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}
