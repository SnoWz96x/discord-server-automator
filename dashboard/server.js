const path = require('path');
const { execFile } = require('child_process');
const fs = require('fs');
const { promisify } = require('util');
const express = require('express');
const Database = require('better-sqlite3');
const { REST, Routes } = require('discord.js');
require('dotenv').config({ path: path.join(__dirname, '..', 'discord-bot', '.env') });

const app = express();
const port = Number(process.env.DASHBOARD_PORT || process.env.PORT || 3000);
const host = process.env.DASHBOARD_HOST || '127.0.0.1';
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'roguepoke.db');
const botPath = path.join(__dirname, '..', 'discord-bot', 'index.js').toLowerCase();
const botPidPath = path.join(__dirname, '..', 'discord-bot', 'bot.pid');
const db = new Database(dbPath, { readonly: false });
const execFileAsync = promisify(execFile);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function getOne(sql, ...params) {
  return db.prepare(sql).get(...params);
}

function getAll(sql, ...params) {
  return db.prepare(sql).all(...params);
}

function safeJSON(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function tableExists(name) {
  return Boolean(getOne("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?", name));
}

async function getDiscordHealth() {
  const token = process.env.DISCORD_TOKEN;
  const guildId = process.env.GUILD_ID;
  const configuredClientId = process.env.CLIENT_ID;

  if (!token) {
    return { online: false, error: 'DISCORD_TOKEN missing' };
  }

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    const bot = await rest.get(Routes.user());
    const clientIds = [...new Set([configuredClientId, bot.id].filter(Boolean))];

    const [guildResult, channelsResult] = await Promise.allSettled([
      guildId ? rest.get(Routes.guild(guildId, true)) : Promise.resolve(null),
      guildId ? rest.get(Routes.guildChannels(guildId)) : Promise.resolve([])
    ]);

    const guild = guildResult.status === 'fulfilled' ? guildResult.value : null;
    const channels = channelsResult.status === 'fulfilled' ? channelsResult.value : [];
    let commands = [];
    const commandWarnings = [];

    for (const clientId of clientIds) {
      try {
        commands = await rest.get(Routes.applicationCommands(clientId));
        break;
      } catch (error) {
        commandWarnings.push(`commands for ${clientId}: ${error.message}`);
      }
    }

    const warnings = [guildResult, channelsResult]
      .filter(result => result.status === 'rejected')
      .map(result => result.reason?.message || 'Discord API request failed');
    warnings.push(...(Array.isArray(commands) && commands.length > 0 ? [] : commandWarnings));

    return {
      online: true,
      bot: {
        id: bot.id,
        username: bot.username,
        discriminator: bot.discriminator,
        avatar: bot.avatar
      },
      guild: guild ? {
        id: guild.id,
        name: guild.name,
        approximateMemberCount: guild.approximate_member_count,
        approximatePresenceCount: guild.approximate_presence_count
      } : null,
      channels: Array.isArray(channels) ? channels.length : 0,
      commands: Array.isArray(commands) ? commands.length : 0,
      warnings,
      checkedAt: new Date().toISOString()
    };
  } catch (error) {
    return {
      online: false,
      error: sanitizeError(error.message),
      checkedAt: new Date().toISOString()
    };
  }
}

function sanitizeError(message) {
  const text = String(message || 'Discord API request failed');
  if (text.includes('<!DOCTYPE') || text.includes('<html')) return 'Discord API retornou uma resposta inesperada.';
  return text.slice(0, 240);
}

