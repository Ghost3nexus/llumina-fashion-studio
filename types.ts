
export interface LightingConfig {
  intensity: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  color: string;
}

export type BodyType = 'petite' | 'slim' | 'athletic' | 'standard' | 'curvy' | 'plus' | 'tall';
export type AgeGroup = 'teen' | 'youthful' | 'prime' | 'mature' | 'sophisticated';
export type Vibe = 'minimalist' | 'edgy' | 'casual' | 'elegant';
export type EditorialStyle =
  // ブランド参照スタイル
  | 'prada_intellectual'     // Prada: 知的・構造的・ミニマル
  | 'miumiu_playful'         // Miu Miu: subversive feminine・遊び心
  | 'therow_silent'          // THE ROW: サイレントラグジュアリー・静寂
  | 'acne_sculptural'        // Acne Studios: アート的・彫刻的ミニマル
  | 'gucci_maximalist'       // Gucci: マクシマリスト・大胆・エクレクティック
  | 'zara_editorial'         // Zara: ハイファッション・彫刻的ボディ
  // レガシー互換
  | 'vogue' | 'elle' | 'collection' | 'japanese_magazine';
export type FocalLength = '25mm' | '50mm' | '80mm';
export type BackgroundType = 'studio' | 'outdoor' | 'urban' | 'runway';
export type PoseType =
  // EC商品ページ向け（クリーン、プロダクトファースト）
  | 'ec_neutral'           // EC標準: ニュートラル立ち、微角度
  | 'ec_relaxed'           // EC自然体: 片足体重、リラックス
  | 'ec_dynamic'           // ECダイナミック: 動きのあるポーズ
  | 'ec_three_quarter'     // EC斜め: 3/4ターン、シルエット強調
  // エディトリアル/キャンペーン向け
  | 'editorial_power'      // Prada的: 知的で力強い、構造的
  | 'editorial_movement'   // Prada FW2025: キネティック、動的
  | 'editorial_raw'        // Prada Raw Glamour: 意図的な崩し
  | 'editorial_miumiu'     // Miu Miu的: 遊び心、サブバーシブ
  | 'editorial_seated'     // エディトリアル座り
  | 'editorial_standing'   // エディトリアル立ち
  | 'editorial_walking'    // エディトリアル歩き
  | 'editorial_leaning'    // エディトリアル寄りかかり
  // ライフスタイル/Instagram向け
  | 'lifestyle_candid'     // キャンディッド: 自然な瞬間
  | 'lifestyle_playful'    // Miu Miu Instagram: プレイフル
  | 'lifestyle_seated'     // プロップ使用: 椅子/ステップ
  // レガシー互換
  | 'standing' | 'walking' | 'sitting' | 'leaning' | 'running'
  | 'crossed_arms' | 'hands_in_pockets' | 'jumping' | 'squatting' | 'hero';
export type LightingPreset =
  // EC/プロダクト向け
  | 'ec_standard'           // EC標準: ソフトボックス3点、均一、色再現精度
  | 'ec_luxury'             // ラグジュアリーEC: 微シャドウ、質感強調
  // エディトリアル向け
  | 'natural_window'        // Miu Miu的: 窓からの自然光、柔影
  | 'ethereal_soft'         // THE ROW的: エセリアル、極ソフト拡散
  | 'sculptural_contrast'   // Acne的: 意図的コントラスト、形状強調
  | 'dramatic_luminous'     // Gucci的: ドラマティック、光=物語
  | 'dramatic_shadow'       // ドラマティックシャドウ
  // レガシー互換
  | 'studio' | 'golden_hour' | 'neon' | 'cinematic' | 'high_key';
export type ShotType =
  // EC必須ショット
  | 'full_body_front'       // 全身正面（EC必須）
  | 'full_body_back'        // 全身背面（EC必須）
  | 'ec_side'              // EC横・3/4ターン（追加）
  // 商品フォーカスショット
  | 'bust_top'              // バストトップ（肩〜胸上クロップ）
  | 'middle_top'            // ミドルトップ（胸〜ウエスト）
  | 'bottom_focus'          // ボトムフォーカス（ウエスト〜足元）
  // 用途別ショット
  | 'instagram_square'      // Instagram投稿用（1:1）
  | 'campaign_editorial'    // キャンペーン広告用
  // レガシー互換
  | 'full_body'
  | 'upper_body'
  | 'bust_up'
  | 'lower_body';

