
import React from 'react';

export interface OptionItem {
    id: string;
    label: string;
    icon?: string;
}

interface OptionGridProps {
    label?: string;
    options: (string | OptionItem)[];
    selectedId: string;
    onSelect: (id: string) => void;
    cols?: number;
}

export const OptionGrid: React.FC<OptionGridProps> = ({
    label,
    options,
    selectedId,
    onSelect,
    cols = 2
}) => (
    <div className="mb-4">
        {label && <label className="text-[10px] text-gray-500 uppercase font-medium mb-2 block">{label}</label>}
        <div className={`grid grid-cols-${cols} gap-1.5`}>
            {options.map((opt) => {
                const isString = typeof opt === 'string';
                const id = isString ? opt : opt.id;
                const displayLabel = isString
                    ? opt.replace(/_/g, ' ').charAt(0).toUpperCase() + opt.replace(/_/g, ' ').slice(1)
                    : opt.label;
                const icon = !isString ? opt.icon : null;
                const isSelected = selectedId === id;

                return (
                    <button
                        key={id}
                        onClick={() => onSelect(id)}
                        className={`text-[10px] py-2 px-2 rounded transition-all border flex items-center justify-center gap-2 ${isSelected
                            ? 'bg-studio-accent text-white border-studio-accent shadow-lg shadow-studio-accent/20'
                            : 'bg-studio-800 border-studio-700 text-gray-400 hover:border-studio-600 hover:text-gray-300'
                            }`}
                    >
                        {icon && <span className="text-sm">{icon}</span>}
                        <span className="truncate">{displayLabel}</span>
                    </button>
                );
            })}
        </div>
    </div>
);