async function getProcessHealth() {
  if (process.platform !== 'win32') {
    return { checked: false, running: null, message: 'Process check is only implemented for Windows right now.' };
  }

  try {
    const { stdout } = await execFileAsync('powershell', [
      '-NoProfile',
      '-Command',
      "Get-CimInstance Win32_Process -Filter \"name = 'node.exe'\" | Select-Object ProcessId,CommandLine | ConvertTo-Json -Depth 3"
    ], { timeout: 8000 });

    const parsed = stdout.trim() ? JSON.parse(stdout) : [];
    const rows = Array.isArray(parsed) ? parsed : [parsed];
    const pidFromFile = fs.existsSync(botPidPath) ? Number(fs.readFileSync(botPidPath, 'utf8').trim()) : null;
    const matches = rows.filter(row => {
      const commandLine = String(row.CommandLine || '').toLowerCase();
      return (pidFromFile && Number(row.ProcessId) === pidFromFile && commandLine.includes('index.js'))
        || (commandLine.includes('index.js') && commandLine.includes(botPath));
    });

    return {
      checked: true,
      running: matches.length > 0,
      processes: matches.map(row => ({ pid: row.ProcessId, commandLine: row.CommandLine }))
    };
  } catch (error) {
    return { checked: false, running: null, message: error.message };
  }
}

function getOverview() {
  const guildId = process.env.GUILD_ID;
  const stats = {
    users: tableExists('users') ? getOne('SELECT COUNT(*) as count FROM users WHERE guild_id = ?', guildId)?.count || 0 : 0,
    ticketsOpen: tableExists('tickets') ? getOne("SELECT COUNT(*) as count FROM tickets WHERE guild_id = ? AND status = 'open'", guildId)?.count || 0 : 0,
    ticketsClosed: tableExists('tickets') ? getOne("SELECT COUNT(*) as count FROM tickets WHERE guild_id = ? AND status != 'open'", guildId)?.count || 0 : 0,
    warnings: tableExists('moderation') ? getOne("SELECT COUNT(*) as count FROM moderation WHERE guild_id = ? AND action = 'warn'", guildId)?.count || 0 : 0,
    bans: tableExists('moderation') ? getOne("SELECT COUNT(*) as count FROM moderation WHERE guild_id = ? AND action = 'ban'", guildId)?.count || 0 : 0,
    mutes: tableExists('moderation') ? getOne("SELECT COUNT(*) as count FROM moderation WHERE guild_id = ? AND action = 'mute'", guildId)?.count || 0 : 0,
    totalCoins: tableExists('users') ? getOne('SELECT COALESCE(SUM(coins), 0) as total FROM users WHERE guild_id = ?', guildId)?.total || 0 : 0,
    totalCp: tableExists('users') ? getOne('SELECT COALESCE(SUM(cp), 0) as total FROM users WHERE guild_id = ?', guildId)?.total || 0 : 0,
    totalXp: tableExists('users') ? getOne('SELECT COALESCE(SUM(xp), 0) as total FROM users WHERE guild_id = ?', guildId)?.total || 0 : 0,
    badgesAwarded: tableExists('user_badges') ? getOne('SELECT COUNT(*) as count FROM user_badges WHERE guild_id = ?', guildId)?.count || 0 : 0
  };

  const configs = {
    welcome: tableExists('welcome_config') ? getOne('SELECT * FROM welcome_config WHERE guild_id = ?', guildId) : null,
    verification: tableExists('verification_config') ? getOne('SELECT * FROM verification_config WHERE guild_id = ?', guildId) : null,
    ticket: tableExists('ticket_config') ? getOne('SELECT * FROM ticket_config WHERE guild_id = ?', guildId) : null,
    leveling: tableExists('leveling_config') ? getOne('SELECT * FROM leveling_config WHERE guild_id = ?', guildId) : null,
    economy: tableExists('economy_config') ? getOne('SELECT * FROM economy_config WHERE guild_id = ?', guildId) : null,
    tempvoice: tableExists('tempvoice_config') ? getOne('SELECT * FROM tempvoice_config WHERE guild_id = ?', guildId) : null
  };

  return { stats, configs };
}

