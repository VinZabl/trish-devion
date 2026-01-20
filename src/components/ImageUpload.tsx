import React, { useRef } from 'react';
import { X, Image as ImageIcon } from 'lucide-react';
import { useImageUpload } from '../hooks/useImageUpload';

interface ImageUploadProps {
  currentImage?: string;
  onImageChange: (imageUrl: string | undefined) => void;
  className?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ 
  currentImage, 
  onImageChange, 
  className = '' 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadImage, deleteImage, uploading, uploadProgress } = useImageUpload();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const imageUrl = await uploadImage(file);
      onImageChange(imageUrl);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to upload image');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = async () => {
    if (currentImage) {
      try {
        await deleteImage(currentImage);
        onImageChange(undefined);
      } catch (error) {
        console.error('Error removing image:', error);
        // Still remove from UI even if deletion fails
        onImageChange(undefined);
      }
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <label className="block text-xs font-medium text-black mb-2">Menu Item Image</label>
      
      {currentImage ? (
        <div className="relative">
          <img
            src={currentImage}
            alt="Menu item preview"
            className="w-full h-32 object-cover rounded-lg border border-gray-300 transition-opacity duration-300"
            loading="lazy"
            decoding="async"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
            onLoad={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
            style={{ opacity: 0 }}
          />
          <button
            type="button"
            onClick={handleRemoveImage}
            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors duration-200"
            disabled={uploading}
            aria-label="Remove image"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div
          onClick={triggerFileSelect}
          className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-all duration-200"
        >
          {uploading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600 mx-auto mb-2"></div>
              <p className="text-xs text-gray-600">Uploading... {uploadProgress}%</p>
              <div className="w-24 bg-gray-200 rounded-full h-1.5 mt-2">
                <div 
                  className="bg-gray-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <>
              <ImageIcon className="h-8 w-8 text-gray-400 mb-1" />
              <p className="text-xs text-gray-600 mb-0.5">Click to upload image</p>
              <p className="text-xs text-gray-500">JPEG, PNG, WebP, GIF (max 5MB)</p>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />
    </div>
  );
};

export default ImageUpload;