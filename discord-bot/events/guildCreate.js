const { Events, EmbedBuilder } = require('discord.js');

module.exports = {
  name: Events.GuildCreate,
  once: false,
  execute(guild, client) {
    console.log(`✅ Joined guild: ${guild.name} (${guild.id})`);

    client.db.createGuild(guild.id, guild.name);

    const systemChannel = guild.systemChannel;
    if (systemChannel) {
      const embed = new EmbedBuilder()
        .setColor('#DCFF00')
        .setTitle('🎮 RoguePoke Bot Added!')
        .setDescription('Thanks for adding me to your server!\n\nUse `/help` to see all available commands.\nUse `/setup` to configure the bot for your server.')
        .setThumbnail(client.user.displayAvatarURL())
        .setTimestamp();

      systemChannel.send({ embeds: [embed] }).catch(() => {});
    }
  }
};
