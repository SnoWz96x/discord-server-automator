const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', 'discord-bot', '.env');
const examplePath = path.join(__dirname, '..', 'discord-bot', '.env.example');
const required = ['DISCORD_TOKEN', 'CLIENT_ID', 'GUILD_ID', 'OWNER_USER_ID'];

function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return Object.fromEntries(
    fs.readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#') && line.includes('='))
      .map(line => {
        const index = line.indexOf('=');
        return [line.slice(0, index), line.slice(index + 1)];
      })
  );
}

const env = parseEnv(envPath);
const example = parseEnv(examplePath);
const source = fs.existsSync(envPath) ? env : example;
const missing = required.filter(key => !source[key]);

if (missing.length) {
  console.error(`Missing required environment keys: ${missing.join(', ')}`);
  process.exit(1);
}

if (fs.existsSync(envPath)) {
  const placeholders = required.filter(key => /your_|here/i.test(env[key] || ''));
  if (placeholders.length) {
    console.error(`Replace placeholder values for: ${placeholders.join(', ')}`);
    process.exit(1);
  }
}

console.log(`Environment shape OK (${fs.existsSync(envPath) ? '.env' : '.env.example'}).`);
