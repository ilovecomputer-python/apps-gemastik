const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.85;

/**
 * Draw a source image onto a canvas capped at MAX_DIMENSION and return a JPEG
 * data URL. Phone cameras produce 4000px+ shots; sending those raw would blow
 * past the request limit and slow the vision call down for no accuracy gain.
 */
function toDataUrl(
  source: CanvasImageSource,
  width: number,
  height: number,
): string {
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak didukung browser ini.");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

export async function fileToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("File harus berupa gambar.");
  }

  const bitmapUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Gambar tidak bisa dibaca."));
      element.src = bitmapUrl;
    });
    return toDataUrl(img, img.naturalWidth, img.naturalHeight);
  } finally {
    URL.revokeObjectURL(bitmapUrl);
  }
}

export function videoFrameToDataUrl(video: HTMLVideoElement): string {
  return toDataUrl(video, video.videoWidth, video.videoHeight);
}
