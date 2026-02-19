import React, { useState } from 'react';
import { STUDIO_PRESETS } from '../../../services/luminaApi';

interface StudioStepProps {
    selectedPreset: string;
    onSelectPreset: (presetId: string) => void;
    // Advanced
    shotType: string;
    onShotTypeChange: (v: string) => void;
    focalLength: string;
    onFocalLengthChange: (v: string) => void;
    seed: string;
    onSeedChange: (v: string) => void;
}

const SHOT_TYPES = [
    { value: 'full_body_front', label: 'Full Body Front' },
    { value: 'full_body_back', label: 'Full Body Back' },
    { value: 'bust_up', label: 'Bust Up' },
    { value: 'middle_top', label: 'Middle Top' },
    { value: 'bottom_focus', label: 'Bottom Focus' },
    { value: 'instagram_square', label: 'Instagram Square' },
];

const FOCAL_LENGTHS = ['25mm', '50mm', '80mm'];

export const StudioStep: React.FC<StudioStepProps> = ({
    selectedPreset,
    onSelectPreset,
    shotType,
    onShotTypeChange,
    focalLength,
    onFocalLengthChange,
    seed,
    onSeedChange,
}) => {
    const [advancedOpen, setAdvancedOpen] = useState(false);

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-sm font-semibold text-white mb-1">Studio Preset</h3>
                <p className="text-[11px] text-zinc-400">
                    Choose a studio environment. Lighting, background, and lens are set automatically.
                </p>
            </div>

            {/* Preset Cards */}
            <div className="space-y-2">
                {STUDIO_PRESETS.map((preset) => (
                    <button
                        key={preset.id}
                        onClick={() => onSelectPreset(preset.id)}
                        className={`
              w-full text-left p-3.5 rounded-xl border transition-all duration-200
              ${selectedPreset === preset.id
                                ? 'border-violet-500/60 bg-violet-500/10 shadow-[0_0_20px_rgba(139,92,246,0.08)]'
                                : 'border-zinc-700/50 bg-zinc-800/30 hover:bg-zinc-800/50 hover:border-zinc-600'
                            }
            `}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-xl w-8 text-center flex-shrink-0">{preset.icon}</span>
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold text-white">{preset.name}</div>
                                <div className="text-[10px] text-zinc-400 mt-0.5 leading-relaxed">{preset.description}</div>
                            </div>
                            {selectedPreset === preset.id && (
                                <span className="text-violet-400 text-sm flex-shrink-0">✓</span>
                            )}
                        </div>
                    </button>
                ))}
            </div>

            {/* Advanced Settings (collapsed by default) */}
            <div className="border border-zinc-700/50 rounded-xl overflow-hidden">
                <button
                    onClick={() => setAdvancedOpen(!advancedOpen)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-[11px] text-zinc-400 hover:text-zinc-300 transition-colors bg-zinc-800/30"
                >
                    <span className="uppercase tracking-wider font-semibold">Advanced Settings</span>
                    <span className={`transition-transform duration-200 ${advancedOpen ? 'rotate-180' : ''}`}>
                        ▾
                    </span>
                </button>
                {advancedOpen && (
                    <div className="p-4 space-y-4 border-t border-zinc-700/50 bg-zinc-900/30">
                        {/* Shot Type */}
                        <div>
                            <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 block">Shot Type</label>
                            <select
                                value={shotType}
                                onChange={(e) => onShotTypeChange(e.target.value)}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 transition-colors"
                            >
                                {SHOT_TYPES.map((st) => (
                                    <option key={st.value} value={st.value}>{st.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Focal Length */}
                        <div>
                            <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 block">Focal Length</label>
                            <div className="flex gap-2">
                                {FOCAL_LENGTHS.map((fl) => (
                                    <button
                                        key={fl}
                                        onClick={() => onFocalLengthChange(fl)}
                                        className={`flex-1 py-2 rounded-lg text-[11px] font-medium transition-all ${focalLength === fl
                                            ? 'bg-violet-500/20 text-violet-400 border border-violet-500/40'
                                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-500'
                                            }`}
                                    >
                                        {fl}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Seed */}
                        <div>
                            <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 block">Seed (optional)</label>
                            <input
                                type="text"
                                value={seed}
                                onChange={(e) => onSeedChange(e.target.value)}
                                placeholder="Random"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
