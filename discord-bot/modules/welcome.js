const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'welcome',

  init(client) {
    console.log('Welcome module initialized');
  },

  async sendWelcome(member, client) {
    const config = client.db.getWelcomeConfig(member.guild.id);

    if (config && config.enabled && config.channel_id) {
      const channel = member.guild.channels.cache.get(config.channel_id);
      if (channel) {
        try {
          const embed = new EmbedBuilder()
            .setColor(config.embed_color || '#FF6B35')
            .setTitle(config.embed_title || `🎮 Bem-vindo ao ${member.guild.name}!`)
            .setDescription((config.embed_description || 'Bem-vindo(a) {user}!').replace('{user}', `${member}`))
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: `Membro #${member.guild.memberCount}` })
            .setTimestamp();

          await channel.send({ embeds: [embed] });
        } catch (error) {
          console.error('Error sending welcome message:', error);
        }
      }
    }

    if (config && config.dm_enabled && config.dm_message) {
      try {
        await member.send(config.dm_message.replace('{user}', member.user.username));
      } catch (error) {
        console.error('Error sending DM:', error);
      }
    }
  }
};
