const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Resize and crop locally before the photo is sent to the JSON API. */
export async function prepareProfilePhoto(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Escolha uma foto JPG, PNG ou WebP.');
  }
  if (file.size > MAX_FILE_SIZE) throw new Error('Escolha uma foto de até 10 MB.');
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Não foi possível abrir esta imagem.'));
      image.src = objectUrl;
    });
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('Imagem inválida.');
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 384;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Este navegador não conseguiu preparar a foto.');
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, 384, 384);
    context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, 384, 384);
    for (const quality of [0.85, 0.7, 0.5]) {
      const result = canvas.toDataURL('image/jpeg', quality);
      if (result.length <= 180000) return result;
    }
    throw new Error('A foto ficou muito grande. Escolha outra imagem.');
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
