const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  PermissionFlagsBits,
} = require('discord.js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Database = require('../database/database');
const blueprint = require('../config/server-blueprint.json');
const ticketsModule = require('../modules/tickets');

const dryRun = process.argv.includes('--dry-run');
const refreshPanels = process.argv.includes('--refresh-panels');
const refreshInfo = process.argv.includes('--refresh-info');

const token = process.env.DISCORD_TOKEN;
const guildId = process.env.GUILD_ID;
const ownerUserId = process.env.OWNER_USER_ID;

if (!token || !guildId) {
  console.error('Missing DISCORD_TOKEN or GUILD_ID in discord-bot/.env');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

const db = new Database();

const state = {
  roles: new Map(),
  channels: new Map(),
  categories: new Map()
};

function log(message) {
  console.log(`${dryRun ? '[dry-run] ' : ''}${message}`);
}

function normalizeName(name) {
  return name.toLowerCase();
}

function permissionsFromNames(names) {
  return names
    .map(name => PermissionFlagsBits[name])
    .filter(Boolean);
}

function mergeOverwrites(overwrites) {
  const merged = new Map();

  for (const overwrite of overwrites) {
    const current = merged.get(overwrite.id) || { id: overwrite.id, allow: [], deny: [] };
    current.allow.push(...(overwrite.allow || []));
    current.deny.push(...(overwrite.deny || []));
    merged.set(overwrite.id, current);
  }

  return [...merged.values()].map(overwrite => ({
    id: overwrite.id,
    allow: [...new Set(overwrite.allow)].filter(permission => !new Set(overwrite.deny).has(permission)),
    deny: [...new Set(overwrite.deny)]
  }));
}

async function findOrCreateRole(guild, roleData) {
  const existing = guild.roles.cache.find(role => normalizeName(role.name) === normalizeName(roleData.name));
  if (existing) {
    state.roles.set(roleData.key, existing);
    log(`role exists: ${roleData.name}`);
    return existing;
  }

  if (dryRun) {
    log(`would create role: ${roleData.name}`);
    return null;
  }

  const role = await guild.roles.create({
    name: roleData.name,
    colors: { primaryColor: roleData.color },
    permissions: permissionsFromNames(roleData.permissions || []),
    hoist: Boolean(roleData.hoist),
    mentionable: Boolean(roleData.mentionable),
    reason: 'RoguePoke server structure setup'
  });

  state.roles.set(roleData.key, role);
  log(`role created: ${role.name}`);
  return role;
}

function staffRoleIds() {
  return ['admin', 'moderator', 'developer']
    .map(key => state.roles.get(key)?.id)
    .filter(Boolean);
}

function baseOverwrites(guild, categoryData, channelData) {
  const overwrites = [];
  const everyoneId = guild.roles.everyone.id;
  const member = state.roles.get('member');
  const muted = state.roles.get('muted');
  const visibilityRole = categoryData.visibilityRole && categoryData.restrictToRole
    ? state.roles.get(categoryData.visibilityRole)
    : null;
  const isStaffOnly = Boolean(categoryData.staffOnly || channelData.staffOnly);
  const isPublic = Boolean(channelData.public);
  const isPublicView = Boolean(categoryData.publicView || channelData.publicView);
  const isMemberOnly = Boolean(channelData.memberOnly || (!isPublic && !visibilityRole && !isStaffOnly));

  if (isStaffOnly) {
    overwrites.push({ id: everyoneId, deny: [PermissionFlagsBits.ViewChannel] });
    if (member) overwrites.push({ id: member.id, deny: [PermissionFlagsBits.ViewChannel] });
    for (const roleId of staffRoleIds()) {
      overwrites.push({
        id: roleId,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
      });
    }
  } else if (visibilityRole) {
    overwrites.push({ id: everyoneId, deny: [PermissionFlagsBits.ViewChannel] });
    if (member) overwrites.push({ id: member.id, deny: [PermissionFlagsBits.ViewChannel] });
    overwrites.push({
      id: visibilityRole.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak]
    });
    for (const roleId of staffRoleIds()) {
      overwrites.push({ id: roleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory] });
    }
  } else if (member && isPublicView && isMemberOnly) {
    overwrites.push({
      id: everyoneId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
      deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.CreatePublicThreads, PermissionFlagsBits.SendMessagesInThreads]
    });
    overwrites.push({
      id: member.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.CreatePublicThreads,
        PermissionFlagsBits.SendMessagesInThreads
      ]
    });
    for (const roleId of staffRoleIds()) {
      overwrites.push({ id: roleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
    }
  } else if (member && isMemberOnly) {
    overwrites.push({ id: everyoneId, deny: [PermissionFlagsBits.ViewChannel] });
    overwrites.push({
      id: member.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak]
    });
    for (const roleId of staffRoleIds()) {
      overwrites.push({ id: roleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
    }
  }

  if (channelData.locked) {
    const lockedDenies = [
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.CreatePublicThreads,
      PermissionFlagsBits.CreatePrivateThreads,
      PermissionFlagsBits.SendMessagesInThreads
    ];
    overwrites.push({ id: everyoneId, deny: lockedDenies });
    if (member) overwrites.push({ id: member.id, deny: lockedDenies });
    if (visibilityRole) overwrites.push({ id: visibilityRole.id, deny: lockedDenies });
    for (const roleId of staffRoleIds()) {
      overwrites.push({ id: roleId, allow: lockedDenies });
    }
  }

  if (muted) {
    overwrites.push({
      id: muted.id,
      deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions, PermissionFlagsBits.Speak]
    });
  }

  return mergeOverwrites(overwrites);
}

