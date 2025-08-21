import { useState, useEffect, useCallback } from 'react';
import { NoiseType } from '../types';
import { playNoise, createPhaseNoise, resumeAudioContext } from '../utils/noiseUtils';

interface UseNoiseProps {
  enabled: boolean;
  noiseType: NoiseType;
  volume: number;
}

export const useNoise = ({ enabled, noiseType, volume }: UseNoiseProps) => {
  const [isAudioSupported, setIsAudioSupported] = useState(true);

  // Check if Web Audio API is supported
  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsAudioSupported(false);
      return;
    }

    const isSupported = !!(window.AudioContext || (window as any).webkitAudioContext);
    setIsAudioSupported(isSupported);
  }, []);

  // Resume audio context on user interaction
  const handleUserInteraction = useCallback(async () => {
    if (enabled && isAudioSupported) {
      await resumeAudioContext();
    }
  }, [enabled, isAudioSupported]);

  // Add event listeners for user interaction
  useEffect(() => {
    if (enabled && isAudioSupported) {
      const events = ['click', 'touchstart', 'keydown'];
      events.forEach(event => {
        window.addEventListener(event, handleUserInteraction, { once: true });
      });

      return () => {
        events.forEach(event => {
          window.removeEventListener(event, handleUserInteraction);
        });
      };
    }
  }, [enabled, isAudioSupported, handleUserInteraction]);

  // Play noise for a specific phase
  const playPhaseNoise = useCallback((phase: string) => {
    if (!enabled || !isAudioSupported || noiseType === 'none') return;

    const pattern = createPhaseNoise(phase, noiseType, volume);
    playNoise(pattern);
  }, [enabled, isAudioSupported, noiseType, volume]);

  return {
    isAudioSupported,
    playPhaseNoise
  };
};