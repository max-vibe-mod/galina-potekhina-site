const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const db = require('../db/database');
const { suggestRentPrices } = require('./rentPricing');

const ASSETS_DIR = path.join(
  process.env.USERPROFILE || '',
  '.cursor',
  'projects',
  'c-Users-vladp-OneDrive-Desktop',
  'assets'
);

const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads', 'evening');

const PREFIX = 'c__Users_vladp_AppData_Roaming_Cursor_User_workspaceStorage_cf497df4cfb87da759c0e346f246f0d9_images_';

function asset(name) {
  return path.join(ASSETS_DIR, PREFIX + name);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function ffmpegPath() {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }
  const winget = path.join(
    process.env.LOCALAPPDATA || '',
    'Microsoft', 'WinGet', 'Packages',
    'Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe',
    'ffmpeg-8.1.2-full_build', 'bin', 'ffmpeg.exe'
  );
  if (fs.existsSync(winget)) return winget;
  return 'ffmpeg';
}

const FRAME_W = 1200;
const FRAME_H = 2000;
const PAD_COLOR = '0x1a1a1a';

/** Вся модель и низ платья — без обрезки по высоте */
function fillDressFull() {
  return `scale=${FRAME_W}:${FRAME_H}:force_original_aspect_ratio=decrease,pad=${FRAME_W}:${FRAME_H}:(ow-iw)/2:(oh-ih)/2:color=${PAD_COLOR}`;
}

function buildFrameFilter(crop) {
  const fill = fillDressFull();
  switch (crop) {
    case 'left':
      return `crop=iw/2:ih:0:0,${fill}`;
    case 'right':
      return `crop=iw/2:ih:iw/2:0,${fill}`;
    case 'center-left':
      return `crop=iw*0.60:ih:0:0,${fill}`;
    case 'center-right':
      return `crop=iw*0.60:ih:iw*0.40:0,${fill}`;
    case 'wide-right':
      return `crop=iw*0.65:ih:iw*0.35:0,${fill}`;
    case 'wide-left':
      return `crop=iw*0.68:ih:0:0,${fill}`;
    case 'focus-front':
      return `crop=iw*0.78:ih:iw*0.11:0,${fill}`;
    default:
      return fill;
  }
}

function copyOrCrop(src, dest, crop, cropFilter) {
  if (!fs.existsSync(src)) return false;
  ensureDir(path.dirname(dest));
  const vf = cropFilter || buildFrameFilter(crop);
  try {
    execFileSync(ffmpegPath(), ['-y', '-i', src, '-vf', vf, dest], { stdio: 'pipe' });
    return fs.existsSync(dest);
  } catch (e) {
    console.warn('[evening-gallery] frame failed:', path.basename(dest), e.message);
    if (crop === 'full') {
      fs.copyFileSync(src, dest);
      return true;
    }
    return false;
  }
}

function rentFromPrice(price) {
  const { rent_price_day, rent_price_week } = suggestRentPrices(price);
  return { rent_price_day, rent_price_week };
}