function getBadges() {
  const guildId = process.env.GUILD_ID;
  if (!tableExists('badges')) return [];

  if (!tableExists('user_badges')) {
    return getAll('SELECT key, name, emoji, description, 0 as awarded FROM badges ORDER BY name ASC');
  }

  return getAll(`
    SELECT b.key, b.name, b.emoji, b.description, COUNT(ub.id) as awarded
    FROM badges b
    LEFT JOIN user_badges ub ON ub.badge_key = b.key AND ub.guild_id = ?
    GROUP BY b.key
    ORDER BY awarded DESC, b.name ASC
  `, guildId);
}

function getShop() {
  const guildId = process.env.GUILD_ID;
  if (!tableExists('shop_items')) return [];

  return getAll('SELECT * FROM shop_items WHERE guild_id = ? AND enabled = 1 ORDER BY price_coins ASC, name ASC', guildId)
    .map(item => ({ ...item, enabled: Boolean(item.enabled), payload: safeJSON(item.payload, {}) }));
}

function getLeaderboard(type = 'xp') {
  const guildId = process.env.GUILD_ID;
  if (!tableExists('users')) return [];

  const orderColumn = type === 'cp' ? 'cp' : type === 'coins' ? 'coins' : 'xp';
  return getAll(
    `SELECT id, username, xp, level, coins, cp, verified, created_at FROM users WHERE guild_id = ? ORDER BY ${orderColumn} DESC LIMIT 20`,
    guildId
  );
}

function getModeration() {
  const guildId = process.env.GUILD_ID;
  if (!tableExists('moderation')) return { recent: [], byAction: [] };

  return {
    recent: getAll(
      'SELECT * FROM moderation WHERE guild_id = ? ORDER BY COALESCE(case_number, id) DESC LIMIT 50',
      guildId
    ),
    byAction: getAll(
      'SELECT action, COUNT(*) as count FROM moderation WHERE guild_id = ? GROUP BY action ORDER BY count DESC',
      guildId
    )
  };
}

function getAutomodConfig() {
  const guildId = process.env.GUILD_ID;
  if (!tableExists('automod')) return {};
  const rows = getAll('SELECT rule_name, enabled, config FROM automod WHERE guild_id = ? ORDER BY rule_name ASC', guildId);
  return Object.fromEntries(rows.map(row => [row.rule_name, {
    enabled: Boolean(row.enabled),
    config: safeJSON(row.config, {})
  }]));
}

function saveAutomodRule(ruleName, body) {
  const guildId = process.env.GUILD_ID;
  const allowed = new Set(['antiSpam', 'antiCaps', 'antiInvite', 'antiLink', 'bannedWords']);
  if (!allowed.has(ruleName)) {
    const error = new Error('Regra de AutoMod invalida.');
    error.status = 400;
    throw error;
  }

  const config = { ...body };
  delete config.ruleName;
  delete config.enabled;

  for (const key of Object.keys(config)) {
    if (typeof config[key] === 'string' && config[key].includes(',')) {
      config[key] = config[key].split(',').map(item => item.trim()).filter(Boolean);
    }
  }

  db.prepare('INSERT OR REPLACE INTO automod (guild_id, rule_name, enabled, config) VALUES (?, ?, ?, ?)')
    .run(guildId, ruleName, body.enabled ? 1 : 0, JSON.stringify(config));

  return { ruleName, enabled: Boolean(body.enabled), config };
}

function nextCaseNumber(guildId) {
  return Number(getOne('SELECT COALESCE(MAX(case_number), 0) + 1 as next FROM moderation WHERE guild_id = ?', guildId)?.next || 1);
}

function formatCaseId(caseNumber) {
  return `CASE-${String(caseNumber).padStart(5, '0')}`;
}

