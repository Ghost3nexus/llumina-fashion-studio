import React from 'react';
import { MannequinConfig, SceneConfig } from '../types';

interface Preset {
    id: string;
    icon: string;
    label: string;
    sublabel: string;
    mannequin: Partial<MannequinConfig>;
    scene: Partial<SceneConfig>;
}

const PRESETS: Preset[] = [
    {
        id: 'ec_standard',
        icon: '🛍️',
        label: 'EC Standard',
        sublabel: 'Prada × Clean',
        mannequin: { pose: 'ec_neutral', editorialStyle: 'prada_intellectual', vibe: 'minimalist' },
        scene: { lightingPreset: 'ec_standard', shotType: 'full_body_front', outputPurpose: 'ec_product' }
    },
    {
        id: 'luxury_editorial',
        icon: '✨',
        label: 'Luxury Editorial',
        sublabel: 'THE ROW × Ethereal',
        mannequin: { pose: 'editorial_power', editorialStyle: 'therow_silent', vibe: 'elegant' },
        scene: { lightingPreset: 'ec_luxury', shotType: 'campaign_editorial', outputPurpose: 'campaign' }
    },
    {
        id: 'instagram_story',
        icon: '📱',
        label: 'Instagram',
        sublabel: 'Miu Miu × Natural',
        mannequin: { pose: 'lifestyle_playful', editorialStyle: 'miumiu_playful', vibe: 'casual' },
        scene: { lightingPreset: 'natural_window', shotType: 'instagram_square', outputPurpose: 'instagram' }
    },
    {
        id: 'gucci_bold',
        icon: '🎨',
        label: 'Bold Campaign',
        sublabel: 'Gucci × Dramatic',
        mannequin: { pose: 'editorial_raw', editorialStyle: 'gucci_maximalist', vibe: 'edgy' },
        scene: { lightingPreset: 'dramatic_luminous', shotType: 'campaign_editorial', outputPurpose: 'campaign' }
    },
    {
        id: 'zara_ec',
        icon: '🏷️',
        label: 'Zara Style',
        sublabel: 'Sculptural × Clean',
        mannequin: { pose: 'ec_three_quarter', editorialStyle: 'zara_editorial', vibe: 'minimalist' },
        scene: { lightingPreset: 'ec_standard', shotType: 'full_body_front', outputPurpose: 'ec_product' }
    }
];

interface QuickPresetsProps {
    mannequin: MannequinConfig;
    scene: SceneConfig;
    onApply: (mannequin: Partial<MannequinConfig>, scene: Partial<SceneConfig>) => void;
}

export const QuickPresets: React.FC<QuickPresetsProps> = ({ mannequin, scene, onApply }) => {
    const isActive = (preset: Preset) => {
        return preset.mannequin.editorialStyle === mannequin.editorialStyle
            && preset.scene.lightingPreset === scene.lightingPreset;
    };

    return (
        <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">⚡ Quick Presets</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 custom-scrollbar">
                {PRESETS.map((preset) => (
                    <button
                        key={preset.id}
                        onClick={() => onApply(preset.mannequin, preset.scene)}
                        className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl transition-all border ${isActive(preset)
                            ? 'bg-studio-accent/10 border-studio-accent text-white shadow-lg shadow-studio-accent/10'
                            : 'bg-studio-900/50 border-studio-700/50 text-gray-400 hover:border-studio-600 hover:bg-studio-800'
                            }`}
                    >
                        <span className="text-lg">{preset.icon}</span>
                        <span className="text-[9px] font-bold uppercase tracking-wider whitespace-nowrap">{preset.label}</span>
                        <span className="text-[7px] text-gray-500 whitespace-nowrap">{preset.sublabel}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};
