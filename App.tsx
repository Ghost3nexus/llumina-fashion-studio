
import React, { useState, useCallback, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ControlPanel from './components/ControlPanel';
import { RefinementChat } from './components/RefinementChat';
import { AuthProvider } from './components/auth/AuthContext';
import LoginPage from './components/auth/LoginPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { LoadingAnimation } from './components/LoadingAnimation';
import {
  LightingConfig,
  MannequinConfig,
  SceneConfig,
  GenerationState,
  DetailedGarmentMeasurements,
  ClothingType
} from './types';
import { analyzeClothingItems, generateFashionShot, interpretModification } from './services/geminiService';

const DEFAULT_LIGHTING: LightingConfig = {
  intensity: 1.0,
  positionX: 5,
  positionY: 5,
  positionZ: 5,
  color: '#ffffff'
};

const DEFAULT_MANNEQUIN: MannequinConfig = {
  pose: 'standing',
  rotation: 0,
  gender: 'female',
  ethnicity: 'asian',
  bodyType: 'slim',
  ageGroup: 'youthful',
  vibe: 'minimalist',
  editorialStyle: 'vogue'
};

const DEFAULT_SCENE: SceneConfig = {
  background: 'studio',
  isSetup: false,
  focalLength: '50mm',
  lightingPreset: 'studio',
  shotType: 'full_body'
};

const DEFAULT_GARMENT_MEASUREMENTS: DetailedGarmentMeasurements = {
  tops: {},
  pants: {},
  outer: {}
};

// Main Studio Application Logic
const MainApp: React.FC = () => {
  const [uploadedImages, setUploadedImages] = useState<Record<ClothingType, string | null>>({
    tops: null,
    pants: null,
    outer: null,
    inner: null,
    shoes: null,
    model: null
  });
  const [lighting, setLighting] = useState<LightingConfig>(DEFAULT_LIGHTING);
  const [mannequin, setMannequin] = useState<MannequinConfig>(DEFAULT_MANNEQUIN);
  const [scene, setScene] = useState<SceneConfig>(DEFAULT_SCENE);
  const [genState, setGenState] = useState<GenerationState>({ status: 'idle' });
  const [garmentMeasurements, setGarmentMeasurements] = useState<DetailedGarmentMeasurements>(DEFAULT_GARMENT_MEASUREMENTS);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [manualKey, setManualKey] = useState<string>('');
  const [isRefining, setIsRefining] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      if (import.meta.env.VITE_API_KEY) {
        setHasApiKey(true);
        return;
      }
      const storedKey = localStorage.getItem('gemini_api_key');
      if (storedKey) {
        setHasApiKey(true);
        return;
      }
      try {
        const key = await (window.aistudio as any).getApiKey?.();
        if (key) {
          localStorage.setItem('gemini_api_key', key);
          setHasApiKey(true);
          return;
        }
      } catch (e) {
        console.warn("Could not retrieve key from aistudio", e);
      }
      setHasApiKey(false);
    };
    checkKey();
  }, []);

  const handleConnectKey = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        setHasApiKey(true);
      } catch (e) {
        console.error("Key selection failed", e);
      }
    } else {
      // If no AI Studio, manual input is always available
    }
  };

  const handleSaveManualKey = () => {
    if (!manualKey.trim()) return;
    localStorage.setItem('gemini_api_key', manualKey.trim());
    setHasApiKey(true);
  };

  const getApiKey = async (): Promise<string> => {
    const stored = localStorage.getItem('gemini_api_key');
    if (stored) return stored;
    if (window.aistudio) {
      try {
        const key = await (window.aistudio as any).getApiKey?.();
        if (key) return key;
      } catch (e) {
        console.warn("Could not retrieve key from aistudio", e);
      }
    }
    throw new Error("API Key not found. Please enter your Gemini API key from https://aistudio.google.com/apikey");
  };

  const handleError = useCallback((err: unknown) => {
    const errorMessage: string = err instanceof Error ? err.message : String(err);

    if (errorMessage.includes('403') || errorMessage.includes('Permission denied') || errorMessage.includes('API Key') || errorMessage.includes('Requested entity was not found')) {
      setHasApiKey(false);
      localStorage.removeItem('gemini_api_key');

      setGenState(prev => ({
        ...prev,
        status: 'error',
        error: 'Access denied or missing API Key. Please connect a valid project or check your key.'
      }));
    } else {
      setGenState(prev => ({
        ...prev,
        status: 'error',
        error: errorMessage || 'An unknown error occurred'
      }));
    }
  }, []);

  const handleImageUpload = useCallback((type: ClothingType, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        setUploadedImages(prev => ({ ...prev, [type]: result }));
        setGenState({ status: 'idle' });
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDownload = () => {
    if (!genState.resultUrl) return;
    const link = document.createElement('a');
    link.href = genState.resultUrl;
    link.download = `lumina - shot - ${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerate = async () => {
    const validImages: Record<string, string> = {};
    for (const [key, val] of Object.entries(uploadedImages) as [string, string | null][]) {
      if (val) validImages[key] = val;
    }

    if (Object.keys(validImages).length === 0) return;

    try {
      setGenState(prev => ({ ...prev, status: 'analyzing', error: undefined }));

      const apiKey = await getApiKey();

      const analysis = await analyzeClothingItems(apiKey, validImages);
      setGenState(prev => ({ ...prev, status: 'generating', analysis }));

      const generatedImageUrl = await generateFashionShot(
        apiKey,
        analysis,
        lighting,
        mannequin,
        scene,
        validImages,
        garmentMeasurements
      );

      setGenState(prev => ({
        ...prev,
        status: 'complete',
        resultUrl: generatedImageUrl
      }));

    } catch (err: unknown) {
      console.error(err);
      handleError(err);
    }
  };

  const handleRefine = async (instruction: string) => {
    if (!genState.analysis) return;

    try {
      setIsRefining(true);
      const apiKey = await getApiKey();

      // 1. Interpret user instruction to update analysis
      const updatedAnalysis = await interpretModification(
        apiKey,
        genState.analysis,
        instruction
      );

      // Update local state with new analysis
      setGenState(prev => ({ ...prev, analysis: updatedAnalysis, status: 'generating' }));

      // 2. Re-generate image with updated analysis
      const validImages: Record<string, string> = {};
      for (const [key, val] of Object.entries(uploadedImages) as [string, string | null][]) {
        if (val) validImages[key] = val;
      }

      const generatedImageUrl = await generateFashionShot(
        apiKey,
        updatedAnalysis,
        lighting,
        mannequin,
        scene,
        validImages,
        garmentMeasurements
      );

      setGenState(prev => ({
        ...prev,
        status: 'complete',
        resultUrl: generatedImageUrl
      }));

    } catch (err) {
      console.error("Refinement failed:", err);
      handleError(err);
    } finally {
      setIsRefining(false);
    }
  };

  if (hasApiKey === false) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-studio-900 text-white font-sans p-4">
        <div className="max-w-md w-full bg-studio-800 border border-studio-700 p-8 rounded-xl shadow-2xl text-center">
          <h1 className="text-2xl font-light tracking-widest mb-4">LUMINA <span className="font-bold text-studio-accent">STUDIO</span></h1>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">High-fidelity fashion rendering requires a paid Gemini 3 Pro project key.</p>

          <div className="space-y-3">
            {window.aistudio && (
              <button onClick={handleConnectKey} className="w-full py-3 bg-white text-black font-semibold rounded hover:bg-studio-accent hover:text-white transition-all mb-2">
                Connect Project (Project IDX)
              </button>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-studio-700"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-studio-800 px-2 text-gray-500">Or enter manually</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <input
                type="password"
                placeholder="Paste your Gemini API Key"
                className="w-full bg-studio-900 border border-studio-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-studio-accent transition-colors"
                value={manualKey}
                onChange={(e) => setManualKey(e.target.value)}
              />
              <button
                onClick={handleSaveManualKey}
                disabled={!manualKey}
                className="w-full py-2 bg-studio-700 text-white text-sm font-semibold rounded hover:bg-studio-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Save API Key
              </button>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-600">Keys are stored locally in your browser.</p>
        </div>
      </div>
    );
  }

  if (hasApiKey === null) {
    return (
      <div className="flex h-screen bg-studio-900 items-center justify-center">
        <div className="w-6 h-6 border-2 border-studio-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-studio-900 text-white overflow-hidden font-sans">
      <div className="w-80 md:w-96 flex-shrink-0 z-20 shadow-xl border-r border-studio-700">
        <ControlPanel
          onImageUpload={handleImageUpload}
          lighting={lighting}
          setLighting={setLighting}
          mannequin={mannequin}
          setMannequin={setMannequin}
          scene={scene}
          setScene={setScene}
          onGenerate={handleGenerate}
          genState={genState}
          uploadedImages={uploadedImages}
          garmentMeasurements={garmentMeasurements}
          setGarmentMeasurements={setGarmentMeasurements}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]">
        <header className="h-16 flex items-center justify-between px-8 border-b border-studio-700/50 backdrop-blur-sm bg-studio-900/50 z-10">
          <div className="flex items-center space-x-4">
            <h2 className="text-xs font-bold tracking-widest uppercase text-gray-400">
              {scene.isSetup ? 'Studio Setup' : 'Render Preview'}
            </h2>
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-[10px] uppercase tracking-widest text-gray-500">
              {genState.status === 'idle' ? 'Ready' : genState.status}
            </div>
            <div className="h-4 w-px bg-studio-700"></div>
            <button
              onClick={() => {
                localStorage.removeItem('gemini_api_key');
                setHasApiKey(false);
                setManualKey('');
              }}
              className="text-[9px] uppercase tracking-wider text-gray-500 font-bold hover:text-studio-accent transition-colors flex items-center space-x-1"
              title="Change API Key"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>API Settings</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-8 flex gap-8 overflow-hidden">
          <div className={`transition-all duration-700 ease-in-out flex flex-col ${genState.resultUrl ? 'w-1/3' : 'w-full'}`}>
            {(genState.status === 'analyzing' || genState.status === 'generating') ? (
              <LoadingAnimation stage={genState.status} />
            ) : (
              <div className="flex-1 rounded-2xl overflow-hidden border border-studio-700 relative bg-studio-800 shadow-2xl flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="text-6xl mb-6 transform hover:scale-110 transition-transform duration-500 cursor-default">📸</div>
                  <h2 className="text-xl font-light tracking-[0.2em] mb-4 text-white">STUDIO READY</h2>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-[10px] uppercase tracking-widest text-gray-400 text-left border-t border-b border-studio-700/50 py-4 my-4 max-w-xs mx-auto">
                    <span>Shot Type</span> <span className="text-right text-studio-accent font-bold">{scene.shotType.replace('_', ' ')}</span>
                    <span>Lighting</span> <span className="text-right text-white">{scene.lightingPreset.replace('_', ' ')}</span>
                    <span>Style</span> <span className="text-right text-white">{mannequin.editorialStyle}</span>
                    <span>Lens</span> <span className="text-right text-white">{scene.focalLength}</span>
                    <span>Pose</span> <span className="text-right text-white">{mannequin.pose.replace(/_/g, ' ')}</span>
                    <span>Model</span> <span className="text-right text-white">{mannequin.gender} / {mannequin.ethnicity}</span>
                  </div>
                  <p className="text-gray-600 text-xs">Configure your shot and click Generate</p>
                </div>
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="px-2 py-1 bg-black/60 rounded text-[8px] uppercase font-bold text-white/50 backdrop-blur-md">Layout Preview</span>
                </div>
              </div>
            )}
          </div>

          {genState.resultUrl && (
            <div className="flex-1 flex flex-col animate-fadeIn h-full">
              <div className="flex-1 rounded-2xl overflow-hidden border border-studio-accent/20 shadow-[0_0_50px_-12px_rgba(139,92,246,0.3)] bg-black relative group mb-4">
                <img src={genState.resultUrl} alt="Output" className="w-full h-full object-contain" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/40 to-transparent p-8 translate-y-full group-hover:translate-y-0 transition-transform duration-500">
                  <div className="flex justify-between items-end">
                    <div>
                      <h3 className="text-white font-light text-lg tracking-wider">Professional Shot</h3>
                      <p className="text-gray-400 text-[10px] uppercase tracking-widest mt-1">2K • {scene.lightingPreset} • {mannequin.editorialStyle}</p>
                    </div>
                    <button onClick={handleDownload} className="px-6 py-2.5 bg-white text-black rounded-full font-bold text-[10px] uppercase tracking-tighter hover:bg-studio-accent hover:text-white transition-colors">Download Asset</button>
                  </div>
                </div>
              </div>
              <RefinementChat onSend={handleRefine} isProcessing={isRefining} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

// Root App Component
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainApp />
              </ProtectedRoute>
            }
          />
          {/* Catch all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
