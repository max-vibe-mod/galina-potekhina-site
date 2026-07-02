/**
 * Генерация иконок Android из public/logo.png
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const logoPath = path.join(__dirname, '..', 'public', 'logo.png');
const resRoot = path.join(__dirname, '..', 'gp-admin-android', 'android', 'app', 'src', 'main', 'res');

const sizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192
};

const fgSizes = {
  'mipmap-mdpi': 108,
  'mipmap-hdpi': 162,
  'mipmap-xhdpi': 216,
  'mipmap-xxhdpi': 324,
  'mipmap-xxxhdpi': 432
};

async function placeLogo(canvas, logoSize) {
  const logo = await sharp(logoPath)
    .resize(logoSize, logoSize, { fit: 'cover' })
    .png()
    .toBuffer();
  const offset = Math.round((canvas - logoSize) / 2);
  return sharp({
    create: {
      width: canvas,
      height: canvas,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([{ input: logo, top: offset, left: offset }])
    .png()
    .toBuffer();
}

async function run() {
  if (!fs.existsSync(logoPath)) {
    console.error('Сначала запустите scripts/process-logo.js');
    process.exit(1);
  }

  for (const [folder, size] of Object.entries(sizes)) {
    const dir = path.join(resRoot, folder);
    fs.mkdirSync(dir, { recursive: true });
    const buf = await placeLogo(size, Math.round(size * 0.92));
    await sharp(buf).toFile(path.join(dir, 'ic_launcher.png'));
    await sharp(buf).toFile(path.join(dir, 'ic_launcher_round.png'));
  }

  for (const [folder, size] of Object.entries(fgSizes)) {
    const dir = path.join(resRoot, folder);
    fs.mkdirSync(dir, { recursive: true });
    const logoSize = Math.round(size * 0.62);
    const buf = await placeLogo(size, logoSize);
    await sharp(buf).toFile(path.join(dir, 'ic_launcher_foreground.png'));
  }

  console.log('Иконки Android готовы');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
