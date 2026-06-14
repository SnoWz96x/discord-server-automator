const { Events } = require('discord.js');

module.exports = {
  name: Events.ChannelDelete,
  once: false,
  async execute(channel, client) {
    if (!channel.guild) return;

    const modlogs = client.modules.get('modlogs');
    if (!modlogs) return;

    const embed = modlogs.baseEmbed('Channel Deleted', 0xED4245)
      .addFields(
        { name: 'Name', value: channel.name, inline: true },
        { name: 'Type', value: String(channel.type), inline: true },
        { name: 'ID', value: channel.id, inline: false }
      );

    await modlogs.send(channel.guild, embed);
  }
};
