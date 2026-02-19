import React from 'react';

interface OutputStepProps {
    selectedPurposes: Set<string>;
    onTogglePurpose: (purpose: string) => void;
    resolution: 'STD' | 'HD' | 'MAX';
    onResolutionChange: (r: 'STD' | 'HD' | 'MAX') => void;
}

const OUTPUT_PURPOSES = [
    {
        key: 'ec',
        label: 'EC Product',
        description: 'White BG, full body, optimized for e-commerce product pages.',
        aspectRatio: '3:4',
        icon: '🛒',
    },
    {
        key: 'instagram',
        label: 'Instagram',
        description: 'Square crop, vibrant colors, social media ready.',
        aspectRatio: '1:1',
        icon: '📱',
    },
    {
        key: 'ads',
        label: 'Ads / Campaign',
        description: 'Wide format, cinematic quality for advertising.',
        aspectRatio: '16:9',
        icon: '📺',
    },
];

const RESOLUTIONS: { value: 'STD' | 'HD' | 'MAX'; label: string; detail: string }[] = [
    { value: 'STD', label: 'STD', detail: '1× Preview' },
    { value: 'HD', label: 'HD', detail: '2× Quality' },
    { value: 'MAX', label: 'MAX', detail: '4× Production' },
];

export const OutputStep: React.FC<OutputStepProps> = ({
    selectedPurposes,
    onTogglePurpose,
    resolution,
    onResolutionChange,
}) => {
    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-sm font-semibold text-white mb-1">Output Preset</h3>
                <p className="text-[11px] text-zinc-400">
                    Select one or more output formats. Each generates a tailored result.
                </p>
            </div>

            {/* Purpose toggles */}
            <div className="space-y-2">
                {OUTPUT_PURPOSES.map((op) => {
                    const isSelected = selectedPurposes.has(op.key);
                    return (
                        <button
                            key={op.key}
                            onClick={() => onTogglePurpose(op.key)}
                            className={`
                w-full text-left p-3.5 rounded-xl border transition-all duration-200
                ${isSelected
                                    ? 'border-violet-500/60 bg-violet-500/10'
                                    : 'border-zinc-700/50 bg-zinc-800/30 hover:bg-zinc-800/50 hover:border-zinc-600'
                                }
              `}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-xl w-8 text-center flex-shrink-0">{op.icon}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-white">{op.label}</span>
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-700/60 text-zinc-400">
                                            {op.aspectRatio}
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-zinc-400 mt-0.5">{op.description}</div>
                                </div>
                                <div
                                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected
                                            ? 'bg-violet-500 border-violet-500 text-white'
                                            : 'border-zinc-600 text-transparent'
                                        }`}
                                >
                                    {isSelected && <span className="text-[10px]">✓</span>}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Resolution */}
            <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 block">Resolution</label>
                <div className="grid grid-cols-3 gap-2">
                    {RESOLUTIONS.map((r) => (
                        <button
                            key={r.value}
                            onClick={() => onResolutionChange(r.value)}
                            className={`py-3 rounded-xl text-center transition-all ${resolution === r.value
                                    ? 'bg-violet-500/15 text-violet-400 border border-violet-500/40'
                                    : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700 hover:border-zinc-500'
                                }`}
                        >
                            <div className="text-sm font-bold">{r.label}</div>
                            <div className="text-[9px] text-zinc-500 mt-0.5">{r.detail}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary */}
            {selectedPurposes.size > 0 && (
                <div className="p-3 rounded-xl bg-zinc-800/40 border border-zinc-700/30">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 font-semibold">Output Summary</div>
                    <div className="space-y-1">
                        {Array.from(selectedPurposes).map((key) => {
                            const op = OUTPUT_PURPOSES.find((o) => o.key === key);
                            return op ? (
                                <div key={key} className="flex items-center justify-between text-[11px]">
                                    <span className="text-zinc-300">{op.icon} {op.label}</span>
                                    <span className="text-zinc-500">{op.aspectRatio} · {resolution}</span>
                                </div>
                            ) : null;
                        })}
                    </div>
                    <div className="text-[10px] text-violet-400/80 mt-2 pt-2 border-t border-zinc-700/30">
                        {selectedPurposes.size} output{selectedPurposes.size > 1 ? 's' : ''} will be generated
                    </div>
                </div>
            )}

            {selectedPurposes.size === 0 && (
                <div className="text-[10px] text-amber-400/80 text-center py-2">
                    ⚠ Select at least one output format
                </div>
            )}
        </div>
    );
};
