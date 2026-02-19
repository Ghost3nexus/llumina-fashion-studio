import React from 'react';

interface Step {
    label: string;
    number: string;
    isComplete: boolean;
    isActive: boolean;
}

interface StepIndicatorProps {
    steps: Step[];
    onStepClick?: (number: string) => void;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ steps, onStepClick }) => {
    return (
        <div className="flex items-center justify-between px-1 py-3 mb-4 border-b border-studio-700/50">
            {steps.map((step, index) => (
                <React.Fragment key={step.number}>
                    <button
                        onClick={() => onStepClick?.(step.number)}
                        className="flex flex-col items-center gap-1.5 group cursor-pointer"
                    >
                        <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold transition-all ${step.isComplete
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                                    : step.isActive
                                        ? 'bg-studio-accent text-white shadow-lg shadow-studio-accent/30 scale-110'
                                        : 'bg-studio-900 text-gray-500 border border-studio-700 group-hover:border-studio-600'
                                }`}
                        >
                            {step.isComplete ? '✓' : step.number}
                        </div>
                        <span
                            className={`text-[8px] uppercase tracking-wider font-medium transition-colors ${step.isActive ? 'text-studio-accent' : step.isComplete ? 'text-green-400/70' : 'text-gray-600'
                                }`}
                        >
                            {step.label}
                        </span>
                    </button>
                    {index < steps.length - 1 && (
                        <div
                            className={`flex-1 h-px mx-1 transition-colors ${step.isComplete ? 'bg-green-500/30' : 'bg-studio-700/50'
                                }`}
                        />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
};
