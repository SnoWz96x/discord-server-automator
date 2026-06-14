const { Events } = require('discord.js');

module.exports = {
  name: Events.MessageUpdate,
  once: false,
  async execute(oldMessage, newMessage, client) {
    if (!newMessage.guild || newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;

    const modlogs = client.modules.get('modlogs');
    if (!modlogs) return;

    const before = oldMessage.content || '[content unavailable]';
    const after = newMessage.content || '[content unavailable]';

    const embed = modlogs.baseEmbed('Message Edited', 0xFEE75C)
      .addFields(
        { name: 'Author', value: `${newMessage.author} (${newMessage.author.id})`, inline: false },
        { name: 'Channel', value: `${newMessage.channel}`, inline: true },
        { name: 'Before', value: before.slice(0, 1024), inline: false },
        { name: 'After', value: after.slice(0, 1024), inline: false }
      )
      .setURL(newMessage.url);

    await modlogs.send(newMessage.guild, embed);
  }
};
