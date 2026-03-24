import type { RGB, ColorWithFrequency } from './types';
import { KMeansCluster } from './kmeansCluster';

// Predefined color values for trending
const COLOR_DEFINITIONS: Record<string, RGB> = {
  red: { r: 239, g: 68, b: 68, a: 255 },
  orange: { r: 249, g: 115, b: 22, a: 255 },
  yellow: { r: 234, g: 179, b: 8, a: 255 },
  green: { r: 34, g: 197, b: 94, a: 255 },
  cyan: { r: 6, g: 182, b: 212, a: 255 },
  blue: { r: 59, g: 130, b: 246, a: 255 },
  purple: { r: 168, g: 85, b: 247, a: 255 },
  pink: { r: 236, g: 72, b: 153, a: 255 },
};

export class ImageProcessor {
  private quantizer: KMeansCluster;

  constructor() {
    this.quantizer = new KMeansCluster();
  }

  /**
   * Load image from File object
   * @param file - Image file to load
   * @returns Promise resolving to ImageData
   */
  async loadImage(file: File): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(imageData);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  /**
   * Reduce colors in image using K-means clustering
   * @param imageData - Original image data
   * @param colorCount - Target number of colors
   * @param ditheringStrength - Strength of dithering (0 = none, 1 = full). Default is 0.
   * @returns Object containing reduced image data and palette
   */
  reduceColors(
    imageData: ImageData,
    colorCount: number,
    ditheringStrength: number = 0
  ): { reducedImage: ImageData; palette: RGB[] } {
    const palette = this.quantizer.quantizeColors(imageData, colorCount);
    const reducedImage = this.quantizer.applyPalette(imageData, palette, ditheringStrength);
    return { reducedImage, palette };
  }

  /**
   * Get color frequency information from image
   * @param imageData - Image data to analyze
   * @returns Array of colors with their frequency counts
   */
  getColorFrequency(imageData: ImageData): ColorWithFrequency[] {
    const colorMap = new Map<string, ColorWithFrequency>();

    // Count color occurrences
    for (let i = 0; i < imageData.data.length; i += 4) {
      const color: RGB = {
        r: imageData.data[i],
        g: imageData.data[i + 1],
        b: imageData.data[i + 2],
        a: imageData.data[i + 3],
      };

      const key = `${color.r},${color.g},${color.b},${color.a}`;
      const existing = colorMap.get(key);

      if (existing) {
        existing.count++;
      } else {
        colorMap.set(key, { color, count: 1 });
      }
    }

    // Convert to array and sort by frequency
    return Array.from(colorMap.values()).sort((a, b) => b.count - a.count);
  }

  /**
   * Convert ImageData to data URL for display
   * @param imageData - Image data to convert
   * @returns Data URL string
   */
  imageDataToDataUrl(imageData: ImageData): string {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL();
  }

