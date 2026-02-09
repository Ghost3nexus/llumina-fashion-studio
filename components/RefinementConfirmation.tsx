import { RefinementInterpretation } from '../types';

interface RefinementConfirmationProps {
    interpretation: RefinementInterpretation;
    onConfirm: () => void;
    onCancel: () => void;
    isProcessing?: boolean;
}

export default function RefinementConfirmation({
    interpretation,
    onConfirm,
    onCancel,
    isProcessing
}: RefinementConfirmationProps) {
    return (
        <div className="bg-studio-700/50 backdrop-blur-sm p-4 rounded-lg border border-studio-600 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
                <span className="text-2xl">🔍</span>
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                    Please confirm / 確認してください
                </h3>
            </div>

            {/* Interpretation Details */}
            <div className="bg-studio-900 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Target / 対象</p>
                        <p className="text-sm text-white font-medium">{interpretation.target}</p>
                    </div>
                    <div>
                        <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Change / 変更</p>
                        <p className="text-sm text-white font-medium">{interpretation.changeType}</p>
                    </div>
                </div>

                <div>
                    <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">New Value / 新しい値</p>
                    <div className="flex items-center gap-2">
                        <p className="text-sm text-studio-accent font-medium">{interpretation.value}</p>
                        {interpretation.changeType === 'Color' && (
                            <div
                                className="w-6 h-6 rounded border-2 border-white/20 shadow-lg"
                                style={{
                                    backgroundColor: interpretation.value.startsWith('#')
                                        ? interpretation.value
                                        : interpretation.value.toLowerCase()
                                }}
                                title={`Color preview: ${interpretation.value}`}
                            />
                        )}
                    </div>
                </div>

                {/* Generated Prompt (for transparency) */}
                <div>
                    <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">AI Prompt / AIプロンプト</p>
                    <div className="bg-studio-800 rounded p-2 max-h-24 overflow-y-auto custom-scrollbar">
                        <p className="text-xs text-gray-400 font-mono leading-relaxed whitespace-pre-wrap">
                            {interpretation.generatedPrompt}
                        </p>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
                <button
                    onClick={onConfirm}
                    disabled={isProcessing}
                    className={`flex-1 py-3 rounded font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 ${isProcessing
                        ? 'bg-studio-700 text-gray-500 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700 shadow-lg hover:shadow-green-600/20'
                        }`}
                >
                    <span>✓</span>
                    <span>{isProcessing ? 'Generating...' : 'Confirm & Generate'}</span>
                </button>

                <button
                    onClick={onCancel}
                    disabled={isProcessing}
                    className={`flex-1 py-3 rounded font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 ${isProcessing
                        ? 'bg-studio-700 text-gray-500 cursor-not-allowed'
                        : 'bg-red-600 text-white hover:bg-red-700 shadow-lg hover:shadow-red-600/20'
                        }`}
                >
                    <span>✗</span>
                    <span>Cancel</span>
                </button>
            </div>

            {/* Info Message */}
            <p className="text-[10px] text-gray-500 text-center">
                This will generate a new image with only the requested change.
                <br />
                リクエストされた変更のみを適用した新しい画像を生成します。
            </p>
        </div>
    );
}
