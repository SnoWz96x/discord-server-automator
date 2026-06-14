const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Informações sobre o bot'),

  async execute(interaction, client) {
    const uptime = formatUptime(client.uptime);
    const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

    const embed = new EmbedBuilder()
      .setColor('#DCFF00')
      .setTitle('🎮 RoguePoke Bot')
      .setDescription('Bot all-in-one inspirado em MEE6 + MODUS')
      .addFields(
        { name: '📊 Servidores', value: `${client.guilds.cache.size}`, inline: true },
        { name: '👥 Usuários', value: `${client.guilds.cache.reduce((a, g) => a + g.memberCount, 0)}`, inline: true },
        { name: '📡 Latência', value: `${Math.round(client.ws.ping)}ms`, inline: true },
        { name: '⏱️ Uptime', value: uptime, inline: true },
        { name: '💾 Memória', value: `${memoryUsage} MB`, inline: true },
        { name: '📚 Discord.js', value: `v${require('discord.js').version}`, inline: true }
      )
      .setFooter({ text: 'RoguePoke - Altarugio Digital Studio' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};

function formatUptime(ms) {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}