function categoryOverwrites(guild, categoryData) {
  return baseOverwrites(guild, categoryData, {
    key: `category:${categoryData.name}`,
    public: !categoryData.staffOnly && !categoryData.visibilityRole,
    staffOnly: categoryData.staffOnly,
    memberOnly: Boolean(categoryData.visibilityRole)
  });
}

async function syncChannelSettings(channel, guild, category, categoryData, channelData) {
  if (dryRun) {
    log(`would sync permissions: ${channelData.name}`);
    return;
  }

  const edits = {};
  if (category && channel.parentId !== category.id) edits.parent = category.id;
  if ((channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildForum) && channelData.topic && channel.topic !== channelData.topic) {
    edits.topic = channelData.topic;
  }

  if (channel.type === ChannelType.GuildForum) {
    const forumEdits = forumSettings(channelData);
    Object.assign(edits, forumEdits);
  }

  if (Object.keys(edits).length > 0) {
    await channel.edit({ ...edits, reason: 'RoguePoke permission sync' }).catch(error => {
      console.error(`Error editing channel ${channel.name}:`, error.message);
    });
  }

  const overwrites = baseOverwrites(guild, categoryData, channelData);
  for (const overwrite of overwrites) {
    await channel.permissionOverwrites.edit(overwrite.id, {
      ViewChannel: overwrite.allow.includes(PermissionFlagsBits.ViewChannel) ? true : overwrite.deny.includes(PermissionFlagsBits.ViewChannel) ? false : null,
      SendMessages: overwrite.allow.includes(PermissionFlagsBits.SendMessages) ? true : overwrite.deny.includes(PermissionFlagsBits.SendMessages) ? false : null,
      ReadMessageHistory: overwrite.allow.includes(PermissionFlagsBits.ReadMessageHistory) ? true : overwrite.deny.includes(PermissionFlagsBits.ReadMessageHistory) ? false : null,
      Connect: overwrite.allow.includes(PermissionFlagsBits.Connect) ? true : overwrite.deny.includes(PermissionFlagsBits.Connect) ? false : null,
      Speak: overwrite.allow.includes(PermissionFlagsBits.Speak) ? true : overwrite.deny.includes(PermissionFlagsBits.Speak) ? false : null,
      AddReactions: overwrite.allow.includes(PermissionFlagsBits.AddReactions) ? true : overwrite.deny.includes(PermissionFlagsBits.AddReactions) ? false : null,
      CreatePublicThreads: overwrite.allow.includes(PermissionFlagsBits.CreatePublicThreads) ? true : overwrite.deny.includes(PermissionFlagsBits.CreatePublicThreads) ? false : null,
      CreatePrivateThreads: overwrite.allow.includes(PermissionFlagsBits.CreatePrivateThreads) ? true : overwrite.deny.includes(PermissionFlagsBits.CreatePrivateThreads) ? false : null,
      SendMessagesInThreads: overwrite.allow.includes(PermissionFlagsBits.SendMessagesInThreads) ? true : overwrite.deny.includes(PermissionFlagsBits.SendMessagesInThreads) ? false : null
    }).catch(error => {
      console.error(`Error syncing overwrite for ${channel.name}:`, error.message);
    });
  }

  log(`permissions synced: ${channel.name}`);
}

function forumSettings(channelData) {
  const settings = {};

  if (Array.isArray(channelData.tags)) {
    settings.availableTags = channelData.tags.slice(0, 20).map(tag => ({
      name: tag.name,
      moderated: Boolean(tag.moderated),
      emoji: tag.emoji ? { name: tag.emoji } : undefined
    }));
  }

  if (channelData.defaultReactionEmoji) {
    settings.defaultReactionEmoji = { name: channelData.defaultReactionEmoji };
  }

  settings.defaultAutoArchiveDuration = channelData.defaultAutoArchiveDuration || 10080;
  settings.rateLimitPerUser = channelData.rateLimitPerUser || 30;

  return settings;
}

