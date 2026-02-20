import React, { useRef, useState } from 'react';

interface InputStepProps {
    uploadedImages: Record<string, string | null>;
    onImageUpload: (type: string, file: File) => void;
    onImageClear: (type: string) => void;
    // Alt angle images: itemKey → array of base64
    altImages: Record<string, string[]>;
    onAltImageUpload: (itemKey: string, index: number, file: File) => void;
    onAltImageClear: (itemKey: string, index: number) => void;
}

const GARMENT_CATEGORIES = [
    { key: 'tops', label: 'Top', icon: '👕' },
    { key: 'pants', label: 'Bottom', icon: '👖' },
    { key: 'outer', label: 'Outer', icon: '🧥' },
    { key: 'inner', label: 'Inner', icon: '👔' },
    { key: 'shoes', label: 'Shoes', icon: '👟' },
];

const ALT_ANGLE_SLOTS = [
    { label: '背面 Back', icon: '↩️' },
    { label: '横 Side', icon: '↔️' },
    { label: 'ディテール', icon: '🔍' },
];

// ── Small upload tile ────────────────────────────────────────────────────────
const UploadTile: React.FC<{
    label: string;
    icon: string;
    image: string | null;
    mini?: boolean;
    onUpload: (file: File) => void;
    onClear: () => void;
}> = ({ label, icon, image, mini = false, onUpload, onClear }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div className="relative group">
            <div
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center
                    ${mini ? 'p-2 min-h-[72px]' : 'p-4 min-h-[100px]'}
                    ${image
                        ? 'border-violet-500/50 bg-violet-500/5'
                        : 'border-zinc-700 hover:border-zinc-500 bg-zinc-800/30 hover:bg-zinc-800/50'
                    }`}
            >
                {image ? (
                    <div className="relative w-full">
                        <img src={image} alt={label} className={`mx-auto object-contain rounded ${mini ? 'h-10' : 'h-16'}`} />
                        <div className={`mt-1 font-bold uppercase tracking-wider text-violet-400 ${mini ? 'text-[8px]' : 'text-[9px]'}`}>
                            {label} ✓
                        </div>
                    </div>
                ) : (
                    <div className="text-zinc-500">
                        <span className={`block mb-0.5 ${mini ? 'text-lg' : 'text-2xl'}`}>{image ? '✓' : icon}</span>
                        <p className={`uppercase font-bold tracking-wider ${mini ? 'text-[8px]' : 'text-[10px]'}`}>{label}</p>
                        {!mini && <p className="text-[9px] mt-0.5 opacity-50">Click to upload</p>}
                    </div>
                )}
                <input
                    type="file"
                    ref={inputRef}
                    onChange={(e) => { if (e.target.files?.[0]) onUpload(e.target.files[0]); }}
                    className="hidden"
                    accept="image/*"
                />
            </div>
            {image && (
                <button
                    onClick={(e) => { e.stopPropagation(); onClear(); }}
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                >
                    ×
                </button>
            )}
        </div>
    );
};

// ── Main component ───────────────────────────────────────────────────────────
export const InputStep: React.FC<InputStepProps> = ({
    uploadedImages,
    onImageUpload,
    onImageClear,
    altImages,
    onAltImageUpload,
    onAltImageClear,
}) => {
    const [expandedAlt, setExpandedAlt] = useState<Set<string>>(new Set());
    const uploadCount = GARMENT_CATEGORIES.filter(c => uploadedImages[c.key]).length;

    const toggleExpand = (key: string) => {
        setExpandedAlt(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-sm font-semibold text-white mb-1">Garment Input</h3>
                <p className="text-[11px] text-zinc-400">
                    Upload at least 1 garment image. Add optional extra angles for higher accuracy.
                </p>
            </div>

            <div className="space-y-3">
                {GARMENT_CATEGORIES.map((cat) => {
                    const hasMain = !!uploadedImages[cat.key];
                    const alts = altImages[cat.key] ?? [];
                    const isExpanded = expandedAlt.has(cat.key);
                    const altCount = alts.filter(Boolean).length;

                    return (
                        <div key={cat.key} className={`rounded-xl border transition-all ${hasMain ? 'border-violet-500/30 bg-violet-500/5' : 'border-zinc-700/50 bg-zinc-800/20'}`}>
                            {/* Main image row */}
                            <div className="flex items-center gap-2 p-2">
                                {/* Main upload tile */}
                                <div className="w-[88px] flex-shrink-0">
                                    <UploadTile
                                        label={cat.label}
                                        icon={cat.icon}
                                        image={uploadedImages[cat.key] ?? null}
                                        onUpload={(file) => onImageUpload(cat.key, file)}
                                        onClear={() => onImageClear(cat.key)}
                                    />
                                </div>

                                {/* Alt angle mini thumbnails (collapsed preview) */}
                                <div className="flex-1 min-w-0">
                                    {!isExpanded && altCount > 0 && (
                                        <div className="flex gap-1 mb-1.5">
                                            {alts.map((b64, i) =>
                                                b64 ? (
                                                    <img key={i} src={b64} alt="" className="w-8 h-8 object-contain rounded border border-violet-500/40" />
                                                ) : null
                                            )}
                                        </div>
                                    )}
                                    <button
                                        onClick={() => toggleExpand(cat.key)}
                                        disabled={!hasMain}
                                        className={`flex items-center gap-1.5 text-[10px] font-medium transition-colors
                                            ${hasMain
                                                ? isExpanded
                                                    ? 'text-violet-400'
                                                    : 'text-zinc-400 hover:text-zinc-200'
                                                : 'text-zinc-600 cursor-not-allowed'
                                            }`}
                                    >
                                        <svg className={`w-3 h-3 transition-transform ${isExpanded ? '' : '-rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                        {hasMain
                                            ? `+ アングル追加 (${altCount}/3) — 精度UP`
                                            : `メイン写真を先にアップロード`
                                        }
                                    </button>
                                    {!hasMain && (
                                        <p className="text-[9px] text-zinc-600 mt-0.5">Background / side / detail shots</p>
                                    )}
                                </div>
                            </div>

                            {/* Expanded alt angle slots */}
                            {isExpanded && hasMain && (
                                <div className="px-2 pb-2 border-t border-zinc-700/40 pt-2">
                                    <p className="text-[9px] text-violet-300/70 uppercase tracking-wider mb-1.5 font-semibold">
                                        📸 追加アングル（任意）— 背面・横・ディテール
                                    </p>
                                    <div className="grid grid-cols-3 gap-2">
                                        {ALT_ANGLE_SLOTS.map((slot, i) => (
                                            <UploadTile
                                                key={i}
                                                label={slot.label}
                                                icon={slot.icon}
                                                image={alts[i] ?? null}
                                                mini
                                                onUpload={(file) => onAltImageUpload(cat.key, i, file)}
                                                onClear={() => onAltImageClear(cat.key, i)}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-[9px] text-zinc-500 mt-1.5">
                                        背面や横からの写真を追加すると、EC Back / Side ビューの精度が大幅に向上します。
                                    </p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Upload count badge */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                    {uploadCount} / {GARMENT_CATEGORIES.length} items uploaded
                </span>
                {uploadCount === 0 && (
                    <span className="text-[10px] text-amber-400/80 font-medium">⚠ At least 1 required</span>
                )}
                {uploadCount > 0 && (
                    <span className="text-[10px] text-emerald-400 font-medium">✓ Ready to proceed</span>
                )}
            </div>
        </div>
    );
};
