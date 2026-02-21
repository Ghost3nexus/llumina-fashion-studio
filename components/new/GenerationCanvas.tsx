import React, { useState } from 'react';
import { PreviewResult } from '../../services/luminaApi';

interface GenerationCanvasProps {
    results: PreviewResult[];
    status: 'idle' | 'generating' | 'complete' | 'error';
    error?: string;
    onDownload: (result: PreviewResult) => void;
    onRegenerate: () => void;
    onEdit: (resultId: string, instruction: string) => void;
    onSnsTransform?: (result: PreviewResult) => void;
    editingId?: string | null; // which card is being AI-edited right now
}

export const GenerationCanvas: React.FC<GenerationCanvasProps> = ({
    results,
    status,
    error,
    onDownload,
    onRegenerate,
    onEdit,
    onSnsTransform,
    editingId,
}) => {
    // Per-card instruction input state
    const [openEditId, setOpenEditId] = useState<string | null>(null);
    const [instructions, setInstructions] = useState<Record<string, string>>({});

    const handleEditSubmit = (resultId: string) => {
        const instruction = (instructions[resultId] || '').trim();
        if (!instruction) return;
        onEdit(resultId, instruction);
        setOpenEditId(null);
        setInstructions(prev => ({ ...prev, [resultId]: '' }));
    };

    // Loading state
    if (status === 'generating') {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                    <div className="relative w-16 h-16 mx-auto">
                        <div
                            className="absolute inset-0 rounded-full border-2 border-violet-500/30"
                            style={{ animation: 'spin 2s linear infinite' }}
                        />
                        <div
                            className="absolute inset-1 rounded-full border-2 border-transparent border-t-violet-500"
                            style={{ animation: 'spin 1s linear infinite' }}
                        />
                        <div
                            className="absolute inset-3 rounded-full border-2 border-transparent border-t-violet-400"
                            style={{ animation: 'spin 1.5s linear infinite reverse' }}
                        />
                    </div>
                    <div>
                        <p className="text-sm text-white font-medium">Generating Preview</p>
                        <p className="text-[11px] text-zinc-500 mt-1">Creating your outputs...</p>
                    </div>
                </div>
                <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
            </div>
        );
    }

    // Error state
    if (status === 'error') {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-3 max-w-sm">
                    <div className="text-4xl">⚠️</div>
                    <p className="text-sm text-red-400 font-medium">Generation Failed</p>
                    <p className="text-[11px] text-zinc-400">{error || 'An unknown error occurred.'}</p>
                    <button
                        onClick={onRegenerate}
                        className="px-4 py-2 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-500 transition-all"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    // Results
    if (status === 'complete' && results.length > 0) {
        return (
            <div className="flex flex-col h-full p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-white">Preview Results</h2>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                        {results.length} output{results.length > 1 ? 's' : ''}
                    </span>
                </div>

                <div className={`flex-1 grid gap-4 min-h-0 ${results.length === 1
                    ? 'grid-cols-1'
                    : results.length === 2
                        ? 'grid-cols-2'
                        : 'grid-cols-3'
                    }`}>
                    {results.map((result) => {
                        const isEditOpen = openEditId === result.id;
                        const isBeingEdited = editingId === result.id;
                        return (
                            <div
                                key={result.id}
                                className="flex flex-col rounded-2xl overflow-hidden border border-zinc-700/50 bg-zinc-900/50"
                                style={{ animation: 'canvasFadeIn 0.5s ease-out' }}
                            >
                                {/* Image */}
                                <div className="flex-1 relative overflow-hidden bg-black min-h-0">
                                    <img
                                        src={result.imageUrl}
                                        alt={result.label}
                                        className="w-full h-full object-contain"
                                        style={isBeingEdited ? { opacity: 0.4, filter: 'blur(1px)' } : {}}
                                    />

                                    {/* AI editing overlay */}
                                    {isBeingEdited && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="text-center space-y-2">
                                                <div className="relative w-10 h-10 mx-auto">
                                                    <div className="absolute inset-0 rounded-full border-2 border-violet-500/40"
                                                        style={{ animation: 'spin 2s linear infinite' }} />
                                                    <div className="absolute inset-1 rounded-full border-2 border-transparent border-t-violet-400"
                                                        style={{ animation: 'spin 1s linear infinite' }} />
                                                </div>
                                                <p className="text-[10px] text-violet-300 font-medium">AI Editing...</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Badges */}
                                    <div className="absolute top-3 left-3">
                                        <span className="px-2 py-1 bg-black/70 backdrop-blur-sm rounded-lg text-[9px] font-bold uppercase tracking-wider text-white/80">
                                            {result.label}
                                        </span>
                                    </div>
                                    <div className="absolute top-3 right-3">
                                        <span className="px-2 py-1 bg-black/70 backdrop-blur-sm rounded-lg text-[9px] text-zinc-400">
                                            {result.aspectRatio}
                                        </span>
                                    </div>
                                </div>

                                {/* Inline EDIT form */}
                                {isEditOpen && !isBeingEdited && (
                                    <div className="flex-shrink-0 px-2 py-2 bg-zinc-800 border-t border-zinc-700/50 space-y-1.5">
                                        <p className="text-[9px] text-zinc-400 uppercase tracking-wider">✏️ 編集指示</p>
                                        <input
                                            type="text"
                                            value={instructions[result.id] || ''}
                                            onChange={(e) => setInstructions(prev => ({ ...prev, [result.id]: e.target.value }))}
                                            onKeyDown={(e) => e.key === 'Enter' && handleEditSubmit(result.id)}
                                            placeholder="例: 背景を白無地に変更して"
                                            autoFocus
                                            className="w-full bg-zinc-900 border border-zinc-600 rounded-lg px-3 py-1.5 text-[11px] text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
                                        />
                                        <div className="flex gap-1.5">
                                            <button
                                                onClick={() => setOpenEditId(null)}
                                                className="flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase text-zinc-400 bg-zinc-700 hover:bg-zinc-600 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => handleEditSubmit(result.id)}
                                                disabled={!(instructions[result.id] || '').trim()}
                                                className="flex-2 py-1.5 px-3 rounded-lg text-[9px] font-bold uppercase text-white bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:text-zinc-500 transition-colors"
                                            >
                                                Apply Edit
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Action bar */}
                                <div className="flex-shrink-0 p-2 flex gap-1.5 bg-zinc-800/50">
                                    <button
                                        onClick={() => onDownload(result)}
                                        disabled={isBeingEdited}
                                        className="flex-1 py-2 bg-white text-black rounded-lg font-bold text-[9px] uppercase tracking-wider hover:bg-violet-400 hover:text-white disabled:opacity-40 transition-colors flex items-center justify-center gap-1"
                                    >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        Download
                                    </button>
                                    <button
                                        onClick={() => setOpenEditId(isEditOpen ? null : result.id)}
                                        disabled={isBeingEdited}
                                        className={`py-2 px-3 rounded-lg font-bold text-[9px] uppercase tracking-wider transition-colors disabled:opacity-40 ${isEditOpen
                                            ? 'bg-violet-600 text-white'
                                            : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                                            }`}
                                        title="テキスト指示で AI 編集"
                                    >
                                        Edit
                                    </button>
                                    {onSnsTransform && (
                                        <button
                                            onClick={() => onSnsTransform(result)}
                                            disabled={isBeingEdited}
                                            className="py-2 px-3 bg-gradient-to-r from-pink-600/80 to-violet-600/80 text-white rounded-lg font-bold text-[9px] uppercase tracking-wider hover:from-pink-500 hover:to-violet-500 disabled:opacity-40 transition-all"
                                            title="SNS用スタイル変換"
                                        >
                                            📱 SNS
                                        </button>
                                    )}
                                    <button
                                        onClick={onRegenerate}
                                        disabled={isBeingEdited}
                                        className="py-2 px-3 bg-zinc-700 text-zinc-300 rounded-lg font-bold text-[9px] uppercase tracking-wider hover:bg-zinc-600 disabled:opacity-40 transition-colors"
                                        title="Regenerate"
                                    >
                                        ↻
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <style>{`
          @keyframes canvasFadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
            </div>
        );
    }

    // Idle state — Studio Ready
    return (
        <div className="flex items-center justify-center h-full">
            <div className="text-center p-8 max-w-sm">
                <div className="text-6xl mb-6" style={{ animation: 'pulse 3s ease-in-out infinite' }}>📸</div>
                <h2 className="text-lg font-light tracking-[0.2em] text-white mb-3">STUDIO READY</h2>
                <p className="text-[11px] text-zinc-500 leading-relaxed mb-6">
                    Configure your shoot in the workflow panel, then hit Generate Preview.
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-800/50 border border-zinc-700/30">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Awaiting input</span>
                </div>
                <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(0.98); }
          }
        `}</style>
            </div>
        </div>
    );
};
