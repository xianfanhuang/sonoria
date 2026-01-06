import { Mood } from './constants';
export type { Mood };

export interface AudioData {
  bass: number;
  mid: number;
  high: number;
  energy: number;
}

export interface Track {
  file: File;
  name: string;
  size: number;
  objectUrl: string;
}

export interface VisualizerParams {
  rho: number;
  sigma: number;
  variant: 'classic' | 'symmetric' | 'turbulent';
  mood: Mood;
  colorblind: boolean;
}

export interface WorkerMessage {
  points: Float32Array;
}

export interface WorkerInput {
  sigma: number;
  rho: number;
  beta: number;
  dt: number;
  steps: number;
  bass: number;
  mid: number;
  high: number;
  variant: string;
}