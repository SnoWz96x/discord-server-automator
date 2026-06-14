const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { ChannelType, Client, GatewayIntentBits, PermissionFlagsBits, REST, Routes } = require('discord.js');
const Database = require('../database/database');

const requiredCommands = [
  'badges',
  'balance',
  'bestiary',
  'buy',
  'capture',
  'creatures',
  'inventory',
  'profile',
  'quests',
  'shop',
  'rank',
  'leaderboard',
  'warn',
  'case',
  'cases',
  'reason',
  'modhistory',
  'ban',
  'kick'
];

const requiredChannelSuffixes = [
  '-regras',
  '-verificação',
  '-announcements',
  '-abrir-ticket',
  '-ticket-transcripts',
  '-mod-logs',
  '-lojinha'
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function hasSuffix(collection, suffix) {
  return collection.some(item => item.name.endsWith(suffix));
}

async function checkDiscord() {
  const token = process.env.DISCORD_TOKEN;
  const guildId = process.env.GUILD_ID;
  const clientId = process.env.CLIENT_ID;
  assert(token, 'DISCORD_TOKEN is required');
  assert(guildId, 'GUILD_ID is required');
  assert(clientId, 'CLIENT_ID is required');

  const rest = new REST({ version: '10' }).setToken(token);
  const commands = await rest.get(Routes.applicationCommands(clientId));
  const commandNames = commands.map(command => command.name);
  for (const commandName of requiredCommands) {
    assert(commandNames.includes(commandName), `Missing slash command: ${commandName}`);
  }

  const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
  await client.login(token);
  await new Promise(resolve => client.once('clientReady', resolve));

  const guild = await client.guilds.fetch(guildId);
  await guild.channels.fetch();
  await guild.roles.fetch();

  const channels = [...guild.channels.cache.values()];
  for (const suffix of requiredChannelSuffixes) {
    assert(hasSuffix(channels, suffix), `Missing channel ending with ${suffix}`);
  }

  const textChannels = guild.channels.cache.filter(channel => channel.type === ChannelType.GuildText);
  const rules = textChannels.find(channel => channel.name.endsWith('-regras'));
  const staffLogs = textChannels.find(channel => channel.name.endsWith('-mod-logs'));
  assert(rules, 'Rules channel not found');
  assert(staffLogs, 'Mod logs channel not found');
  assert(!rules.permissionsFor(guild.roles.everyone).has(PermissionFlagsBits.SendMessages), 'Rules channel should be locked');
  assert(!staffLogs.permissionsFor(guild.roles.everyone).has(PermissionFlagsBits.ViewChannel), 'Mod logs should be staff-only');

  client.destroy();

  return {
    commands: commands.length,
    channels: guild.channels.cache.size,
    roles: guild.roles.cache.size
  };
}

function checkDatabase() {
  const db = new Database();
  const guildId = process.env.GUILD_ID;
  assert(guildId, 'GUILD_ID is required');

  const shop = db.getShopItems(guildId);
  const creatures = db.getCreatures(guildId);
  const badges = db.getBadgeStats(guildId);

  assert(shop.length >= 4, 'Expected at least 4 shop items');
  assert(shop.every(item => Number.isInteger(item.price_coins) && Number.isInteger(item.price_cp)), 'Shop items must have coin and CP prices');
  assert(creatures.length >= 5, 'Expected at least 5 creatures');
  assert(badges.length >= 6, 'Expected seeded badges');

  return {
    shopItems: shop.length,
    creatures: creatures.length,
    badges: badges.length
  };
}

async function main() {
  const [discord, database] = await Promise.all([checkDiscord(), Promise.resolve(checkDatabase())]);
  console.log(JSON.stringify({ ok: true, discord, database }, null, 2));
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
