/**
 * Круглый логотип без белого/серого фона — PNG с прозрачностью.
 */
const fs = require('fs');
const path = require('path');

const sources = [
  path.join(__dirname, '..', 'логотипы', 'logo-studia-poshiv-final.png'),
  path.join(__dirname, '..', 'public', 'logos-concepts', 'round-poshiv-ru', 'poshiv-round-07-princess-puffy.png'),
  path.join(
    process.env.USERPROFILE || '',
    '.cursor', 'projects', 'c-Users-vladp-OneDrive-Desktop', 'assets',
    'logo-studia-poshiv-final.png'
  )
];

const out = path.join(__dirname, '..', 'public', 'logo.png');
const outIcon = path.join(__dirname, '..', 'public', 'admin', 'icon-192.png');
const outCopy = path.join(__dirname, '..', 'логотипы', 'logo-studia-poshiv-final.png');

const src = sources.find((p) => fs.existsSync(p));
if (!src) {
  if (fs.existsSync(out)) {
    console.log('Логотип уже есть:', out);
    process.exit(0);
  }
  console.error('Исходный файл логотипа не найден.');
  process.exit(1);
}

function isBackground(r, g, b) {
  const isWhite = r > 235 && g > 235 && b > 235;
  const isCream = r > 200 && g > 190 && b > 165 && r - b < 50;
  const isLightGray = r > 175 && g > 170 && b > 165 && Math.abs(r - g) < 20 && Math.abs(g - b) < 20;
  return isWhite || isCream || isLightGray;
}

async function run() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    fs.copyFileSync(src, out);
    console.log('sharp не установлен — скопирован без обработки');
    return;
  }

  const size = 512;
  const { data, info } = await sharp(src)
    .resize(size, size, { fit: 'cover', position: 'centre' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = Buffer.from(data);
  const cx = info.width / 2;
  const cy = info.height / 2;
  const radius = info.width / 2 - 2;

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 4;
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > radius) {
        pixels[i + 3] = 0;
        continue;
      }

      if (isBackground(r, g, b)) {
        pixels[i + 3] = Math.min(pixels[i + 3], 0);
      } else if (r > 210 && g > 200 && b > 175) {
        pixels[i + 3] = Math.min(pixels[i + 3], 200);
      }

      if (dist > radius - 3) {
        pixels[i + 3] = Math.min(pixels[i + 3], Math.round(255 * (radius - dist) / 3));
      }
    }
  }

  const pipeline = sharp(pixels, {
    raw: { width: info.width, height: info.height, channels: 4 }
  }).png();

  await pipeline.toFile(out);
  await pipeline.clone().resize(192, 192).toFile(outIcon);

  fs.mkdirSync(path.dirname(outCopy), { recursive: true });
  fs.copyFileSync(out, outCopy);
  console.log('Готово:', out, outIcon);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
