import type { RGB } from './types';

export class KMeansCluster {
  /**
   * Quantize colors in image data using K-means clustering
   * @param imageData - Canvas ImageData containing pixel information
   * @param targetColorCount - Number of colors to reduce to
   * @param maxIterations - Maximum iterations for K-means algorithm
   * @returns Array of RGB colors representing the palette
   */
  quantizeColors(
    imageData: ImageData,
    targetColorCount: number,
    maxIterations: number = 20
  ): RGB[] {
    // Sample pixels from the image
    const pixels = this.samplePixels(imageData, 10000);

    // Initialize centroids using k-means++
    let centroids = this.initializeCentroids(pixels, targetColorCount);

    // Run k-means iterations
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      const clusters = this.assignPixelsToClusters(pixels, centroids);
      const newCentroids = this.calculateNewCentroids(clusters);

      if (this.centroidsConverged(centroids, newCentroids)) {
        break;
      }

      centroids = newCentroids;
    }

    return centroids;
  }

  /**
   * Apply the generated palette to the entire image
   * @param imageData - Original image data
   * @param palette - Color palette to apply
   * @param ditheringStrength - Strength of dithering (0 = none, 1 = full). Default is 0.
   * @returns New ImageData with reduced colors
   */
  applyPalette(imageData: ImageData, palette: RGB[], ditheringStrength: number = 0): ImageData {
    if (ditheringStrength > 0) {
      return this.applyPaletteWithDithering(imageData, palette, ditheringStrength);
    }

    const newImageData = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    );

    // Map each pixel to nearest palette color
    for (let i = 0; i < newImageData.data.length; i += 4) {
      const alpha = newImageData.data[i + 3];
      if (alpha < 128) {
        // Snap to fully transparent
        newImageData.data[i] = 0;
        newImageData.data[i + 1] = 0;
        newImageData.data[i + 2] = 0;
        newImageData.data[i + 3] = 0;
        continue;
      }

      const pixel: RGB = {
        r: newImageData.data[i],
        g: newImageData.data[i + 1],
        b: newImageData.data[i + 2],
        a: 255,
      };

      const nearestColor = this.findNearestColor(pixel, palette);
      newImageData.data[i] = nearestColor.r;
      newImageData.data[i + 1] = nearestColor.g;
      newImageData.data[i + 2] = nearestColor.b;
      newImageData.data[i + 3] = 255; // fully opaque
    }

    return newImageData;
  }

  /**
   * Apply palette with Floyd-Steinberg dithering
   * @param imageData - Original image data
   * @param palette - Color palette to apply
   * @param strength - Dithering strength (0 to 1)
   * @returns New ImageData with dithered colors
   */
  private applyPaletteWithDithering(
    imageData: ImageData,
    palette: RGB[],
    strength: number
  ): ImageData {
    const width = imageData.width;
    const height = imageData.height;
    const newImageData = new ImageData(
      new Uint8ClampedArray(imageData.data),
      width,
      height
    );

    // Process pixels left to right, top to bottom
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;

        const alpha = newImageData.data[index + 3];
        if (alpha < 128) {
          // Snap to fully transparent
          newImageData.data[index] = 0;
          newImageData.data[index + 1] = 0;
          newImageData.data[index + 2] = 0;
          newImageData.data[index + 3] = 0;
          continue;
        }

        const oldPixel: RGB = {
          r: newImageData.data[index],
          g: newImageData.data[index + 1],
          b: newImageData.data[index + 2],
          a: 255,
        };

        const newPixel = this.findNearestColor(oldPixel, palette);

        // Set the new color, fully opaque
        newImageData.data[index] = newPixel.r;
        newImageData.data[index + 1] = newPixel.g;
        newImageData.data[index + 2] = newPixel.b;
        newImageData.data[index + 3] = 255;

        // Calculate quantization error
        const errorR = (oldPixel.r - newPixel.r) * strength;
        const errorG = (oldPixel.g - newPixel.g) * strength;
        const errorB = (oldPixel.b - newPixel.b) * strength;

        // Distribute error to neighboring pixels (Floyd-Steinberg)
        this.distributeError(newImageData, x + 1, y, width, height, errorR, errorG, errorB, 7 / 16);
        this.distributeError(newImageData, x - 1, y + 1, width, height, errorR, errorG, errorB, 3 / 16);
        this.distributeError(newImageData, x, y + 1, width, height, errorR, errorG, errorB, 5 / 16);
        this.distributeError(newImageData, x + 1, y + 1, width, height, errorR, errorG, errorB, 1 / 16);
      }
    }

    return newImageData;
  }

  /**
   * Distribute quantization error to a neighboring pixel
   * @param imageData - Image data to modify
   * @param x - X coordinate of target pixel
   * @param y - Y coordinate of target pixel
   * @param width - Image width
   * @param height - Image height
   * @param errorR - Red channel error
   * @param errorG - Green channel error
   * @param errorB - Blue channel error
   * @param factor - Error distribution factor
   */
  private distributeError(
    imageData: ImageData,
    x: number,
    y: number,
    width: number,
    height: number,
    errorR: number,
    errorG: number,
    errorB: number,
    factor: number
  ): void {
    if (x < 0 || x >= width || y < 0 || y >= height) {
      return;
    }

    const index = (y * width + x) * 4;
    imageData.data[index] = Math.max(0, Math.min(255, imageData.data[index] + errorR * factor));
    imageData.data[index + 1] = Math.max(0, Math.min(255, imageData.data[index + 1] + errorG * factor));
    imageData.data[index + 2] = Math.max(0, Math.min(255, imageData.data[index + 2] + errorB * factor));
  }

  /**
   * Sample pixels from image data
   * @param imageData - Image data to sample from
   * @param maxPixels - Maximum number of pixels to sample
   * @returns Array of sampled RGB colors
   */
  private samplePixels(imageData: ImageData, maxPixels: number): RGB[] {
    const pixels: RGB[] = [];
    const totalPixels = imageData.width * imageData.height;

    // Use all pixels for small images
    if (totalPixels <= maxPixels) {
      for (let i = 0; i < imageData.data.length; i += 4) {
        if (imageData.data[i + 3] < 128) continue; // skip transparent pixels
        pixels.push({
          r: imageData.data[i],
          g: imageData.data[i + 1],
          b: imageData.data[i + 2],
          a: 255,
        });
      }
    } else {
      // Sample at intervals for large images
      const step = Math.floor(Math.sqrt(totalPixels / maxPixels));
      for (let y = 0; y < imageData.height; y += step) {
        for (let x = 0; x < imageData.width; x += step) {
          const index = (y * imageData.width + x) * 4;
          if (imageData.data[index + 3] < 128) continue; // skip transparent pixels
          pixels.push({
            r: imageData.data[index],
            g: imageData.data[index + 1],
            b: imageData.data[index + 2],
            a: 255,
          });
        }
      }
    }

    return pixels;
  }

  /**
   * Initialize centroids using k-means++ algorithm
   * @param pixels - Array of pixel colors
   * @param k - Number of centroids to generate
   * @returns Array of initial centroids
   */
  private initializeCentroids(pixels: RGB[], k: number): RGB[] {
    const centroids: RGB[] = [];

    // Choose first centroid randomly
    centroids.push(pixels[Math.floor(Math.random() * pixels.length)]);

    // Choose remaining centroids
    for (let i = 1; i < k; i++) {
      // Calculate distances to nearest centroid
      const distances = pixels.map((p) => {
        const minDist = Math.min(
          ...centroids.map((c) => this.colorDistance(p, c))
        );
        return minDist * minDist;
      });

      const totalDistance = distances.reduce((sum, d) => sum + d, 0);
      const threshold = Math.random() * totalDistance;

      let cumulative = 0;
      for (let j = 0; j < pixels.length; j++) {
        cumulative += distances[j];
        if (cumulative >= threshold) {
          centroids.push(pixels[j]);
          break;
        }
      }
    }

    return centroids;
  }

  /**
   * Assign pixels to their nearest centroid
   * @param pixels - Array of pixel colors
   * @param centroids - Current centroids
   * @returns Array of clusters, each containing pixels assigned to that centroid
   */
  private assignPixelsToClusters(
    pixels: RGB[],
    centroids: RGB[]
  ): RGB[][] {
    const clusters: RGB[][] = centroids.map(() => []);

    for (const pixel of pixels) {
      const nearestIndex = this.findNearestCentroidIndex(pixel, centroids);
      clusters[nearestIndex].push(pixel);
    }

    return clusters;
  }

  /**
   * Calculate new centroids from clusters
   * @param clusters - Current pixel clusters
   * @returns Array of new centroids
   */
  private calculateNewCentroids(clusters: RGB[][]): RGB[] {
    return clusters.map((cluster) => {
      if (cluster.length === 0) {
        // Return black if cluster is empty
        return { r: 0, g: 0, b: 0, a: 255 };
      }

      // Calculate mean color
      const sum = cluster.reduce(
        (acc, pixel) => ({
          r: acc.r + pixel.r,
          g: acc.g + pixel.g,
          b: acc.b + pixel.b,
          a: acc.a + pixel.a,
        }),
        { r: 0, g: 0, b: 0, a: 0 }
      );

      const count = cluster.length;
      return {
        r: Math.round(sum.r / count),
        g: Math.round(sum.g / count),
        b: Math.round(sum.b / count),
        a: 255,
      };
    });
  }

  /**
   * Check if centroids have converged
   * @param oldCentroids - Previous centroids
   * @param newCentroids - New centroids
   * @param threshold - Convergence threshold
   * @returns True if converged
   */
  private centroidsConverged(
    oldCentroids: RGB[],
    newCentroids: RGB[],
    threshold: number = 1.0
  ): boolean {
    for (let i = 0; i < oldCentroids.length; i++) {
      if (this.colorDistance(oldCentroids[i], newCentroids[i]) > threshold) {
        return false;
      }
    }
    return true;
  }

  /**
   * Find index of nearest centroid for a pixel
   * @param pixel - Pixel color
   * @param centroids - Array of centroids
   * @returns Index of nearest centroid
   */
  private findNearestCentroidIndex(pixel: RGB, centroids: RGB[]): number {
    let nearestIndex = 0;
    let minDistance = this.colorDistance(pixel, centroids[0]);

    for (let i = 1; i < centroids.length; i++) {
      const distance = this.colorDistance(pixel, centroids[i]);
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = i;
      }
    }

    return nearestIndex;
  }

  /**
   * Find nearest color from palette
   * @param pixel - Pixel color
   * @param palette - Color palette
   * @returns Nearest color from palette
   */
  private findNearestColor(pixel: RGB, palette: RGB[]): RGB {
    return palette[this.findNearestCentroidIndex(pixel, palette)];
  }

  /**
   * Calculate Euclidean distance between two colors
   * @param a - First color
   * @param b - Second color
   * @returns Distance value
   */
  private colorDistance(a: RGB, b: RGB): number {
    const dr = a.r - b.r;
    const dg = a.g - b.g;
    const db = a.b - b.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }
}
