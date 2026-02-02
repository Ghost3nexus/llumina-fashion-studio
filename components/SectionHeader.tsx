import React from 'react';

interface SectionHeaderProps {
  title: string;
  number: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, number }) => (
  <h2 className="text-[10px] uppercase font-bold text-studio-600 mb-4 tracking-widest flex items-center">
    <span className="bg-studio-700 text-white w-4 h-4 flex items-center justify-center rounded-full mr-2 text-[8px]">{number}</span>
    {title}
  </h2>
);
