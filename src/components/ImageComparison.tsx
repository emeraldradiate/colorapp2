import { useState, useEffect } from 'react';
import type { ImageProcessor } from '../utils/imageProcessor';

interface ImageComparisonProps {
  originalUrl: string | null;
  reducedUrl: string | null;
  originalColorCount?: number;
  reducedColorCount?: number;
  brightnessAdjustment?: number;
  onBrightnessChange?: (value: number) => void;
  mode?: 'reduce' | 'swap' | 'palette';
  originalImageData?: ImageData | null;
  imageProcessor?: ImageProcessor;
  isProcessing?: boolean;
}

export function ImageComparison({ 
  originalUrl, 
  reducedUrl, 
  originalColorCount, 
  reducedColorCount,
  brightnessAdjustment = 0,
  onBrightnessChange,
  mode = 'reduce',
  originalImageData,
  imageProcessor,
  isProcessing = false
}: ImageComparisonProps) {
  const [adjustedPreviewUrl, setAdjustedPreviewUrl] = useState<string | null>(null);

  // Generate brightness-adjusted preview when brightness changes
  useEffect(() => {
    if (mode === 'palette' && originalImageData && imageProcessor && brightnessAdjustment !== 0) {
      try {
        const adjusted = imageProcessor.adjustBrightness(originalImageData, brightnessAdjustment);
        const url = imageProcessor.imageDataToDataUrl(adjusted);
        setAdjustedPreviewUrl(url);
      } catch (error) {
        console.error('Error generating brightness preview:', error);
        setAdjustedPreviewUrl(null);
      }
    } else {
      setAdjustedPreviewUrl(null);
    }
  }, [brightnessAdjustment, originalImageData, imageProcessor, mode]);

  if (!originalUrl) return null;

  const showBrightnessSlider = mode === 'palette' && onBrightnessChange;

  return (
    <div className="mt-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-3 text-gray-800">
            Original Image{originalColorCount ? ` (${originalColorCount.toLocaleString()} colors)` : ''}
            {showBrightnessSlider && brightnessAdjustment !== 0 && (
              <span className="text-purple-600 text-sm ml-2">
                (Brightness: {brightnessAdjustment > 0 ? '+' : ''}{brightnessAdjustment})
              </span>
            )}
          </h3>
          <div className="border border-gray-200 rounded-lg overflow-hidden shadow-md bg-checkerboard">
            <img
              src={adjustedPreviewUrl || originalUrl}
              alt="Original"
              className="w-full h-auto"
            />
          </div>
        </div>

        {reducedUrl && (
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-800">
              New Image{reducedColorCount ? ` (${reducedColorCount} colors)` : ''}
            </h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden shadow-md bg-checkerboard">
              <img
                src={reducedUrl}
                alt="Reduced"
                className="w-full h-auto"
              />
            </div>
          </div>
        )}
      </div>

      {/* Brightness Slider - shown below images in palette mode */}
      {showBrightnessSlider && (
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700 min-w-[140px]">
              Adjust Brightness:
            </label>
            <input
              type="range"
              min="-100"
              max="100"
              value={brightnessAdjustment}
              onChange={(e) => onBrightnessChange(Number(e.target.value))}
              className="flex-1 max-w-md accent-purple-600"
              disabled={isProcessing}
            />
            <span className="text-lg font-semibold text-purple-600 min-w-[4rem]">
              {brightnessAdjustment > 0 ? '+' : ''}{brightnessAdjustment}
            </span>
            {brightnessAdjustment !== 0 && (
              <button
                onClick={() => onBrightnessChange(0)}
                className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
                disabled={isProcessing}
              >
                Reset
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2 ml-[140px]">
            Adjust the brightness to change how colors are mapped from the original image to your palette
          </p>
        </div>
      )}
    </div>
  );
}
