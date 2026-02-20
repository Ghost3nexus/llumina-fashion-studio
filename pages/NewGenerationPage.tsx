import React, { useState, useCallback } from 'react';
import { AppShell3Col } from '../components/layout/AppShell3Col';
import { WorkflowPanel } from '../components/new/WorkflowPanel';
import { GenerationCanvas } from '../components/new/GenerationCanvas';
import { BottomActionBar } from '../components/new/BottomActionBar';
import { BatchQueuePanel } from '../components/new/BatchQueuePanel';
import {
    getOutputPurposeConfig,
    PreviewResult,
    BrandProfile,
} from '../services/luminaApi';
import { analyzeClothingItems, generateFashionShot, editImageWithInstruction } from '../services/geminiService';
import {
    buildLightingConfig,
    buildSceneConfig,
    buildMannequinConfig,
    PURPOSE_SHOT_MAP,
    resolveApiKey,
    validateApiKeyFormat,
    API_KEY_STORAGE,
} from '../services/newShootMapping';

const NewGenerationPage: React.FC = () => {
    // Image state
    const [uploadedImages, setUploadedImages] = useState<Record<string, string | null>>({
        tops: null,
        pants: null,
        outer: null,
        inner: null,
        shoes: null,
    });

    // Brand state
    const [selectedBrand, setSelectedBrand] = useState<BrandProfile | null>(null);
    const [savedBrands, setSavedBrands] = useState<BrandProfile[]>([]);

    // Studio state
    const [studioPreset, setStudioPreset] = useState('minimal-luxe');
    const [shotType, setShotType] = useState('full_body_front');
    const [focalLength, setFocalLength] = useState('50mm');
    const [seed, setSeed] = useState('');

    // Model state
    const [gender, setGender] = useState('female');
    const [ageRange, setAgeRange] = useState('youthful');
    const [bodyType, setBodyType] = useState('slim');
    const [vibe, setVibe] = useState('minimalist');
    const [pose, setPose] = useState('ec_neutral');
    const [ethnicity, setEthnicity] = useState('east_asian');
    const [skinTone, setSkinTone] = useState('fair');
    const [hairColor, setHairColor] = useState('black');
    const [hairLength, setHairLength] = useState('medium');
    const [measurements, setMeasurements] = useState('');

    // Output state
    const [selectedPurposes, setSelectedPurposes] = useState<Set<string>>(new Set(['ec']));
    const [resolution, setResolution] = useState<'STD' | 'HD' | 'MAX'>('STD');

    // Generation state
    const [genStatus, setGenStatus] = useState<'idle' | 'generating' | 'complete' | 'error'>('idle');
    const [genResults, setGenResults] = useState<PreviewResult[]>([]);
    const [genError, setGenError] = useState<string>('');

    // Edit state
    const [editingId, setEditingId] = useState<string | null>(null);

    // Confirm HD state
    const [isConfirmingHD, setIsConfirmingHD] = useState(false);

    // API Key state
    const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(false);
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [apiKeyError, setApiKeyError] = useState('');

    // Handlers
    const handleImageUpload = useCallback((type: string, file: File) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            if (typeof result === 'string') {
                setUploadedImages((prev) => ({ ...prev, [type]: result }));
            }
        };
        reader.readAsDataURL(file);
    }, []);

    const handleImageClear = useCallback((type: string) => {
        setUploadedImages((prev) => ({ ...prev, [type]: null }));
    }, []);

    const handleTogglePurpose = useCallback((purpose: string) => {
        setSelectedPurposes((prev) => {
            const next = new Set(prev);
            if (next.has(purpose)) {
                next.delete(purpose);
            } else {
                next.add(purpose);
            }
            return next;
        });
    }, []);

    const handleSaveBrand = useCallback((profile: BrandProfile) => {
        setSavedBrands((prev) => [...prev, profile]);
    }, []);

    const hasImages = Object.values(uploadedImages).some((v) => v !== null);
    const canGenerate = hasImages && selectedPurposes.size > 0;

    const handleGeneratePreview = useCallback(async () => {
        if (!canGenerate) return;

        setGenStatus('generating');
        setGenError('');
        setGenResults([]);

        try {
            // 1) API キー取得
            let apiKey: string;
            try {
                apiKey = await resolveApiKey();
            } catch (keyErr) {
                // キーが未設定の場合はインライン入力フォームを表示
                setGenStatus('idle');
                setShowApiKeyPrompt(true);
                return;
            }

            // 2) アップロード済み画像を Record<string, string> にまとめる
            const validImages: Record<string, string> = {};
            for (const [key, val] of Object.entries(uploadedImages)) {
                if (val) validImages[key] = val;
            }

            // 3) 解析（服の特徴・カラー・素材を Gemini で分析）
            const analysis = await analyzeClothingItems(apiKey, validImages);

            // 4) 用途（EC / Instagram / Ads）それぞれに対して generateFashionShot を並列実行
            const purposeList = Array.from(selectedPurposes).slice(0, 3);

            const results = await Promise.all(
                purposeList.map(async (purpose) => {
                    const shotCfg = PURPOSE_SHOT_MAP[purpose] ?? PURPOSE_SHOT_MAP['ec'];

                    const lighting = buildLightingConfig(studioPreset);
                    const scene = buildSceneConfig(
                        studioPreset,
                        shotCfg.shotType,
                        focalLength,
                        shotCfg.outputPurpose
                    );
                    const mannequin = buildMannequinConfig(
                        gender,
                        ageRange,
                        bodyType,
                        vibe,
                        pose,
                        studioPreset,
                        ethnicity,
                        skinTone,
                        hairColor,
                        hairLength,
                    );

                    // 本物の Gemini 生成（返り値は data:image/png;base64,... 文字列）
                    const imageUrl = await generateFashionShot(
                        apiKey,
                        analysis,
                        lighting,
                        mannequin,
                        scene,
                        validImages
                    );

                    const outputCfg = getOutputPurposeConfig(purpose);

                    return {
                        id: `${purpose}_${Date.now()}`,
                        purpose: outputCfg.label ?? shotCfg.label,
                        imageUrl,
                        aspectRatio: shotCfg.aspectLabel,
                        label: shotCfg.label,
                        status: 'complete' as const,
                    } satisfies PreviewResult;
                })
            );

            setGenResults(results);
            setGenStatus('complete');
        } catch (err) {
            console.error('Generation failed:', err);
            const msg = err instanceof Error ? err.message : String(err);
            // 無効キーエラー → localStorage をクリアしモーダル再表示
            if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
                localStorage.removeItem(API_KEY_STORAGE);
                setGenStatus('idle');
                setApiKeyError('キーが無効でした。正しいキーを入力してください。');
                setShowApiKeyPrompt(true);
            } else {
                setGenError(msg);
                setGenStatus('error');
            }
        }
    }, [
        canGenerate,
        uploadedImages,
        studioPreset,
        focalLength,
        gender,
        ageRange,
        bodyType,
        vibe,
        pose,
        selectedPurposes,
    ]);

    const handleSaveApiKey = useCallback(() => {
        const trimmed = apiKeyInput.trim();
        // 形式チェック（AIza 始まり & 30文字以上）
        if (!validateApiKeyFormat(trimmed)) {
            setApiKeyError('キーの形式が違います。"AIza" で始まる30文字以上のキーを入力してください。');
            return;
        }
        setApiKeyError('');
        localStorage.setItem(API_KEY_STORAGE, trimmed);
        setShowApiKeyPrompt(false);
        setApiKeyInput('');
        // 保存後に自動的に生成を再実行
        handleGeneratePreview();
    }, [apiKeyInput, handleGeneratePreview]);

    const handleDownload = useCallback((result: PreviewResult) => {
        const link = document.createElement('a');
        link.href = result.imageUrl;
        link.download = `lumina-${result.purpose}-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, []);

    // ── EDIT: AI-instrucion refinement ──────────────────────────────────────
    const handleEditApply = useCallback(async (resultId: string, instruction: string) => {
        setEditingId(resultId);
        try {
            const apiKey = await resolveApiKey();
            const result = genResults.find(r => r.id === resultId);
            if (!result) return;
            const newImageUrl = await editImageWithInstruction(apiKey, result.imageUrl, instruction);
            setGenResults(prev => prev.map(r =>
                r.id === resultId ? { ...r, imageUrl: newImageUrl } : r
            ));
        } catch (err) {
            console.error('[Edit] Failed:', err);
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
                localStorage.removeItem(API_KEY_STORAGE);
                setApiKeyError('キーが無効でした。正しいキーを入力してください。');
                setShowApiKeyPrompt(true);
            } else {
                alert(`編集失敗: ${msg}`);
            }
        } finally {
            setEditingId(null);
        }
    }, [genResults]);

    // ── CONFIRM IN HD: re-generate all at MAX quality then download ──────────
    const handleConfirmHD = useCallback(async () => {
        if (genResults.length === 0) return;
        setIsConfirmingHD(true);
        try {
            const apiKey = await resolveApiKey();
            // Re-generate each result sequentially and download
            for (const result of genResults) {
                // result.purpose is a label like "EC Product" or "Ads / Campaign"
                // Map it to the PURPOSE_SHOT_MAP key ('ec', 'instagram', 'ads')
                const labelToKey: Record<string, string> = {
                    'ec product': 'ec',
                    'instagram': 'instagram',
                    'ads / campaign': 'ads',
                    'ads': 'ads',
                    'campaign': 'ads',
                };
                const purposeKey = labelToKey[result.purpose.toLowerCase()] ?? 'ec';
                const shotCfg = PURPOSE_SHOT_MAP[purposeKey] ?? PURPOSE_SHOT_MAP['ec'];
                const analysis = await analyzeClothingItems(apiKey, (() => {
                    const imgs: Record<string, string> = {};
                    Object.entries(uploadedImages).forEach(([k, v]) => { if (v) imgs[k] = v; });
                    return imgs;
                })());
                const lighting = buildLightingConfig(studioPreset);
                const scene = buildSceneConfig(studioPreset, shotType, focalLength, shotCfg.outputPurpose);
                const mannequin = buildMannequinConfig(gender, ageRange, bodyType, vibe, pose, studioPreset, ethnicity, skinTone, hairColor, hairLength);
                const validImages: Record<string, string> = {};
                Object.entries(uploadedImages).forEach(([k, v]) => { if (v) validImages[k] = v; });
                const hdImageUrl = await generateFashionShot(apiKey, analysis, lighting, mannequin, scene, validImages);
                // Auto-download each HD image
                const link = document.createElement('a');
                link.href = hdImageUrl;
                link.download = `lumina-HD-${result.purpose}-${Date.now()}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                // Update result with HD image
                setGenResults(prev => prev.map(r =>
                    r.id === result.id ? { ...r, imageUrl: hdImageUrl } : r
                ));
            }
        } catch (err) {
            console.error('[ConfirmHD] Failed:', err);
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
                localStorage.removeItem(API_KEY_STORAGE);
                setApiKeyError('キーが無効でした。正しいキーを入力してください。');
                setShowApiKeyPrompt(true);
            } else {
                alert(`HD出力失敗: ${msg}`);
            }
        } finally {
            setIsConfirmingHD(false);
        }
    }, [genResults, uploadedImages, studioPreset, shotType, focalLength, gender, ageRange, bodyType, vibe, pose]);

    return (
        <>
            {/* API Key Prompt Modal */}
            {showApiKeyPrompt && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(0,0,0,0.85)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <div style={{
                        background: '#18181b', border: '1px solid #3f3f46',
                        borderRadius: 12, padding: 32, maxWidth: 440, width: '90%',
                    }}>
                        <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
                            🔑 Gemini API Key が必要です
                        </h2>
                        <p style={{ color: '#a1a1aa', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
                            生成にはGemini APIキーが必要です。<br />
                            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer"
                                style={{ color: '#a78bfa', textDecoration: 'underline' }}>
                                aistudio.google.com/apikey
                            </a> で取得できます。
                        </p>
                        {apiKeyError && (
                            <div style={{
                                background: '#450a0a', border: '1px solid #991b1b',
                                borderRadius: 6, padding: '8px 12px', marginBottom: 12,
                                color: '#fca5a5', fontSize: 13,
                            }}>
                                ⚠️ {apiKeyError}
                            </div>
                        )}
                        <input
                            type="password"
                            value={apiKeyInput}
                            onChange={(e) => { setApiKeyInput(e.target.value); setApiKeyError(''); }}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveApiKey()}
                            placeholder="AIza..."
                            style={{
                                width: '100%', boxSizing: 'border-box',
                                background: '#09090b', border: '1px solid #52525b',
                                borderRadius: 8, padding: '10px 14px',
                                color: '#fff', fontSize: 14, marginBottom: 12,
                            }}
                            autoFocus
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                onClick={() => { setShowApiKeyPrompt(false); setApiKeyInput(''); }}
                                style={{
                                    flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid #3f3f46',
                                    background: 'transparent', color: '#a1a1aa', cursor: 'pointer', fontSize: 14,
                                }}
                            >キャンセル</button>
                            <button
                                onClick={handleSaveApiKey}
                                disabled={!apiKeyInput.trim()}
                                style={{
                                    flex: 2, padding: '10px 0', borderRadius: 8, border: 'none',
                                    background: apiKeyInput.trim() ? '#7c3aed' : '#3f3f46',
                                    color: '#fff', cursor: apiKeyInput.trim() ? 'pointer' : 'default',
                                    fontSize: 14, fontWeight: 600,
                                }}
                            >保存して生成</button>
                        </div>
                    </div>
                </div>
            )}
            <AppShell3Col
                left={
                    <WorkflowPanel
                        uploadedImages={uploadedImages}
                        onImageUpload={handleImageUpload}
                        onImageClear={handleImageClear}
                        selectedBrand={selectedBrand}
                        onSelectBrand={setSelectedBrand}
                        savedBrands={savedBrands}
                        onSaveBrand={handleSaveBrand}
                        studioPreset={studioPreset}
                        onSelectStudioPreset={setStudioPreset}
                        shotType={shotType}
                        onShotTypeChange={setShotType}
                        focalLength={focalLength}
                        onFocalLengthChange={setFocalLength}
                        seed={seed}
                        onSeedChange={setSeed}
                        gender={gender}
                        onGenderChange={setGender}
                        ageRange={ageRange}
                        onAgeRangeChange={setAgeRange}
                        bodyType={bodyType}
                        onBodyTypeChange={setBodyType}
                        vibe={vibe}
                        onVibeChange={setVibe}
                        pose={pose}
                        onPoseChange={setPose}
                        ethnicity={ethnicity}
                        onEthnicityChange={setEthnicity}
                        skinTone={skinTone}
                        onSkinToneChange={setSkinTone}
                        hairColor={hairColor}
                        onHairColorChange={setHairColor}
                        hairLength={hairLength}
                        onHairLengthChange={setHairLength}
                        measurements={measurements}
                        onMeasurementsChange={setMeasurements}
                        selectedPurposes={selectedPurposes}
                        onTogglePurpose={handleTogglePurpose}
                        resolution={resolution}
                        onResolutionChange={setResolution}
                        onGenerate={handleGeneratePreview}
                        canGenerate={canGenerate}
                        isGenerating={genStatus === 'generating'}
                    />
                }
                center={
                    <GenerationCanvas
                        results={genResults}
                        status={genStatus}
                        error={genError}
                        onDownload={handleDownload}
                        onRegenerate={handleGeneratePreview}
                        onEdit={handleEditApply}
                        editingId={editingId}
                    />
                }
                right={
                    <BatchQueuePanel
                        results={genResults}
                        status={genStatus}
                        onDownload={handleDownload}
                    />
                }
                bottom={
                    <BottomActionBar
                        onGenerate={handleGeneratePreview}
                        isGenerating={genStatus === 'generating'}
                        canGenerate={canGenerate}
                        outputCount={selectedPurposes.size}
                        isComplete={genStatus === 'complete' && genResults.length > 0}
                        isConfirmingHD={isConfirmingHD}
                        onConfirmHD={handleConfirmHD}
                    />
                }
            />
        </>
    );
};

export default NewGenerationPage;
