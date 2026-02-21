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
import { analyzeClothingItems, generateFashionShot, editImageWithInstruction, generateSnsStyleTransform, SnsStyleKey } from '../services/geminiService';
import { SnsStyleModal } from '../components/new/SnsStyleModal';
import {
    buildLightingConfig,
    buildSceneConfig,
    buildMannequinConfig,
    PURPOSE_SHOT_MAP,
    EC_VIEW_SHOTS,
    resolveApiKey,
    validateApiKeyFormat,
    API_KEY_STORAGE,
} from '../services/newShootMapping';
import type { GarmentSpec } from '../types';


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

    // SNS style transform modal state
    const [snsTarget, setSnsTarget] = useState<{ id: string; imageUrl: string; label: string } | null>(null);
    const [snsGenerating, setSnsGenerating] = useState(false);

    // EC multi-view state (default: front + back)
    const [ecViews, setEcViews] = useState<Set<string>>(new Set(['ec_front', 'ec_back']));

    // Campaign style reference image
    const [campaignRefImage, setCampaignRefImage] = useState<string | null>(null);
    const handleCampaignRefImageChange = useCallback((b64: string | null) => {
        setCampaignRefImage(b64);
    }, []);

    // ─── EC Hero Product & Garment Sizing ─────────────────────────────────────
    // heroProduct: which garment is being featured on this EC page
    const [heroProduct, setHeroProduct] = useState<string | null>(null);
    // garmentSpecs: user-provided sizing/material per garment category
    const [garmentSpecs, setGarmentSpecs] = useState<Record<string, GarmentSpec>>({});

    const handleHeroProductChange = useCallback((itemKey: string | null) => {
        setHeroProduct(itemKey);
    }, []);

    const handleGarmentSpecChange = useCallback((itemKey: string, spec: GarmentSpec) => {
        setGarmentSpecs(prev => ({ ...prev, [itemKey]: spec }));
    }, []);


    const handleToggleEcView = useCallback((view: string) => {
        setEcViews(prev => {
            const next = new Set(prev);
            if (next.has(view)) {
                // prevent deselecting last remaining view
                if (next.size > 1) next.delete(view);
            } else {
                next.add(view);
            }
            return next;
        });
    }, []);

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

    // Alt angle images: itemKey → [b64_0, b64_1, b64_2]
    const [altImages, setAltImages] = useState<Record<string, string[]>>({});

    const handleAltImageUpload = useCallback((itemKey: string, index: number, file: File) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            if (typeof result === 'string') {
                setAltImages(prev => {
                    const arr = [...(prev[itemKey] ?? [])];
                    arr[index] = result;
                    return { ...prev, [itemKey]: arr };
                });
            }
        };
        reader.readAsDataURL(file);
    }, []);

    const handleAltImageClear = useCallback((itemKey: string, index: number) => {
        setAltImages(prev => {
            const arr = [...(prev[itemKey] ?? [])];
            arr[index] = '';
            return { ...prev, [itemKey]: arr };
        });
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
    const ecValid = !selectedPurposes.has('ec') || ecViews.size > 0;
    const canGenerate = hasImages && selectedPurposes.size > 0 && ecValid;

    // ─── Back-shot warning: ec_back selected but no alt[0] (back) images uploaded ───
    const hasBackAltImages = Object.values(altImages).some(alts => alts[0]);
    const needsBackWarning = ecViews.has('ec_back') && !hasBackAltImages;

    // ─── Canvas bust-up crop helper (upper 42% of image = head to mid-chest) ──────
    // This ensures bust-up ALWAYS shows the exact same garment as the front shot.
    const cropBustUp = (dataUrl: string): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Target 3:4 portrait — crop the top ~42% of the image
                const cropHeightRatio = 0.42;
                const srcHeight = Math.round(img.height * cropHeightRatio);
                const srcWidth = img.width;

                // Output canvas: maintain 3:4 ratio
                const outW = srcWidth;
                const outH = Math.round(srcWidth * (4 / 3));
                canvas.width = outW;
                canvas.height = outH;
                const ctx = canvas.getContext('2d')!;

                // Fill white background
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, outW, outH);

                // Draw cropped portion, scaled to fill canvas
                ctx.drawImage(img, 0, 0, srcWidth, srcHeight, 0, 0, outW, outH);
                resolve(canvas.toDataURL('image/jpeg', 0.95));
            };
            img.src = dataUrl;
        });
    };

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

            // 2) アップロード済み画像を Record<string, string> にまとめ、alt images も合流させる
            const validImages: Record<string, string> = {};
            for (const [key, val] of Object.entries(uploadedImages)) {
                if (val) validImages[key] = val;
            }
            // Merge alt angle images as tops_alt_0, tops_alt_1, etc.
            for (const [itemKey, alts] of Object.entries(altImages)) {
                alts.forEach((b64, i) => {
                    if (b64) validImages[`${itemKey}_alt_${i}`] = b64;
                });
            }
            // Campaign style reference
            if (campaignRefImage) validImages['campaign_style_ref'] = campaignRefImage;

            // 3) 解析（服の特徴・カラー・素材を Gemini で分析）
            const analysis = await analyzeClothingItems(apiKey, validImages);

            // 4) Build purpose list — expand EC into selected views
            const purposeList: string[] = [];
            for (const purpose of selectedPurposes) {
                if (purpose === 'ec') {
                    for (const view of ecViews) purposeList.push(view);
                } else {
                    purposeList.push(purpose);
                }
            }

            // ─── Sequential generation with anchor_model chaining ───────────────
            // EC multi-view: generate ec_front first, chain its result as anchor
            const ecViewKeys = new Set(['ec_front', 'ec_back', 'ec_side', 'ec_top', 'ec_bottom']);
            const ecPurposes = purposeList.filter(p => ecViewKeys.has(p));
            const nonEcPurposes = purposeList.filter(p => !ecViewKeys.has(p));

            // Sort EC purposes: ec_front first, ec_top last (Canvas crop)
            const orderedEcPurposes = [
                ...ecPurposes.filter(p => p === 'ec_front'),
                ...ecPurposes.filter(p => p !== 'ec_front' && p !== 'ec_top'),
                ...ecPurposes.filter(p => p === 'ec_top'),
            ];

            const results: PreviewResult[] = [];

            // Track the anchor image — set after ec_front completes
            let anchorModelBase64: string | null = null;

            // Generate EC shots sequentially (anchor_model chained from ec_front)
            for (const purpose of orderedEcPurposes) {


                const shotCfg = EC_VIEW_SHOTS[purpose] ?? PURPOSE_SHOT_MAP[purpose] ?? PURPOSE_SHOT_MAP['ec'];

                // ── ec_top (バストアップ): Canvas crop from ec_front — no AI generation ──
                // This guarantees 100% garment consistency (no AI re-invention of clothing).
                if (purpose === 'ec_top' && anchorModelBase64) {
                    const bustUrl = await cropBustUp(anchorModelBase64);
                    const outputCfg = getOutputPurposeConfig(purpose);
                    results.push({
                        id: `${purpose}_${Date.now()}`,
                        purpose: outputCfg.label ?? shotCfg.label,
                        imageUrl: bustUrl,
                        aspectRatio: shotCfg.aspectLabel,
                        label: shotCfg.label,
                        status: 'complete' as const,
                    });
                    continue; // Skip AI generation for this shot
                }

                const lighting = buildLightingConfig(studioPreset);
                const scene = buildSceneConfig(
                    studioPreset,
                    shotCfg.shotType,
                    focalLength,
                    shotCfg.outputPurpose
                );

                // ── Pose override for back/side shots: always ec_natural ──────────────
                // ec_back and ec_side must NOT use editorial/relaxed poses —
                // they need neutral arms-at-sides for consistent garment documentation.
                const effectivePose = (purpose === 'ec_back' || purpose === 'ec_side')
                    ? 'ec_natural'
                    : pose;

                const mannequin = buildMannequinConfig(
                    gender, ageRange, bodyType, vibe, effectivePose,
                    studioPreset, ethnicity, skinTone, hairColor, hairLength,
                );

                // Build images dict with base_model + anchor for remaining EC shots
                const shotImages: Record<string, string> = { ...validImages };
                if (anchorModelBase64) {
                    shotImages['anchor_model'] = anchorModelBase64;
                }

                const imageUrl = await generateFashionShot(
                    apiKey, analysis, lighting, mannequin, scene, shotImages,
                    undefined, undefined, undefined, undefined,
                    { heroProduct, specs: garmentSpecs }
                );



                const outputCfg = getOutputPurposeConfig(purpose);
                results.push({
                    id: `${purpose}_${Date.now()}`,
                    purpose: outputCfg.label ?? shotCfg.label,
                    imageUrl,
                    aspectRatio: shotCfg.aspectLabel,
                    label: shotCfg.label,
                    status: 'complete' as const,
                });

                // After ec_front completes, store result as anchor for subsequent shots
                if (purpose === 'ec_front') {
                    anchorModelBase64 = imageUrl;
                }
            }


            // Non-EC purposes (Instagram, Ads) — generate in parallel since they don't share anchor
            const nonEcResults = await Promise.all(
                nonEcPurposes.map(async (purpose) => {
                    const shotCfg = PURPOSE_SHOT_MAP[purpose] ?? PURPOSE_SHOT_MAP['ec'];

                    const lighting = buildLightingConfig(studioPreset);
                    const scene = buildSceneConfig(
                        studioPreset,
                        shotCfg.shotType,
                        focalLength,
                        shotCfg.outputPurpose
                    );
                    // Campaign/Instagram: override pose to prevent EC display poses
                    const effectivePose = (() => {
                        if (shotCfg.outputPurpose === 'campaign') {
                            return pose.startsWith('editorial') ? pose : 'editorial_power';
                        }
                        if (shotCfg.outputPurpose === 'instagram') {
                            return pose.startsWith('lifestyle') ? pose : 'lifestyle_candid';
                        }
                        return pose;
                    })();
                    const mannequin = buildMannequinConfig(
                        gender, ageRange, bodyType, vibe, effectivePose,
                        studioPreset, ethnicity, skinTone, hairColor, hairLength,
                    );

                    // Inject fitted model as anchor for identity + outfit consistency
                    const nonEcImages: Record<string, string> = { ...validImages };
                    if (anchorModelBase64) {
                        nonEcImages['anchor_model'] = anchorModelBase64;
                    }

                    const imageUrl = await generateFashionShot(
                        apiKey, analysis, lighting, mannequin, scene, nonEcImages,
                        undefined, undefined, undefined, undefined,
                        { heroProduct, specs: garmentSpecs }
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

            results.push(...nonEcResults);

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
        altImages,
        studioPreset,
        focalLength,
        gender,
        ageRange,
        bodyType,
        vibe,
        pose,
        ethnicity,
        skinTone,
        hairColor,
        hairLength,
        selectedPurposes,
        ecViews,
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

    // ── SNS STYLE TRANSFORM handler ──────────────────────────────────────────
    const handleSnsGenerate = useCallback(async (styleKey: SnsStyleKey) => {
        if (!snsTarget) return;
        setSnsGenerating(true);
        try {
            const apiKey = await resolveApiKey();
            const snsImageUrl = await generateSnsStyleTransform(
                apiKey,
                snsTarget.imageUrl,
                styleKey,
            );
            // Add the SNS result to genResults
            const styleDef = (await import('../services/geminiService')).SNS_STYLES.find(s => s.key === styleKey);
            const snsResult: PreviewResult = {
                id: `sns-${styleKey}-${Date.now()}`,
                imageUrl: snsImageUrl,
                label: `${styleDef?.icon ?? '📱'} ${styleDef?.label ?? styleKey}`,
                purpose: 'SNS',
                aspectRatio: '1:1',
                status: 'complete' as const,
            };
            setGenResults(prev => [...prev, snsResult]);
            setSnsTarget(null);
        } catch (err) {
            console.error('[SNS Transform] Failed:', err);
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
                localStorage.removeItem(API_KEY_STORAGE);
                setApiKeyError('キーが無効でした。正しいキーを入力してください。');
                setShowApiKeyPrompt(true);
            } else {
                alert(`SNS変換失敗: ${msg}`);
            }
        } finally {
            setSnsGenerating(false);
        }
    }, [snsTarget]);

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
                    <div className="flex flex-col h-full">
                        {/* Back-shot accuracy warning banner */}
                        {needsBackWarning && (
                            <div className="mx-3 mt-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-[10px] text-amber-300 leading-relaxed flex-shrink-0">
                                <span className="font-bold">⚠️ 背面精度UP推奨:</span>{' '}
                                各衣装の「背面 Back」写真を追加すると、EC Backショットの正確性が大幅に向上します。
                                <br />
                                <span className="text-amber-400/60">Step 1 → 衣装 → 「+ アングル追加」→ 背面</span>
                            </div>
                        )}
                        <WorkflowPanel
                            uploadedImages={uploadedImages}
                            onImageUpload={handleImageUpload}
                            onImageClear={handleImageClear}
                            altImages={altImages}
                            onAltImageUpload={handleAltImageUpload}
                            onAltImageClear={handleAltImageClear}
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
                            ecViews={ecViews}
                            onToggleEcView={handleToggleEcView}
                            campaignRefImage={campaignRefImage}
                            onCampaignRefImageChange={handleCampaignRefImageChange}
                            heroProduct={heroProduct}
                            onHeroProductChange={handleHeroProductChange}
                            garmentSpecs={garmentSpecs}
                            onGarmentSpecChange={handleGarmentSpecChange}
                            onGenerate={handleGeneratePreview}
                            canGenerate={canGenerate}
                            isGenerating={genStatus === 'generating'}
                        />

                    </div>

                }
                center={
                    <GenerationCanvas
                        results={genResults}
                        status={genStatus}
                        error={genError}
                        onDownload={handleDownload}
                        onRegenerate={handleGeneratePreview}
                        onEdit={handleEditApply}
                        onSnsTransform={(result) => setSnsTarget({ id: result.id, imageUrl: result.imageUrl, label: result.label })}
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

            {/* SNS Style Transform Modal */}
            {snsTarget && (
                <SnsStyleModal
                    baseImageUrl={snsTarget.imageUrl}
                    baseLabel={snsTarget.label}
                    isGenerating={snsGenerating}
                    onGenerate={handleSnsGenerate}
                    onClose={() => !snsGenerating && setSnsTarget(null)}
                />
            )}
        </>
    );
};

export default NewGenerationPage;