const EVENING_DRESSES = [
  {
    fileKey: 'child-aurora-white',
    src: asset('image-142f8213-9167-424e-a12a-e8a592847a18.png'),
    crop: 'full',
    title: 'Афродита',
    description: 'Белое платье с кружевным корсетом и многоярусной юбкой. Аренда для выпускного, конкурса и торжественного выхода.',
    price: 89000,
    sort_order: 10
  },
  {
    fileKey: 'child-peach-garden',
    src: asset('image-0590781e-df83-4b3a-939d-d18c023624c1.png'),
    crop: 'full',
    title: 'Сад радуги',
    description: 'Персиковый корсет с цветочной вышивкой и воздушная юбка с градиентом. Идеально для сцены и фотосессии.',
    price: 92000,
    sort_order: 11
  },
  {
    fileKey: 'child-lilac-sparkle',
    src: asset('image-921e15d7-4036-45af-89d8-0d379fefa520.png'),
    crop: 'full',
    title: 'Лиловый блеск',
    description: 'Сиренево-лиловое платье с переливающейся отделкой и пышной юбкой. Для незабываемого выхода на сцену.',
    price: 95000,
    sort_order: 12
  },
  {
    fileKey: 'runway-turquoise-wave',
    src: asset('image-ada16f1e-ec05-40ae-82f1-c2fba470531b.png'),
    crop: 'center-left',
    title: 'Бирюзовая волна',
    description: 'Бирюзовый корсет в пайетках, юбка с разрезом и мятный шлейф из рюш. Подиумный образ для выпускного и гала.',
    price: 125000,
    sort_order: 20
  },
  {
    fileKey: 'runway-mint-cloud',
    src: asset('image-ada16f1e-ec05-40ae-82f1-c2fba470531b.png'),
    crop: 'center-right',
    title: 'Мятное облако',
    description: 'Мятно-бирюзовый корсет с перьями на плечах и пышная юбка-баллон. Воздушный силуэт для праздника.',
    price: 98000,
    sort_order: 21
  },
  {
    fileKey: 'runway-peach-bloom',
    src: asset('image-b4f33b5d-ab49-499e-af75-e0879ff06d45.png'),
    crop: 'center-left',
    title: 'Персиковый цветок',
    description: 'Персиковый корсет с цветочной вышивкой и пышная многоярусная юбка из рюш. Тёплый торжественный образ.',
    price: 102000,
    sort_order: 22
  },
  {
    fileKey: 'runway-mint-princess',
    src: asset('image-1a6e6460-e733-4f58-856f-4b3a628d0867.png'),
    crop: 'center-right',
    title: 'Мятная принцесса',
    description: 'Мятный корсет с декором и пышная «облачная» юбка из многоярусного тюля. Классический баллон.',
    price: 96000,
    sort_order: 25
  },
  {
    fileKey: 'runway-emerald-peacock',
    src: asset('image-5e5eb4b0-fb3c-480c-bfa4-40efbcc08baa.png'),
    crop: 'full',
    title: 'Павлиний вечер',
    description: 'Изумрудный корсет в пайетках с глубоким вырезом и юбка павлинье-синих рюш. Драматичный силуэт для сцены и съёмки.',
    price: 118000,
    sort_order: 26
  },
  {
    fileKey: 'runway-marshmallow-dream',
    src: asset('image-1a86bd93-a258-4f49-9235-73e134567825.png'),
    crop: 'wide-left',
    title: 'Зефирные грёзы',
    description: 'Лиловый корсет и гигантская юбка с омбре от белого к сиреневому. Максимальный объём и эффект на сцене.',
    price: 138000,
    sort_order: 27
  },
  {
    fileKey: 'runway-silver-petal',
    src: asset('image-1a86bd93-a258-4f49-9235-73e134567825.png'),
    crop: 'wide-right',
    title: 'Серебряный лепесток',
    description: 'Серебристый корсет с рюшами и многоярусная белая юбка. Лёгкий праздничный образ для конкурса и фотосессии.',
    price: 78000,
    sort_order: 28
  },
  {
    fileKey: 'runway-nebula-cape',
    src: asset('image-33a9f317-e3e7-4794-9074-f173f9202e8c.png'),
    crop: 'center-left',
    title: 'Туманность',
    description: 'Синий корсет и накидка из переливающейся ткани с объёмными рукавами. Авангардный вечерний образ.',
    price: 132000,
    sort_order: 29
  },
  {
    fileKey: 'runway-sapphire-bloom',
    src: asset('image-33a9f317-e3e7-4794-9074-f173f9202e8c.png'),
    crop: 'center-right',
    title: 'Сапфировое цветение',
    description: 'Сапфировый корсет с 3D-цветами и пышная юбка из ярусов синего тюля. Классический балльный силуэт.',
    price: 110000,
    sort_order: 30
  },
  {
    fileKey: 'runway-black-crown',
    src: asset('image-5b71657b-a8ee-46a1-b70b-0feea6e44af0.png'),
    crop: 'focus-front',
    title: 'Чёрная корона',
    description: 'Чёрный корсет в серебристой вышивке и гигантская многоярусная юбка из чёрного тюля. Торжественный образ для сцены и конкурса.',
    price: 142000,
    sort_order: 31
  }
];

