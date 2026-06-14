const { Events } = require('discord.js');

module.exports = {
  name: Events.MessageDelete,
  once: false,
  async execute(message, client) {
    if (!message.guild || message.author?.bot) return;

    const modlogs = client.modules.get('modlogs');
    if (!modlogs) return;

    const content = message.content || '[content unavailable]';
    const embed = modlogs.baseEmbed('Message Deleted', 0xED4245)
      .addFields(
        { name: 'Author', value: message.author ? `${message.author} (${message.author.id})` : 'Unknown', inline: false },
        { name: 'Channel', value: `${message.channel}`, inline: true },
        { name: 'Content', value: content.slice(0, 1024), inline: false }
      );

    await modlogs.send(message.guild, embed);
  }
};
