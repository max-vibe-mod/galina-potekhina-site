/**
 * Круглый логотип PNG + текст «Студия пошива Галины Потехиной».
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const userLogo = path.join(
  process.env.USERPROFILE || '',
  '.cursor', 'projects', 'c-Users-vladp-OneDrive-Desktop', 'assets',
  'c__Users_vladp_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_image-a4212fca-8c22-4bc5-ac77-7161fadc71f3.png'
);

const out = path.join(__dirname, '..', 'public', 'logo.png');
const outIcon = path.join(__dirname, '..', 'public', 'admin', 'icon-192.png');
const outCopy = path.join(__dirname, '..', 'логотипы', 'logo-studia-poshiv-final.png');

const src = [userLogo, path.join(__dirname, '..', 'логотипы', 'logo-studia-poshiv-final.png')]
  .find((p) => fs.existsSync(p));

if (!src) {
  console.error('Логотип не найден');
  process.exit(1);
}

const SIZE = 512;
const mask = Buffer.from(`<svg width="${SIZE}" height="${SIZE}"><circle cx="256" cy="256" r="252" fill="white"/></svg>`);
const textSvg = Buffer.from(`<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <rect x="24" y="102" width="196" height="128" rx="4" fill="#f0e8dc"/>
  <text x="122" y="148" text-anchor="middle" font-family="Georgia, serif" font-size="24" font-weight="600" fill="#8f7340">Студия пошива</text>
  <text x="122" y="182" text-anchor="middle" font-family="Georgia, serif" font-size="22" font-weight="600" fill="#8f7340">Галины Потехиной</text>
</svg>`);

async function run() {
  const base = await sharp(src)
    .resize(SIZE, SIZE, { fit: 'cover', position: 'centre' })
    .ensureAlpha()
    .png()
    .toBuffer();

  const circled = await sharp(base)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  const textLayer = await sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite([{ input: textSvg, top: 0, left: 0 }])
    .png()
    .toBuffer();

  const final = await sharp(circled)
    .composite([{ input: textLayer, blend: 'over' }])
    .png()
    .toBuffer();

  await sharp(final).toFile(out);
  await sharp(final).resize(192, 192).toFile(outIcon);

  fs.mkdirSync(path.dirname(outCopy), { recursive: true });
  fs.copyFileSync(out, outCopy);
  console.log('Логотип готов:', out);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
