
import { GoogleGenAI, Type } from "@google/genai";
import { LightingConfig, MannequinConfig, VisionAnalysis, ItemAnalysis, SceneConfig, DetailedGarmentMeasurements, DetailedAccessoryMeasurements, DetailedAccessoryPositioning, DetailedAccessoryMaterials, RefinementRequest, RefinementInterpretation, RefinementTarget, RefinementChangeType, ShotType, PoseType } from "../types";


const parseBase64 = (b64: string) => {
  if (b64.includes(",")) {
    const [header, data] = b64.split(",");
    const mimeMatch = header.match(/^data:(.*?);base64/);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
    return { mimeType, data };
  }
  return { mimeType: "image/png", data: b64 };
};

const ensureSupportedFormat = async (base64: string): Promise<string> => {
  const { mimeType } = parseBase64(base64);
  const supported = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif'];

  if (supported.includes(mimeType)) {
    return base64;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context failed'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Image conversion failed'));
    img.src = base64;
  });
};

// ─── Per-item schema (shared) ───────────────────────────────────────────────

const ITEM_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    description: { type: Type.STRING },
    fabric: { type: Type.STRING },
    fabricWeight: { type: Type.STRING },
    style: { type: Type.STRING },
    silhouette: { type: Type.STRING },
    fit: { type: Type.STRING },
    colorHex: { type: Type.STRING },
    colorDescription: { type: Type.STRING },
    pattern: { type: Type.STRING },
    construction: { type: Type.STRING },
    hardware: { type: Type.STRING },
    neckline: { type: Type.STRING },
    sleeveLength: { type: Type.STRING },
  },
  required: ['description', 'fabric', 'style', 'colorHex'],
} as const;

// ─── Single-item analysis (focused call) ────────────────────────────────────