// 出力目的
export type OutputPurpose = 'ec_product' | 'instagram' | 'campaign' | 'lookbook';

export interface OutputConfig {
  purpose: OutputPurpose;
  aspectRatio: '3:4' | '1:1' | '4:5' | '16:9' | '9:16';
  shotSequence: ShotType[];  // purpose用の自動ショットシーケンス
}


export interface MannequinConfig {
  pose: PoseType;
  rotation: number;
  gender: 'female' | 'male';
  ethnicity: 'japanese' | 'korean' | 'east_asian' | 'southeast_asian' | 'south_asian' | 'european' | 'african' | 'latin_american' | 'middle_eastern' | 'mixed';
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

// Accessory Measurements
export interface BagMeasurements {
  width?: number;        // 幅 (cm)
  height?: number;       // 高さ (cm)
  depth?: number;        // 奥行き (cm)
  handleDrop?: number;   // ハンドルドロップ（持ち手の長さ）(cm)
  strapLength?: number;  // ストラップの長さ (cm) - ショルダー/クロスボディ用
  weight?: number;       // 重量 (g) - オプション
}

export interface EyewearMeasurements {
  lensWidth?: number;    // レンズ幅 (mm)
  bridge?: number;       // ブリッジ幅 (mm)
  templeLength?: number; // テンプル長さ (mm)
  frameHeight?: number;  // フレーム高さ (mm)
}

export interface AccessoryMeasurements {
  // ネックレス
  chainLength?: number;  // チェーン長さ (cm)
  pendantSize?: number;  // ペンダントサイズ (cm)

  // ブレスレット/時計
  bandWidth?: number;    // バンド幅 (mm)
  caseSize?: number;     // ケースサイズ (mm) - 時計用

  // イヤリング
  earringLength?: number; // イヤリング長さ (cm)

