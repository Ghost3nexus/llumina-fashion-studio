
import React from 'react';
import { SceneConfig, GenerationState, ClothingType } from '../../types';

interface GeneratePanelProps {
    scene: SceneConfig;
    setScene: (config: SceneConfig) => void;
    onGenerate: () => void;
    onBatchGenerate: () => void;
    genState: GenerationState;
    uploadedImages: Record<ClothingType, string | null>;
}

export const GeneratePanel: React.FC<GeneratePanelProps> = ({
    scene,
    setScene,
    onGenerate,
    onBatchGenerate,
    genState,
    uploadedImages
}) => {
    const isProcessing = genState.status === 'analyzing' || genState.status === 'generating';
    const hasAtLeastOneImage = Object.values(uploadedImages).some(img => img !== null);

    return (
        <div className="h-full flex flex-col p-6 bg-studio-900/50 overflow-y-auto custom-scrollbar">
            <div className="max-w-3xl mx-auto w-full space-y-8">

                {/* Prompt Input */}
                <div>
                    <label className="text-xs uppercase font-bold text-gray-500 block mb-3 flex justify-between">
                        <span>✍️ Additional Direction</span>
                        <span className="text-gray-600 font-normal normal-case">Optional detailed instructions</span>
                    </label>
                    <textarea
                        value={scene.customPrompt || ''}
                        onChange={(e) => setScene({ ...scene, customPrompt: e.target.value })}
                        placeholder="Add specific instructions for the AI (e.g., 'Model looking to the left', 'Holding a coffee cup', 'City street background')..."
                        rows={4}
                        className="w-full bg-studio-800 border border-studio-700 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-studio-accent outline-none transition-colors resize-none shadow-inner"
                    />
                </div>

                {/* Action Buttons */}
                <div className="space-y-4">
                    {/* EC Batch Generate Button */}
                    {scene.outputPurpose === 'ec_product' && (
                        <button
                            onClick={onBatchGenerate}
                            disabled={!hasAtLeastOneImage || isProcessing}
                            className={`w-full py-5 rounded-xl font-bold uppercase tracking-widest text-sm transition-all border-2 flex items-center justify-center gap-3 ${!hasAtLeastOneImage || isProcessing
                                    ? 'border-studio-700 text-gray-600 cursor-not-allowed bg-transparent'
                                    : 'border-studio-accent text-studio-accent hover:bg-studio-accent hover:text-white bg-studio-accent/5 shadow-[0_0_30px_-10px_rgba(139,92,246,0.3)]'
                                }`}
                        >
                            <span className="text-2xl">🛍️</span>
                            <div>
                                <div>Generate 5 EC Multi-Shots</div>
                                <div className="text-[9px] font-normal opacity-70 normal-case tracking-normal">Front, Back, Bust-Up, Lower, Side (Consistent Identity)</div>
                            </div>
                        </button>
                    )}

                    <button
                        onClick={onGenerate}
                        disabled={!hasAtLeastOneImage || isProcessing}
                        className={`w-full py-6 rounded-xl font-bold uppercase tracking-[0.2em] text-sm transition-all flex items-center justify-center gap-3 ${!hasAtLeastOneImage || isProcessing
                                ? 'bg-studio-700 text-gray-500 cursor-not-allowed'
                                : 'bg-white text-black hover:bg-studio-accent hover:text-white shadow-2xl hover:shadow-studio-accent/40'
                            }`}
                    >
                        {isProcessing ? (
                            <>
                                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                {genState.status === 'analyzing' ? 'Analyzing Pieces...' : 'Rendering Shot...'}
                            </>
                        ) : (
                            <>
                                <span className="text-2xl">📸</span>
                                Generate Professional Shot
                            </>
                        )}
                    </button>
                </div>

                {/* Error Display */}
                {genState.error && (
                    <div className="mt-4 text-xs text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-900/50 flex items-start gap-2">
                        <span>⚠️</span>
                        {genState.error}
                    </div>
                )}

            </div>
        </div>
    );
};
