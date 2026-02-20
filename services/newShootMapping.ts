/**
 * newShootMapping.ts
 * /app/new の UI 選択肢（Studio Preset / Model / Output）を
 * geminiService.generateFashionShot の引数型にマッピングする
 */

import {
    LightingConfig,
    MannequinConfig,
    SceneConfig,
    LightingPreset,
    ShotType,
    OutputPurpose,
    EditorialStyle,
    PoseType,
    AgeGroup,
    BodyType,
    Vibe,
} from '../types';

// ─── Studio Preset → Config ────────────────────────────────────────────────

export type StudioPresetId =
    | 'minimal-luxe'
    | 'clean-ecom'
    | 'warm-editorial'
    | 'high-contrast'
    | 'neon-night';

interface StudioMapping {
    lightingPreset: LightingPreset;
    background: SceneConfig['background'];
    editorialStyle: EditorialStyle;
}

const STUDIO_MAP: Record<StudioPresetId, StudioMapping> = {
    'minimal-luxe': {
        lightingPreset: 'ec_luxury',
        background: 'studio',
        editorialStyle: 'therow_silent',
    },
    'clean-ecom': {
        lightingPreset: 'ec_standard',
        background: 'studio',
        editorialStyle: 'zara_editorial',
    },
    'warm-editorial': {
        lightingPreset: 'natural_window',
        background: 'outdoor',
        editorialStyle: 'miumiu_playful',
    },
    'high-contrast': {
        lightingPreset: 'sculptural_contrast',
        background: 'studio',
        editorialStyle: 'acne_sculptural',
    },
    'neon-night': {
        lightingPreset: 'neon',
        background: 'urban',
        editorialStyle: 'gucci_maximalist',
    },
};

export function buildLightingConfig(_studioPresetId: string): LightingConfig {
    // Default neutral studio lighting values — the lighting description/mood
    // is communicated via lightingPreset in SceneConfig, not these numbers directly
    return {
        intensity: 1.2,
        positionX: -2,
        positionY: 3,
        positionZ: 2,
        color: '#FFFFFF',
    };
}

export function buildSceneConfig(
    studioPresetId: string,
    shotType: string,
    focalLength: string,
    outputPurpose: OutputPurpose
): SceneConfig {
    const mapping = STUDIO_MAP[studioPresetId as StudioPresetId] ?? STUDIO_MAP['clean-ecom'];

    // Validate focalLength
    const validFocalLengths = ['25mm', '50mm', '80mm'] as const;
    const safeFocalLength = validFocalLengths.includes(focalLength as any)
        ? (focalLength as SceneConfig['focalLength'])
        : '50mm';

    // Validate shotType
    const validShotTypes: ShotType[] = [
        'full_body_front', 'full_body_back', 'bust_top', 'middle_top',
        'bottom_focus', 'instagram_square', 'campaign_editorial',
        'full_body', 'upper_body', 'bust_up', 'lower_body',
    ];
    const safeShotType: ShotType = validShotTypes.includes(shotType as ShotType)
        ? (shotType as ShotType)
        : 'full_body_front';

    return {
        background: mapping.background,
        isSetup: false,
        focalLength: safeFocalLength,
        lightingPreset: mapping.lightingPreset,
        shotType: safeShotType,
        outputPurpose,
    };
}

// ─── Output Purpose → ShotType / SceneConfig ──────────────────────────────

interface PurposeShotConfig {
    shotType: ShotType;
    outputPurpose: OutputPurpose;
    label: string;
    aspectLabel: string;
}

export const PURPOSE_SHOT_MAP: Record<string, PurposeShotConfig> = {
    ec: {
        shotType: 'full_body_front',
        outputPurpose: 'ec_product',
        label: 'EC Product',
        aspectLabel: '3:4',
    },
    instagram: {
        shotType: 'instagram_square',
        outputPurpose: 'instagram',
        label: 'Instagram',
        aspectLabel: '1:1',
    },
    ads: {
        shotType: 'campaign_editorial',
        outputPurpose: 'campaign',
        label: 'Ads / Campaign',
        aspectLabel: '16:9',
    },
};

