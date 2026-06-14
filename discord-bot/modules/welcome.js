module.exports = {
  name: 'welcome',

  init() {
    console.log('Welcome module initialized');
  },

  async sendWelcome(member, client) {
    const config = client.db.getWelcomeConfig(member.guild.id);

    if (config?.enabled && config.channel_id) {
      const channel = member.guild.channels.cache.get(config.channel_id);
      if (channel) {
        const templates = [
          `Bem-vindo(a), ${member}! Diga oi quando terminar o registro.`,
          `${member} acabou de chegar ao servidor.`,
          `Que bom que voce chegou, ${member}.`,
          `Todos saudem ${member}!`,
          `${member} entrou no grupo.`
        ];

        await channel.send({
          content: `-> ${templates[Math.floor(Math.random() * templates.length)]}`
        }).catch(error => {
          console.error('Error sending welcome message:', error);
        });
      }
    }

    if (config?.dm_enabled && config.dm_message) {
      await member.send(config.dm_message.replace('{user}', member.user.username)).catch(() => {});
    }
  }
};
