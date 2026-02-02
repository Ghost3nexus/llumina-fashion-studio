
import { GoogleGenAI, Type } from "@google/genai";
import { LightingConfig, MannequinConfig, VisionAnalysis, SceneConfig, DetailedGarmentMeasurements } from "../types";

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

    for (const [key, b64] of Object.entries(images)) {
      if (!b64) continue;
      // Skip model image for clothing analysis
      if (key === 'model') continue;

      const validImage = await ensureSupportedFormat(b64);
      const { mimeType, data } = parseBase64(validImage);
      parts.push({ text: `REFERENCE ${key.toUpperCase()}:` });
      parts.push({ inlineData: { mimeType, data } });
    }

    if (parts.length === 0) throw new Error("No images provided for analysis");

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: {
        parts: parts,
      },
      config: {
        systemInstruction: `You are a high-end fashion consultant and texture analyst. 
        Examine the provided reference images with extreme precision.
        Identify:
        1. Exact fabric weave (e.g., 12oz denim, silk satin, heavy-weight cotton jersey).
        2. Color values in HEX and descriptive terms (e.g., #2C3E50 "Midnight Navy").
        3. Subtle details: contrast stitching, button materials, pocket styles, hem finishes.
        Return a JSON object matching the VisionAnalysis interface.`,
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
    if (!text) throw new Error("No analysis returned");
    return JSON.parse(text) as VisionAnalysis;
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
            text: `You are an expert fashion AI. Your task is to MODIFY the existing clothing analysis JSON based on the user's natural language instruction.

CURRENT ANALYSIS JSON:
${JSON.stringify(currentAnalysis, null, 2)}

USER INSTRUCTION:
"${instruction}"

GUIDELINES:
1. Identify the target item (tops, pants, outer, etc.) from the instruction.
2. Update the specific fields (colorHex, fabric, style, description) requested.
   - For COLOR changes: Update 'colorHex' with a realistic hex code AND update 'description' to mention the new color.
   - For MATERIAL changes: Update 'fabric' AND 'description'.
   - For STYLE changes: Update 'style' AND 'description'.
3. KEEP all other fields exactly as they are. Do not lose existing details unless they conflict with the change.
4. If the user asks to "remove" an item, set that item key to null or remove it (if the schema allows) or clear its fields. (Note: Schema requires objects, so just clear the content strings if removing).

RETURN ONLY the complete, valid updated JSON.`
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
