import React from 'react';
import { clsx } from 'clsx';
import { Trash2, Music, X } from 'lucide-react';
import { Track } from '../../types';

interface PlaylistProps {
  isOpen: boolean;
  onClose: () => void;
  tracks: Track[];
  currentTrackIndex: number;
  onPlayTrack: (index: number) => void;
  onClear: () => void;
}

const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const Playlist: React.FC<PlaylistProps> = ({ isOpen, onClose, tracks, currentTrackIndex, onPlayTrack, onClear }) => {
  return (
    <div 
        className={clsx(
            "fixed bottom-0 right-0 w-full md:w-96 max-h-[60vh] bg-glass-bg/95 backdrop-blur-2xl border-t md:border-l md:border-t-0 border-glass-border rounded-t-3xl md:rounded-tr-none md:rounded-tl-3xl z-20 flex flex-col transition-transform duration-300 ease-out",
            isOpen ? "translate-y-0" : "translate-y-full"
        )}
    >
      <div className="flex items-center justify-between p-6 border-b border-white/5">
        <div className="flex items-center gap-2 text-accent">
            <Music size={20} />
            <span className="font-medium tracking-wide">PLAY QUEUE</span>
        </div>
        <div className="flex items-center gap-4">
             <button 
                onClick={onClear} 
                className="text-xs uppercase tracking-wider text-white/50 hover:text-red-400 transition-colors flex items-center gap-1"
            >
                <Trash2 size={14} /> Clear
            </button>
             <button onClick={onClose} className="md:hidden text-white/60">
                 <X size={20} />
             </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {tracks.length === 0 ? (
            <div className="text-center py-12 text-white/30">
                <p>Queue is empty</p>
                <p className="text-sm mt-2">Drop files to play</p>
            </div>
        ) : (
            tracks.map((track, idx) => (
                <div 
                    key={`${track.name}-${idx}`}
                    onClick={() => onPlayTrack(idx)}
                    className={clsx(
                        "p-3 rounded-xl cursor-pointer transition-all flex items-center gap-3 group",
                        currentTrackIndex === idx ? "bg-accent/10" : "hover:bg-white/5"
                    )}
                >
                    <div className={clsx(
                        "w-2 h-2 rounded-full",
                        currentTrackIndex === idx ? "bg-accent animate-pulse" : "bg-white/20 group-hover:bg-white/40"
                    )} />
                    <div className="flex-1 min-w-0">
                        <div className={clsx(
                            "text-sm font-medium truncate",
                            currentTrackIndex === idx ? "text-accent" : "text-white/90"
                        )}>
                            {track.name}
                        </div>
                        <div className="text-xs text-white/40">
                            {formatFileSize(track.size)}
                        </div>
                    </div>
                </div>
            ))
        )}
      </div>
    </div>
  );
};

export default Playlist;