const DEACTIVATED_ITEMS = [
  'child-mint-sonata',
  'runway-lilac-fairy',
  'runway-peach-shine',
  '/demo/dress-aurora.jpg',
  '/demo/dress-velvet.jpg'
];

function deactivateRemoved() {
  for (const key of DEACTIVATED_ITEMS) {
    if (key.startsWith('/')) {
      db.prepare('UPDATE gallery SET active = 0 WHERE image_path = ?').run(key);
      continue;
    }
    db.prepare(`UPDATE gallery SET active = 0 WHERE image_path LIKE ?`).run(`%/evening/${key}.%`);
  }
}

function migrateCategory() {
  db.prepare(`
    UPDATE gallery SET category = 'evening_couture'
    WHERE category = 'children_evening'
  `).run();
}

function migrateOldPaths() {
  const rows = db.prepare(`SELECT id, image_path FROM gallery WHERE image_path LIKE '/uploads/children/%'`).all();
  for (const row of rows) {
    const base = path.basename(row.image_path);
    const newPath = `/uploads/evening/${base}`;
    const oldFile = path.join(UPLOAD_DIR, '..', 'children', base);
    const newFile = path.join(UPLOAD_DIR, base);
    if (fs.existsSync(oldFile) && !fs.existsSync(newFile)) {
      ensureDir(UPLOAD_DIR);
      fs.copyFileSync(oldFile, newFile);
    }
    db.prepare(`UPDATE gallery SET image_path = ?, category = 'evening_couture' WHERE id = ?`).run(newPath, row.id);
  }
}

function ensureEveningGallery() {
  ensureDir(UPLOAD_DIR);
  migrateCategory();
  migrateOldPaths();

  for (const item of EVENING_DRESSES) {
    const ext = '.png';
    const imagePath = `/uploads/evening/${item.fileKey}${ext}`;
    const dest = path.join(UPLOAD_DIR, `${item.fileKey}${ext}`);

    const exists = db.prepare('SELECT id FROM gallery WHERE image_path = ?').get(imagePath);

  const src = fs.existsSync(item.src)
    ? item.src
    : fs.existsSync(path.join(UPLOAD_DIR, '..', 'children', `${item.fileKey}.png`))
      ? path.join(UPLOAD_DIR, '..', 'children', `${item.fileKey}.png`)
      : null;

    if (!src) {
      if (!exists) console.warn(`[evening-gallery] Нет файла: ${item.fileKey}`);
      continue;
    }

    if (!copyOrCrop(src, dest, item.crop, item.cropFilter)) continue;

    const rent = rentFromPrice(item.price);

    if (exists) {
      db.prepare(`
        UPDATE gallery SET title = ?, description = ?, price = ?, sort_order = ?,
          for_rent = 1, for_order = 1, rent_price_day = ?, rent_price_week = ?, category = 'evening_couture', active = 1
        WHERE image_path = ?
      `).run(
        item.title, item.description, item.price, item.sort_order,
        rent.rent_price_day, rent.rent_price_week, imagePath
      );
      continue;
    }

    db.prepare(`
      INSERT INTO gallery (title, description, price, image_path, active, sort_order, for_order, for_rent, rent_price_day, rent_price_week, category)
      VALUES (?, ?, ?, ?, 1, ?, 1, 1, ?, ?, 'evening_couture')
    `).run(
      item.title,
      item.description,
      item.price,
      imagePath,
      item.sort_order,
      rent.rent_price_day,
      rent.rent_price_week
    );
    console.log(`[evening-gallery] Добавлено: ${item.title}`);
  }

  deactivateRemoved();

  db.prepare(`
    UPDATE gallery SET for_rent = 1, for_order = 1, category = 'evening_couture'
    WHERE category = 'evening_couture' AND active = 1
  `).run();
}

module.exports = { ensureEveningGallery };
