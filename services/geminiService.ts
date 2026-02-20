
import { GoogleGenAI, Type } from "@google/genai";
import { LightingConfig, MannequinConfig, VisionAnalysis, SceneConfig, DetailedGarmentMeasurements, DetailedAccessoryMeasurements, DetailedAccessoryPositioning, DetailedAccessoryMaterials, RefinementRequest, RefinementInterpretation, RefinementTarget, RefinementChangeType, ShotType, PoseType } from "../types";


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
    const ACCESSORY_TYPES = ['bag', 'sunglasses', 'glasses', 'accessories'];

    console.log('🔍 analyzeClothingItems START');
    console.log('📥 Images to analyze:', Object.keys(images));

    for (const [key, b64] of Object.entries(images)) {
      if (!b64) continue;
      // Skip model image for clothing analysis
      if (key === 'model') continue;

      const validImage = await ensureSupportedFormat(b64);
      const { mimeType, data } = parseBase64(validImage);

      const isAccessory = ACCESSORY_TYPES.includes(key);
      const itemType = isAccessory ? 'ACCESSORY' : 'GARMENT';

      // Explicit instruction for each image
      parts.push({
        text: `ANALYZE THIS ${key.toUpperCase()} ${itemType}:
This image shows a ${key} item. You MUST extract its details and include it in the "${key}" field of your JSON response.
${isAccessory ? 'For accessories, identify material (leather, metal, plastic, acetate, etc.), color, and style.' : ''}
Do not omit this item from your analysis.`
      });
      parts.push({ inlineData: { mimeType, data } });

      console.log(`✓ Added ${key} ${itemType.toLowerCase()} for analysis`);
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

GARMENTS:
- If you see "ANALYZE THIS TOPS GARMENT", extract details and populate the "tops" field
- If you see "ANALYZE THIS PANTS GARMENT", extract details and populate the "pants" field
- If you see "ANALYZE THIS OUTER GARMENT", extract details and populate the "outer" field
- If you see "ANALYZE THIS INNER GARMENT", extract details and populate the "inner" field
- If you see "ANALYZE THIS SHOES GARMENT", extract details and populate the "shoes" field

ACCESSORIES:
- If you see "ANALYZE THIS BAG ACCESSORY", extract details and populate the "bag" field
  * Material: leather, canvas, nylon, synthetic, etc.
  * Style: handbag, tote, shoulder, crossbody, clutch, backpack, etc.
  * Hardware: gold, silver, brass, etc.
  
- If you see "ANALYZE THIS SUNGLASSES ACCESSORY", extract details and populate the "sunglasses" field
  * Frame material: plastic, metal, acetate, etc.
  * Lens type: polarized, gradient, mirrored, etc.
  * Style: aviator, wayfarer, cat-eye, round, square, etc.
  
- If you see "ANALYZE THIS GLASSES ACCESSORY", extract details and populate the "glasses" field
  * Frame material: plastic, metal, titanium, acetate, etc.
  * Style: round, square, rectangular, cat-eye, aviator, etc.
  
- If you see "ANALYZE THIS ACCESSORIES ACCESSORY", extract details and populate the "accessories" field
  * Type: necklace, earrings, bracelet, watch, ring, hat, scarf, etc.
  * Material: gold, silver, platinum, leather, beads, fabric, etc.

DO NOT omit any provided reference images from your analysis. Every image you receive MUST appear in the final JSON.

For each item, identify with extreme precision:
1. Exact material/fabric (e.g., genuine leather, stainless steel, acetate plastic, 12oz denim)
2. Color values in HEX and descriptive terms (e.g., #2C3E50 "Midnight Navy")
3. Subtle details: stitching, hardware finish, brand logos, patterns, textures

Return a complete JSON object with ALL provided items included.`,
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
            bag: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING },
                fabric: { type: Type.STRING },
                style: { type: Type.STRING },
                colorHex: { type: Type.STRING },
              }
            },
            sunglasses: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING },
                fabric: { type: Type.STRING },
                style: { type: Type.STRING },
                colorHex: { type: Type.STRING },
              }
            },
            glasses: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING },
                fabric: { type: Type.STRING },
                style: { type: Type.STRING },
                colorHex: { type: Type.STRING },
              }
            },
            accessories: {
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
    console.log('✅ Analysis includes - bag:', !!analysis.bag);
    console.log('✅ Analysis includes - sunglasses:', !!analysis.sunglasses);
    console.log('✅ Analysis includes - glasses:', !!analysis.glasses);
    console.log('✅ Analysis includes - accessories:', !!analysis.accessories);
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
  accessoryMaterials?: DetailedAccessoryMaterials
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
        COMPOSITION: Center-aligned, same framing as front shot for visual consistency.
        CRITICAL for EC: Back design details (zippers, vents, back pockets, seam lines, labels, 
        back hem shape, shoulder blade drape) must be clearly visible. 
        Hair should be styled so it does NOT obstruct garment back neckline or collar details.
        REFERENCE STANDARD: Matches front shot framing exactly for EC product page pairing.`,

      // === 商品フォーカスショット ===
      bust_top: `Close bust-top crop, framing from mid-chest to just above head.
        CRITICAL: This shot is for TOPS/OUTERWEAR detail showcase. 
        Collar construction, neckline shape, fabric texture at close range, button/zipper details,
        shoulder seam placement, and stitching quality must be razor-sharp.
        Show layering details if multiple top layers are worn.
        Material differentiation between layers must be visible (e.g., cotton vs wool vs silk sheen).
        REFERENCE: Burberry/GANNI detail shots — visible thread texture, seam construction quality.`,

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

      campaign_editorial: `Wide cinematic campaign shot with dramatic composition.
        DRAMATIC: Use cinematic lighting, deeper shadows, stronger contrast color grading.
        Model pose should be expressive, narrative, and aspirational.
        Background can be textured or environmental for storytelling.
        This shot is for brand storytelling — convey mood, lifestyle, and aspiration.
        Wider framing with architectural negative space.
        REFERENCE: Jil Sander campaign imagery — minimal but emotionally impactful.`,

      // === レガシー互換 ===
      full_body: "Full body long shot, showing entire mannequin from head to toe, leaving headspace.",
      upper_body: "Medium close-up shot, framing from waist up, focus on torso and face.",
      bust_up: `Close-up bust shot, framing from chest up to just above head, focus on face, neck, and upper chest area. 
        CRITICAL: Ensure necklaces, earrings, and facial accessories are clearly visible and prominently displayed. 
        Perfect for showcasing jewelry details.`,
      lower_body: "Medium shot framing from waist down, focus on pants/skirt and shoes."
    };

    // Override view for back shots
    const effectiveViewDesc = scene.shotType === 'full_body_back'
      ? 'Direct back view, facing away from camera. Model rotated 180 degrees.'
      : viewDesc;

    const prompt = `
      TECHNICAL SPECIFICATION: 
      Camera: Hasselblad H6D. Lens: ${scene.focalLength}. f/2.8, ISO 64. 
      Professional editorial for ${stylePrompts[mannequin.editorialStyle]}.
      FRAMING: ${shotTypePrompts[scene.shotType] || shotTypePrompts['full_body']}.
      
      SUBJECT:
      ${images.anchor_model ? `IDENTITY LOCK (CRITICAL — HIGHEST PRIORITY):
      The model in this image MUST be 100% identical to the ANCHOR_MODEL reference image.
      - Same face structure, bone structure, jawline, nose, eyes, eyebrows, lips
      - Same skin tone and complexion
      - Same hair style, color, length, and texture
      - Same body proportions, height, posture quality
      - Same makeup and overall appearance
      - Only the POSE, CAMERA ANGLE, and FRAMING should change
      - face 100% same as ANCHOR_MODEL reference
      ` : ''}
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

      ${scene.outputPurpose === 'ec_product' || scene.shotType === 'full_body_front' || scene.shotType === 'full_body_back' ? `
      EC BACKGROUND DIRECTIVE:
      - Background MUST be solid, distraction-free, neutral tone.
      - Acceptable tones: Pure white (#FFFFFF), Warm off-white (#F5F0EB), Light grey (#E8E8E8).
      - NO props, NO environmental elements, NO dramatic shadows on background.
      - Ground plane: minimal shadow footprint, consistent across front/back views.
      - STANDARD: SSENSE, NET-A-PORTER, Mr Porter product imagery quality.
      ` : ''}

      SCENE:
      VIEW: ${effectiveViewDesc}.
      LOCATION: ${scene.outputPurpose === 'ec_product' || scene.shotType === 'full_body_front' || scene.shotType === 'full_body_back' ? 'studio' : scene.background}.

      ${scene.customPrompt ? `ADDITIONAL DIRECTIVES (USER REQUEST — PRIORITIZE):
      ${scene.customPrompt}
      ` : ''}
      POST-PROCESSING:
      ${scene.shotType === 'campaign_editorial' ? 'Cinematic color grading, rich contrast, deep shadows, aspirational mood.' : scene.shotType === 'instagram_square' ? 'Warm editorial color grading, slightly lifted shadows, social-media-optimized vibrancy.' : 'Clean commercial color grading, neutral white balance, razor-sharp focus on the outfit.'}
      8K resolution, photorealistic rendering.
      KEYWORDS: ${analysis.keywords.join(", ")}, ray-traced reflections, photorealistic clothing, luxury e-commerce.
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

    // モデル試行順（品質順）: アクセス可能なものを自動選択
    const MODELS_TO_TRY = [
      "gemini-3-pro-image-preview",              // ★最高品質 4K (課金+ウェイトリスト)
      "gemini-2.5-flash-image",                  // ★高品質・高速 (一般公開)
      "gemini-2.0-flash-exp-image-generation",   // ★フォールバック (無料枠)
    ];


    let lastError: unknown;
    for (const modelName of MODELS_TO_TRY) {
      try {
        console.log(`[Lumina] Trying model: ${modelName}`);
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
          }
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
    'gemini-3-pro-image-preview',
    'gemini-2.5-flash-image',
    'gemini-2.0-flash-exp-image-generation',
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

