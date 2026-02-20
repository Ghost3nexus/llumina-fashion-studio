import React, { useState } from 'react';

interface OutputStepProps {
    selectedPurposes: Set<string>;
    onTogglePurpose: (purpose: string) => void;
    resolution: 'STD' | 'HD' | 'MAX';
    onResolutionChange: (r: 'STD' | 'HD' | 'MAX') => void;
    ecViews: Set<string>;
    onToggleEcView: (view: string) => void;
}

const EC_VIEWS = [
    { key: 'ec_front', label: '正面 Front', icon: '⬜', desc: '頭〜足の全身正面' },
    { key: 'ec_back', label: '背面 Back', icon: '⬛', desc: '全身背面ビュー' },
    { key: 'ec_side', label: '横 Side / 3Q', icon: '◧', desc: '3/4ターン横向き' },
    { key: 'ec_top', label: 'バストアップ', icon: '🔼', desc: '上半身クローズアップ' },
    { key: 'ec_bottom', label: 'ボトム詳細', icon: '🔽', desc: '下半身・足元の詳細' },
];

const OUTPUT_PURPOSES = [
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
    ecViews,
    onToggleEcView,
}) => {
    const [ecExpanded, setEcExpanded] = useState(true);
    const isEcSelected = selectedPurposes.has('ec');
    const selectedViewCount = ecViews.size;

    // Total output count: ec views + other purposes
    const totalOutputs = (isEcSelected ? selectedViewCount : 0)
        + Array.from(selectedPurposes).filter(p => p !== 'ec').length;

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-sm font-semibold text-white mb-1">Output Preset</h3>
                <p className="text-[11px] text-zinc-400">
                    Select one or more output formats. Each generates a tailored result.
                </p>
            </div>

            {/* ── EC Product (expandable view picker) ───────────────────── */}
            <div className={`rounded-xl border transition-all duration-200 overflow-hidden
                ${isEcSelected ? 'border-violet-500/60 bg-violet-500/10' : 'border-zinc-700/50 bg-zinc-800/30'}`}>

                {/* Header row */}
                <div
                    className="flex items-center gap-3 p-3.5 cursor-pointer"
                    onClick={() => onTogglePurpose('ec')}
                >
                    <span className="text-xl w-8 text-center flex-shrink-0">🛒</span>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white">EC Product</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-700/60 text-zinc-400">3:4</span>
                            {isEcSelected && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/30 text-violet-300">
                                    {selectedViewCount} view{selectedViewCount !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                        <div className="text-[10px] text-zinc-400 mt-0.5">
                            Front / Back / Side / Detail — EC専用マルチビュー
                        </div>
                    </div>

                    {/* Expand toggle (only when selected) */}
                    {isEcSelected && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setEcExpanded(v => !v); }}
                            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700/50 transition-colors mr-1"
                            title="ビュー選択を展開"
                        >
                            <svg
                                className={`w-3.5 h-3.5 transition-transform ${ecExpanded ? '' : '-rotate-90'}`}
                                fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    )}

                    {/* Check mark */}
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all
                        ${isEcSelected ? 'bg-violet-500 border-violet-500 text-white' : 'border-zinc-600 text-transparent'}`}>
                        {isEcSelected && <span className="text-[10px]">✓</span>}
                    </div>
                </div>

                {/* View picker (shown when selected + expanded) */}
                {isEcSelected && ecExpanded && (
                    <div className="px-3.5 pb-3 border-t border-zinc-700/40 pt-2.5 space-y-1">
                        <p className="text-[9px] text-violet-300/80 uppercase tracking-wider mb-2 font-semibold">
                            📸 撮影アングルを選択
                        </p>
                        {EC_VIEWS.map((view) => {
                            const isViewSelected = ecViews.has(view.key);
                            return (
                                <button
                                    key={view.key}
                                    onClick={() => onToggleEcView(view.key)}
                                    className={`w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all
                                        ${isViewSelected
                                            ? 'bg-violet-500/20 border border-violet-500/40'
                                            : 'bg-zinc-800/40 border border-transparent hover:border-zinc-600/50 hover:bg-zinc-700/30'
                                        }`}
                                >
                                    <span className="text-sm w-5 text-center">{view.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[11px] font-semibold text-white leading-none">{view.label}</div>
                                        <div className="text-[9px] text-zinc-500 mt-0.5">{view.desc}</div>
                                    </div>
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all
                                        ${isViewSelected ? 'bg-violet-500 border-violet-500' : 'border-zinc-600'}`}>
                                        {isViewSelected && <span className="text-[8px] text-white">✓</span>}
                                    </div>
                                </button>
                            );
                        })}
                        {ecViews.size === 0 && (
                            <p className="text-[10px] text-amber-400/80 text-center py-1">
                                ⚠ 少なくとも1つのビューを選択してください
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* ── Instagram / Ads ───────────────────────────────────────── */}
            <div className="space-y-2">
                {OUTPUT_PURPOSES.map((op) => {
                    const isSelected = selectedPurposes.has(op.key);
                    return (
                        <button
                            key={op.key}
                            onClick={() => onTogglePurpose(op.key)}
                            className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200
                                ${isSelected
                                    ? 'border-violet-500/60 bg-violet-500/10'
                                    : 'border-zinc-700/50 bg-zinc-800/30 hover:bg-zinc-800/50 hover:border-zinc-600'
                                }`}
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
                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all
                                    ${isSelected ? 'bg-violet-500 border-violet-500 text-white' : 'border-zinc-600 text-transparent'}`}>
                                    {isSelected && <span className="text-[10px]">✓</span>}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* ── Resolution ───────────────────────────────────────────── */}
            <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 block">Resolution</label>
                <div className="grid grid-cols-3 gap-2">
                    {RESOLUTIONS.map((r) => (
                        <button
                            key={r.value}
                            onClick={() => onResolutionChange(r.value)}
                            className={`py-3 rounded-xl text-center transition-all
                                ${resolution === r.value
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

            {/* ── Output Summary ────────────────────────────────────────── */}
            {totalOutputs > 0 && (
                <div className="p-3 rounded-xl bg-zinc-800/40 border border-zinc-700/30">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 font-semibold">
                        Output Summary
                    </div>
                    <div className="space-y-1">
                        {isEcSelected && Array.from(ecViews).map((viewKey) => {
                            const view = EC_VIEWS.find(v => v.key === viewKey);
                            return view ? (
                                <div key={viewKey} className="flex items-center justify-between text-[11px]">
                                    <span className="text-zinc-300">🛒 {view.label}</span>
                                    <span className="text-zinc-500">3:4 · {resolution}</span>
                                </div>
                            ) : null;
                        })}
                        {Array.from(selectedPurposes).filter(p => p !== 'ec').map((key) => {
                            const op = OUTPUT_PURPOSES.find(o => o.key === key);
                            return op ? (
                                <div key={key} className="flex items-center justify-between text-[11px]">
                                    <span className="text-zinc-300">{op.icon} {op.label}</span>
                                    <span className="text-zinc-500">{op.aspectRatio} · {resolution}</span>
                                </div>
                            ) : null;
                        })}
                    </div>
                    <div className="text-[10px] text-violet-400/80 mt-2 pt-2 border-t border-zinc-700/30">
                        {totalOutputs} output{totalOutputs !== 1 ? 's' : ''} will be generated
                    </div>
                </div>
            )}

            {totalOutputs === 0 && (
                <div className="text-[10px] text-amber-400/80 text-center py-2">
                    ⚠ Select at least one output format
                </div>
            )}
        </div>
    );
};
