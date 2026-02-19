import React from 'react';

export interface HistoryItem {
    id: string;
    imageUrl: string;
    timestamp: number;
    params: {
        editorialStyle: string;
        lightingPreset: string;
        shotType: string;
        pose: string;
        ethnicity: string;
        gender: string;
    };
}

interface GenerationHistoryProps {
    items: HistoryItem[];
    currentId?: string;
    onSelect: (item: HistoryItem) => void;
    onReuse: (item: HistoryItem) => void;
}

export const GenerationHistory: React.FC<GenerationHistoryProps> = ({
    items,
    currentId,
    onSelect,
    onReuse
}) => {
    if (items.length === 0) return null;

    return (
        <div className="border-t border-studio-700/50 pt-4 mt-4">
            <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">
                    📂 History ({items.length})
                </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                {items.map((item) => (
                    <div
                        key={item.id}
                        className={`flex-shrink-0 relative group cursor-pointer rounded-lg overflow-hidden transition-all ${currentId === item.id
                                ? 'ring-2 ring-studio-accent shadow-lg shadow-studio-accent/20'
                                : 'ring-1 ring-studio-700 hover:ring-studio-600'
                            }`}
                        onClick={() => onSelect(item)}
                    >
                        <img
                            src={item.imageUrl}
                            alt=""
                            className="w-16 h-20 object-cover"
                        />
                        {/* Overlay on hover */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                            <button
                                onClick={(e) => { e.stopPropagation(); onReuse(item); }}
                                className="text-[7px] bg-studio-accent text-white px-2 py-0.5 rounded font-bold uppercase"
                            >
                                Reuse
                            </button>
                            <span className="text-[7px] text-gray-300">
                                {item.params.editorialStyle.split('_')[0]}
                            </span>
                        </div>
                        {/* Time badge */}
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-1 py-0.5">
                            <span className="text-[6px] text-gray-400">
                                {new Date(item.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
