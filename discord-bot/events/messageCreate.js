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

    client.db.incrementMessageCount(message.author.id, message.guild.id, 1);

    const quests = client.modules.get('quests');
    if (quests) quests.record(client, message.guild.id, message.author.id, 'message', 1);
  }
};
