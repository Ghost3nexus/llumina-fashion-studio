import React, { useState } from 'react';
import { BrandProfile, DEFAULT_BRAND_PROFILES } from '../../../services/luminaApi';

interface BrandStepProps {
    selectedProfile: BrandProfile | null;
    onSelectProfile: (profile: BrandProfile | null) => void;
    savedProfiles: BrandProfile[];
    onSaveProfile: (profile: BrandProfile) => void;
}

export const BrandStep: React.FC<BrandStepProps> = ({
    selectedProfile,
    onSelectProfile,
    savedProfiles,
    onSaveProfile,
}) => {
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [newMood, setNewMood] = useState('minimalist');
    const [newKeywords, setNewKeywords] = useState('');

    const allProfiles = [...DEFAULT_BRAND_PROFILES, ...savedProfiles];

    const handleCreate = () => {
        if (!newName.trim()) return;
        const profile: BrandProfile = {
            id: `bp-custom-${Date.now()}`,
            name: newName.trim(),
            mood: newMood,
            doNotKeywords: newKeywords
                .split(',')
                .map((k) => k.trim())
                .filter(Boolean),
        };
        onSaveProfile(profile);
        onSelectProfile(profile);
        setIsCreating(false);
        setNewName('');
        setNewKeywords('');
    };

    const MOODS = ['minimalist', 'edgy', 'casual', 'elegant', 'playful', 'luxurious'];

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-sm font-semibold text-white mb-1">Brand Profile</h3>
                <p className="text-[11px] text-zinc-400">
                    Select a brand profile to lock in your visual tone across all outputs.
                </p>
            </div>

            {/* Profile Cards */}
            <div className="space-y-2">
                {allProfiles.map((p) => (
                    <button
                        key={p.id}
                        onClick={() => onSelectProfile(selectedProfile?.id === p.id ? null : p)}
                        className={`
              w-full text-left p-3 rounded-xl border transition-all duration-200
              ${selectedProfile?.id === p.id
                                ? 'border-violet-500/60 bg-violet-500/10'
                                : 'border-zinc-700/50 bg-zinc-800/30 hover:bg-zinc-800/50 hover:border-zinc-600'
                            }
            `}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-white">{p.name}</span>
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-zinc-700/50 text-zinc-400 uppercase tracking-wider">
                                {p.mood}
                            </span>
                        </div>
                        {p.doNotKeywords.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                                {p.doNotKeywords.map((kw, i) => (
                                    <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400/80 border border-red-500/20">
                                        ✕ {kw}
                                    </span>
                                ))}
                            </div>
                        )}
                    </button>
                ))}
            </div>

            {/* Create New */}
            {!isCreating ? (
                <button
                    onClick={() => setIsCreating(true)}
                    className="w-full py-2.5 border-2 border-dashed border-zinc-700 rounded-xl text-[11px] text-zinc-400 hover:text-white hover:border-zinc-500 transition-all"
                >
                    + Create New Brand Profile
                </button>
            ) : (
                <div className="p-4 rounded-xl border border-zinc-700 bg-zinc-800/50 space-y-3">
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Brand name"
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
                    />
                    <div>
                        <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Mood</label>
                        <div className="flex flex-wrap gap-1.5">
                            {MOODS.map((m) => (
                                <button
                                    key={m}
                                    onClick={() => setNewMood(m)}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${newMood === m
                                            ? 'bg-violet-500/20 text-violet-400 border border-violet-500/40'
                                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-500'
                                        }`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>
                    <input
                        type="text"
                        value={newKeywords}
                        onChange={(e) => setNewKeywords(e.target.value)}
                        placeholder="Do-not keywords (comma separated)"
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={handleCreate}
                            disabled={!newName.trim()}
                            className="flex-1 py-2 bg-violet-600 text-white text-[11px] font-semibold rounded-lg hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            Save Profile
                        </button>
                        <button
                            onClick={() => setIsCreating(false)}
                            className="py-2 px-4 bg-zinc-700 text-zinc-300 text-[11px] rounded-lg hover:bg-zinc-600 transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
