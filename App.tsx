import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { ListMusic, Sliders, Upload } from 'lucide-react';
import { clsx } from 'clsx';

import Visualizer from './components/Visualizer';
import ControlBar from './components/UI/ControlBar';
import SidePanel from './components/UI/SidePanel';
import Playlist from './components/UI/Playlist';

import { AudioEngine } from './services/audioEngine';
import { createWorker } from './services/workerBuilder';
import { CONFIG, MOODS } from './constants';
import { Track, VisualizerParams, AudioData } from './types';

// Initial states
const INITIAL_PARAMS: VisualizerParams = {
  rho: CONFIG.LORENZ.RHO,
  sigma: CONFIG.LORENZ.SIGMA,
  variant: 'classic',
  mood: MOODS.CYAN,
  colorblind: false
};

const INITIAL_AUDIO_DATA: AudioData = { bass: 0, mid: 0, high: 0, energy: 0 };

function App() {
  // --- State ---
  const [params, setParams] = useState<VisualizerParams>(INITIAL_PARAMS);
  const [audioData, setAudioData] = useState<AudioData>(INITIAL_AUDIO_DATA);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // UI State
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [showLab, setShowLab] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // --- Refs ---
  const audioEngineRef = useRef<AudioEngine>(new AudioEngine());
  const workerRef = useRef<Worker | null>(null);
  const rafRef = useRef<number>();
  const idleTimerRef = useRef<number>();
  const toastTimerRef = useRef<number>();
  
  // Track if we need to auto-play after tracks update
  const shouldAutoPlayRef = useRef(false);

  // --- Effects ---

  // Initialize Worker
  useEffect(() => {
    workerRef.current = createWorker();
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // Initialize Audio Listeners
  useEffect(() => {
    const engine = audioEngineRef.current;
    
    const handleTimeUpdate = () => setCurrentTime(engine.audioElement.currentTime);
    const handleLoadedMetadata = () => setDuration(engine.audioElement.duration);
    const handleEnded = () => {
        setIsPlaying(false);
        playNext();
    };
    const handleError = (e: Event) => {
        console.error("Audio Error:", e);
        showToast("Error loading audio");
        setIsPlaying(false);
    };

    engine.audioElement.addEventListener('timeupdate', handleTimeUpdate);
    engine.audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    engine.audioElement.addEventListener('ended', handleEnded);
    engine.audioElement.addEventListener('error', handleError);

    return () => {
      engine.audioElement.removeEventListener('timeupdate', handleTimeUpdate);
      engine.audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      engine.audioElement.removeEventListener('ended', handleEnded);
      engine.audioElement.removeEventListener('error', handleError);
    };
  }, [tracks, currentTrackIndex]); // Dependencies needed for playNext closure

  // Animation Loop for Audio Data
  const animate = useCallback(() => {
    // Always get data if playing, or if we want to visualize idle noise (optional, but here we strict check)
    if (isPlaying) {
      const data = audioEngineRef.current.getAudioData();
      setAudioData(data);
    }
    rafRef.current = requestAnimationFrame(animate);
  }, [isPlaying]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [animate]);

  // Idle Timer
  const resetIdle = useCallback(() => {
    setIsIdle(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (!showPlaylist && !showLab) {
        idleTimerRef.current = window.setTimeout(() => setIsIdle(true), CONFIG.IDLE_TIMEOUT);
    }
  }, [showPlaylist, showLab]);

  useEffect(() => {
    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('click', resetIdle);
    window.addEventListener('touchstart', resetIdle);
    return () => {
        window.removeEventListener('mousemove', resetIdle);
        window.removeEventListener('click', resetIdle);
        window.removeEventListener('touchstart', resetIdle);
    };
  }, [resetIdle]);

  // Toast Helper
  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3000);
  };

  // --- Handlers ---

  const handleFileUpload = async (files: FileList) => {
    const newTracks: Track[] = [];
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('audio/') || ['.mp3', '.wav', '.flac', '.ogg', '.m4a'].some(ext => file.name.toLowerCase().endsWith(ext))) {
            newTracks.push({
                file,
                name: file.name,
                size: file.size,
                objectUrl: URL.createObjectURL(file)
            });
        }
    }

    if (newTracks.length > 0) {
        const wasEmpty = tracks.length === 0;
        setTracks(prev => [...prev, ...newTracks]);
        showToast(`Added ${newTracks.length} tracks`);
        
        // Signal effects to play if we were empty
        if (wasEmpty) {
            shouldAutoPlayRef.current = true;
        }
    }
  };

  // Watch for tracks update to handle autoplay safely
  useEffect(() => {
      if (shouldAutoPlayRef.current && tracks.length > 0) {
          shouldAutoPlayRef.current = false;
          playTrackAtIndex(0);
      }
  }, [tracks]);

  const playTrackAtIndex = async (index: number) => {
      if (!tracks[index]) {
          console.warn("Track index out of bounds:", index);
          return;
      }
      
      try {
          await audioEngineRef.current.loadTrack(tracks[index].objectUrl);
          const success = await audioEngineRef.current.play();
          
          if (success) {
              setCurrentTrackIndex(index);
              setIsPlaying(true);
          } else {
              showToast("Playback blocked. Tap Play.");
              // Set index anyway so Play button works
              setCurrentTrackIndex(index);
              setIsPlaying(false);
          }
      } catch (e) {
          console.error(e);
          showToast("Failed to load track");
      }
  };

  const togglePlay = async () => {
    if (tracks.length === 0) {
        showToast("No tracks loaded");
        return;
    }

    // If no track selected but tracks exist, play first
    if (currentTrackIndex === -1 && tracks.length > 0) {
        playTrackAtIndex(0);
        return;
    }
    
    if (isPlaying) {
        audioEngineRef.current.pause();
        setIsPlaying(false);
    } else {
        const success = await audioEngineRef.current.play();
        if (success) {
            setIsPlaying(true);
        } else {
            // Sometimes context is suspended, try resuming explicitly
            await audioEngineRef.current.init(); // triggers resume
            // Retry play
            const retrySuccess = await audioEngineRef.current.play();
            if (retrySuccess) setIsPlaying(true);
        }
    }
  };

  const playNext = () => {
      if (tracks.length === 0) return;
      const next = (currentTrackIndex + 1) % tracks.length;
      playTrackAtIndex(next);
  };

  const playPrev = () => {
      if (tracks.length === 0) return;
      const prev = currentTrackIndex <= 0 ? tracks.length - 1 : currentTrackIndex - 1;
      playTrackAtIndex(prev);
  };

  // Drag & Drop
  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files) {
          handleFileUpload(e.dataTransfer.files);
      }
  };

  const handleShare = async () => {
     try {
         const canvas = document.querySelector('canvas');
         if (!canvas) return;
         canvas.toBlob(async (blob) => {
             if (!blob) return;
             const file = new File([blob], 'sonoria-viz.png', { type: 'image/png' });
             if (navigator.share) {
                 await navigator.share({ title: 'Sonoria Chaos', files: [file] });
             } else {
                 const url = URL.createObjectURL(blob);
                 const a = document.createElement('a');
                 a.href = url;
                 a.download = 'sonoria-viz.png';
                 a.click();
             }
             showToast("Snapshot captured");
         });
     } catch (e) {
         showToast("Share failed");
     }
  };

  const currentTrack = tracks[currentTrackIndex];

  return (
    <div 
        className="relative w-full h-screen bg-black overflow-hidden font-sans text-white select-none"
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
    >
      {/* 3D Scene */}
      <div className="absolute inset-0 z-0">
          <Canvas
            camera={{ position: [20, 10, 50], fov: 75 }}
            gl={{ antialias: false, powerPreference: "high-performance" }}
          >
              <color attach="background" args={['#000000']} />
              <fog attach="fog" args={['#000000', 1, 100]} />
              
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} intensity={0.8} />

              <Visualizer 
                params={params}
                audioData={audioData}
                worker={workerRef.current}
              />

      <EffectComposer enableNormalPass={false}>
                  <Bloom 
                    luminanceThreshold={0.3}
                    mipmapBlur
                    intensity={1.0 + (audioData.high / 255) * 0.8}
                    radius={0.4}
                  />
              </EffectComposer>
          </Canvas>
          {/* Vignette Overlay */}
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.8)_100%)]" />
      </div>

      {/* UI Layer */}
      <div className={clsx("absolute inset-0 z-10 transition-opacity duration-500 flex flex-col pointer-events-none", isIdle ? "opacity-10" : "opacity-100")}>
          
          {/* Header */}
          <header className="p-6 flex justify-between items-center pointer-events-auto">
              <div className="text-accent font-semibold tracking-widest text-lg uppercase mix-blend-overlay drop-shadow-md">
                  Lorenz Chaos V2
              </div>
              <div className="flex gap-2">
                  <button 
                    onClick={() => { setShowPlaylist(!showPlaylist); setShowLab(false); }}
                    className="p-3 rounded-full hover:bg-black/40 text-white/90 transition-colors backdrop-blur-md border border-white/10"
                  >
                      <ListMusic size={24} />
                  </button>
                  <button 
                    onClick={() => { setShowLab(!showLab); setShowPlaylist(false); }}
                    className="p-3 rounded-full hover:bg-black/40 text-white/90 transition-colors backdrop-blur-md border border-white/10"
                  >
                      <Sliders size={24} />
                  </button>
              </div>
          </header>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Footer / Controls */}
          <footer className="p-8 pb-12 pointer-events-auto">
              <ControlBar 
                isPlaying={isPlaying}
                onTogglePlay={togglePlay}
                onNext={playNext}
                onPrev={playPrev}
                onUpload={handleFileUpload}
                onShare={handleShare}
                currentTime={currentTime}
                duration={duration}
                audioEngine={audioEngineRef.current}
                currentTrackName={currentTrack?.name || "Sonoria Chaos"}
                currentTrackArtist={currentTrack ? "Local File" : "Drag & Drop Audio"}
              />
          </footer>
      </div>

      {/* Drawers */}
      <SidePanel 
        isOpen={showLab} 
        onClose={() => setShowLab(false)} 
        params={params}
        onUpdateParams={(newParams) => setParams(prev => ({ ...prev, ...newParams }))}
      />
      
      <Playlist 
        isOpen={showPlaylist}
        onClose={() => setShowPlaylist(false)}
        tracks={tracks}
        currentTrackIndex={currentTrackIndex}
        onPlayTrack={playTrackAtIndex}
        onClear={() => {
             setTracks([]);
             setCurrentTrackIndex(-1);
             setIsPlaying(false);
             audioEngineRef.current.stop();
        }}
      />

      {/* Drag Overlay */}
      <div className={clsx(
          "absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center transition-opacity duration-300 pointer-events-none",
          isDragging ? "opacity-100" : "opacity-0"
      )}>
          <Upload size={64} className="text-accent mb-4" />
          <p className="text-2xl text-white font-light">Release to Immerse</p>
      </div>

      {/* Toast */}
      <div className={clsx(
          "absolute top-24 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full bg-black/60 border border-accent/20 backdrop-blur-md text-white font-medium text-sm transition-all duration-300 z-50 pointer-events-none shadow-lg",
          toast ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
      )}>
          {toast}
      </div>
    </div>
  );
}

export default App;