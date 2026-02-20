import React, { useState } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────

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
    ethnicity: string;
    onEthnicityChange: (v: string) => void;
    skinTone: string;
    onSkinToneChange: (v: string) => void;
    hairColor: string;
    onHairColorChange: (v: string) => void;
    hairLength: string;
    onHairLengthChange: (v: string) => void;
    // Advanced
    measurements: string;
    onMeasurementsChange: (v: string) => void;
}

// ─── Data ──────────────────────────────────────────────────────────────────

const GENDERS = [
    { value: 'female', label: 'Female', icon: '♀' },
    { value: 'male', label: 'Male', icon: '♂' },
];

const AGE_RANGES = [
    { value: 'teen', label: 'Teen' },
    { value: 'youthful', label: 'Youthful' },
    { value: 'prime', label: 'Prime' },
    { value: 'mature', label: 'Mature' },
];

const BODY_TYPES = [
    { value: 'petite', label: 'Petite' },
    { value: 'slim', label: 'Slim' },
    { value: 'athletic', label: 'Athletic' },
    { value: 'standard', label: 'Standard' },
    { value: 'curvy', label: 'Curvy' },
    { value: 'plus', label: 'Plus' },
];

const VIBES = [
    { value: 'minimalist', label: 'Minimalist' },
    { value: 'edgy', label: 'Edgy' },
    { value: 'casual', label: 'Casual' },
    { value: 'elegant', label: 'Elegant' },
    { value: 'bold', label: 'Bold' },
    { value: 'quiet_luxury', label: 'Quiet Luxury' },
];

const ETHNICITIES = [
    { value: 'east_asian', label: 'East Asian', desc: '東アジア系' },
    { value: 'southeast_asian', label: 'SE Asian', desc: '東南アジア系' },
    { value: 'south_asian', label: 'South Asian', desc: '南アジア系' },
    { value: 'black_african', label: 'Black', desc: '黒人・アフリカ系' },
    { value: 'latina_hispanic', label: 'Latina', desc: 'ラテン系' },
    { value: 'middle_eastern', label: 'Middle Eastern', desc: '中東系' },
    { value: 'white_caucasian', label: 'Caucasian', desc: '白人' },
    { value: 'mixed', label: 'Mixed', desc: 'ミックス' },
];

const SKIN_TONES = [
    { value: 'fair', label: 'Fair', color: '#F9E4D4' },
    { value: 'light', label: 'Light', color: '#ECCCAE' },
    { value: 'medium', label: 'Medium', color: '#C8956A' },
    { value: 'tan', label: 'Tan', color: '#A0694A' },
    { value: 'deep', label: 'Deep', color: '#5C3A20' },
];

const HAIR_COLORS = [
    { value: 'black', label: 'Black', color: '#1a1a1a' },
    { value: 'dark_brown', label: 'Dark Brown', color: '#3b1f0a' },
    { value: 'brown', label: 'Brown', color: '#7B4D28' },
    { value: 'light_brown', label: 'Lt Brown', color: '#B07D47' },
    { value: 'blonde', label: 'Blonde', color: '#D4AA52' },
    { value: 'platinum', label: 'Platinum', color: '#E8DCC8' },
    { value: 'auburn', label: 'Auburn', color: '#922B21' },
    { value: 'red', label: 'Red', color: '#C0392B' },
];

const HAIR_LENGTHS = [
    { value: 'short', label: 'Short' },
    { value: 'bob', label: 'Bob' },
    { value: 'medium', label: 'Medium' },
    { value: 'long', label: 'Long' },
    { value: 'extra_long', label: 'Extra Long' },
];

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

// ─── Brand Presets ──────────────────────────────────────────────────────────

interface BrandPreset {
    id: string;
    label: string;
    gender: string;
    ageRange: string;
    bodyType: string;
    vibe: string;
    ethnicity: string;
    skinTone: string;
    hairColor: string;
    hairLength: string;
    pose: string;
}

