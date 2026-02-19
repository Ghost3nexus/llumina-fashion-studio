import React, { useRef } from 'react';

interface InputStepProps {
    uploadedImages: Record<string, string | null>;
    onImageUpload: (type: string, file: File) => void;
    onImageClear: (type: string) => void;
}

const GARMENT_CATEGORIES = [
    { key: 'tops', label: 'Top', icon: '👕' },
    { key: 'pants', label: 'Bottom', icon: '👖' },
    { key: 'outer', label: 'Outer', icon: '🧥' },
    { key: 'inner', label: 'Inner', icon: '👔' },
    { key: 'shoes', label: 'Shoes', icon: '👟' },
];

const UploadCard: React.FC<{
    label: string;
    icon: string;
    image: string | null;
    onUpload: (file: File) => void;
    onClear: () => void;
}> = ({ label, icon, image, onUpload, onClear }) => {
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="relative group">
            <div
                onClick={() => inputRef.current?.click()}
                className={`
          border-2 border-dashed rounded-xl p-4 text-center cursor-pointer
          transition-all duration-200 flex flex-col items-center justify-center min-h-[100px]
          ${image
                        ? 'border-violet-500/50 bg-violet-500/5'
                        : 'border-zinc-700 hover:border-zinc-500 bg-zinc-800/30 hover:bg-zinc-800/50'
                    }
        `}
            >
                {image ? (
                    <div className="relative w-full">
                        <img src={image} alt={label} className="mx-auto h-16 object-contain rounded" />
                        <div className="mt-2 text-[9px] text-violet-400 font-bold uppercase tracking-wider">
                            {label} ✓
                        </div>
                    </div>
                ) : (
                    <div className="text-zinc-500">
                        <span className="text-2xl block mb-1">{icon}</span>
                        <p className="text-[10px] uppercase font-bold tracking-wider">{label}</p>
                        <p className="text-[9px] mt-0.5 opacity-50">Click to upload</p>
                    </div>
                )}
                <input
                    type="file"
                    ref={inputRef}
                    onChange={(e) => {
                        if (e.target.files?.[0]) onUpload(e.target.files[0]);
                    }}
                    className="hidden"
                    accept="image/*"
                />
            </div>
            {image && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClear();
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                >
                    ×
                </button>
            )}
        </div>
    );
};

export const InputStep: React.FC<InputStepProps> = ({
    uploadedImages,
    onImageUpload,
    onImageClear,
}) => {
    const uploadCount = GARMENT_CATEGORIES.filter(c => uploadedImages[c.key]).length;

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-sm font-semibold text-white mb-1">Garment Input</h3>
                <p className="text-[11px] text-zinc-400">
                    Upload at least 1 garment image. The AI will analyze fabric, color, and style.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {GARMENT_CATEGORIES.map((cat) => (
                    <UploadCard
                        key={cat.key}
                        label={cat.label}
                        icon={cat.icon}
                        image={uploadedImages[cat.key]}
                        onUpload={(file) => onImageUpload(cat.key, file)}
                        onClear={() => onImageClear(cat.key)}
                    />
                ))}
            </div>

            {/* Upload count badge */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                    {uploadCount} / {GARMENT_CATEGORIES.length} uploaded
                </span>
                {uploadCount === 0 && (
                    <span className="text-[10px] text-amber-400/80 font-medium">
                        ⚠ At least 1 required
                    </span>
                )}
                {uploadCount > 0 && (
                    <span className="text-[10px] text-emerald-400 font-medium">
                        ✓ Ready to proceed
                    </span>
                )}
            </div>
        </div>
    );
};
