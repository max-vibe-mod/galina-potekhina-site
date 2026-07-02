const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const doc = 'e:\\ВСЕ КУРСЫ ПО ШИТЬЮ\\договор на аренду платьев для фотосессии\\ДОГОВОР НА АРЕНДУ ПЛАТЬЕВ.docx';
const zip = path.join(os.tmpdir(), 'contract-temp.zip');
const out = path.join(os.tmpdir(), 'contract-temp-docx');

fs.copyFileSync(doc, zip);
if (fs.existsSync(out)) fs.rmSync(out, { recursive: true });
execSync(`powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zip}' -DestinationPath '${out}' -Force"`, { stdio: 'pipe' });

const xml = fs.readFileSync(path.join(out, 'word', 'document.xml'), 'utf8');
const text = xml
  .replace(/<w:tab[^/]*\/>/g, '\t')
  .replace(/<\/w:p>/g, '\n')
  .replace(/<[^>]+>/g, '')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&amp;/g, '&')
  .replace(/\n{3,}/g, '\n\n');

const dest = path.join(__dirname, '..', 'data', 'rent-contract-source.txt');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, text, 'utf8');
console.log('Saved to', dest);
console.log(text.slice(0, 15000));