async function findOrCreateCategory(guild, categoryData) {
  const existing = guild.channels.cache.find(
    channel => channel.type === ChannelType.GuildCategory && normalizeName(channel.name) === normalizeName(categoryData.name)
  );
  if (existing) {
    state.categories.set(categoryData.name, existing);
    log(`category exists: ${categoryData.name}`);
    await syncCategorySettings(existing, guild, categoryData);
    return existing;
  }

  if (dryRun) {
    log(`would create category: ${categoryData.name}`);
    return null;
  }

  const category = await guild.channels.create({
    name: categoryData.name,
    type: ChannelType.GuildCategory,
    permissionOverwrites: categoryOverwrites(guild, categoryData),
    reason: 'RoguePoke server structure setup'
  });

  state.categories.set(categoryData.name, category);
  log(`category created: ${category.name}`);
  return category;
}

async function syncCategorySettings(category, guild, categoryData) {
  if (dryRun) {
    log(`would sync category permissions: ${categoryData.name}`);
    return;
  }

  const overwrites = categoryOverwrites(guild, categoryData);
  for (const overwrite of overwrites) {
    await category.permissionOverwrites.edit(overwrite.id, {
      ViewChannel: overwrite.allow.includes(PermissionFlagsBits.ViewChannel) ? true : overwrite.deny.includes(PermissionFlagsBits.ViewChannel) ? false : null,
      SendMessages: overwrite.allow.includes(PermissionFlagsBits.SendMessages) ? true : overwrite.deny.includes(PermissionFlagsBits.SendMessages) ? false : null,
      ReadMessageHistory: overwrite.allow.includes(PermissionFlagsBits.ReadMessageHistory) ? true : overwrite.deny.includes(PermissionFlagsBits.ReadMessageHistory) ? false : null,
      Connect: overwrite.allow.includes(PermissionFlagsBits.Connect) ? true : overwrite.deny.includes(PermissionFlagsBits.Connect) ? false : null,
      Speak: overwrite.allow.includes(PermissionFlagsBits.Speak) ? true : overwrite.deny.includes(PermissionFlagsBits.Speak) ? false : null,
      AddReactions: overwrite.allow.includes(PermissionFlagsBits.AddReactions) ? true : overwrite.deny.includes(PermissionFlagsBits.AddReactions) ? false : null,
      CreatePublicThreads: overwrite.allow.includes(PermissionFlagsBits.CreatePublicThreads) ? true : overwrite.deny.includes(PermissionFlagsBits.CreatePublicThreads) ? false : null,
      CreatePrivateThreads: overwrite.allow.includes(PermissionFlagsBits.CreatePrivateThreads) ? true : overwrite.deny.includes(PermissionFlagsBits.CreatePrivateThreads) ? false : null,
      SendMessagesInThreads: overwrite.allow.includes(PermissionFlagsBits.SendMessagesInThreads) ? true : overwrite.deny.includes(PermissionFlagsBits.SendMessagesInThreads) ? false : null
    }).catch(error => {
      console.error(`Error syncing category ${category.name}:`, error.message);
    });
  }

  log(`category permissions synced: ${category.name}`);
}

async function findOrCreateChannel(guild, category, categoryData, channelData) {
  const type = channelData.type === 'voice'
    ? ChannelType.GuildVoice
    : channelData.type === 'forum'
      ? ChannelType.GuildForum
      : ChannelType.GuildText;
  const sameName = guild.channels.cache.filter(channel => normalizeName(channel.name) === normalizeName(channelData.name));
  const existing = sameName.find(channel => channel.type === type);

  if (existing) {
    state.channels.set(channelData.key, existing);
    log(`channel exists: ${channelData.name}`);
    await syncChannelSettings(existing, guild, category, categoryData, channelData);
    return existing;
  }

  const incompatible = sameName.first();
  if (incompatible) {
    if (dryRun) {
      log(`would archive incompatible ${channelData.name} before creating ${channelData.type || 'text'} channel`);
    } else {
      const archiveName = `arquivo-${incompatible.name}`.slice(0, 100);
      await incompatible.edit({
        name: archiveName,
        reason: 'Archive incompatible channel type before recreating blueprint channel'
      }).catch(error => {
        console.error(`Error archiving channel ${incompatible.name}:`, error.message);
      });
      await lockArchivedChannel(incompatible, guild);
      log(`channel archived: ${archiveName}`);
    }
  }

  if (dryRun) {
    log(`would create channel: ${channelData.name}`);
    return null;
  }

  const channel = await guild.channels.create({
    name: channelData.name,
    type,
    parent: category?.id ?? null,
    topic: type === ChannelType.GuildText || type === ChannelType.GuildForum ? channelData.topic ?? null : undefined,
    ...(type === ChannelType.GuildForum ? forumSettings(channelData) : {}),
    permissionOverwrites: baseOverwrites(guild, categoryData, channelData),
    reason: 'RoguePoke server structure setup'
  });

  state.channels.set(channelData.key, channel);
  log(`channel created: ${channel.name}`);
  return channel;
}

