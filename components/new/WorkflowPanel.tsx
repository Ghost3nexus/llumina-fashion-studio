import React, { useState } from 'react';
import { WorkflowStepper, WORKFLOW_STEPS } from './WorkflowStepper';
import { InputStep } from './steps/InputStep';
import { BrandStep } from './steps/BrandStep';
import { StudioStep } from './steps/StudioStep';
import { ModelStep } from './steps/ModelStep';
import { OutputStep } from './steps/OutputStep';
import { BrandProfile } from '../../services/luminaApi';

interface WorkflowPanelProps {
    // Input
    uploadedImages: Record<string, string | null>;
    onImageUpload: (type: string, file: File) => void;
    onImageClear: (type: string) => void;
    // Brand
    selectedBrand: BrandProfile | null;
    onSelectBrand: (p: BrandProfile | null) => void;
    savedBrands: BrandProfile[];
    onSaveBrand: (p: BrandProfile) => void;
    // Studio
    studioPreset: string;
    onSelectStudioPreset: (id: string) => void;
    shotType: string;
    onShotTypeChange: (v: string) => void;
    focalLength: string;
    onFocalLengthChange: (v: string) => void;
    seed: string;
    onSeedChange: (v: string) => void;
    // Model
    gender: string;
    onGenderChange: (v: string) => void;
    ageRange: string;
    onAgeRangeChange: (v: string) => void;
    bodyType: string;
    onBodyTypeChange: (v: string) => void;
    vibe: string;
    onVibeChange: (v: string) => void;
    pose: string;
    onPoseChange: (v: string) => void;
    measurements: string;
    onMeasurementsChange: (v: string) => void;
    // Output
    selectedPurposes: Set<string>;
    onTogglePurpose: (p: string) => void;
    resolution: 'STD' | 'HD' | 'MAX';
    onResolutionChange: (r: 'STD' | 'HD' | 'MAX') => void;
    // Generation
    onGenerate: () => void;
    canGenerate: boolean;
    isGenerating: boolean;
}

export const WorkflowPanel: React.FC<WorkflowPanelProps> = (props) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

    const handleStepClick = (index: number) => {
        // Mark current step as completed when moving forward
        if (index > currentStep) {
            setCompletedSteps((prev) => {
                const next = new Set(prev);
                next.add(currentStep);
                return next;
            });
        }
        setCurrentStep(index);
    };

    const handleNext = () => {
        if (currentStep < WORKFLOW_STEPS.length - 1) {
            setCompletedSteps((prev) => {
                const next = new Set(prev);
                next.add(currentStep);
                return next;
            });
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const canProceed = () => {
        switch (currentStep) {
            case 0: // Input: at least 1 image
                return Object.values(props.uploadedImages).some((v) => v !== null);
            default:
                return true;
        }
    };

    const isLastStep = currentStep === WORKFLOW_STEPS.length - 1;

    const renderStep = () => {
        switch (currentStep) {
            case 0:
                return (
                    <InputStep
                        uploadedImages={props.uploadedImages}
                        onImageUpload={props.onImageUpload}
                        onImageClear={props.onImageClear}
                    />
                );
            case 1:
                return (
                    <BrandStep
                        selectedProfile={props.selectedBrand}
                        onSelectProfile={props.onSelectBrand}
                        savedProfiles={props.savedBrands}
                        onSaveProfile={props.onSaveBrand}
                    />
                );
            case 2:
                return (
                    <StudioStep
                        selectedPreset={props.studioPreset}
                        onSelectPreset={props.onSelectStudioPreset}
                        shotType={props.shotType}
                        onShotTypeChange={props.onShotTypeChange}
                        focalLength={props.focalLength}
                        onFocalLengthChange={props.onFocalLengthChange}
                        seed={props.seed}
                        onSeedChange={props.onSeedChange}
                    />
                );
            case 3:
                return (
                    <ModelStep
                        gender={props.gender}
                        onGenderChange={props.onGenderChange}
                        ageRange={props.ageRange}
                        onAgeRangeChange={props.onAgeRangeChange}
                        bodyType={props.bodyType}
                        onBodyTypeChange={props.onBodyTypeChange}
                        vibe={props.vibe}
                        onVibeChange={props.onVibeChange}
                        pose={props.pose}
                        onPoseChange={props.onPoseChange}
                        measurements={props.measurements}
                        onMeasurementsChange={props.onMeasurementsChange}
                    />
                );
            case 4:
                return (
                    <OutputStep
                        selectedPurposes={props.selectedPurposes}
                        onTogglePurpose={props.onTogglePurpose}
                        resolution={props.resolution}
                        onResolutionChange={props.onResolutionChange}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-5 pt-5 pb-3">
                <h1 className="text-lg font-semibold text-white tracking-wide">New Shoot</h1>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                    Studio Presetで、ブランドトーンを固定したまま用途別に出力します。
                </p>
            </div>

            {/* Stepper */}
            <WorkflowStepper
                currentStep={currentStep}
                completedSteps={completedSteps}
                onStepClick={handleStepClick}
            />

            {/* Step content */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
                {renderStep()}
            </div>

            {/* Step navigation */}
            <div className="flex-shrink-0 px-5 py-3 border-t border-zinc-800 flex gap-2">
                <button
                    onClick={handleBack}
                    disabled={currentStep === 0}
                    className="px-4 py-2 bg-zinc-800 text-zinc-300 text-[11px] font-semibold rounded-lg hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                    ← Back
                </button>
                {isLastStep ? (
                    <button
                        onClick={props.onGenerate}
                        disabled={!props.canGenerate || props.isGenerating}
                        className="flex-1 py-2 bg-violet-600 text-white text-[11px] font-semibold rounded-lg hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5"
                    >
                        {props.isGenerating ? (
                            <>
                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full" style={{ animation: 'spin 0.8s linear infinite' }} />
                                Generating…
                            </>
                        ) : (
                            <>
                                ⚡ Generate Preview ({props.selectedPurposes.size})
                            </>
                        )}
                    </button>
                ) : (
                    <button
                        onClick={handleNext}
                        disabled={!canProceed()}
                        className="flex-1 py-2 bg-violet-600 text-white text-[11px] font-semibold rounded-lg hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                        Next →
                    </button>
                )}
            </div>
            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};
