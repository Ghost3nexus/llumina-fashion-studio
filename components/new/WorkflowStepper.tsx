import React from 'react';

export interface StepDef {
    key: string;
    label: string;
    icon: string;
}

export const WORKFLOW_STEPS: StepDef[] = [
    { key: 'input', label: 'Input', icon: '📷' },
    { key: 'brand', label: 'Brand', icon: '🏷' },
    { key: 'studio', label: 'Studio', icon: '💡' },
    { key: 'model', label: 'Model', icon: '🧍' },
    { key: 'output', label: 'Output', icon: '📐' },
];

interface WorkflowStepperProps {
    currentStep: number;
    completedSteps: Set<number>;
    onStepClick: (index: number) => void;
}

export const WorkflowStepper: React.FC<WorkflowStepperProps> = ({
    currentStep,
    completedSteps,
    onStepClick,
}) => {
    return (
        <div className="flex items-center gap-1 px-4 py-3 bg-studio-800/60 border-b border-studio-700/50">
            {WORKFLOW_STEPS.map((step, i) => {
                const isActive = i === currentStep;
                const isCompleted = completedSteps.has(i);
                const isPast = i < currentStep;

                return (
                    <React.Fragment key={step.key}>
                        <button
                            onClick={() => onStepClick(i)}
                            className={`
                flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider
                transition-all duration-200 whitespace-nowrap
                ${isActive
                                    ? 'bg-studio-accent/20 text-studio-accent border border-studio-accent/40'
                                    : isCompleted || isPast
                                        ? 'text-studio-accent/70 hover:bg-studio-700/50 cursor-pointer'
                                        : 'text-gray-500 hover:text-gray-400 hover:bg-studio-700/30 cursor-pointer'
                                }
              `}
                        >
                            <span className={`text-sm ${isCompleted ? 'opacity-80' : ''}`}>
                                {isCompleted ? '✓' : step.icon}
                            </span>
                            <span className="hidden xl:inline">{step.label}</span>
                        </button>
                        {i < WORKFLOW_STEPS.length - 1 && (
                            <div
                                className={`flex-shrink-0 w-4 h-px ${isPast || isCompleted ? 'bg-studio-accent/40' : 'bg-studio-700/50'
                                    }`}
                            />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};
