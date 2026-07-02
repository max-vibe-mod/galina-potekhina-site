/**
 * Круглый логотип PNG с текстом «Студия пошива Галины Потехиной».
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const assetsDir = path.join(
  process.env.USERPROFILE || '',
  '.cursor', 'projects', 'c-Users-vladp-OneDrive-Desktop', 'assets'
);

const candidates = [
  path.join(assetsDir, 'c__Users_vladp_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_image-104d00ce-cfc9-4e17-9c21-845ae7dd04aa.png'),
  path.join(assetsDir, 'c__Users_vladp_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_image-474f79f4-f28d-4d61-ae79-866ce3171fdf.png'),
  path.join(assetsDir, 'c__Users_vladp_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_image-a4212fca-8c22-4bc5-ac77-7161fadc71f3.png'),
  path.join(__dirname, '..', 'логотипы', 'logo-studia-poshiv-final.png')
];

const out = path.join(__dirname, '..', 'public', 'logo.png');
const outIcon = path.join(__dirname, '..', 'public', 'admin', 'icon-192.png');
const outAppIcon = path.join(__dirname, '..', 'gp-admin-android', 'www', 'app-icon-source.png');

const src = candidates.find((p) => fs.existsSync(p));
if (!src) {
  console.error('Логотип не найден');
  process.exit(1);
}

const SIZE = 1024;
const CREAM = '#ede6d8';
const GOLD = '#8f7340';

const mask = Buffer.from(`<svg width="${SIZE}" height="${SIZE}"><circle cx="512" cy="512" r="508" fill="white"/></svg>`);

const textSvg = Buffer.from(`<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <rect x="36" y="248" width="360" height="280" rx="12" fill="${CREAM}"/>
  <text x="216" y="330" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="52" font-weight="700" fill="${GOLD}">Студия пошива</text>
  <text x="216" y="400" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="48" font-weight="700" fill="${GOLD}">Галины</text>
  <text x="216" y="468" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="48" font-weight="700" fill="${GOLD}">Потехиной</text>
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
  await sharp(final).resize(512, 512).toFile(outAppIcon);

  const copyDir = path.join(__dirname, '..', 'логотипы');
  fs.mkdirSync(copyDir, { recursive: true });
  fs.copyFileSync(out, path.join(copyDir, 'logo-studia-poshiv-final.png'));
  console.log('Логотип готов:', out, 'из', path.basename(src));
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
