
import React, { useState, useRef, useEffect } from 'react';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    text: string;
}

interface RefinementChatProps {
    onSend: (message: string) => void;
    isProcessing: boolean;
}

export const RefinementChat: React.FC<RefinementChatProps> = ({ onSend, isProcessing }) => {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', role: 'assistant', text: 'How would you like to refine this shot? You can change colors, fabrics, or descriptions.' }
    ]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isProcessing) return;

        const userMessage: Message = { id: Date.now().toString(), role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        onSend(input);
        setInput('');
    };

    return (
        <div className="flex flex-col h-[300px] bg-studio-800 border-t border-studio-700">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-lg text-sm ${msg.role === 'user'
                                ? 'bg-studio-accent text-white rounded-br-none'
                                : 'bg-studio-700 text-gray-200 rounded-bl-none'
                            }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isProcessing && (
                    <div className="flex justify-start">
                        <div className="bg-studio-700 text-gray-200 rounded-lg rounded-bl-none p-3 text-sm flex items-center space-x-2">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSubmit} className="p-4 border-t border-studio-700 flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="e.g. Change the top to red silk..."
                    disabled={isProcessing}
                    className="flex-1 bg-studio-900 border border-studio-600 rounded px-4 py-2 text-white text-sm focus:outline-none focus:border-studio-accent transition-colors disabled:opacity-50"
                />
                <button
                    type="submit"
                    disabled={!input.trim() || isProcessing}
                    className="bg-white text-black px-4 py-2 rounded font-bold text-xs uppercase tracking-wider hover:bg-studio-accent hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Send
                </button>
            </form>
        </div>
    );
};
