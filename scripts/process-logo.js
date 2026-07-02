const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const assetsDir = path.join(
  process.env.USERPROFILE || '',
  '.cursor', 'projects', 'c-Users-vladp-OneDrive-Desktop', 'assets'
);

const src = path.join(
  assetsDir,
  'c__Users_vladp_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_image-a4212fca-8c22-4bc5-ac77-7161fadc71f3.png'
);

const out = path.join(__dirname, '..', 'public', 'logo.png');
const outIcon = path.join(__dirname, '..', 'public', 'admin', 'icon-192.png');
const outAppIcon = path.join(__dirname, '..', 'gp-admin-android', 'www', 'app-icon-source.png');

if (!src) {
  console.error('Логотип не найден');
  process.exit(1);
}

const SIZE = 1024;
const mask = Buffer.from(`<svg width="${SIZE}" height="${SIZE}"><circle cx="512" cy="512" r="508" fill="white"/></svg>`);

async function run() {
  const meta = await sharp(src).metadata();
  const side = Math.min(meta.width || SIZE, meta.height || SIZE);
  const left = Math.max(0, Math.floor(((meta.width || side) - side) / 2));
  const top = Math.max(0, Math.floor(((meta.height || side) - side) / 2));

  const base = await sharp(src)
    .extract({ left, top, width: side, height: side })
    .resize(SIZE, SIZE, { fit: 'fill' })
    .ensureAlpha()
    .png()
    .toBuffer();

  const transparentCircle = await sharp(base)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  await sharp(transparentCircle).toFile(out);
  await sharp(transparentCircle).resize(192, 192).toFile(outIcon);
  await sharp(transparentCircle).resize(512, 512).toFile(outAppIcon);

  const copyDir = path.join(__dirname, '..', 'логотипы');
  fs.mkdirSync(copyDir, { recursive: true });
  fs.copyFileSync(out, path.join(copyDir, 'logo-studia-poshiv-final.png'));
  console.log('Логотип PNG готов:', out, 'из', path.basename(src));
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
