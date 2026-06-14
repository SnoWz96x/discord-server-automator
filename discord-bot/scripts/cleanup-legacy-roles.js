const { Client, GatewayIntentBits } = require('discord.js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const blueprint = require('../config/server-blueprint.json');

const token = process.env.DISCORD_TOKEN;
const guildId = process.env.GUILD_ID;

const legacyMappings = [
  { legacyName: 'Moderator', canonicalKey: 'moderator' },
  { legacyName: 'Developer', canonicalKey: 'developer' },
  { legacyName: 'Member', canonicalKey: 'member' },
  { legacyName: 'English', canonicalKey: 'english' },
  { legacyName: 'Portuguese', canonicalKey: 'portuguese' },
  { legacyName: 'Muted', canonicalKey: 'muted' },
  { legacyName: '🇧🇷 Brasileiro', canonicalKey: 'portuguese' }
];

if (!token || !guildId) {
  console.error('Missing DISCORD_TOKEN or GUILD_ID in discord-bot/.env');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

function roleByBlueprintKey(guild, key) {
  const roleData = blueprint.roles.find(role => role.key === key);
  if (!roleData) return null;
  return guild.roles.cache.find(role => role.name === roleData.name) || null;
}

async function migrateMembers(legacyRole, canonicalRole) {
  let migrated = 0;
  for (const member of legacyRole.members.values()) {
    if (!member.roles.cache.has(canonicalRole.id)) {
      await member.roles.add(canonicalRole, `Migrate legacy role ${legacyRole.name}`);
      migrated += 1;
    }
    await member.roles.remove(legacyRole, `Remove legacy role ${legacyRole.name}`);
  }
  return migrated;
}

async function removeLegacyOverwrites(guild, legacyRole, canonicalRole) {
  let updated = 0;
  await guild.channels.fetch();

  for (const channel of guild.channels.cache.values()) {
    const overwrite = channel.permissionOverwrites?.cache?.get(legacyRole.id);
    if (!overwrite) continue;

    const canonicalOverwrite = channel.permissionOverwrites.cache.get(canonicalRole.id);
    const allow = (canonicalOverwrite?.allow.bitfield || 0n) | overwrite.allow.bitfield;
    const deny = (canonicalOverwrite?.deny.bitfield || 0n) | overwrite.deny.bitfield;

    await channel.permissionOverwrites.edit(canonicalRole.id, { allow, deny }).catch(() => {});
    await channel.permissionOverwrites.delete(legacyRole.id, `Remove legacy role overwrite ${legacyRole.name}`).catch(() => {});
    updated += 1;
  }

  return updated;
}

client.once('clientReady', async () => {
  const guild = await client.guilds.fetch(guildId);
  await guild.roles.fetch();
  await guild.members.fetch();

  const report = [];

  for (const mapping of legacyMappings) {
    const legacyRole = guild.roles.cache.find(role => role.name === mapping.legacyName && !role.managed);
    const canonicalRole = roleByBlueprintKey(guild, mapping.canonicalKey);

    if (!legacyRole) {
      report.push({ legacy: mapping.legacyName, status: 'missing' });
      continue;
    }

    if (!canonicalRole) {
      report.push({ legacy: mapping.legacyName, status: 'canonical_missing' });
      continue;
    }

    const migratedMembers = await migrateMembers(legacyRole, canonicalRole);
    const overwrittenChannels = await removeLegacyOverwrites(guild, legacyRole, canonicalRole);

    await legacyRole.delete(`Remove duplicated legacy role ${legacyRole.name}`).catch(error => {
      report.push({ legacy: mapping.legacyName, status: 'delete_failed', error: error.message });
    });

    report.push({
      legacy: mapping.legacyName,
      canonical: canonicalRole.name,
      status: 'removed',
      migratedMembers,
      overwrittenChannels
    });
  }

  console.log(JSON.stringify(report, null, 2));
  client.destroy();
});

client.login(token);
