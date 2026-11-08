const PHOTO_PATTERN = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const ATTACHMENT_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf'
};

export function validatePhoto(value) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || value.length > 550_000 || !PHOTO_PATTERN.test(value)) {
    throw new Error('Photo must be a JPEG, PNG, or WebP image smaller than 400 KB.');
  }
  return value;
}

export function validateAttachment({ fileName, mimeType, data }) {
  const name = typeof fileName === 'string' ? fileName.trim().slice(0, 180) : '';
  const type = typeof mimeType === 'string' ? mimeType.toLowerCase() : '';
  if (!name || !ATTACHMENT_TYPES[type]) throw new Error('Upload a PDF, JPEG, PNG, or WebP file.');
  if (typeof data !== 'string' || !/^[A-Za-z0-9+/=]+$/.test(data)) throw new Error('The uploaded file is malformed.');
  const size = Math.floor((data.length * 3) / 4);
  if (size > 4 * 1024 * 1024) throw new Error('The uploaded file must be 4 MB or smaller.');
  return { fileName: name, mimeType: type, size, data };
}

export function extensionFor(mimeType) {
  return ATTACHMENT_TYPES[mimeType] || 'bin';
}
