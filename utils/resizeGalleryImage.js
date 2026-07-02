const fs = require('fs');
const path = require('path');

const FRAME_W = 1200;
const FRAME_H = 2000;
const PAD_COLOR = '#1a1a1a';

async function getSharp() {
  try {
    return require('sharp');
  } catch {
    return null;
  }
}

async function resizeGalleryImage(inputPath, outputPath) {
  const sharp = await getSharp();
  if (!sharp) {
    fs.copyFileSync(inputPath, outputPath);
    return true;
  }

  await sharp(inputPath)
    .rotate()
    .resize(FRAME_W, FRAME_H, {
      fit: 'contain',
      background: PAD_COLOR,
      position: 'centre'
    })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(outputPath);

  return fs.existsSync(outputPath);
}

module.exports = { resizeGalleryImage, FRAME_W, FRAME_H };
