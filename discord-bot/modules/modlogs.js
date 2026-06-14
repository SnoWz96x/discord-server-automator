const { EmbedBuilder, ChannelType } = require('discord.js');

module.exports = {
  name: 'modlogs',

  init() {
    console.log('ModLogs module initialized');
  },

  getLogChannel(guild) {
    return guild.channels.cache.find(
      channel => channel.type === ChannelType.GuildText && channel.name === 'mod-logs'
    );
  },

  async send(guild, embed) {
    const channel = this.getLogChannel(guild);
    if (!channel) return;

    await channel.send({ embeds: [embed] }).catch(error => {
      console.error('Error sending mod log:', error);
    });
  },

  baseEmbed(title, color = 0x5865F2) {
    return new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setTimestamp();
  }
};
