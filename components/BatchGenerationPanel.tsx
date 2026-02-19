import React from 'react';
import { BatchShotResult } from '../services/geminiService';

interface BatchGenerationPanelProps {
    status: 'idle' | 'generating' | 'complete' | 'error';
    currentShot: number;
    totalShots: number;
    results: BatchShotResult[];
    selectedIndex: number | null;
    onSelectShot: (index: number) => void;
    onDownloadAll: () => void;
    onDownloadSingle: (result: BatchShotResult) => void;
    error?: string;
}

const SHOT_ICONS: Record<string, string> = {
    'Front': '👤',
    'Back': '🔙',
    'Bust-Up': '👆',
    'Lower Body': '👇',
    'Side': '↔️',
};

export const BatchGenerationPanel: React.FC<BatchGenerationPanelProps> = ({
    status,
    currentShot,
    totalShots,
    results,
    selectedIndex,
    onSelectShot,
    onDownloadAll,
    onDownloadSingle,
    error
}) => {
    if (status === 'idle') return null;

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-studio-accent">
                        🛍️ EC Batch Generation
                    </span>
                    <span className="text-[9px] text-gray-500">
                        {status === 'generating' ? `${currentShot}/${totalShots}` : status === 'complete' ? `${totalShots}/${totalShots} Complete` : ''}
                    </span>
                </div>
                {status === 'complete' && (
                    <button
                        onClick={onDownloadAll}
                        className="text-[9px] uppercase font-bold text-studio-accent hover:text-white transition-colors flex items-center gap-1"
                    >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Download All
                    </button>
                )}
            </div>

            {/* Progress Steps */}
            <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: totalShots }).map((_, i) => {
                    const isComplete = i < results.length;
                    const isCurrent = status === 'generating' && i === currentShot - 1;
                    const label = ['Front', 'Back', 'Bust-Up', 'Lower Body', 'Side'][i];
                    return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <div
                                className={`w-full h-1.5 rounded-full transition-all ${isComplete
                                        ? 'bg-green-500'
                                        : isCurrent
                                            ? 'bg-studio-accent animate-pulse'
                                            : 'bg-studio-700'
                                    }`}
                            />
                            <span className={`text-[7px] uppercase tracking-wider font-medium ${isComplete ? 'text-green-400' : isCurrent ? 'text-studio-accent' : 'text-gray-600'
                                }`}>
                                {label}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Error Display */}
            {error && (
                <div className="mb-4 text-[10px] text-red-400 bg-red-900/10 p-2 rounded border border-red-900/30">
                    {error}
                </div>
            )}

            {/* Main Preview */}
            {selectedIndex !== null && results[selectedIndex] && (
                <div className="flex-1 rounded-2xl overflow-hidden border border-studio-accent/20 shadow-[0_0_50px_-12px_rgba(139,92,246,0.3)] bg-black relative mb-3 min-h-0">
                    <img
                        src={results[selectedIndex].imageUrl}
                        alt={results[selectedIndex].label}
                        className="w-full h-full object-contain"
                    />
                    <div className="absolute top-3 left-3 flex gap-2">
                        <span className="px-2.5 py-1 bg-black/60 rounded-full text-[9px] uppercase font-bold text-white/80 backdrop-blur-md tracking-wider">
                            {SHOT_ICONS[results[selectedIndex].label]} {results[selectedIndex].label}
                        </span>
                    </div>
                </div>
            )}

            {/* Generating Animation */}
            {status === 'generating' && selectedIndex === null && results.length === 0 && (
                <div className="flex-1 rounded-2xl border border-studio-700 bg-studio-800 flex items-center justify-center mb-3">
                    <div className="text-center p-8">
                        <div className="relative inline-block mb-4">
                            <div className="absolute inset-0 bg-studio-accent/20 rounded-full blur-2xl animate-pulse" />
                            <div className="relative text-5xl">📸</div>
                        </div>
                        <h3 className="text-lg font-light tracking-[0.2em] text-white mb-2">
                            GENERATING
                        </h3>
                        <p className="text-xs text-gray-400">
                            Shot {currentShot} of {totalShots}: {['Front', 'Back', 'Bust-Up', 'Lower Body', 'Side'][currentShot - 1]}
                        </p>
                    </div>
                </div>
            )}

            {/* Thumbnails Grid */}
            <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: totalShots }).map((_, i) => {
                    const result = results[i];
                    const isSelected = selectedIndex === i;
                    const isCurrent = status === 'generating' && i === currentShot - 1;
                    const label = ['Front', 'Back', 'Bust-Up', 'Lower', 'Side'][i];

                    return (
                        <button
                            key={i}
                            onClick={() => result && onSelectShot(i)}
                            disabled={!result}
                            className={`relative aspect-[3/4] rounded-lg overflow-hidden transition-all border-2 ${isSelected
                                    ? 'border-studio-accent shadow-lg shadow-studio-accent/20'
                                    : result
                                        ? 'border-studio-700 hover:border-studio-600 cursor-pointer'
                                        : isCurrent
                                            ? 'border-studio-accent/30 animate-pulse'
                                            : 'border-studio-700/50 opacity-40'
                                }`}
                        >
                            {result ? (
                                <>
                                    <img src={result.imageUrl} alt={result.label} className="w-full h-full object-cover" />
                                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-1 py-0.5">
                                        <span className="text-[7px] font-bold text-white uppercase">{label}</span>
                                    </div>
                                    {isSelected && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onDownloadSingle(result); }}
                                            className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center hover:bg-studio-accent transition-colors"
                                        >
                                            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                        </button>
                                    )}
                                </>
                            ) : (
                                <div className="w-full h-full bg-studio-900 flex flex-col items-center justify-center gap-1">
                                    <span className="text-lg">{SHOT_ICONS[['Front', 'Back', 'Bust-Up', 'Lower Body', 'Side'][i]]}</span>
                                    <span className="text-[7px] text-gray-500 uppercase font-bold">{label}</span>
                                    {isCurrent && (
                                        <div className="w-3 h-3 border border-studio-accent border-t-transparent rounded-full animate-spin mt-1" />
                                    )}
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
