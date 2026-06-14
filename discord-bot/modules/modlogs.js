const { EmbedBuilder, ChannelType } = require('discord.js');

module.exports = {
  name: 'modlogs',

  init() {
    console.log('ModLogs module initialized');
  },

  getLogChannel(guild) {
    const configuredId = guild.client?.db?.getGuild(guild.id)?.config?.modLogChannelId;
    if (configuredId) {
      const configured = guild.channels.cache.get(configuredId);
      if (configured) return configured;
    }

    return guild.channels.cache.find(channel =>
      channel.type === ChannelType.GuildText &&
      (channel.name === 'mod-logs' || channel.name.endsWith('-mod-logs') || channel.name.includes('mod-logs'))
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
