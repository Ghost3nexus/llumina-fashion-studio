import React, { useRef } from 'react';

interface UploadSlotProps {
    label: string;
    image: string | null;
    onUpload: (file: File) => void;
}

export const UploadSlot: React.FC<UploadSlotProps> = ({ label, image, onUpload }) => {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onUpload(e.target.files[0]);
        }
    };

    return (
        <div
            className={`border-2 border-dashed rounded-lg p-3 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[90px] ${image ? 'border-studio-accent/50 bg-studio-900/50' : 'border-studio-700 hover:border-studio-600'}`}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    inputRef.current?.click();
                }
            }}
        >
            {image ? (
                <div className="relative w-full">
                    <img src={image} alt={label} className="mx-auto h-12 object-contain" />
                    <div className="mt-1 text-[8px] text-studio-accent font-bold uppercase tracking-tighter">{label} LOADED</div>
                </div>
            ) : (
                <div className="text-studio-600">
                    <p className="text-[9px] uppercase font-bold">{label}</p>
                    <p className="text-[8px] mt-0.5 opacity-50">Upload Source</p>
                </div>
            )}
            <input
                type="file"
                ref={inputRef}
                onChange={handleChange}
                className="hidden"
                accept="image/*"
            />
        </div>
    );
};
