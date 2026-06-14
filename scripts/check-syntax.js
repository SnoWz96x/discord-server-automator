const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const roots = ['discord-bot', 'dashboard', 'scripts'];
const files = [];

for (const root of roots) {
  walk(path.join(__dirname, '..', root));
}

const failures = [];
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    failures.push(`${path.relative(process.cwd(), file)}\n${result.stderr || result.stdout}`);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`JavaScript syntax OK (${files.length} files).`);

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath);
    if (entry.isFile() && entry.name.endsWith('.js')) files.push(fullPath);
  }
}
