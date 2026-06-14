const { Events } = require('discord.js');

module.exports = {
  name: Events.MessageCreate,
  once: false,
  async execute(message, client) {
    if (message.author.bot) return;
    if (!message.guild) return;

    const automodModule = client.modules.get('automod');
    if (automodModule) {
      const shouldDelete = await automodModule.checkMessage(message, client);
      if (shouldDelete) return;
    }

    const levelingModule = client.modules.get('leveling');
    if (levelingModule) {
      await levelingModule.addXP(message.author.id, message.guild.id, client);
    }
  }
};
