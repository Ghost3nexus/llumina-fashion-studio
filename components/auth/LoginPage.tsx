
import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { Sparkles, ArrowRight, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        await login(email);
        setIsSubmitting(false);
        navigate('/');
    };

    return (
        <div className="flex min-h-screen bg-black font-sans">
            {/* Left: Branding & Visual */}
            <div className="hidden lg:flex w-1/2 bg-studio-900 relative overflow-hidden items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-studio-800 to-black opacity-60 z-10" />
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=2574&auto=format&fit=crop')] bg-cover bg-center opacity-40 mix-blend-overlay" />

                <div className="z-20 text-center p-12">
                    <div className="flex justify-center mb-6">
                        <Sparkles className="w-16 h-16 text-studio-accent animate-pulse" />
                    </div>
                    <h1 className="text-5xl font-light tracking-widest text-white mb-4">
                        LUMINA <span className="font-bold text-studio-accent">STUDIO</span>
                    </h1>
                    <p className="text-gray-400 text-lg tracking-wide font-light max-w-md mx-auto">
                        The next generation of AI-powered fashion visualization.
                        Transform your sketches into photorealistic editorials in seconds.
                    </p>
                </div>
            </div>

            {/* Right: Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-studio-950">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold text-white tracking-tight">Welcome Back</h2>
                        <p className="mt-2 text-sm text-gray-500">
                            Sign in to access your studio workspace.
                        </p>
                    </div>

                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="email" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                    Email Address
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-studio-900 border border-studio-800 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-studio-accent focus:ring-1 focus:ring-studio-accent transition-all"
                                    placeholder="name@fashion.com"
                                />
                            </div>
                            <div>
                                <label htmlFor="password" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                    Password
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-studio-900 border border-studio-800 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-studio-accent focus:ring-1 focus:ring-studio-accent transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    className="h-4 w-4 rounded bg-studio-900 border-studio-700 text-studio-accent focus:ring-studio-accent"
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-400">
                                    Remember me
                                </label>
                            </div>

                            <div className="text-sm">
                                <a href="#" className="font-medium text-studio-accent hover:text-studio-400 transition-colors">
                                    Forgot password?
                                </a>
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`group relative flex w-full justify-center rounded-lg bg-white px-4 py-3 text-sm font-bold text-black uppercase tracking-widest hover:bg-studio-accent hover:text-white transition-all shadow-xl hover:shadow-studio-accent/20 ${isSubmitting ? 'opacity-70 cursor-wait' : ''}`}
                            >
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Lock className="h-4 w-4 text-studio-300 group-hover:text-white transition-colors" />
                                </span>
                                {isSubmitting ? 'Signing in...' : 'Sign In'}
                                {!isSubmitting && (
                                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1">
                                        <ArrowRight className="h-4 w-4" />
                                    </span>
                                )}
                            </button>
                        </div>
                    </form>

                    <p className="mt-2 text-center text-xs text-gray-600">
                        For demo purposes, any email and password will work.
                    </p>
                </div>
            </div>
        </div>
    );
}
