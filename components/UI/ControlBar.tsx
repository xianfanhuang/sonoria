import React, { useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Mic, Upload, Share2, Plus } from 'lucide-react';
import { clsx } from 'clsx';
import { AudioEngine } from '../../services/audioEngine';

interface ControlBarProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onUpload: (files: FileList) => void;
  onShare: () => void;
  currentTime: number;
  duration: number;
  audioEngine: AudioEngine;
  currentTrackName: string;
  currentTrackArtist: string;
}

const formatTime = (seconds: number) => {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const ControlBar: React.FC<ControlBarProps> = ({
  isPlaying,
  onTogglePlay,
  onNext,
  onPrev,
  onUpload,
  onShare,
  currentTime,
  duration,
  audioEngine,
  currentTrackName,
  currentTrackArtist
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const handleProgressClick = (e: React.MouseEvent) => {
    if (!progressRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const percent = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    audioEngine.seek(percent * duration);
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-full max-w-3xl mx-auto backdrop-blur-xl bg-glass-bg border border-glass-border rounded-2xl p-6 shadow-2xl transition-transform duration-300 hover:scale-[1.01]">
      {/* Track Info */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-medium text-accent mb-1 truncate px-4">
          {currentTrackName}
        </h2>
        <p className="text-sm font-light text-white/60 tracking-wide truncate">
          {currentTrackArtist}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center gap-4 mb-6 text-xs text-white/70 font-mono">
        <span className="w-10 text-right">{formatTime(currentTime)}</span>
        <div 
          ref={progressRef}
          onClick={handleProgressClick}
          className="flex-1 h-1 bg-white/10 rounded-full cursor-pointer relative group"
        >
          <div 
            className="absolute left-0 top-0 h-full bg-accent rounded-full transition-all duration-100 ease-linear group-hover:bg-accent-red"
            style={{ width: `${progressPercent}%` }}
          />
          {/* Hover indicator */}
          <div 
             className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
             style={{ left: `${progressPercent}%`, transform: 'translate(-50%, -50%)' }}
          />
        </div>
        <span className="w-10">{formatTime(duration)}</span>
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center">
        {/* Left Actions */}
        <button 
          className="p-3 rounded-full hover:bg-white/10 text-white/70 transition-colors"
          title="Mic Mode (Experimental)"
        >
          <Mic size={20} />
        </button>

        {/* Main Playback */}
        <div className="flex items-center gap-6">
          <button onClick={onPrev} className="p-3 hover:text-accent transition-colors text-white/90">
            <SkipBack size={24} />
          </button>
          
          <button 
            onClick={onTogglePlay}
            className="w-14 h-14 flex items-center justify-center rounded-full bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 hover:shadow-[0_0_20px_rgba(0,255,255,0.3)] transition-all duration-300"
          >
            {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
          </button>
          
          <button onClick={onNext} className="p-3 hover:text-accent transition-colors text-white/90">
            <SkipForward size={24} />
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
           <div className="relative">
             <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                multiple 
                accept="audio/*, .mp3, .wav, .m4a, .flac, .ogg, .aac, audio/mpeg, audio/mp4, audio/x-m4a"
                onChange={(e) => e.target.files && onUpload(e.target.files)}
             />
             <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-3 rounded-full hover:bg-white/10 text-white/70 transition-colors"
                title="Add Music"
             >
               <Plus size={20} />
             </button>
           </div>
           
           <button 
             onClick={onShare}
             className="p-3 rounded-full hover:bg-white/10 text-white/70 transition-colors"
             title="Share Visualization"
           >
             <Share2 size={20} />
           </button>
        </div>
      </div>
    </div>
  );
};

export default ControlBar;