const Database = require('better-sqlite3');
const path = require('path');

class RoguePokeDB {
  constructor() {
    this.db = new Database(path.join(__dirname, '../../roguepoke.db'));
    this.db.pragma('journal_mode = WAL');
    this.initTables();
  }

  initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS guilds (
        id TEXT PRIMARY KEY,
        name TEXT,
        config TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT,
        guild_id TEXT,
        username TEXT,
        xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 0,
        coins INTEGER DEFAULT 0,
        cp INTEGER DEFAULT 0,
        last_daily DATETIME,
        last_weekly DATETIME,
        last_work DATETIME,
        warnings INTEGER DEFAULT 0,
        verified INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id, guild_id),
        FOREIGN KEY (guild_id) REFERENCES guilds(id)
      );

      CREATE TABLE IF NOT EXISTS voice_sessions (
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        channel_id TEXT,
        joined_at DATETIME NOT NULL,
        PRIMARY KEY (guild_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS reaction_roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT,
        channel_id TEXT,
        message_id TEXT,
        role_id TEXT,
        emoji TEXT,
        label TEXT,
        style TEXT DEFAULT 'Primary',
        type TEXT DEFAULT 'button',
        UNIQUE(guild_id, message_id, role_id)
      );

      CREATE TABLE IF NOT EXISTS tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT,
        channel_id TEXT,
        user_id TEXT,
        category TEXT,
        status TEXT DEFAULT 'open',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        closed_at DATETIME
      );

      CREATE TABLE IF NOT EXISTS moderation (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT,
        user_id TEXT,
        moderator_id TEXT,
        action TEXT,
        reason TEXT,
        duration INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS automod (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT,
        rule_name TEXT,
        enabled INTEGER DEFAULT 1,
        config TEXT DEFAULT '{}',
        UNIQUE(guild_id, rule_name)
      );

      CREATE TABLE IF NOT EXISTS level_rewards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT,
        level INTEGER,
        role_id TEXT,
        badge_key TEXT,
        UNIQUE(guild_id, level)
      );

      CREATE TABLE IF NOT EXISTS badges (
        key TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        emoji TEXT DEFAULT '',
        description TEXT DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS user_badges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        badge_key TEXT NOT NULL,
        awarded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(guild_id, user_id, badge_key),
        FOREIGN KEY (badge_key) REFERENCES badges(key)
      );

      CREATE TABLE IF NOT EXISTS shop_items (
        key TEXT PRIMARY KEY,
        guild_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        type TEXT NOT NULL,
        price_coins INTEGER DEFAULT 0,
        price_cp INTEGER DEFAULT 0,
        min_level INTEGER DEFAULT 0,
        payload TEXT DEFAULT '{}',
        enabled INTEGER DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        item_key TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(guild_id, user_id, item_key)
      );

      CREATE TABLE IF NOT EXISTS creatures (
        key TEXT PRIMARY KEY,
        guild_id TEXT NOT NULL,
        name TEXT NOT NULL,
        element TEXT DEFAULT 'Neutral',
        rarity TEXT DEFAULT 'Common',
        description TEXT DEFAULT '',
        capture_cost_coins INTEGER DEFAULT 0,
        capture_cost_cp INTEGER DEFAULT 0,
        success_rate INTEGER DEFAULT 50,
        enabled INTEGER DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS user_creatures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        creature_key TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        captured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(guild_id, user_id, creature_key)
      );

      CREATE TABLE IF NOT EXISTS welcome_config (
        guild_id TEXT PRIMARY KEY,
        enabled INTEGER DEFAULT 1,
        channel_id TEXT,
        dm_enabled INTEGER DEFAULT 0,
        dm_message TEXT,
        embed_title TEXT,
        embed_description TEXT,
        embed_color TEXT DEFAULT '#FF6B35',
        embed_thumbnail TEXT
      );

      CREATE TABLE IF NOT EXISTS verification_config (
        guild_id TEXT PRIMARY KEY,
        enabled INTEGER DEFAULT 1,
        channel_id TEXT,
        role_id TEXT,
        captcha_enabled INTEGER DEFAULT 0,
        button_label TEXT DEFAULT 'Verificar',
        button_emoji TEXT DEFAULT 'shield'
      );

      CREATE TABLE IF NOT EXISTS ticket_config (
        guild_id TEXT PRIMARY KEY,
        enabled INTEGER DEFAULT 1,
        channel_id TEXT,
        category_name TEXT DEFAULT 'SUPORTE',
        staff_roles TEXT DEFAULT '[]',
        categories TEXT DEFAULT '[]'
      );

      CREATE TABLE IF NOT EXISTS leveling_config (
        guild_id TEXT PRIMARY KEY,
        enabled INTEGER DEFAULT 1,
        xp_min INTEGER DEFAULT 15,
        xp_max INTEGER DEFAULT 25,
        cooldown INTEGER DEFAULT 60000,
        level_up_message TEXT
      );

      CREATE TABLE IF NOT EXISTS economy_config (
        guild_id TEXT PRIMARY KEY,
        enabled INTEGER DEFAULT 1,
        currency TEXT DEFAULT 'PokeCoins',
        daily_reward INTEGER DEFAULT 100,
        weekly_reward INTEGER DEFAULT 500
      );

      CREATE TABLE IF NOT EXISTS tempvoice_config (
        guild_id TEXT PRIMARY KEY,
        enabled INTEGER DEFAULT 1,
        channel_id TEXT,
        category_id TEXT
      );
    `);

    const levelRewardColumns = this.db.prepare('PRAGMA table_info(level_rewards)').all().map(column => column.name);
    if (!levelRewardColumns.includes('badge_key')) {
      this.db.exec('ALTER TABLE level_rewards ADD COLUMN badge_key TEXT');
    }

    this.ensureColumn('users', 'cp', 'INTEGER DEFAULT 0');
    this.ensureColumn('shop_items', 'price_cp', 'INTEGER DEFAULT 0');

    this.migrateUsersCompositeKey();
  }

  ensureColumn(table, column, definition) {
    const columns = this.db.prepare(`PRAGMA table_info(${table})`).all().map(row => row.name);
    if (!columns.includes(column)) {
      this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  }

  migrateUsersCompositeKey() {
    const columns = this.db.prepare('PRAGMA table_info(users)').all();
    const idColumn = columns.find(column => column.name === 'id');
    const guildColumn = columns.find(column => column.name === 'guild_id');
    const hasCompositeKey = idColumn?.pk === 1 && guildColumn?.pk === 2;
    if (hasCompositeKey) return;

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users_new (
        id TEXT,
        guild_id TEXT,
        username TEXT,
        xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 0,
        coins INTEGER DEFAULT 0,
        cp INTEGER DEFAULT 0,
        last_daily DATETIME,
        last_weekly DATETIME,
        last_work DATETIME,
        warnings INTEGER DEFAULT 0,
        verified INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id, guild_id),
        FOREIGN KEY (guild_id) REFERENCES guilds(id)
      );

      INSERT OR IGNORE INTO users_new (
        id, guild_id, username, xp, level, coins, cp, last_daily, last_weekly, last_work, warnings, verified, created_at
      )
      SELECT id, guild_id, username, xp, level, coins, COALESCE(cp, 0), last_daily, last_weekly, last_work, warnings, verified, created_at
      FROM users
      WHERE id IS NOT NULL AND guild_id IS NOT NULL;

      DROP TABLE users;
      ALTER TABLE users_new RENAME TO users;
    `);
  }

  connect() {
    console.log('Database connected');
  }

  parseJSON(value, fallback) {
    if (value == null || value === '') return fallback;
    if (typeof value !== 'string') return value;

    try {
      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }

  getGuild(guildId) {
    const guild = this.db.prepare('SELECT * FROM guilds WHERE id = ?').get(guildId);
    if (!guild) return null;
    return { ...guild, config: this.parseJSON(guild.config, {}) };
  }

  createGuild(guildId, name) {
    const stmt = this.db.prepare('INSERT OR IGNORE INTO guilds (id, name) VALUES (?, ?)');
    return stmt.run(guildId, name);
  }

  updateGuildConfig(guildId, config) {
    const stmt = this.db.prepare('UPDATE guilds SET config = ? WHERE id = ?');
    return stmt.run(JSON.stringify(config), guildId);
  }

  getUser(userId, guildId) {
    return this.db.prepare('SELECT * FROM users WHERE id = ? AND guild_id = ?').get(userId, guildId);
  }

  createUser(userId, guildId, username) {
    const stmt = this.db.prepare('INSERT OR IGNORE INTO users (id, guild_id, username) VALUES (?, ?, ?)');
    return stmt.run(userId, guildId, username);
  }

  updateUsername(userId, guildId, username) {
    const stmt = this.db.prepare('UPDATE users SET username = COALESCE(NULLIF(?, \'\'), username) WHERE id = ? AND guild_id = ?');
    return stmt.run(username, userId, guildId);
  }

  updateUserXP(userId, guildId, xp) {
    const stmt = this.db.prepare('UPDATE users SET xp = xp + ? WHERE id = ? AND guild_id = ?');
    return stmt.run(xp, userId, guildId);
  }

  setUserLevel(userId, guildId, level) {
    const stmt = this.db.prepare('UPDATE users SET level = ? WHERE id = ? AND guild_id = ?');
    return stmt.run(level, userId, guildId);
  }

  addCoins(userId, guildId, amount) {
    const stmt = this.db.prepare('UPDATE users SET coins = coins + ? WHERE id = ? AND guild_id = ?');
    return stmt.run(amount, userId, guildId);
  }

  addCp(userId, guildId, amount) {
    const stmt = this.db.prepare('UPDATE users SET cp = cp + ? WHERE id = ? AND guild_id = ?');
    return stmt.run(amount, userId, guildId);
  }

  setCoins(userId, guildId, amount) {
    const stmt = this.db.prepare('UPDATE users SET coins = ? WHERE id = ? AND guild_id = ?');
    return stmt.run(Math.max(0, amount), userId, guildId);
  }

  setCp(userId, guildId, amount) {
    const stmt = this.db.prepare('UPDATE users SET cp = ? WHERE id = ? AND guild_id = ?');
    return stmt.run(Math.max(0, amount), userId, guildId);
  }

  removeCoins(userId, guildId, amount) {
    const stmt = this.db.prepare('UPDATE users SET coins = coins - ? WHERE id = ? AND guild_id = ?');
    return stmt.run(amount, userId, guildId);
  }

  removeCp(userId, guildId, amount) {
    const stmt = this.db.prepare('UPDATE users SET cp = cp - ? WHERE id = ? AND guild_id = ?');
    return stmt.run(amount, userId, guildId);
  }

  getLeaderboard(guildId, limit = 10) {
    return this.db.prepare('SELECT * FROM users WHERE guild_id = ? ORDER BY xp DESC LIMIT ?').all(guildId, limit);
  }

  getCoinLeaderboard(guildId, limit = 10) {
    return this.db.prepare('SELECT * FROM users WHERE guild_id = ? ORDER BY coins DESC LIMIT ?').all(guildId, limit);
  }

  getReactionRoles(guildId, messageId) {
    return this.db.prepare('SELECT * FROM reaction_roles WHERE guild_id = ? AND message_id = ?').all(guildId, messageId);
  }

  addReactionRole(guildId, channelId, messageId, roleId, emoji, label, style, type) {
    const stmt = this.db.prepare('INSERT OR REPLACE INTO reaction_roles (guild_id, channel_id, message_id, role_id, emoji, label, style, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    return stmt.run(guildId, channelId, messageId, roleId, emoji, label, style, type);
  }

  removeReactionRole(guildId, messageId, roleId) {
    const stmt = this.db.prepare('DELETE FROM reaction_roles WHERE guild_id = ? AND message_id = ? AND role_id = ?');
    return stmt.run(guildId, messageId, roleId);
  }

  createTicket(guildId, channelId, userId, category) {
    const stmt = this.db.prepare('INSERT INTO tickets (guild_id, channel_id, user_id, category) VALUES (?, ?, ?, ?)');
    return stmt.run(guildId, channelId, userId, category);
  }

  getTicket(channelId) {
    return this.db.prepare('SELECT * FROM tickets WHERE channel_id = ? AND status = ?').get(channelId, 'open');
  }

  closeTicket(channelId) {
    const stmt = this.db.prepare('UPDATE tickets SET status = ?, closed_at = CURRENT_TIMESTAMP WHERE channel_id = ?');
    return stmt.run('closed', channelId);
  }

  getUserTickets(guildId, userId) {
    return this.db.prepare('SELECT * FROM tickets WHERE guild_id = ? AND user_id = ? AND status = ?').all(guildId, userId, 'open');
  }

  addModAction(guildId, userId, moderatorId, action, reason, duration = null) {
    const stmt = this.db.prepare('INSERT INTO moderation (guild_id, user_id, moderator_id, action, reason, duration) VALUES (?, ?, ?, ?, ?, ?)');
    return stmt.run(guildId, userId, moderatorId, action, reason, duration);
  }

  getUserWarnings(guildId, userId) {
    return this.db.prepare('SELECT COUNT(*) as count FROM moderation WHERE guild_id = ? AND user_id = ? AND action = ?').get(guildId, userId, 'warn');
  }

  getModHistory(guildId, userId, limit = 10) {
    return this.db.prepare('SELECT * FROM moderation WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT ?').all(guildId, userId, limit);
  }

  getWelcomeConfig(guildId) {
    const config = this.db.prepare('SELECT * FROM welcome_config WHERE guild_id = ?').get(guildId);
    if (!config) return null;
    return { ...config, enabled: Boolean(config.enabled), dm_enabled: Boolean(config.dm_enabled) };
  }

  setWelcomeConfig(guildId, config) {
    const stmt = this.db.prepare('INSERT OR REPLACE INTO welcome_config (guild_id, enabled, channel_id, dm_enabled, dm_message, embed_title, embed_description, embed_color, embed_thumbnail) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    return stmt.run(guildId, config.enabled ? 1 : 0, config.channelId, config.dmEnabled ? 1 : 0, config.dmMessage, config.embedTitle, config.embedDescription, config.embedColor, config.embedThumbnail);
  }

  getVerificationConfig(guildId) {
    const config = this.db.prepare('SELECT * FROM verification_config WHERE guild_id = ?').get(guildId);
    if (!config) return null;
    return { ...config, enabled: Boolean(config.enabled), captcha_enabled: Boolean(config.captcha_enabled) };
  }

  setVerificationConfig(guildId, config) {
    const stmt = this.db.prepare('INSERT OR REPLACE INTO verification_config (guild_id, enabled, channel_id, role_id, captcha_enabled, button_label, button_emoji) VALUES (?, ?, ?, ?, ?, ?, ?)');
    return stmt.run(guildId, config.enabled ? 1 : 0, config.channelId, config.roleId, config.captchaEnabled ? 1 : 0, config.buttonLabel, config.buttonEmoji);
  }

  getTicketConfig(guildId) {
    const config = this.db.prepare('SELECT * FROM ticket_config WHERE guild_id = ?').get(guildId);
    if (!config) return null;
    return {
      ...config,
      enabled: Boolean(config.enabled),
      staff_roles: this.parseJSON(config.staff_roles, []),
      categories: this.parseJSON(config.categories, [])
    };
  }

  setTicketConfig(guildId, config) {
    const stmt = this.db.prepare('INSERT OR REPLACE INTO ticket_config (guild_id, enabled, channel_id, category_name, staff_roles, categories) VALUES (?, ?, ?, ?, ?, ?)');
    return stmt.run(guildId, config.enabled ? 1 : 0, config.channelId, config.categoryName, JSON.stringify(config.staffRoles), JSON.stringify(config.categories));
  }

  getAutomodConfig(guildId) {
    const rows = this.db.prepare('SELECT * FROM automod WHERE guild_id = ?').all(guildId);
    const config = {
      antiSpam: { enabled: true, maxMessages: 5, timeWindow: 10000 },
      antiCaps: { enabled: true, threshold: 70, minLength: 10 },
      antiInvite: { enabled: true, whitelist: ['roguepoke.com', 'discord.gg'] },
      antiLink: { enabled: true, whitelist: ['roguepoke.com', 'youtube.com', 'twitter.com', 'x.com', 'github.com'] },
      bannedWords: { enabled: true, words: ['palavra1', 'palavra2'] }
    };

    for (const row of rows) {
      config[row.rule_name] = {
        ...config[row.rule_name],
        ...this.parseJSON(row.config, {}),
        enabled: Boolean(row.enabled)
      };
    }

    return config;
  }

  setAutomodRule(guildId, ruleName, settings) {
    this.db.prepare('DELETE FROM automod WHERE guild_id = ? AND rule_name = ?').run(guildId, ruleName);
    const stmt = this.db.prepare('INSERT OR REPLACE INTO automod (guild_id, rule_name, enabled, config) VALUES (?, ?, ?, ?)');
    return stmt.run(guildId, ruleName, settings.enabled ? 1 : 0, JSON.stringify(settings));
  }

  getLevelingConfig(guildId) {
    const config = this.db.prepare('SELECT * FROM leveling_config WHERE guild_id = ?').get(guildId);
    if (!config) return null;
    return { ...config, enabled: Boolean(config.enabled) };
  }

  setLevelingConfig(guildId, config) {
    const stmt = this.db.prepare('INSERT OR REPLACE INTO leveling_config (guild_id, enabled, xp_min, xp_max, cooldown, level_up_message) VALUES (?, ?, ?, ?, ?, ?)');
    return stmt.run(guildId, config.enabled ? 1 : 0, config.xpMin, config.xpMax, config.cooldown, config.levelUpMessage);
  }

  getEconomyConfig(guildId) {
    const config = this.db.prepare('SELECT * FROM economy_config WHERE guild_id = ?').get(guildId);
    if (!config) return null;
    return { ...config, enabled: Boolean(config.enabled) };
  }

  setEconomyConfig(guildId, config) {
    const stmt = this.db.prepare('INSERT OR REPLACE INTO economy_config (guild_id, enabled, currency, daily_reward, weekly_reward) VALUES (?, ?, ?, ?, ?)');
    return stmt.run(guildId, config.enabled ? 1 : 0, config.currency, config.dailyReward, config.weeklyReward);
  }

  getLevelRewards(guildId) {
    return this.db.prepare('SELECT * FROM level_rewards WHERE guild_id = ? ORDER BY level ASC').all(guildId);
  }

  addLevelReward(guildId, level, roleId, badgeKey = null) {
    const stmt = this.db.prepare('INSERT OR REPLACE INTO level_rewards (guild_id, level, role_id, badge_key) VALUES (?, ?, ?, ?)');
    return stmt.run(guildId, level, roleId, badgeKey);
  }

  removeLevelReward(guildId, level) {
    const stmt = this.db.prepare('DELETE FROM level_rewards WHERE guild_id = ? AND level = ?');
    return stmt.run(guildId, level);
  }

  getTempVoiceConfig(guildId) {
    const config = this.db.prepare('SELECT * FROM tempvoice_config WHERE guild_id = ?').get(guildId);
    if (!config) return null;
    return { ...config, enabled: Boolean(config.enabled) };
  }

  setTempVoiceConfig(guildId, config) {
    const stmt = this.db.prepare('INSERT OR REPLACE INTO tempvoice_config (guild_id, enabled, channel_id, category_id) VALUES (?, ?, ?, ?)');
    return stmt.run(guildId, config.enabled ? 1 : 0, config.channelId, config.categoryId);
  }

  getGuildStats(guildId) {
    const members = this.db.prepare('SELECT COUNT(*) as count FROM users WHERE guild_id = ?').get(guildId);
    const tickets = this.db.prepare('SELECT COUNT(*) as count FROM tickets WHERE guild_id = ? AND status = ?').get(guildId, 'open');
    const warnings = this.db.prepare('SELECT COUNT(*) as count FROM moderation WHERE guild_id = ? AND action = ?').get(guildId, 'warn');
    return {
      members: members.count,
      openTickets: tickets.count,
      totalWarnings: warnings.count
    };
  }

  upsertBadge(badge) {
    const stmt = this.db.prepare('INSERT OR REPLACE INTO badges (key, name, emoji, description) VALUES (?, ?, ?, ?)');
    return stmt.run(badge.key, badge.name, badge.emoji || '', badge.description || '');
  }

  awardBadge(guildId, userId, badgeKey) {
    const stmt = this.db.prepare('INSERT OR IGNORE INTO user_badges (guild_id, user_id, badge_key) VALUES (?, ?, ?)');
    return stmt.run(guildId, userId, badgeKey);
  }

  getUserBadges(guildId, userId) {
    return this.db.prepare(`
      SELECT b.key, b.name, b.emoji, b.description, ub.awarded_at
      FROM user_badges ub
      JOIN badges b ON b.key = ub.badge_key
      WHERE ub.guild_id = ? AND ub.user_id = ?
      ORDER BY ub.awarded_at ASC
    `).all(guildId, userId);
  }

  getBadgeStats(guildId) {
    return this.db.prepare(`
      SELECT b.key, b.name, b.emoji, COUNT(ub.id) as awarded
      FROM badges b
      LEFT JOIN user_badges ub ON ub.badge_key = b.key AND ub.guild_id = ?
      GROUP BY b.key
      ORDER BY awarded DESC, b.name ASC
    `).all(guildId);
  }

  startVoiceSession(guildId, userId, channelId) {
    const stmt = this.db.prepare('INSERT OR REPLACE INTO voice_sessions (guild_id, user_id, channel_id, joined_at) VALUES (?, ?, ?, ?)');
    return stmt.run(guildId, userId, channelId, new Date().toISOString());
  }

  getVoiceSession(guildId, userId) {
    return this.db.prepare('SELECT * FROM voice_sessions WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
  }

  clearVoiceSession(guildId, userId) {
    return this.db.prepare('DELETE FROM voice_sessions WHERE guild_id = ? AND user_id = ?').run(guildId, userId);
  }

  upsertShopItem(guildId, item) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO shop_items (key, guild_id, name, description, type, price_coins, price_cp, min_level, payload, enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      item.key,
      guildId,
      item.name,
      item.description || '',
      item.type,
      item.priceCoins || 0,
      item.priceCp || 0,
      item.minLevel || 0,
      JSON.stringify(item.payload || {}),
      item.enabled === false ? 0 : 1
    );
  }

  getShopItems(guildId) {
    return this.db.prepare('SELECT * FROM shop_items WHERE guild_id = ? AND enabled = 1 ORDER BY price_coins ASC, name ASC')
      .all(guildId)
      .map(item => ({ ...item, enabled: Boolean(item.enabled), payload: this.parseJSON(item.payload, {}) }));
  }

  getShopItem(guildId, key) {
    const item = this.db.prepare('SELECT * FROM shop_items WHERE guild_id = ? AND key = ? AND enabled = 1').get(guildId, key);
    if (!item) return null;
    return { ...item, enabled: Boolean(item.enabled), payload: this.parseJSON(item.payload, {}) };
  }

  addInventoryItem(guildId, userId, itemKey, quantity = 1) {
    const stmt = this.db.prepare(`
      INSERT INTO inventory (guild_id, user_id, item_key, quantity)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(guild_id, user_id, item_key)
      DO UPDATE SET quantity = quantity + excluded.quantity
    `);
    return stmt.run(guildId, userId, itemKey, quantity);
  }

  getInventory(guildId, userId) {
    return this.db.prepare(`
      SELECT i.item_key, i.quantity, i.purchased_at, s.name, s.description, s.type, s.payload
      FROM inventory i
      LEFT JOIN shop_items s ON s.key = i.item_key AND s.guild_id = i.guild_id
      WHERE i.guild_id = ? AND i.user_id = ?
      ORDER BY i.purchased_at DESC
    `).all(guildId, userId).map(item => ({ ...item, payload: this.parseJSON(item.payload, {}) }));
  }

  upsertCreature(guildId, creature) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO creatures (
        key, guild_id, name, element, rarity, description, capture_cost_coins, capture_cost_cp, success_rate, enabled
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      creature.key,
      guildId,
      creature.name,
      creature.element || 'Neutral',
      creature.rarity || 'Common',
      creature.description || '',
      creature.captureCostCoins || 0,
      creature.captureCostCp || 0,
      creature.successRate || 50,
      creature.enabled === false ? 0 : 1
    );
  }

  getCreatures(guildId) {
    return this.db.prepare('SELECT * FROM creatures WHERE guild_id = ? AND enabled = 1 ORDER BY capture_cost_cp ASC, name ASC').all(guildId);
  }

  getCreature(guildId, key) {
    return this.db.prepare('SELECT * FROM creatures WHERE guild_id = ? AND key = ? AND enabled = 1').get(guildId, key);
  }

  addUserCreature(guildId, userId, creatureKey) {
    const stmt = this.db.prepare(`
      INSERT INTO user_creatures (guild_id, user_id, creature_key, quantity)
      VALUES (?, ?, ?, 1)
      ON CONFLICT(guild_id, user_id, creature_key)
      DO UPDATE SET quantity = quantity + 1
    `);
    return stmt.run(guildId, userId, creatureKey);
  }

  getUserCreatures(guildId, userId) {
    return this.db.prepare(`
      SELECT uc.creature_key, uc.quantity, uc.captured_at, c.name, c.element, c.rarity, c.description
      FROM user_creatures uc
      LEFT JOIN creatures c ON c.key = uc.creature_key AND c.guild_id = uc.guild_id
      WHERE uc.guild_id = ? AND uc.user_id = ?
      ORDER BY c.rarity DESC, c.name ASC
    `).all(guildId, userId);
  }
}

module.exports = RoguePokeDB;
