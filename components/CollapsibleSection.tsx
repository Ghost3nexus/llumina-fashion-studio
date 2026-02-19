import React, { useState, useRef, useEffect } from 'react';
import { SectionHeader } from './SectionHeader';

interface CollapsibleSectionProps {
    title: string;
    number: string;
    defaultOpen?: boolean;
    children: React.ReactNode;
    badge?: string;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
    title,
    number,
    defaultOpen = false,
    children,
    badge
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const contentRef = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState<number | undefined>(defaultOpen ? undefined : 0);

    useEffect(() => {
        if (!contentRef.current) return;
        if (isOpen) {
            const h = contentRef.current.scrollHeight;
            setHeight(h);
            const timer = setTimeout(() => setHeight(undefined), 300);
            return () => clearTimeout(timer);
        } else {
            const h = contentRef.current.scrollHeight;
            setHeight(h);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => setHeight(0));
            });
        }
    }, [isOpen]);

    return (
        <section className="mb-4">
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between cursor-pointer group hover:bg-studio-700/20 -mx-2 px-2 py-1.5 rounded-lg transition-colors"
            >
                <div className="flex items-center gap-2">
                    <SectionHeader title={title} number={number} />
                    {badge && (
                        <span className="text-[8px] bg-studio-accent/20 text-studio-accent px-1.5 py-0.5 rounded-full font-bold uppercase">
                            {badge}
                        </span>
                    )}
                </div>
                <svg
                    className={`w-4 h-4 text-gray-500 transition-transform duration-300 group-hover:text-gray-300 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>

            <div
                ref={contentRef}
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={{ height: height !== undefined ? `${height}px` : 'auto' }}
            >
                <div className="pt-3">
                    {children}
                </div>
            </div>
        </section>
    );
};
