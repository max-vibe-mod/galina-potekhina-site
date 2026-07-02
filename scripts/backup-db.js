const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'site.db');
const backupDir = path.join(dataDir, 'backups');

if (!fs.existsSync(dbPath)) {
  console.error('База данных не найдена:', dbPath);
  process.exit(1);
}

if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const dest = path.join(backupDir, `site-${stamp}.db`);

fs.copyFileSync(dbPath, dest);

const files = fs.readdirSync(backupDir)
  .filter(f => f.startsWith('site-') && f.endsWith('.db'))
  .map(f => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtimeMs }))
  .sort((a, b) => b.time - a.time);

const keep = 14;
files.slice(keep).forEach(f => {
  fs.unlinkSync(path.join(backupDir, f.name));
});

console.log('Резервная копия:', dest);
