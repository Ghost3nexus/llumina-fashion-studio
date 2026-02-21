import React, { useRef, useState } from 'react';

interface OutputStepProps {
    selectedPurposes: Set<string>;
    onTogglePurpose: (purpose: string) => void;
    resolution: 'STD' | 'HD' | 'MAX';
    onResolutionChange: (r: 'STD' | 'HD' | 'MAX') => void;
    ecViews: Set<string>;
    onToggleEcView: (view: string) => void;
    // Campaign style reference image
    campaignRefImage: string | null;
    onCampaignRefImageChange: (b64: string | null) => void;
}

const EC_VIEWS = [
    { key: 'ec_front', label: '正面 Front', icon: '⬜', desc: '頭〜足の全身正面' },
    { key: 'ec_back', label: '背面 Back', icon: '⬛', desc: '全身背面ビュー' },
    { key: 'ec_side', label: '横 Side / 3Q', icon: '◧', desc: '3/4ターン横向き' },
    { key: 'ec_top', label: 'バストアップ', icon: '🔼', desc: '上半身クローズアップ' },
    { key: 'ec_bottom', label: 'ボトム詳細', icon: '🔽', desc: '下半身・足元の詳細' },
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
    campaignRefImage,
    onCampaignRefImageChange,
}) => {
    const [ecExpanded, setEcExpanded] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isEcSelected = selectedPurposes.has('ec');
    const isAdsSelected = selectedPurposes.has('ads');
    const isIgSelected = selectedPurposes.has('instagram');
    const selectedViewCount = ecViews.size;

    const totalOutputs = (isEcSelected ? selectedViewCount : 0)
        + (isIgSelected ? 1 : 0)
        + (isAdsSelected ? 1 : 0);

    const handleRefImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') onCampaignRefImageChange(reader.result);
        };
        reader.readAsDataURL(file);
        // Reset input so same file can be re-selected
        e.target.value = '';
    };

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

            {/* ── Instagram ─────────────────────────────────────────────── */}
            <button
                onClick={() => onTogglePurpose('instagram')}
                className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200
                    ${isIgSelected
                        ? 'border-violet-500/60 bg-violet-500/10'
                        : 'border-zinc-700/50 bg-zinc-800/30 hover:bg-zinc-800/50 hover:border-zinc-600'
                    }`}
            >
                <div className="flex items-center gap-3">
                    <span className="text-xl w-8 text-center flex-shrink-0">📱</span>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white">Instagram</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-700/60 text-zinc-400">1:1</span>
                        </div>
                        <div className="text-[10px] text-zinc-400 mt-0.5">Square crop, vibrant colors, social media ready.</div>
                    </div>
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all
                        ${isIgSelected ? 'bg-violet-500 border-violet-500 text-white' : 'border-zinc-600 text-transparent'}`}>
                        {isIgSelected && <span className="text-[10px]">✓</span>}
                    </div>
                </div>
            </button>

            {/* ── Ads / Campaign (expandable with style ref upload) ─────── */}
            <div className={`rounded-xl border transition-all duration-200 overflow-hidden
                ${isAdsSelected ? 'border-violet-500/60 bg-violet-500/10' : 'border-zinc-700/50 bg-zinc-800/30'}`}>

                {/* Header row */}
                <div
                    className="flex items-center gap-3 p-3.5 cursor-pointer"
                    onClick={() => onTogglePurpose('ads')}
                >
                    <span className="text-xl w-8 text-center flex-shrink-0">📺</span>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white">Ads / Campaign</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-700/60 text-zinc-400">16:9</span>
                            {campaignRefImage && isAdsSelected && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-300">
                                    Ref image set
                                </span>
                            )}
                        </div>
                        <div className="text-[10px] text-zinc-400 mt-0.5">Wide format, cinematic quality for advertising.</div>
                    </div>
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all
                        ${isAdsSelected ? 'bg-violet-500 border-violet-500 text-white' : 'border-zinc-600 text-transparent'}`}>
                        {isAdsSelected && <span className="text-[10px]">✓</span>}
                    </div>
                </div>

                {/* Style reference upload (shown when ads selected) */}
                {isAdsSelected && (
                    <div className="px-3.5 pb-3.5 border-t border-zinc-700/40 pt-3">
                        <p className="text-[9px] text-amber-300/80 uppercase tracking-wider mb-2 font-semibold">
                            Style Reference (optional)
                        </p>
                        <p className="text-[10px] text-zinc-500 mb-2.5 leading-relaxed">
                            参考にしたいキャンペーン画像をアップロード。ライティング・構図・色調を模倣して生成します。
                        </p>

                        {campaignRefImage ? (
                            /* Preview + clear */
                            <div className="relative rounded-lg overflow-hidden border border-amber-500/30 bg-zinc-800/50">
                                <img
                                    src={campaignRefImage}
                                    alt="Campaign style reference"
                                    className="w-full h-28 object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                <div className="absolute bottom-0 left-0 right-0 p-2 flex items-center justify-between">
                                    <span className="text-[9px] text-amber-300 font-semibold">Style Ref Active</span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onCampaignRefImageChange(null); }}
                                        className="text-[10px] px-2 py-0.5 rounded bg-zinc-900/80 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                                    >
                                        × Remove
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Upload slot */
                            <button
                                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                                className="w-full h-20 rounded-lg border border-dashed border-zinc-600 bg-zinc-800/30
                                    hover:border-amber-500/50 hover:bg-amber-500/5 transition-all
                                    flex flex-col items-center justify-center gap-1.5 text-zinc-500 hover:text-zinc-300"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-[10px]">参考キャンペーン画像をアップロード</span>
                                <span className="text-[9px] text-zinc-600">JPG / PNG / WEBP</span>
                            </button>
                        )}

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleRefImageChange}
                        />
                    </div>
                )}
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
                        {isIgSelected && (
                            <div className="flex items-center justify-between text-[11px]">
                                <span className="text-zinc-300">📱 Instagram</span>
                                <span className="text-zinc-500">1:1 · {resolution}</span>
                            </div>
                        )}
                        {isAdsSelected && (
                            <div className="flex items-center justify-between text-[11px]">
                                <span className="text-zinc-300">
                                    📺 Ads / Campaign
                                    {campaignRefImage && <span className="text-amber-400 ml-1">+ style ref</span>}
                                </span>
                                <span className="text-zinc-500">16:9 · {resolution}</span>
                            </div>
                        )}
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
