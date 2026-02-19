
import React, { useState } from 'react';
import { LightingConfig, SceneConfig, MannequinConfig, LightingPreset, EditorialStyle } from '../../types';
import { SectionHeader } from '../SectionHeader';
import { OptionGrid } from '../OptionGrid';
import { QuickPresets } from '../QuickPresets';

interface StylePanelProps {
    lighting: LightingConfig;
    setLighting: (config: LightingConfig) => void;
    scene: SceneConfig;
    setScene: (config: SceneConfig) => void;
    mannequin: MannequinConfig;
    setMannequin: (config: MannequinConfig) => void;
}

export const StylePanel: React.FC<StylePanelProps> = ({
    // lighting, // Unused
    // setLighting, // Unused
    scene,
    setScene,
    mannequin,
    setMannequin
}) => {
    const [activeCategory, setActiveCategory] = useState<'presets' | 'lighting' | 'style' | 'camera'>('presets');

    return (
        <div className="h-full flex flex-col">
            <div className="flex border-b border-studio-700 bg-studio-800">
                {(['presets', 'lighting', 'style', 'camera'] as const).map((cat) => (
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
                {activeCategory === 'presets' && (
                    <div className="max-w-4xl mx-auto">
                        <QuickPresets
                            mannequin={mannequin}
                            scene={scene}
                            onApply={(m, s) => {
                                setMannequin({ ...mannequin, ...m });
                                setScene({ ...scene, ...s });
                            }}
                        />
                    </div>
                )}

                {activeCategory === 'lighting' && (
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <SectionHeader title="Editorial Lighting" />
                            <OptionGrid
                                options={[
                                    { id: 'natural_window', label: 'Window', icon: '🪟' },
                                    { id: 'ethereal_soft', label: 'Ethereal', icon: '☁️' },
                                    { id: 'sculptural_contrast', label: 'Sculptural', icon: '🗿' },
                                    { id: 'dramatic_shadow', label: 'Dramatic', icon: '🌑' },
                                ]}
                                selectedId={scene.lightingPreset}
                                onSelect={(id) => setScene({ ...scene, lightingPreset: id as LightingPreset })}
                            />
                        </div>
                        <div>
                            <SectionHeader title="Classic Lighting" />
                            <OptionGrid
                                options={[
                                    { id: 'studio', label: 'Studio', icon: '💡' },
                                    { id: 'golden_hour', label: 'Golden', icon: '🌅' },
                                    { id: 'neon', label: 'Neon', icon: '🌃' },
                                    { id: 'cinematic', label: 'Cinema', icon: '🎬' },
                                    { id: 'high_key', label: 'Hi-Key', icon: '⚪' },
                                ]}
                                selectedId={scene.lightingPreset}
                                onSelect={(id) => setScene({ ...scene, lightingPreset: id as LightingPreset })}
                            />
                        </div>
                    </div>
                )}

                {activeCategory === 'style' && (
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <SectionHeader title="Brand Aesthetics" />
                            <OptionGrid
                                options={[
                                    { id: 'prada_intellectual', label: 'Intellectual', icon: '📘' },
                                    { id: 'miumiu_playful', label: 'Playful', icon: '🎀' },
                                    { id: 'therow_silent', label: 'Silent', icon: '🕊️' },
                                    { id: 'acne_sculptural', label: 'Sculptural', icon: '🗿' },
                                    { id: 'gucci_maximalist', label: 'Maximalist', icon: '🐯' },
                                    { id: 'zara_editorial', label: 'Fast Fashion', icon: '⚡' },
                                ]}
                                selectedId={mannequin.editorialStyle}
                                onSelect={(id) => setMannequin({ ...mannequin, editorialStyle: id as EditorialStyle })}
                            />
                        </div>
                        <div>
                            <SectionHeader title="Classic Style" />
                            <OptionGrid
                                options={[
                                    { id: 'vogue', label: 'Vogue', icon: '✨' },
                                    { id: 'elle', label: 'Elle', icon: '👠' },
                                    { id: 'collection', label: 'Lookbook', icon: '📚' },
                                    { id: 'japanese_magazine', label: 'JP Mag', icon: '🗾' },
                                ]}
                                selectedId={mannequin.editorialStyle}
                                onSelect={(id) => setMannequin({ ...mannequin, editorialStyle: id as EditorialStyle })}
                            />
                        </div>
                    </div>
                )}

                {activeCategory === 'camera' && (
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <SectionHeader title="Focal Length" />
                            <div className="flex gap-2">
                                {['25mm', '50mm', '80mm'].map((fl) => (
                                    <button
                                        key={fl}
                                        onClick={() => setScene({ ...scene, focalLength: fl as any })}
                                        className={`flex-1 py-3 rounded border text-xs font-bold transition-all ${scene.focalLength === fl
                                            ? 'bg-studio-accent border-studio-accent text-white'
                                            : 'bg-studio-800 border-studio-600 text-gray-400 hover:border-gray-400'
                                            }`}
                                    >
                                        {fl}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            {/* Background or other camera settings could go here */}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
