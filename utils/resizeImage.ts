// utils/resizeImage.ts
// Compression JPEG côté client des photos d'audit (côté le plus long borné
// à maxSize) — même traitement pour tout formulaire qui stocke photo_base64.
// Options facultatives (photos PMR au sol) : rotation appliquée aux pixels
// et dessin par-dessus l'image redimensionnée (bandeau d'annotation). Sans
// options, le résultat est identique à l'historique.

export interface ResizeImageOptions {
  /** Rotation horaire en degrés (0, 90, 180, 270). */
  rotation?: number;
  /** Dessin final, dans le repère de l'image produite (non tourné). */
  annotate?: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
}

const normalizeRotation = (rotation: number | undefined): number => (((rotation ?? 0) % 360) + 360) % 360;

/** Dimensions de l'image dessinée (draw) et du canevas produit (canvas). */
export const computeResizeGeometry = (width: number, height: number, maxSize: number, rotation?: number) => {
  let w = width;
  let h = height;
  if (w > h) {
    if (w > maxSize) {
      h *= maxSize / w;
      w = maxSize;
    }
  } else if (h > maxSize) {
    w *= maxSize / h;
    h = maxSize;
  }
  const quarter = normalizeRotation(rotation) % 180 !== 0;
  return { draw: { width: w, height: h }, canvas: quarter ? { width: h, height: w } : { width: w, height: h } };
};

export const resizeImage = (file: Blob, maxSize: number, options: ResizeImageOptions = {}): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const rotation = normalizeRotation(options.rotation);
        const { draw, canvas: size } = computeResizeGeometry(img.width, img.height, maxSize, rotation);
        const canvas = document.createElement('canvas');
        canvas.width = size.width;
        canvas.height = size.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Impossible d\'obtenir le contexte du canvas.'));
        }
        if (rotation === 0) {
          ctx.drawImage(img, 0, 0, draw.width, draw.height);
        } else {
          ctx.translate(size.width / 2, size.height / 2);
          ctx.rotate((rotation * Math.PI) / 180);
          ctx.drawImage(img, -draw.width / 2, -draw.height / 2, draw.width, draw.height);
          ctx.setTransform(1, 0, 0, 1, 0, 0);
        }
        options.annotate?.(ctx, size.width, size.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
