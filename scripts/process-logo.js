/**
 * Копирует финальный логотип в public/ и делает кремовый фон слегка прозрачным.
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
  ),
  path.join(
    process.env.USERPROFILE || '',
    '.cursor', 'projects', 'c-Users-vladp-OneDrive-Desktop', 'assets',
    'c__Users_vladp_AppData_Roaming_Cursor_User_workspaceStorage_cf497df4cfb87da759c0e346f246f0d9_images_poshiv-round-07-princess-puffy-fb9b2dda-8c38-4aa2-af21-42f35e2eff4e.png'
  )
];

const out = path.join(__dirname, '..', 'public', 'logo.png');
const outCopy = path.join(__dirname, '..', 'логотипы', 'logo-studia-poshiv-final.png');

let src = sources.find((p) => fs.existsSync(p));
if (!src) {
  if (fs.existsSync(out)) {
    console.log('Логотип уже есть:', out);
    process.exit(0);
  }
  console.error('Исходный файл логотипа не найден.');
  process.exit(1);
}

async function run() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    fs.copyFileSync(src, out);
    fs.mkdirSync(path.dirname(outCopy), { recursive: true });
    fs.copyFileSync(src, outCopy);
    console.log('sharp не установлен — скопирован без обработки прозрачности:', out);
    return;
  }

  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixels = Buffer.from(data);

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = pixels[i + 3];
    const isCream = r > 210 && g > 200 && b > 175 && r - b < 45;
    const isGoldBrown = r > 90 && r < 210 && g > 70 && g < 180 && b < 150;
    if (isCream && !isGoldBrown) {
      pixels[i + 3] = Math.min(a, 210);
    }
  }

  await sharp(pixels, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toFile(out);

  fs.mkdirSync(path.dirname(outCopy), { recursive: true });
  fs.copyFileSync(out, outCopy);
  console.log('Готово:', out);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
