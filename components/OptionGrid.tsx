import React from 'react';

interface OptionGridProps {
    label: string;
    options: string[];
    current: string;
    onChange: (val: any) => void;
    cols?: number;
}

export const OptionGrid: React.FC<OptionGridProps> = ({
    label,
    options,
    current,
    onChange,
    cols = 2
}) => (
    <div className="mb-4">
        <label className="text-[10px] text-gray-500 uppercase font-medium mb-2 block">{label}</label>
        <div className={`grid grid-cols-${cols} gap-1.5`}>
            {options.map((opt) => (
                <button
                    key={opt}
                    onClick={() => onChange(opt)}
                    className={`text-[10px] py-2 rounded transition-all border ${current === opt
                            ? 'bg-studio-accent text-white border-studio-accent shadow-lg shadow-studio-accent/20'
                            : 'border-studio-700 text-gray-400 hover:border-studio-600'
                        }`}
                >
                    {opt.replace(/_/g, ' ').charAt(0).toUpperCase() + opt.replace(/_/g, ' ').slice(1)}
                </button>
            ))}
        </div>
    </div>
);
