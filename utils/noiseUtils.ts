import { NoiseType, NoisePattern } from '../types';

// Audio context for generating noise
let audioContext: AudioContext | null = null;

// Get or create audio context
const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

// Generate white noise
const generateWhiteNoise = (duration: number, volume: number): AudioBuffer => {
  const context = getAudioContext();
  const sampleRate = context.sampleRate;
  const bufferSize = sampleRate * (duration / 1000);
  const buffer = context.createBuffer(1, bufferSize, sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * volume;
  }

  return buffer;
};

// Generate pink noise
const generatePinkNoise = (duration: number, volume: number): AudioBuffer => {
  const context = getAudioContext();
  const sampleRate = context.sampleRate;
  const bufferSize = sampleRate * (duration / 1000);
  const buffer = context.createBuffer(1, bufferSize, sampleRate);
  const data = buffer.getChannelData(0);

  // Pink noise algorithm
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    
    const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    b6 = white * 0.115926;
    
    data[i] = pink * volume;
  }

  return buffer;
};

// Generate brown noise
const generateBrownNoise = (duration: number, volume: number): AudioBuffer => {
  const context = getAudioContext();
  const sampleRate = context.sampleRate;
  const bufferSize = sampleRate * (duration / 1000);
  const buffer = context.createBuffer(1, bufferSize, sampleRate);
  const data = buffer.getChannelData(0);

  let lastOut = 0;
  
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    lastOut = (lastOut + (0.02 * white)) / 1.02;
    data[i] = lastOut * volume;
  }

  return buffer;
};

// Generate beep sound
const generateBeep = (duration: number, volume: number, frequency: number = 440): AudioBuffer => {
  const context = getAudioContext();
  const sampleRate = context.sampleRate;
  const bufferSize = sampleRate * (duration / 1000);
  const buffer = context.createBuffer(1, bufferSize, sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * volume;
  }

  return buffer;
};

// Generate chime sound
const generateChime = (duration: number, volume: number, frequency: number = 800): AudioBuffer => {
  const context = getAudioContext();
  const sampleRate = context.sampleRate;
  const bufferSize = sampleRate * (duration / 1000);
  const buffer = context.createBuffer(1, bufferSize, sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    // Create a chime sound with a decaying sine wave
    const decay = Math.exp(-i / (bufferSize * 0.3));
    data[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * volume * decay;
  }

  return buffer;
};

// Generate click sound
const generateClick = (duration: number, volume: number): AudioBuffer => {
  const context = getAudioContext();
  const sampleRate = context.sampleRate;
  const bufferSize = sampleRate * (duration / 1000);
  const buffer = context.createBuffer(1, bufferSize, sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    // Create a sharp click sound
    data[i] = (i < bufferSize * 0.01) ? volume : 0;
  }

  return buffer;
};

// Generate noise buffer based on type
const generateNoiseBuffer = (type: NoiseType, duration: number, volume: number, frequency?: number): AudioBuffer => {
  switch (type) {
    case 'white':
      return generateWhiteNoise(duration, volume);
    case 'pink':
      return generatePinkNoise(duration, volume);
    case 'brown':
      return generateBrownNoise(duration, volume);
    case 'beep':
      return generateBeep(duration, volume, frequency);
    case 'chime':
      return generateChime(duration, volume, frequency);
    case 'click':
      return generateClick(duration, volume);
    case 'none':
    default:
      // Return empty buffer for 'none' type
      const context = getAudioContext();
      return context.createBuffer(1, 1, context.sampleRate);
  }
};

// Play noise pattern
export const playNoise = (pattern: NoisePattern): void => {
  if (pattern.type === 'none') return;
  
  try {
    const context = getAudioContext();
    const buffer = generateNoiseBuffer(
      pattern.type,
      pattern.duration,
      pattern.volume,
      pattern.frequency
    );
    
    const source = context.createBufferSource();
    source.buffer = buffer;
    
    const gainNode = context.createGain();
    gainNode.gain.value = pattern.volume;
    
    source.connect(gainNode);
    gainNode.connect(context.destination);
    
    source.start();
  } catch (error) {
    console.error('Error playing noise:', error);
  }
};

// Create specific noise patterns for different timer phases
export const createPhaseNoise = (phase: string, noiseType: NoiseType, volume: number): NoisePattern => {
  const duration = 500; // Default duration in milliseconds
  
  switch (phase) {
    case 'prepare':
      return { type: noiseType, duration, volume, frequency: 600 };
    case 'work':
      return { type: noiseType, duration, volume, frequency: 800 };
    case 'rest':
      return { type: noiseType, duration, volume, frequency: 400 };
    case 'set_rest':
      return { type: noiseType, duration, volume, frequency: 300 };
    case 'finished':
      return { type: noiseType, duration: 1000, volume, frequency: 1000 };
    case 'sonic_start':
      return { type: noiseType, duration, volume, frequency: 500 };
    case 'sonic_break':
      return { type: noiseType, duration: 1000, volume, frequency: 700 };
    case 'sonic_extended_break':
      return { type: noiseType, duration: 2000, volume, frequency: 900 };
    default:
      return { type: noiseType, duration, volume, frequency: 440 };
  }
};

// Resume audio context if suspended (required by some browsers)
export const resumeAudioContext = async (): Promise<void> => {
  try {
    const context = getAudioContext();
    if (context.state === 'suspended') {
      await context.resume();
    }
  } catch (error) {
    console.error('Error resuming audio context:', error);
  }
};