/**
 * Иконка Android: тёмный фон + золотое кольцо + логотип по центру.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const logoPath = path.join(__dirname, '..', 'public', 'logo.png');
const resRoot = path.join(__dirname, '..', 'gp-admin-android', 'android', 'app', 'src', 'main', 'res');

const launcherSizes = {
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

function bgSvg(size) {
  const r = size / 2;
  return Buffer.from(`<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="g" cx="50%" cy="42%" r="58%">
        <stop offset="0%" stop-color="#3a3228"/>
        <stop offset="100%" stop-color="#12100c"/>
      </radialGradient>
    </defs>
    <rect width="${size}" height="${size}" fill="url(#g)"/>
    <circle cx="${r}" cy="${r}" r="${r * 0.94}" fill="none" stroke="#b8975a" stroke-width="${Math.max(2, size * 0.018)}"/>
    <circle cx="${r}" cy="${r}" r="${r * 0.86}" fill="none" stroke="#d4b87a" stroke-width="${Math.max(1, size * 0.008)}" opacity="0.55"/>
  </svg>`);
}

async function buildIcon(canvas, logoRatio) {
  const logoSize = Math.round(canvas * logoRatio);
  const logo = await sharp(logoPath)
    .resize(logoSize, logoSize, { fit: 'cover' })
    .png()
    .toBuffer();
  const offset = Math.round((canvas - logoSize) / 2);
  return sharp(bgSvg(canvas))
    .composite([{ input: logo, top: offset, left: offset }])
    .png()
    .toBuffer();
}

async function buildLauncher(canvas) {
  return buildIcon(canvas, 0.78);
}

async function buildForeground(canvas) {
  const logoSize = Math.round(canvas * 0.52);
  const logo = await sharp(logoPath)
    .resize(logoSize, logoSize, { fit: 'cover' })
    .png()
    .toBuffer();
  const offset = Math.round((canvas - logoSize) / 2);
  const r = canvas / 2;
  const ring = Buffer.from(`<svg width="${canvas}" height="${canvas}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${r}" cy="${r}" r="${r * 0.46}" fill="none" stroke="#d4b87a" stroke-width="${Math.max(2, canvas * 0.012)}"/>
  </svg>`);
  return sharp({
    create: { width: canvas, height: canvas, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite([
      { input: ring, top: 0, left: 0 },
      { input: logo, top: offset, left: offset }
    ])
    .png()
    .toBuffer();
}

async function run() {
  if (!fs.existsSync(logoPath)) {
    console.error('Сначала: node scripts/process-logo.js');
    process.exit(1);
  }

  for (const [folder, size] of Object.entries(launcherSizes)) {
    const dir = path.join(resRoot, folder);
    fs.mkdirSync(dir, { recursive: true });
    const buf = await buildLauncher(size);
    await sharp(buf).toFile(path.join(dir, 'ic_launcher.png'));
    await sharp(buf).toFile(path.join(dir, 'ic_launcher_round.png'));
  }

  for (const [folder, size] of Object.entries(fgSizes)) {
    const dir = path.join(resRoot, folder);
    fs.mkdirSync(dir, { recursive: true });
    const buf = await buildForeground(size);
    await sharp(buf).toFile(path.join(dir, 'ic_launcher_foreground.png'));
  }

  const wwwIcon = path.join(__dirname, '..', 'gp-admin-android', 'www', 'logo.png');
  await sharp(logoPath).resize(192, 192).toFile(wwwIcon);
  await sharp(logoPath).resize(192, 192).toFile(path.join(__dirname, '..', 'public', 'admin', 'icon-192.png'));

  console.log('Иконки Android готовы');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