const BRAND_PRESETS: BrandPreset[] = [
    {
        id: 'prada',
        label: 'PRADA / MIU MIU',
        gender: 'female',
        ageRange: 'youthful',
        bodyType: 'slim',
        vibe: 'minimalist',
        ethnicity: 'east_asian',
        skinTone: 'fair',
        hairColor: 'black',
        hairLength: 'medium',
        pose: 'ec_neutral',
    },
    {
        id: 'jilsander',
        label: 'JIL SANDER',
        gender: 'female',
        ageRange: 'prime',
        bodyType: 'slim',
        vibe: 'minimalist',
        ethnicity: 'white_caucasian',
        skinTone: 'fair',
        hairColor: 'blonde',
        hairLength: 'short',
        pose: 'ec_neutral',
    },
    {
        id: 'gucci',
        label: 'GUCCI',
        gender: 'female',
        ageRange: 'youthful',
        bodyType: 'athletic',
        vibe: 'edgy',
        ethnicity: 'mixed',
        skinTone: 'medium',
        hairColor: 'dark_brown',
        hairLength: 'long',
        pose: 'editorial_power',
    },
    {
        id: 'therow',
        label: 'THE ROW',
        gender: 'female',
        ageRange: 'prime',
        bodyType: 'slim',
        vibe: 'quiet_luxury',
        ethnicity: 'white_caucasian',
        skinTone: 'light',
        hairColor: 'light_brown',
        hairLength: 'long',
        pose: 'ec_relaxed',
    },
    {
        id: 'uniqlo',
        label: 'UNIQLO',
        gender: 'female',
        ageRange: 'youthful',
        bodyType: 'standard',
        vibe: 'casual',
        ethnicity: 'east_asian',
        skinTone: 'light',
        hairColor: 'black',
        hairLength: 'medium',
        pose: 'lifestyle_candid',
    },
    {
        id: 'zara',
        label: 'ZARA',
        gender: 'female',
        ageRange: 'youthful',
        bodyType: 'standard',
        vibe: 'bold',
        ethnicity: 'latina_hispanic',
        skinTone: 'tan',
        hairColor: 'dark_brown',
        hairLength: 'long',
        pose: 'editorial_power',
    },
];

// ─── Sub-components ─────────────────────────────────────────────────────────

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

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 block">{children}</label>
);

// ─── Main Component ─────────────────────────────────────────────────────────

