const Database = require('better-sqlite3');
const path = require('path');

class RoguePokeDB {
  constructor() {
    this.db = new Database(process.env.DATABASE_PATH || path.join(__dirname, '../../roguepoke.db'));
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
        message_count INTEGER DEFAULT 0,
        voice_minutes INTEGER DEFAULT 0,
        daily_streak INTEGER DEFAULT 0,
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
        priority TEXT DEFAULT 'normal',
        status TEXT DEFAULT 'open',
        claimed_by TEXT,
        subject TEXT,
        intake TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        closed_at DATETIME,
        closed_by TEXT,
        close_reason TEXT,
        reopened_at DATETIME
      );

      CREATE TABLE IF NOT EXISTS ticket_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        ticket_id INTEGER NOT NULL,
        channel_id TEXT NOT NULL,
        author_id TEXT NOT NULL,
        note TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ticket_id) REFERENCES tickets(id)
      );

      CREATE TABLE IF NOT EXISTS moderation (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT,
        case_number INTEGER,
        case_id TEXT,
        user_id TEXT,
        moderator_id TEXT,
        action TEXT,
        reason TEXT,
        duration INTEGER,
        status TEXT DEFAULT 'open',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
        category TEXT DEFAULT 'general',
        type TEXT NOT NULL,
        price_coins INTEGER DEFAULT 0,
        price_cp INTEGER DEFAULT 0,
        min_level INTEGER DEFAULT 0,
        stock INTEGER,
        available_until DATETIME,
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

      CREATE TABLE IF NOT EXISTS quest_progress (
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        quest_key TEXT NOT NULL,
        period_key TEXT NOT NULL,
        progress INTEGER DEFAULT 0,
        completed INTEGER DEFAULT 0,
        claimed INTEGER DEFAULT 0,
        completed_at DATETIME,
        claimed_at DATETIME,
        PRIMARY KEY (guild_id, user_id, quest_key, period_key)
      );

      CREATE TABLE IF NOT EXISTS event_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        category TEXT NOT NULL,
        event_type TEXT NOT NULL,
        actor_id TEXT,
        target_id TEXT,
        channel_id TEXT,
        summary TEXT NOT NULL,
        details TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const levelRewardColumns = this.db.prepare('PRAGMA table_info(level_rewards)').all().map(column => column.name);
    if (!levelRewardColumns.includes('badge_key')) {
      this.db.exec('ALTER TABLE level_rewards ADD COLUMN badge_key TEXT');
    }

    this.ensureColumn('users', 'cp', 'INTEGER DEFAULT 0');
    this.ensureColumn('users', 'message_count', 'INTEGER DEFAULT 0');
    this.ensureColumn('users', 'voice_minutes', 'INTEGER DEFAULT 0');
    this.ensureColumn('users', 'daily_streak', 'INTEGER DEFAULT 0');
    this.ensureColumn('shop_items', 'price_cp', 'INTEGER DEFAULT 0');
    this.ensureColumn('shop_items', 'category', "TEXT DEFAULT 'general'");
    this.ensureColumn('shop_items', 'stock', 'INTEGER');
    this.ensureColumn('shop_items', 'available_until', 'DATETIME');
    this.ensureColumn('moderation', 'case_number', 'INTEGER');
    this.ensureColumn('moderation', 'case_id', 'TEXT');
    this.ensureColumn('moderation', 'status', "TEXT DEFAULT 'open'");
    this.ensureColumn('moderation', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
    this.ensureColumn('tickets', 'priority', "TEXT DEFAULT 'normal'");
    this.ensureColumn('tickets', 'claimed_by', 'TEXT');
    this.ensureColumn('tickets', 'subject', 'TEXT');
    this.ensureColumn('tickets', 'intake', "TEXT DEFAULT '{}'");
    this.ensureColumn('tickets', 'closed_by', 'TEXT');
    this.ensureColumn('tickets', 'close_reason', 'TEXT');
    this.ensureColumn('tickets', 'reopened_at', 'DATETIME');

    this.backfillModerationCases();

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
        message_count INTEGER DEFAULT 0,
        voice_minutes INTEGER DEFAULT 0,
        daily_streak INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id, guild_id),
        FOREIGN KEY (guild_id) REFERENCES guilds(id)
      );

      INSERT OR IGNORE INTO users_new (
        id, guild_id, username, xp, level, coins, cp, last_daily, last_weekly, last_work, warnings, verified, message_count, voice_minutes, daily_streak, created_at
      )
      SELECT id, guild_id, username, xp, level, coins, COALESCE(cp, 0), last_daily, last_weekly, last_work, warnings, verified, COALESCE(message_count, 0), COALESCE(voice_minutes, 0), COALESCE(daily_streak, 0), created_at
      FROM users
      WHERE id IS NOT NULL AND guild_id IS NOT NULL;

      DROP TABLE users;
      ALTER TABLE users_new RENAME TO users;
    `);
  }

  backfillModerationCases() {
    const rows = this.db.prepare(`
      SELECT id, guild_id
      FROM moderation
      WHERE case_number IS NULL OR case_id IS NULL
      ORDER BY guild_id ASC, id ASC
    `).all();

    const nextByGuild = new Map();
    for (const row of rows) {
      if (!nextByGuild.has(row.guild_id)) {
        const current = this.db.prepare('SELECT COALESCE(MAX(case_number), 0) as max FROM moderation WHERE guild_id = ?').get(row.guild_id);
        nextByGuild.set(row.guild_id, Number(current?.max || 0));
      }

      const next = nextByGuild.get(row.guild_id) + 1;
      nextByGuild.set(row.guild_id, next);
      this.db.prepare('UPDATE moderation SET case_number = ?, case_id = ? WHERE id = ?')
        .run(next, this.formatCaseId(next), row.id);
    }
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

  setVerified(userId, guildId, verified = true) {
    const stmt = this.db.prepare('UPDATE users SET verified = ? WHERE id = ? AND guild_id = ?');
    return stmt.run(verified ? 1 : 0, userId, guildId);
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

  incrementMessageCount(userId, guildId, amount = 1) {
    const stmt = this.db.prepare('UPDATE users SET message_count = message_count + ? WHERE id = ? AND guild_id = ?');
    return stmt.run(amount, userId, guildId);
  }

  addVoiceMinutes(userId, guildId, minutes) {
    const stmt = this.db.prepare('UPDATE users SET voice_minutes = voice_minutes + ? WHERE id = ? AND guild_id = ?');
    return stmt.run(Math.max(0, minutes), userId, guildId);
  }

  getUserRank(guildId, userId, column = 'xp') {
    const safeColumn = ['xp', 'coins', 'cp', 'voice_minutes', 'message_count'].includes(column) ? column : 'xp';
    const user = this.getUser(userId, guildId);
    if (!user) return null;

    const row = this.db.prepare(`
      SELECT COUNT(*) + 1 as rank
      FROM users
      WHERE guild_id = ? AND ${safeColumn} > ?
    `).get(guildId, user[safeColumn] || 0);

    return row?.rank || 1;
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

  createTicket(guildId, channelId, userId, category, details = {}) {
    const stmt = this.db.prepare(`
      INSERT INTO tickets (guild_id, channel_id, user_id, category, priority, subject, intake)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      guildId,
      channelId,
      userId,
      category,
      details.priority || 'normal',
      details.subject || null,
      JSON.stringify(details.intake || {})
    );
    const ticket = this.db.prepare('SELECT * FROM tickets WHERE id = ?').get(result.lastInsertRowid);
    this.addEventLog({
      guildId,
      category: 'tickets',
      eventType: 'ticket_created',
      actorId: userId,
      targetId: userId,
      channelId,
      summary: `Ticket #${ticket.id} criado em ${category}`,
      details: { ticketId: ticket.id, category, priority: ticket.priority, subject: ticket.subject }
    });
    return ticket;
  }

  getTicket(channelId) {
    const ticket = this.db.prepare("SELECT * FROM tickets WHERE channel_id = ? AND status IN ('open', 'pending', 'closed') ORDER BY id DESC LIMIT 1").get(channelId);
    if (!ticket) return null;
    return { ...ticket, intake: this.parseJSON(ticket.intake, {}) };
  }

  closeTicket(channelId, closedBy = null, reason = null) {
    const ticket = this.getTicket(channelId);
    const stmt = this.db.prepare("UPDATE tickets SET status = 'closed', closed_by = ?, close_reason = ?, closed_at = CURRENT_TIMESTAMP WHERE channel_id = ?");
    const result = stmt.run(closedBy, reason, channelId);
    if (ticket) {
      this.addEventLog({
        guildId: ticket.guild_id,
        category: 'tickets',
        eventType: 'ticket_closed',
        actorId: closedBy,
        targetId: ticket.user_id,
        channelId,
        summary: `Ticket #${ticket.id} fechado`,
        details: { ticketId: ticket.id, reason }
      });
    }
    return result;
  }

  reopenTicket(channelId) {
    const ticket = this.getTicket(channelId);
    const stmt = this.db.prepare("UPDATE tickets SET status = 'open', reopened_at = CURRENT_TIMESTAMP WHERE channel_id = ?");
    const result = stmt.run(channelId);
    if (ticket) {
      this.addEventLog({
        guildId: ticket.guild_id,
        category: 'tickets',
        eventType: 'ticket_reopened',
        targetId: ticket.user_id,
        channelId,
        summary: `Ticket #${ticket.id} reaberto`,
        details: { ticketId: ticket.id }
      });
    }
    return result;
  }

  claimTicket(channelId, userId) {
    const ticket = this.getTicket(channelId);
    const stmt = this.db.prepare("UPDATE tickets SET claimed_by = ?, status = CASE WHEN status = 'closed' THEN status ELSE 'pending' END WHERE channel_id = ?");
    const result = stmt.run(userId, channelId);
    if (ticket) {
      this.addEventLog({
        guildId: ticket.guild_id,
        category: 'tickets',
        eventType: 'ticket_claimed',
        actorId: userId,
        targetId: ticket.user_id,
        channelId,
        summary: `Ticket #${ticket.id} assumido`,
        details: { ticketId: ticket.id }
      });
    }
    return result;
  }

  updateTicketStatus(channelId, status) {
    const ticket = this.getTicket(channelId);
    const stmt = this.db.prepare('UPDATE tickets SET status = ? WHERE channel_id = ?');
    const result = stmt.run(status, channelId);
    if (ticket) {
      this.addEventLog({
        guildId: ticket.guild_id,
        category: 'tickets',
        eventType: 'ticket_status_changed',
        targetId: ticket.user_id,
        channelId,
        summary: `Ticket #${ticket.id} alterado para ${status}`,
        details: { ticketId: ticket.id, status }
      });
    }
    return result;
  }

  updateTicketPriority(channelId, priority) {
    const ticket = this.getTicket(channelId);
    const stmt = this.db.prepare('UPDATE tickets SET priority = ? WHERE channel_id = ?');
    const result = stmt.run(priority, channelId);
    if (ticket) {
      this.addEventLog({
        guildId: ticket.guild_id,
        category: 'tickets',
        eventType: 'ticket_priority_changed',
        targetId: ticket.user_id,
        channelId,
        summary: `Ticket #${ticket.id} prioridade ${priority}`,
        details: { ticketId: ticket.id, priority }
      });
    }
    return result;
  }

  updateTicketCategory(channelId, category) {
    const ticket = this.getTicket(channelId);
    const stmt = this.db.prepare('UPDATE tickets SET category = ? WHERE channel_id = ?');
    const result = stmt.run(category, channelId);
    if (ticket) {
      this.addEventLog({
        guildId: ticket.guild_id,
        category: 'tickets',
        eventType: 'ticket_category_changed',
        targetId: ticket.user_id,
        channelId,
        summary: `Ticket #${ticket.id} transferido para ${category}`,
        details: { ticketId: ticket.id, category }
      });
    }
    return result;
  }

  addTicketNote(guildId, channelId, authorId, note) {
    const ticket = this.getTicket(channelId);
    if (!ticket) return null;
    const result = this.db.prepare(`
      INSERT INTO ticket_notes (guild_id, ticket_id, channel_id, author_id, note)
      VALUES (?, ?, ?, ?, ?)
    `).run(guildId, ticket.id, channelId, authorId, note);
    const saved = this.db.prepare('SELECT * FROM ticket_notes WHERE id = ?').get(result.lastInsertRowid);
    this.addEventLog({
      guildId,
      category: 'tickets',
      eventType: 'ticket_note_added',
      actorId: authorId,
      targetId: ticket.user_id,
      channelId,
      summary: `Nota adicionada ao ticket #${ticket.id}`,
      details: { ticketId: ticket.id }
    });
    return saved;
  }

  getTicketNotes(channelId) {
    return this.db.prepare('SELECT * FROM ticket_notes WHERE channel_id = ? ORDER BY created_at ASC').all(channelId);
  }

  getUserTickets(guildId, userId) {
    return this.db.prepare("SELECT * FROM tickets WHERE guild_id = ? AND user_id = ? AND status IN ('open', 'pending')").all(guildId, userId);
  }

  formatCaseId(caseNumber) {
    return `CASE-${String(caseNumber).padStart(5, '0')}`;
  }

  nextCaseNumber(guildId) {
    const row = this.db.prepare('SELECT COALESCE(MAX(case_number), 0) + 1 as next FROM moderation WHERE guild_id = ?').get(guildId);
    return Number(row?.next || 1);
  }

  addModAction(guildId, userId, moderatorId, action, reason, duration = null, status = 'open') {
    const caseNumber = this.nextCaseNumber(guildId);
    const caseId = this.formatCaseId(caseNumber);
    const stmt = this.db.prepare(`
      INSERT INTO moderation (guild_id, case_number, case_id, user_id, moderator_id, action, reason, duration, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(guildId, caseNumber, caseId, userId, moderatorId, action, reason, duration, status);
    const modCase = this.getModCase(guildId, caseId);
    this.addEventLog({
      guildId,
      category: 'moderation',
      eventType: action,
      actorId: moderatorId,
      targetId: userId,
      summary: `${caseId}: ${action} aplicado`,
      details: { caseId, reason, duration, status }
    });
    return modCase;
  }

  addEventLog({ guildId, category, eventType, actorId = null, targetId = null, channelId = null, summary, details = {} }) {
    if (!guildId || !category || !eventType || !summary) return null;
    const result = this.db.prepare(`
      INSERT INTO event_logs (guild_id, category, event_type, actor_id, target_id, channel_id, summary, details)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(guildId, category, eventType, actorId, targetId, channelId, summary, JSON.stringify(details || {}));
    return this.db.prepare('SELECT * FROM event_logs WHERE id = ?').get(result.lastInsertRowid);
  }

  getEventLogs(guildId, category = null, limit = 100) {
    const params = [guildId];
    const filters = ['guild_id = ?'];
    if (category) {
      filters.push('category = ?');
      params.push(category);
    }
    params.push(limit);

    return this.db.prepare(`
      SELECT * FROM event_logs
      WHERE ${filters.join(' AND ')}
      ORDER BY id DESC
      LIMIT ?
    `).all(...params).map(row => ({ ...row, details: this.parseJSON(row.details, {}) }));
  }

  getUserWarnings(guildId, userId) {
    return this.db.prepare('SELECT COUNT(*) as count FROM moderation WHERE guild_id = ? AND user_id = ? AND action = ?').get(guildId, userId, 'warn');
  }

  getModHistory(guildId, userId, limit = 10) {
    return this.db.prepare('SELECT * FROM moderation WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT ?').all(guildId, userId, limit);
  }

  getModCase(guildId, caseIdOrNumber) {
    const value = String(caseIdOrNumber || '').trim().toUpperCase();
    const caseNumber = Number(value.replace(/^CASE-?/, ''));
    if (Number.isFinite(caseNumber) && caseNumber > 0) {
      return this.db.prepare('SELECT * FROM moderation WHERE guild_id = ? AND case_number = ?').get(guildId, caseNumber);
    }
    return this.db.prepare('SELECT * FROM moderation WHERE guild_id = ? AND UPPER(case_id) = ?').get(guildId, value);
  }

  getModCases(guildId, filters = {}) {
    const clauses = ['guild_id = ?'];
    const params = [guildId];

    if (filters.userId) {
      clauses.push('user_id = ?');
      params.push(filters.userId);
    }
    if (filters.action) {
      clauses.push('action = ?');
      params.push(filters.action);
    }
    if (filters.status) {
      clauses.push('status = ?');
      params.push(filters.status);
    }

    const limit = Math.max(1, Math.min(Number(filters.limit || 10), 50));
    params.push(limit);
    return this.db.prepare(`
      SELECT * FROM moderation
      WHERE ${clauses.join(' AND ')}
      ORDER BY case_number DESC
      LIMIT ?
    `).all(...params);
  }

  updateModCaseReason(guildId, caseIdOrNumber, moderatorId, reason) {
    const modCase = this.getModCase(guildId, caseIdOrNumber);
    if (!modCase) return null;

    this.db.prepare(`
      UPDATE moderation
      SET reason = ?, moderator_id = COALESCE(?, moderator_id), updated_at = CURRENT_TIMESTAMP
      WHERE guild_id = ? AND case_number = ?
    `).run(reason, moderatorId, guildId, modCase.case_number);

    return this.getModCase(guildId, modCase.case_number);
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
      INSERT OR REPLACE INTO shop_items (key, guild_id, name, description, category, type, price_coins, price_cp, min_level, stock, available_until, payload, enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      item.key,
      guildId,
      item.name,
      item.description || '',
      item.category || 'general',
      item.type,
      item.priceCoins || 0,
      item.priceCp || 0,
      item.minLevel || 0,
      item.stock ?? null,
      item.availableUntil || null,
      JSON.stringify(item.payload || {}),
      item.enabled === false ? 0 : 1
    );
  }

  getShopItems(guildId, category = null) {
    const params = [guildId];
    const filters = ["guild_id = ?", "enabled = 1", "(available_until IS NULL OR datetime(available_until) > datetime('now'))", "(stock IS NULL OR stock > 0)"];
    if (category) {
      filters.push('category = ?');
      params.push(category);
    }
    return this.db.prepare(`SELECT * FROM shop_items WHERE ${filters.join(' AND ')} ORDER BY category ASC, price_coins ASC, name ASC`)
      .all(...params)
      .map(item => ({ ...item, enabled: Boolean(item.enabled), payload: this.parseJSON(item.payload, {}) }));
  }

  getShopItem(guildId, key) {
    const item = this.db.prepare(`
      SELECT * FROM shop_items
      WHERE guild_id = ? AND key = ? AND enabled = 1
        AND (available_until IS NULL OR datetime(available_until) > datetime('now'))
        AND (stock IS NULL OR stock > 0)
    `).get(guildId, key);
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

  decrementShopStock(guildId, itemKey, quantity = 1) {
    return this.db.prepare('UPDATE shop_items SET stock = CASE WHEN stock IS NULL THEN NULL ELSE MAX(0, stock - ?) END WHERE guild_id = ? AND key = ?')
      .run(quantity, guildId, itemKey);
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

  getQuestProgress(guildId, userId, periodKey) {
    return this.db.prepare('SELECT * FROM quest_progress WHERE guild_id = ? AND user_id = ? AND period_key = ?')
      .all(guildId, userId, periodKey);
  }

  getQuestProgressRow(guildId, userId, questKey, periodKey) {
    return this.db.prepare('SELECT * FROM quest_progress WHERE guild_id = ? AND user_id = ? AND quest_key = ? AND period_key = ?')
      .get(guildId, userId, questKey, periodKey);
  }

  incrementQuestProgress(guildId, userId, questKey, periodKey, amount, target) {
    this.db.prepare(`
      INSERT OR IGNORE INTO quest_progress (guild_id, user_id, quest_key, period_key)
      VALUES (?, ?, ?, ?)
    `).run(guildId, userId, questKey, periodKey);

    this.db.prepare(`
      UPDATE quest_progress
      SET progress = MIN(?, progress + ?),
          completed = CASE WHEN MIN(?, progress + ?) >= ? THEN 1 ELSE completed END,
          completed_at = CASE WHEN MIN(?, progress + ?) >= ? AND completed_at IS NULL THEN CURRENT_TIMESTAMP ELSE completed_at END
      WHERE guild_id = ? AND user_id = ? AND quest_key = ? AND period_key = ? AND claimed = 0
    `).run(target, amount, target, amount, target, target, amount, target, guildId, userId, questKey, periodKey);

    return this.getQuestProgressRow(guildId, userId, questKey, periodKey);
  }

  claimQuest(guildId, userId, questKey, periodKey) {
    const row = this.getQuestProgressRow(guildId, userId, questKey, periodKey);
    if (!row || !row.completed || row.claimed) return null;
    this.db.prepare(`
      UPDATE quest_progress
      SET claimed = 1, claimed_at = CURRENT_TIMESTAMP
      WHERE guild_id = ? AND user_id = ? AND quest_key = ? AND period_key = ?
    `).run(guildId, userId, questKey, periodKey);
    return this.getQuestProgressRow(guildId, userId, questKey, periodKey);
  }
}

module.exports = RoguePokeDB;
