const fs = require('fs');
const path = require('path');
const db = require('../db/database');

const ASSETS_DIRS = [
  path.join(process.env.USERPROFILE || '', '.cursor', 'projects', 'c-Users-vladp-OneDrive-Desktop', 'assets'),
  path.join(__dirname, '..', 'public', 'logos-concepts')
];

const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads', 'children');

const CHILDREN_DRESSES = [
  {
    fileKey: 'child-aurora-white',
    assetName: 'c__Users_vladp_AppData_Roaming_Cursor_User_workspaceStorage_cf497df4cfb87da759c0e346f246f0d9_images_image-142f8213-9167-424e-a12a-e8a592847a18.png',
    title: 'Афродита',
    description: 'Белое платье с кружевным корсетом и многоярусной юбкой. Идеально для выпускного, конкурса красоты и торжества.',
    price: 89000,
    sort_order: 10
  },
  {
    fileKey: 'child-peach-garden',
    assetName: 'c__Users_vladp_AppData_Roaming_Cursor_User_workspaceStorage_cf497df4cfb87da759c0e346f246f0d9_images_image-0590781e-df83-4b3a-939d-d18c023624c1.png',
    title: 'Сад радуги',
    description: 'Персиковый корсет с цветочной вышивкой и воздушная юбка с градиентом. Авторский пошив по меркам ребёнка.',
    price: 92000,
    sort_order: 11
  },
  {
    fileKey: 'child-mint-sonata',
    assetName: 'c__Users_vladp_AppData_Roaming_Cursor_User_workspaceStorage_cf497df4cfb87da759c0e346f246f0d9_images_image-2134b5e9-8c1a-4d9c-9ba9-a94980bb7bcf.png',
    title: 'Мятная соната',
    description: 'Мятно-бирюзовое платье с объёмной юбкой и цветочным декором на корсете. Нежный образ для особого вечера.',
    price: 88000,
    sort_order: 12
  },
  {
    fileKey: 'child-lilac-sparkle',
    assetName: 'c__Users_vladp_AppData_Roaming_Cursor_User_workspaceStorage_cf497df4cfb87da759c0e346f246f0d9_images_image-921e15d7-4036-45af-89d8-0d379fefa520.png',
    title: 'Лиловый блеск',
    description: 'Сиренево-лиловое платье с переливающейся отделкой и пышной юбкой. Создано для незабываемого выхода на сцену.',
    price: 95000,
    sort_order: 13
  }
];

function findAsset(assetName) {
  for (const dir of ASSETS_DIRS) {
    const full = path.join(dir, assetName);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

function ensureChildrenGallery() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  for (const item of CHILDREN_DRESSES) {
    const imagePath = `/uploads/children/${item.fileKey}.png`;
    const exists = db.prepare('SELECT id FROM gallery WHERE image_path = ?').get(imagePath);
    if (exists) continue;

    const src = findAsset(item.assetName);
    if (!src) {
      console.warn(`[children-gallery] Файл не найден: ${item.assetName}`);
      continue;
    }

    const dest = path.join(UPLOAD_DIR, `${item.fileKey}.png`);
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(src, dest);
    }

    db.prepare(`
      INSERT INTO gallery (title, description, price, image_path, active, sort_order, for_order, for_rent, rent_price_day, rent_price_week, category)
      VALUES (?, ?, ?, ?, 1, ?, 1, 1, ?, ?, 'children_evening')
    `).run(
      item.title,
      item.description,
      item.price,
      imagePath,
      item.sort_order,
      Math.round(item.price * 0.06),
      Math.round(item.price * 0.06 * 5.5)
    );
    console.log(`[children-gallery] Добавлено: ${item.title}`);
  }
}

module.exports = { ensureChildrenGallery };