export const ModelStep: React.FC<ModelStepProps> = ({
    gender, onGenderChange,
    ageRange, onAgeRangeChange,
    bodyType, onBodyTypeChange,
    vibe, onVibeChange,
    pose, onPoseChange,
    ethnicity, onEthnicityChange,
    skinTone, onSkinToneChange,
    hairColor, onHairColorChange,
    hairLength, onHairLengthChange,
    measurements, onMeasurementsChange,
}) => {
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [activeBrandPreset, setActiveBrandPreset] = useState<string | null>(null);

    const applyBrandPreset = (preset: BrandPreset) => {
        setActiveBrandPreset(preset.id);
        onGenderChange(preset.gender);
        onAgeRangeChange(preset.ageRange);
        onBodyTypeChange(preset.bodyType);
        onVibeChange(preset.vibe);
        onEthnicityChange(preset.ethnicity);
        onSkinToneChange(preset.skinTone);
        onHairColorChange(preset.hairColor);
        onHairLengthChange(preset.hairLength);
        onPoseChange(preset.pose);
    };

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-sm font-semibold text-white mb-1">Model Configuration</h3>
                <p className="text-[11px] text-zinc-400">
                    Define the virtual model's appearance and pose.
                </p>
            </div>

            {/* Brand Presets */}
            <div>
                <SectionLabel>Brand Presets</SectionLabel>
                <div className="grid grid-cols-2 gap-1.5">
                    {BRAND_PRESETS.map((preset) => (
                        <button
                            key={preset.id}
                            onClick={() => applyBrandPreset(preset)}
                            className={`px-2.5 py-2 rounded-lg text-[10px] font-semibold transition-all text-left ${activeBrandPreset === preset.id
                                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/50'
                                    : 'bg-zinc-800/60 text-zinc-400 border border-zinc-700 hover:border-zinc-500 hover:text-zinc-200'
                                }`}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
                {activeBrandPreset && (
                    <p className="text-[9px] text-violet-400/70 mt-1.5">
                        ✓ Preset applied — adjust individual settings below as needed
                    </p>
                )}
            </div>

            <div className="border-t border-zinc-800 pt-1" />

            {/* Gender */}
            <div>
                <SectionLabel>Gender</SectionLabel>
                <div className="grid grid-cols-2 gap-2">
                    {GENDERS.map((g) => (
                        <button
                            key={g.value}
                            onClick={() => { onGenderChange(g.value); setActiveBrandPreset(null); }}
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

            {/* Ethnicity */}
            <div>
                <SectionLabel>Ethnicity</SectionLabel>
                <div className="grid grid-cols-2 gap-1.5">
                    {ETHNICITIES.map((e) => (
                        <button
                            key={e.value}
                            onClick={() => { onEthnicityChange(e.value); setActiveBrandPreset(null); }}
                            className={`px-2.5 py-2 rounded-lg text-left transition-all ${ethnicity === e.value
                                ? 'bg-violet-500/20 border border-violet-500/40'
                                : 'bg-zinc-800/50 border border-zinc-700 hover:border-zinc-500'
                                }`}
                        >
                            <div className={`text-[10px] font-semibold ${ethnicity === e.value ? 'text-violet-300' : 'text-zinc-300'}`}>{e.label}</div>
                            <div className="text-[8px] text-zinc-500 mt-0.5">{e.desc}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Skin Tone */}
            <div>
                <SectionLabel>Skin Tone</SectionLabel>
                <div className="flex gap-2">
                    {SKIN_TONES.map((tone) => (
                        <button
                            key={tone.value}
                            onClick={() => { onSkinToneChange(tone.value); setActiveBrandPreset(null); }}
                            title={tone.label}
                            className={`flex-1 flex flex-col items-center gap-1 p-1.5 rounded-lg border transition-all ${skinTone === tone.value
                                ? 'border-violet-500/60 bg-violet-500/10'
                                : 'border-zinc-700 hover:border-zinc-500'
                                }`}
                        >
                            <div
                                className="w-6 h-6 rounded-full border border-zinc-600"
                                style={{ backgroundColor: tone.color }}
                            />
                            <span className={`text-[8px] font-medium ${skinTone === tone.value ? 'text-violet-400' : 'text-zinc-500'}`}>{tone.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Age Range */}
            <div>
                <SectionLabel>Age Range</SectionLabel>
                <PillSelector
                    options={AGE_RANGES}
                    selected={ageRange}
                    onSelect={(v) => { onAgeRangeChange(v); setActiveBrandPreset(null); }}
                />
            </div>

            {/* Body Type */}
            <div>
                <SectionLabel>Body Type</SectionLabel>
                <PillSelector
                    options={BODY_TYPES}
                    selected={bodyType}
                    onSelect={(v) => { onBodyTypeChange(v); setActiveBrandPreset(null); }}
                />
            </div>

            {/* Vibe */}
            <div>
                <SectionLabel>Vibe</SectionLabel>
                <PillSelector
                    options={VIBES}
                    selected={vibe}
                    onSelect={(v) => { onVibeChange(v); setActiveBrandPreset(null); }}
                />
            </div>

            {/* Hair */}
            <div>
                <SectionLabel>Hair Color</SectionLabel>
                <div className="flex gap-1.5 flex-wrap">
                    {HAIR_COLORS.map((hc) => (
                        <button
                            key={hc.value}
                            onClick={() => { onHairColorChange(hc.value); setActiveBrandPreset(null); }}
                            title={hc.label}
                            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[10px] transition-all ${hairColor === hc.value
                                ? 'border-violet-500/60 bg-violet-500/10 text-violet-300'
                                : 'border-zinc-700 hover:border-zinc-500 text-zinc-400'
                                }`}
                        >
                            <div className="w-3 h-3 rounded-full border border-zinc-600 flex-shrink-0" style={{ backgroundColor: hc.color }} />
                            {hc.label}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <SectionLabel>Hair Length</SectionLabel>
                <PillSelector
                    options={HAIR_LENGTHS}
                    selected={hairLength}
                    onSelect={(v) => { onHairLengthChange(v); setActiveBrandPreset(null); }}
                />
            </div>

            {/* Pose */}
            <div>
                <SectionLabel>Pose</SectionLabel>
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

            {/* Advanced */}
            <div className="border border-zinc-700/50 rounded-xl overflow-hidden">
                <button
                    onClick={() => setAdvancedOpen(!advancedOpen)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-[11px] text-zinc-400 hover:text-zinc-300 transition-colors bg-zinc-800/30"
                >
                    <span className="uppercase tracking-wider font-semibold">Advanced Settings</span>
                    <span className={`transition-transform duration-200 ${advancedOpen ? 'rotate-180' : ''}`}>▾</span>
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
