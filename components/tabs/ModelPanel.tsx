
import React, { useState } from 'react';
import { MannequinConfig, PoseType, BodyType, AgeGroup } from '../../types';
import { SectionHeader } from '../SectionHeader';
import { OptionGrid } from '../OptionGrid';

interface ModelPanelProps {
    mannequin: MannequinConfig;
    setMannequin: (config: MannequinConfig) => void;
}

export const ModelPanel: React.FC<ModelPanelProps> = ({
    mannequin,
    setMannequin
}) => {
    const [activeCategory, setActiveCategory] = useState<'pose' | 'character' | 'details'>('pose');

    return (
        <div className="h-full flex flex-col">
            <div className="flex border-b border-studio-700 bg-studio-800">
                {(['pose', 'character', 'details'] as const).map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`flex-1 py-3 text-[10px] uppercase font-bold tracking-wider transition-colors border-b-2 ${activeCategory === cat
                            ? 'border-studio-accent text-studio-accent bg-studio-accent/5'
                            : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-studio-700/50'
                            }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-studio-900/50">
                {activeCategory === 'pose' && (
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <SectionHeader title="EC Standard Poses" />
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: 'ec_neutral', label: 'Neutral' },
                                    { id: 'ec_three_quarter', label: '3/4 Turn' },
                                    { id: 'ec_relaxed', label: 'Relaxed' }
                                ].map((pose) => (
                                    <button
                                        key={pose.id}
                                        onClick={() => setMannequin({ ...mannequin, pose: pose.id as PoseType })}
                                        className={`py-3 rounded border text-xs font-bold transition-all ${mannequin.pose === pose.id
                                            ? 'bg-studio-accent border-studio-accent text-white'
                                            : 'bg-studio-800 border-studio-600 text-gray-400 hover:border-gray-400'
                                            }`}
                                    >
                                        {pose.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <SectionHeader title="Editorial Poses" />
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: 'editorial_standing', label: 'Standing' },
                                    { id: 'editorial_walking', label: 'Walking' },
                                    { id: 'editorial_seated', label: 'Seated' },
                                    { id: 'editorial_leaning', label: 'Leaning' },
                                ].map((pose) => (
                                    <button
                                        key={pose.id}
                                        onClick={() => setMannequin({ ...mannequin, pose: pose.id as PoseType })}
                                        className={`py-3 rounded border text-xs font-bold transition-all ${mannequin.pose === pose.id
                                            ? 'bg-studio-accent border-studio-accent text-white'
                                            : 'bg-studio-800 border-studio-600 text-gray-400 hover:border-gray-400'
                                            }`}
                                    >
                                        {pose.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeCategory === 'character' && (
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <SectionHeader title="Demographics" />
                            <div className="mb-4">
                                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-2">Gender</label>
                                <div className="flex gap-2">
                                    {['female', 'male'].map((g) => (
                                        <button
                                            key={g}
                                            onClick={() => setMannequin({ ...mannequin, gender: g as any })}
                                            className={`flex-1 py-2 rounded border text-xs font-bold transition-all ${mannequin.gender === g
                                                ? 'bg-studio-accent border-studio-accent text-white'
                                                : 'bg-studio-800 border-studio-600 text-gray-400 hover:border-gray-400'
                                                }`}
                                        >
                                            {g.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <OptionGrid
                                label="Ethnicity"
                                options={[
                                    { id: 'japanese', label: 'Japanese', icon: '🇯🇵' },
                                    { id: 'korean', label: 'Korean', icon: '🇰🇷' },
                                    { id: 'east_asian', label: 'East Asian', icon: '🌏' },
                                    { id: 'southeast_asian', label: 'SE Asian', icon: '🏝️' },
                                    { id: 'mixed', label: 'Mixed', icon: '🌐' },
                                    { id: 'european', label: 'European', icon: '🇪🇺' },
                                ]}
                                selectedId={mannequin.ethnicity}
                                onSelect={(id) => setMannequin({ ...mannequin, ethnicity: id as any })}
                            />
                        </div>
                        <div>
                            <SectionHeader title="Physics" />
                            <OptionGrid
                                label="Body Type"
                                options={[
                                    { id: 'slim', label: 'Slim', icon: '✨' },
                                    { id: 'athletic', label: 'Athletic', icon: '💪' },
                                    { id: 'curvy', label: 'Curvy', icon: '🏺' },
                                    { id: 'plus_size', label: 'Plus', icon: '➕' }, // Cast to BodyType if needed, currently types usually 'plus'
                                ]}
                                selectedId={mannequin.bodyType === 'plus' ? 'plus_size' : mannequin.bodyType} // Handle potential mapping mismatch if types use 'plus' vs 'plus_size'
                                onSelect={(id) => setMannequin({ ...mannequin, bodyType: (id === 'plus_size' ? 'plus' : id) as BodyType })}
                            />
                            <div className="mt-4">
                                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-2">Age Group</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['youthful', 'prime', 'mature'].map((age) => (
                                        <button
                                            key={age}
                                            onClick={() => setMannequin({ ...mannequin, ageGroup: age as AgeGroup })}
                                            className={`py-2 rounded border text-[10px] font-bold transition-all ${mannequin.ageGroup === age
                                                ? 'bg-studio-accent border-studio-accent text-white'
                                                : 'bg-studio-800 border-studio-600 text-gray-400 hover:border-gray-400'
                                                }`}
                                        >
                                            {age.replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeCategory === 'details' && (
                    <div>
                        <SectionHeader title="Model Details" />
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1.5">Height (cm)</label>
                                <input
                                    type="number"
                                    value={mannequin.height || ''}
                                    onChange={(e) => setMannequin({ ...mannequin, height: parseInt(e.target.value) || undefined })}
                                    placeholder="e.g. 175"
                                    className="w-full bg-studio-900 border border-studio-700 rounded px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-studio-accent outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1.5">Weight / Size</label>
                                <input
                                    type="text"
                                    value={mannequin.weight || ''}
                                    onChange={(e) => setMannequin({ ...mannequin, weight: e.target.value })}
                                    placeholder="e.g. 55kg or Slim"
                                    className="w-full bg-studio-900 border border-studio-700 rounded px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-studio-accent outline-none"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