function addModerationCase({ guildId, userId, moderatorId, action, reason, duration = null, status = 'open' }) {
  const caseNumber = nextCaseNumber(guildId);
  const caseId = formatCaseId(caseNumber);
  db.prepare(`
    INSERT INTO moderation (guild_id, case_number, case_id, user_id, moderator_id, action, reason, duration, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(guildId, caseNumber, caseId, userId, moderatorId, action, reason, duration, status);
  const modCase = getOne('SELECT * FROM moderation WHERE guild_id = ? AND case_number = ?', guildId, caseNumber);
  addEventLog({
    guildId,
    category: 'moderation',
    eventType: action,
    actorId: moderatorId,
    targetId: userId,
    summary: `${caseId}: ${action} aplicado`,
    details: { reason, duration, status }
  });
  return modCase;
}

function addEventLog({ guildId, category, eventType, actorId = null, targetId = null, channelId = null, summary, details = {} }) {
  if (!tableExists('event_logs')) return null;
  const result = db.prepare(`
    INSERT INTO event_logs (guild_id, category, event_type, actor_id, target_id, channel_id, summary, details)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(guildId, category, eventType, actorId, targetId, channelId, summary, JSON.stringify(details || {}));
  return getOne('SELECT * FROM event_logs WHERE id = ?', result.lastInsertRowid);
}

function getTickets() {
  const guildId = process.env.GUILD_ID;
  const config = tableExists('ticket_config') ? getOne('SELECT * FROM ticket_config WHERE guild_id = ?', guildId) : null;

  return {
    config: config ? {
      ...config,
      staff_roles: safeJSON(config.staff_roles, []),
      categories: safeJSON(config.categories, [])
    } : null,
    open: tableExists('tickets') ? getAll("SELECT * FROM tickets WHERE guild_id = ? AND status IN ('open', 'pending') ORDER BY created_at DESC LIMIT 30", guildId) : [],
    recent: tableExists('tickets') ? getAll('SELECT * FROM tickets WHERE guild_id = ? ORDER BY created_at DESC LIMIT 50', guildId) : []
  };
}

function getOperationalLogs() {
  const guildId = process.env.GUILD_ID;
  const groups = {
    cadastro: [],
    moderacao: [],
    tickets: [],
    mensagens: [],
    cargos: [],
    canais: [],
    automod: [],
    economia: []
  };

  if (tableExists('event_logs')) {
    const rows = getAll('SELECT * FROM event_logs WHERE guild_id = ? ORDER BY id DESC LIMIT 250', guildId)
      .map(row => ({ ...row, details: safeJSON(row.details, {}) }));

    for (const row of rows) {
      groups[normalizeLogCategory(row.category)].push(row);
    }
  }

  if (tableExists('users')) {
    groups.cadastro.push(...getAll(`
      SELECT
        'cadastro' as category,
        'user_seen' as event_type,
        id as target_id,
        username as summary,
        created_at
      FROM users
      WHERE guild_id = ?
      ORDER BY created_at DESC
      LIMIT 30
    `, guildId).map(row => ({ ...row, summary: `Usuario registrado no banco: ${row.summary || row.target_id}` })));
  }

  if (!groups.moderacao.length && tableExists('moderation')) {
    groups.moderacao.push(...getAll(`
      SELECT
        'moderation' as category,
        action as event_type,
        moderator_id as actor_id,
        user_id as target_id,
        case_id || ': ' || action || ' - ' || COALESCE(reason, 'sem motivo') as summary,
        created_at
      FROM moderation
      WHERE guild_id = ?
      ORDER BY COALESCE(case_number, id) DESC
      LIMIT 50
    `, guildId));
  }

  if (!groups.tickets.length && tableExists('tickets')) {
    groups.tickets.push(...getAll(`
      SELECT
        'tickets' as category,
        status as event_type,
        user_id as target_id,
        channel_id,
        'Ticket #' || id || ' - ' || category || ' - ' || status as summary,
        created_at
      FROM tickets
      WHERE guild_id = ?
      ORDER BY id DESC
      LIMIT 50
    `, guildId));
  }

  if (tableExists('inventory')) {
    groups.economia.push(...getAll(`
      SELECT
        'economia' as category,
        'purchase' as event_type,
        user_id as actor_id,
        item_key as target_id,
        'Compra de item: ' || item_key || ' x' || quantity as summary,
        purchased_at as created_at
      FROM inventory
      WHERE guild_id = ?
      ORDER BY purchased_at DESC
      LIMIT 50
    `, guildId));
  }

  return groups;
}

function normalizeLogCategory(category) {
  const text = String(category || '').toLowerCase();
  if (text.includes('ticket')) return 'tickets';
  if (text.includes('moderation') || text.includes('moderacao')) return 'moderacao';
  if (text.includes('message') || text.includes('mensagem')) return 'mensagens';
  if (text.includes('role') || text.includes('cargo')) return 'cargos';
  if (text.includes('channel') || text.includes('canal')) return 'canais';
  if (text.includes('automod')) return 'automod';
  if (text.includes('econom')) return 'economia';
  if (text.includes('cadastro') || text.includes('member') || text.includes('user')) return 'cadastro';
  return 'mensagens';
}

function requireDiscordEnv() {
  if (!process.env.DISCORD_TOKEN || !process.env.GUILD_ID) {
    const error = new Error('DISCORD_TOKEN or GUILD_ID missing');
    error.status = 500;
    throw error;
  }
}

function getRestClient() {
  requireDiscordEnv();
  return new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
}

function requireUserId(value) {
  const userId = String(value || '').trim();
  if (!/^\d{17,22}$/.test(userId)) {
    const error = new Error('Informe um ID de usuario Discord valido.');
    error.status = 400;
    throw error;
  }
  return userId;
}

function safeAmount(value, fallback = 0) {
  const amount = Number.parseInt(value, 10);
  if (!Number.isFinite(amount) || amount === 0) return fallback;
  return Math.max(-1000000, Math.min(1000000, amount));
}

function getAdminOptions() {
  const guildId = process.env.GUILD_ID;
  return {
    badges: getBadges(),
    levelRewards: tableExists('level_rewards')
      ? getAll('SELECT level, role_id, badge_key FROM level_rewards WHERE guild_id = ? ORDER BY level ASC', guildId)
      : []
  };
}

async function applyModerationAction({ action, userId, reason, durationMinutes }) {
  requireDiscordEnv();
  const guildId = process.env.GUILD_ID;
  const rest = getRestClient();
  const cleanReason = String(reason || 'Acao pelo RoguePoke Dashboard').slice(0, 512);

  if (action === 'warn') {
    db.prepare('INSERT OR IGNORE INTO users (id, guild_id, username) VALUES (?, ?, ?)').run(userId, guildId, '');
    db.prepare('UPDATE users SET warnings = warnings + 1 WHERE id = ? AND guild_id = ?').run(userId, guildId);
    const modCase = addModerationCase({ guildId, userId, moderatorId: 'dashboard', action: 'warn', reason: cleanReason });
    return { action, userId, caseId: modCase.case_id, message: `Warning registrado (${modCase.case_id}).` };
  }

  if (action === 'ban') {
    await rest.put(Routes.guildBan(guildId, userId), {
      body: { delete_message_seconds: 0 },
      reason: cleanReason
    });
    const modCase = addModerationCase({ guildId, userId, moderatorId: 'dashboard', action: 'ban', reason: cleanReason });
    return { action, userId, caseId: modCase.case_id, message: `Usuario banido (${modCase.case_id}).` };
  }

  if (action === 'kick') {
    await rest.delete(Routes.guildMember(guildId, userId), { reason: cleanReason });
    const modCase = addModerationCase({ guildId, userId, moderatorId: 'dashboard', action: 'kick', reason: cleanReason });
    return { action, userId, caseId: modCase.case_id, message: `Usuario expulso (${modCase.case_id}).` };
  }

  if (action === 'timeout') {
    const minutes = Math.max(1, Math.min(Number.parseInt(durationMinutes, 10) || 10, 40320));
    const until = new Date(Date.now() + minutes * 60000).toISOString();
    await rest.patch(Routes.guildMember(guildId, userId), {
      body: { communication_disabled_until: until },
      reason: cleanReason
    });
    const modCase = addModerationCase({ guildId, userId, moderatorId: 'dashboard', action: 'timeout', reason: cleanReason, duration: minutes * 60000 });
    return { action, userId, caseId: modCase.case_id, message: `Timeout aplicado por ${minutes} minuto(s) (${modCase.case_id}).` };
  }

  if (action === 'untimeout') {
    await rest.patch(Routes.guildMember(guildId, userId), {
      body: { communication_disabled_until: null },
      reason: cleanReason
    });
    const modCase = addModerationCase({ guildId, userId, moderatorId: 'dashboard', action: 'untimeout', reason: cleanReason });
    return { action, userId, caseId: modCase.case_id, message: `Timeout removido (${modCase.case_id}).` };
  }

  const error = new Error('Acao de moderacao invalida.');
  error.status = 400;
  throw error;
}

function createUserIfNeeded(userId, username = '') {
  const guildId = process.env.GUILD_ID;
  db.prepare('INSERT OR IGNORE INTO users (id, guild_id, username) VALUES (?, ?, ?)').run(userId, guildId, username);
}

function applyXp(userId, amount) {
  const guildId = process.env.GUILD_ID;
  createUserIfNeeded(userId);
  db.prepare('UPDATE users SET xp = MAX(0, xp + ?) WHERE id = ? AND guild_id = ?').run(amount, userId, guildId);
  const user = getOne('SELECT xp, level FROM users WHERE id = ? AND guild_id = ?', userId, guildId);
  const newLevel = Math.floor(0.1 * Math.sqrt(user.xp));
  if (newLevel > user.level) {
    db.prepare('UPDATE users SET level = ? WHERE id = ? AND guild_id = ?').run(newLevel, userId, guildId);
  }
  return { userId, amount, xp: user.xp, level: Math.max(user.level, newLevel) };
}

function applyCoins(userId, amount) {
  const guildId = process.env.GUILD_ID;
  createUserIfNeeded(userId);
  db.prepare('UPDATE users SET coins = MAX(0, coins + ?) WHERE id = ? AND guild_id = ?').run(amount, userId, guildId);
  const user = getOne('SELECT coins FROM users WHERE id = ? AND guild_id = ?', userId, guildId);
  return { userId, amount, coins: user.coins };
}

function applyCp(userId, amount) {
  const guildId = process.env.GUILD_ID;
  createUserIfNeeded(userId);
  db.prepare('UPDATE users SET cp = MAX(0, cp + ?) WHERE id = ? AND guild_id = ?').run(amount, userId, guildId);
  const user = getOne('SELECT cp FROM users WHERE id = ? AND guild_id = ?', userId, guildId);
  return { userId, amount, cp: user.cp };
}

async function awardBadge(userId, badgeKey) {
  const guildId = process.env.GUILD_ID;
  const badge = getOne('SELECT key, name FROM badges WHERE key = ?', badgeKey);
  if (!badge) {
    const error = new Error('Badge nao encontrada.');
    error.status = 404;
    throw error;
  }
  createUserIfNeeded(userId);
  const result = db.prepare('INSERT OR IGNORE INTO user_badges (guild_id, user_id, badge_key) VALUES (?, ?, ?)').run(guildId, userId, badgeKey);

  const roleIds = getBadgeRoleIds(guildId, badgeKey);
  const assignedRoles = [];
  const missingRoles = [];

  if (roleIds.length) {
    const rest = getRestClient();
    for (const roleId of roleIds) {
      try {
        await rest.put(Routes.guildMemberRole(guildId, userId, roleId), {
          reason: `Badge ${badge.name} entregue pelo dashboard`
        });
        assignedRoles.push(roleId);
      } catch (error) {
        missingRoles.push({ roleId, error: sanitizeError(error.message) });
      }
    }
  }

  addEventLog({
    guildId,
    category: 'economia',
    eventType: 'badge_awarded',
    actorId: 'dashboard',
    targetId: userId,
    summary: `Badge entregue: ${badge.name}`,
    details: { badgeKey, inserted: result.changes > 0, assignedRoles, missingRoles }
  });

  return {
    userId,
    badge,
    inserted: result.changes > 0,
    assignedRoles,
    missingRoles,
    message: assignedRoles.length
      ? `Badge ${badge.name} entregue e ${assignedRoles.length} cargo(s) aplicados.`
      : `Badge ${badge.name} entregue no perfil.`
  };
}

function getBadgeRoleIds(guildId, badgeKey) {
  const roleIds = new Set();

  if (tableExists('shop_items')) {
    const shopItems = getAll("SELECT payload FROM shop_items WHERE guild_id = ? AND type = 'badge'", guildId);
    for (const item of shopItems) {
      const payload = safeJSON(item.payload, {});
      if (payload?.badge?.key === badgeKey && payload.roleId) {
        roleIds.add(payload.roleId);
      }
    }
  }

  if (tableExists('level_rewards')) {
    const rewards = getAll('SELECT role_id FROM level_rewards WHERE guild_id = ? AND badge_key = ?', guildId, badgeKey);
    for (const reward of rewards) {
      if (reward.role_id) roleIds.add(reward.role_id);
    }
  }

  return [...roleIds];
}

function asyncRoute(handler) {
  return async (req, res) => {
    try {
      const result = await handler(req, res);
      if (!res.headersSent) res.json(result);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  };
}

app.get('/api/health', async (req, res) => {
  const [discord, processHealth] = await Promise.all([getDiscordHealth(), getProcessHealth()]);
  res.json({ ...discord, process: processHealth });
});

app.get('/api/overview', async (req, res) => {
  const [discord, processHealth, overview] = await Promise.all([getDiscordHealth(), getProcessHealth(), Promise.resolve(getOverview())]);
  const health = { ...discord, process: processHealth };
  res.json({ health, ...overview });
});

app.get('/api/leaderboard', (req, res) => {
  res.json({
    xp: getLeaderboard('xp'),
    coins: getLeaderboard('coins'),
    cp: getLeaderboard('cp')
  });
});

app.get('/api/moderation', (req, res) => {
  res.json(getModeration());
});

app.get('/api/tickets', (req, res) => {
  res.json(getTickets());
});

app.get('/api/badges', (req, res) => {
  res.json(getBadges());
});

app.get('/api/shop', (req, res) => {
  res.json(getShop());
});

app.get('/api/automod', (req, res) => {
  res.json(getAutomodConfig());
});

app.get('/api/admin/options', (req, res) => {
  res.json(getAdminOptions());
});

app.post('/api/admin/moderation', asyncRoute(async (req) => {
  return applyModerationAction({
    action: String(req.body.action || '').trim(),
    userId: requireUserId(req.body.userId),
    reason: req.body.reason,
    durationMinutes: req.body.durationMinutes
  });
}));

app.post('/api/admin/xp', asyncRoute(async (req) => {
  return applyXp(requireUserId(req.body.userId), safeAmount(req.body.amount));
}));

app.post('/api/admin/coins', asyncRoute(async (req) => {
  return applyCoins(requireUserId(req.body.userId), safeAmount(req.body.amount));
}));

app.post('/api/admin/cp', asyncRoute(async (req) => {
  return applyCp(requireUserId(req.body.userId), safeAmount(req.body.amount));
}));

app.post('/api/admin/badges', asyncRoute(async (req) => {
  return awardBadge(requireUserId(req.body.userId), String(req.body.badgeKey || '').trim());
}));

app.post('/api/admin/automod', asyncRoute(async (req) => {
  return saveAutomodRule(String(req.body.ruleName || ''), req.body);
}));

app.get('/api/logs', (req, res) => {
  res.json(getOperationalLogs());
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, host, () => {
  console.log(`RoguePoke dashboard running at http://${host}:${port}`);
});
