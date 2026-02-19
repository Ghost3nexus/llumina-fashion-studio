import React from 'react';
import { PreviewResult } from '../../services/luminaApi';

interface BatchQueuePanelProps {
    results: PreviewResult[];
    status: 'idle' | 'generating' | 'complete' | 'error';
    onDownload: (result: PreviewResult) => void;
}

export const BatchQueuePanel: React.FC<BatchQueuePanelProps> = ({
    results,
    status,
    onDownload,
}) => {
    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-4 pt-5 pb-3">
                <h2 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Generation Queue</h2>
            </div>

            {/* Queue items */}
            <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-4">
                {results.length === 0 && status === 'idle' && (
                    <div className="text-center py-12">
                        <div className="text-3xl mb-3 opacity-30">📋</div>
                        <p className="text-[11px] text-zinc-500">
                            No generations yet.
                        </p>
                        <p className="text-[10px] text-zinc-600 mt-1">
                            Results will appear here after generation.
                        </p>
                    </div>
                )}

                {status === 'generating' && results.length === 0 && (
                    <div className="text-center py-8">
                        <div className="w-8 h-8 mx-auto border-2 border-violet-500/30 border-t-violet-500 rounded-full mb-3" style={{ animation: 'spin 1s linear infinite' }} />
                        <p className="text-[11px] text-zinc-400">Processing...</p>
                        <style>{`
              @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
                    </div>
                )}

                {results.map((result, i) => (
                    <div
                        key={result.id}
                        className="group flex gap-3 p-2.5 rounded-xl bg-zinc-800/30 border border-zinc-700/30 hover:bg-zinc-800/50 transition-all"
                        style={{
                            animation: 'slideIn 0.3s ease-out',
                            animationDelay: `${i * 100}ms`,
                            animationFillMode: 'both',
                        }}
                    >
                        {/* Thumbnail */}
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-black flex-shrink-0">
                            <img
                                src={result.imageUrl}
                                alt={result.label}
                                className="w-full h-full object-cover"
                            />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <div className="text-[11px] font-semibold text-white truncate">{result.label}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[9px] text-zinc-500">{result.aspectRatio}</span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${result.status === 'complete'
                                        ? 'bg-emerald-500/10 text-emerald-400'
                                        : 'bg-red-500/10 text-red-400'
                                    }`}>
                                    {result.status === 'complete' ? '✓ Done' : '✕ Error'}
                                </span>
                            </div>
                        </div>

                        {/* Download */}
                        <button
                            onClick={() => onDownload(result)}
                            className="self-center p-1.5 rounded-lg bg-zinc-700/50 text-zinc-400 hover:text-white hover:bg-zinc-600 transition-all opacity-0 group-hover:opacity-100"
                            title="Download"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        </button>
                    </div>
                ))}
            </div>

            {/* Summary footer */}
            {results.length > 0 && (
                <div className="flex-shrink-0 px-4 py-3 border-t border-zinc-800">
                    <div className="text-[10px] text-zinc-500 text-center">
                        {results.filter(r => r.status === 'complete').length} / {results.length} complete
                    </div>
                </div>
            )}

            <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(10px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
        </div>
    );
};
