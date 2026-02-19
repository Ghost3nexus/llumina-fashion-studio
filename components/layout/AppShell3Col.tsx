import React from 'react';

interface AppShell3ColProps {
    left: React.ReactNode;
    center: React.ReactNode;
    right: React.ReactNode;
    bottom: React.ReactNode;
}

export const AppShell3Col: React.FC<AppShell3ColProps> = ({ left, center, right, bottom }) => {
    return (
        <div className="flex flex-col h-[100dvh] bg-studio-900 text-white font-sans overflow-hidden">
            {/* 3-column main area */}
            <div className="flex-1 grid grid-cols-[340px_1fr_300px] min-h-0">
                {/* Left: Workflow */}
                <aside className="border-r border-studio-700/50 overflow-y-auto overflow-x-hidden">
                    {left}
                </aside>

                {/* Center: Canvas */}
                <main className="overflow-y-auto overflow-x-hidden bg-[#0c0c0e]">
                    {center}
                </main>

                {/* Right: Batch Queue */}
                <aside className="border-l border-studio-700/50 overflow-y-auto overflow-x-hidden">
                    {right}
                </aside>
            </div>

            {/* Bottom Action Bar */}
            <div className="flex-shrink-0">
                {bottom}
            </div>
        </div>
    );
};
