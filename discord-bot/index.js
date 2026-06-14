const { Client, GatewayIntentBits, Collection, EmbedBuilder, Partials, ActivityType } = require('discord.js');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Database = require('./database/database');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.commands = new Collection();
client.events = new Collection();
client.modules = new Collection();
client.config = require('./config.json');

const db = new Database();
client.db = db;

async function loadCommands() {
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      console.log(`Command loaded: ${command.data.name}`);
    }
  }
}

async function loadEvents() {
  const eventsPath = path.join(__dirname, 'events');
  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
    console.log(`Event loaded: ${event.name}`);
  }
}

async function loadModules() {
  const modulesPath = path.join(__dirname, 'modules');
  const moduleFiles = fs.readdirSync(modulesPath).filter(file => file.endsWith('.js'));

  for (const file of moduleFiles) {
    const filePath = path.join(modulesPath, file);
    const module = require(filePath);
    if (module.init) {
      module.init(client);
      client.modules.set(module.name, module);
      console.log(`Module loaded: ${module.name}`);
    }
  }
}

client.once('clientReady', async () => {
  console.log(`\nRoguePoke Bot is online as ${client.user.tag}`);
  console.log(`Serving ${client.guilds.cache.size} guild(s)`);

  client.user.setActivity('RoguePoke | /help', { type: ActivityType.Playing });

  try {
    const commands = client.commands.map(cmd => cmd.data.toJSON());
    await client.application.commands.set(commands);
    console.log(`Slash commands registered (${commands.length} commands)\n`);
  } catch (error) {
    console.error('Error registering commands:', error);
  }
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (command) await command.execute(interaction, client);
      return;
    }

    if (interaction.isButton()) {
      const [action, ...params] = interaction.customId.split('_');

      if (action === 'verify') {
        const verifyModule = client.modules.get('verification');
        if (verifyModule) await verifyModule.handleButton(interaction, client);
      } else if (action === 'ticket') {
        const ticketModule = client.modules.get('tickets');
        if (ticketModule) await ticketModule.handleButton(interaction, client, params);
      } else if (action === 'role') {
        const reactionModule = client.modules.get('reactionroles');
        if (reactionModule) await reactionModule.handleButton(interaction, client, params);
      }
      return;
    }

    if (interaction.isStringSelectMenu()) {
      const [action, ...params] = interaction.customId.split('_');

      if (action === 'ticket') {
        const ticketModule = client.modules.get('tickets');
        if (ticketModule) await ticketModule.handleSelectMenu(interaction, client, params);
      } else if (action === 'role') {
        const reactionModule = client.modules.get('reactionroles');
        if (reactionModule) await reactionModule.handleSelectMenu(interaction, client, params);
      }
      return;
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('ticket_intake_')) {
        const ticketModule = client.modules.get('tickets');
        if (ticketModule) await ticketModule.handleModalSubmit(interaction, client);
      }
    }
  } catch (error) {
    console.error('Error handling interaction:', error);

    const errorEmbed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setDescription('Ocorreu um erro ao executar esta interacao.')
      .setTimestamp();

    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
    } else {
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
    }
  }
});

async function init() {
  await db.connect();
  await loadCommands();
  await loadEvents();
  await loadModules();

  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    throw new Error('DISCORD_TOKEN is missing. Create discord-bot/.env from .env.example and add your bot token.');
  }

  await client.login(token);
}

init().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

module.exports = client;
