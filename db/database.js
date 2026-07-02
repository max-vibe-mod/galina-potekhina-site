const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'site.db');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

let rawDb = null;
let SQL = null;
let initPromise = null;

function saveDb() {
  if (!rawDb) return;
  const data = rawDb.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

function addColumnIfNotExists(db, table, column, definition) {
  const info = db.exec(`PRAGMA table_info(${table})`);
  const cols = info[0]?.values?.map(row => row[1]) || [];
  if (!cols.includes(column)) {
    db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function runMigrations(db) {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      login TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      full_name TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS gallery (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      price REAL DEFAULT 0,
      image_path TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      gallery_id INTEGER,
      product_title TEXT,
      customer_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      address TEXT,
      comment TEXT,
      amount REAL NOT NULL,
      bonus_used REAL DEFAULT 0,
      bonus_earned REAL DEFAULT 0,
      payment_method TEXT DEFAULT 'card',
      status TEXT DEFAULT 'new',
      receipt_sent INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS loyalty_bonuses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      remaining REAL NOT NULL,
      earned_at TEXT DEFAULT (datetime('now','localtime')),
      expires_at TEXT NOT NULL,
      order_id INTEGER
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS user_measurements (
      user_id INTEGER PRIMARY KEY,
      chest REAL,
      waist REAL,
      hips REAL,
      sleeve REAL,
      shoulder REAL,
      height REAL,
      neck REAL,
      notes TEXT,
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS fitting_appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      appointment_date TEXT NOT NULL,
      appointment_time TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  const defaults = {
    phone: '+7 (___) ___-__-__',
    telegram: 'https://t.me/GalinaPotekhina',
    whatsapp: 'https://wa.me/qr/ZHY7G4YUTOHYL1',
    vk: '',
    instagram: 'https://www.instagram.com/atelier.galina?igsh=MWRwY2wxYW81dHgwdw==',
    hero_title: 'Галина Потехина',
    hero_subtitle: 'Студия пошива свадебных и вечерних платьев · Владивосток',
    about_title: 'О студии',
    about_text: 'Galina Potekhina — студия пошива свадебных и вечерних платьев. Каждое изделие создаётся вручную по индивидуальным меркам с вниманием к деталям, посадке и качеству материалов.',
    about_text_2: 'Мы сопровождаем клиента на всех этапах: консультация, снятие мерок, примерки и финальная отделка. Срок пошива — от 2 до 4 недель в зависимости от модели.',
    rental_title: 'Аренда платьев',
    rental_text: 'Арендуйте авторские платья студии для съёмок, мероприятий и особых случаев. Каждое платье — единственное в своём исполнении.',
    rental_how_title: 'Как оформить',
    rental_how_text: 'Выберите платье, заполните заявку на сайте — рассчитаем аренду по дням или неделям и сформируем проект договора. Подпись Галины — при выдаче в студии.',
    hero_bg_image: '',
    about_image: '',
    self_employed_name: 'Потёхина Галина',
    self_employed_inn: '',
    self_employed_email: '',
    admin_notify_email: '',
    landlord_address: 'г. Владивосток',
    landlord_passport: '',
    landlord_ogrnip: ''
  };

  for (const [key, value] of Object.entries(defaults)) {
    db.run('INSERT OR IGNORE INTO site_settings (key, value) VALUES (?, ?)', [key, value]);
  }

  db.run(`UPDATE site_settings SET value = 'Галина Потехина'
    WHERE key = 'hero_title' AND value IN ('Ателье премиального пошива', 'Студия премиального пошива', 'Ателье премиальных пальто')`);
  db.run(`UPDATE site_settings SET value = 'Студия пошива свадебных и вечерних платьев · Владивосток'
    WHERE key = 'hero_subtitle'`);
  db.run(`UPDATE site_settings SET value = 'О студии'
    WHERE key = 'about_title' AND value IN ('Об ателье', 'О нас')`);
  db.run(`UPDATE site_settings SET value = 'Аренда платьев'
    WHERE key = 'rental_title' AND value LIKE '%вещ%'`);
  db.run(`UPDATE site_settings SET value = 'Арендуйте авторские платья студии для съёмок, мероприятий и особых случаев. Каждое платье — единственное в своём исполнении.'
    WHERE key = 'rental_text' AND (value LIKE '%вещ%' OR value LIKE '%издел%')`);
  db.run(`UPDATE site_settings SET value = 'Свяжитесь с нами по телефону или в мессенджерах — подберём платье, согласуем сроки и условия аренды.'
    WHERE key = 'rental_how_text' AND value LIKE '%вещ%'`);
  db.run(`UPDATE site_settings SET value = 'https://wa.me/qr/ZHY7G4YUTOHYL1'
    WHERE key = 'whatsapp' AND (value = '' OR value NOT LIKE 'https://wa.me/qr/%')`);
  db.run(`UPDATE site_settings SET value = 'https://t.me/GalinaPotekhina'
    WHERE key = 'telegram' AND (value = '' OR value NOT LIKE '%GalinaPotekhina%')`);
  db.run(`UPDATE site_settings SET value = 'https://www.instagram.com/atelier.galina?igsh=MWRwY2wxYW81dHgwdw=='
    WHERE key = 'instagram' AND (value = '' OR value NOT LIKE '%atelier.galina%')`);

  addColumnIfNotExists(db, 'orders', 'estimated_date', 'TEXT');
  addColumnIfNotExists(db, 'orders', 'stage_note', 'TEXT');
  addColumnIfNotExists(db, 'orders', 'media_request', 'TEXT');
  addColumnIfNotExists(db, 'orders', 'media_request_status', "TEXT DEFAULT ''");
  addColumnIfNotExists(db, 'orders', 'change_request', 'TEXT');
  addColumnIfNotExists(db, 'orders', 'change_request_status', "TEXT DEFAULT ''");
  addColumnIfNotExists(db, 'orders', 'cancelled_by', 'TEXT');
  addColumnIfNotExists(db, 'orders', 'cancelled_at', 'TEXT');

  addColumnIfNotExists(db, 'gallery', 'sort_order', 'INTEGER DEFAULT 0');
  addColumnIfNotExists(db, 'gallery', 'for_order', 'INTEGER DEFAULT 1');
  addColumnIfNotExists(db, 'gallery', 'for_rent', 'INTEGER DEFAULT 0');
  addColumnIfNotExists(db, 'gallery', 'rent_price_day', 'REAL DEFAULT 0');
  addColumnIfNotExists(db, 'gallery', 'rent_price_week', 'REAL DEFAULT 0');
  addColumnIfNotExists(db, 'gallery', 'category', "TEXT DEFAULT 'collection'");

  addColumnIfNotExists(db, 'rental_bookings', 'dress_value', 'REAL DEFAULT 0');
  addColumnIfNotExists(db, 'rental_bookings', 'deposit_amount', 'REAL DEFAULT 0');
  addColumnIfNotExists(db, 'rental_bookings', 'rent_days', 'INTEGER DEFAULT 0');
  addColumnIfNotExists(db, 'rental_bookings', 'rent_weeks', 'INTEGER DEFAULT 0');
  addColumnIfNotExists(db, 'rental_bookings', 'rent_breakdown', 'TEXT');
  addColumnIfNotExists(db, 'rental_bookings', 'passport', 'TEXT');
  addColumnIfNotExists(db, 'rental_bookings', 'tenant_address', 'TEXT');
  addColumnIfNotExists(db, 'rental_bookings', 'tenant_inn', 'TEXT');
  addColumnIfNotExists(db, 'rental_bookings', 'rental_purpose', 'TEXT');
  addColumnIfNotExists(db, 'rental_bookings', 'payment_method', 'TEXT');
  addColumnIfNotExists(db, 'rental_bookings', 'contract_file', 'TEXT');
  addColumnIfNotExists(db, 'rental_bookings', 'terms_accepted', 'INTEGER DEFAULT 0');

  db.run('UPDATE gallery SET sort_order = id WHERE sort_order IS NULL OR sort_order = 0');
  db.run('UPDATE gallery SET for_order = 1 WHERE for_order IS NULL');
  db.run('UPDATE gallery SET for_rent = 0 WHERE for_rent IS NULL');
  db.run(`UPDATE gallery SET category = 'collection' WHERE category IS NULL OR category = ''`);

  db.run(`
    CREATE TABLE IF NOT EXISTS rental_bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      gallery_id INTEGER,
      item_title TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      rent_from TEXT NOT NULL,
      rent_to TEXT NOT NULL,
      period_type TEXT DEFAULT 'day',
      amount REAL NOT NULL,
      comment TEXT,
      status TEXT DEFAULT 'new',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS order_progress_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      image_path TEXT NOT NULL,
      caption TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (order_id) REFERENCES orders(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS bonus_adjustments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      action TEXT NOT NULL,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
}

function wrapStatement(sql) {
  return {
    get(...params) {
      const stmt = rawDb.prepare(sql);
      try {
        stmt.bind(params);
        if (stmt.step()) return stmt.getAsObject();
        return undefined;
      } finally {
        stmt.free();
      }
    },
    all(...params) {
      const stmt = rawDb.prepare(sql);
      const rows = [];
      try {
        stmt.bind(params);
        while (stmt.step()) rows.push(stmt.getAsObject());
        return rows;
      } finally {
        stmt.free();
      }
    },
    run(...params) {
      rawDb.run(sql, params);
      const changes = rawDb.getRowsModified();
      let lastInsertRowid = 0;
      const idStmt = rawDb.prepare('SELECT last_insert_rowid() AS id');
      try {
        if (idStmt.step()) {
          lastInsertRowid = Number(idStmt.getAsObject().id) || 0;
        }
      } finally {
        idStmt.free();
      }
      saveDb();
      return { changes, lastInsertRowid };
    }
  };
}

function getDb() {
  if (!initPromise) {
    initPromise = initSqlJs({
      locateFile: (file) => path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file)
    }).then(sqlModule => {
      SQL = sqlModule;
      if (fs.existsSync(dbPath)) {
        rawDb = new SQL.Database(fs.readFileSync(dbPath));
      } else {
        rawDb = new SQL.Database();
      }
      runMigrations(rawDb);
      saveDb();
      return dbProxy;
    });
  }
  return initPromise;
}

function ensureDb() {
  if (!rawDb) throw new Error('База данных ещё не инициализирована');
}

const dbProxy = {
  prepare(sql) {
    ensureDb();
    return wrapStatement(sql);
  },
  exec(sql) {
    ensureDb();
    rawDb.exec(sql);
    saveDb();
  }
};

module.exports = dbProxy;
module.exports.ready = getDb;
