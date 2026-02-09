import React, { useState } from 'react';
import { RefinementRequest, RefinementTarget, RefinementChangeType, ClothingType } from '../types';

interface RefinementFormProps {
    onSubmit: (request: RefinementRequest) => void;
    uploadedImages: Record<ClothingType, string | null>;
    isProcessing?: boolean;
}

export default function RefinementForm({ onSubmit, uploadedImages, isProcessing }: RefinementFormProps) {
    const [target, setTarget] = useState<RefinementTarget>('tops');
    const [changeType, setChangeType] = useState<RefinementChangeType>('color');
    const [value, setValue] = useState('');
    const [description, setDescription] = useState('');

    // Get available targets based on uploaded images (clothing items only)
    const availableTargets: { value: RefinementTarget; label: string }[] = [
        ...(uploadedImages.tops ? [{ value: 'tops' as RefinementTarget, label: 'Top' }] : []),
        ...(uploadedImages.pants ? [{ value: 'pants' as RefinementTarget, label: 'Pants' }] : []),
        ...(uploadedImages.outer ? [{ value: 'outer' as RefinementTarget, label: 'Outer' }] : []),
        ...(uploadedImages.inner ? [{ value: 'inner' as RefinementTarget, label: 'Inner' }] : []),
        ...(uploadedImages.shoes ? [{ value: 'shoes' as RefinementTarget, label: 'Shoes' }] : []),
    ];

    // Define which change types are supported for each target
    const getAvailableChangeTypes = (currentTarget: RefinementTarget): { value: RefinementChangeType; label: string; placeholder: string }[] => {
        const clothingItems = ['tops', 'pants', 'outer', 'inner', 'shoes'];

        // Clothing items support all change types
        if (clothingItems.includes(currentTarget)) {
            return [
                { value: 'color', label: 'Color', placeholder: 'e.g., red or #FF0000' },
                { value: 'style', label: 'Style', placeholder: 'e.g., casual, formal, vintage' },
                { value: 'material', label: 'Material', placeholder: 'e.g., silk, cotton, leather' },
                { value: 'pattern', label: 'Pattern', placeholder: 'e.g., striped, floral, checkered' },
                { value: 'custom', label: 'Custom', placeholder: 'Describe your change...' },
            ];
        }

        // Background supports color and custom
        if (currentTarget === 'background') {
            return [
                { value: 'color', label: 'Color', placeholder: 'e.g., white, studio gray, #F5F5F5' },
                { value: 'custom', label: 'Custom', placeholder: 'Describe background change...' },
            ];
        }

        // Lighting and Pose only support custom
        return [
            { value: 'custom', label: 'Custom', placeholder: 'Describe your change...' },
        ];
    };

    const availableChangeTypes = getAvailableChangeTypes(target);


    // Helper function to parse color input (handles comma-separated values)
    const parseColorInput = (input: string): string => {
        if (!input.trim()) return '';
        // If comma-separated, take the first value
        const colors = input.split(',').map(c => c.trim()).filter(c => c);
        return colors[0] || '';
    };

    // Check if input has multiple colors
    const hasMultipleColors = changeType === 'color' && value.includes(',');
    const parsedColor = hasMultipleColors ? parseColorInput(value) : value.trim();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!value.trim()) return;

        // For color changes, use parsed color (first value if comma-separated)
        const finalValue = changeType === 'color' ? parseColorInput(value) : value.trim();

        onSubmit({
            target,
            changeType,
            value: finalValue,
            description: description.trim() || undefined,
        });

        // Reset form
        setValue('');
        setDescription('');
    };

    const currentPlaceholder = availableChangeTypes.find(ct => ct.value === changeType)?.placeholder || '';

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Target Selection */}
            <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 block mb-2">
                    What to change / 変更対象
                </label>
                <select
                    value={target}
                    onChange={(e) => setTarget(e.target.value as RefinementTarget)}
                    className="w-full bg-studio-900 border border-studio-700 rounded px-3 py-2 text-sm text-white focus:border-studio-accent outline-none"
                    disabled={isProcessing}
                >
                    {availableTargets.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                </select>
            </div>

            {/* Change Type Selection */}
            <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 block mb-2">
                    Type of change / 変更タイプ
                </label>
                <select
                    value={changeType}
                    onChange={(e) => setChangeType(e.target.value as RefinementChangeType)}
                    className="w-full bg-studio-900 border border-studio-700 rounded px-3 py-2 text-sm text-white focus:border-studio-accent outline-none"
                    disabled={isProcessing}
                >
                    {availableChangeTypes.map(ct => (
                        <option key={ct.value} value={ct.value}>{ct.label}</option>
                    ))}
                </select>
            </div>

            {/* Value Input */}
            <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 block mb-2">
                    New value / 新しい値
                </label>
                <input
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={currentPlaceholder}
                    className="w-full bg-studio-900 border border-studio-700 rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-studio-accent outline-none"
                    disabled={isProcessing}
                />
                {hasMultipleColors && (
                    <div className="mt-2 flex items-start gap-2 bg-yellow-900/20 border border-yellow-700/30 rounded px-3 py-2">
                        <span className="text-yellow-500 text-xs">⚠️</span>
                        <div className="flex-1">
                            <p className="text-xs text-yellow-200">
                                Multiple colors detected. Only "{parsedColor}" will be used.
                            </p>
                            <p className="text-[10px] text-yellow-300/70 mt-1">
                                複数の色が検出されました。「{parsedColor}」のみが使用されます。
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Additional Details (for custom) */}
            {changeType === 'custom' && (
                <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-2">
                        Additional details / 詳細説明 (Optional)
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe any specific requirements..."
                        rows={3}
                        className="w-full bg-studio-900 border border-studio-700 rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-studio-accent outline-none resize-none"
                        disabled={isProcessing}
                    />
                </div>
            )}

            {/* Submit Button */}
            <button
                type="submit"
                disabled={!value.trim() || isProcessing}
                className={`w-full py-3 rounded font-bold uppercase tracking-widest text-xs transition-all ${!value.trim() || isProcessing
                    ? 'bg-studio-700 text-gray-500 cursor-not-allowed'
                    : 'bg-studio-accent text-white hover:bg-studio-accent/80 shadow-lg hover:shadow-studio-accent/20'
                    }`}
            >
                {isProcessing ? 'Processing...' : 'Preview Change'}
            </button>
        </form>
    );
}
