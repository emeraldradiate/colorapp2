interface ImageComparisonProps {
  originalUrl: string | null;
  reducedUrl: string | null;
  originalColorCount?: number;
  reducedColorCount?: number;
}

export function ImageComparison({ originalUrl, reducedUrl, originalColorCount, reducedColorCount }: ImageComparisonProps) {
  if (!originalUrl) return null;

  return (
    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 className="text-lg font-semibold mb-3 text-gray-800">
          Original Image{originalColorCount ? ` (${originalColorCount.toLocaleString()} colors)` : ''}
        </h3>
        <div className="border border-gray-200 rounded-lg overflow-hidden shadow-md bg-checkerboard">
          <img
            src={originalUrl}
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
  );
}
