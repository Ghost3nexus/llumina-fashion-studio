import React from 'react';

interface BottomActionBarProps {
    onGenerate: () => void;
    isGenerating: boolean;
    canGenerate: boolean;
    outputCount: number;
    isComplete?: boolean;
    isConfirmingHD?: boolean;
    onConfirmHD?: () => void;
}

export const BottomActionBar: React.FC<BottomActionBarProps> = ({
    onGenerate,
    isGenerating,
    canGenerate,
    outputCount,
    isComplete = false,
    isConfirmingHD = false,
    onConfirmHD,
}) => {
    return (
        <div className="bg-zinc-900 border-t border-zinc-800 px-6 py-3 flex items-center gap-3">
            {/* Status */}
            <div className="flex-1 min-w-0">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
                    {isConfirmingHD
                        ? 'Exporting HD...'
                        : isGenerating
                            ? 'Generating...'
                            : isComplete
                                ? `${outputCount} output${outputCount !== 1 ? 's' : ''} ready`
                                : canGenerate
                                    ? `${outputCount} output${outputCount !== 1 ? 's' : ''} ready`
                                    : 'Configure your shoot to begin'
                    }
                </div>
            </div>

            {/* Generate Preview CTA */}
            <button
                onClick={onGenerate}
                disabled={!canGenerate || isGenerating || isConfirmingHD}
                className={`
          px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider
          transition-all duration-200 flex items-center gap-2
          ${canGenerate && !isGenerating && !isConfirmingHD
                        ? 'bg-violet-600 text-white hover:bg-violet-500 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30'
                        : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                    }
        `}
            >
                {isGenerating ? (
                    <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full" style={{ animation: 'spin 0.8s linear infinite' }} />
                        Generating…
                    </>
                ) : (
                    <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Generate Preview{outputCount > 0 ? ` (${outputCount})` : ''}
                    </>
                )}
            </button>

            {/* CONFIRM IN HD CTA — enabled only when generation is complete */}
            <button
                onClick={onConfirmHD}
                disabled={!isComplete || isGenerating || isConfirmingHD}
                className={`
          px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider
          transition-all duration-200 flex items-center gap-2
          border
          ${isComplete && !isGenerating && !isConfirmingHD
                        ? 'bg-white text-black border-white hover:bg-zinc-100 shadow-lg shadow-white/10'
                        : 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed'
                    }
        `}
                title={isComplete ? '全出力をHD品質で再生成してダウンロード' : '先にGenerate Previewを実行してください'}
            >
                {isConfirmingHD ? (
                    <>
                        <div className="w-3.5 h-3.5 border-2 border-zinc-400/30 border-t-zinc-400 rounded-full" style={{ animation: 'spin 0.8s linear infinite' }} />
                        Exporting HD…
                    </>
                ) : (
                    <>
                        {isComplete && (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                        Confirm in HD
                    </>
                )}
            </button>

            <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
        </div>
    );
};
