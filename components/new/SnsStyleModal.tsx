import React, { useState } from 'react';
import { SNS_STYLES, SnsStyleKey } from '../../services/geminiService';

interface SnsStyleModalProps {
    baseImageUrl: string;
    baseLabel: string;
    isGenerating: boolean;
    onGenerate: (styleKey: SnsStyleKey) => void;
    onClose: () => void;
}

export const SnsStyleModal: React.FC<SnsStyleModalProps> = ({
    baseImageUrl,
    baseLabel,
    isGenerating,
    onGenerate,
    onClose,
}) => {
    const [selectedStyle, setSelectedStyle] = useState<SnsStyleKey | null>(null);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            {/* Modal */}
            <div
                className="relative w-full max-w-2xl bg-zinc-900 rounded-2xl border border-zinc-700/60 shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
                style={{ animation: 'snsModalIn 0.25s ease-out' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
                    <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            📱 SNS Style Transform
                        </h3>
                        <p className="text-[10px] text-zinc-500 mt-0.5">
                            「{baseLabel}」をベースにSNS用スタイルに変換
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-5">
                    {/* Base image preview */}
                    <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/30">
                        <img
                            src={baseImageUrl}
                            alt="Base"
                            className="w-16 h-16 object-cover rounded-lg border border-zinc-600"
                        />
                        <div>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">ベース画像</p>
                            <p className="text-[11px] text-white font-semibold">{baseLabel}</p>
                            <p className="text-[9px] text-zinc-500 mt-0.5">
                                衣服・モデルを保持しスタイルのみ変換
                            </p>
                        </div>
                    </div>

                    {/* Style grid */}
                    <div className="grid grid-cols-4 gap-2">
                        {SNS_STYLES.map((style) => {
                            const isSelected = selectedStyle === style.key;
                            return (
                                <button
                                    key={style.key}
                                    onClick={() => setSelectedStyle(style.key)}
                                    disabled={isGenerating}
                                    className={`p-3 rounded-xl border transition-all duration-200 text-left
                                        ${isSelected
                                            ? 'border-violet-500/70 bg-violet-500/15 ring-1 ring-violet-500/30'
                                            : 'border-zinc-700/50 bg-zinc-800/40 hover:bg-zinc-800/70 hover:border-zinc-600'
                                        }
                                        ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                    `}
                                >
                                    <span className="text-2xl block mb-1.5">{style.icon}</span>
                                    <span className="text-[10px] font-bold text-white block leading-tight">
                                        {style.label}
                                    </span>
                                    <span className="text-[9px] text-zinc-500 block mt-0.5">
                                        {style.labelJa}
                                    </span>
                                    {isSelected && (
                                        <span className="text-[8px] text-violet-400 mt-1 block font-semibold">
                                            ✓ 選択中
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-zinc-800 flex items-center justify-between">
                    <button
                        onClick={onClose}
                        disabled={isGenerating}
                        className="px-4 py-2 text-[11px] text-zinc-400 font-semibold hover:text-white transition-colors disabled:opacity-40"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => selectedStyle && onGenerate(selectedStyle)}
                        disabled={!selectedStyle || isGenerating}
                        className="px-6 py-2.5 bg-violet-600 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider
                            hover:bg-violet-500 disabled:bg-zinc-700 disabled:text-zinc-500 transition-all
                            flex items-center gap-2"
                    >
                        {isGenerating ? (
                            <>
                                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full"
                                    style={{ animation: 'spin 0.8s linear infinite' }} />
                                Generating...
                            </>
                        ) : (
                            <>
                                ⚡ Generate SNS Image
                            </>
                        )}
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes snsModalIn {
                    from { opacity: 0; transform: scale(0.95) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};