async function lockArchivedChannel(channel, guild) {
  if (!channel || dryRun) return;

  const member = state.roles.get('member');
  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }
  ];
  if (member) overwrites.push({ id: member.id, deny: [PermissionFlagsBits.ViewChannel] });
  for (const roleId of staffRoleIds()) {
    overwrites.push({
      id: roleId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory]
    });
  }

  for (const overwrite of mergeOverwrites(overwrites)) {
    await channel.permissionOverwrites.edit(overwrite.id, {
      ViewChannel: overwrite.allow.includes(PermissionFlagsBits.ViewChannel) ? true : overwrite.deny.includes(PermissionFlagsBits.ViewChannel) ? false : null,
      SendMessages: overwrite.allow.includes(PermissionFlagsBits.SendMessages) ? true : overwrite.deny.includes(PermissionFlagsBits.SendMessages) ? false : null,
      ReadMessageHistory: overwrite.allow.includes(PermissionFlagsBits.ReadMessageHistory) ? true : overwrite.deny.includes(PermissionFlagsBits.ReadMessageHistory) ? false : null
    }).catch(error => {
      console.error(`Error locking archive ${channel.name}:`, error.message);
    });
  }
}

async function clearRecentBotMessages(channel, reason) {
  if (!channel || dryRun) return;

  const messages = await channel.messages.fetch({ limit: 25 }).catch(() => null);
  if (!messages) return;

  const botMessages = messages.filter(message => message.author.id === client.user.id && !message.pinned);
  for (const message of botMessages.values()) {
    await message.delete().catch(error => {
      console.error(`Could not delete old bot message in #${channel.name}:`, error.message);
    });
  }

  if (botMessages.size > 0) log(`${reason}: removed ${botMessages.size} old bot message(s) in #${channel.name}`);
}

async function cleanupLegacyLanguagePanels(guild, targetChannelId, roleIds) {
  if (!roleIds.length || dryRun) return;

  const placeholders = roleIds.map(() => '?').join(',');
  const rows = db.db.prepare(`
    SELECT DISTINCT channel_id, message_id
    FROM reaction_roles
    WHERE guild_id = ? AND role_id IN (${placeholders}) AND channel_id != ?
  `).all(guild.id, ...roleIds, targetChannelId);

  for (const row of rows) {
    const channel = guild.channels.cache.get(row.channel_id);
    if (!channel?.messages) continue;
    const message = await channel.messages.fetch(row.message_id).catch(() => null);
    if (message?.author?.id === client.user.id) {
      await message.delete().catch(error => {
        console.error(`Could not delete legacy language panel in #${channel.name}:`, error.message);
      });
    }
  }

  db.db.prepare(`
    DELETE FROM reaction_roles
    WHERE guild_id = ? AND role_id IN (${placeholders}) AND channel_id != ?
  `).run(guild.id, ...roleIds, targetChannelId);

  if (rows.length) log(`legacy language panels removed: ${rows.length}`);
}

async function lockExistingArchiveChannels(guild) {
  const archiveChannels = guild.channels.cache.filter(channel => channel.name.startsWith('arquivo-'));
  for (const channel of archiveChannels.values()) {
    await lockArchivedChannel(channel, guild);
    log(`archive locked: ${channel.name}`);
  }
}

async function sendVerificationPanel(guild) {
  const panel = blueprint.panels.verification;
  const channel = state.channels.get(panel.channel);
  const memberRole = state.roles.get('member');
  if (!channel || !memberRole) return;

  const existingConfig = db.getVerificationConfig(guild.id);
  if (existingConfig && !refreshPanels) {
    log('verification panel already configured; use --refresh-panels to send a new one');
    return;
  }

  if (dryRun) {
    log(`would configure verification panel in #${channel.name}`);
    return;
  }

  if (refreshPanels) await clearRecentBotMessages(channel, 'verification refresh');

  db.setVerificationConfig(guild.id, {
    enabled: true,
    channelId: channel.id,
    roleId: memberRole.id,
    captchaEnabled: false,
    buttonLabel: panel.buttonLabel || 'Entrar',
    buttonEmoji: panel.buttonEmoji || null
  });

  const embed = new EmbedBuilder()
    .setColor('#DCFF00')
    .setTitle(panel.title)
    .setDescription(panel.description)
    .setTimestamp();

  const button = new ButtonBuilder()
    .setCustomId('verify_captcha')
    .setLabel(panel.buttonLabel || 'Entrar')
    .setStyle(ButtonStyle.Success);
  if (panel.buttonEmoji) button.setEmoji(panel.buttonEmoji);

  await channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(button)] });
  log(`verification panel sent: #${channel.name}`);
}

