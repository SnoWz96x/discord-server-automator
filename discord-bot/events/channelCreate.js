const { Events } = require('discord.js');

module.exports = {
  name: Events.ChannelCreate,
  once: false,
  async execute(channel, client) {
    if (!channel.guild) return;

    const modlogs = client.modules.get('modlogs');
    if (!modlogs) return;

    const embed = modlogs.baseEmbed('Channel Created', 0x57F287)
      .addFields(
        { name: 'Channel', value: `${channel} (${channel.id})`, inline: false },
        { name: 'Name', value: channel.name, inline: true },
        { name: 'Type', value: String(channel.type), inline: true }
      );

    await modlogs.send(channel.guild, embed);
  }
};
