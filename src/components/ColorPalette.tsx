import type { RGB } from '../utils/types';
import { ImageProcessor } from '../utils/imageProcessor';

interface ColorPaletteProps {
  palette: RGB[];
  lockedColors?: Set<number>;
  onToggleLock?: (index: number) => void;
}

const imageProcessor = new ImageProcessor();

export function ColorPalette({ palette, lockedColors, onToggleLock }: ColorPaletteProps) {
  if (!palette || palette.length === 0) return null;

  const handleColorClick = (index: number) => {
    if (onToggleLock) {
      onToggleLock(index);
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      {palette.map((color, index) => {
        const isLocked = lockedColors?.has(index) ?? false;
        const isClickable = onToggleLock !== undefined;

        return (
          <div key={index} className="flex flex-col items-center">
            <div
              className={`w-16 h-16 rounded-lg shadow-md border-2 transition-all relative ${
                isClickable ? 'cursor-pointer hover:scale-110' : ''
              } ${
                isLocked ? 'border-purple-600 ring-2 ring-purple-400' : 'border-gray-200'
              }`}
              style={{
                backgroundColor: imageProcessor.rgbToHex(color),
              }}
              title={`${imageProcessor.rgbToHex(color)}${isClickable ? (isLocked ? ' (Locked - Click to unlock)' : ' (Click to lock)') : ''}`}
              onClick={() => handleColorClick(index)}
            >
              {isLocked && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl drop-shadow-md">🔒</span>
                </div>
              )}
            </div>
            <span className="text-xs mt-1 font-mono text-gray-600">
              {imageProcessor.rgbToHex(color)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
