
import { GoogleGenAI, Type } from "@google/genai";
import { LightingConfig, MannequinConfig, VisionAnalysis, SceneConfig, DetailedGarmentMeasurements, RefinementRequest, RefinementInterpretation, RefinementTarget, RefinementChangeType } from "../types";

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

export const analyzeClothingItems = async (apiKey: string, images: Record<string, string>): Promise<VisionAnalysis> => {
  try {
    const ai = new GoogleGenAI({ apiKey });
    const parts = [];

    console.log('🔍 analyzeClothingItems START');
    console.log('📥 Images to analyze:', Object.keys(images));

    for (const [key, b64] of Object.entries(images)) {
      if (!b64) continue;
      // Skip model image for clothing analysis
      if (key === 'model') continue;

      const validImage = await ensureSupportedFormat(b64);
      const { mimeType, data } = parseBase64(validImage);

      // Explicit instruction for each image
      parts.push({
        text: `ANALYZE THIS ${key.toUpperCase()} GARMENT:
This image shows a ${key} item. You MUST extract its details and include it in the "${key}" field of your JSON response.
Do not omit this item from your analysis.`
      });
      parts.push({ inlineData: { mimeType, data } });

      console.log(`✓ Added ${key} image for analysis`);
    }

    if (parts.length === 0) throw new Error("No images provided for analysis");

    console.log(`📊 Total images to analyze: ${parts.length / 2}`);

    // Build required fields array based on uploaded images
    const requiredFields = ["overallStyle", "keywords"];
    const uploadedItems: string[] = [];

    for (const key of Object.keys(images)) {
      if (images[key] && key !== 'model') {
        uploadedItems.push(key);
        requiredFields.push(key);
      }
    }

    console.log('📋 Required fields:', requiredFields);
    console.log('📦 Uploaded items:', uploadedItems);

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: {
        parts: parts,
      },
      config: {
        systemInstruction: `You are a high-end fashion consultant and texture analyst.

CRITICAL INSTRUCTION: For EACH reference image provided, you MUST analyze it and include it in the corresponding field of your JSON response.

- If you see "ANALYZE THIS TOPS GARMENT", extract details and populate the "tops" field
- If you see "ANALYZE THIS PANTS GARMENT", extract details and populate the "pants" field
- If you see "ANALYZE THIS OUTER GARMENT", extract details and populate the "outer" field
- If you see "ANALYZE THIS INNER GARMENT", extract details and populate the "inner" field
- If you see "ANALYZE THIS SHOES GARMENT", extract details and populate the "shoes" field

DO NOT omit any provided reference images from your analysis. Every image you receive MUST appear in the final JSON.

For each garment, identify with extreme precision:
1. Exact fabric weave (e.g., 12oz denim, silk satin, heavy-weight cotton jersey)
2. Color values in HEX and descriptive terms (e.g., #2C3E50 "Midnight Navy")
3. Subtle details: contrast stitching, button materials, pocket styles, hem finishes

Return a complete JSON object with ALL provided garments included.`,
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
          required: requiredFields  // Dynamic required fields based on uploaded images
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No analysis returned");

    const analysis = JSON.parse(text) as VisionAnalysis;

    console.log('📤 Analysis result:', JSON.stringify(analysis, null, 2));
    console.log('✅ Analysis includes - tops:', !!analysis.tops);
    console.log('✅ Analysis includes - pants:', !!analysis.pants);
    console.log('✅ Analysis includes - outer:', !!analysis.outer);
    console.log('✅ Analysis includes - inner:', !!analysis.inner);
    console.log('✅ Analysis includes - shoes:', !!analysis.shoes);
    console.log('🔍 analyzeClothingItems END');

    return analysis;
  } catch (error) {
    console.error("Vision Analysis Failed:", error);
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
  const clothingTargets: RefinementTarget[] = ['tops', 'pants', 'outer', 'inner', 'shoes'];
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
  garmentMeasurements?: DetailedGarmentMeasurements
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
      studio: "Clean professional studio lighting, three-point setup with soft boxes, neutral white balance, minimal harsh shadows.",
      golden_hour: "Golden hour sunset lighting, warm amber tones, long soft shadows, volumetric lighting, light rays filtering through air.",
      neon: "Cyberpunk neon aesthetic, high-contrast cyan and magenta rim lighting, dark moody shadows, urban night vibe.",
      cinematic: "Cinematic chiaroscuro lighting, dramatic highlights, deep moody shadows, high dynamic range, focus on form and volume.",
      high_key: "Bright high-key photography, extremely soft diffused light, almost shadowless, clean and airy minimalist aesthetic."
    };

    const posePrompts: Record<string, string> = {
      standing: "Elegant neutral standing pose.",
      walking: "Dynamic walking motion captured in mid-stride.",
      sitting: "Fashionable seated pose on a minimalist stool.",
      leaning: "Casual leaning pose against an architectural wall.",
      running: "High-action running pose, athletic garment flow.",
      crossed_arms: "Sophisticated pose with arms crossed.",
      hands_in_pockets: "Relaxed casual pose with hands in pockets.",
      jumping: "Dynamic jumping action pose, high energy.",
      squatting: "Streetwear-inspired squatting pose, low angle.",
      hero: "Dramatic high-fashion hero pose."
    };

    const stylePrompts: Record<string, string> = {
      vogue: "VOGUE editorial aesthetic, high-contrast avant-garde.",
      elle: "ELLE chic lifestyle aesthetic, approachable luxury.",
      collection: "Technical lookbook style, high-fidelity fabric documentation.",
      japanese_magazine: "Japanese fashion magazine minimalist soft-focus, filmic grain."
    };

    const shotTypePrompts: Record<string, string> = {
      full_body: "Full body long shot, showing entire mannequin from head to toe, leaving headspace.",
      upper_body: "Medium close-up shot, framing from waist up, focus on torso and face.",
      lower_body: "Medium shot framing from waist down, focus on pants/skirt and shoes."
    };

    const prompt = `
      TECHNICAL SPECIFICATION: 
      Camera: Hasselblad H6D. Lens: ${scene.focalLength}. f/2.8, ISO 64. 
      Professional editorial for ${stylePrompts[mannequin.editorialStyle]}.
      FRAMING: ${shotTypePrompts[scene.shotType]}.
      
      SUBJECT:
      ${images.model ? "CRITICAL: The subject MUST be the person shown in the REFERENCE MODEL image. Preserve their facial features, body type, and hair style exactly." : ""}
      A realistic ${mannequin.ageGroup} ${mannequin.ethnicity} ${mannequin.gender} model, ${mannequin.bodyType} build.
      ${mannequin.height ? `Height: ${mannequin.height}cm.` : ''} ${mannequin.weight ? `Body Size/Weight: ${mannequin.weight}.` : ''}
      Pose: ${posePrompts[mannequin.pose]}.

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

      LIGHTING & MOOD:
      ${presetPrompts[scene.lightingPreset]}. 
      Lighting color: ${lighting.color}. Intensity level: ${lighting.intensity}.

      OUTFIT DETAILS (MUST MATCH EXACTLY):
      ${analysis.tops ? `TOP: ${analysis.tops.description}. Fabric: ${analysis.tops.fabric}. Style: ${analysis.tops.style}. Color: ${analysis.tops.colorHex}.` : ''}
      ${analysis.inner ? `INNER: ${analysis.inner.description}. Fabric: ${analysis.inner.fabric}. Style: ${analysis.inner.style}. Color: ${analysis.inner.colorHex}.` : ''}
      ${analysis.pants ? `BOTTOM: ${analysis.pants.description}. Fabric: ${analysis.pants.fabric}. Style: ${analysis.pants.style}. Color: ${analysis.pants.colorHex}.` : ''}
      ${analysis.outer ? `OUTER: ${analysis.outer.description}. Fabric: ${analysis.outer.fabric}. Style: ${analysis.outer.style}. Color: ${analysis.outer.colorHex}.` : ''}
      ${analysis.shoes ? `SHOES: ${analysis.shoes.description}. Fabric: ${analysis.shoes.fabric}. Style: ${analysis.shoes.style}. Color: ${analysis.shoes.colorHex}.` : ''}
      
      OVERALL STYLE: ${analysis.overallStyle}.
      ${scene.isSetup ? "FORCE COLOR IDENTITY: Matching set." : ""}
      
      CRITICAL REQUIREMENT: The model MUST wear the EXACT clothing items described above with MATCHING colors, fabrics, and styles. Do not substitute or change any details.
      RENDER MACRO TEXTURES: Visible fabric weave, realistic drape, sharp stitching detail.
      ${images.model ? "IDENTITY PRESERVATION: Maintain exact facial identity of the REFERENCE MODEL." : ""}

      SCENE:
      VIEW: ${viewDesc}.
      LOCATION: ${scene.background}.

      POST-PROCESSING:
      Clean commercial color grading, 8k resolution, razor-sharp focus on the outfit.
      KEYWORDS: ${analysis.keywords.join(", ")}, ray-traced reflections, photorealistic clothing.
    `;

    // Prepare reference images for Gemini 3 Pro Image
    const imageParts: any[] = [];
    for (const [key, b64] of Object.entries(images)) {
      if (!b64) continue;
      const validRef = await ensureSupportedFormat(b64);
      const { mimeType, data } = parseBase64(validRef);
      // Add text label and image as separate parts
      imageParts.push({ text: `REFERENCE ${key.toUpperCase()}:` });
      imageParts.push({ inlineData: { mimeType, data } });
    }

    // Use Gemini 3 Pro Image for generation with reference images
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: {
        parts: [
          { text: prompt },
          ...imageParts
        ]
      },
      config: {
        responseModalities: ["IMAGE"],
        imageConfig: {
          aspectRatio: "3:4"
        }
      }
    });

    if (response.candidates?.[0]?.content) {
      for (const part of (response.candidates?.[0]?.content?.parts || [])) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error("No image generated from Gemini 3 Pro Image");
  } catch (error) {
    console.error("Image Generation Failed:", error);
    throw error;
  }
};
