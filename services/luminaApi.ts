// Mock Lumina API Service
// Simulates POST /api/generations/preview using Blob URLs

export interface PreviewRequest {
    uploadedImages: Record<string, string | null>;
    brandProfile: BrandProfile | null;
    studioPreset: string;
    modelConfig: ModelConfig;
    outputPurposes: OutputPurposeConfig[];
    resolution: 'STD' | 'HD' | 'MAX';
    seed?: number;
}

export interface BrandProfile {
    id: string;
    name: string;
    mood: string;
    doNotKeywords: string[];
}

export interface ModelConfig {
    gender: 'female' | 'male';
    ageRange: string;
    bodyType: string;
    vibe: string;
    pose: string;
}

export interface OutputPurposeConfig {
    purpose: 'ec' | 'instagram' | 'ads';
    label: string;
    aspectRatio: string;
    width: number;
    height: number;
}

export interface PreviewResult {
    id: string;
    purpose: string;
    label: string;
    aspectRatio: string;
    imageUrl: string; // Blob URL
    status: 'complete' | 'error';
}

const PURPOSE_CONFIGS: Record<string, OutputPurposeConfig> = {
    ec: { purpose: 'ec', label: 'EC Product', aspectRatio: '3:4', width: 900, height: 1200 },
    instagram: { purpose: 'instagram', label: 'Instagram', aspectRatio: '1:1', width: 1080, height: 1080 },
    ads: { purpose: 'ads', label: 'Ads / Campaign', aspectRatio: '16:9', width: 1920, height: 1080 },
};

export function getOutputPurposeConfig(purpose: string): OutputPurposeConfig {
    return PURPOSE_CONFIGS[purpose] || PURPOSE_CONFIGS.ec;
}

function generatePlaceholderBlob(
    width: number,
    height: number,
    label: string,
    index: number
): Promise<string> {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;

        // Gradient backgrounds per purpose
        const gradients: [string, string, string][] = [
            ['#1a1a2e', '#16213e', '#0f3460'],
            ['#2d1b3d', '#44275d', '#6b3fa0'],
            ['#1b2d2d', '#1d4e4e', '#2a7a7a'],
        ];
        const [c1, c2, c3] = gradients[index % gradients.length];

        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, c1);
        grad.addColorStop(0.5, c2);
        grad.addColorStop(1, c3);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Decorative circles
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.arc(
                Math.random() * width,
                Math.random() * height,
                30 + Math.random() * 80,
                0,
                Math.PI * 2
            );
            ctx.fillStyle = `rgba(139, 92, 246, ${0.05 + Math.random() * 0.1})`;
            ctx.fill();
        }

        // Mannequin silhouette
        const cx = width / 2;
        const cy = height * 0.38;
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.beginPath();
        ctx.arc(cx, cy, 28, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx - 30, cy + 28);
        ctx.lineTo(cx + 30, cy + 28);
        ctx.lineTo(cx + 40, cy + 140);
        ctx.lineTo(cx - 40, cy + 140);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(cx - 25, cy + 140, 18, 120);
        ctx.fillRect(cx + 7, cy + 140, 18, 120);

        // Label
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillText(label.toUpperCase(), cx, height - 60);

        ctx.font = '11px Inter, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillText(`${width} × ${height}`, cx, height - 38);

        // PREVIEW watermark
        ctx.font = 'bold 18px Inter, sans-serif';
        ctx.fillStyle = 'rgba(139, 92, 246, 0.15)';
        ctx.save();
        ctx.translate(cx, cy + 60);
        ctx.rotate(-0.3);
        ctx.fillText('PREVIEW', 0, 0);
        ctx.restore();

        // Convert to Blob URL for proper downloads
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(URL.createObjectURL(blob));
            } else {
                // Fallback to data URL
                resolve(canvas.toDataURL('image/png'));
            }
        }, 'image/png');
    });
}

export async function generatePreview(
    request: PreviewRequest
): Promise<PreviewResult[]> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const results: PreviewResult[] = [];
    for (let i = 0; i < request.outputPurposes.length; i++) {
        const op = request.outputPurposes[i];
        const imageUrl = await generatePlaceholderBlob(op.width, op.height, op.label, i);
        results.push({
            id: `preview-${Date.now()}-${i}`,
            purpose: op.purpose,
            label: op.label,
            aspectRatio: op.aspectRatio,
            imageUrl,
            status: 'complete',
        });
    }

    return results;
}

// Default brand profiles
export const DEFAULT_BRAND_PROFILES: BrandProfile[] = [
    {
        id: 'bp-1',
        name: 'Minimal Chic',
        mood: 'minimalist',
        doNotKeywords: ['flashy', 'neon', 'over-decorated'],
    },
    {
        id: 'bp-2',
        name: 'Bold Editorial',
        mood: 'edgy',
        doNotKeywords: ['plain', 'boring', 'conventional'],
    },
    {
        id: 'bp-3',
        name: 'Premium Natural',
        mood: 'elegant',
        doNotKeywords: ['artificial', 'synthetic', 'cheap'],
    },
];

// Studio presets
export interface StudioPreset {
    id: string;
    name: string;
    description: string;
    icon: string;
    lighting: string;
    background: string;
    focalLength: string;
}

export const STUDIO_PRESETS: StudioPreset[] = [
    {
        id: 'minimal-luxe',
        name: 'Minimal Luxe',
        description: 'Clean white studio, soft diffused light, product-first.',
        icon: '✦',
        lighting: 'ec_standard',
        background: 'studio',
        focalLength: '50mm',
    },
    {
        id: 'clean-ecom',
        name: 'Clean Ecom',
        description: 'Bright, even lighting. Zero distractions. Color accuracy.',
        icon: '◻',
        lighting: 'ec_luxury',
        background: 'studio',
        focalLength: '50mm',
    },
    {
        id: 'warm-editorial',
        name: 'Warm Editorial',
        description: 'Golden hour tones, editorial warmth, lifestyle feel.',
        icon: '☀',
        lighting: 'natural_window',
        background: 'outdoor',
        focalLength: '80mm',
    },
    {
        id: 'high-contrast',
        name: 'High Contrast',
        description: 'Dramatic shadows, sculptural light, bold presence.',
        icon: '◐',
        lighting: 'sculptural_contrast',
        background: 'studio',
        focalLength: '80mm',
    },
    {
        id: 'neon-night',
        name: 'Neon Night',
        description: 'Vibrant neon accents, urban night, street vibe.',
        icon: '⚡',
        lighting: 'neon',
        background: 'urban',
        focalLength: '25mm',
    },
];
