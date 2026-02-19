
import React, { useState, useCallback, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import NewGenerationPage from './pages/NewGenerationPage';
import { TopControlPanel } from './components/TopControlPanel';
import RefinementForm from './components/RefinementForm';
import RefinementConfirmation from './components/RefinementConfirmation';
import { AuthProvider } from './components/auth/AuthContext';
import LoginPage from './components/auth/LoginPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { LoadingAnimation } from './components/LoadingAnimation';
import { GenerationHistory, HistoryItem } from './components/GenerationHistory';
import { BatchGenerationPanel } from './components/BatchGenerationPanel';
import {
  LightingConfig,
  MannequinConfig,
  SceneConfig,
  GenerationState,
  DetailedGarmentMeasurements,
  DetailedAccessoryMeasurements,
  DetailedAccessoryPositioning,
  DetailedAccessoryMaterials,
  ClothingType,
  RefinementRequest,
  RefinementInterpretation
} from './types';
import { analyzeClothingItems, generateFashionShot, generateECBatchShots, buildRefinementPrompt, applyRefinementDirectly, BatchShotResult } from './services/geminiService';

const DEFAULT_LIGHTING: LightingConfig = {
  intensity: 1.0,
  positionX: 5,
  positionY: 5,
  positionZ: 5,
  color: '#ffffff'
};

const DEFAULT_MANNEQUIN: MannequinConfig = {
  pose: 'ec_neutral',
  rotation: 0,
  gender: 'female',
  ethnicity: 'east_asian',
  bodyType: 'slim',
  ageGroup: 'youthful',
  vibe: 'minimalist',
  editorialStyle: 'prada_intellectual'
};

const DEFAULT_SCENE: SceneConfig = {
  background: 'studio',
  isSetup: false,
  focalLength: '50mm',
  lightingPreset: 'ec_standard',
  shotType: 'full_body_front',
  outputPurpose: 'ec_product',
  customPrompt: ''
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
    bag: null,
    sunglasses: null,
    glasses: null,
    accessories: null,
    model: null
  });
  const [lighting, setLighting] = useState<LightingConfig>(DEFAULT_LIGHTING);
  const [mannequin, setMannequin] = useState<MannequinConfig>(DEFAULT_MANNEQUIN);
  const [scene, setScene] = useState<SceneConfig>(DEFAULT_SCENE);
  const [genState, setGenState] = useState<GenerationState>({ status: 'idle' });
  const [garmentMeasurements, setGarmentMeasurements] = useState<DetailedGarmentMeasurements>(DEFAULT_GARMENT_MEASUREMENTS);
  const [accessoryMeasurements, setAccessoryMeasurements] = useState<DetailedAccessoryMeasurements>({});
  const [accessoryPositioning, setAccessoryPositioning] = useState<DetailedAccessoryPositioning>({});
  const [accessoryMaterials, setAccessoryMaterials] = useState<DetailedAccessoryMaterials>({});
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [manualKey, setManualKey] = useState<string>('');
  const [isRefining, setIsRefining] = useState(false);
  const [pendingRefinement, setPendingRefinement] = useState<RefinementInterpretation | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | undefined>();
  // EC Batch Generation State
  const [batchResults, setBatchResults] = useState<BatchShotResult[]>([]);
  const [batchStatus, setBatchStatus] = useState<'idle' | 'generating' | 'complete' | 'error'>('idle');
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 5 });
  const [batchSelectedIndex, setBatchSelectedIndex] = useState<number | null>(null);
  const [batchError, setBatchError] = useState<string | undefined>();

  // Panel State - REMOVED (Legacy Resizing)

  // Horizontal Scroll Layout Logic
  // No complex state needed, just CSS scroll snapping

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
        garmentMeasurements,
        accessoryMeasurements,
        accessoryPositioning,
        accessoryMaterials
      );

      setGenState(prev => ({
        ...prev,
        status: 'complete',
        resultUrl: generatedImageUrl
      }));

      // Save to history
      const historyItem: HistoryItem = {
        id: Date.now().toString(),
        imageUrl: generatedImageUrl,
        timestamp: Date.now(),
        params: {
          editorialStyle: mannequin.editorialStyle,
          lightingPreset: scene.lightingPreset,
          shotType: scene.shotType,
          pose: mannequin.pose,
          ethnicity: mannequin.ethnicity,
          gender: mannequin.gender
        }
      };
      setHistory(prev => [historyItem, ...prev].slice(0, 20));
      setCurrentHistoryId(historyItem.id);

    } catch (err: unknown) {
      console.error(err);
      handleError(err);
    }
  };

  const handleRefinementRequest = (request: RefinementRequest) => {
    if (!genState.analysis) return;

    // Build interpretation and show confirmation
    const interpretation = buildRefinementPrompt(request, genState.analysis);
    setPendingRefinement(interpretation);
  };

  const handleConfirmRefinement = async () => {
    if (!genState.analysis || !pendingRefinement) return;

    try {
      setIsRefining(true);
      const apiKey = await getApiKey();

      console.log('=== REFINEMENT START ===');
      console.log('Original Request:', pendingRefinement.originalRequest);
      console.log('Current Analysis:', genState.analysis);

      // Use direct JSON manipulation for clothing items (more reliable)
      const updatedAnalysis = applyRefinementDirectly(
        genState.analysis,
        pendingRefinement.originalRequest
      );

      console.log('Updated Analysis:', updatedAnalysis);
      console.log('=== REFINEMENT END ===');

      // Update local state with new analysis
      setGenState(prev => ({ ...prev, analysis: updatedAnalysis, status: 'generating' }));

      // Re-generate image with updated analysis
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
        garmentMeasurements,
        accessoryMeasurements,
        accessoryPositioning,
        accessoryMaterials
      );

      setGenState(prev => ({
        ...prev,
        status: 'complete',
        resultUrl: generatedImageUrl
      }));

      // Clear pending refinement
      setPendingRefinement(null);

    } catch (err) {
      console.error("Refinement failed:", err);
      handleError(err);
    } finally {
      setIsRefining(false);
    }
  };

  const handleCancelRefinement = () => {
    setPendingRefinement(null);
  };

  // EC Batch Generation
  const handleBatchGenerate = async () => {
    const validImages: Record<string, string> = {};
    for (const [key, val] of Object.entries(uploadedImages) as [string, string | null][]) {
      if (val) validImages[key] = val;
    }
    if (Object.keys(validImages).length === 0) return;

    try {
      setBatchStatus('generating');
      setBatchResults([]);
      setBatchSelectedIndex(null);
      setBatchError(undefined);
      setBatchProgress({ current: 0, total: 5 });
      // Clear single shot result to show batch UI
      setGenState(prev => ({ ...prev, status: 'idle', resultUrl: undefined }));

      const apiKey = await getApiKey();
      const analysis = await analyzeClothingItems(apiKey, validImages);

      await generateECBatchShots(
        apiKey,
        analysis,
        lighting,
        mannequin,
        scene,
        validImages,
        garmentMeasurements,
        accessoryMeasurements,
        accessoryPositioning,
        accessoryMaterials,
        (current, total, result) => {
          setBatchProgress({ current, total });
          if (result) {
            setBatchResults(prev => [...prev, result]);
            // Auto-select first completed shot
            if (current === 1) setBatchSelectedIndex(0);
          }
        }
      );

      setBatchStatus('complete');
      setBatchSelectedIndex(0);
    } catch (err: unknown) {
      console.error('Batch generation failed:', err);
      setBatchError(err instanceof Error ? err.message : String(err));
      setBatchStatus('error');
      handleError(err);
    }
  };

  const handleBatchDownloadAll = () => {
    batchResults.forEach((result, i) => {
      const link = document.createElement('a');
      link.href = result.imageUrl;
      link.download = `lumina-ec-${result.label.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;
      document.body.appendChild(link);
      setTimeout(() => { link.click(); document.body.removeChild(link); }, i * 300);
    });
  };

  const handleBatchDownloadSingle = (result: BatchShotResult) => {
    const link = document.createElement('a');
    link.href = result.imageUrl;
    link.download = `lumina-ec-${result.label.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    <div className="flex flex-row h-[100dvh] bg-studio-950 text-white font-sans overflow-x-auto overflow-y-hidden snap-x snap-mandatory">

      {/* Slide 1: Controls */}
      <div className="min-w-[100vw] w-[100vw] h-full snap-start flex flex-col">
        <TopControlPanel
          onImageUpload={handleImageUpload}
          lighting={lighting}
          setLighting={setLighting}
          mannequin={mannequin}
          setMannequin={setMannequin}
          scene={scene}
          setScene={setScene}
          onGenerate={handleGenerate}
          onBatchGenerate={handleBatchGenerate}
          genState={genState}
          uploadedImages={uploadedImages}
          garmentMeasurements={garmentMeasurements}
          setGarmentMeasurements={setGarmentMeasurements}
          accessoryMeasurements={accessoryMeasurements}
          setAccessoryMeasurements={setAccessoryMeasurements}
          accessoryPositioning={accessoryPositioning}
          setAccessoryPositioning={setAccessoryPositioning}
          accessoryMaterials={accessoryMaterials}
          setAccessoryMaterials={setAccessoryMaterials}
          onApiSettings={() => {
            localStorage.removeItem('gemini_api_key');
            setHasApiKey(false);
            setManualKey('');
          }}
        />
      </div>

      {/* Slide 2: Main Workspace (Single Shot / Preview) */}
      <div className="min-w-[100vw] w-[100vw] h-full snap-start flex overflow-hidden min-h-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] relative">
        <main className="flex-1 p-6 flex gap-6 overflow-hidden h-full items-start justify-center">

          <div className="flex flex-col h-full w-full max-w-5xl transition-all duration-500 ease-in-out">
            {genState.resultUrl ? (
              // Result View
              <div className="flex-1 flex flex-col animate-fadeIn h-full min-h-0">
                <div className="flex-1 rounded-2xl overflow-hidden border border-studio-accent/20 shadow-[0_0_50px_-12px_rgba(139,92,246,0.3)] bg-black relative group mb-3">
                  <img src={genState.resultUrl} alt="Output" className="w-full h-full object-contain" />
                </div>

                {/* Action Bar */}
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={handleDownload}
                    className="flex-1 py-2.5 bg-white text-black rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-studio-accent hover:text-white transition-colors flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Download
                  </button>
                  <button
                    onClick={handleGenerate}
                    className="flex-1 py-2.5 bg-studio-700 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-studio-600 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    Re-generate
                  </button>
                  <button
                    onClick={() => {
                      const params = { mannequin: { editorialStyle: mannequin.editorialStyle, lightingPreset: scene.lightingPreset, shotType: scene.shotType, pose: mannequin.pose, ethnicity: mannequin.ethnicity }, scene: { focalLength: scene.focalLength, background: scene.background } };
                      navigator.clipboard.writeText(JSON.stringify(params, null, 2));
                    }}
                    className="py-2.5 px-3 bg-studio-800 text-gray-400 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-studio-700 hover:text-white transition-colors border border-studio-700"
                    title="Copy Parameters"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                  </button>
                </div>

                {/* Generation History */}
                <div className="h-24 flex-shrink-0">
                  <GenerationHistory
                    items={history}
                    currentId={currentHistoryId}
                    onSelect={(item) => {
                      setGenState(prev => ({ ...prev, resultUrl: item.imageUrl, status: 'complete' }));
                      setCurrentHistoryId(item.id);
                    }}
                    onReuse={(item) => {
                      setMannequin(prev => ({ ...prev, editorialStyle: item.params.editorialStyle as any, pose: item.params.pose as any, ethnicity: item.params.ethnicity as any, gender: item.params.gender as any }));
                      setScene(prev => ({ ...prev, lightingPreset: item.params.lightingPreset as any, shotType: item.params.shotType as any }));
                    }}
                  />
                </div>

                <div className="bg-studio-800 rounded-xl border border-studio-700 p-4 mt-3">
                  {pendingRefinement ? (
                    <RefinementConfirmation
                      interpretation={pendingRefinement}
                      onConfirm={handleConfirmRefinement}
                      onCancel={handleCancelRefinement}
                      isProcessing={isRefining}
                    />
                  ) : (
                    <RefinementForm
                      onSubmit={handleRefinementRequest}
                      uploadedImages={uploadedImages}
                      isProcessing={isRefining}
                    />
                  )}
                </div>
              </div>
            ) : (
              // Studio Ready / Loading View
              <div className="flex-1 flex flex-col h-full bg-studio-800/50 rounded-2xl border border-studio-700 overflow-hidden relative">
                {(genState.status === 'analyzing' || genState.status === 'generating') ? (
                  <LoadingAnimation stage={genState.status} />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
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
                      <p className="text-gray-600 text-xs">Configure your shot in the top panel and click Generate</p>
                    </div>
                  </div>
                )}
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="px-2 py-1 bg-black/60 rounded text-[8px] uppercase font-bold text-white/50 backdrop-blur-md">Layout Preview</span>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Slide 3: EC Batch Workspace (Right) - Only if active */}
      {batchStatus !== 'idle' && (
        <div className="min-w-[100vw] w-[100vw] h-full snap-start flex flex-col min-w-0 bg-studio-800/30 border border-studio-700/50 p-4">
          <BatchGenerationPanel
            status={batchStatus}
            currentShot={batchProgress.current}
            totalShots={batchProgress.total}
            results={batchResults}
            selectedIndex={batchSelectedIndex}
            onSelectShot={setBatchSelectedIndex}
            onDownloadAll={handleBatchDownloadAll}
            onDownloadSingle={handleBatchDownloadSingle}
            error={batchError}
          />
        </div>
      )}

      {/* Slide Navigation Arrows (Floating) */}
      <div className="fixed bottom-6 right-6 z-50 flex gap-2">
        <button
          onClick={() => {
            document.querySelector('.snap-x')?.scrollBy({ left: -window.innerWidth, behavior: 'smooth' });
          }}
          className="p-4 bg-studio-800 text-white rounded-full shadow-lg border border-studio-600 hover:bg-studio-700 active:scale-95 transition-all"
          title="Previous Slide"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button
          onClick={() => {
            document.querySelector('.snap-x')?.scrollBy({ left: window.innerWidth, behavior: 'smooth' });
          }}
          className="p-4 bg-studio-accent text-white rounded-full shadow-lg border border-studio-500 hover:bg-studio-600 active:scale-95 transition-all"
          title="Next Slide"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
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
          <Route
            path="/app/new"
            element={
              <ProtectedRoute>
                <NewGenerationPage />
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
