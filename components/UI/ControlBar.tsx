import React, { useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Share2, Plus } from 'lucide-react';
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
    <div className="w-full max-w-2xl mx-auto backdrop-blur-lg bg-black/50 border border-white/10 rounded-xl p-4 shadow-lg">
      <div className="flex items-center">
        {/* Track Info */}
        <div className="w-1/3 text-left">
          <h2 className="text-base font-semibold text-white truncate">
            {currentTrackName}
          </h2>
          <p className="text-xs font-normal text-white/50 truncate">
            {currentTrackArtist}
          </p>
        </div>

        {/* Main Playback Controls */}
        <div className="flex-1 flex flex-col items-center justify-center mx-4">
          <div className="flex items-center gap-6 mb-2">
            <button onClick={onPrev} className="p-2 text-white/70 hover:text-white transition-colors">
              <SkipBack size={20} />
            </button>
            <button
              onClick={onTogglePlay}
              className="w-12 h-12 flex items-center justify-center rounded-full bg-accent text-black hover:bg-white transition-all transform hover:scale-105"
            >
              {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
            </button>
            <button onClick={onNext} className="p-2 text-white/70 hover:text-white transition-colors">
              <SkipForward size={20} />
            </button>
          </div>
          {/* Progress Bar */}
          <div className="w-full flex items-center gap-2 text-xs text-white/50">
            <span>{formatTime(currentTime)}</span>
            <div
              ref={progressRef}
              onClick={handleProgressClick}
              className="flex-1 h-1.5 bg-white/10 rounded-full cursor-pointer group"
            >
              <div
                className="h-full bg-accent rounded-full transition-all duration-100 ease-linear"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="w-1/3 flex items-center justify-end gap-2">
           <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              multiple
              accept="audio/*"
              onChange={(e) => e.target.files && onUpload(e.target.files)}
           />
           <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-full hover:bg-white/10 text-white/70 transition-colors"
              title="Add Music"
           >
             <Plus size={20} />
           </button>
           <button 
             onClick={onShare}
             className="p-2 rounded-full hover:bg-white/10 text-white/70 transition-colors"
             title="Share"
           >
             <Share2 size={20} />
           </button>
        </div>
      </div>
    </div>
  );
};

export default ControlBar;