async function sendLanguagePanel() {
  const panel = blueprint.panels.language;
  const channel = state.channels.get(panel.channel);
  if (!channel) return;

  const existingRoles = db.db.prepare('SELECT COUNT(*) as count FROM reaction_roles WHERE guild_id = ? AND channel_id = ?').get(channel.guild.id, channel.id);
  if (existingRoles.count > 0 && !refreshPanels) {
    log('language panel already configured; use --refresh-panels to send a new one');
    return;
  }

  if (dryRun) {
    log(`would send language role panel in #${channel.name}`);
    return;
  }

  if (refreshPanels) await clearRecentBotMessages(channel, 'language refresh');

  const roles = panel.roles
    .map(item => ({ ...item, roleObject: state.roles.get(item.role) }))
    .filter(item => item.roleObject);
  await cleanupLegacyLanguagePanels(channel.guild, channel.id, roles.map(item => item.roleObject.id));

  const embed = new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle(panel.title)
    .setDescription(panel.description)
    .setTimestamp();

  const row = new ActionRowBuilder();
  for (const item of roles) {
    const button = new ButtonBuilder()
      .setCustomId(`role_toggle_${item.roleObject.id}`)
      .setLabel(item.label)
      .setStyle(ButtonStyle[item.style] || ButtonStyle.Primary);
    if (item.emoji) button.setEmoji(item.emoji);
    row.addComponents(button);
  }

  const message = await channel.send({ embeds: [embed], components: [row] });
  for (const item of roles) {
    db.addReactionRole(channel.guild.id, channel.id, message.id, item.roleObject.id, null, item.label, item.style, 'button');
  }

  log(`language panel sent: #${channel.name}`);
}

async function sendTicketPanel(guild) {
  const panel = blueprint.panels.ticket;
  const channel = state.channels.get(panel.channel);
  const staffRole = state.roles.get(panel.staffRole);
  if (!channel || !staffRole) return;

  const existingConfig = db.getTicketConfig(guild.id);
  if (existingConfig && !refreshPanels) {
    log('ticket panel already configured; use --refresh-panels to send a new one');
    return;
  }

  if (dryRun) {
    log(`would configure ticket panel in #${channel.name}`);
    return;
  }

  if (refreshPanels) await clearRecentBotMessages(channel, 'ticket refresh');

  db.setTicketConfig(guild.id, {
    enabled: true,
    channelId: channel.id,
    categoryName: panel.categoryName || '🎫 TICKETS',
    staffRoles: [staffRole.id],
    categories: panel.categories
  });

  await ticketsModule.createPanel(channel, { categories: panel.categories });
  log(`ticket panel sent: #${channel.name}`);
}

async function assignOwnerRole(guild) {
  const adminRole = state.roles.get('admin');
  const founderRole = state.roles.get('founder');
  if (!ownerUserId || !adminRole) return;

  if (dryRun) {
    log(`would assign Admin to owner user ${ownerUserId}`);
    return;
  }

  try {
    const member = await guild.members.fetch(ownerUserId);
    if (!member.roles.cache.has(adminRole.id)) {
      await member.roles.add(adminRole, 'RoguePoke owner/admin sync');
    }
    if (founderRole && !member.roles.cache.has(founderRole.id)) {
      await member.roles.add(founderRole, 'RoguePoke founder sync');
    }
    db.createUser(member.id, guild.id, member.user.username);
    db.awardBadge(guild.id, member.id, 'founder');
    log(`owner roles synced: ${member.user.tag}`);
  } catch (error) {
    console.error(`Could not assign Admin to OWNER_USER_ID ${ownerUserId}:`, error.message);
  }
}

async function ensureInfoMessage(channel, key, embed) {
  if (!channel) return;

  if (!refreshInfo) {
    const recent = await channel.messages.fetch({ limit: 50 }).catch(() => null);
    const exists = recent?.some(message =>
      message.author.id === client.user.id &&
      message.embeds.some(existing => existing.footer?.text === key)
    );

    if (exists) {
      log(`info message exists: #${channel.name} ${key}`);
      return;
    }
  }

  if (dryRun) {
    log(`would send info message: #${channel.name} ${key}`);
    return;
  }

  embed.setFooter({ text: key });
  const message = await channel.send({ embeds: [embed] });
  await message.pin('RoguePoke official info message').catch(() => {});
  log(`info message sent: #${channel.name} ${key}`);
}

