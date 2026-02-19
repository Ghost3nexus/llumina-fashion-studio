
import React, { useState } from 'react';
import {
    ClothingType,
    LightingConfig,
    MannequinConfig,
    SceneConfig,
    GenerationState,
    DetailedGarmentMeasurements,
    DetailedAccessoryMeasurements,
    DetailedAccessoryPositioning,
    DetailedAccessoryMaterials
} from '../types';
import { OutfitPanel } from './tabs/OutfitPanel';
import { StylePanel } from './tabs/StylePanel';
import { ModelPanel } from './tabs/ModelPanel';
import { GeneratePanel } from './tabs/GeneratePanel';

type TabType = 'outfit' | 'style' | 'model' | 'generate';

interface TopControlPanelProps {
    onImageUpload: (type: ClothingType, file: File) => void;
    lighting: LightingConfig;
    setLighting: (config: LightingConfig) => void;
    mannequin: MannequinConfig;
    setMannequin: (config: MannequinConfig) => void;
    scene: SceneConfig;
    setScene: (config: SceneConfig) => void;
    onGenerate: () => void;
    onBatchGenerate: () => void;
    genState: GenerationState;
    uploadedImages: Record<ClothingType, string | null>;
    garmentMeasurements: DetailedGarmentMeasurements;
    setGarmentMeasurements: (config: DetailedGarmentMeasurements) => void;
    accessoryMeasurements: DetailedAccessoryMeasurements;
    setAccessoryMeasurements: (config: DetailedAccessoryMeasurements) => void;
    accessoryPositioning: DetailedAccessoryPositioning;
    setAccessoryPositioning: (config: DetailedAccessoryPositioning) => void;
    accessoryMaterials: DetailedAccessoryMaterials;
    setAccessoryMaterials: (config: DetailedAccessoryMaterials) => void;
    onApiSettings: () => void;
}

export const TopControlPanel: React.FC<TopControlPanelProps> = (props) => {
    const [activeTab, setActiveTab] = useState<TabType>('outfit');

    // Logic for tab completion indicators
    const hasAtLeastOneImage = Object.values(props.uploadedImages).some(img => img !== null);
    const isStyleComplete = props.mannequin.editorialStyle !== 'prada_intellectual'; // simple check
    const isModelComplete = true; // defaulting to true as defaults are set

    const tabs: { id: TabType; label: string; isComplete: boolean; isDisabled: boolean }[] = [
        { id: 'outfit', label: '1. OUTFIT', isComplete: hasAtLeastOneImage, isDisabled: false },
        { id: 'style', label: '2. STYLE', isComplete: isStyleComplete, isDisabled: !hasAtLeastOneImage },
        { id: 'model', label: '3. MODEL', isComplete: isModelComplete, isDisabled: !hasAtLeastOneImage },
        { id: 'generate', label: '4. GENERATE', isComplete: false, isDisabled: !hasAtLeastOneImage },
    ];

    return (
        <div className="flex flex-col h-full bg-studio-900 border-r border-studio-700 shadow-xl overflow-hidden relative">

            {/* Header & Tabs Row */}
            <div className="flex items-center justify-between px-6 bg-studio-900 h-16 border-b border-studio-800 shrink-0 z-30 relative">
                {/* Logo */}
                <div className="flex items-center space-x-4 w-48">
                    <h1 className="text-lg font-light tracking-widest text-white whitespace-nowrap">
                        LUMINA <span className="text-studio-600 font-bold">STUDIO</span>
                    </h1>
                </div>

                {/* Center Tabs */}
                <div className="flex-1 max-w-2xl flex items-center justify-center space-x-1 h-full">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                if (!tab.isDisabled) setActiveTab(tab.id);
                            }}
                            disabled={tab.isDisabled}
                            className={`relative h-full px-6 flex items-center justify-center gap-2 group transition-all min-w-[100px] ${activeTab === tab.id
                                ? 'border-b-2 border-studio-accent'
                                : 'border-b-2 border-transparent hover:border-studio-700 hover:bg-studio-800/50'
                                } ${tab.isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                            {/* Status Dot */}
                            <div className={`w-1.5 h-1.5 rounded-full transition-colors ${tab.isComplete ? 'bg-green-500' :
                                (activeTab === tab.id) ? 'bg-studio-accent' : 'bg-studio-700'
                                }`} />

                            <span className={`text-[10px] font-bold tracking-widest uppercase ${activeTab === tab.id ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'
                                }`}>
                                {tab.label}
                            </span>

                            {/* Active Glow */}
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 right-0 h-px bg-studio-accent shadow-[0_0_15px_1px_rgba(139,92,246,0.6)]" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Right Actions (API Status) */}
                <div className="w-48 flex justify-end items-center gap-3">
                    <button
                        onClick={props.onApiSettings}
                        className="flex items-center gap-2 px-3 py-1.5 bg-studio-800 rounded-lg border border-studio-700 hover:bg-studio-700 transition-colors cursor-pointer group"
                        title="API Settings"
                    >
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse group-hover:bg-studio-accent" />
                        <span className="text-[9px] text-gray-400 font-bold group-hover:text-white">API ACTIVE</span>
                    </button>
                </div>
            </div>

            {/* Main Panel Content Area */}
            <div className="flex-1 overflow-y-auto bg-studio-800/90 backdrop-blur-sm">
                <div className="min-h-full w-full">
                    {activeTab === 'outfit' && (
                        <OutfitPanel
                            uploadedImages={props.uploadedImages}
                            onImageUpload={props.onImageUpload}
                            garmentMeasurements={props.garmentMeasurements}
                            setGarmentMeasurements={props.setGarmentMeasurements}
                            accessoryMeasurements={props.accessoryMeasurements}
                            setAccessoryMeasurements={props.setAccessoryMeasurements}
                            accessoryPositioning={props.accessoryPositioning}
                            setAccessoryPositioning={props.setAccessoryPositioning}
                            accessoryMaterials={props.accessoryMaterials}
                            setAccessoryMaterials={props.setAccessoryMaterials}
                        />
                    )}
                    {activeTab === 'style' && (
                        <StylePanel
                            lighting={props.lighting}
                            setLighting={props.setLighting}
                            scene={props.scene}
                            setScene={props.setScene}
                            mannequin={props.mannequin}
                            setMannequin={props.setMannequin}
                        />
                    )}
                    {activeTab === 'model' && (
                        <ModelPanel
                            mannequin={props.mannequin}
                            setMannequin={props.setMannequin}
                        />
                    )}
                    {activeTab === 'generate' && (
                        <GeneratePanel
                            scene={props.scene}
                            setScene={props.setScene}
                            onGenerate={props.onGenerate}
                            onBatchGenerate={props.onBatchGenerate}
                            genState={props.genState}
                            uploadedImages={props.uploadedImages}
                        />
                    )}
                </div>
            </div>

        </div>
    );
};
