
import React from 'react';
import {
  ShotType,
  DetailedGarmentMeasurements,
  ClothingType,
  LightingConfig,
  MannequinConfig,
  SceneConfig,
  GenerationState,
  PoseType,
  EditorialStyle,
  FocalLength,
  LightingPreset
} from '../types';
import { UploadSlot } from './UploadSlot';
import { OptionGrid } from './OptionGrid';
import { SectionHeader } from './SectionHeader';

interface ControlPanelProps {
  onImageUpload: (type: ClothingType, file: File) => void;
  lighting: LightingConfig;
  setLighting: (config: LightingConfig) => void;
  mannequin: MannequinConfig;
  setMannequin: (config: MannequinConfig) => void;
  scene: SceneConfig;
  setScene: (config: SceneConfig) => void;
  onGenerate: () => void;
  genState: GenerationState;
  uploadedImages: Record<ClothingType, string | null>;
  garmentMeasurements: DetailedGarmentMeasurements;
  setGarmentMeasurements: (config: DetailedGarmentMeasurements) => void;
}

export default function ControlPanel({
  onImageUpload,
  lighting: _lighting,
  setLighting: _setLighting,
  mannequin,
  setMannequin,
  scene,
  setScene,
  onGenerate,
  genState,
  uploadedImages,
  garmentMeasurements,
  setGarmentMeasurements
}: ControlPanelProps) {
  const [activeTab, setActiveTab] = React.useState<'tops' | 'pants' | 'outer'>('tops');
  const isProcessing = genState.status === 'analyzing' || genState.status === 'generating';
  const hasAtLeastOneImage = Object.values(uploadedImages).some(img => img !== null);

  const poses: PoseType[] = ['standing', 'walking', 'sitting', 'leaning', 'running', 'crossed_arms', 'hands_in_pockets', 'jumping', 'squatting', 'hero'];
  const editorialStyles: EditorialStyle[] = ['vogue', 'elle', 'collection', 'japanese_magazine'];
  const focalLengths: FocalLength[] = ['25mm', '50mm', '80mm'];
  const lightingPresets: LightingPreset[] = ['studio', 'golden_hour', 'neon', 'cinematic', 'high_key'];

  return (
    <div className="flex flex-col h-full bg-studio-800 p-5 overflow-y-auto border-r border-studio-700 custom-scrollbar">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-light tracking-widest text-white">
          LUMINA <span className="text-studio-600 font-bold">STUDIO</span>
        </h1>
        <div className="flex items-center space-x-2">
          <span className="text-[9px] text-gray-500 uppercase font-bold">Setup Mode</span>
          <button
            onClick={() => setScene({ ...scene, isSetup: !scene.isSetup })}
            className={`w-10 h-5 rounded-full relative transition-colors ${scene.isSetup ? 'bg-studio-accent' : 'bg-studio-700'}`}
          >
            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${scene.isSetup ? 'left-6' : 'left-1'}`} />
          </button>
        </div>
      </div>

      <section className="mb-8">
        <SectionHeader title="Outfit Selection" number="01" />
        <div className="grid grid-cols-3 gap-2">
          <UploadSlot
            label="Tops"
            image={uploadedImages.tops}
            onUpload={(file) => onImageUpload('tops', file)}
          />
          <UploadSlot
            label="Bottoms"
            image={uploadedImages.pants}
            onUpload={(file) => onImageUpload('pants', file)}
          />
          <UploadSlot
            label="Outer"
            image={uploadedImages.outer}
            onUpload={(file) => onImageUpload('outer', file)}
          />
          <UploadSlot
            label="Inner"
            image={uploadedImages.inner}
            onUpload={(file) => onImageUpload('inner', file)}
          />
          <UploadSlot
            label="Shoes"
            image={uploadedImages.shoes}
            onUpload={(file) => onImageUpload('shoes', file)}
          />
        </div>
      </section>

      <section className="mb-8">
        <SectionHeader title="Style & Lighting" number="02" />
        <div className="space-y-4">
          <OptionGrid
            label="Editorial Style"
            options={editorialStyles}
            current={mannequin.editorialStyle}
            onChange={(v) => setMannequin({ ...mannequin, editorialStyle: v })}
            cols={2}
          />
          <OptionGrid
            label="Lighting Preset"
            options={lightingPresets}
            current={scene.lightingPreset}
            onChange={(v) => setScene({ ...scene, lightingPreset: v })}
            cols={2}
          />
        </div>
      </section>

      <section className="mb-8">
        <SectionHeader title="Camera & Lens" number="03" />
        <div className="space-y-4">
          <OptionGrid
            label="Shot Type"
            options={['full_body', 'upper_body', 'lower_body'] as ShotType[]}
            current={scene.shotType}
            onChange={(v) => setScene({ ...scene, shotType: v })}
            cols={3}
          />
          <OptionGrid
            label="Lens (Focal Length)"
            options={focalLengths}
            current={scene.focalLength}
            onChange={(v) => setScene({ ...scene, focalLength: v })}
            cols={3}
          />
          <div className="mt-4">
            <label className="text-[10px] text-gray-500 uppercase font-medium mb-2 block flex justify-between">
              <span>Model Rotation</span>
              <span className="text-studio-accent">{((mannequin.rotation * 180) / Math.PI).toFixed(0)}°</span>
            </label>
            <input
              type="range" min={-Math.PI} max={Math.PI} step="0.1"
              value={mannequin.rotation}
              onChange={(e) => setMannequin({ ...mannequin, rotation: parseFloat(e.target.value) })}
              className="w-full h-1 bg-studio-700 rounded-lg appearance-none cursor-pointer accent-studio-accent"
            />
          </div>
        </div>
      </section>

      <section className="mb-8">
        <SectionHeader title="Pose & Character" number="04" />
        <div className="space-y-4">
          <OptionGrid
            label="Pose"
            current={mannequin.pose}
            onChange={(val) => setMannequin({ ...mannequin, pose: val as any })}
            options={poses}
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-500 block mb-2">Height (cm)</label>
              <input
                type="number"
                value={mannequin.height || ''}
                onChange={(e) => setMannequin({ ...mannequin, height: Number(e.target.value) })}
                placeholder="175"
                className="w-full bg-studio-900 border border-studio-700 rounded px-2 py-1 text-xs text-white focus:border-studio-accent outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-500 block mb-2">Weight/Size</label>
              <input
                type="text"
                value={mannequin.weight || ''}
                onChange={(e) => setMannequin({ ...mannequin, weight: e.target.value })}
                placeholder="55kg"
                className="w-full bg-studio-900 border border-studio-700 rounded px-2 py-1 text-xs text-white focus:border-studio-accent outline-none"
              />
            </div>
          </div>

          <OptionGrid
            label="Gender"
            current={mannequin.gender}
            onChange={(val) => setMannequin({ ...mannequin, gender: val as any })}
            options={['female', 'male']}
          />

          <OptionGrid
            label="Ethnicity"
            current={mannequin.ethnicity}
            onChange={(val) => setMannequin({ ...mannequin, ethnicity: val as any })}
            options={['asian', 'western', 'black']}
            cols={3}
          />

          <OptionGrid
            label="Age Group"
            current={mannequin.ageGroup}
            onChange={(val) => setMannequin({ ...mannequin, ageGroup: val as any })}
            options={['youthful', 'mature', 'sophisticated']}
            cols={3}
          />

          <OptionGrid
            label="Body Type"
            current={mannequin.bodyType}
            onChange={(val) => setMannequin({ ...mannequin, bodyType: val as any })}
            options={['slim', 'athletic', 'curvy', 'plus']}
            cols={2}
          />

          <OptionGrid
            label="Vibe"
            current={mannequin.vibe}
            onChange={(val) => setMannequin({ ...mannequin, vibe: val as any })}
            options={['minimalist', 'edgy', 'casual', 'elegant']}
            cols={2}
          />

          <UploadSlot
            label="Custom Model (Optional)"
            image={uploadedImages.model}
            onUpload={(file) => onImageUpload('model', file)}
          />
        </div>

        <SectionHeader title="Garment Specs (cm)" number="05" />

        <div className="flex space-x-1 mb-4 bg-studio-900 p-1 rounded-lg">
          {(['tops', 'pants', 'outer'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1.5 text-[10px] uppercase font-bold rounded transition-colors ${activeTab === tab
                ? 'bg-studio-accent text-white shadow-lg'
                : 'text-gray-500 hover:text-white hover:bg-studio-800'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="min-h-[140px]">
          {activeTab === 'tops' && (
            <div className="grid grid-cols-2 gap-4 animate-fadeIn">
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Shoulder Width</label>
                <input
                  type="number"
                  value={garmentMeasurements.tops?.shoulderWidth || ''}
                  onChange={(e) => setGarmentMeasurements({
                    ...garmentMeasurements,
                    tops: { ...garmentMeasurements.tops, shoulderWidth: Number(e.target.value) }
                  })}
                  placeholder="40"
                  className="w-full bg-studio-900 border border-studio-700 rounded px-2 py-1 text-xs text-white focus:border-studio-accent outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Body Width (Chest)</label>
                <input
                  type="number"
                  value={garmentMeasurements.tops?.chestWidth || ''}
                  onChange={(e) => setGarmentMeasurements({
                    ...garmentMeasurements,
                    tops: { ...garmentMeasurements.tops, chestWidth: Number(e.target.value) }
                  })}
                  placeholder="50"
                  className="w-full bg-studio-900 border border-studio-700 rounded px-2 py-1 text-xs text-white focus:border-studio-accent outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Length</label>
                <input
                  type="number"
                  value={garmentMeasurements.tops?.length || ''}
                  onChange={(e) => setGarmentMeasurements({
                    ...garmentMeasurements,
                    tops: { ...garmentMeasurements.tops, length: Number(e.target.value) }
                  })}
                  placeholder="65"
                  className="w-full bg-studio-900 border border-studio-700 rounded px-2 py-1 text-xs text-white focus:border-studio-accent outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Sleeve Length</label>
                <input
                  type="number"
                  value={garmentMeasurements.tops?.sleeveLength || ''}
                  onChange={(e) => setGarmentMeasurements({
                    ...garmentMeasurements,
                    tops: { ...garmentMeasurements.tops, sleeveLength: Number(e.target.value) }
                  })}
                  placeholder="60"
                  className="w-full bg-studio-900 border border-studio-700 rounded px-2 py-1 text-xs text-white focus:border-studio-accent outline-none transition-colors"
                />
              </div>
            </div>
          )}

          {activeTab === 'pants' && (
            <div className="grid grid-cols-2 gap-4 animate-fadeIn">
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Waist</label>
                <input
                  type="number"
                  value={garmentMeasurements.pants?.waist || ''}
                  onChange={(e) => setGarmentMeasurements({
                    ...garmentMeasurements,
                    pants: { ...garmentMeasurements.pants, waist: Number(e.target.value) }
                  })}
                  placeholder="76"
                  className="w-full bg-studio-900 border border-studio-700 rounded px-2 py-1 text-xs text-white focus:border-studio-accent outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Hip</label>
                <input
                  type="number"
                  value={garmentMeasurements.pants?.hip || ''}
                  onChange={(e) => setGarmentMeasurements({
                    ...garmentMeasurements,
                    pants: { ...garmentMeasurements.pants, hip: Number(e.target.value) }
                  })}
                  placeholder="90"
                  className="w-full bg-studio-900 border border-studio-700 rounded px-2 py-1 text-xs text-white focus:border-studio-accent outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Total Length</label>
                <input
                  type="number"
                  value={garmentMeasurements.pants?.length || ''}
                  onChange={(e) => setGarmentMeasurements({
                    ...garmentMeasurements,
                    pants: { ...garmentMeasurements.pants, length: Number(e.target.value) }
                  })}
                  placeholder="100"
                  className="w-full bg-studio-900 border border-studio-700 rounded px-2 py-1 text-xs text-white focus:border-studio-accent outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Inseam</label>
                <input
                  type="number"
                  value={garmentMeasurements.pants?.inseam || ''}
                  onChange={(e) => setGarmentMeasurements({
                    ...garmentMeasurements,
                    pants: { ...garmentMeasurements.pants, inseam: Number(e.target.value) }
                  })}
                  placeholder="75"
                  className="w-full bg-studio-900 border border-studio-700 rounded px-2 py-1 text-xs text-white focus:border-studio-accent outline-none transition-colors"
                />
              </div>
            </div>
          )}

          {activeTab === 'outer' && (
            <div className="grid grid-cols-2 gap-4 animate-fadeIn">
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Shoulder Width</label>
                <input
                  type="number"
                  value={garmentMeasurements.outer?.shoulderWidth || ''}
                  onChange={(e) => setGarmentMeasurements({
                    ...garmentMeasurements,
                    outer: { ...garmentMeasurements.outer, shoulderWidth: Number(e.target.value) }
                  })}
                  placeholder="45"
                  className="w-full bg-studio-900 border border-studio-700 rounded px-2 py-1 text-xs text-white focus:border-studio-accent outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Body Width (Chest)</label>
                <input
                  type="number"
                  value={garmentMeasurements.outer?.chestWidth || ''}
                  onChange={(e) => setGarmentMeasurements({
                    ...garmentMeasurements,
                    outer: { ...garmentMeasurements.outer, chestWidth: Number(e.target.value) }
                  })}
                  placeholder="55"
                  className="w-full bg-studio-900 border border-studio-700 rounded px-2 py-1 text-xs text-white focus:border-studio-accent outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Length</label>
                <input
                  type="number"
                  value={garmentMeasurements.outer?.length || ''}
                  onChange={(e) => setGarmentMeasurements({
                    ...garmentMeasurements,
                    outer: { ...garmentMeasurements.outer, length: Number(e.target.value) }
                  })}
                  placeholder="80"
                  className="w-full bg-studio-900 border border-studio-700 rounded px-2 py-1 text-xs text-white focus:border-studio-accent outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Sleeve Length</label>
                <input
                  type="number"
                  value={garmentMeasurements.outer?.sleeveLength || ''}
                  onChange={(e) => setGarmentMeasurements({
                    ...garmentMeasurements,
                    outer: { ...garmentMeasurements.outer, sleeveLength: Number(e.target.value) }
                  })}
                  placeholder="62"
                  className="w-full bg-studio-900 border border-studio-700 rounded px-2 py-1 text-xs text-white focus:border-studio-accent outline-none transition-colors"
                />
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="mt-auto pt-4">
        {genState.error && (
          <div className="mb-4 text-[10px] text-red-400 bg-red-900/10 p-2 rounded border border-red-900/30">
            {genState.error}
          </div>
        )}

        <button
          onClick={onGenerate}
          disabled={!hasAtLeastOneImage || isProcessing}
          className={`w-full py-4 rounded font-bold uppercase tracking-widest text-xs transition-all ${!hasAtLeastOneImage || isProcessing
            ? 'bg-studio-700 text-gray-500 cursor-not-allowed'
            : 'bg-white text-black hover:bg-studio-accent hover:text-white shadow-xl hover:shadow-studio-accent/20'
            }`}
        >
          {genState.status === 'analyzing' ? 'Analyzing Pieces...' :
            genState.status === 'generating' ? 'Rendering Shot...' :
              'Generate Professional Shot'}
        </button>
      </div>
    </div>
  );
};
