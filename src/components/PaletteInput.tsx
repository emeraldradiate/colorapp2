import { useRef } from 'react';

const MAX_COLORS = 100;

interface PaletteInputProps {
  colors: string[];
  onChange: (colors: string[]) => void;
  ditheringStrength: number;
  onDitheringChange: (value: number) => void;
  onApply: () => void;
  isProcessing: boolean;
  disabled: boolean;
}

function isValidHex(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}

export function PaletteInput({
  colors,
  onChange,
  ditheringStrength,
  onDitheringChange,
  onApply,
  isProcessing,
  disabled,
}: PaletteInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDisabled = isProcessing || disabled;

  const addColor = () => {
    if (colors.length < MAX_COLORS) {
      onChange([...colors, '#000000']);
    }
  };

  const removeColor = (index: number) => {
    onChange(colors.filter((_, i) => i !== index));
  };

  const updateColor = (index: number, value: string) => {
    const updated = [...colors];
    updated[index] = value;
    onChange(updated);
  };

  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json: unknown = JSON.parse(ev.target?.result as string);
        let hexList: unknown[] = [];

        if (Array.isArray(json)) {
          hexList = json;
        } else if (json !== null && typeof json === 'object') {
          const obj = json as Record<string, unknown>;
          if (Array.isArray(obj.colors)) {
            hexList = obj.colors;
          } else if (Array.isArray(obj.palette)) {
            hexList = obj.palette;
          }
        }

        if (hexList.length === 0) {
          alert('Invalid JSON format. Expected an array of hex colors, or an object with a "colors" or "palette" key.');
          return;
        }

        const normalized = hexList
          .filter((h): h is string => typeof h === 'string')
          .map((h) => (h.startsWith('#') ? h : '#' + h))
          .filter(isValidHex);

        if (normalized.length === 0) {
          alert('No valid hex colors found in the JSON file.');
          return;
        }

        const combined = [...colors, ...normalized].slice(0, MAX_COLORS);
        onChange(combined);
      } catch {
        alert('Failed to parse JSON file. Please check the file format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const allValid = colors.length > 0 && colors.every(isValidHex);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-600">
        Add up to {MAX_COLORS} colors. The image will be remapped to only use these colors, using dithering to best match the original.
      </p>

      {/* Color list */}
      {colors.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {colors.map((color, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="color"
                value={isValidHex(color) ? color : '#000000'}
                onChange={(e) => updateColor(index, e.target.value)}
                className="w-9 h-9 rounded cursor-pointer border border-gray-300 p-0.5 bg-white flex-shrink-0"
                disabled={isDisabled}
                title="Pick color"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => updateColor(index, e.target.value)}
                maxLength={7}
                placeholder="#RRGGBB"
                spellCheck={false}
                className={`flex-1 min-w-0 px-2 py-1.5 rounded border text-sm font-mono ${
                  isValidHex(color) ? 'border-gray-300' : 'border-red-400 bg-red-50'
                }`}
                disabled={isDisabled}
              />
              <button
                onClick={() => removeColor(index)}
                className="text-gray-400 hover:text-red-500 transition-colors text-lg leading-none flex-shrink-0"
                disabled={isDisabled}
                title="Remove color"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Palette preview swatches */}
      {colors.some(isValidHex) && (
        <div className="flex flex-wrap gap-1.5">
          {colors.filter(isValidHex).map((color, i) => (
            <div
              key={i}
              className="w-8 h-8 rounded shadow-sm border border-gray-200"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      )}

      {/* Add, JSON, and Clear buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={addColor}
          disabled={isDisabled || colors.length >= MAX_COLORS}
          className="px-4 py-2 border-2 border-purple-300 text-purple-600 rounded-lg hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
        >
          + Add Color {colors.length > 0 ? `(${colors.length}/${MAX_COLORS})` : ''}
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isDisabled}
          className="px-4 py-2 border-2 border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
        >
          📂 Load JSON
        </button>

        {colors.length > 0 && (
          <button
            onClick={() => onChange([])}
            disabled={isDisabled}
            className="px-4 py-2 border-2 border-red-200 text-red-500 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
          >
            Clear All
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleJsonUpload}
        />
      </div>

      {/* Dithering Slider */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700 min-w-[140px]">
          Dithering Strength:
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={ditheringStrength}
          onChange={(e) => onDitheringChange(Number(e.target.value))}
          className="flex-1 max-w-xs accent-purple-600"
          disabled={isDisabled}
        />
        <span className="text-lg font-semibold text-purple-600 min-w-[3rem]">
          {Math.round(ditheringStrength * 100)}%
        </span>
      </div>

      {/* Apply button */}
      <div className="flex justify-end">
        <button
          onClick={onApply}
          disabled={isDisabled || !allValid}
          className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
        >
          {isProcessing ? 'Applying...' : 'Apply Palette'}
        </button>
      </div>

      {/* JSON format hint */}
      <p className="text-xs text-gray-400">
        JSON format: <code className="bg-gray-100 px-1 rounded">["#ff0000", "#00ff00"]</code> or an object with a{' '}
        <code className="bg-gray-100 px-1 rounded">colors</code> /{' '}
        <code className="bg-gray-100 px-1 rounded">palette</code> key.
      </p>
    </div>
  );
}
