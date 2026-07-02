/**
 * Круглый логотип: прозрачность снаружи круга, текст «Студия пошива Галины Потехиной».
 */
const fs = require('fs');
const path = require('path');

const userLogo = path.join(
  process.env.USERPROFILE || '',
  '.cursor', 'projects', 'c-Users-vladp-OneDrive-Desktop', 'assets',
  'c__Users_vladp_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_image-a4212fca-8c22-4bc5-ac77-7161fadc71f3.png'
);

const sources = [
  userLogo,
  path.join(__dirname, '..', 'логотипы', 'logo-source-user.png'),
  path.join(__dirname, '..', 'логотипы', 'logo-studia-poshiv-final.png'),
  path.join(__dirname, '..', 'public', 'logos-concepts', 'round-poshiv-ru', 'poshiv-round-07-princess-puffy.png')
];

const out = path.join(__dirname, '..', 'public', 'logo.png');
const outIcon = path.join(__dirname, '..', 'public', 'admin', 'icon-192.png');
const outCopy = path.join(__dirname, '..', 'логотипы', 'logo-studia-poshiv-final.png');

const src = sources.find((p) => fs.existsSync(p));
if (!src) {
  console.error('Исходный логотип не найден.');
  process.exit(1);
}

const TEXT_SVG = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect x="24" y="102" width="196" height="128" rx="4" fill="#f0e8dc"/>
  <text x="122" y="148" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="24" font-weight="600" fill="#8f7340">Студия пошива</text>
  <text x="122" y="182" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="22" font-weight="600" fill="#8f7340">Галины Потехиной</text>
</svg>`);

async function run() {
  const sharp = require('sharp');
  const size = 512;

  const { data, info } = await sharp(src)
    .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = Buffer.from(data);
  const cx = info.width / 2;
  const cy = info.height / 2;
  const radius = Math.min(info.width, info.height) / 2 - 4;

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > radius) {
        pixels[i + 3] = 0;
      } else if (dist > radius - 2) {
        pixels[i + 3] = Math.min(pixels[i + 3], Math.round(255 * (radius - dist) / 2));
      }
    }
  }

  let base = sharp(pixels, {
    raw: { width: info.width, height: info.height, channels: 4 }
  }).png();

  base = sharp(await base.toBuffer())
    .composite([{ input: TEXT_SVG, top: 0, left: 0 }]);

  await base.toFile(out);
  await base.clone().resize(192, 192).toFile(outIcon);

  fs.mkdirSync(path.dirname(outCopy), { recursive: true });
  fs.copyFileSync(out, outCopy);
  console.log('Логотип готов:', out);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