async function sendInfoMessages(guild) {
  const startChannel = state.channels.get('start_here');
  const rulesChannel = state.channels.get('rules');
  const languageChannel = state.channels.get('language_select');
  const faqChannel = state.channels.get('faq');
  const wikiChannel = state.channels.get('wiki');
  const announcementsChannel = state.channels.get('announcements');
  const changelogChannel = state.channels.get('changelog');
  const supportChannel = state.channels.get('open_ticket');
  const staffDashboard = state.channels.get('staff_dashboard');
  const shopChannel = state.channels.get('shop');
  const purchaseHistoryChannel = state.channels.get('purchase_history');
  const hallOfFameChannel = state.channels.get('hall_of_fame');

  await ensureInfoMessage(startChannel, 'roguepoke:start:v1', new EmbedBuilder()
    .setColor('#DCFF00')
    .setTitle('ROGUEPOKE')
    .setDescription([
      '```text',
      'RRRRR   OOOOO   GGGGG  U   U  EEEEE  PPPPP   OOOOO  K   K  EEEEE',
      'R   R   O   O   G      U   U  E      P   P   O   O  K  K   E',
      'RRRRR   O   O   G  GG  U   U  EEEE   PPPPP   O   O  KKK    EEEE',
      'R  R    O   O   G   G  U   U  E      P       O   O  K  K   E',
      'R   R   OOOOO   GGGGG  UUUUU  EEEEE  P       OOOOO  K   K  EEEEE',
      '```',
      'Bem-vindo(a) ao hub oficial do RoguePoke.',
      '',
      '**Primeiros passos:**',
      '1. Leia #regras.',
      '2. Libere acesso em #verificacao.',
      '3. Escolha seus idiomas em #idiomas.',
      '4. Use #abrir-ticket para suporte privado.',
      '',
      'Avisos oficiais ficam em announcements. Idiomas e paises ficam separados para manter anuncios limpos.'
    ].join('\n'))
    .setTimestamp());
  await ensureInfoMessage(rulesChannel, 'roguepoke:rules:v2', new EmbedBuilder()
    .setColor('#ED4245')
    .setTitle('📋 Regras Gerais RoguePoke')
    .setDescription([
      'Para manter o servidor limpo, seguro e util, siga estas regras:',
      '',
      '**1. Respeito sempre.** Sem ataques pessoais, assedio, discriminacao, provocacao gratuita ou perseguicao.',
      '**2. Nada de spam.** Evite flood, caps excessivo, mentions repetidas, correntes e autopromocao fora dos canais permitidos.',
      '**3. Use o canal certo.** Guias ficam na wiki, suporte fica em ticket, bugs e ideias ficam em feedback.',
      '**4. Conteudo seguro.** Sem NSFW, gore, phishing, malware, pirataria, venda ilegal ou qualquer violacao das regras do Discord.',
      '**5. Bugs com responsabilidade.** Reporte exploits em ticket quando forem sensiveis. Nao ensine abuso, dupes ou bypasses publicamente.',
      '**6. Privacidade.** Nunca exponha dados pessoais, tokens, prints privados, contas ou informacoes sensiveis.',
      '**7. Decisao da staff.** A equipe pode remover conteudo, silenciar, expulsar ou banir para proteger a comunidade.',
      '',
      'Ao permanecer no servidor, voce aceita estas regras e as Community Guidelines do Discord.'
    ].join('\n'))
    .setTimestamp());

  await ensureInfoMessage(faqChannel, 'roguepoke:faq:v2', new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle('❓ FAQ - Comece Aqui')
    .setDescription([
      '**O que e RoguePoke?**',
      'Uma comunidade para um novo jogo de aventura/roguelike com criaturas, progresso, runs, descobertas e estrategia.',
      '',
      '**Como libero os canais?**',
      'Use o botao em ✅-verificação e depois escolha seus idiomas em 📢-announcements.',
      '',
      '**Onde reporto bugs?**',
      'Use 🐛-bugs-and-ideas para reports publicos. Abra ticket se envolver conta, exploit sensivel ou dados privados.',
      '',
      '**Como falo com a staff?**',
      'Abra um ticket em 🎫-abrir-ticket. Evite marcar staff diretamente fora de emergencias.',
      '',
      '**Posso divulgar meu conteudo?**',
      'Sim, em 🎥-content, desde que seja relacionado ao projeto e sem spam.'
    ].join('\n'))
    .setTimestamp());

  await ensureInfoMessage(wikiChannel, 'roguepoke:wiki:v2', new EmbedBuilder()
    .setColor('#57F287')
    .setTitle('📖 Wiki Inicial')
    .setDescription([
      '**Fluxo recomendado para novos membros:**',
      '1. Leia 📋-regras.',
      '2. Registre-se em ✅-verificação.',
      '3. Escolha Português, English ou Español em 📢-announcements.',
      '4. Converse no canal do seu idioma.',
      '5. Use 💡-dicas, ⚔️-builds e 🧬-bestiário para conhecimento do jogo.',
      '',
      '**Como contribuir:**',
      'Compartilhe descobertas, prints e ideias com contexto. Conteudo bom pode virar material oficial da wiki.'
    ].join('\n'))
    .setTimestamp());

  await ensureInfoMessage(announcementsChannel, 'roguepoke:welcome:v2', new EmbedBuilder()
    .setColor('#DCFF00')
    .setTitle(`📢 Bem-vindo(a) ao ${guild.name}`)
    .setDescription([
      'Este servidor foi organizado para novidades, suporte, feedback, runs e moderacao clara.',
      '',
      '**Comece por aqui:** leia 📋-regras, registre-se em ✅-verificação e escolha seus idiomas nos botoes abaixo.',
      'Avisos importantes aparecem aqui. Canais oficiais ficam travados para manter informacao limpa.'
    ].join('\n'))
    .setTimestamp());


  await ensureInfoMessage(languageChannel, 'roguepoke:languages:v1', new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle('Idiomas e paises')
    .setDescription([
      'Escolha todos os idiomas que voce entende ou quer acompanhar.',
      '',
      'Esses cargos servem para identificar voce, liberar os chats certos e aumentar a conversa entre membros de regioes diferentes.',
      'Voce pode ativar mais de um idioma quando quiser.'
    ].join('\n'))
    .setTimestamp());

  await ensureInfoMessage(hallOfFameChannel, 'roguepoke:hof:v1', new EmbedBuilder()
    .setColor('#F1C40F')
    .setTitle('Hall of Fame')
    .setDescription([
      'Canal para conquistas, runs memoraveis, prints de destaque e feitos da comunidade.',
      '',
      'Publique aqui apenas resultados que merecem vitrine. Conversas normais ficam em off-topic ou nos chats de idioma.'
    ].join('\n'))
    .setTimestamp());

  await ensureInfoMessage(changelogChannel, 'roguepoke:changelog:v1', new EmbedBuilder()
    .setColor('#9B59B6')
    .setTitle('📝 Changelog')
    .setDescription([
      'Este canal recebe mudancas importantes do servidor, bot, balanceamento, correcoes e roadmap.',
      '',
      'A equipe deve publicar updates curtos, datados e com impacto claro para a comunidade.'
    ].join('\n'))
    .setTimestamp());

  await ensureInfoMessage(supportChannel, 'roguepoke:support:v2', new EmbedBuilder()
    .setColor('#FEE75C')
    .setTitle('🎫 Como usar o suporte')
    .setDescription([
      'Abra ticket apenas quando precisar de atendimento privado ou quando o assunto envolver conta, denuncia, exploit sensivel ou informacoes pessoais.',
      '',
      'Para bugs e sugestoes publicas, prefira 🐛-bugs-and-ideas e 💡-sugestões.',
      'Ao abrir ticket, descreva o problema, envie prints quando possivel e aguarde a staff.'
    ].join('\n'))
    .setTimestamp());

  const shopItems = blueprint.shopItems || [];
  if (refreshInfo) await clearRecentBotMessages(shopChannel, 'shop refresh');
  await ensureInfoMessage(shopChannel, 'roguepoke:shop:v1', new EmbedBuilder()
    .setColor('#FEE75C')
    .setTitle('Lojinha RoguePoke')
    .setDescription([
      'Este canal e o catalogo oficial da economia RoguePoke.',
      'Os comandos da lojinha respondem de forma privada para manter a vitrine limpa.',
      '',
      '**Como ganhar PokeCoins e CP:**',
      '- `/daily`, `/weekly` e `/work`',
      '- ficar em canais de voz ativos',
      '- completar quests e participar de eventos',
      '',
      '**Como comprar:**',
      '1. Veja itens com `/shop`.',
      '2. Compre com `/buy item:<id>`.',
      '3. Veja compras com `/inventory`.',
      '4. Badges compradas aparecem em `/badges` e podem virar cargos no perfil.',
      '5. Compras publicas aparecem no historico em compras.',
      '',
      shopItems.map(item => `- \`${item.key}\` - ${item.name} (${item.priceCoins} PokeCoins + ${item.priceCp || 0} CP, nivel ${item.minLevel || 0})`).join('\n')
    ].join('\n'))
    .setTimestamp());

  await ensureInfoMessage(purchaseHistoryChannel, 'roguepoke:purchases:v1', new EmbedBuilder()
    .setColor('#2DD4BF')
    .setTitle('Historico de compras')
    .setDescription([
      'Este canal mostra compras feitas pela comunidade com PokeCoins e CP.',
      '',
      'Ele e publico para membros verificados, mas travado para manter o historico limpo.',
      'Use a lojinha para ver o catalogo e `/buy item:<id>` para comprar.'
    ].join('\n'))
    .setTimestamp());
  await ensureInfoMessage(staffDashboard, 'roguepoke:staff:v1', new EmbedBuilder()
    .setColor('#2DD4BF')
    .setTitle('📊 Staff Ops')
    .setDescription([
      '**Checklist operacional:**',
      '- Monitorar 🛡️-mod-logs diariamente.',
      '- Responder tickets em ate 24h.',
      '- Mover reports sensiveis para ticket.',
      '- Registrar punicoes com motivo objetivo.',
      '- Manter changelog claro quando houver update.',
      '',
      '**Painel local:** http://127.0.0.1:3000'
    ].join('\n'))
    .setTimestamp());
}

