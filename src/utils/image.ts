// Resize an image File to a square JPEG data URL (base64).
// Default 256x256, quality 0.85 — keeps player headshots ~30-50KB.
export async function fileToResizedDataUrl(
  file: File,
  size = 256,
  quality = 0.85,
): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D no disponible');

    // Center-crop to square, then draw scaled to size
    const minSide = Math.min(img.width, img.height);
    const sx = (img.width - minSide) / 2;
    const sy = (img.height - minSide) / 2;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);

    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}
