const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Ver o ranking do servidor')
    .addStringOption(option =>
      option.setName('type').setDescription('Tipo de ranking').addChoices(
        { name: 'XP', value: 'xp' },
        { name: 'Coins', value: 'coins' }
      ).setRequired(false)
    ),

  async execute(interaction, client) {
    const type = interaction.options.getString('type') || 'xp';
    const leaderboard = type === 'coins'
      ? client.db.getCoinLeaderboard(interaction.guild.id, 10)
      : client.db.getLeaderboard(interaction.guild.id, 10);

    if (!leaderboard || leaderboard.length === 0) {
      return interaction.reply({ content: 'Nenhum dado encontrado.', ephemeral: true });
    }

    const medals = ['🥇', '🥈', '🥉'];
    const description = leaderboard.map((user, index) => {
      const medal = medals[index] || `**${index + 1}.**`;
      const value = type === 'coins'
        ? `${user.coins.toLocaleString('pt-BR')} PokeCoins`
        : `Nivel ${user.level} (${user.xp.toLocaleString('pt-BR')} XP)`;
      return `${medal} <@${user.id}> - ${value}`;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setColor('#DCFF00')
      .setTitle(type === 'coins' ? 'Ranking de PokeCoins' : 'Ranking de XP')
      .setDescription(description)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
