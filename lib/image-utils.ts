/**
 * Image processing utilities for Layout2D
 */

/**
 * Upscale an image by a given factor using canvas
 * @param file - The image file to upscale
 * @param scaleFactor - The scaling factor (e.g., 2 for 2x upscaling)
 * @returns Promise<string> - Base64 data URL of the upscaled image
 */
export async function upscaleImage(file: File, scaleFactor: number = 2): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      // Create canvas with scaled dimensions
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Set canvas size to scaled dimensions
      const scaledWidth = img.width * scaleFactor;
      const scaledHeight = img.height * scaleFactor;

      canvas.width = scaledWidth;
      canvas.height = scaledHeight;

      // Enable image smoothing for better quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw the image at the scaled size
      ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);

      // Convert to base64 with high quality
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      resolve(dataUrl);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Load the image from file
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Get image dimensions from file
 * @param file - The image file
 * @returns Promise<{width: number, height: number}>
 */
export async function getImageDimensions(file: File): Promise<{width: number, height: number}> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height
      });
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
}