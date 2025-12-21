import { CONFIG } from '../constants';
import { AudioData } from '../types';

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private dataArray: Uint8Array | null = null;
  public audioElement: HTMLAudioElement;

  constructor() {
    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.preload = 'auto'; // Changed to auto for better responsiveness
  }

  async init() {
    if (this.audioContext) {
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
        return;
    }

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) throw new Error('Web Audio API not supported');

    this.audioContext = new AudioContextClass();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = CONFIG.FFT_SIZE;
    this.analyser.smoothingTimeConstant = CONFIG.SMOOTHING;

    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);
    this.analyser.connect(this.gainNode);

    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
  }

  async loadTrack(objectUrl: string) {
    // Ensure context is ready
    await this.init();
    
    // Disconnect old source
    if (this.source) {
      this.source.disconnect();
    }

    this.audioElement.src = objectUrl;
    this.audioElement.load();
    
    // Connect new source
    if (this.audioContext) {
      // Create source only if it doesn't exist for this element or context needs it
      // Note: createMediaElementSource can only be called once per element in some browsers.
      // Ideally we reuse the source if the element is the same, but here we rebuild the graph.
      // To be safe against "HTMLMediaElement already connected to another node", we wrap in try/catch or reuse.
      try {
          if (!this.source) {
              this.source = this.audioContext.createMediaElementSource(this.audioElement);
          }
          this.source.disconnect(); // Safety disconnect
          this.source.connect(this.analyser!);
      } catch (e) {
          console.warn("Reusing existing media element source connection", e);
      }
    }
  }

  async play(): Promise<boolean> {
    try {
        await this.init(); // Ensure context is running
        if (this.audioContext?.state === 'suspended') {
            await this.audioContext.resume();
        }
        
        await this.audioElement.play();
        return true;
    } catch (e) {
        console.error('Playback failed:', e);
        return false;
    }
  }

  pause() {
    this.audioElement.pause();
  }

  stop() {
    this.audioElement.pause();
    this.audioElement.currentTime = 0;
  }

  seek(time: number) {
    if (isFinite(time)) {
      this.audioElement.currentTime = time;
    }
  }

  getAudioData(): AudioData {
    if (!this.analyser || !this.dataArray) {
      return { bass: 0, mid: 0, high: 0, energy: 0 };
    }

    // @ts-ignore
    this.analyser.getByteFrequencyData(this.dataArray);

    // Calculate energy bands
    // Helper to average range
    const getEnergy = (start: number, end: number) => {
      if (!this.dataArray) return 0;
      let sum = 0;
      const count = end - start;
      for (let i = start; i < end; i++) {
        sum += this.dataArray[i];
      }
      return sum / (count || 1);
    };

    return {
      bass: getEnergy(0, 8),
      mid: getEnergy(50, 200),
      high: getEnergy(300, 512),
      energy: getEnergy(0, 512),
    };
  }
}