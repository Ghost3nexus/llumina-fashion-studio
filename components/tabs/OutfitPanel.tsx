
import React, { useState } from 'react';
import { ClothingType, DetailedGarmentMeasurements, DetailedAccessoryMeasurements, DetailedAccessoryPositioning, DetailedAccessoryMaterials } from '../../types';
import { UploadSlot } from '../UploadSlot';
// import { SectionHeader } from '../SectionHeader'; // Unused

interface OutfitPanelProps {
    uploadedImages: Record<ClothingType, string | null>;
    onImageUpload: (type: ClothingType, file: File) => void;
    garmentMeasurements: DetailedGarmentMeasurements;
    setGarmentMeasurements: (config: DetailedGarmentMeasurements) => void;
    accessoryMeasurements: DetailedAccessoryMeasurements;
    setAccessoryMeasurements: (config: DetailedAccessoryMeasurements) => void;
    accessoryPositioning: DetailedAccessoryPositioning;
    setAccessoryPositioning: (config: DetailedAccessoryPositioning) => void;
    accessoryMaterials: DetailedAccessoryMaterials;
    setAccessoryMaterials: (config: DetailedAccessoryMaterials) => void;
}

export const OutfitPanel: React.FC<OutfitPanelProps> = ({
    uploadedImages,
    onImageUpload,
    // garmentMeasurements, // Unused
    // setGarmentMeasurements, // Unused
    // accessoryMeasurements, // Unused
    // setAccessoryMeasurements, // Unused
    // accessoryPositioning, // Unused
    // setAccessoryPositioning, // Unused
    // accessoryMaterials, // Unused
    // setAccessoryMaterials // Unused
}) => {
    const [activeCategory, setActiveCategory] = useState<'tops' | 'pants' | 'outer' | 'accessories'>('tops');

    return (
        <div className="h-full flex flex-col">
            {/* Category Tabs */}
            <div className="flex border-b border-studio-700 bg-studio-800">
                {(['tops', 'pants', 'outer', 'accessories'] as const).map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`flex-1 py-3 text-[10px] uppercase font-bold tracking-wider transition-colors border-b-2 ${activeCategory === cat
                            ? 'border-studio-accent text-studio-accent bg-studio-accent/5'
                            : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-studio-700/50'
                            }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-studio-900/50">
                <div className="grid grid-cols-4 gap-4"> {/* Horizontal Layout Grid */}

                    {/* TOPS Category */}
                    {activeCategory === 'tops' && (
                        <>
                            <div className="col-span-1">
                                <UploadSlot
                                    label="Tops / Shirt"
                                    image={uploadedImages.tops}
                                    onUpload={(f) => onImageUpload('tops', f)}
                                    onClear={() => onImageUpload('tops', null as any)} // dirty cast to trigger clear logic if handled
                                />
                            </div>
                            <div className="col-span-1">
                                <UploadSlot
                                    label="Inner Layer"
                                    image={uploadedImages.inner}
                                    onUpload={(f) => onImageUpload('inner', f)}
                                    onClear={() => onImageUpload('inner', null as any)}
                                />
                            </div>
                            {/* Measurements could go here if valid */}
                        </>
                    )}

                    {/* PANTS Category */}
                    {activeCategory === 'pants' && (
                        <>
                            <div className="col-span-1">
                                <UploadSlot
                                    label="Pants / Skirt"
                                    image={uploadedImages.pants}
                                    onUpload={(f) => onImageUpload('pants', f)}
                                    onClear={() => onImageUpload('pants', null as any)}
                                />
                            </div>
                            <div className="col-span-1">
                                <UploadSlot
                                    label="Shoes"
                                    image={uploadedImages.shoes}
                                    onUpload={(f) => onImageUpload('shoes', f)}
                                    onClear={() => onImageUpload('shoes', null as any)}
                                />
                            </div>
                        </>
                    )}

                    {/* OUTER Category */}
                    {activeCategory === 'outer' && (
                        <div className="col-span-1">
                            <UploadSlot
                                label="Outerwear"
                                image={uploadedImages.outer}
                                onUpload={(f) => onImageUpload('outer', f)}
                                onClear={() => onImageUpload('outer', null as any)}
                            />
                        </div>
                    )}

                    {/* ACCESSORIES Category */}
                    {activeCategory === 'accessories' && (
                        <>
                            <div className="col-span-1">
                                <UploadSlot label="Bag" image={uploadedImages.bag} onUpload={(f) => onImageUpload('bag', f)} />
                            </div>
                            <div className="col-span-1">
                                <UploadSlot label="Sunglasses" image={uploadedImages.sunglasses} onUpload={(f) => onImageUpload('sunglasses', f)} />
                            </div>
                            <div className="col-span-1">
                                <UploadSlot label="Glasses" image={uploadedImages.glasses} onUpload={(f) => onImageUpload('glasses', f)} />
                            </div>
                            <div className="col-span-1">
                                <UploadSlot label="Other Accessories" image={uploadedImages.accessories} onUpload={(f) => onImageUpload('accessories', f)} />
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