  // 汎用
  diameter?: number;     // 直径 (cm)
  thickness?: number;    // 厚み (mm)
}

export interface DetailedAccessoryMeasurements {
  bag?: BagMeasurements;
  sunglasses?: EyewearMeasurements;
  glasses?: EyewearMeasurements;
  accessories?: AccessoryMeasurements;
}

// Accessory Positioning
export type BagCarryingStyle =
  | 'hand_carry'        // 手持ち
  | 'shoulder'          // 肩掛け
  | 'crossbody'         // 斜め掛け
  | 'crook_of_arm'      // 腕の内側
  | 'over_shoulder'     // 肩越し
  | 'backpack'          // バックパック（背負う）
  | 'clutch_underarm'   // クラッチ（脇に挟む）
  | 'auto';             // 自動（ポーズとバッグタイプから推奨）

export type EyewearPosition =
  | 'on_face'           // 顔に装着
  | 'on_head'           // 頭の上
  | 'hanging_neck'      // 首から下げる
  | 'in_hand'           // 手に持つ
  | 'shirt_collar'      // シャツの襟に掛ける
  | 'auto';             // 自動（ショットタイプから推奨）

export type AccessoryLayeringStyle =
  | 'minimal'           // ミニマル（1-2点）
  | 'moderate'          // モデレート（3-4点）
  | 'maximalist';       // マキシマリスト（5点以上）

export interface BagPositioning {
  carryingStyle: BagCarryingStyle;
  hand?: 'left' | 'right' | 'both';  // どちらの手で持つか
  visibility?: 'prominent' | 'subtle'; // 目立たせるか控えめか
}

export interface EyewearPositioning {
  position: EyewearPosition;
  visibility?: 'prominent' | 'subtle';
}

export interface AccessoryLayering {
  style: AccessoryLayeringStyle;
  necklaceCount?: number;  // ネックレスの数（レイヤリング）
  braceletCount?: number;  // ブレスレットの数
  ringCount?: number;      // リングの数
}

export interface DetailedAccessoryPositioning {
  bag?: BagPositioning;
  sunglasses?: EyewearPositioning;
  glasses?: EyewearPositioning;
  accessories?: AccessoryLayering;
}

// Material Details
export type LeatherType =
  | 'genuine_leather'    // 本革
  | 'synthetic_leather'  // 合成皮革
  | 'suede'             // スエード
  | 'nubuck'            // ヌバック
  | 'patent_leather'    // エナメル
  | 'canvas'            // キャンバス
  | 'nylon';            // ナイロン

export type MetalType =
  | 'gold'              // ゴールド
  | 'silver'            // シルバー
  | 'rose_gold'         // ローズゴールド
  | 'platinum'          // プラチナ
  | 'stainless_steel'   // ステンレススチール
  | 'brass'             // 真鍮
  | 'copper';           // 銅

export type FrameMaterial =
  | 'acetate'           // アセテート
  | 'metal'             // メタル
  | 'titanium'          // チタン
  | 'plastic'           // プラスチック
  | 'wood'              // 木材
  | 'carbon_fiber';     // カーボンファイバー

export type SurfaceFinish =
  | 'matte'             // マット
  | 'glossy'            // 光沢
  | 'brushed'           // ブラッシュド
  | 'polished';         // ポリッシュ

export interface MaterialDetails {
  leatherType?: LeatherType;
  metalType?: MetalType;
  frameMaterial?: FrameMaterial;
  finish?: SurfaceFinish;
  texture?: string;  // 自由記述のテクスチャ説明
}

export interface DetailedAccessoryMaterials {
  bag?: MaterialDetails;
  sunglasses?: MaterialDetails;
  glasses?: MaterialDetails;
  accessories?: MaterialDetails;
}

export interface SceneConfig {
  background: BackgroundType;
  isSetup: boolean;
  focalLength: FocalLength;
  lightingPreset: LightingPreset;
  shotType: ShotType;
  outputPurpose?: OutputPurpose;
  customPrompt?: string;
}

export interface ItemAnalysis {
  description: string;
  fabric: string;
  fabricWeight?: string;       // "lightweight" | "medium-weight" | "heavy"
  style: string;
  silhouette?: string;         // "slim-fit" | "oversized" | "A-line" | "boxy" | "regular"
  fit?: string;                // "skinny" | "straight" | "relaxed" | "loose" | "tailored"
  colorHex?: string;
  colorDescription?: string;   // e.g. "Midnight Navy #232931"
  pattern?: string;            // "solid" | "striped" | "checked" | "graphic" | "floral"
  construction?: string;       // seam details, pocket types, hem finish
  hardware?: string;           // button, zipper, buckle materials
  neckline?: string;           // "crew" | "V-neck" | "collar" | "hood" | "turtleneck"
  sleeveLength?: string;       // "sleeveless" | "short" | "3/4" | "long"
}


export interface VisionAnalysis {
  tops?: ItemAnalysis;
  pants?: ItemAnalysis;
  outer?: ItemAnalysis;
  inner?: ItemAnalysis;
  shoes?: ItemAnalysis;
  bag?: ItemAnalysis;
  sunglasses?: ItemAnalysis;
  glasses?: ItemAnalysis;
  accessories?: ItemAnalysis;
  overallStyle: string;
  keywords: string[];
}

export type ClothingType = 'tops' | 'pants' | 'outer' | 'inner' | 'shoes' | 'bag' | 'sunglasses' | 'glasses' | 'accessories' | 'model';

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

// Refinement feature types
export type RefinementTarget = 'tops' | 'pants' | 'outer' | 'inner' | 'shoes' | 'bag' | 'sunglasses' | 'glasses' | 'accessories' | 'background' | 'lighting' | 'pose';
export type RefinementChangeType = 'color' | 'style' | 'material' | 'pattern' | 'custom';

export interface RefinementRequest {
  target: RefinementTarget;
  changeType: RefinementChangeType;
  value: string;
  description?: string; // For custom changes
}

export interface RefinementInterpretation {
  target: string;
  changeType: string;
  value: string;
  generatedPrompt: string;
  originalRequest: RefinementRequest; // Preserve original structured request
}