  /**
   * Convert RGB color to hex string
   * @param color - RGB color object
   * @returns Hex color string
   */
  rgbToHex(color: RGB): string {
    const toHex = (n: number) => {
      const hex = Math.round(n).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
  }

  /**
   * Convert RGB to grayscale value using luminance formula
   * @param color - RGB color object
   * @returns Grayscale value (0-255)
   */
  private rgbToGrayscale(color: RGB): number {
    return 0.299 * color.r + 0.587 * color.g + 0.114 * color.b;
  }

  /**
   * Convert RGB to HSL color space
   * @param rgb - RGB color object
   * @returns HSL values [h (0-360), s (0-1), l (0-1)]
   */
  private rgbToHsl(rgb: RGB): [number, number, number] {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;

    if (max === min) {
      return [0, 0, l]; // achromatic
    }

    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    let h = 0;
    if (max === r) {
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    } else if (max === g) {
      h = ((b - r) / d + 2) / 6;
    } else {
      h = ((r - g) / d + 4) / 6;
    }

    return [h * 360, s, l];
  }

  /**
   * Convert HSL to RGB color space
   * @param h - Hue (0-360)
   * @param s - Saturation (0-1)
   * @param l - Lightness (0-1)
   * @returns RGB color object
   */
  private hslToRgb(h: number, s: number, l: number): RGB {
    h = h / 360;

    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    if (s === 0) {
      const gray = Math.round(l * 255);
      return { r: gray, g: gray, b: gray, a: 255 };
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    const r = hue2rgb(p, q, h + 1/3);
    const g = hue2rgb(p, q, h);
    const b = hue2rgb(p, q, h - 1/3);

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
      a: 255,
    };
  }

  /**
   * Generate a random color with a specific grayscale/luminance value
   * @param targetGrayscale - Target grayscale value (0-255)
   * @param selectedColors - Array of color names to trend toward
   * @param cmykOnly - If true, restrict to CMYK-safe colors
   * @returns RGB color with matching grayscale value
   */
  private generateColorWithGrayscale(targetGrayscale: number, selectedColors: string[] = [], cmykOnly: boolean = false): RGB {
    // Determine the hue to use
    let finalHue: number;
    
    if (selectedColors.length === 0) {
      // If no colors selected, use completely random hue
      finalHue = Math.random() * 360;
    } else {
      // Get hues from selected colors
      const targetHues: number[] = [];
      for (const colorName of selectedColors) {
        const colorRgb = COLOR_DEFINITIONS[colorName];
        if (colorRgb) {
          const [h] = this.rgbToHsl(colorRgb);
          targetHues.push(h);
        }
      }

      if (targetHues.length === 0) {
        // Fallback: use random hue
        finalHue = Math.random() * 360;
      } else {
        // Pick a random hue from the target hues
        const targetHue = targetHues[Math.floor(Math.random() * targetHues.length)];
        
        // Add some variation to the hue (+/- 30 degrees)
        const hueVariation = (Math.random() - 0.5) * 60;
        finalHue = (targetHue + hueVariation + 360) % 360;
      }
    }

    // Generate color with varying saturation
    const maxAttempts = 100;
    for (let attempts = 0; attempts < maxAttempts; attempts++) {
      // Try different saturation levels
      // For CMYK-safe colors, limit saturation to avoid out-of-gamut colors
      const maxSaturation = cmykOnly ? 0.75 : 1.0;
      const minSaturation = cmykOnly ? 0.2 : 0.3;
      const saturation = minSaturation + Math.random() * (maxSaturation - minSaturation);
      
      // Calculate required lightness to match target grayscale
      // We'll try different lightness values and pick the best match
      for (let lightnessAttempt = 0; lightnessAttempt < 20; lightnessAttempt++) {
        const lightness = lightnessAttempt / 19; // 0 to 1
        
        // For CMYK-safe colors, avoid very dark or very bright extremes
        if (cmykOnly && (lightness < 0.15 || lightness > 0.9)) {
          continue;
        }
        
        const testColor = this.hslToRgb(finalHue, saturation, lightness);
        const grayscale = this.rgbToGrayscale(testColor);
        
        // Check if we're close enough to target grayscale
        if (Math.abs(grayscale - targetGrayscale) < 5) {
          return testColor;
        }
      }
    }

    // Fallback: return a color in the target hue family with approximate lightness
    const approximateLightness = targetGrayscale / 255;
    const fallbackSaturation = cmykOnly ? 0.5 : 0.6;
    return this.hslToRgb(finalHue, fallbackSaturation, approximateLightness);
  }

  /**
   * Swap colors in palette with random colors of matching grayscale values
   * @param palette - Original color palette
   * @param selectedColors - Array of color names to trend toward
   * @param cmykOnly - If true, restrict to CMYK-safe colors
   * @returns New palette with swapped colors
   */
  swapPaletteColors(palette: RGB[], selectedColors: string[] = [], cmykOnly: boolean = false): RGB[] {
    return palette.map((color) => {
      const grayscaleValue = this.rgbToGrayscale(color);
      return this.generateColorWithGrayscale(grayscaleValue, selectedColors, cmykOnly);
    });
  }

  /**
   * Replace colors in an already-reduced image with new palette colors
   * @param reducedImageData - Already reduced image data
   * @param oldPalette - Original palette used in the reduced image
   * @param newPalette - New palette to swap to
   * @returns New image with swapped colors
   */
  replaceImageColors(
    reducedImageData: ImageData,
    oldPalette: RGB[],
    newPalette: RGB[]
  ): ImageData {
    const newImageData = new ImageData(
      new Uint8ClampedArray(reducedImageData.data),
      reducedImageData.width,
      reducedImageData.height
    );

    // Create a color map for quick lookup
    const colorMap = new Map<string, RGB>();
    oldPalette.forEach((oldColor, index) => {
      const key = `${oldColor.r},${oldColor.g},${oldColor.b}`;
      colorMap.set(key, newPalette[index]);
    });

    // Replace each pixel's color
    for (let i = 0; i < newImageData.data.length; i += 4) {
      const key = `${newImageData.data[i]},${newImageData.data[i + 1]},${newImageData.data[i + 2]}`;
      const newColor = colorMap.get(key);
      
      if (newColor) {
        newImageData.data[i] = newColor.r;
        newImageData.data[i + 1] = newColor.g;
        newImageData.data[i + 2] = newColor.b;
      }
    }

    return newImageData;
  }

  /**
   * Apply a new palette to an existing reduced image
   * @param originalImageData - Original unreduced image data
   * @param newPalette - New palette to apply
   * @param ditheringStrength - Strength of dithering (0 = none, 1 = full). Default is 0.
   * @returns New image with swapped colors
   */
  swapImageColors(
    originalImageData: ImageData,
    newPalette: RGB[],
    ditheringStrength: number = 0
  ): ImageData {
    return this.quantizer.applyPalette(originalImageData, newPalette, ditheringStrength);
  }
}
