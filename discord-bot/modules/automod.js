const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'automod',

  userMessageCounts: new Map(),

  init() {
    console.log('AutoMod module initialized');
  },

  async checkMessage(message, client) {
    if (!message.member || message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return false;
    }

    const config = client.db.getAutomodConfig(message.guild.id);

    if (config.antiSpam.enabled && await this.checkAntiSpam(message, client, config.antiSpam)) return true;
    if (config.antiCaps.enabled && await this.checkAntiCaps(message, config.antiCaps)) return true;
    if (config.antiInvite.enabled && await this.checkAntiInvite(message, config.antiInvite)) return true;
    if (config.antiLink.enabled && await this.checkAntiLink(message, config.antiLink)) return true;
    if (config.bannedWords.enabled && await this.checkBannedWords(message, config.bannedWords)) return true;

    return false;
  },

  async checkAntiSpam(message, client, config) {
    const key = `${message.author.id}-${message.guild.id}`;
    const now = Date.now();
    const messages = this.userMessageCounts.get(key) || [];
    const timeWindow = config.timeWindow || 10000;
    const maxMessages = config.maxMessages || 5;

    messages.push(now);
    const recentMessages = messages.filter(timestamp => now - timestamp < timeWindow);
    this.userMessageCounts.set(key, recentMessages);

    if (recentMessages.length > maxMessages) {
      await this.punish(message, 'spam', client);
      return true;
    }

    return false;
  },

  async checkAntiCaps(message, config) {
    const content = message.content;
    const minLength = config.minLength || 10;
    const threshold = config.threshold || 70;
    if (content.length < minLength) return false;

    const letters = content.match(/\p{L}/gu) || [];
    if (letters.length < minLength) return false;

    const uppercaseCount = letters.filter(letter => letter === letter.toUpperCase() && letter !== letter.toLowerCase()).length;
    const percentage = (uppercaseCount / letters.length) * 100;

    if (percentage > threshold) {
      await this.deleteAndWarn(message, 'Mensagens com muitas maiusculas nao sao permitidas.');
      return true;
    }

    return false;
  },

  async checkAntiInvite(message, config) {
    const inviteRegex = /(discord\.gg\/|discordapp\.com\/invite\/|discord\.com\/invite\/)/i;
    if (!inviteRegex.test(message.content)) return false;

    const whitelist = config.whitelist || [];
    if (whitelist.some(item => message.content.toLowerCase().includes(item.toLowerCase()))) {
      return false;
    }

    await this.deleteAndWarn(message, 'Links de convite do Discord nao sao permitidos.');
    return true;
  },

  async checkAntiLink(message, config) {
    const linkRegex = /(https?:\/\/[^\s]+)/gi;
    const urls = message.content.match(linkRegex) || [];
    if (urls.length === 0) return false;

    const whitelist = config.whitelist || [];

    for (const url of urls) {
      let domain;
      try {
        domain = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
      } catch (error) {
        continue;
      }

      if (!whitelist.some(allowed => domain === allowed || domain.endsWith(`.${allowed}`))) {
        await this.deleteAndWarn(message, 'Links externos nao sao permitidos.');
        return true;
      }
    }

    return false;
  },

  async checkBannedWords(message, config) {
    const bannedWords = config.words || [];
    const content = message.content.toLowerCase();

    for (const word of bannedWords) {
      if (word && content.includes(word.toLowerCase())) {
        await this.deleteAndWarn(message, 'Palavra proibida detectada.');
        return true;
      }
    }

    return false;
  },

  async deleteAndWarn(message, reason) {
    await message.delete().catch(() => {});
    const warning = await message.channel.send({ content: `${message.author} ${reason}` }).catch(() => null);
    if (warning) setTimeout(() => warning.delete().catch(() => {}), 5000);
  },

  async punish(message, reason, client) {
    const warnings = (client.db.getUserWarnings(message.guild.id, message.author.id)?.count || 0) + 1;

    await message.delete().catch(() => {});

    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('AutoMod')
      .setDescription(`${message.author} foi alertado por **${reason}**.\n\nWarnings: ${warnings}/4`)
      .setTimestamp();

    const warningMessage = await message.channel.send({ embeds: [embed] }).catch(() => null);
    if (warningMessage) setTimeout(() => warningMessage.delete().catch(() => {}), 10000);

    client.db.addModAction(message.guild.id, message.author.id, client.user.id, 'warn', `AutoMod: ${reason}`);

    if (warnings >= 4) {
      await message.member.ban({ reason: 'AutoMod: Muitos warnings' }).catch(() => {});
    } else if (warnings >= 3) {
      await message.member.timeout(1800000, 'AutoMod: Muitos warnings').catch(() => {});
    } else if (warnings >= 2) {
      await message.member.timeout(300000, 'AutoMod: Muitos warnings').catch(() => {});
    }
  }
};
