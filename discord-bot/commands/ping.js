const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Ver a latência do bot'),

  async execute(interaction, client) {
    const sent = await interaction.reply({ content: '🏓 Pinging...', fetchReply: true });

    const embed = new EmbedBuilder()
      .setColor('#DCFF00')
      .setTitle('🏓 Pong!')
      .addFields(
        { name: '📡 Latência', value: `${sent.createdTimestamp - interaction.createdTimestamp}ms`, inline: true },
        { name: '💓 API', value: `${Math.round(client.ws.ping)}ms`, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ content: null, embeds: [embed] });
  }
};
