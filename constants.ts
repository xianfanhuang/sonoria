export const CONFIG = {
  MAX_POINTS: 50000, 
  FFT_SIZE: 1024,
  SMOOTHING: 0.8, // Slightly less smoothing for punchier reaction
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  LORENZ: {
    SIGMA: 10,
    RHO: 28,
    BETA: 8 / 3,
    DT: 0.01,
    STEPS: 100, // Increased from 50 to 100 for faster trail evolution
  },
  IDLE_TIMEOUT: 4000,
};

export const MOODS = {
  CYAN: 'cyan',
  RED: 'red',
  PURPLE: 'purple',
} as const;

export type Mood = typeof MOODS[keyof typeof MOODS];

export const THEME_COLORS: Record<Mood, string> = {
  [MOODS.CYAN]: 'hsl(180, 80%, 50%)',
  [MOODS.RED]: 'hsl(0, 80%, 60%)',
  [MOODS.PURPLE]: 'hsl(270, 80%, 60%)',
};