const analyzeOneItem = async (
  ai: GoogleGenAI,
  key: string,
  b64: string,
  altImages: string[] = [] // additional angle reference images
): Promise<[string, ItemAnalysis]> => {
  const isAccessory = ['bag', 'sunglasses', 'glasses', 'accessories'].includes(key);
  const validImage = await ensureSupportedFormat(b64);
  const { mimeType, data } = parseBase64(validImage);
  const category = key.toUpperCase();

  // Prepare alt angle parts (back / side / detail shots)
  const altParts: any[] = [];
  const angleLabels = ['BACK VIEW', 'SIDE / DETAIL VIEW', 'CLOSE-UP DETAIL'];
  for (let i = 0; i < altImages.length; i++) {
    const validAlt = await ensureSupportedFormat(altImages[i]);
    const { mimeType: altMime, data: altData } = parseBase64(validAlt);
    altParts.push({ text: `ADDITIONAL REFERENCE — ${angleLabels[i] ?? `ANGLE ${i + 1}`}: Use this to understand back/side construction details.` });
    altParts.push({ inlineData: { mimeType: altMime, data: altData } });
  }

  const hasAlt = altParts.length > 0;

  const systemInstruction = `You are a senior fashion analyst and textile expert with 20 years of experience at luxury brands.
Your task is to perform a highly detailed structural analysis of a single ${category} garment/item.
${hasAlt ? `You have been provided ${altImages.length} additional reference image(s) showing different angles (back, side, detail). Use ALL reference images to give a complete 360° structural description.` : ''}

CHAIN-OF-THOUGHT ANALYSIS PROCESS:
Step 1 — CATEGORY: Confirm this is a ${key} item.
Step 2 — MATERIAL/FABRIC: Examine the texture, weave structure, sheen, drape, and surface finish.
  • Be specific: NOT "denim" but "12oz selvedge denim with a slight crosshatch texture"
  • NOT "cotton" but "brushed cotton twill, medium weight"
  • Estimate weight: lightweight / medium-weight / heavy
Step 3 — CONSTRUCTION/DETAILS: Look closely at stitching, seams, pockets, closures, hardware.
  • Example: "5-pocket construction, bartack reinforced, copper rivets, chain-stitched hem"
  • Hardware: "matte black YKK zip, antique brass grommets, tortoiseshell buttons"
${hasAlt ? '  • BACK CONSTRUCTION: Describe back yoke, center seam, rear pockets, collar stand from the additional angle images.\n  • SIDE CONSTRUCTION: Describe side seams, panels, and drape from side view images.' : ''}
Step 4 — FIT & SILHOUETTE: Analyze the garment's shape.
  • Silhouette: slim-fit / relaxed / oversized / boxy / A-line / straight / wide-leg
  • Fit: skinny / straight / relaxed / loose / tailored / oversized
${!isAccessory ? `Step 5 — STRUCTURE DETAILS:
  • Neckline: crew / V-neck / collar / hood / cowl / turtleneck / scoop / off-shoulder
  • Sleeve length: sleeveless / cap / short / 3/4 / long / extra-long` : ''}
Step 6 — COLOR & PATTERN:
  • Primary color in HEX (be precise: #1A1A2E not just "dark blue")
  • Color name: "Midnight Indigo #1A1A2E"
  • Pattern: solid / fine stripe / wide stripe / micro-check / plaid / houndstooth / floral / graphic / animal print / tie-dye

FEW-SHOT EXAMPLE (quality target):
{
  "description": "Oversized boxy denim jacket in midnight navy, single-breasted with spread collar and chest pockets",
  "fabric": "14oz raw selvedge denim with a subtle diagonal twill weave",
  "fabricWeight": "heavy",
  "style": "oversized boxy trucker jacket",
  "silhouette": "boxy oversized",
  "fit": "relaxed",
  "colorHex": "#1C2340",
  "colorDescription": "Midnight Indigo Navy #1C2340",
  "pattern": "solid",
  "construction": "flat-felled seams, copper rivet reinforcements, 4 button closure, chest welt pockets, back yoke with center seam",
  "hardware": "antique copper buttons with embossed detail, YKK copper-tooth zip on side pockets",
  "neckline": "spread collar",
  "sleeveLength": "long"
}

Return ONLY valid JSON for the ${key} item. No explanation text.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: {
      parts: [
        { text: `Analyze this ${key} garment/item in detail following the chain-of-thought process.${hasAlt ? ` Use ALL ${altImages.length + 1} reference images provided (main front view + additional angles).` : ''}` },
        { inlineData: { mimeType, data } },
        ...altParts,
      ],
    },
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: ITEM_SCHEMA as any,
      temperature: 0.2, // Lower temp = more precise, less hallucination
    },
  });

  const text = response.text;
  if (!text) throw new Error(`No analysis returned for ${key}`);
  const parsed = JSON.parse(text) as ItemAnalysis;
  console.log(`✅ [${key}] Analyzed${hasAlt ? ` (+${altImages.length} alt angles)` : ''}:`, JSON.stringify(parsed, null, 2));
  return [key, parsed];
};

// ─── Overall style aggregation ───────────────────────────────────────────────

const analyzeOverallStyle = async (
  ai: GoogleGenAI,
  items: Record<string, ItemAnalysis>
): Promise<{ overallStyle: string; keywords: string[] }> => {
  const summary = Object.entries(items)
    .map(([k, v]) => `${k}: ${v.description} (${v.silhouette ?? ''} ${v.fabric})`)
    .join('\n');

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: {
      parts: [{ text: `Based on this outfit composition, provide an overallStyle description (2-3 sentences) and 5-8 fashion keywords.\n\n${summary}` }],
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overallStyle: { type: Type.STRING },
          keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['overallStyle', 'keywords'],
      },
      temperature: 0.4,
    },
  });

  const text = response.text;
  if (!text) return { overallStyle: 'Contemporary fashion ensemble', keywords: [] };
  return JSON.parse(text);
};

// ─── Main export ─────────────────────────────────────────────────────────────

// ─── Styling/Layering state analysis ─────────────────────────────────────────
// Captures HOW garments are worn together — the "着こなし状態" that must remain
// consistent across all EC shots (front, back, side)

const LAYERING_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    outerOpenState: { type: Type.STRING },
    outerButtonState: { type: Type.STRING },
    topTuckState: { type: Type.STRING },
    innerVisibility: { type: Type.STRING },
    innerHemVisible: { type: Type.BOOLEAN },
    innerHemDescription: { type: Type.STRING },
    sleeveCuffState: { type: Type.STRING },
    beltState: { type: Type.STRING },
    stylingDescription: { type: Type.STRING },
  },
  required: ['stylingDescription'],
} as const;

const analyzeStylingState = async (
  ai: GoogleGenAI,
  allImages: string[], // All uploaded garment images (front views)
  itemMap: Record<string, ItemAnalysis>
): Promise<import('../types').LayeringAnalysis | undefined> => {
  // Only run if there are multiple garment types worth analyzing for layering
  const hasOuter = !!itemMap['outer'];
  const hasTopsOrInner = !!(itemMap['tops'] || itemMap['inner']);
  if (!hasOuter && !hasTopsOrInner) return undefined;
  if (allImages.length === 0) return undefined;

  try {
    // Prepare all image parts
    const parts: any[] = [];
    parts.push({
      text: `You are a fashion styling expert analyzing HOW multiple garments are being worn together in these reference images.
Do NOT describe the individual garments — describe ONLY the styling/layering state (how they interact).

ANALYZE THESE SPECIFIC STYLING STATES:

1. OUTER GARMENT open/closed state:
   - Is the outer garment (coat/jacket/blazer) fully open, partially open, or closed/buttoned?
   - Which specific buttons are fastened, if any? (e.g. "all 4 buttons open" or "top 2 buttons open, rest closed")

2. TOP/SHIRT tuck state:
   - Is the shirt/top tucked INTO the pants/skirt, or untucked (hanging free)?
   - "fully_tucked" = entire shirt hem inside pants
   - "untucked" = shirt hangs freely outside pants
   - "half_tucked_front" = only front tucked, back hangs free

3. INNER LAYER visibility:
   - How much of the inner layer (shirt/blouse) is visible under the outer?
   - Is the inner shirt's HEM visible below the outer garment's hem? YES or NO?
   - CRITICAL: If the inner shirt hem is NOT showing below the coat — state that clearly.

4. SLEEVE/CUFF state:
   - Are sleeves straight, rolled, or showing cuffs?
   - E.g.: "shirt cuffs visible extending 2cm beyond coat sleeves"

5. BELT state (if present):
   - Is the belt/tie of the outer garment tied, untied, hanging?
   - Where: front, back, or hanging loose on sides?

6. OVERALL STYLING DESCRIPTION:
   Write a precise, authoritative description of all styling states that MUST be reproduced identically in every shot.
   Example: "Beige trench coat worn OPEN (all buttons unfastened, lapels falling open naturally). Light blue shirt visible at collar and chest area through open coat. Shirt hem is TUCKED into shorts — NOT visible below coat hem. Coat belt untied, hanging at sides."

TUCK SYMMETRY RULES (CRITICAL):
   - If the shirt appears tucked on one side but not the other → report "half_tucked_front" NOT "fully_tucked"
   - If the shirt is tucked fully on both sides → report "fully_tucked"
   - If the shirt hangs completely free → report "untucked"
   - BE PRECISE: A shirt that is asymmetrically half-tucked is a specific styling choice — document it exactly.

GARMENT LENGTH (CRITICAL — for pants/skirt):
   - Where does the bottom garment hem fall? Options: floor_length, ankle_length, mid_calf, knee_length, cropped_above_knee, mini
   - This information is essential for ensuring consistent hem position across all camera angles.
   - Include this in stylingDescription: e.g. "Wide-leg trousers are FULL LENGTH (ankle/floor length) — they must remain full-length in all shots."

IMPORTANT: Be extremely precise. This description will be used to enforce consistency across all camera angles.
The back-view shot MUST reproduce the same styling state as the front view.`

    });

    for (let i = 0; i < allImages.length; i++) {
      const { mimeType, data } = parseBase64(allImages[i]);
      parts.push({ text: `Garment reference image ${i + 1}:` });
      parts.push({ inlineData: { mimeType, data } });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
        responseSchema: LAYERING_SCHEMA as any,
        temperature: 0.1, // Very low — we want precise factual description
      },
    });

    const text = response.text;
    if (!text) return undefined;
    const result = JSON.parse(text);
    console.log('✅ [LayeringState] Analyzed:', JSON.stringify(result, null, 2));
    return result;
  } catch (err) {
    console.warn('⚠️ [LayeringState] Analysis failed (non-critical):', err);
    return undefined;
  }
};



export const analyzeClothingItems = async (apiKey: string, images: Record<string, string>): Promise<VisionAnalysis> => {
  try {
    const ai = new GoogleGenAI({ apiKey });

    console.log('🔍 analyzeClothingItems START (enhanced parallel analysis)');
    console.log('📥 Images to analyze:', Object.keys(images));


    // Filter valid garment images (skip model, anchor_model, campaign_style_ref)
    const skipKeys = new Set(['model', 'anchor_model', 'campaign_style_ref', 'base_model']);
    const validEntries = Object.entries(images).filter(
      ([key, b64]) => b64 && !skipKeys.has(key)
    );

    if (validEntries.length === 0) throw new Error('No images provided for analysis');

    console.log(`📊 Analyzing items in parallel...`);

    // Separate main garment images from _alt_ angle images
    const mainEntries = validEntries.filter(([key]) => !key.includes('_alt_'));
    const altMap: Record<string, string[]> = {};
    for (const [key, b64] of validEntries) {
      if (key.includes('_alt_')) {
        const baseKey = key.split('_alt_')[0];
        (altMap[baseKey] ??= []).push(b64);
      }
    }

    console.log('📷 Main items:', mainEntries.map(([k]) => k));
    console.log('📷 Alt angles:', Object.entries(altMap).map(([k, v]) => `${k}(${v.length})`));

    // Phase 1: Parallel per-item analysis — pass alt images to enrich analysis
    const itemResults = await Promise.all(
      mainEntries.map(([key, b64]) => analyzeOneItem(ai, key, b64, altMap[key] ?? []))
    );

    const itemMap: Record<string, ItemAnalysis> = {};
    for (const [key, analysis] of itemResults) {
      itemMap[key] = analysis;
    }

    // Phase 2: Aggregate overall style from all items
    const overall = await analyzeOverallStyle(ai, itemMap);

    // Phase 3: Analyze "着こなし状態" (layering/styling state) — HOW garments are worn together
    // Run only if there are multiple garment layers (OUTER + TOPS/INNER at minimum)
    const mainImageB64s = mainEntries.map(([, b64]) => b64);
    const layeringState = await analyzeStylingState(ai, mainImageB64s, itemMap);
    if (layeringState) {
      console.log('👗 [LayeringState] Styling state captured successfully');
    }

    const analysis: VisionAnalysis = {
      ...itemMap as any,
      overallStyle: overall.overallStyle,
      keywords: overall.keywords,
      layeringState,
    };

    console.log('📤 Full analysis result:', JSON.stringify(analysis, null, 2));
    console.log('🔍 analyzeClothingItems END');

    return analysis;
  } catch (error) {
    console.error('Vision Analysis Failed:', error);
    throw error;
  }
};


export const interpretModification = async (
  apiKey: string,
  currentAnalysis: VisionAnalysis,
  instruction: string
): Promise<VisionAnalysis> => {
  try {
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [{
            text: `You are an expert fashion AI. Your task is to MODIFY ONLY ONE SPECIFIC ITEM in the existing clothing analysis JSON based on the user's instruction.

CURRENT ANALYSIS JSON:
${JSON.stringify(currentAnalysis, null, 2)}

USER INSTRUCTION:
"${instruction}"

CRITICAL INSTRUCTIONS:

1. IDENTIFY THE TARGET ITEM:
   - The instruction explicitly mentions which item to modify (e.g., "tops", "pants", "outer", "inner", "shoes")
   - Extract the target item name from the instruction
   - Locate that specific item in the CURRENT ANALYSIS JSON above

2. MODIFY ONLY THE TARGET ITEM:
   - Update ONLY the fields specified in the instruction for that ONE item
   - For COLOR changes: 
     * Update 'colorHex' with the appropriate hex code for the new color
     * Update 'description' to mention the new color
     * Keep 'fabric' and 'style' EXACTLY as they are
   - For MATERIAL/FABRIC changes:
     * Update 'fabric' field
     * Update 'description' to mention the new material
     * Keep 'colorHex' and 'style' EXACTLY as they are
   - For STYLE changes:
     * Update 'style' field
     * Update 'description' to reflect the new style
     * Keep 'colorHex' and 'fabric' EXACTLY as they are

3. PRESERVE ALL OTHER ITEMS (CRITICAL):
   - Do NOT modify any other items (tops, pants, outer, inner, shoes) except the target
   - Keep their colorHex, fabric, style, and description fields COMPLETELY UNCHANGED
   - Copy them exactly as they appear in the CURRENT ANALYSIS JSON

4. PRESERVE OVERALL FIELDS:
   - Keep 'overallStyle' and 'keywords' EXACTLY as they are unless the instruction specifically asks to change them

EXAMPLE:
If instruction says "Change the tops to red color":
- Modify ONLY the 'tops' object
- Update tops.colorHex to a red hex code (e.g., "#FF0000")
- Update tops.description to mention "red"
- Keep tops.fabric and tops.style unchanged
- Keep pants, outer, inner, shoes COMPLETELY unchanged

RETURN ONLY the complete, valid updated JSON with the single targeted modification.`
          }]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tops: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING },
                fabric: { type: Type.STRING },
                style: { type: Type.STRING },
                colorHex: { type: Type.STRING },
              }
            },
            pants: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING },
                fabric: { type: Type.STRING },
                style: { type: Type.STRING },
                colorHex: { type: Type.STRING },
              }
            },
            outer: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING },
                fabric: { type: Type.STRING },
                style: { type: Type.STRING },
                colorHex: { type: Type.STRING },
              }
            },
            inner: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING },
                fabric: { type: Type.STRING },
                style: { type: Type.STRING },
                colorHex: { type: Type.STRING },
              }
            },
            shoes: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING },
                fabric: { type: Type.STRING },
                style: { type: Type.STRING },
                colorHex: { type: Type.STRING },
              }
            },
            overallStyle: { type: Type.STRING },
            keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["overallStyle", "keywords"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No modification returned");
    return JSON.parse(text) as VisionAnalysis;

  } catch (error) {
    console.error("Interpretation Failed:", error);
    throw error;
  }
};

/**
 * Build a structured refinement prompt from user request
 * This ensures accurate interpretation and prevents unintended changes
 */
export const buildRefinementPrompt = (
  request: RefinementRequest,
  currentAnalysis: VisionAnalysis
): RefinementInterpretation => {
  const targetLabels: Record<RefinementTarget, string> = {
    tops: 'Top',
    pants: 'Pants',
    outer: 'Outer',
    inner: 'Inner',
    shoes: 'Shoes',
    bag: 'Bag',
    sunglasses: 'Sunglasses',
    glasses: 'Glasses',
    accessories: 'Accessories',
    background: 'Background',
    lighting: 'Lighting',
    pose: 'Pose'
  };

  const changeTypeLabels: Record<RefinementChangeType, string> = {
    color: 'Color',
    style: 'Style',
    material: 'Material',
    pattern: 'Pattern',
    custom: 'Custom'
  };

  // Build structured prompt based on change type
  const promptTemplates: Record<RefinementChangeType, string> = {
    color: `CRITICAL COLOR CHANGE: Change ONLY the ${request.target} to ${request.value} color.

TARGET ITEM IDENTIFICATION:
- Item to modify: ${request.target}
- Current color: ${getCurrentColor(request.target, currentAnalysis)}
- Current fabric: ${getCurrentFabric(request.target, currentAnalysis)}
- Current style: ${getCurrentStyle(request.target, currentAnalysis)}

STRICT REQUIREMENTS:
1. COLOR CHANGE (ONLY FOR ${request.target.toUpperCase()}):
   - Change the ${request.target} color to: ${request.value}
   - If "${request.value}" is a color name (e.g., "red", "black", "navy blue"), convert it to an appropriate hex code
   - If "${request.value}" is already a hex code (e.g., "#FF0000"), use it directly
   - Update the ${request.target}.colorHex field with the new hex code
   - Update the ${request.target}.description to mention the new color
   - Keep the ${request.target}.fabric as: ${getCurrentFabric(request.target, currentAnalysis)}
   - Keep the ${request.target}.style as: ${getCurrentStyle(request.target, currentAnalysis)}

2. PRESERVATION (ABSOLUTELY CRITICAL):
   - Do NOT modify tops if target is not tops
   - Do NOT modify pants if target is not pants
   - Do NOT modify outer if target is not outer
   - Do NOT modify inner if target is not inner
   - Do NOT modify shoes if target is not shoes
   - Keep ALL other items' colorHex, fabric, style, and description fields EXACTLY as they are in the current state
   - Only change the ${request.target} item, nothing else

3. VALIDATION:
   - Ensure the new color is realistic and appropriate for the garment type
   - Maintain fabric texture and weave patterns with the new color
   - The ${request.target} should be the ONLY item with a different color than before

CURRENT STATE (for reference):
${JSON.stringify(currentAnalysis, null, 2)}

REMINDER: Change ONLY the ${request.target}. All other items must remain UNCHANGED.`,

    style: `CRITICAL: Make the ${request.target} more ${request.value} in style.
    
REQUIREMENTS:
- Adjust ONLY the ${request.target} to have a ${request.value} style
- Keep the same color: ${getCurrentColor(request.target, currentAnalysis)}
- Keep the same fabric: ${getCurrentFabric(request.target, currentAnalysis)}
- Keep ALL other items unchanged
- Maintain the overall fit and proportions

CURRENT STATE (for reference):
${JSON.stringify(currentAnalysis, null, 2)}`,

    material: `CRITICAL: Change the ${request.target} material to ${request.value}.
    
REQUIREMENTS:
- Update ONLY the ${request.target} fabric/material to ${request.value}
- Keep the same color: ${getCurrentColor(request.target, currentAnalysis)}
- Keep the same style and design
- Keep ALL other items unchanged
- Render realistic ${request.value} texture

CURRENT STATE (for reference):
${JSON.stringify(currentAnalysis, null, 2)}`,

    pattern: `CRITICAL: Add ${request.value} pattern to the ${request.target}.
    
REQUIREMENTS:
- Add ONLY ${request.value} pattern to the ${request.target}
- Keep the base color: ${getCurrentColor(request.target, currentAnalysis)}
- Keep the same fabric and style
- Keep ALL other items unchanged
- Ensure pattern is subtle and realistic

CURRENT STATE (for reference):
${JSON.stringify(currentAnalysis, null, 2)}`,

    custom: `CRITICAL: ${request.description || request.value}
    
REQUIREMENTS:
- Apply the change ONLY to the ${request.target}
- Keep ALL other items (tops, pants, outer, shoes, background, lighting, pose) EXACTLY as they are
- Maintain overall composition and framing

CURRENT STATE (for reference):
${JSON.stringify(currentAnalysis, null, 2)}`
  };

  const generatedPrompt = promptTemplates[request.changeType];

  return {
    target: targetLabels[request.target],
    changeType: changeTypeLabels[request.changeType],
    value: request.value,
    generatedPrompt,
    originalRequest: request // Preserve original request for direct manipulation
  };
};

// Helper functions to get current state
function getCurrentColor(target: RefinementTarget, analysis: VisionAnalysis): string {
  const item = analysis[target as keyof VisionAnalysis];
  if (item && typeof item === 'object' && 'colorHex' in item) {
    return item.colorHex || 'current color';
  }
  return 'current color';
}

function getCurrentFabric(target: RefinementTarget, analysis: VisionAnalysis): string {
  const item = analysis[target as keyof VisionAnalysis];
  if (item && typeof item === 'object' && 'fabric' in item) {
    return item.fabric || 'current fabric';
  }
  return 'current fabric';
}

function getCurrentStyle(target: RefinementTarget, analysis: VisionAnalysis): string {
  const item = analysis[target as keyof VisionAnalysis];
  if (item && typeof item === 'object' && 'style' in item) {
    return item.style || 'current style';
  }
  return 'current style';
}

/**
 * Convert color name or hex to valid hex code
 * This ensures consistent color representation
 */
function convertColorToHex(color: string): string {
  const trimmed = color.trim();

  // If already hex, validate and return
  if (trimmed.startsWith('#')) {
    // Basic validation: should be #RGB or #RRGGBB
    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(trimmed)) {
      return trimmed.toUpperCase();
    }
  }

  // Common color name to hex mapping
  const colorMap: Record<string, string> = {
    // Basic colors
    'red': '#FF0000',
    'blue': '#0000FF',
    'green': '#00FF00',
    'black': '#000000',
    'white': '#FFFFFF',
    'yellow': '#FFFF00',
    'orange': '#FFA500',
    'purple': '#800080',
    'pink': '#FFC0CB',
    'brown': '#8B4513',
    'gray': '#808080',
    'grey': '#808080',

    // Extended colors
    'navy': '#000080',
    'navy blue': '#000080',
    'beige': '#F5F5DC',
    'cream': '#FFFDD0',
    'ivory': '#FFFFF0',
    'khaki': '#C3B091',
    'olive': '#808000',
    'maroon': '#800000',
    'burgundy': '#800020',
    'wine': '#722F37',
    'charcoal': '#36454F',
    'slate': '#708090',
    'silver': '#C0C0C0',
    'gold': '#FFD700',
    'tan': '#D2B48C',
    'camel': '#C19A6B',
    'mustard': '#FFDB58',
    'coral': '#FF7F50',
    'salmon': '#FA8072',
    'peach': '#FFE5B4',
    'lavender': '#E6E6FA',
    'mint': '#98FF98',
    'teal': '#008080',
    'turquoise': '#40E0D0',
    'cyan': '#00FFFF',
    'indigo': '#4B0082',
    'violet': '#EE82EE',
    'magenta': '#FF00FF',
    'crimson': '#DC143C',
    'scarlet': '#FF2400',
  };

  const normalized = trimmed.toLowerCase();
  return colorMap[normalized] || '#808080'; // Default to gray if unknown
}

/**
 * Update description to reflect new color
 */
function updateDescriptionWithColor(description: string, newColor: string): string {
  // Remove existing color mentions (simple approach)
  const colorWords = ['red', 'blue', 'green', 'black', 'white', 'yellow', 'orange', 'purple',
    'pink', 'brown', 'gray', 'grey', 'navy', 'beige', 'cream', 'khaki'];

  let updated = description;
  colorWords.forEach(color => {
    const regex = new RegExp(`\\b${color}\\b`, 'gi');
    updated = updated.replace(regex, '').trim();
  });

  // Clean up multiple spaces
  updated = updated.replace(/\s+/g, ' ').trim();

  // Prepend new color
  return `${newColor} ${updated}`.trim();
}

/**
 * Update description to reflect new material
 */
function updateDescriptionWithMaterial(description: string, newMaterial: string): string {
  // Simple approach: mention material in description
  if (!description.toLowerCase().includes(newMaterial.toLowerCase())) {
    return `${newMaterial} ${description}`.trim();
  }
  return description;
}

/**
 * Update description to reflect new style
 */
function updateDescriptionWithStyle(description: string, newStyle: string): string {
  // Simple approach: mention style in description
  if (!description.toLowerCase().includes(newStyle.toLowerCase())) {
    return `${newStyle} style ${description}`.trim();
  }
  return description;
}

/**
 * Add pattern to description
 */
function addPatternToDescription(description: string, pattern: string): string {
  if (!description.toLowerCase().includes(pattern.toLowerCase())) {
    return `${pattern} ${description}`.trim();
  }
  return description;
}

/**
 * Directly apply refinement to analysis JSON without AI interpretation
 * This is more reliable than asking AI to interpret natural language
 */
export const applyRefinementDirectly = (
  currentAnalysis: VisionAnalysis,
  request: RefinementRequest
): VisionAnalysis => {
  console.log('🔍 applyRefinementDirectly START');
  console.log('📥 Input Analysis:', JSON.stringify(currentAnalysis, null, 2));
  console.log('📝 Request:', request);

  // Deep clone to avoid mutations
  const updated = JSON.parse(JSON.stringify(currentAnalysis)) as VisionAnalysis;

  console.log('📋 Cloned Analysis:', JSON.stringify(updated, null, 2));
  console.log('✅ Clone verification - tops exists:', !!updated.tops);
  console.log('✅ Clone verification - pants exists:', !!updated.pants);
  console.log('✅ Clone verification - outer exists:', !!updated.outer);
  console.log('✅ Clone verification - inner exists:', !!updated.inner);
  console.log('✅ Clone verification - shoes exists:', !!updated.shoes);

  const { target, changeType, value } = request;

  // Only handle clothing items with this direct approach
  const clothingTargets: RefinementTarget[] = ['tops', 'pants', 'outer', 'inner', 'shoes', 'bag', 'sunglasses', 'glasses', 'accessories'];
  if (!clothingTargets.includes(target)) {
    // For non-clothing targets (background, lighting, pose), return unchanged
    // These would need AI interpretation or different handling
    console.warn(`⚠️ Direct manipulation not supported for target: ${target}`);
    return currentAnalysis;
  }

  // Get the target item
  const item = updated[target as keyof VisionAnalysis];
  if (!item || typeof item !== 'object') {
    console.warn(`⚠️ Target item not found: ${target}`);
    console.log('📤 Returning updated analysis (no changes)');
    return updated;
  }

  console.log(`🎯 Modifying target: ${target}`);
  console.log(`📌 Current ${target}:`, JSON.stringify(item, null, 2));

  // Apply changes based on change type
  switch (changeType) {
    case 'color':
      // Convert color name/hex to hex code
      const hexColor = convertColorToHex(value);
      if ('colorHex' in item) {
        const oldColor = item.colorHex;
        item.colorHex = hexColor;
        console.log(`✓ Updated ${target}.colorHex: ${oldColor} → ${hexColor}`);
      }
      if ('description' in item && typeof item.description === 'string') {
        const oldDesc = item.description;
        item.description = updateDescriptionWithColor(item.description, value);
        console.log(`✓ Updated ${target}.description: "${oldDesc}" → "${item.description}"`);
      }
      break;

    case 'material':
      if ('fabric' in item) {
        const oldFabric = item.fabric;
        item.fabric = value;
        console.log(`✓ Updated ${target}.fabric: ${oldFabric} → ${value}`);
      }
      if ('description' in item && typeof item.description === 'string') {
        const oldDesc = item.description;
        item.description = updateDescriptionWithMaterial(item.description, value);
        console.log(`✓ Updated ${target}.description: "${oldDesc}" → "${item.description}"`);
      }
      break;

    case 'style':
      if ('style' in item) {
        const oldStyle = item.style;
        item.style = value;
        console.log(`✓ Updated ${target}.style: ${oldStyle} → ${value}`);
      }
      if ('description' in item && typeof item.description === 'string') {
        const oldDesc = item.description;
        item.description = updateDescriptionWithStyle(item.description, value);
        console.log(`✓ Updated ${target}.description: "${oldDesc}" → "${item.description}"`);
      }
      break;

    case 'pattern':
      if ('description' in item && typeof item.description === 'string') {
        const oldDesc = item.description;
        item.description = addPatternToDescription(item.description, value);
        console.log(`✓ Updated ${target}.description: "${oldDesc}" → "${item.description}"`);
      }
      break;

    case 'custom':
      // For custom changes, we might still need AI interpretation
      console.warn(`⚠️ Custom changes require AI interpretation`);
      break;
  }

  console.log(`📌 Modified ${target}:`, JSON.stringify(item, null, 2));
  console.log('📤 Final Analysis:', JSON.stringify(updated, null, 2));
  console.log('✅ Final verification - tops exists:', !!updated.tops);
  console.log('✅ Final verification - pants exists:', !!updated.pants);
  console.log('✅ Final verification - outer exists:', !!updated.outer);
  console.log('✅ Final verification - inner exists:', !!updated.inner);
  console.log('✅ Final verification - shoes exists:', !!updated.shoes);
  console.log('🔍 applyRefinementDirectly END');

  return updated;
};


export const generateFashionShot = async (
  apiKey: string,
  analysis: VisionAnalysis,
  lighting: LightingConfig,
  mannequin: MannequinConfig,
  scene: SceneConfig,
  images: Record<string, string>,
  garmentMeasurements?: DetailedGarmentMeasurements,
  accessoryMeasurements?: DetailedAccessoryMeasurements,
  accessoryPositioning?: DetailedAccessoryPositioning,
  accessoryMaterials?: DetailedAccessoryMaterials,
  garmentContext?: import('../types').GarmentContext
): Promise<string> => {

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Rotation and View Logic
    // Rotation and View Logic
    const rotDegrees = (mannequin.rotation * 180) / Math.PI;
    const normRot = ((rotDegrees % 360) + 540) % 360 - 180; // Normalize to -180 to 180

    let viewDesc = "Frontal perspective";

    if (Math.abs(normRot) < 20) {
      viewDesc = "Direct frontal view, looking straight at camera.";
    } else if (normRot >= 20 && normRot < 70) {
      viewDesc = "Three-quarter view facing RIGHT (model's left side visible).";
    } else if (normRot >= 70 && normRot < 110) {
      viewDesc = "Side profile facing RIGHT (90 degrees).";
    } else if (normRot >= 110 && normRot < 160) {
      viewDesc = "Back-three-quarter view facing RIGHT.";
    } else if (normRot <= -20 && normRot > -70) {
      viewDesc = "Three-quarter view facing LEFT (model's right side visible).";
    } else if (normRot <= -70 && normRot > -110) {
      viewDesc = "Side profile facing LEFT (90 degrees).";
    } else if (normRot <= -110 && normRot > -160) {
      viewDesc = "Back-three-quarter view facing LEFT.";
    } else {
      viewDesc = "Direct back view, facing away from camera.";
    }

    // Lighting Preset Detailed Logic
    const presetPrompts: Record<string, string> = {
      // === EC/プロダクト向け ===
      ec_standard: `EC standard professional lighting.
        KEY: Large softbox 45° camera-left, even diffusion across full body.
        FILL: Reflector camera-right at 1:2 ratio to key, eliminating harsh shadows.
        RIM: Subtle hair/separation light from behind at low power.
        BACKGROUND: Evenly lit pure white or off-white, no visible gradients.
        COLOR TEMP: 5500K daylight balanced, CRI 95+ color accuracy.
        SHADOW: Minimal, soft-edged. Ground shadow only — compact and consistent.
        STANDARD: SSENSE, NET-A-PORTER product photography quality.`,

      ec_luxury: `Luxury EC lighting — subtle sculpting for premium feel.
        KEY: Large octabox slightly above eye level, soft wraparound quality.
        FILL: Reduced fill ratio (1:3) to create gentle facial and garment dimension.
        RIM: Delicate edge light on shoulders and arms to separate from background.
        BACKGROUND: Warm off-white (#F5F0EB) with micro-gradient for depth.
        COLOR TEMP: 5200K slightly warm, enhancing fabric richness.
        SHADOW: Present but extremely soft — adds depth without distraction.
        TEXTURE: Lighting should reveal fabric weave, thread direction, and surface quality.
        STANDARD: Prada, Jil Sander premium EC quality.`,

      // === エディトリアル向け ===
      natural_window: `Miu Miu-inspired natural window light — soft, intimate, artistic.
        KEY: Simulated large window light from camera-left, soft directional quality.
        FILL: Ambient room bounce, low ratio creating visible but gentle shadows.
        RIM: None — natural environment feel, no artificial separation.
        ATMOSPHERE: Visible light rays through window, dust motes optional.
        COLOR TEMP: 5000-5800K variable, warm afternoon to cool morning feel.
        SHADOW: Soft directional shadows on face and body, creating depth and intimacy.
        REFERENCE: Miu Miu campaign — "sun beams streaming through open window".`,

      ethereal_soft: `THE ROW-inspired ethereal diffused lighting — silent luxury.
        KEY: Extremely diffused overhead panel, almost omnidirectional soft quality.
        FILL: Ambient fill from all directions, nearly shadowless but not flat.
        RIM: Barely perceptible — just enough to define silhouette edge.
        ATMOSPHERE: Luminous, almost otherworldly quality. Air itself seems to glow.
        COLOR TEMP: 5800K cool daylight, desaturated, monochromatic feel.
        SHADOW: Nearly invisible — garment volume shown through subtle tonal shifts only.
        REFERENCE: THE ROW lookbook — Mark Borthwick ethereal photography quality.`,

      sculptural_contrast: `Acne Studios-inspired sculptural lighting — intentional contrast.
        KEY: Hard-edged spotlight or strip light, creating defined highlight/shadow boundary.
        FILL: Minimal fill — deep shadows are intentional and artistic.
        RIM: Strong rim/edge light on one side for dramatic silhouette definition.
        ATMOSPHERE: Gallery exhibition quality, art-directed precision.
        COLOR TEMP: 4800K slightly cool, neutral to desaturated palette.
        SHADOW: Strong, graphic shadows with clean edges. Shadows are compositional elements.
        REFERENCE: Acne Studios — "maximalist minimalism", sculptural photography.`,

      dramatic_luminous: `Gucci-inspired dramatic luminous lighting — light as narrative.
        KEY: Warm, rich key light with visible color cast — amber or golden tones.
        FILL: Colored fill light (complementary tone) creating tonal richness.
        RIM: Pronounced rim light with warm color, creating halo/glow effect.
        ATMOSPHERE: Rich cinematic quality, "Where Light Finds Us" — light is alive.
        COLOR TEMP: 3500-4500K warm, rich, saturated color environment.
        SHADOW: Deep dramatic shadows with color — not neutral black but tinted.
        REFERENCE: Gucci SS2025 — light as "living presence", revealing and illuminating.`,

      // === レガシー互換（強化バージョン）===
      studio: `Clean professional studio lighting. Three-point setup with soft boxes.
        Neutral white balance (5500K), minimal harsh shadows. Even, consistent illumination.`,
      golden_hour: `Golden hour sunset lighting. Warm amber tones (3200K), long soft shadows.
        Volumetric lighting with light rays filtering through air. Natural warmth.`,
      neon: `Cyberpunk neon aesthetic. High-contrast cyan and magenta rim lighting.
        Dark moody shadows, urban night vibe. Saturated color spill on skin and fabric.`,
      cinematic: `Cinematic chiaroscuro lighting. Dramatic highlights with deep moody shadows.
        High dynamic range, emphasis on form and volume. Film-grade color grading.`,
      high_key: `Bright high-key photography. Extremely soft diffused light, almost shadowless.
        Clean and airy minimalist aesthetic. Background blends seamlessly.`
    };

    const posePrompts: Record<string, string> = {
      // === EC商品ページ向け ===
      ec_neutral: `EC product neutral standing pose.
        BODY: Weight evenly distributed, shoulders relaxed and slightly back, chin level.
        ARMS: Hanging naturally at sides with slight bend at elbows, fingers relaxed (not stiff).
        LEGS: Feet shoulder-width apart, one foot 5cm ahead of other for subtle dynamism.
        TORSO: Slight 5-10 degree body rotation to create depth without losing garment visibility.
        EXPRESSION: Neutral, confident, direct gaze toward camera. No smile.
        REFERENCE: Prada EC product pages — clean, elegant, garment-first.
        CRITICAL: Pose must NOT distract from the clothing. All garment details must remain fully visible.`,

      ec_relaxed: `EC relaxed standing pose — natural and lived-in.
        BODY: Weight shifted to one hip (contrapposto), creating natural S-curve in body line.
        ARMS: One arm relaxed at side, other hand gently resting on hip or upper thigh.
        LEGS: Weight-bearing leg straight, other leg slightly bent at knee with toe pointed.
        TORSO: Natural body angle, not perfectly straight — 10-15 degree casual rotation.
        EXPRESSION: Soft, approachable, looking at or slightly past camera lens.
        REFERENCE: Miu Miu EC — spontaneous, "just as they are" quality.
        CRITICAL: Must appear effortless, not choreographed. Garment fit and drape clearly visible.`,

      ec_three_quarter: `EC three-quarter turn pose for silhouette and profile showcase.
        BODY: Model turned 30-45 degrees from camera, face looking back toward lens.
        ARMS: Back arm visible along body line, front arm in natural relaxed position.
        LEGS: Front leg crossed slightly over back leg for visual interest in body line.
        TORSO: Twisted at waist — shoulders turned toward camera while hips remain turned away.
        EXPRESSION: Confident side-glance, chin slightly lifted for elegance.
        REFERENCE: NET-A-PORTER/SSENSE product pages — garment silhouette emphasis.
        CRITICAL: Side seams, garment profile, and back details partially visible for e-commerce documentation.`,

      // === エディトリアル / キャンペーン向け ===
      editorial_power: `Prada-inspired intellectual power pose — commanding presence.
        BODY: Strong vertical axis, shoulders squared to camera, commanding spatial presence.
        ARMS: One arm akimbo or strategically placed to frame garment structure, other relaxed at side.
        LEGS: Planted with authority, wider than shoulder-width stance conveying stability.
        TORSO: Upright, regal posture with slight forward lean suggesting confident engagement.
        EXPRESSION: Intense, introspective gaze — Steven Meisel portraiture quality. No smile.
        REFERENCE: Prada SS2025 "Acts Like Prada" — Carey Mulligan character portrayals.
        MOOD: Intellectual, commanding, architecturally structured body language.`,

      editorial_movement: `Prada kinetic movement pose — captured mid-motion, dynamic life energy.
        BODY: Body in dynamic transitional moment — between steps, mid-turn, or mid-gesture.
        ARMS: In motion — mid-swing, reaching outward, or adjusting garment/hair naturally.
        LEGS: One leg mid-stride, weight transferring forward, showing garment flow and fabric drape.
        TORSO: Slight twist capturing rotational energy, fabric movement clearly visible.
        EXPRESSION: Focused, purposeful, looking in the direction of movement with intention.
        REFERENCE: Prada FW2025 "PRADA Motion Pictures" — "free movement", "intensity of dynamic life".
        CRITICAL: Garment must show natural motion — fabric catching air, drape responding to movement.`,

      editorial_raw: `Prada "Raw Glamour" deliberately imperfect pose — beautiful undone aesthetic.
        BODY: Deliberately imperfect posture — slight slouch, one shoulder dropped lower than other.
        ARMS: Asymmetric positioning — one arm tucked close to body, other reaching or draped casually.
        LEGS: Casual stance, legs crossed at ankle or one foot turned slightly inward.
        TORSO: Relaxed core, body weight leaning slightly off-center, not perfectly balanced.
        EXPRESSION: Bare-faced beauty, unflinching raw gaze, emotional vulnerability visible.
        REFERENCE: Prada FW2025 "Raw Glamour" — "tension between done-up and undone".
        MOOD: Unpolished authenticity, purposeful imperfection, emotional depth and honesty.`,

      editorial_miumiu: `Miu Miu subversive feminine pose — playful rebellion meets girlhood charm.
        BODY: Youthful dynamism with unexpected angles — pigeon-toed stance or asymmetric body line.
        ARMS: One hand in hair, playing with clothing hem, or propping chin — girlhood gesture language.
        LEGS: Playful positioning — knees turned slightly inward, one leg popped back, or feet crossed.
        TORSO: Slight slouch or exaggerated posture shift — "school uniform meets chaos" energy.
        EXPRESSION: Coy, knowing, slightly mischievous half-smile — capturing a "self-conscious moment".
        REFERENCE: Miu Miu SS2025 campaign — "precision and simplicity" with spontaneous styling.
        MOOD: Youthful rebellion, hyper-feminine yet subversive, nostalgic charm and wit.`,

      // === ライフスタイル / Instagram向け ===
      lifestyle_candid: `Candid stolen-moment pose — Steven Meisel "unrehearsed interaction" quality.
        BODY: Natural mid-action position — model caught adjusting jacket, glancing sideways, turning.
        ARMS: Engaged in natural activity — fixing collar, brushing hair aside, reaching for something.
        LEGS: Weight in casual motion, no perfectly planted or posed stance.
        TORSO: Caught between movements, natural unforced body language.
        EXPRESSION: Unaware-of-camera quality, gaze directed elsewhere, genuine natural expression.
        REFERENCE: Prada FW2024 campaign — "intimate and unrehearsed interaction", "stolen moments".
        CRITICAL: Must feel like a genuine moment captured, NOT a controlled fashion pose.`,

      lifestyle_playful: `Miu Miu Instagram playful lifestyle pose — youthful exuberance.
        BODY: Dynamic, energetic movement — spinning, light skipping, or expressive hand gesture.
        ARMS: Expressive gestures — arms outstretched wide, playful hand-to-face, or animated talking.
        LEGS: In motion — mid-skip, one foot lifted playfully, or crouched with youthful energy.
        TORSO: Twisted or leaning with exuberance, showing garment in dynamic movement.
        EXPRESSION: Genuine joy or mischief, authentic smile or laugh, eyes sparkling with life.
        REFERENCE: Miu Miu Instagram style — personality-driven, dynamic poses, fashion-forward energy.
        MOOD: Irresistible energy, youth culture, social-media-native self-expression and freedom.`,

      lifestyle_seated: `Fashionable seated pose with prop — magazine editorial quality composition.
        BODY: Seated elegantly on minimal chair/stool/steps, legs creating diagonal visual interest.
        ARMS: One arm resting on armrest/knee, other hand near face or adjusting clothing accessory.
        LEGS: Crossed at knee creating strong diagonal, or stretched forward showing shoe detail clearly.
        TORSO: Upright elegant spine with slight lean, or deliberate fashion-slouch depending on brand.
        EXPRESSION: Contemplative gaze, slight head tilt, confident relaxed eye contact.
        REFERENCE: Miu Miu campaign imagery — chair prop, dynamic seated composition, pattern showcase.
        CRITICAL: Prop must be minimal (wireframe, acrylic, simple stool — never ornate furniture).`,

      // === レガシー互換（強化バージョン）===
      ec_direct: `EC direct upright standing pose — strict product catalog standard.
        BODY: Perfectly upright, weight evenly distributed on both feet, shoulders level and square to camera.
        ARMS: Both arms hanging completely straight and relaxed at sides. Hands fully open, fingers lightly together, pointing straight down.
        LEGS: Feet parallel, hip-width apart — no offset or rotation.
        TORSO: No rotation, no lean, facing directly forward (or completely backward for back view).
        EXPRESSION: Neutral, direct gaze, no expression — garment documentation mode only.
        REFERENCE: UNIQLO product catalog — clean, strict, zero distraction from garment.
        CRITICAL: Zero drama. This pose is invisible — the garment is 100% the subject.`,

      ec_walk: `EC walking motion pose — natural stride captured mid-step.
        BODY: Model captured mid-stride — weight transferring from back foot to front foot.
        ARMS: Swinging naturally in opposition to legs — relaxed, natural arm swing.
        LEGS: Front leg between mid-swing and touchdown, back leg pushing off. Natural relaxed gait.
        TORSO: Very slight forward lean into the walk, natural rotation from arm swing.
        EXPRESSION: Neutral confidence, looking slightly past camera — focus on movement, not posing.
        REFERENCE: Zara / H&M catalog walking shots — garment drape in natural motion clearly visible.
        CRITICAL: Garment flow and fabric drape must be clearly visible as the primary focus of the motion.`,


      standing: `Elegant neutral standing pose. Weight slightly shifted to one side, shoulders relaxed and open.
        Arms at sides with natural gentle curve in fingers. Direct confident gaze. Clean body line.`,
      walking: `Dynamic walking motion captured mid-stride. Front arm swinging naturally opposite to leading leg.
        Fabric in realistic motion showing drape quality. Heel-to-toe natural gait, runway confidence.`,
      sitting: `Fashionable seated pose on minimalist stool. Legs positioned elegantly, creating diagonal lines.
        One hand resting naturally, posture upright but relaxed. Garment folds and drape clearly visible.`,
      leaning: `Casual leaning pose against architectural wall or clean column. Body at slight angle.
        Weight against support surface, one leg bent. Relaxed shoulder drop. Urban editorial quality.`,
      running: "High-action running pose, athletic garment flow. Arms pumping, legs in full stride. Dynamic fabric movement.",
      crossed_arms: `Sophisticated pose with arms crossed at chest level. Strong confident stance.
        Shoulders squared, chin level. Arms framing torso garment. Authoritative editorial quality.`,
      hands_in_pockets: `Relaxed casual pose with hands in pockets. Thumbs may be visible outside pocket edge.
        Weight shifted to one hip, natural contrapposto. Approachable yet stylish body language.`,
      jumping: "Dynamic jumping action pose, high energy. Arms and legs in expressive mid-air position. Garment catching air.",
      squatting: `Streetwear-inspired squatting pose from low angle. Knees wide, elbows on knees.
        Full shoe visibility, pant break detail visible. Urban fashion editorial energy.`,
      hero: `Dramatic high-fashion hero pose. Strong wide stance, chin lifted, powerful body line.
        Arms positioned to create V-shape or strong silhouette. Aspirational campaign quality.`
    };

    const stylePrompts: Record<string, string> = {
      // === ブランド参照スタイル ===
      prada_intellectual: `Prada intellectual editorial style.
        COLOR PALETTE: Neutral tones — black, navy, caramel, stone grey. Muted, never garish.
        MOOD: Cerebral sophistication, quiet confidence, architectural precision.
        STYLING: Minimal, precise. Every element intentional. Clean lines, structural forms.
        MODEL DIRECTION: Intelligent gaze, composed demeanor. Never overly emotional.
        POST-PROCESSING: Sharp focus, balanced exposure, true-to-life color. No heavy filters.
        REFERENCE: Prada SS2025 "Acts Like Prada" — Steven Meisel portraiture.`,

      miumiu_playful: `Miu Miu subversive playful editorial style.
        COLOR PALETTE: Pastels with pops of bold — powder pink, lilac, butter yellow, electric blue.
        MOOD: Youthful rebellion, nostalgic girlhood, playful contradiction.
        STYLING: Twisted classics — shirts knotted, sweaters as bustiers, mismatched layers.
        MODEL DIRECTION: Coy, mischievous energy. Self-aware femininity with knowing wink.
        POST-PROCESSING: Slight film grain, warm undertones, soft contrast. Instagram-native quality.
        REFERENCE: Miu Miu SS2025 — "precision and simplicity" with spontaneous styling.`,

      therow_silent: `THE ROW silent luxury editorial style.
        COLOR PALETTE: Monochromatic — ivory, sand, charcoal, black. Ultra-restrained.
        MOOD: Serene contemplation, timeless elegance, whispered luxury.
        STYLING: Impeccable fit, invisible construction. Fabric is the star — cashmere, silk, wool.
        MODEL DIRECTION: Serene, almost meditative presence. Minimal expression, maximum presence.
        POST-PROCESSING: Desaturated, ethereal. Soft highlight roll-off. Fine art photography quality.
        REFERENCE: THE ROW FW2025 — Mark Borthwick ethereal lookbook photography.`,

      acne_sculptural: `Acne Studios sculptural minimalist editorial style.
        COLOR PALETTE: Muted, art-gallery neutral — concrete grey, off-white, dusty rose, black.
        MOOD: Cool detachment, intellectual art, contemporary culture intersection.
        STYLING: Sculptural silhouettes, experimental proportions. Architecture meets fashion.
        MODEL DIRECTION: Understated cool, deadpan expression. Individual expression, not performance.
        POST-PROCESSING: High contrast, desaturated color. Gallery-quality sharpness.
        REFERENCE: Acne Studios — "maximalist minimalism", multidisciplinary art-fashion.`,

      gucci_maximalist: `Gucci maximalist eclectic editorial style.
        COLOR PALETTE: Rich, saturated — emerald, burgundy, gold, teal, magenta. Layer colors boldly.
        MOOD: Opulent storytelling, cultural kaleidoscope, excess with intention.
        STYLING: Pattern mix, texture clash. Velvet with silk, brocade with denim. More is more.
        MODEL DIRECTION: Bold, expressive personality. Confidence in eclectic self-expression.
        POST-PROCESSING: Rich saturation, warm color grading. Cinematic depth and vibrancy.
        REFERENCE: Gucci SS2025 "Where Light Finds Us" — dreamlike, narrative visual poetry.`,

      zara_editorial: `Zara high-fashion editorial style.
        COLOR PALETTE: Seasonal trend-driven — earth tones, Western-inspired neutrals, or high-contrast.
        MOOD: Aspirational accessibility, editorial confidence without pretension.
        STYLING: Trend-forward, clean. Each piece styled to maximize visual impact.
        MODEL DIRECTION: Sculptural body language, averted gaze. Alluring distance, never direct eye contact.
        POST-PROCESSING: Clean, high-contrast. Professional but accessible editorial quality.
        REFERENCE: Zara — "upending e-commerce with high-fashion editorial content".`,

      // === レガシー互換（強化バージョン）===
      vogue: `VOGUE editorial aesthetic. High-contrast avant-garde imagery.
        Bold, dramatic compositions with strong visual statements. Fashion-forward experimentation.`,
      elle: `ELLE chic lifestyle aesthetic. Approachable luxury with warmth and personality.
        Sophisticated but relatable, celebrating personal style. Aspirational yet accessible.`,
      collection: `Technical lookbook style. High-fidelity fabric documentation.
        Precise color accuracy, maximum garment detail visibility. Catalog-grade consistency.`,
      japanese_magazine: `Japanese fashion magazine minimalist soft-focus aesthetic.
        Filmic grain, dreamy atmosphere. Wabi-sabi influence — beauty in imperfection and restraint.`
    };

    const shotTypePrompts: Record<string, string> = {
      // === EC必須ショット ===
      full_body_front: `Full body frontal shot, head-to-toe. Model faces directly toward camera.
        COMPOSITION: Center-aligned, 10% headroom, feet visible with 5% floor margin.
        CRITICAL for EC: Garment silhouette, hem length, sleeve length, and overall proportions
        must be clearly identifiable. No dramatic angles. Minimal shadow on background.
        Clean, distraction-free background. Product-first composition.
        REFERENCE STANDARD: SSENSE, NET-A-PORTER, Jil Sander e-commerce product pages.`,

      full_body_back: `Full body REAR view shot, head-to-toe. Model faces COMPLETELY AWAY from camera (180° rotation).
        OUTFIT CONTINUITY LOCK (CRITICAL — HIGHEST PRIORITY):
        This is the EXACT SAME outfit as the front view — IDENTICAL garments, IDENTICAL colors, IDENTICAL styling, IDENTICAL layering.
        Imagine the model from the front shot has literally turned around 180°. NOTHING about the clothing changes whatsoever.
        The garment colors (every hex value), fabric textures, layering order, and fit silhouette must be 100% identical to what is shown in the REFERENCE images.
        If the reference shows a brown jacket over a black top with grey pants — it must remain brown jacket, black top, grey pants in this back shot. No exceptions.
        POSE LOCK (MANDATORY — EC NEUTRAL BACK POSE):
        The model MUST stand in a plain, neutral EC documentation pose:
        - ARMS: Both arms hanging naturally and relaxed at either side of the body. Hands lightly open, fingers pointing downward.
        - STRICTLY FORBIDDEN: Hands on hips, hands in pockets, crossed arms, raised arms, or ANY dramatic arm position.
        - LEGS: Feet roughly parallel, shoulder-width apart. No wide-legged stance, no crossed legs.
        - TORSO: Straight upright posture. Shoulders square to camera, no twisting.
        - This is a PRODUCT DOCUMENTATION shot — plain, neutral, completely non-dramatic pose only.
        COMPOSITION: Center-aligned, same framing as front shot for visual consistency.
        CRITICAL for EC: Back design details (zippers, vents, back pockets, seam lines, labels, 
        back hem shape, shoulder blade drape) must be clearly visible. 
        Hair: tied back or pinned up so it does NOT obstruct garment back neckline, collar stand, upper back seams, or any rear garment details.
        REFERENCE STANDARD: Matches front shot framing exactly for EC product page pairing.`,

      // === 商品フォーカスショット ===
      bust_top: `EC BUST-TOP CROP — Close-up framing from mid-chest to just above head.
        CRITICAL GARMENT LOCK (HIGHEST PRIORITY):
        This shot is a CLOSE-UP CROP of the FRONT VIEW — the camera moves closer, NOTHING else changes.
        The garment(s) visible in this bust-top crop MUST be 100% identical to the REFERENCE IMAGES.
        If the reference shows a light blue Oxford shirt: this crop MUST show the SAME light blue Oxford shirt — same color, same collar style, same buttons, same fabric.
        Do NOT introduce any garment not shown in the reference images. Do NOT change the garment design, color, or fabric.
        POSE: Arms hanging naturally at sides in neutral EC pose.
        ARMS POSITION: The upper arms should be in a relaxed downward position — the same natural position as the full-body front shot, just cropped closer.
        STRICTLY FORBIDDEN: Hands on hips, raised arms, crossed arms in this shot.
        FOCUS AREAS: Collar construction, neckline shape, fabric texture/weave at close range, button/zipper details,
        shoulder seam placement, stitching quality, layering interaction if outer garment worn.
        Material differentiation between layers must be visible.
        REFERENCE: Burberry/GANNI EC bust detail shots — visible thread texture, seam construction quality.`,

      middle_top: `Medium crop from chest to hip level. Torso-focused framing.
        CRITICAL: This shot showcases the TORSO INTERACTION ZONE — waistline, tucking style,
        belt loops, pocket placement, hem detail, and how garments interact at the waist
        (tucked/untucked/layered/half-tuck). Layer overlap shadows must be realistic.
        Show brand labels/logos if visible at collar or chest level.
        REFERENCE: Burberry × GANNI layering shots — trench coat lining pattern visible,
        half-zip pullover texture contrast against striped shirt underneath.`,

      bottom_focus: `Lower body crop from waist to feet. Bottom-half focused framing.
        CRITICAL: Focus on BOTTOM garments — pants/skirt silhouette, pleat/crease details,
        hem finish quality, and shoe-pant interaction (break point, cuff style, crop length).
        Shoe style must be clearly visible with material texture detail.
        If wearing a skirt, movement and drape quality must be emphasized.
        REFERENCE: EC product pages showing exact pant/skirt length relative to shoe height.`,

      // === 用途別ショット ===
      instagram_square: `Editorial lifestyle shot optimized for 1:1 square composition.
        Dynamic pose allowed — more creative framing with rule of thirds, generous negative space.
        Can include environmental context (minimal props, textured backgrounds).
        Model should show personality and natural movement (not stiff product pose).
        Color grading: Slightly warmer and more editorial than clinical EC shots.
        Visual story-telling priority over pure product documentation.
        REFERENCE: Miu Miu Instagram — dynamic poses, personality, fashion-forward cropping.`,

      campaign_editorial: `FASHION CAMPAIGN IMAGE — brand-level advertising quality, NOT an EC product shot.
        This is a campaign photograph defined by strong visual identity and emotional narrative.

        FRAMING & COMPOSITION (CRITICAL):
        Cinematic 16:9 widescreen with aggressive rule-of-thirds — subject is NOT centered.
        Generous architectural negative space: at least 40% of frame as intentional empty space.
        Camera angle: 35mm lens feel, shot from slightly below eye level (5-10 degrees) for authority.
        Shallow depth of field: f/1.8-f/2.8 equivalent — background environment softly blurred but
        still recognizable with texture. Leading lines (architecture, shadows, light rays) pull
        the eye toward the model. Avoid symmetric, balanced, or product-catalog framing entirely.

        MODEL DIRECTION (CRITICAL — NOT an EC display pose):
        Expression: Intense, self-possessed, introspective. Absolutely NO smiling.
        Deadpan or emotionally charged gaze — looking at camera or deliberately off-frame.
        Body language: commanding, grounded, or dynamically mid-motion. Never a "display" stance.
        References: Prada Meisel portraiture, Celine Slimane portraits, Zara FW2024 angular looks.
        Feel: a "stolen moment" — authentic and uncontrived, as if caught mid-thought or mid-step.

        LIGHTING (CRITICAL — campaign lighting is fundamentally different from EC studio):
        ONE strong directional key light — hard-edged or large but directional, NOT a flat softbox.
        Contrast ratio 1:4 to 1:6 — subject partially illuminated, surroundings dramatically underlit.
        Deep intentional shadows on face and body are COMPOSITIONAL elements, not mistakes to fix.
        Shadow shapes on background wall or floor contribute to the image's graphic quality.
        Color temperature: 4500-5200K, slightly cool and desaturated for timeless campaign quality.
        ABSOLUTELY NO: ring light, flat softbox fill, pure white background, shadow elimination.
        Reference lighting: Peter Lindbergh (textural light + shadow), Meisel (graphic contrast).

        ENVIRONMENT & BACKGROUND (CRITICAL — white studio is FORBIDDEN):
        The background MUST have visual texture, depth, and tonal richness.
        Options: raw concrete or plaster wall, dramatic architectural interior (columns, arches),
        moody exterior (rain-wet urban street, coastal cliffs, grand staircase, abandoned space),
        or richly textured gradient shadow environment.
        Background tone must create contrast with garment color — dark on light, or vice versa.
        Environmental elements (shadows, reflections, light shafts) add narrative depth.
        Reference: Celine Nice locations, Prada warehouse/stage sets, Zara urban billboard aesthetic.

        COLOR GRADING (CRITICAL — this is what makes it a campaign, not a product shot):
        Film-grade palette: desaturated overall, lifted blacks, slightly crushed highlights.
        NOT vibrant digital color — muted, tonal, aged-film quality.
        Skin tones: warm golden highlight with cool blue-grey shadow split toning.
        Color cast: slight cyan or amber tint in shadows depending on brand mood.
        Grain: fine film grain visible (ISO 800-1600 equivalent), adds texture and authenticity.
        Subtle lens vignette (darkened corners, natural and not heavy).
        Reference: Kodak Vision 3 film stock emulation. Peter Lindbergh B&W or warm-toned prints.

        REFERENCE CAMPAIGNS: Prada "Motion Pictures" FW2025, Zara × Meisel FW2024 black-and-white
        studio portraits, Celine Hedi Slimane SS2025 Nice location, Miu Miu SS2025 precision+spontaneity.`,

      // === EC multi-view additional shots ===
      ec_side: `Three-quarter turn side view for silhouette and side-seam showcase.
        OUTFIT CONTINUITY LOCK (CRITICAL — HIGHEST PRIORITY):
        This is the EXACT SAME outfit as the front view — IDENTICAL garments, IDENTICAL colors, IDENTICAL styling.
        The model has simply rotated 45 degrees to the right. NOTHING about the clothing changes.
        All garment colors, fabric textures, layering, and silhouette must be 100% identical to the front/back shots.
        CRITICAL FRAMING: Model rotated approximately 45 degrees from camera (three-quarter turn).
        Face should be looking slightly back toward the camera — over-the-shoulder or subtle glance.
        MUST SHOW: Side seams, garment profile, shoulder-to-hem silhouette, side pocket detail.
        ARMS: Back arm visible along body line; front arm in relaxed natural position.
        LEGS: Front leg slightly crossed over back, creating visual interest in body line.
        FRAMING: Full body head-to-toe, same height as front/back shots for product page consistency.
        BACKGROUND: Same neutral studio as front/back EC shots.
        REFERENCE: NET-A-PORTER/SSENSE side-view product shots — silhouette documentation.`,

      // === レガシー互換 ===
      full_body: "Full body long shot, showing entire mannequin from head to toe, leaving headspace.",
      upper_body: "Medium close-up shot, framing from waist up, focus on torso and face.",
      bust_up: `Close-up bust shot, framing from chest up to just above head, focus on face, neck, and upper chest area. 
        CRITICAL: Ensure necklaces, earrings, and facial accessories are clearly visible and prominently displayed. 
        Perfect for showcasing jewelry details.`,
      lower_body: "Medium shot framing from waist down, focus on pants/skirt and shoes."
    };

    // Override view for shot-type-specific camera directions
    const shotTypeViewOverrides: Record<string, string> = {
      full_body_back: 'Direct back view, facing COMPLETELY away from camera. Model rotated 180 degrees.',
      ec_side: 'Three-quarter turn (3/4) — model rotated approximately 45 degrees, face looking slightly back toward camera. Side profile visible, garment silhouette and side seams clearly visible.',
      bust_top: 'Close-up bust-top framing. Camera at chest level, looking slightly up toward face. Tight crop from mid-chest to top of head.',
      bust_up: 'Close-up bust-up framing. Camera at chest level, tight crop from chest to top of head.',
      bottom_focus: 'Lower body framing. Camera at waist level, looking down. Crop from waist to feet, shoes fully visible.',
      middle_top: 'Torso-focused medium crop from chest to hip level.',
    };
    const effectiveViewDesc = shotTypeViewOverrides[scene.shotType] ?? viewDesc;

    const prompt = `
      TECHNICAL SPECIFICATION: 
      Camera: Hasselblad H6D. Lens: ${scene.focalLength}. f/2.8, ISO 64. 
      Professional editorial for ${stylePrompts[mannequin.editorialStyle]}.
      FRAMING: ${shotTypePrompts[scene.shotType] || shotTypePrompts['full_body']}.
      
      SUBJECT:
      ${images.base_model ? `BASE MODEL IDENTITY (STAGE 1 CASTING — ABSOLUTE LOCK):
      A base model was generated in Stage 1 (CASTING). The person in the BASE_MODEL reference image
      defines the CANONICAL identity for this entire session.
      - Face: 100% identical — same bone structure, jawline, nose, eyes, eyebrows, lips, expression quality
      - Body: exact same proportions, height, build, posture
      - Skin: exact same tone, complexion, texture
      - Hair: exact same color, length, style, texture
      ALL subsequent shots MUST reproduce this exact person. No deviation is acceptable.
      The BASE_MODEL image shows the model in neutral clothing — you will REPLACE that clothing
      with the product garments described below, while keeping the person's identity LOCKED.
      ` : ''}
      ${images.anchor_model ? `IDENTITY LOCK (CRITICAL — HIGHEST PRIORITY):

      The model in this image MUST be 100% identical to the ANCHOR_MODEL reference image.
      - Same face structure, bone structure, jawline, nose, eyes, eyebrows, lips
      - Same skin tone and complexion
      - Same hair style, color, length, and texture
      - Same body proportions, height, posture quality
      - Same makeup and overall appearance
      - Same outfit and garments — IDENTICAL clothing to the anchor_model image
      POSE CONSTRAINT (MANDATORY FOR ALL EC SHOTS):
      The model MUST maintain an EC-appropriate neutral documentation pose:
      - ARMS: Both arms hanging naturally and relaxed at sides of the body (NOT on hips, NOT crossed, NOT raised)
      - HANDS: Fingers lightly open, pointing relaxed downward — no gripping hips or dramatic hand positions
      - LEGS: Feet parallel, shoulder-width apart — no wide stance, no crossed legs
      - POSTURE: Straight, upright — this is a product documentation shot, not an editorial
      - This pose constraint applies to: back view, bust-top crop, side view, and bottom-focus crop
      Only the CAMERA ANGLE, FRAMING, and CROP should differ between shots.
      ` : ''}
      ${images.model ? "CRITICAL: The subject MUST be the person shown in the REFERENCE MODEL image. Preserve their facial features, body type, and hair style exactly." : ""}
      A realistic ${mannequin.ageGroup} ${mannequin.ethnicity} ${mannequin.gender} model, ${mannequin.bodyType} build.
      SKIN TONE: ${(() => {
        const skinToneDescriptions: Record<string, string> = {
          fair: 'fair skin — porcelain-white, cool or neutral undertone, visible delicate veins',
          light: 'light skin — slightly warm ivory tone, natural glow, light beige complexion',
          medium: 'medium skin — warm olive or tan complexion, golden-brown undertone',
          tan: 'tan skin — sun-kissed bronze tone, warm brown undertone',
          deep: 'deep skin — rich dark brown, deep ebony complexion with warm undertone',
        };
        return skinToneDescriptions[(mannequin as any).skinTone] ?? ((mannequin as any).skinTone ?? 'fair skin');
      })()} — render skin texture with accurate undertone and luminosity.
      HAIR COLOR AND LENGTH: ${(() => {
        const hairColorDescriptions: Record<string, string> = {
          black: 'jet black hair',
          dark_brown: 'dark brown hair (deep chocolate, near-black)',
          brown: 'medium brown hair (warm chestnut brown)',
          light_brown: 'light brown hair (warm caramel-honey tone)',
          blonde: 'blonde hair (golden yellow)',
          platinum: 'platinum blonde hair (very pale, almost white)',
          auburn: 'auburn hair (reddish-brown)',
          red: 'vivid red hair',
        };
        const hairLengthDescriptions: Record<string, string> = {
          short: 'short (above ears)',
          bob: 'bob cut (jaw length)',
          medium: 'medium length (shoulder length)',
          long: 'long (below shoulders)',
          extra_long: 'extra-long (mid-back or longer)',
        };
        const colorDesc = hairColorDescriptions[(mannequin as any).hairColor] ?? `${(mannequin as any).hairColor ?? 'black'} hair`;
        const lengthDesc = hairLengthDescriptions[(mannequin as any).hairLength] ?? ((mannequin as any).hairLength ?? 'medium length');
        return `${colorDesc}, ${lengthDesc}`;
      })()} — CRITICAL: hair color and length MUST match these specifications exactly.
      ${mannequin.height ? `Height: ${mannequin.height}cm.` : ''} ${mannequin.weight ? `Body Size/Weight: ${mannequin.weight}.` : ''}
      Pose: ${posePrompts[mannequin.pose] ?? posePrompts['ec_neutral']}.


      PRECISION FIT & SIZING (CRITICAL):
      ${garmentMeasurements ? `
      Detailed Measurements Provided:

      TOPS Spec:
      ${garmentMeasurements.tops?.shoulderWidth ? `- Shoulder: ${garmentMeasurements.tops.shoulderWidth}cm` : ''}
      ${garmentMeasurements.tops?.chestWidth ? `- Body Width: ${garmentMeasurements.tops.chestWidth}cm` : ''}
      ${garmentMeasurements.tops?.length ? `- Length: ${garmentMeasurements.tops.length}cm` : ''}
      ${garmentMeasurements.tops?.sleeveLength ? `- Sleeve: ${garmentMeasurements.tops.sleeveLength}cm` : ''}

      BOTTOMS Spec:
      ${garmentMeasurements.pants?.waist ? `- Waist: ${garmentMeasurements.pants.waist}cm` : ''}
      ${garmentMeasurements.pants?.hip ? `- Hip: ${garmentMeasurements.pants.hip}cm` : ''}
      ${garmentMeasurements.pants?.length ? `- Total Length: ${garmentMeasurements.pants.length}cm` : ''}
      ${garmentMeasurements.pants?.inseam ? `- Inseam: ${garmentMeasurements.pants.inseam}cm` : ''}

      OUTERWEAR Spec:
      ${garmentMeasurements.outer?.shoulderWidth ? `- Shoulder: ${garmentMeasurements.outer.shoulderWidth}cm` : ''}
      ${garmentMeasurements.outer?.chestWidth ? `- Body Width: ${garmentMeasurements.outer.chestWidth}cm` : ''}
      ${garmentMeasurements.outer?.length ? `- Length: ${garmentMeasurements.outer.length}cm` : ''}
      ${garmentMeasurements.outer?.sleeveLength ? `- Sleeve: ${garmentMeasurements.outer.sleeveLength}cm` : ''}
      
      FIT INSTRUCTION: Use these precise dimensions to determine silhouette/drape relative to the ${mannequin.height ? mannequin.height + 'cm' : 'standard'} model body.
      - Contrast the garment width against body width to accurately depict oversized vs slim fits.
      - Ensure length falls exactly where specified (e.g., hips, ankles, etc.).
      ` : "Fit: Standard sizing compliant with model physique."}

      LIGHTING & BACKGROUND — スタジオEC基準 (CRITICAL):
      ${presetPrompts[scene.lightingPreset]}. 
      Lighting color: ${lighting.color}. Intensity level: ${lighting.intensity}.
      STUDIO CLEANLINESS (MANDATORY): This is a professional EC product photo.
      - NO visible light sources, softboxes, light stands, or photography equipment in the frame.
      - NO light flares, lens reflections, or hot spots from studio equipment.
      - NO visible background seams or studio floor joins.
      - Background MUST be pure, seamless, and clean — as if infinitely deep.
      - Shadows: soft and natural only (no hard-edged flash shadows).
      REFERENCE: Uniqlo/Zara EC studio standard — flat, professional, zero studio artifacts visible.

      OUTFIT DETAILS — COLOR LOCK ACTIVE (MUST MATCH EXACTLY IN ALL SHOTS):
      CRITICAL COLOR RULE: Every color listed below is LOCKED. Studio lighting must NOT shift, lighten, darken, or alter these colors in any way. The colors you see in the reference images ARE the correct colors. Render them as-is.
      ${analysis.tops ? `TOP: ${analysis.tops.description}. Fabric: ${analysis.tops.fabric}. Style: ${analysis.tops.style}. COLOR LOCKED: ${analysis.tops.colorDescription ?? analysis.tops.colorHex} — do NOT alter this color under any lighting. Render the exact hue.` : ''}
      ${analysis.inner ? `INNER: ${analysis.inner.description}. Fabric: ${analysis.inner.fabric}. Style: ${analysis.inner.style}. COLOR LOCKED: ${analysis.inner.colorDescription ?? analysis.inner.colorHex} — do NOT alter this color under any lighting. Render the exact hue.` : ''}
      ${analysis.pants ? `BOTTOM: ${analysis.pants.description}. Fabric: ${analysis.pants.fabric}. Style: ${analysis.pants.style}. COLOR LOCKED: ${analysis.pants.colorDescription ?? analysis.pants.colorHex} — do NOT alter this color under any lighting. Render the exact hue.` : ''}
      ${analysis.outer ? `OUTER: ${analysis.outer.description}. Fabric: ${analysis.outer.fabric}. Style: ${analysis.outer.style}. COLOR LOCKED: ${analysis.outer.colorDescription ?? analysis.outer.colorHex} — do NOT alter this color under any lighting. Render the exact hue.` : ''}
      ${analysis.shoes ? `SHOES: ${analysis.shoes.description}. Fabric: ${analysis.shoes.fabric}. Style: ${analysis.shoes.style}. COLOR LOCKED: ${analysis.shoes.colorDescription ?? analysis.shoes.colorHex} — do NOT alter this color under any lighting. Render the exact hue.` : `FOOTWEAR (CRITICAL — NO BARE FEET): No shoes image was provided, but bare feet are NEVER acceptable in EC fashion photography.
      DEFAULT FOOTWEAR: Render the model wearing simple, neutral, non-distracting flat shoes or low pumps in a neutral color (beige, ivory, light grey, or black — match garment colors).
      Shoe style must be minimal and unobtrusive — the goal is to avoid bare feet, NOT to showcase the shoe.`}

      GARMENT LENGTH LOCK (CRITICAL — ALL SHOTS):
      ${analysis.pants ? `PANTS/BOTTOM LENGTH: The bottom garment in the reference image has a specific hem length — this MUST be reproduced IDENTICALLY in every shot.
      If the reference shows FULL-LENGTH pants reaching the ankle/floor, they must be full-length in ALL shots (front, back, side, bust, detail).
      DO NOT shorten, crop or alter the hem line between shots. The pant hem MUST land at the same point on the leg in every single view.
      CRITICAL: Never render cropped pants as full-length or full-length pants as cropped — replicate the EXACT hem position from the reference image.` : ''}
      ${analysis.tops ? `TOP/SHIRT TUCK SYMMETRY: If the shirt/top is tucked in, it MUST be tucked symmetrically on BOTH sides.
      STRICTLY FORBIDDEN: One side tucked in while other side hangs out. Half-tuck (front-tuck only) is only acceptable if the reference image explicitly shows this styling.
      RULE: If the reference shows the shirt fully untucked → render fully untucked on all sides. If fully tucked → both sides tucked evenly.` : ''}


      ${analysis.layeringState ? `
      ══════════════════════════════════════════════════════
      STYLING STATE LOCK — 着こなし状態 (ABSOLUTE LOCK — DO NOT DEVIATE):
      ══════════════════════════════════════════════════════
      This is the EXACT styling/wearing state that was captured from the reference images.
      It MUST be reproduced identically in EVERY shot — front, back, side, bust-up, and bottom crops.
      Any deviation from this styling state is an ERROR.

      ${analysis.layeringState.outerOpenState ? `OUTER GARMENT STATE: ${analysis.layeringState.outerOpenState.replace(/_/g, ' ').toUpperCase()}${analysis.layeringState.outerButtonState ? ` — ${analysis.layeringState.outerButtonState}` : ''}` : ''}
      ${analysis.layeringState.topTuckState ? `SHIRT/TOP TUCK STATE: ${analysis.layeringState.topTuckState.replace(/_/g, ' ').toUpperCase()}` : ''}
      ${analysis.layeringState.innerVisibility ? `INNER LAYER VISIBILITY: ${analysis.layeringState.innerVisibility.replace(/_/g, ' ').toUpperCase()}` : ''}
      ${analysis.layeringState.innerHemVisible !== undefined ? `INNER HEM BELOW COAT: ${analysis.layeringState.innerHemVisible ? 'VISIBLE — the inner shirt/layer hem shows below the outer garment hem' : 'NOT VISIBLE — the inner shirt hem stays INSIDE the outer garment. Do NOT show the inner hem peeking below the coat/jacket in any shot.'}` : ''}
      ${analysis.layeringState.innerHemDescription ? `INNER HEM DETAIL: ${analysis.layeringState.innerHemDescription}` : ''}
      ${analysis.layeringState.sleeveCuffState ? `SLEEVE/CUFF STATE: ${analysis.layeringState.sleeveCuffState.replace(/_/g, ' ').toUpperCase()}` : ''}
      ${analysis.layeringState.beltState ? `BELT/TIE STATE: ${analysis.layeringState.beltState.replace(/_/g, ' ').toUpperCase()}` : ''}

      FULL STYLING DESCRIPTION (authoritative — follow exactly):
      "${analysis.layeringState.stylingDescription}"

      REMINDER: In the BACK VIEW, reproduce this EXACT styling state. The outer garment must have the same open/closed state, the inner layer must have the same visibility, and the belt/tie (if any) must be in the same position as described above.
      ══════════════════════════════════════════════════════
      ` : ''}

      ${garmentContext?.heroProduct ? (() => {
        const hero = garmentContext.heroProduct;
        const heroLabel: Record<string, string> = {
          tops: 'TOP / SHIRT', pants: 'PANTS / BOTTOM', outer: 'OUTERWEAR',
          inner: 'INNER LAYER', shoes: 'SHOES / FOOTWEAR'
        };
        const spec = garmentContext.specs?.[hero] ?? {};
        const riseLabel = spec.rise
          ? spec.rise >= 28 ? 'high-rise' : spec.rise >= 24 ? 'mid-rise' : 'low-rise'
          : null;
        const widthLabel = spec.thighWidth
          ? spec.thighWidth >= 38 ? 'wide-leg (ultra-wide silhouette)' : spec.thighWidth >= 30 ? 'straight/regular fit' : 'slim/tapered fit'
          : null;

        return `
      ██████████████████████████████████████████████████████
      EC HERO PRODUCT — 主役商品 (ABSOLUTE TOP PRIORITY)
      ██████████████████████████████████████████████████████
      THIS IS A [${heroLabel[hero] ?? hero.toUpperCase()}] PRODUCT EC PAGE.
      The ${heroLabel[hero] ?? hero} is THE MAIN SUBJECT of this shot — it must be showcased with maximum clarity.

      HERO GARMENT PHOTOGRAPHY STANDARDS:
      - The ${heroLabel[hero] ?? hero} MUST be the most clearly visible and well-lit element in the frame.
      - Silhouette, texture, drape, and construction details of the ${heroLabel[hero] ?? hero} are the PRIMARY information.
      - Supporting garments (other items being worn) serve only to COMPLEMENT — they must NOT obscure or compete with the hero.

      ${hero === 'pants' || hero === 'inner' ? `
      PANTS/BOTTOM DETAIL VISIBILITY (CRITICAL):
      - RISE: ${riseLabel ? `${riseLabel} — the waistband must sit at the ${riseLabel === 'high-rise' ? 'navel level or above, with maximum visible torso from waist to hip' : riseLabel === 'mid-rise' ? 'hip bone level' : 'below the hip bone'}.` : 'Reproduce the rise position exactly as shown in reference image.'}
      - LENGTH: ${spec.length ? `${spec.length}cm total length — ${spec.length >= 100 ? 'FULL-LENGTH: hem must reach the ankle or floor in ALL shots' : spec.length >= 80 ? 'MIDI: hem falls at mid-calf' : 'CROPPED: hem ends well above the ankle'}.` : 'Replicate exact hem position from reference — do NOT alter pants length between shots.'}
      - SILHOUETTE WIDTH: ${widthLabel ? widthLabel + ' — ' + (widthLabel.includes('wide') ? 'generous fabric volume must be visible at thigh and hem' : 'clean, fitted line') + '.' : 'Replicate exact leg width from reference.'}
      - INSEAM: ${spec.inseam ? `${spec.inseam}cm inseam.` : 'Match reference.'}
      - WAISTBAND: ${spec.waistStyle ? spec.waistStyle : 'Reproduce exactly as shown.'}
      - MATERIAL: ${spec.material ? `${spec.material} — render fabric weight, drape, and texture accurately for this material. ${spec.material.includes('ウール') || spec.material.toLowerCase().includes('wool') ? 'Wool drapes with structured weight — NO limp or thin fabric appearance.' : spec.material.includes('デニム') || spec.material.toLowerCase().includes('denim') ? 'Denim has rigid, structured drape.' : 'Render material-appropriate drape and texture.'}` : 'Reproduce material texture and drape from reference.'}` : ''}

      ${hero === 'tops' || hero === 'outer' ? `
      TOPS/OUTERWEAR DETAIL VISIBILITY (CRITICAL):
      - LENGTH: ${spec.length ? `${spec.length}cm — ${spec.length >= 80 ? 'long/oversized — shows hem clearly, draping over pants' : spec.length >= 60 ? 'standard length — hem sits at hip' : 'cropped — hem sits above waist'}.` : 'Replicate exact hem position from reference.'}
      - SHOULDER WIDTH: ${spec.shoulderWidth ? `${spec.shoulderWidth}cm shoulder width — ${spec.shoulderWidth >= 48 ? 'oversized/dropped shoulder silhouette' : spec.shoulderWidth >= 42 ? 'regular/slightly relaxed fit' : 'fitted/narrow shoulder'}.` : 'Match reference.'}
      - MATERIAL: ${spec.material ? spec.material : 'Reproduce from reference.'}` : ''}

      STYLING RULE FOR HERO PRODUCT:
      The model's pose, body language, and arm position must be chosen to MAXIMIZE visibility of the ${heroLabel[hero] ?? hero}.
      Arms must NOT block, fold over, or obscure the hero garment in any shot.
      ██████████████████████████████████████████████████████`;
      })() : ''}

      ${analysis.bag || analysis.sunglasses || analysis.glasses || analysis.accessories ? `

ACCESSORIES (MUST INCLUDE IF PROVIDED):
${analysis.bag ? `BAG: ${analysis.bag.description}. Material: ${analysis.bag.fabric}. Style: ${analysis.bag.style}. Color: ${analysis.bag.colorHex}.
${accessoryMeasurements?.bag?.width || accessoryMeasurements?.bag?.height ? `
PRECISE BAG DIMENSIONS:
- Width: ${accessoryMeasurements.bag.width || 'N/A'}cm
- Height: ${accessoryMeasurements.bag.height || 'N/A'}cm
- Depth: ${accessoryMeasurements.bag.depth || 'N/A'}cm
- Strap Length: ${accessoryMeasurements.bag.strapLength || 'N/A'}cm

SIZE RENDERING: The bag must be rendered at EXACT proportions. ${accessoryMeasurements.bag.width ? `A ${accessoryMeasurements.bag.width}cm wide bag should appear ${accessoryMeasurements.bag.width < 20 ? 'small and compact (clutch-sized)' : accessoryMeasurements.bag.width < 35 ? 'medium-sized (handbag)' : 'large (tote-sized)'}.` : ''} ${accessoryMeasurements.bag.strapLength ? `The strap length of ${accessoryMeasurements.bag.strapLength}cm determines carrying style: ${accessoryMeasurements.bag.strapLength < 30 ? 'short handle for hand-carry' : accessoryMeasurements.bag.strapLength < 80 ? 'shoulder bag length' : 'crossbody length'}.` : ''}
` : ''}
${accessoryMaterials?.bag?.leatherType || accessoryMaterials?.bag?.metalType || accessoryMaterials?.bag?.finish ? `
MATERIAL SPECIFICATIONS:
${accessoryMaterials.bag.leatherType ? `- Leather/Material: ${accessoryMaterials.bag.leatherType.replace(/_/g, ' ')} - Render with ${accessoryMaterials.bag.leatherType === 'genuine_leather' ? 'natural grain texture and subtle variations' : accessoryMaterials.bag.leatherType === 'patent_leather' ? 'high gloss, reflective surface' : accessoryMaterials.bag.leatherType === 'suede' ? 'soft, matte, velvety texture' : accessoryMaterials.bag.leatherType === 'canvas' ? 'woven fabric texture' : 'smooth synthetic texture'}.
` : ''}${accessoryMaterials.bag.metalType ? `- Hardware: ${accessoryMaterials.bag.metalType.replace(/_/g, ' ')} - Render metal hardware with ${accessoryMaterials.bag.metalType === 'gold' ? 'warm golden tone' : accessoryMaterials.bag.metalType === 'rose_gold' ? 'pinkish-gold tone' : 'cool metallic tone'}.
` : ''}${accessoryMaterials.bag.finish ? `- Surface Finish: ${accessoryMaterials.bag.finish} - The bag surface should have a ${accessoryMaterials.bag.finish === 'glossy' ? 'shiny, reflective finish with visible highlights' : accessoryMaterials.bag.finish === 'matte' ? 'non-reflective, flat finish' : accessoryMaterials.bag.finish === 'brushed' ? 'subtle linear texture' : 'polished, semi-reflective finish'}.
` : ''}
` : ''}
POSITIONING: ${accessoryPositioning?.bag?.carryingStyle && accessoryPositioning.bag.carryingStyle !== 'auto' ? `The model MUST carry the bag using the ${accessoryPositioning.bag.carryingStyle.replace(/_/g, ' ')} style${accessoryPositioning.bag.hand ? ` with the ${accessoryPositioning.bag.hand} hand${accessoryPositioning.bag.hand === 'both' ? 's' : ''}` : ''}.` : `The model MUST be holding or wearing the bag naturally according to its style${accessoryMeasurements?.bag?.strapLength ? ` and strap length (${accessoryMeasurements.bag.strapLength}cm)` : ''} (handbag in hand, shoulder bag on shoulder, crossbody across body, tote on shoulder, clutch in hand, backpack on back, etc.).`} ${accessoryPositioning?.bag?.visibility === 'prominent' ? 'The bag should be prominently displayed and clearly visible.' : accessoryPositioning?.bag?.visibility === 'subtle' ? 'The bag should be present but not the main focus.' : 'The bag must be clearly visible and properly positioned.'}` : ''}

${analysis.sunglasses ? `SUNGLASSES: ${analysis.sunglasses.description}. Material: ${analysis.sunglasses.fabric}. Style: ${analysis.sunglasses.style}. Color: ${analysis.sunglasses.colorHex}.
${accessoryMeasurements?.sunglasses?.lensWidth ? `
FRAME SPECIFICATIONS:
- Lens Width: ${accessoryMeasurements.sunglasses.lensWidth}mm
- Bridge: ${accessoryMeasurements.sunglasses.bridge || 'N/A'}mm
- Temple Length: ${accessoryMeasurements.sunglasses.templeLength || 'N/A'}mm
- Frame Height: ${accessoryMeasurements.sunglasses.frameHeight || 'N/A'}mm

FRAME PROPORTIONS: Render sunglasses with ${accessoryMeasurements.sunglasses.lensWidth < 50 ? 'small, narrow frames' : accessoryMeasurements.sunglasses.lensWidth < 55 ? 'medium-sized frames' : 'large, oversized frames'} that fit the model's face proportionally.
` : ''}
${accessoryMaterials?.sunglasses?.frameMaterial || accessoryMaterials?.sunglasses?.metalType || accessoryMaterials?.sunglasses?.finish ? `
MATERIAL SPECIFICATIONS:
${accessoryMaterials.sunglasses.frameMaterial ? `- Frame Material: ${accessoryMaterials.sunglasses.frameMaterial.replace(/_/g, ' ')} - Render with ${accessoryMaterials.sunglasses.frameMaterial === 'acetate' ? 'thick, colorful plastic appearance' : accessoryMaterials.sunglasses.frameMaterial === 'metal' ? 'thin, metallic frame' : accessoryMaterials.sunglasses.frameMaterial === 'titanium' ? 'lightweight, premium metal look' : accessoryMaterials.sunglasses.frameMaterial === 'wood' ? 'natural wood grain texture' : 'standard plastic frame'}.
` : ''}${accessoryMaterials.sunglasses.metalType ? `- Metal Type: ${accessoryMaterials.sunglasses.metalType.replace(/_/g, ' ')} - Metal parts should have ${accessoryMaterials.sunglasses.metalType === 'gold' ? 'warm golden tone' : accessoryMaterials.sunglasses.metalType === 'rose_gold' ? 'pinkish-gold tone' : 'cool metallic tone'}.
` : ''}${accessoryMaterials.sunglasses.finish ? `- Surface Finish: ${accessoryMaterials.sunglasses.finish} - ${accessoryMaterials.sunglasses.finish === 'glossy' ? 'Shiny, reflective surface' : accessoryMaterials.sunglasses.finish === 'matte' ? 'Non-reflective, flat finish' : accessoryMaterials.sunglasses.finish === 'brushed' ? 'Subtle brushed texture' : 'Polished, semi-reflective finish'}.
` : ''}
` : ''}
POSITIONING: ${accessoryPositioning?.sunglasses?.position && accessoryPositioning.sunglasses.position !== 'auto' ? `The model MUST wear/hold the sunglasses ${accessoryPositioning.sunglasses.position === 'on_face' ? 'on their face, properly fitted on the nose and ears' : accessoryPositioning.sunglasses.position === 'on_head' ? 'on top of their head' : accessoryPositioning.sunglasses.position === 'hanging_neck' ? 'hanging from their neck' : accessoryPositioning.sunglasses.position === 'in_hand' ? 'in their hand' : 'on their shirt collar'}.` : 'The model MUST be wearing the sunglasses on their face, properly fitted on the nose and ears.'} ${accessoryPositioning?.sunglasses?.visibility === 'prominent' ? 'The sunglasses should be prominently displayed.' : accessoryPositioning?.sunglasses?.visibility === 'subtle' ? 'The sunglasses should be present but subtle.' : 'The sunglasses must be clearly visible.'}` : ''}

${analysis.glasses ? `GLASSES: ${analysis.glasses.description}. Material: ${analysis.glasses.fabric}. Style: ${analysis.glasses.style}. Color: ${analysis.glasses.colorHex}.
${accessoryMeasurements?.glasses?.lensWidth ? `
FRAME SPECIFICATIONS:
- Lens Width: ${accessoryMeasurements.glasses.lensWidth}mm
- Bridge: ${accessoryMeasurements.glasses.bridge || 'N/A'}mm
- Temple Length: ${accessoryMeasurements.glasses.templeLength || 'N/A'}mm
- Frame Height: ${accessoryMeasurements.glasses.frameHeight || 'N/A'}mm

FRAME PROPORTIONS: Render glasses with ${accessoryMeasurements.glasses.lensWidth < 50 ? 'small, narrow frames' : accessoryMeasurements.glasses.lensWidth < 55 ? 'medium-sized frames' : 'large, oversized frames'} that fit the model's face proportionally.
` : ''}
${accessoryMaterials?.glasses?.frameMaterial || accessoryMaterials?.glasses?.metalType || accessoryMaterials?.glasses?.finish ? `
MATERIAL SPECIFICATIONS:
${accessoryMaterials.glasses.frameMaterial ? `- Frame Material: ${accessoryMaterials.glasses.frameMaterial.replace(/_/g, ' ')} - Render with ${accessoryMaterials.glasses.frameMaterial === 'acetate' ? 'thick, colorful plastic appearance' : accessoryMaterials.glasses.frameMaterial === 'metal' ? 'thin, metallic frame' : accessoryMaterials.glasses.frameMaterial === 'titanium' ? 'lightweight, premium metal look' : accessoryMaterials.glasses.frameMaterial === 'wood' ? 'natural wood grain texture' : 'standard plastic frame'}.
` : ''}${accessoryMaterials.glasses.metalType ? `- Metal Type: ${accessoryMaterials.glasses.metalType.replace(/_/g, ' ')} - Metal parts should have ${accessoryMaterials.glasses.metalType === 'gold' ? 'warm golden tone' : accessoryMaterials.glasses.metalType === 'rose_gold' ? 'pinkish-gold tone' : 'cool metallic tone'}.
` : ''}${accessoryMaterials.glasses.finish ? `- Surface Finish: ${accessoryMaterials.glasses.finish} - ${accessoryMaterials.glasses.finish === 'glossy' ? 'Shiny, reflective surface' : accessoryMaterials.glasses.finish === 'matte' ? 'Non-reflective, flat finish' : accessoryMaterials.glasses.finish === 'brushed' ? 'Subtle brushed texture' : 'Polished, semi-reflective finish'}.
` : ''}
` : ''}
POSITIONING: ${accessoryPositioning?.glasses?.position && accessoryPositioning.glasses.position !== 'auto' ? `The model MUST wear/hold the glasses ${accessoryPositioning.glasses.position === 'on_face' ? 'on their face, properly fitted on the nose and ears' : accessoryPositioning.glasses.position === 'on_head' ? 'on top of their head' : accessoryPositioning.glasses.position === 'hanging_neck' ? 'hanging from their neck' : accessoryPositioning.glasses.position === 'in_hand' ? 'in their hand' : 'on their shirt collar'}.` : 'The model MUST be wearing the glasses on their face, properly fitted on the nose and ears.'} ${accessoryPositioning?.glasses?.visibility === 'prominent' ? 'The glasses should be prominently displayed.' : accessoryPositioning?.glasses?.visibility === 'subtle' ? 'The glasses should be present but subtle.' : 'The glasses must be clearly visible.'}` : ''}

${analysis.accessories ? `ACCESSORIES: ${analysis.accessories.description}. Material: ${analysis.accessories.fabric}. Style: ${analysis.accessories.style}. Color: ${analysis.accessories.colorHex}.
${accessoryMeasurements?.accessories?.chainLength || accessoryMeasurements?.accessories?.diameter ? `
ACCESSORY DIMENSIONS:
${accessoryMeasurements.accessories.chainLength ? `- Chain/Band Length: ${accessoryMeasurements.accessories.chainLength}cm` : ''}
${accessoryMeasurements.accessories.diameter ? `- Diameter: ${accessoryMeasurements.accessories.diameter}cm` : ''}
${accessoryMeasurements.accessories.pendantSize ? `- Pendant Size: ${accessoryMeasurements.accessories.pendantSize}cm` : ''}
${accessoryMeasurements.accessories.thickness ? `- Thickness: ${accessoryMeasurements.accessories.thickness}mm` : ''}

SIZE RENDERING: ${accessoryMeasurements.accessories.chainLength ? `A ${accessoryMeasurements.accessories.chainLength}cm chain should ${accessoryMeasurements.accessories.chainLength < 40 ? 'sit high on the neck (choker style)' : accessoryMeasurements.accessories.chainLength < 50 ? 'rest at the collarbone' : 'hang lower on the chest'}.` : ''}
` : ''}
${accessoryMaterials?.accessories?.metalType || accessoryMaterials?.accessories?.finish || accessoryMaterials?.accessories?.texture ? `
MATERIAL SPECIFICATIONS:
${accessoryMaterials.accessories.metalType ? `- Metal Type: ${accessoryMaterials.accessories.metalType.replace(/_/g, ' ')} - Render with ${accessoryMaterials.accessories.metalType === 'gold' ? 'warm, rich golden tone with subtle shine' : accessoryMaterials.accessories.metalType === 'silver' ? 'bright, cool silver tone' : accessoryMaterials.accessories.metalType === 'rose_gold' ? 'soft pinkish-gold tone' : accessoryMaterials.accessories.metalType === 'platinum' ? 'bright white metallic tone' : 'metallic appearance'}.
` : ''}${accessoryMaterials.accessories.finish ? `- Surface Finish: ${accessoryMaterials.accessories.finish} - ${accessoryMaterials.accessories.finish === 'glossy' ? 'High shine, reflective surface with visible highlights' : accessoryMaterials.accessories.finish === 'matte' ? 'Soft, non-reflective finish' : accessoryMaterials.accessories.finish === 'brushed' ? 'Linear brushed texture with subtle directional grain' : 'Polished, semi-reflective surface'}.
` : ''}${accessoryMaterials.accessories.texture ? `- Texture: ${accessoryMaterials.accessories.texture} - Render with this specific texture detail.
` : ''}
` : ''}
POSITIONING: Display the accessories naturally on the model (necklace around neck, earrings on ears, watch on wrist, bracelet on wrist, ring on finger, hat on head, scarf around neck, etc.). ${accessoryPositioning?.accessories?.style ? `Style: ${accessoryPositioning.accessories.style} layering${accessoryPositioning.accessories.necklaceCount ? ` with ${accessoryPositioning.accessories.necklaceCount} necklace(s)` : ''}${accessoryPositioning.accessories.braceletCount ? `, ${accessoryPositioning.accessories.braceletCount} bracelet(s)` : ''}${accessoryPositioning.accessories.ringCount ? `, ${accessoryPositioning.accessories.ringCount} ring(s)` : ''}.` : ''} The accessories must be clearly visible and properly positioned.` : ''}

ACCESSORY REQUIREMENT: The model MUST wear/hold ALL specified accessories exactly as described. Accessories must be clearly visible, properly positioned, and rendered with accurate materials, colors${accessoryMeasurements?.bag?.width || accessoryMeasurements?.sunglasses?.lensWidth || accessoryMeasurements?.glasses?.lensWidth || accessoryMeasurements?.accessories?.chainLength ? ', and PRECISE sizes as specified' : ''}.
` : ''}
      
      OVERALL STYLE: ${analysis.overallStyle}.
      ${scene.isSetup ? "FORCE COLOR IDENTITY: Matching set." : ""}
      
      CRITICAL REQUIREMENT: The model MUST wear the EXACT clothing items described above with MATCHING colors, fabrics, and styles. Do not substitute or change any details.
      ${images.model ? "IDENTITY PRESERVATION: Maintain exact facial identity of the REFERENCE MODEL." : ""}

      LUXURY MATERIAL RENDERING (CRITICAL):
      - FABRIC TEXTURE: Render visible weave pattern, thread direction, and surface grain at macro level.
        Cotton should show soft fibrous texture. Wool should have visible fiber nap. Silk should
        have luminous sheen with light-dependent color shift. Denim should show twill diagonal pattern.
        Leather should show pore texture and natural grain variation.
      - HARDWARE DETAIL: Metal buttons, zippers, buckles, and clasps must show specular highlights,
        brushed/polished finish detail, and realistic scale proportional to garment.
      - LAYERING INTERACTION: Where garments overlap, show realistic fabric behavior — outer layer
        casting micro-shadows on inner layers, collar fold physics, sleeve cuff stacking, natural
        fabric compression at overlap points.
      - SEAM & CONSTRUCTION: Visible topstitching, seam allowances, dart lines where applicable.
        This level of construction detail is what separates premium from generic imagery.
      - COLOR ACCURACY: Ensure the EXACT hex colors specified are preserved. Lighting should
        enhance texture visibility, NOT shift or wash out fabric colors.

      ${scene.outputPurpose === 'ec_product' || ['full_body_front', 'full_body_back', 'bust_top', 'bottom_focus'].includes(scene.shotType) ? `
      EC BACKGROUND DIRECTIVE:
      - Background MUST be solid, distraction-free, neutral tone.
      - Acceptable tones: Pure white (#FFFFFF), Warm off-white (#F5F0EB), Light grey (#E8E8E8).
      - NO props, NO environmental elements, NO dramatic shadows on background.
      - Ground plane: minimal shadow footprint, consistent across all EC views.
      - STANDARD: SSENSE, NET-A-PORTER, Mr Porter product imagery quality.
      ` : ''}

      SCENE:
      VIEW: ${effectiveViewDesc}.
      LOCATION: ${scene.outputPurpose === 'ec_product' || scene.shotType === 'full_body_front' || scene.shotType === 'full_body_back' ? 'studio' : scene.background}.

      ${scene.customPrompt ? `ADDITIONAL DIRECTIVES (USER REQUEST — PRIORITIZE):
      ${scene.customPrompt}
      ` : ''}
      POST-PROCESSING:
      ${scene.shotType === 'campaign_editorial'
        ? `FILM-GRADE CAMPAIGN POST-PROCESSING:
        Kodak Vision 3 500T cinema film stock emulation — organic, textural, timeless.
        Color: Desaturated palette, lifted blacks (not pure black), crushed highlights.
        Split toning: warm amber/golden highlights, cool cyan-blue shadows.
        Grain: Fine ISO 1600-equivalent film grain — visible but refined, adds tactile quality.
        Vignette: Subtle lens vignette, natural falloff at frame corners.
        Contrast: High tonal contrast with rich midtone depth.
        Sharpness: Slightly soft — NOT digitally over-sharpened. Organic lens rendering.
        Reference: Peter Lindbergh editorial, Steven Meisel campaign, Helmut Newton drama.
        This image should look like a 35mm or large-format campaign photograph, NOT a digital product shot.`
        : scene.shotType === 'instagram_square'
          ? 'Warm editorial color grading, slightly lifted shadows, social-media-optimized vibrancy.'
          : 'Clean commercial color grading, neutral white balance, razor-sharp focus on the outfit.'}
      ${images['campaign_style_ref'] && scene.shotType === 'campaign_editorial' ? `
      STYLE REFERENCE IMAGE (CRITICAL — THIS IS THE VISUAL TARGET):
      The image labeled "STYLE_REFERENCE_IMAGE" represents the target visual style for this campaign shot.
      Study it carefully and EMULATE the following aspects:
      - LIGHTING: Replicate the direction, quality, and intensity of light in that image
      - COMPOSITION: Match the framing, negative space usage, and subject placement
      - COLOR GRADING: Apply the same color palette, tonal range, and mood
      - ATMOSPHERE: Capture the same emotional tone and narrative feeling
      - BACKGROUND: Use a similar type of environment/background if recognizable
      This style reference overrides the generic campaign prompt above where they conflict.
      The garments must still be those from the REFERENCE TOPS/BOTTOMS images, NOT from the style reference.
      `  : ''}
      8K resolution, photorealistic rendering.
      KEYWORDS: ${analysis.keywords.join(", ")}, ray-traced reflections, photorealistic clothing, luxury e-commerce.
    `;

    // Prepare reference images for Gemini image generation
    const imageParts: any[] = [];
    const altAngleLabels = ['BACK VIEW', 'SIDE / DETAIL VIEW', 'CLOSE-UP DETAIL'];
    const altCounters: Record<string, number> = {};

    // For back/side EC shots, prepend a global continuity instruction before all reference images
    const isBackOrSideShot = scene.shotType === 'full_body_back' || scene.shotType === 'ec_side';
    if (isBackOrSideShot) {
      const viewLabel = scene.shotType === 'full_body_back' ? 'rear (180° rotated)' : '45-degree three-quarter side';
      imageParts.push({
        text: `CRITICAL OUTFIT CONTINUITY INSTRUCTION:
        The reference images below show the EXACT garments that must appear in this ${viewLabel} shot.
        Your task is NOT to create a new outfit — it is to show these SAME garments from the ${viewLabel} angle.
        Every color, fabric texture, layering combination, and garment piece shown in the reference images below must be preserved EXACTLY.
        Study each reference image carefully and reproduce the clothing with perfect fidelity — only the camera angle changes.`
      });
    }

    // For crop shots (bust_top, bottom_focus), add a reminder about which garments to show
    if (scene.shotType === 'bust_top') {
      imageParts.push({
        text: `CRITICAL: The reference images below show the EXACT garments for this bust-top close-up. Preserve all colors, fabric details, and layering from these reference images exactly. Only the framing changes (close crop from chest to head).`
      });
    }
    if (scene.shotType === 'bottom_focus') {
      imageParts.push({
        text: `CRITICAL: The reference images below show the EXACT garments for this bottom-focus shot. Preserve all colors, fabric details, and pants/skirt styling from these reference images exactly. Only the framing changes (crop from waist to feet).`
      });
    }

    for (const [key, b64] of Object.entries(images)) {
      if (!b64) continue;
      const validRef = await ensureSupportedFormat(b64);
      const { mimeType, data } = parseBase64(validRef);

      if (key === 'campaign_style_ref') {
        // Campaign style reference — labeled separately with specific instruction
        imageParts.push({
          text: `STYLE_REFERENCE_IMAGE (VISUAL STYLE TARGET — NOT THE GARMENT):
          Emulate the mood, lighting direction, composition, color grading, and atmosphere of this image.
          Do NOT copy the clothing or model appearance from this image — only emulate its visual style.` });
      } else if (key === 'anchor_model') {
        // Front-shot anchor image — use as primary outfit + model identity reference
        imageParts.push({
          text: `ANCHOR_MODEL_REFERENCE (CRITICAL — PRIMARY OUTFIT SOURCE):
          This image shows the COMPLETED front-view shot of the same outfit.
          Use this as the DEFINITIVE reference for: garment colors, fabric appearance, layering order, styling, and model identity.
          The new shot must show the EXACT same garments and person — only the camera angle/framing changes.`
        });
      } else if (key.includes('_alt_')) {
        // Alt angle image — label with base item + angle context
        const baseKey = key.split('_alt_')[0];
        const idx = altCounters[baseKey] ?? 0;
        altCounters[baseKey] = idx + 1;
        const angleLabel = altAngleLabels[idx] ?? `ANGLE ${idx + 1}`;
        imageParts.push({ text: `REFERENCE ${baseKey.toUpperCase()} — ${angleLabel} (use for back/side detail accuracy):` });
      } else {
        // Main front reference image
        imageParts.push({ text: `REFERENCE ${key.toUpperCase()} (source garment — copy colors and styling exactly):` });
      }
      imageParts.push({ inlineData: { mimeType, data } });
    }
    // モデル試行順（品質順）: アクセス可能なものを自動選択
    const MODELS_TO_TRY = [
      "gemini-3-pro-image-preview",  // 統一モデル
    ];


    // ─── Aspect Ratio by Output Purpose ────────────────────────────────────
    const ASPECT_RATIO_MAP: Record<string, string> = {
      ec_product: '3:4',   // EC標準: ポートレート縦型
      instagram: '1:1',   // Instagram: 正方形
      campaign: '16:9',  // 広告キャンペーン: ワイドシネマ
      campaign_editorial: '16:9',  // 旧キー互換
      lookbook: '3:4',   // ルックブック: ポートレート
    };
    const purposeKey = (scene.outputPurpose as string) ?? '';
    const aspectRatio = ASPECT_RATIO_MAP[purposeKey] ?? '3:4';


    console.log(`[Lumina] Output purpose: ${scene.outputPurpose} → AspectRatio: ${aspectRatio}`);

    const aspectRatioPromptNote = `\n      IMAGE CANVAS: This image MUST be rendered at ${aspectRatio} aspect ratio.
      ${aspectRatio === '1:1' ? 'SQUARE CANVAS (1:1): Compose the model centrally or with creative rule-of-thirds offset. The frame height equals the frame width.' : ''}
      ${aspectRatio === '16:9' ? 'WIDE LANDSCAPE CANVAS (16:9): Compose with cinematic horizontal framing. Generous negative space on sides. Model may be slightly off-center for dynamic composition.' : ''}
      ${aspectRatio === '3:4' ? 'PORTRAIT CANVAS (3:4): Full-length portrait framing, head to toe. Ample headroom above and shoe clearance below.' : ''}`;

    const finalPrompt = prompt + aspectRatioPromptNote;

    let lastError: unknown;
    for (const modelName of MODELS_TO_TRY) {
      try {
        console.log(`[Lumina] Trying model: ${modelName}`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: {
            parts: [
              { text: finalPrompt },
              ...imageParts
            ]
          },
          config: {
            responseModalities: ["TEXT", "IMAGE"],
            aspectRatio,
          } as any,
        });


        if (response.candidates?.[0]?.content) {
          for (const part of (response.candidates?.[0]?.content?.parts || [])) {
            if (part.inlineData) {
              console.log(`[Lumina] Image generated successfully with model: ${modelName}`);
              return `data:image/png;base64,${part.inlineData.data}`;
            }
          }
        }
        // 画像なし → 次のモデルへ
        console.warn(`[Lumina] Model ${modelName} returned no image, trying next...`);
      } catch (modelErr) {
        console.warn(`[Lumina] Model ${modelName} failed:`, modelErr);
        lastError = modelErr;
      }
    }

    throw lastError ?? new Error("全モデルで画像生成に失敗しました。APIキーとモデルのアクセス権を確認してください。");
  } catch (error) {
    console.error("Image Generation Failed:", error);
    throw error;
  }
};


// ========================================
// SNS STYLE TRANSFORM — Generate from Base Image
// ========================================

export type SnsStyleKey =
  | 'leica_film'
  | 'mirror_selfie'
  | 'ai_surreal'
  | 'pixel_8bit'
  | 'y2k_vaporwave'
  | 'street_snap'
  | 'editorial_mood'
  | 'cinematic';

export interface SnsStyleDef {
  key: SnsStyleKey;
  label: string;
  labelJa: string;
  icon: string;
  prompt: string;
}

export const SNS_STYLES: SnsStyleDef[] = [
  {
    key: 'leica_film',
    label: 'Leica Film',
    labelJa: 'ライカ フィルム',
    icon: '📷',
    prompt: `STYLE TRANSFORM: Leica Film Analog Photography.
      Re-create the scene as if shot on a Leica M11 Monochrom with 35mm Summilux f/1.4 lens.
      GRAIN: Heavy natural film grain — Kodak Tri-X 400 or Ilford HP5 equivalent. Organic, not digital noise.
      COLOR: Warm analog tone. Slightly faded blacks (not pure black). Gentle warm color bleed at highlights.
      DEPTH: Signature Leica shallow DOF with creamy, swirling bokeh on background.
      CONTRAST: Strong micro-contrast that makes textures pop — fabric weave, skin pores, hair strands.
      SHARPNESS: Razor-sharp focus plane with smooth falloff. NOT digital over-sharpened.
      FEEL: Nostalgic, intimate, timeless. As if developed in a darkroom yesterday.
      REFERENCE: Peter Lindbergh, Juergen Teller, Terry Richardson natural light Leica work.`,
  },
  {
    key: 'mirror_selfie',
    label: 'Mirror Selfie',
    labelJa: 'ミラーセルフィー',
    icon: '🪞',
    prompt: `STYLE TRANSFORM: Mirror Selfie / OOTD Format.
      Re-create as a mirror selfie — the model is seen THROUGH A MIRROR reflection.
      CAMERA: A smartphone (iPhone) or digital camera is VISIBLE in the model's hands, reflected in the mirror.
      ANGLE: Slightly off-center composition. NOT perfectly centered — authentic, casual framing.
      ENVIRONMENT: Stylish interior — clean bedroom, fitting room, elevator mirror, or aesthetic bathroom.
      LIGHTING: Natural indoor light from window, or soft overhead. Phone flash reflection may be subtly visible on mirror surface.
      BODY LANGUAGE: Relaxed, confident. One hand holding phone/camera, other hand natural (on hip, touching hair, or holding bag).
      MIRROR: Clean full-length mirror. Subtle reflection quality — not perfectly sharp, slight mirror surface texture.
      CROP: Full body visible in mirror, some room edge visible for context. 1:1 square crop.
      FEEL: Authentic OOTD (Outfit Of The Day). Instagram casual — Not overly produced.
      REFERENCE: Fashion influencer mirror selfie culture, Kim Kardashian gym mirror selfie aesthetic.`,
  },
  {
    key: 'ai_surreal',
    label: 'AI Surreal',
    labelJa: 'AI 超現実',
    icon: '🌀',
    prompt: `STYLE TRANSFORM: AI Surreal — Fashion Surrealism Only AI Can Create.

      CRITICAL QUALITY REQUIREMENT:
      This must look like HYPERREALISTIC PHOTOGRAPHY — NOT digital art, NOT CGI render, NOT sci-fi illustration.
      The surrealism comes from IMPOSSIBLE SITUATIONS photographed with extreme photographic realism.
      Shot on Hasselblad H6D-400c medium format camera. Photojournalistic quality — as if this actually happened.

      SELECT ONE of these five surrealist approaches and execute it with EXTREME conviction:

      APPROACH 1 — IMPOSSIBLE LOCATION CLASH:
      The model poses in a completely incongruous, impossible setting for a fashion shoot.
      Examples: A Balenciaga-style runway inside a working courtroom with judge and audience,
        a fashion editorial in a working coal mine with miners watching,
        a high-fashion pose on the wing of a commercial jet mid-flight,
        a luxury lookbook shoot inside a NASA rocket launch control room.
      The environment is 100% realistic and detailed. The fashion is the only "impossible" element.
      Reaction of bystanders: stunned, curious, photographing with phones.

      APPROACH 2 — SCALE DISTORTION (Alice in Wonderland):
      The model is dramatically WRONG SIZE relative to the environment.
      Option A: GIANT — model is 8-10 meters tall, crouching inside a normal-sized elegant room,
        head touching ceiling, furniture tiny around feet, people tiny as mice.
        Reference: Alice in Wonderland "drink me" giant scene. Shot from floor level looking up.
      Option B: MINIATURE — model is 10cm tall, standing on a dinner table between wine glasses,
        or in a shoebox-sized bedroom with giant everyday objects as furniture.
      The scale difference must be EXTREME and immediately obvious.
      Everything else is photographically real — no fantasy lighting.

      APPROACH 3 — GIANT CREATURE COMPANION:
      A biologically accurate, GIANT version of an insect or animal stands next to the model.
      Creature options: Praying mantis (3 meters tall) — standing beside model, looking down.
        Giant swallowtail butterfly (2m wingspan) — perched on model's shoulder.
        Giant white stag (4 meters tall) — model stands at its knee level.
        Giant crow (model-sized) — staring directly at camera beside the model.
      The creature is PHOTOREALISTIC, not fantastical. Shot on white salt flats or empty road.
      Reference: The giant praying mantis + model on salt flats image (hyperrealistic AI fashion).
      Creature and model exist together naturally, no fear, calm atmosphere.

      APPROACH 4 — TIM WALKER MAXIMALIST NATURE:
      The model is completely engulfed in an impossibly lush, over-abundant natural environment.
      The frame is 90% filled with: exotic birds (parrots, toucans, flamingos) perching on model's arms,
        giant baroque flower arrangements exploding from floor to ceiling,
        tropical plants with leaves larger than the model,
        or hundreds of butterflies covering every surface.
      Reference: Gucci editorial with birds in lush greenery. Tim Walker flower explosion shoots.
      Studio setting with teal/emerald/botanical green background.
      Everything is jewel-toned, saturated, alive with color and texture.
      The fashion is visible but partially framed by the natural abundance.

      APPROACH 5 — OBJECT SURREALISM (CONTAINMENT & MULTIPLICATION):
      The model interacts with physical objects in an impossible, editorial way.

      Option A — MIRROR FRAGMENTATION:
      The model stands in a white studio space completely surrounded by 15-25 ornate antique gold-framed mirrors
        at wildly different angles — some leaning, some floating, some shattered mid-air.
      Each mirror reflects the model from a different angle simultaneously, creating infinite fragmented views.
      The mirrors have CRACKED and BROKEN glass with spider-web fracture patterns.
      Some mirrors are on the floor, some leaning against walls, some suspended.
      Reference: High-fashion editorial with broken gold-framed mirrors surrounding a model in white space.
      Atmosphere: mysterious, kaleidoscopic, slightly dangerous.

      Option B — GLASS BOX CONTAINMENT:
      The model is sealed inside a large transparent acrylic or glass rectangular box (phone booth sized).
      The box is filling with a physical substance — choose one:
        ICE CUBES: dozens of large ice cubes filling the box, model pressing hands against glass,
        WATER: waist-deep water, fabric floating around model's body,
        FLOWER PETALS: thousands of red or white petals burying the model to the chest,
        CONFETTI: golden confetti falling around model in the sealed box.
      The box exterior is crystal-clear. You can see sharp detail of model's outfit through the glass.
      Background: soft pink, sage green, or dove grey studio backdrop. Clean, minimal.
      Reference: Fashion editorial with model inside large acrylic box filled with ice cubes, pink background.
      Expression: calm, composed — not panicked. The entrapment is aesthetic.

      The impossible element is rendered with photographic hyper-detail.

      LIGHTING: Natural or studio — NO fantasy/sci-fi lighting. Soft directional natural light.
      QUALITY: Medium format film quality. Extreme detail in fabrics, textures, faces.
      The image must be IMMEDIATELY shareable on Instagram with a jaw-drop reaction.`,
  },
  {
    key: 'pixel_8bit',
    label: '8bit / Pixel',
    labelJa: '8bit ドット絵',
    icon: '👾',
    prompt: `STYLE TRANSFORM: 8-bit Pixel Art / Retro Game Aesthetic.
      Convert the fashion image into pixel art style.
      PIXELS: Visible pixel grid. 64x64 to 128x128 effective pixel resolution, upscaled to output size.
      COLOR PALETTE: Limited to maximum 32 colors. Bold, flat colors — no gradients.
      STYLE: NES/SNES/Game Boy Advance era sprite art quality.
      GARMENT RENDERING: Fashion items rendered as pixel art — silhouette and key details preserved.
        Color blocks represent fabric panels. Plaid/stripes simplified to pixel patterns.
      MODEL: Pixel art character standing sprite. Face simplified to pixel features but recognizable.
      BACKGROUND: Simple pixel art environment — solid color or basic tiled pattern.
      UI OVERLAY: Optional retro game UI elements — thin border frame, pixel font label showing outfit name,
        small pixel heart or star icons for style rating.
      FEEL: Nostalgic, playful, Gen Z Kidcore appeal. Shareable and unique.
      REFERENCE: Fashion game sprites, Stardew Valley character art quality level.`,
  },
  {
    key: 'y2k_vaporwave',
    label: 'Y2K / Vapor',
    labelJa: 'Y2K / ヴェイパー',
    icon: '💿',
    prompt: `STYLE TRANSFORM: Y2K Aesthetic + Vaporwave Visual Culture.
      Re-create with full Y2K / Vaporwave digital nostalgia treatment.
      COLOR: Hot pink (#FF69B4), cyan (#00FFFF), purple (#9B59B6) as dominant tones.
        Holographic / iridescent reflections on surfaces and fabric.
      ENVIRONMENT: Choose one — Windows XP desktop wallpaper (Bliss hill), CRT TV monitor frame,
        early 2000s web browser window (Internet Explorer), or vaporwave sunset grid floor.
      EFFECTS: CRT scanlines overlay (subtle). RGB chromatic aberration / color shift at edges.
        Subtle glitch distortion bands. Low-poly 3D shapes floating (torus, sphere, pyramid).
      TEXT OVERLAY: Optional Japanese katakana text fragments (aesthetics — アエステティック, fashion — ファッション).
        Retro digital clock or date stamp (format: 2000.01.01).
      TEXTURE: Metallic / chrome surfaces reflect the model. Liquid metal or mercury pool.
      FASHION: Garments rendered with metallic/holographic sheen overlay, maintaining original design.
      FEEL: Nostalgic futurism, early internet culture, TikTok Y2K revival.
      REFERENCE: Vaporwave album covers, early 2000s web design, Charli XCX "Brat" era Y2K aesthetic.`,
  },
  {
    key: 'street_snap',
    label: 'Street Snap',
    labelJa: 'ストリートスナップ',
    icon: '📸',
    prompt: `STYLE TRANSFORM: Street Style / Fashion Week Snap Photography.
      Re-create as a candid street style photograph.
      LIGHTING: Direct camera flash — slightly harsh, creates hard shadows behind model.
        High contrast. Flash illuminates model, background falls darker.
      ENVIRONMENT: Urban night or evening — wet asphalt reflections, neon shop signs,
        crosswalk stripes, concrete building facades, or fashion week venue entrance.
      CAMERA: Compact digital or DSLR on-camera flash look. ISO pushed higher — visible but stylish noise.
      COMPOSITION: Slightly tilted or urgently framed. Model caught mid-stride or posing with attitude.
      BODY LANGUAGE: Confident, intentional but not stiff. Walking toward camera, or leaning against wall.
        Sunglasses optional, coffee cup or phone in hand for authenticity.
      COLOR: Slightly desaturated with flash-bleached skin tones. Night tones — blues, oranges, warm whites.
      CROP: Tight 1:1 from waist up, or full body with compressed urban background.
      FEEL: Raw, energetic, fashion week paparazzi capture quality.
      REFERENCE: Tommy Ton, Scott Schuman (The Sartorialist), Vogue Runway street style galleries.`,
  },
  {
    key: 'editorial_mood',
    label: 'Editorial Mood',
    labelJa: 'エディトリアル',
    icon: '🖤',
    prompt: `STYLE TRANSFORM: Dark Editorial / Art Fashion Photography.
      Re-create as a high-fashion magazine editorial spread image.
      LIGHTING: One strong directional key light creating dramatic chiaroscuro.
        Deep, intentional shadows covering 40-60% of the image. Light sculpts the body.
      COLOR: Near-monochrome or heavily desaturated. Selective color allowed — one accent tone maximum.
        Alternative: full black and white with rich tonal range.
      COMPOSITION: Extreme or unconventional framing — severe crop (cut off top of head, or only torso),
        Dutch angle (10-20 degree tilt), or extremely high/low camera angle.
      EXPRESSION: Fierce, confrontational, or deeply introspective. Direct eye contact or dramatically averted gaze.
      BACKGROUND: Minimal — solid black, textured dark wall, or completely blown-out white.
      TEXTURE: Heavy grain. Visible film-like texture throughout. Anti-polished deliberately.
      FEEL: Anti-commercial, art-first. This is ART, not advertising.
      REFERENCE: Nick Knight, Solve Sundsbo, Paolo Roversi. Magazines: i-D, Dazed, Another, Purple.`,
  },
  {
    key: 'cinematic',
    label: 'Cinematic',
    labelJa: 'シネマティック',
    icon: '🎬',
    prompt: `STYLE TRANSFORM: Cinematic Movie Still.
      Re-create as a film still paused mid-scene from a fashion-centric movie.
      LENS: Anamorphic lens characteristics — horizontal lens flare, oval bokeh, slight edge distortion.
      COLOR GRADING: Teal and orange complementary palette (blockbuster grading).
        Alternative: Wong Kar-wai saturated neon reds and greens, or Wes Anderson pastel symmetry.
      DEPTH: Extremely shallow DOF (T1.3 equivalent). Only the model is in focus.
        Background is a creamy wash of colored bokeh lights.
      ATMOSPHERE: Visible atmospheric haze, fog, or cigarette smoke. Volumetric light rays.
        Rain drops on glass or wet surfaces for texture. Dramatic backlight creating rim halo.
      COMPOSITION: Center-framed but with cinematic negative space above (headroom).
        Letterbox black bars on top and bottom (thin, for cinematic feel even in 1:1).
      EXPRESSION: Contemplative, mid-conversation, or gazing out of frame at something unseen.
      FEEL: A pivotal quiet moment in a beautiful film. Emotional weight. Narrative tension.
      REFERENCE: Wong Kar-wai "In the Mood for Love", Sofia Coppola "Lost in Translation",
        Nicolas Winding Refn "Drive", Barry Jenkins "Moonlight".`,
  },
];

/**
 * Generate an SNS-styled image by transforming a base image from the GENERATION QUEUE.
 * The base image provides the garment/model anchor; the style prompt transforms the visual aesthetic.
 */
export const generateSnsStyleTransform = async (
  apiKey: string,
  baseImageB64: string,
  styleKey: SnsStyleKey,
  garmentKeywords: string[] = [],
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey });
    const styleDef = SNS_STYLES.find(s => s.key === styleKey);
    if (!styleDef) throw new Error(`Unknown SNS style: ${styleKey}`);

    const validRef = await ensureSupportedFormat(baseImageB64);
    const { mimeType, data } = parseBase64(validRef);

    const prompt = `
      SNS STYLE TRANSFORM — Generate a 1:1 square Instagram-ready image.

      ANCHOR IMAGE RULES (CRITICAL):
      The attached ANCHOR_IMAGE contains the model and outfit that MUST be preserved.
      - SAME person: identical face, body type, hair
      - SAME outfit: identical garments, colors, fit, accessories
      - ONLY the visual STYLE, ENVIRONMENT, LIGHTING, and POST-PROCESSING change.
      - Do NOT alter the clothing design, color, or fit in any way.

      ${styleDef.prompt}

      CANVAS: 1:1 square format. Instagram-optimized composition.
      QUALITY: Photorealistic rendering (unless pixel_8bit style which is intentionally pixelated).
      ${garmentKeywords.length > 0 ? `GARMENT KEYWORDS: ${garmentKeywords.join(', ')}` : ''}

      OUTPUT: A single, stunning, shareable Instagram image that would go viral in fashion communities.
    `;

    const imageParts = [
      { text: 'ANCHOR_IMAGE (preserve this model and outfit exactly):' },
      { inlineData: { mimeType, data } },
    ];

    const MODELS_TO_TRY = [
      "gemini-3-pro-image-preview",  // 統一モデル
    ];

    let lastError: unknown;
    for (const modelName of MODELS_TO_TRY) {
      try {
        console.log(`[Lumina SNS] Trying model: ${modelName} for style: ${styleKey}`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: {
            parts: [
              { text: prompt },
              ...imageParts
            ]
          },
          config: {
            responseModalities: ["TEXT", "IMAGE"],
            aspectRatio: '1:1',
          } as any,
        });

        if (response.candidates?.[0]?.content) {
          for (const part of (response.candidates?.[0]?.content?.parts || [])) {
            if (part.inlineData) {
              console.log(`[Lumina SNS] Style transform success with model: ${modelName}`);
              return `data:image/png;base64,${part.inlineData.data}`;
            }
          }
        }
        console.warn(`[Lumina SNS] Model ${modelName} returned no image, trying next...`);
      } catch (modelErr) {
        console.warn(`[Lumina SNS] Model ${modelName} failed:`, modelErr);
        lastError = modelErr;
      }
    }

    throw lastError ?? new Error("SNS style transform failed on all models.");
  } catch (error) {
    console.error("[Lumina SNS] Style transform failed:", error);
    throw error;
  }
};


// ========================================
// EC BATCH GENERATION — 5-Shot Sequence
// ========================================

export interface BatchShotResult {
  shotType: ShotType;
  label: string;
  imageUrl: string;
}

interface BatchShotConfig {
  shotType: ShotType;
  label: string;
  poseOverride?: PoseType;
  rotationOverride?: number; // radians
}

const EC_BATCH_SHOTS: BatchShotConfig[] = [
  { shotType: 'full_body_front', label: 'Front', poseOverride: 'ec_neutral' },
  { shotType: 'full_body_back', label: 'Back', poseOverride: 'ec_neutral' },
  { shotType: 'bust_up', label: 'Bust-Up' },
  { shotType: 'lower_body', label: 'Lower Body' },
  { shotType: 'full_body_front', label: 'Side', rotationOverride: Math.PI / 2 },
];

export const generateECBatchShots = async (
  apiKey: string,
  analysis: VisionAnalysis,
  lighting: LightingConfig,
  mannequin: MannequinConfig,
  scene: SceneConfig,
  images: Record<string, string>,
  garmentMeasurements?: DetailedGarmentMeasurements,
  accessoryMeasurements?: DetailedAccessoryMeasurements,
  accessoryPositioning?: DetailedAccessoryPositioning,
  accessoryMaterials?: DetailedAccessoryMaterials,
  onProgress?: (current: number, total: number, result?: BatchShotResult) => void
): Promise<BatchShotResult[]> => {
  const results: BatchShotResult[] = [];
  let anchorImageUrl: string | null = null;

  for (let i = 0; i < EC_BATCH_SHOTS.length; i++) {
    const shotConfig = EC_BATCH_SHOTS[i];

    // Override mannequin for specific shots
    const mannequinOverride: MannequinConfig = {
      ...mannequin,
      ...(shotConfig.poseOverride ? { pose: shotConfig.poseOverride } : {}),
      ...(shotConfig.rotationOverride !== undefined ? { rotation: shotConfig.rotationOverride } : {}),
    };

    // Override scene for this shot
    const sceneOverride: SceneConfig = {
      ...scene,
      shotType: shotConfig.shotType,
      outputPurpose: 'ec_product',
      lightingPreset: scene.lightingPreset || 'ec_standard',
    };

    // For shots after the first, add the anchor image as reference
    const imagesWithAnchor = anchorImageUrl && i > 0
      ? { ...images, anchor_model: anchorImageUrl }
      : images;

    onProgress?.(i + 1, EC_BATCH_SHOTS.length);

    const imageUrl = await generateFashionShot(
      apiKey,
      analysis,
      lighting,
      mannequinOverride,
      sceneOverride,
      imagesWithAnchor,
      garmentMeasurements,
      accessoryMeasurements,
      accessoryPositioning,
      accessoryMaterials
    );

    // First shot becomes the anchor
    if (i === 0) {
      anchorImageUrl = imageUrl;
    }

    const result: BatchShotResult = {
      shotType: shotConfig.shotType,
      label: shotConfig.label,
      imageUrl,
    };
    results.push(result);
    onProgress?.(i + 1, EC_BATCH_SHOTS.length, result);
  }

  return results;
};

// ========================================
// IMAGE EDIT — Text-instruction refinement
// ========================================

/**
 * 生成済み画像にテキスト指示を与えて AI に編集させる。
 * @param apiKey  Gemini API key
 * @param imageUrl  既存画像（base64 data URL or blob URL）
 * @param instruction  日本語/英語の自然言語指示
 * @returns 編集後の base64 data URL
 */
export const editImageWithInstruction = async (
  apiKey: string,
  imageUrl: string,
  instruction: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey });

  // Fetch image as base64 if it's a blob URL
  let imageData: string;
  let mimeType = 'image/png';
  if (imageUrl.startsWith('data:')) {
    const parsed = parseBase64(imageUrl);
    imageData = parsed.data;
    mimeType = parsed.mimeType;
  } else {
    // blob:// URL → fetch and convert
    const blob = await fetch(imageUrl).then(r => r.blob());
    mimeType = blob.type || 'image/png';
    imageData = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(blob);
    });
  }

  const EDIT_MODELS = [
    'gemini-3-pro-image-preview',  // 統一モデル
  ];

  const prompt = `You are a fashion photography expert. Edit the provided fashion image according to the following instruction, preserving the model's appearance, clothing details, and overall composition unless the instruction specifically asks to change them.

INSTRUCTION: ${instruction}

Requirements:
- Maintain photographic quality and professional fashion photography aesthetic
- Keep the model's face and clothing exactly as-is unless instructed to change them
- Apply ONLY the changes described in the instruction
- Output a complete, high-quality fashion photograph`;

  let lastError: unknown;
  for (const model of EDIT_MODELS) {
    try {
      console.log(`[Lumina Edit] Trying model: ${model}`);
      const response = await ai.models.generateContent({
        model,
        contents: {
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: imageData } },
          ],
        },
        config: { responseModalities: ['TEXT', 'IMAGE'] },
      });

      if (response.candidates?.[0]?.content) {
        for (const part of response.candidates[0].content.parts || []) {
          if (part.inlineData) {
            console.log(`[Lumina Edit] Success with model: ${model}`);
            return `data:image/png;base64,${part.inlineData.data}`;
          }
        }
      }
      console.warn(`[Lumina Edit] Model ${model} returned no image, trying next...`);
    } catch (e) {
      console.warn(`[Lumina Edit] Model ${model} failed:`, e);
      lastError = e;
    }
  }
  throw lastError ?? new Error('全モデルで画像編集に失敗しました。');
};


// ═══════════════════════════════════════════════════════════════════════════════
// Stage 1: CASTING — Generate Base Model
// Creates a neutral-outfit model on white background for anchor_model use.
// This is the foundation image that subsequent stages (fitting, shooting) build on.
// ═══════════════════════════════════════════════════════════════════════════════

export const generateBaseModel = async (
  apiKey: string,
  mannequin: MannequinConfig,
  bodySpec?: import('../types').ModelBodySpec,
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey });

  // Build detailed body description
  const genderDesc = mannequin.gender === 'female' ? 'female' : 'male';
  const ethnicityMap: Record<string, string> = {
    east_asian: 'East Asian',
    southeast_asian: 'Southeast Asian',
    south_asian: 'South Asian',
    black_african: 'Black / African descent',
    latina_hispanic: 'Latina / Hispanic',
    middle_eastern: 'Middle Eastern',
    white_caucasian: 'White / Caucasian',
    mixed: 'Mixed ethnicity',
    japanese: 'Japanese',
    korean: 'Korean',
    european: 'European',
    african: 'African',
    latin_american: 'Latin American',
  };
  const skinToneMap: Record<string, string> = {
    fair: 'fair/pale skin tone',
    light: 'light skin tone',
    medium: 'medium/olive skin tone',
    tan: 'tan/warm brown skin tone',
    deep: 'deep/dark brown skin tone',
  };
  const hairColorMap: Record<string, string> = {
    black: 'black hair',
    dark_brown: 'dark brown hair',
    brown: 'brown hair',
    light_brown: 'light brown hair',
    blonde: 'blonde hair',
    platinum: 'platinum/ash blonde hair',
    auburn: 'auburn hair',
    red: 'red hair',
  };
  const hairLengthMap: Record<string, string> = {
    short: 'short hair',
    bob: 'bob-length hair',
    medium: 'medium-length hair (shoulder)',
    long: 'long hair (past shoulders)',
    extra_long: 'very long hair (mid-back or longer)',
  };

  const bwhStr = bodySpec
    ? [
      bodySpec.bust ? `bust ${bodySpec.bust}cm` : null,
      bodySpec.waist ? `waist ${bodySpec.waist}cm` : null,
      bodySpec.hip ? `hip ${bodySpec.hip}cm` : null,
    ].filter(Boolean).join(', ')
    : '';

  const prompt = `
STAGE 1 — CASTING: Generate a professional fashion model for EC product photography.

OBJECTIVE: Create a FULL-BODY model image that will serve as the BASE MODEL for subsequent garment fitting.
This model will be dressed in product garments in the next stage — the purpose here is to establish the model's
body, face, skin, and proportions FIRST.

MODEL SPECIFICATION:
- Gender: ${genderDesc}
- Ethnicity: ${ethnicityMap[mannequin.ethnicity] ?? mannequin.ethnicity}
- Skin tone: ${skinToneMap[mannequin.skinTone ?? 'fair'] ?? 'natural'}
- Hair: ${hairColorMap[mannequin.hairColor ?? 'black'] ?? 'dark'}, ${hairLengthMap[mannequin.hairLength ?? 'medium'] ?? 'medium length'}
- Age range: ${mannequin.ageGroup} (${mannequin.ageGroup === 'teen' ? '16-19' : mannequin.ageGroup === 'youthful' ? '20-28' : mannequin.ageGroup === 'prime' ? '29-38' : '39-50'})
- Body type: ${mannequin.bodyType}
${bodySpec?.height ? `- Height: ${bodySpec.height}cm (proportions should reflect this)` : ''}
${bwhStr ? `- Body measurements: ${bwhStr}` : ''}
${bodySpec?.weight ? `- Build: ${bodySpec.weight}` : ''}

CLOTHING (CRITICAL — NEUTRAL BASE ONLY):
The model must wear MINIMAL, NEUTRAL clothing that allows easy garment fitting in the next stage:
- A simple, fitted, plain TANK TOP or CAMISOLE in light grey or beige
- Simple, fitted SHORTS or BIKE SHORTS in light grey or beige
- NO shoes (bare feet are acceptable at this stage — shoes are added with the garment)
- NO accessories, jewelry, or watches
- Clothing must be tight-fitting to clearly show the body's silhouette and proportions

POSE:
- Direct frontal standing pose, arms slightly away from body (5-10 degrees)
- Weight evenly distributed on both feet
- Face looking straight at camera with neutral, natural expression
- NOT smiling, NOT frowning — professional model composure
- Both hands visible, fingers naturally relaxed

TECHNICAL:
- Pure white seamless studio background (RGB 255,255,255)
- Flat, even studio lighting — zero shadows on background
- Full body from top of head to feet, centered in frame
- 3:4 aspect ratio
- Hyperrealistic photography, NOT illustration or CGI
- Shot on professional camera, 50mm lens equivalent
- The result must look like an actual person photographed in a studio`;

  // Use Gemini's native image generation
  const models = ['gemini-3-pro-image-preview'];

  let lastError: unknown;
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseModalities: ['IMAGE', 'TEXT'],
          temperature: 0.8,
        },
      });

      if (response.candidates?.[0]?.content) {
        for (const part of response.candidates[0].content.parts || []) {
          if (part.inlineData) {
            console.log(`[Lumina Stage1 CASTING] Base model generated with ${model}`);
            return `data:image/png;base64,${part.inlineData.data}`;
          }
        }
      }
      console.warn(`[Lumina Stage1] Model ${model} returned no image`);
    } catch (e) {
      console.warn(`[Lumina Stage1] Model ${model} failed:`, e);
      lastError = e;
    }
  }
  throw lastError ?? new Error('Stage 1 CASTING: ベースモデル生成に失敗しました。');
};


// ═══════════════════════════════════════════════════════════════════════════════
// Stage 2: FITTING — Dress the base model with product garments
// Takes the Stage 1 base model + garment images + analysis → dressed model
// This result serves as ec_front AND anchor_model for all subsequent shots.
// ═══════════════════════════════════════════════════════════════════════════════

export const generateFittedModel = async (
  apiKey: string,
  baseModelImage: string,
  analysis: VisionAnalysis,
  garmentImages: Record<string, string>,
  _mannequin: MannequinConfig,
  garmentContext?: import('../types').GarmentContext,
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey });

  // Build outfit description from analysis
  const outfitParts: string[] = [];
  if (analysis.tops) {
    outfitParts.push(`TOP: ${analysis.tops.description}. Fabric: ${analysis.tops.fabric}. Color: ${analysis.tops.colorHex}. Fit: ${analysis.tops.fit}.`);
  }
  if (analysis.pants) {
    outfitParts.push(`PANTS/BOTTOM: ${analysis.pants.description}. Fabric: ${analysis.pants.fabric}. Color: ${analysis.pants.colorHex}. Fit: ${analysis.pants.fit}.`);
  }
  if (analysis.outer) {
    outfitParts.push(`OUTER: ${analysis.outer.description}. Fabric: ${analysis.outer.fabric}. Color: ${analysis.outer.colorHex}. Fit: ${analysis.outer.fit}.`);
  }
  if (analysis.inner) {
    outfitParts.push(`INNER: ${analysis.inner.description}. Fabric: ${analysis.inner.fabric}. Color: ${analysis.inner.colorHex}. Fit: ${analysis.inner.fit}.`);
  }
  if (analysis.shoes) {
    outfitParts.push(`SHOES: ${analysis.shoes.description}. Color: ${analysis.shoes.colorHex}.`);
  }

  // Hero product emphasis
  const heroLabel: Record<string, string> = {
    tops: 'TOP', pants: 'PANTS/BOTTOM', outer: 'OUTERWEAR',
    inner: 'INNER LAYER', shoes: 'SHOES',
  };
  const hero = garmentContext?.heroProduct;
  const heroSpec = hero ? garmentContext?.specs?.[hero] : null;

  // Layering state
  const layeringBlock = analysis.layeringState ? `
STYLING STATE (reproduce EXACTLY):
${analysis.layeringState.outerOpenState ? `- Outer: ${analysis.layeringState.outerOpenState.replace(/_/g, ' ')}` : ''}
${analysis.layeringState.topTuckState ? `- Tuck: ${analysis.layeringState.topTuckState.replace(/_/g, ' ')}` : ''}
${analysis.layeringState.innerVisibility ? `- Inner visibility: ${analysis.layeringState.innerVisibility.replace(/_/g, ' ')}` : ''}
${analysis.layeringState.sleeveCuffState ? `- Sleeves: ${analysis.layeringState.sleeveCuffState.replace(/_/g, ' ')}` : ''}
${analysis.layeringState.beltState ? `- Belt: ${analysis.layeringState.beltState.replace(/_/g, ' ')}` : ''}
${analysis.layeringState.stylingDescription ? `Full description: "${analysis.layeringState.stylingDescription}"` : ''}
` : '';

  const prompt = `
STAGE 2 — FITTING: Dress the base model with product garments.

OBJECTIVE: Take the BASE MODEL (the person in the reference image wearing neutral clothing)
and dress them in the EXACT product garments shown in the reference garment images.
This is a GARMENT FITTING step — focus entirely on accurate clothing placement, fit, and styling.

IDENTITY LOCK (ABSOLUTE — DO NOT CHANGE THE PERSON):
- The person's FACE must be 100% identical to the base model reference
- Same bone structure, jawline, nose, eyes, eyebrows, lips
- Same skin tone, complexion, hair color, hair length, hair style
- Same body proportions and build
- ONLY the clothing changes — everything about the person stays EXACTLY the same

GARMENT PLACEMENT (PRIMARY FOCUS OF THIS STAGE):
${outfitParts.join('\n')}
${layeringBlock}

${hero ? `
HERO PRODUCT PRIORITY: [${heroLabel[hero] ?? hero}]
This garment is the MAIN PRODUCT — it must be rendered with maximum accuracy:
${heroSpec?.length ? `- Length: ${heroSpec.length}cm` : ''}
${heroSpec?.rise ? `- Rise: ${heroSpec.rise}cm (${heroSpec.rise >= 28 ? 'high-rise' : heroSpec.rise >= 24 ? 'mid-rise' : 'low-rise'})` : ''}
${heroSpec?.thighWidth ? `- Thigh width: ${heroSpec.thighWidth}cm (${heroSpec.thighWidth >= 38 ? 'wide-leg' : heroSpec.thighWidth >= 30 ? 'straight' : 'slim'})` : ''}
${heroSpec?.material ? `- Material: ${heroSpec.material}` : ''}
${heroSpec?.waistStyle ? `- Waist style: ${heroSpec.waistStyle}` : ''}
${heroSpec?.shoulderWidth ? `- Shoulder width: ${heroSpec.shoulderWidth}cm` : ''}
` : ''}

FITTING ACCURACY REQUIREMENTS:
- Every garment must match the EXACT color, pattern, texture from the reference images
- Fabric drape, weight, and construction must be accurate to the material
- Hem positions, sleeve lengths, and overall proportions must match references
- Logos, prints, and decorative elements must be preserved exactly
- Garment layering order must be correct (inner → top → outer)

POSE:
- Direct frontal standing, arms slightly away from body (5-10°)
- Weight even on both feet, feet parallel shoulder-width apart
- Natural relaxed hands at sides
- Face looking straight at camera, neutral expression

TECHNICAL:
- Pure white seamless background
- Professional EC flat lighting — even, no harsh shadows
- 3:4 portrait aspect ratio
- Full body from head to feet, centered
- Hyperrealistic photography quality`;

  // Build image parts: base_model + all garment images
  const imageParts: Array<{ inlineData: { mimeType: string; data: string } }> = [];

  // Base model
  const baseModelParsed = parseBase64(baseModelImage);
  imageParts.push({ inlineData: { mimeType: baseModelParsed.mimeType, data: baseModelParsed.data } });

  // Garment reference images (exclude base_model and anchor_model from garment list)
  const excludeKeys = new Set(['base_model', 'anchor_model', 'model', 'campaign_style_ref']);
  for (const [key, img] of Object.entries(garmentImages)) {
    if (excludeKeys.has(key) || !img) continue;
    const parsed = parseBase64(img);
    imageParts.push({ inlineData: { mimeType: parsed.mimeType, data: parsed.data } });
  }

  const models = ['gemini-3-pro-image-preview'];
  let lastError: unknown;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{
          role: 'user',
          parts: [
            { text: `[BASE_MODEL — this is the person to dress. Keep their identity LOCKED.]` },
            imageParts[0],  // base model image
            { text: `[GARMENT REFERENCE IMAGES — dress the base model in these exact garments:]` },
            ...imageParts.slice(1),  // garment images
            { text: prompt },
          ],
        }],
        config: {
          responseModalities: ['IMAGE', 'TEXT'],
          temperature: 0.6,  // Lower temp for more accurate fitting
        },
      });

      if (response.candidates?.[0]?.content) {
        for (const part of response.candidates[0].content.parts || []) {
          if (part.inlineData) {
            console.log(`[Lumina Stage2 FITTING] Fitted model generated with ${model}`);
            return `data:image/png;base64,${part.inlineData.data}`;
          }
        }
      }
      console.warn(`[Lumina Stage2] Model ${model} returned no image`);
    } catch (e) {
      console.warn(`[Lumina Stage2] Model ${model} failed:`, e);
      lastError = e;
    }
  }
  throw lastError ?? new Error('Stage 2 FITTING: 着用合成に失敗しました。');
};
