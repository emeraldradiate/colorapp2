import { useRef, useEffect } from 'react';

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
}

export function ImageUpload({ onImageSelect }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onImageSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handlePaste = (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    // Prefer image/png (preserves alpha) over other image formats
    let pngItem: DataTransferItem | null = null;
    let fallbackItem: DataTransferItem | null = null;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type === 'image/png') {
        pngItem = item;
      } else if (!fallbackItem && item.type.startsWith('image/')) {
        fallbackItem = item;
      }
    }

    const selectedItem = pngItem ?? fallbackItem;
    if (!selectedItem) return;

    const blob = selectedItem.getAsFile();
    if (blob) {
      const file = new File([blob], `pasted-image-${Date.now()}.png`, {
        type: blob.type || 'image/png',
      });
      onImageSelect(file);
      e.preventDefault();
    }
  };

  useEffect(() => {
    // Add paste event listener when component mounts
    window.addEventListener('paste', handlePaste);
    
    // Clean up listener when component unmounts
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [onImageSelect]);

  return (
    <div
      className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-purple-500 transition-colors cursor-pointer bg-gray-50"
      onClick={() => fileInputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <svg
        className="mx-auto h-12 w-12 text-gray-400"
        stroke="currentColor"
        fill="none"
        viewBox="0 0 48 48"
        aria-hidden="true"
      >
        <path
          d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p className="mt-2 text-sm text-gray-600">
        <span className="font-semibold text-purple-600">Click to upload</span>, 
        drag and drop, or paste from clipboard
      </p>
      <p className="mt-1 text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
    </div>
  );
}