// ─── Model Config → MannequinConfig ───────────────────────────────────────

const AGE_GROUP_MAP: Record<string, AgeGroup> = {
    teen: 'teen',
    youthful: 'youthful',
    prime: 'prime',
    mature: 'mature',
    sophisticated: 'sophisticated',
};

const BODY_TYPE_MAP: Record<string, BodyType> = {
    petite: 'petite',
    slim: 'slim',
    athletic: 'athletic',
    standard: 'standard',
    curvy: 'curvy',
    plus: 'plus',
};

const VIBE_MAP: Record<string, Vibe> = {
    minimalist: 'minimalist',
    edgy: 'edgy',
    casual: 'casual',
    elegant: 'elegant',
};

// Pose from /app/new UI → PoseType
const POSE_MAP: Record<string, PoseType> = {
    ec_neutral: 'ec_neutral',
    ec_relaxed: 'ec_relaxed',
    dynamic: 'ec_three_quarter',
    '3/4_turn': 'ec_three_quarter',
    editorial_power: 'editorial_power',
    editorial_movement: 'editorial_movement',
    lifestyle_candid: 'lifestyle_candid',
    lifestyle_playful: 'lifestyle_playful',
    lifestyle_seated: 'lifestyle_seated',
    // Instagram / Ads overrides
    instagram: 'lifestyle_candid',
    campaign: 'editorial_power',
};

export function buildMannequinConfig(
    gender: string,
    ageRange: string,
    bodyType: string,
    vibe: string,
    pose: string,
    studioPresetId: string,
    ethnicity: string = 'east_asian',
    skinTone: string = 'fair',
    hairColor: string = 'black',
    hairLength: string = 'medium',
): MannequinConfig {
    const mapping = STUDIO_MAP[studioPresetId as StudioPresetId] ?? STUDIO_MAP['clean-ecom'];

    return {
        pose: POSE_MAP[pose] ?? 'ec_neutral',
        rotation: 0,
        gender: gender === 'male' ? 'male' : 'female',
        ethnicity: (ethnicity as any) ?? 'east_asian',
        bodyType: BODY_TYPE_MAP[bodyType] ?? 'slim',
        ageGroup: AGE_GROUP_MAP[ageRange] ?? 'youthful',
        vibe: VIBE_MAP[vibe] ?? 'minimalist',
        editorialStyle: mapping.editorialStyle,
        // Extra appearance details passed via metadata
        skinTone,
        hairColor,
        hairLength,
    } as MannequinConfig & { skinTone: string; hairColor: string; hairLength: string };
}

// ─── Shared API key helper (mirrors App.tsx getApiKey) ────────────────────

export const API_KEY_STORAGE = 'gemini_api_key' as const;

/** 軽い形式チェック: AIza で始まり 30文字以上 */
export function validateApiKeyFormat(key: string): boolean {
    return key.startsWith('AIza') && key.length >= 30;
}

export async function resolveApiKey(): Promise<string> {
    // Priority 1: Vite env var (same as App.tsx)
    const envKey =
        (import.meta as any).env?.VITE_API_KEY ||
        (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (envKey) return (envKey as string).trim();

    // Priority 2: localStorage (set by main App key-entry flow)
    const stored = localStorage.getItem(API_KEY_STORAGE);
    if (stored) return stored; // already trimmed on save

    // Priority 3: AI Studio browser bridge
    if (typeof window !== 'undefined' && (window as any).aistudio) {
        try {
            const key = await (window as any).aistudio.getApiKey?.();
            if (key) {
                const trimmed = (key as string).trim();
                localStorage.setItem(API_KEY_STORAGE, trimmed);
                return trimmed;
            }
        } catch (e) {
            console.warn('Could not retrieve key from aistudio', e);
        }
    }

    throw new Error('NO_API_KEY');
}


