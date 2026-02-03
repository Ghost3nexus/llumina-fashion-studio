import React, { useEffect, useState } from 'react';

interface LoadingAnimationProps {
    stage: 'analyzing' | 'generating';
}

export const LoadingAnimation: React.FC<LoadingAnimationProps> = ({ stage }) => {
    const [progress, setProgress] = useState(0);
    const [currentTip, setCurrentTip] = useState(0);

    const stages = {
        analyzing: {
            message: 'Analyzing garment details...',
            targetProgress: 30,
            duration: 3000
        },
        generating: {
            message: 'Rendering fashion shot with Gemini 3 Pro...',
            targetProgress: 95,
            duration: 20000
        }
    };

    const tips = [
        'Pro tip: Golden hour lighting creates warm, flattering tones',
        'Did you know? 50mm lens is ideal for fashion portraits',
        'Tip: Three-quarter poses show garment details best',
        'Fashion fact: High-key lighting minimizes shadows',
        'Studio secret: Cinematic lighting adds drama and depth'
    ];

    useEffect(() => {
        const currentStage = stages[stage];
        const startProgress = stage === 'analyzing' ? 0 : 30;
        const increment = (currentStage.targetProgress - startProgress) / (currentStage.duration / 100);

        const interval = setInterval(() => {
            setProgress(prev => {
                const next = prev + increment;
                return next >= currentStage.targetProgress ? currentStage.targetProgress : next;
            });
        }, 100);

        return () => clearInterval(interval);
    }, [stage]);

    useEffect(() => {
        const tipInterval = setInterval(() => {
            setCurrentTip(prev => (prev + 1) % tips.length);
        }, 4000);

        return () => clearInterval(tipInterval);
    }, []);

    const estimatedTime = stage === 'analyzing'
        ? Math.max(0, Math.ceil((30 - progress) / 10))
        : Math.max(0, Math.ceil((95 - progress) / 4));

    return (
        <div className="flex-1 rounded-2xl overflow-hidden border border-studio-700 relative bg-studio-800 shadow-2xl flex items-center justify-center">
            <div className="text-center p-12 max-w-2xl w-full">
                {/* Camera Icon with Pulse Animation */}
                <div className="relative inline-block mb-8">
                    <div className="absolute inset-0 bg-studio-accent/20 rounded-full blur-2xl animate-pulse"></div>
                    <div className="relative text-7xl transform hover:scale-110 transition-transform duration-500">
                        📸
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-light tracking-[0.3em] mb-2 text-white uppercase">
                    Generating
                </h2>
                <p className="text-sm text-gray-400 mb-8 tracking-wide">
                    {stages[stage].message}
                </p>

                {/* Progress Bar */}
                <div className="relative w-full h-2 bg-studio-900 rounded-full overflow-hidden mb-4">
                    <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-studio-accent via-purple-500 to-studio-accent bg-[length:200%_100%] animate-gradient-x transition-all duration-300 ease-out rounded-full"
                        style={{ width: `${progress}%` }}
                    >
                        <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
                    </div>
                </div>

                {/* Progress Percentage and Time */}
                <div className="flex justify-between items-center text-xs text-gray-500 mb-8">
                    <span className="font-mono">{Math.round(progress)}%</span>
                    <span className="tracking-wider">
                        {estimatedTime > 0 ? `~${estimatedTime}s remaining` : 'Finalizing...'}
                    </span>
                </div>

                {/* Rotating Tips */}
                <div className="border-t border-studio-700/50 pt-6 min-h-[60px] flex items-center justify-center">
                    <p className="text-xs text-gray-400 italic transition-opacity duration-500 animate-fade-in">
                        {tips[currentTip]}
                    </p>
                </div>

                {/* Particle Effect Overlay */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-1 h-1 bg-studio-accent/30 rounded-full animate-float"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 5}s`,
                                animationDuration: `${5 + Math.random() * 10}s`
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Corner Badge */}
            <div className="absolute top-4 left-4 flex gap-2">
                <span className="px-3 py-1.5 bg-black/60 rounded text-[9px] uppercase font-bold text-white/70 backdrop-blur-md tracking-wider">
                    AI Rendering
                </span>
            </div>
        </div>
    );
};
