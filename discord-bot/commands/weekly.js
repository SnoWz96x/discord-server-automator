const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('weekly')
    .setDescription('Resgatar recompensa semanal'),

  async execute(interaction, client) {
    const economy = client.modules.get('economy');
    const result = economy.weekly(interaction.user.id, interaction.guild.id, client);

    if (!result.success) {
      return interaction.reply({ content: result.message, ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor('#57F287')
      .setTitle('Weekly resgatado')
      .setDescription(`Voce recebeu **${result.amount.toLocaleString('pt-BR')} PokeCoins** e **${result.cp.toLocaleString('pt-BR')} CP**.`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