function configureCoreBotFeatures(guild) {
  if (dryRun) {
    log('would configure core bot features in SQLite');
    return;
  }

  const welcomeChannel = state.channels.get('welcome');
  const portugueseChat = state.channels.get('portuguese_chat');
  const modLogs = state.channels.get('mod_logs');
  const tempVoice = state.channels.get('portuguese_voice_1') || state.channels.get('english_voice_1');

  db.createGuild(guild.id, guild.name);

  if (welcomeChannel) {
    db.setWelcomeConfig(guild.id, {
      enabled: true,
      channelId: welcomeChannel.id,
      dmEnabled: false,
      dmMessage: `Bem-vindo(a) ao ${guild.name}!`,
      embedTitle: null,
      embedDescription: 'Bem-vindo(a), {user}! Leia as regras, registre-se e escolha seus idiomas.',
      embedColor: '#DCFF00',
      embedThumbnail: null
    });
  }

  db.setLevelingConfig(guild.id, {
    enabled: true,
    xpMin: 15,
    xpMax: 25,
    cooldown: 60000,
    levelUpMessage: 'Parabens {user}! Voce alcancou o nivel **{level}** no RoguePoke.'
  });

  db.setEconomyConfig(guild.id, {
    enabled: true,
    currency: 'PokeCoins',
    dailyReward: 100,
    weeklyReward: 500
  });

  db.setAutomodRule(guild.id, 'antiSpam', { enabled: true, maxMessages: 5, timeWindow: 10000 });
  db.setAutomodRule(guild.id, 'antiCaps', { enabled: true, threshold: 70, minLength: 10 });
  db.setAutomodRule(guild.id, 'antiInvite', { enabled: true, whitelist: ['discord.gg/roguepoke'] });
  db.setAutomodRule(guild.id, 'antiLink', { enabled: true, whitelist: ['roguepoke.com', 'pokelite.xyz', 'youtube.com', 'twitter.com', 'x.com', 'github.com'] });
  db.setAutomodRule(guild.id, 'bannedWords', { enabled: true, words: [] });

  if (tempVoice) {
    db.setTempVoiceConfig(guild.id, {
      enabled: true,
      channelId: tempVoice.id,
      categoryId: tempVoice.parentId
    });
  }

  for (const badge of blueprint.badges || []) {
    db.upsertBadge(badge);
  }

  for (const item of blueprint.shopItems || []) {
    if (item.type === 'badge' && item.payload?.badge) {
      db.upsertBadge(item.payload.badge);
    }
    const role = item.payload?.role ? state.roles.get(item.payload.role) : null;
    db.upsertShopItem(guild.id, {
      ...item,
      payload: {
        ...(item.payload || {}),
        roleId: role?.id || null
      }
    });
  }

  for (const reward of blueprint.levelRewards || []) {
    const role = state.roles.get(reward.role);
    if (role) db.addLevelReward(guild.id, reward.level, role.id, badgeKeyForReward(reward));
  }

  const founderRole = state.roles.get('founder');
  if (founderRole && ownerUserId) {
    db.awardBadge(guild.id, ownerUserId, 'founder');
  }

  const config = db.getGuild(guild.id)?.config || {};
  db.updateGuildConfig(guild.id, {
    ...config,
    brand: 'RoguePoke',
    defaultChatChannelId: portugueseChat?.id || null,
    modLogChannelId: modLogs?.id || null,
    dashboardUrl: 'http://127.0.0.1:3000'
  });
}

