const fs = require('fs');
const path = require('path');
const Database = requireBetterSqlite();

const root = path.join(__dirname, '..');
const source = process.env.DATABASE_PATH || path.join(root, 'roguepoke.db');
const backupDir = process.env.BACKUP_DIR || path.join(root, 'backups');
const retention = Number.parseInt(process.env.BACKUP_RETENTION || '14', 10);

if (!fs.existsSync(source)) {
  console.error(`Database not found: ${source}`);
  process.exit(1);
}

fs.mkdirSync(backupDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const target = path.join(backupDir, `roguepoke-${stamp}.db`);
const db = new Database(source, { readonly: true });

db.backup(target)
  .then(() => {
    db.close();
    pruneBackups();
    console.log(`SQLite backup created: ${target}`);
  })
  .catch(error => {
    db.close();
    console.error(error);
    process.exit(1);
  });

function pruneBackups() {
  if (!Number.isFinite(retention) || retention <= 0) return;

  const backups = fs.readdirSync(backupDir)
    .filter(file => /^roguepoke-.+\.db$/.test(file))
    .map(file => ({
      file,
      fullPath: path.join(backupDir, file),
      mtimeMs: fs.statSync(path.join(backupDir, file)).mtimeMs
    }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  for (const backup of backups.slice(retention)) {
    fs.rmSync(backup.fullPath, { force: true });
  }
}

function requireBetterSqlite() {
  const candidates = [
    'better-sqlite3',
    path.join(__dirname, '..', 'discord-bot', 'node_modules', 'better-sqlite3'),
    path.join(__dirname, '..', 'dashboard', 'node_modules', 'better-sqlite3')
  ];

  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch (error) {
      if (error.code !== 'MODULE_NOT_FOUND') throw error;
    }
  }

  throw new Error('better-sqlite3 is not installed. Run npm run install:all first.');
}
