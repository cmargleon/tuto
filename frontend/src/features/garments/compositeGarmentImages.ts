const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`No se pudo cargar la imagen: ${file.name}`));
    };
    img.src = url;
  });

const TARGET_HEIGHT = 1024;
const GAP = 8;

export const compositeGarmentImages = async (files: File[]): Promise<File> => {
  if (files.length === 1) {
    return files[0];
  }

  const images = await Promise.all(files.map(loadImage));

  const scaledWidths = images.map((img) =>
    Math.round((img.naturalWidth / img.naturalHeight) * TARGET_HEIGHT),
  );
  const totalWidth = scaledWidths.reduce((sum, w) => sum + w, 0) + GAP * (images.length - 1);

  const canvas = document.createElement('canvas');
  canvas.width = totalWidth;
  canvas.height = TARGET_HEIGHT;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas no disponible en este navegador.');
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, totalWidth, TARGET_HEIGHT);

  let x = 0;
  images.forEach((img, i) => {
    ctx.drawImage(img, x, 0, scaledWidths[i], TARGET_HEIGHT);
    x += scaledWidths[i] + GAP;
  });

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('No se pudo generar la imagen compuesta.'));
          return;
        }
        resolve(new File([blob], `composite-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.92,
    );
  });
};

export const groupFilesBySubfolder = (files: File[]): { name: string; files: File[] }[] => {
  const imageFiles = files.filter((f) => f.type.startsWith('image/'));
  if (imageFiles.length === 0) return [];

  const hasSubfolders = imageFiles.some((f) => f.webkitRelativePath.split('/').length >= 3);

  if (!hasSubfolders) {
    // All files are at root level → treat them as one single garment
    const rootFolder = imageFiles[0].webkitRelativePath.split('/')[0];
    return [{ name: rootFolder, files: imageFiles }];
  }

  // Group by subfolder; root-level files each become their own garment
  const groups = new Map<string, File[]>();

  for (const file of imageFiles) {
    const parts = file.webkitRelativePath.split('/');
    const groupKey =
      parts.length >= 3
        ? parts[1]
        : parts[parts.length - 1].replace(/\.[^.]+$/, '') || file.name;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(file);
  }

  return Array.from(groups.entries()).map(([name, groupFiles]) => ({ name, files: groupFiles }));
};
