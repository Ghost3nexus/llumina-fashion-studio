
export interface LightingConfig {
  intensity: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  color: string;
}

export type BodyType = 'slim' | 'athletic' | 'curvy' | 'plus';
export type AgeGroup = 'youthful' | 'mature' | 'sophisticated';
export type Vibe = 'minimalist' | 'edgy' | 'casual' | 'elegant';
export type EditorialStyle = 'vogue' | 'elle' | 'collection' | 'japanese_magazine';
export type FocalLength = '25mm' | '50mm' | '80mm';
export type BackgroundType = 'studio' | 'outdoor' | 'urban' | 'runway';
export type PoseType = 'standing' | 'walking' | 'sitting' | 'leaning' | 'running' | 'crossed_arms' | 'hands_in_pockets' | 'jumping' | 'squatting' | 'hero';
export type LightingPreset = 'studio' | 'golden_hour' | 'neon' | 'cinematic' | 'high_key';
export type ShotType = 'full_body' | 'upper_body' | 'lower_body';

export interface MannequinConfig {
  pose: PoseType;
  rotation: number;
  gender: 'female' | 'male';
  ethnicity: 'asian' | 'western' | 'black';
  bodyType: BodyType;
  ageGroup: AgeGroup;
  vibe: Vibe;
  editorialStyle: EditorialStyle;
  height?: number; // cm
  weight?: string; // e.g. "55kg" or "Slim"
}

export interface ItemMeasurements {
  shoulderWidth?: number; // cm
  chestWidth?: number; // cm
  length?: number; // cm
  sleeveLength?: number; // cm
  waist?: number;     // for pants
  hip?: number;       // for pants
  inseam?: number;    // for pants
}

export interface DetailedGarmentMeasurements {
  tops: ItemMeasurements;
  pants: ItemMeasurements;
  outer: ItemMeasurements;
}

export interface SceneConfig {
  background: BackgroundType;
  isSetup: boolean;
  focalLength: FocalLength;
  lightingPreset: LightingPreset;
  shotType: ShotType;
}

export interface ItemAnalysis {
  description: string;
  fabric: string;
  style: string;
  colorHex?: string;
}

export interface VisionAnalysis {
  tops?: ItemAnalysis;
  pants?: ItemAnalysis;
  outer?: ItemAnalysis;
  inner?: ItemAnalysis;
  shoes?: ItemAnalysis;
  overallStyle: string;
  keywords: string[];
}

export type ClothingType = 'tops' | 'pants' | 'outer' | 'inner' | 'shoes' | 'model';

export interface GenerationState {
  status: 'idle' | 'analyzing' | 'generating' | 'complete' | 'error';
  error?: string;
  resultUrl?: string;
  analysis?: VisionAnalysis;
}

export enum ViewMode {
  SETUP = 'SETUP',
  RESULT = 'RESULT'
}
