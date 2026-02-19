import React, { useState } from 'react';

interface ModelStepProps {
    gender: string;
    onGenderChange: (v: string) => void;
    ageRange: string;
    onAgeRangeChange: (v: string) => void;
    bodyType: string;
    onBodyTypeChange: (v: string) => void;
    vibe: string;
    onVibeChange: (v: string) => void;
    pose: string;
    onPoseChange: (v: string) => void;
    // Advanced
    measurements: string;
    onMeasurementsChange: (v: string) => void;
}

const GENDERS = [
    { value: 'female', label: 'Female', icon: '♀' },
    { value: 'male', label: 'Male', icon: '♂' },
];

const AGE_RANGES = ['Teen', 'Youthful', 'Prime', 'Mature'];
const BODY_TYPES = ['Petite', 'Slim', 'Athletic', 'Standard', 'Curvy', 'Plus'];
const VIBES = ['Minimalist', 'Edgy', 'Casual', 'Elegant'];

interface PoseGroup {
    label: string;
    poses: { value: string; label: string }[];
}

const POSE_COLLECTIONS: PoseGroup[] = [
    {
        label: 'EC Standard',
        poses: [
            { value: 'ec_neutral', label: 'Neutral' },
            { value: 'ec_relaxed', label: 'Relaxed' },
            { value: 'ec_dynamic', label: 'Dynamic' },
            { value: 'ec_three_quarter', label: '3/4 Turn' },
        ],
    },
    {
        label: 'Editorial',
        poses: [
            { value: 'editorial_power', label: 'Power' },
            { value: 'editorial_movement', label: 'Movement' },
            { value: 'editorial_seated', label: 'Seated' },
            { value: 'editorial_standing', label: 'Standing' },
        ],
    },
    {
        label: 'Lifestyle',
        poses: [
            { value: 'lifestyle_candid', label: 'Candid' },
            { value: 'lifestyle_playful', label: 'Playful' },
            { value: 'lifestyle_seated', label: 'Seated' },
        ],
    },
];

const PillSelector: React.FC<{
    options: { value: string; label: string }[];
    selected: string;
    onSelect: (v: string) => void;
}> = ({ options, selected, onSelect }) => (
    <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
            <button
                key={opt.value}
                onClick={() => onSelect(opt.value)}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all ${selected === opt.value
                        ? 'bg-violet-500/20 text-violet-400 border border-violet-500/40'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-500'
                    }`}
            >
                {opt.label}
            </button>
        ))}
    </div>
);

export const ModelStep: React.FC<ModelStepProps> = ({
    gender,
    onGenderChange,
    ageRange,
    onAgeRangeChange,
    bodyType,
    onBodyTypeChange,
    vibe,
    onVibeChange,
    pose,
    onPoseChange,
    measurements,
    onMeasurementsChange,
}) => {
    const [advancedOpen, setAdvancedOpen] = useState(false);

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-sm font-semibold text-white mb-1">Model Configuration</h3>
                <p className="text-[11px] text-zinc-400">
                    Define the virtual model's appearance and pose.
                </p>
            </div>

            {/* Gender */}
            <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 block">Gender</label>
                <div className="grid grid-cols-2 gap-2">
                    {GENDERS.map((g) => (
                        <button
                            key={g.value}
                            onClick={() => onGenderChange(g.value)}
                            className={`py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${gender === g.value
                                    ? 'bg-violet-500/15 text-violet-400 border border-violet-500/40'
                                    : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700 hover:border-zinc-500'
                                }`}
                        >
                            <span>{g.icon}</span> {g.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Age Range */}
            <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 block">Age Range</label>
                <PillSelector
                    options={AGE_RANGES.map(a => ({ value: a.toLowerCase(), label: a }))}
                    selected={ageRange}
                    onSelect={onAgeRangeChange}
                />
            </div>

            {/* Body Type */}
            <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 block">Body Type</label>
                <PillSelector
                    options={BODY_TYPES.map(b => ({ value: b.toLowerCase(), label: b }))}
                    selected={bodyType}
                    onSelect={onBodyTypeChange}
                />
            </div>

            {/* Vibe */}
            <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 block">Vibe</label>
                <PillSelector
                    options={VIBES.map(v => ({ value: v.toLowerCase(), label: v }))}
                    selected={vibe}
                    onSelect={onVibeChange}
                />
            </div>

            {/* Pose (Collections) */}
            <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 block">Pose</label>
                <div className="space-y-3">
                    {POSE_COLLECTIONS.map((group) => (
                        <div key={group.label}>
                            <div className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1 font-semibold">
                                {group.label}
                            </div>
                            <PillSelector
                                options={group.poses}
                                selected={pose}
                                onSelect={onPoseChange}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Advanced Settings: measurements only */}
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
                    <div className="p-4 space-y-3 border-t border-zinc-700/50 bg-zinc-900/30">
                        <div>
                            <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 block">
                                Measurements (cm, e.g. "B82 W60 H88")
                            </label>
                            <input
                                type="text"
                                value={measurements}
                                onChange={(e) => onMeasurementsChange(e.target.value)}
                                placeholder="Optional — leave blank for auto"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
