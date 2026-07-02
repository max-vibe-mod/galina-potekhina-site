const path = require('path');

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/pjpeg',
  'image/png',
  'image/webp',
  'image/gif'
]);

const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.jpe', '.jfif', '.png', '.webp', '.gif']);

function isAllowedImage(file) {
  if (!file) return false;
  const mime = (file.mimetype || '').toLowerCase();
  if (ALLOWED_MIME.has(mime) || mime.startsWith('image/')) return true;
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (ALLOWED_EXT.has(ext)) return true;
  const name = (file.originalname || '').toLowerCase();
  if (/\.(jpe?g|png|webp|gif)$/i.test(name)) return true;
  return false;
}

function resolveImageExt(file) {
  let ext = path.extname(file.originalname || '').toLowerCase();
  if (ext === '.jpeg' || ext === '.jpe' || ext === '.jfif') ext = '.jpg';
  if (!ext || !ALLOWED_EXT.has(ext)) {
    const mime = (file.mimetype || '').toLowerCase();
    if (mime.includes('png')) ext = '.png';
    else if (mime.includes('webp')) ext = '.webp';
    else if (mime.includes('gif')) ext = '.gif';
    else ext = '.jpg';
  }
  return ext;
}

module.exports = { isAllowedImage, resolveImageExt, ALLOWED_MIME, ALLOWED_EXT };
