import { useState } from 'react';
import { ImageProcessor } from './utils/imageProcessor';
import type { RGB } from './utils/types';
import { ImageUpload } from './components/ImageUpload';
import { ImageComparison } from './components/ImageComparison';
import { ColorPalette } from './components/ColorPalette';

const imageProcessor = new ImageProcessor();

function App() {
  const [originalImageData, setOriginalImageData] = useState<ImageData | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [reducedImageData, setReducedImageData] = useState<ImageData | null>(null);
  const [reducedImageUrl, setReducedImageUrl] = useState<string | null>(null);
  const [palette, setPalette] = useState<RGB[]>([]);
  const [originalPalette, setOriginalPalette] = useState<RGB[]>([]);
  const [colorCount, setColorCount] = useState<number>(16);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [ditheringStrength, setDitheringStrength] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [originalColorCount, setOriginalColorCount] = useState<number>(0);
  const [cmykOnly, setCmykOnly] = useState<boolean>(false);
  const [lockedColors, setLockedColors] = useState<Set<number>>(new Set());

  const handleImageSelect = async (file: File) => {
    try {
      setIsProcessing(true);
      const imageData = await imageProcessor.loadImage(file);
      setOriginalImageData(imageData);
      
      const url = imageProcessor.imageDataToDataUrl(imageData);
      setOriginalImageUrl(url);
      
      // Get original color count
      const colorFreq = imageProcessor.getColorFrequency(imageData);
      setOriginalColorCount(colorFreq.length);
      
      // Reset reduced image
      setReducedImageData(null);
      setReducedImageUrl(null);
      setPalette([]);
      setOriginalPalette([]);
      setLockedColors(new Set());
    } catch (error) {
      console.error('Error loading image:', error);
      alert('Failed to load image. Please try another file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReduceColors = () => {
    if (!originalImageData) return;

    try {
      setIsProcessing(true);
      const { reducedImage, palette: newPalette } = imageProcessor.reduceColors(
        originalImageData,
        colorCount,
        ditheringStrength
      );

      setReducedImageData(reducedImage);
      const url = imageProcessor.imageDataToDataUrl(reducedImage);
      setReducedImageUrl(url);
      setPalette(newPalette);
      setLockedColors(new Set()); // Clear locks when reducing colors
      setOriginalPalette(newPalette);
    } catch (error) {
      console.error('Error reducing colors:', error);
      alert('Failed to reduce colors. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!reducedImageUrl) return;

    const link = document.createElement('a');
    link.href = reducedImageUrl;
    link.download = `reduced-${colorCount}-colors.png`;
    link.click();
  };

  const handleCopyToClipboard = async () => {
    if (!reducedImageUrl) return;

    try {
      const response = await fetch(reducedImageUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      // Optional: Show a success message
      alert('Image copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy image:', err);
      alert('Failed to copy image to clipboard');
    }
  };

  const handleSwapColors = () => {
    if (!reducedImageData || originalPalette.length === 0) return;

    try {
      setIsProcessing(true);
      // Generate new palette with swapped colors using selected colors
      // Always swap from the ORIGINAL palette, not the current one
      const newPalette = imageProcessor.swapPaletteColors(originalPalette, selectedColors, cmykOnly);
      
      // Preserve locked colors from the current palette
      const finalPalette = newPalette.map((color, index) => {
        if (lockedColors.has(index)) {
          // Keep the locked color from the current palette
          return palette.length > 0 ? palette[index] : color;
        }
        return color;
      });

      // Replace colors in the already-reduced image (no re-reducing!)
      // Map from ORIGINAL palette to new palette
      const swappedImage = imageProcessor.replaceImageColors(
        reducedImageData,
        originalPalette,
        finalPalette
      );

      const url = imageProcessor.imageDataToDataUrl(swappedImage);
      setReducedImageUrl(url);
      setPalette(finalPalette);
    } catch (error) {
      console.error('Error swapping colors:', error);
      alert('Failed to swap colors. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const toggleColorSelection = (color: string) => {
    setSelectedColors((prev) => {
      if (prev.includes(color)) {
        // Deselect the color
        return prev.filter((c) => c !== color);
      } else if (prev.length < 3) {
        // Select the color (max 3)
        return [...prev, color];
      }
      // Already have 3 colors selected, do nothing
      return prev;
    });
  };

  const toggleColorLock = (index: number) => {
    setLockedColors((prev) => {
      const newLocked = new Set(prev);
      if (newLocked.has(index)) {
        newLocked.delete(index);
      } else {
        newLocked.add(index);
      }
      return newLocked;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-100">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Color Reducer
          </h1>
          <p className="text-lg text-gray-600">
            Reduce image colors using K-means clustering algorithm
          </p>
        </div>

        {/* Upload Section */}
        {!originalImageUrl && (
          <div className="max-w-2xl mx-auto">
            <ImageUpload onImageSelect={handleImageSelect} />
          </div>
        )}

        {/* Controls and Results */}
        {originalImageUrl && (
          <div>
            {/* Control Panel */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <div className="flex flex-col gap-4">
                {/* Color Count Slider */}
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-gray-700 min-w-[140px]">
                    Number of Colors:
                  </label>
                  <input
                    type="range"
                    min="2"
                    max="64"
                    value={colorCount}
                    onChange={(e) => setColorCount(Number(e.target.value))}
                    className="flex-1 max-w-xs accent-purple-600"
                    disabled={isProcessing}
                  />
                  <span className="text-lg font-semibold text-purple-600 min-w-[3rem]">
                    {colorCount}
                  </span>
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
                    onChange={(e) => setDitheringStrength(Number(e.target.value))}
                    className="flex-1 max-w-xs accent-purple-600"
                    disabled={isProcessing}
                  />
                  <span className="text-lg font-semibold text-purple-600 min-w-[3rem]">
                    {Math.round(ditheringStrength * 100)}%
                  </span>
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-3 mt-2">
                  <button
                    onClick={handleReduceColors}
                    disabled={isProcessing}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
                  >
                    {isProcessing ? 'Processing...' : 'Reduce'}
                  </button>

                  {reducedImageUrl && (
                    <>
                      <button
                        onClick={handleDownload}
                        title="Download"
                        className="px-4 py-2 bg-white text-gray-700 border-2 border-gray-300 rounded-lg hover:border-purple-400 hover:text-purple-600 transition-colors font-medium shadow-sm text-xl"
                      >
                        ⬇️
                      </button>
                      
                      <button
                        onClick={handleCopyToClipboard}
                        title="Copy to Clipboard"
                        className="px-4 py-2 bg-white text-gray-700 border-2 border-gray-300 rounded-lg hover:border-purple-400 hover:text-purple-600 transition-colors font-medium shadow-sm text-xl"
                      >
                        📋
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => {
                      setOriginalImageData(null);
                      setOriginalImageUrl(null);
                      setReducedImageData(null);
                      setReducedImageUrl(null);
                      setPalette([]);
                      setOriginalPalette([]);
                      setOriginalColorCount(0);
                    }}
                    title="New Image"
                    className="px-4 py-2 bg-white text-gray-700 border-2 border-gray-300 rounded-lg hover:border-purple-400 hover:text-purple-600 transition-colors font-medium shadow-sm text-xl"
                  >
                    🔄
                  </button>
                </div>
              </div>

            </div>

            {/* Image Comparison */}
            <ImageComparison
              originalUrl={originalImageUrl}
              reducedUrl={reducedImageUrl}
              originalColorCount={originalColorCount}
              reducedColorCount={palette.length}
            />

            {/* Swap Colors Section */}
            {reducedImageUrl && (
              <div className="bg-white rounded-lg shadow-md p-6 mt-8">
                <h3 className="text-lg font-semibold mb-4 text-gray-800 text-center">
                  Select Color Trends (up to 3)
                </h3>
                <div className="flex flex-wrap justify-center gap-3 mb-6">
                  {[
                    { name: 'red', rgb: 'rgb(239, 68, 68)', emoji: '🔴' },
                    { name: 'orange', rgb: 'rgb(249, 115, 22)', emoji: '🟠' },
                    { name: 'yellow', rgb: 'rgb(234, 179, 8)', emoji: '🟡' },
                    { name: 'green', rgb: 'rgb(34, 197, 94)', emoji: '🟢' },
                    { name: 'cyan', rgb: 'rgb(6, 182, 212)', emoji: '🔵' },
                    { name: 'blue', rgb: 'rgb(59, 130, 246)', emoji: '🔵' },
                    { name: 'purple', rgb: 'rgb(168, 85, 247)', emoji: '🟣' },
                    { name: 'pink', rgb: 'rgb(236, 72, 153)', emoji: '🩷' },
                  ].map((color) => (
                    <button
                      key={color.name}
                      onClick={() => toggleColorSelection(color.name)}
                      disabled={isProcessing || (!selectedColors.includes(color.name) && selectedColors.length >= 3)}
                      className={`
                        px-4 py-2 rounded-lg font-medium transition-all shadow-sm
                        ${selectedColors.includes(color.name)
                          ? 'ring-2 ring-offset-2 ring-purple-600 scale-110'
                          : 'hover:scale-105'
                        }
                        ${!selectedColors.includes(color.name) && selectedColors.length >= 3
                          ? 'opacity-50 cursor-not-allowed'
                          : 'cursor-pointer'
                        }
                      `}
                      style={{
                        backgroundColor: selectedColors.includes(color.name) ? color.rgb : 'white',
                        border: `2px solid ${color.rgb}`,
                        color: selectedColors.includes(color.name) ? 'white' : color.rgb,
                      }}
                      title={color.name}
                    >
                      <span className="text-lg mr-1">{color.emoji}</span>
                      {color.name.charAt(0).toUpperCase() + color.name.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    id="cmyk-only"
                    checked={cmykOnly}
                    onChange={(e) => setCmykOnly(e.target.checked)}
                    className="w-4 h-4 accent-purple-600 cursor-pointer"
                    disabled={isProcessing}
                  />
                  <label htmlFor="cmyk-only" className="text-sm font-medium text-gray-700 cursor-pointer">
                    🖨️ CMYK-Safe Colors Only (for printing)
                  </label>
                </div>
                <button
                  onClick={handleSwapColors}
                  disabled={isProcessing}
                  className="w-full px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium shadow-md text-lg"
                >
                  {isProcessing ? 'Swapping...' : `🎨 Swap Colors${selectedColors.length > 0 ? ` (${selectedColors.length} trend${selectedColors.length > 1 ? 's' : ''})` : ' (Random)'}`}
                </button>
              </div>
            )}

            {/* Color Palettes */}
            {originalPalette.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6 mt-8">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">Color Palette</h3>
                <p className="text-sm text-gray-600 mb-3">Click a color to lock/unlock it during swaps</p>
                <ColorPalette 
                  palette={originalPalette} 
                  lockedColors={lockedColors}
                  onToggleLock={toggleColorLock}
                />
              </div>
            )}

            {palette.length > 0 && JSON.stringify(palette) !== JSON.stringify(originalPalette) && (
              <div className="bg-white rounded-lg shadow-md p-6 mt-4">
                <h3 className="text-xl font-semibold mb-4 text-purple-600">Swapped Palette</h3>
                <p className="text-sm text-gray-600 mb-3">Click a color to lock/unlock it during swaps</p>
                <ColorPalette 
                  palette={palette} 
                  lockedColors={lockedColors}
                  onToggleLock={toggleColorLock}
                />
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-16 text-center text-gray-500 text-sm">
          <p>
            Using K-means clustering to intelligently reduce color palettes
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
