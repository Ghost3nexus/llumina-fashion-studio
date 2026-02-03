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

    // Get available targets based on uploaded images
    const availableTargets: { value: RefinementTarget; label: string }[] = [
        ...(uploadedImages.tops ? [{ value: 'tops' as RefinementTarget, label: 'Top' }] : []),
        ...(uploadedImages.pants ? [{ value: 'pants' as RefinementTarget, label: 'Pants' }] : []),
        ...(uploadedImages.outer ? [{ value: 'outer' as RefinementTarget, label: 'Outer' }] : []),
        ...(uploadedImages.inner ? [{ value: 'inner' as RefinementTarget, label: 'Inner' }] : []),
        ...(uploadedImages.shoes ? [{ value: 'shoes' as RefinementTarget, label: 'Shoes' }] : []),
        { value: 'background', label: 'Background' },
        { value: 'lighting', label: 'Lighting' },
        { value: 'pose', label: 'Pose' },
    ];

    const changeTypes: { value: RefinementChangeType; label: string; placeholder: string }[] = [
        { value: 'color', label: 'Color', placeholder: 'e.g., black, navy blue, red' },
        { value: 'style', label: 'Style', placeholder: 'e.g., casual, formal, vintage' },
        { value: 'material', label: 'Material', placeholder: 'e.g., silk, cotton, leather' },
        { value: 'pattern', label: 'Pattern', placeholder: 'e.g., striped, floral, checkered' },
        { value: 'custom', label: 'Custom', placeholder: 'Describe your change...' },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!value.trim()) return;

        onSubmit({
            target,
            changeType,
            value: value.trim(),
            description: description.trim() || undefined,
        });

        // Reset form
        setValue('');
        setDescription('');
    };

    const currentPlaceholder = changeTypes.find(ct => ct.value === changeType)?.placeholder || '';

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
                    {changeTypes.map(ct => (
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