function badgeKeyForReward(reward) {
  const map = {
    'Primeiros Passos': 'first_steps',
    Estrategista: 'strategist',
    'Guardião da Run': 'guardian',
    'Campeão RoguePoke': 'champion'
  };
  return map[reward.badge] || null;
}

async function configureGuildBrand(guild) {
  if (dryRun) {
    log('would configure guild name: RoguePoke');
    return;
  }

  if (guild.name !== 'RoguePoke') {
    await guild.setName('RoguePoke', 'RoguePoke server branding setup').catch(error => {
      console.error(`Could not rename guild: ${error.message}`);
    });
    log('guild name synced: RoguePoke');
  }
}

client.once('clientReady', async () => {
  try {
    const guild = await client.guilds.fetch(guildId);
    await guild.channels.fetch();
    await guild.roles.fetch();

    log(`Applying structure to ${guild.name} (${guild.id})`);
    await configureGuildBrand(guild);

    for (const roleData of blueprint.roles) {
      await findOrCreateRole(guild, roleData);
    }

    for (const categoryData of blueprint.categories) {
      const category = await findOrCreateCategory(guild, categoryData);
      for (const channelData of categoryData.channels) {
        await findOrCreateChannel(guild, category, categoryData, channelData);
      }
      await sortCategoryChannels(categoryData);
    }

    await lockExistingArchiveChannels(guild);

    configureCoreBotFeatures(guild);
    await assignOwnerRole(guild);
    await sendInfoMessages(guild);
    await sendVerificationPanel(guild);
    await sendLanguagePanel();
    await sendTicketPanel(guild);

    log('Server structure applied.');
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    client.destroy();
}

async function sortCategoryChannels(categoryData) {
  if (dryRun) return;

  for (let index = 0; index < (categoryData.channels || []).length; index++) {
    const channelData = categoryData.channels[index];
    const channel = state.channels.get(channelData.key);
    if (!channel) continue;

    await channel.setPosition(index, {
      reason: 'Sync channel order from server blueprint'
    }).catch(error => {
      console.error(`Error sorting channel ${channel.name}:`, error.message);
    });
  }
}
});

client.login(token);
