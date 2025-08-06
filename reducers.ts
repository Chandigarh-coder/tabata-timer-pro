import type { AppSettings } from './types';

export type SonicModePhase = 'inactive' | 'listen' | 'earRest' | 'extendedBreak';

export interface SonicModeState {
  isActive: boolean;
  phase: SonicModePhase;
  timeLeft: number;
  cycleCount: number;
}

export type SonicModeAction =
  | { type: 'START'; settings: AppSettings }
  | { type: 'STOP' }
  | { type: 'TICK' }
  | { type: 'TRANSITION'; settings: AppSettings };

export const initialSonicModeState: SonicModeState = {
  isActive: false,
  phase: 'inactive',
  timeLeft: 0,
  cycleCount: 0,
};

const LISTEN_DURATION = 60 * 60; // 60 minutes
const EAR_REST_DURATION = 15 * 60; // 15 minutes
const EXTENDED_BREAK_DURATION = 60 * 60; // 60 minutes

export function sonicModeReducer(state: SonicModeState, action: SonicModeAction): SonicModeState {
  switch (action.type) {
    case 'START':
      return {
        isActive: true,
        phase: 'listen',
        timeLeft: LISTEN_DURATION,
        cycleCount: 1,
      };
    case 'STOP':
      return initialSonicModeState;
    case 'TICK':
      if (!state.isActive || state.timeLeft <= 0) {
        return state;
      }
      return { ...state, timeLeft: state.timeLeft - 1 };
    case 'TRANSITION': {
      if (!state.isActive) return state;

      switch (state.phase) {
        case 'listen':
          if (state.cycleCount >= action.settings.sonicModeCycles) {
            return {
              ...state,
              phase: 'extendedBreak',
              timeLeft: EXTENDED_BREAK_DURATION,
            };
          } else {
            return {
              ...state,
              phase: 'earRest',
              timeLeft: EAR_REST_DURATION,
            };
          }
        case 'earRest':
          return {
            ...state,
            phase: 'listen',
            timeLeft: LISTEN_DURATION,
            cycleCount: state.cycleCount + 1,
          };
        case 'extendedBreak':
          return {
            ...state,
            phase: 'listen',
            timeLeft: LISTEN_DURATION,
            cycleCount: 1, // Reset cycles
          };
        default:
          return state;
      }
    }
    default:
      return state;
  }
}
