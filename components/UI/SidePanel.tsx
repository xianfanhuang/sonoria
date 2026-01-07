import React from 'react';
import { clsx } from 'clsx';
import { Palette, X } from 'lucide-react';
import { VisualizerParams, Mood } from '../../types';
import { MOODS } from '../../constants';

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  params: VisualizerParams;
  onUpdateParams: (params: Partial<VisualizerParams>) => void;
}

const SidePanel: React.FC<SidePanelProps> = ({ isOpen, onClose, params, onUpdateParams }) => {
  const handleRandomVariant = () => {
     const variants = ['classic', 'symmetric', 'turbulent'];
     const random = variants[Math.floor(Math.random() * variants.length)];
     onUpdateParams({ variant: random as any });
  };

  return (
    <div 
      className={clsx(
        "fixed top-0 right-0 h-full w-80 bg-glass-bg/95 backdrop-blur-2xl border-l border-glass-border z-20 transition-transform duration-300 ease-out overflow-y-auto p-6",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-medium text-accent">Chaos Lab</h3>
        <div className="flex gap-2">
            <button 
                onClick={() => onUpdateParams({ colorblind: !params.colorblind })}
                className={clsx("p-2 rounded-lg transition-colors", params.colorblind ? "text-accent bg-white/10" : "text-white/60 hover:text-white")}
                title="Colorblind Mode"
            >
                <Palette size={20} />
            </button>
            <button onClick={onClose} className="p-2 text-white/60 hover:text-white transition-colors">
                <X size={20} />
            </button>
        </div>
      </div>

      {/* Sliders */}
      <div className="space-y-6 mb-8">
        <div>
            <div className="flex justify-between text-sm text-white/70 mb-2">
                <label>Rho (Complexity)</label>
                <span className="font-mono text-accent">{params.rho.toFixed(1)}</span>
            </div>
            <input 
                type="range" 
                min="28" 
                max="50" 
                step="0.1" 
                value={params.rho}
                onChange={(e) => onUpdateParams({ rho: parseFloat(e.target.value) })}
                className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent"
            />
        </div>

        <div>
            <div className="flex justify-between text-sm text-white/70 mb-2">
                <label>Sigma (Chaos)</label>
                <span className="font-mono text-accent">{params.sigma.toFixed(1)}</span>
            </div>
            <input 
                type="range" 
                min="5" 
                max="15" 
                step="0.1" 
                value={params.sigma}
                onChange={(e) => onUpdateParams({ sigma: parseFloat(e.target.value) })}
                className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent"
            />
        </div>
      </div>

      {/* AI Generate Button (Simulated) */}
      <button 
        onClick={handleRandomVariant}
        className="w-full py-3 mb-8 bg-accent text-black font-semibold rounded-full hover:shadow-[0_0_15px_rgba(0,255,255,0.4)] transition-all active:scale-95"
      >
        AI Generate Variant
      </button>

      {/* Moods */}
      <div className="space-y-3">
        <label className="text-sm text-white/70">Mood Preset</label>
        <div className="flex gap-2">
            {Object.values(MOODS).map((mood) => (
                <button
                    key={mood}
                    onClick={() => onUpdateParams({ mood: mood as Mood })}
                    className={clsx(
                        "flex-1 py-2 text-sm font-medium rounded-lg border transition-all capitalize",
                        params.mood === mood 
                            ? "bg-accent border-accent text-black" 
                            : "bg-white/5 border-glass-border text-white/70 hover:bg-white/10"
                    )}
                >
                    {mood}
                </button>
            ))}
        </div>
      </div>
      
      <div className="mt-8 p-4 rounded-lg bg-white/5 border border-glass-border">
        <p className="text-xs text-white/40 leading-relaxed">
            Current Variant: <span className="text-accent/80 capitalize">{params.variant}</span>
            <br/>
            The Lorenz system is a system of ordinary differential equations first studied by mathematician Edward Lorenz.
        </p>
      </div>

    </div>
  );
};

export default SidePanel;
