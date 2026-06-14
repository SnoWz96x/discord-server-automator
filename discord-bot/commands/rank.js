const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Ver seu rank de XP')
    .addUserOption(option =>
      option.setName('user').setDescription('Usuario para ver o rank').setRequired(false)
    ),

  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('user') || interaction.user;

    const rankData = client.modules.get('leveling').getRank(targetUser.id, interaction.guild.id, client);
    if (!rankData) {
      return interaction.reply({ content: 'Usuario nao encontrado no sistema de leveling.', ephemeral: true });
    }

    const xpForNext = Math.max(1, Math.floor(rankData.xpForNextLevel));
    const progress = Math.min(100, Math.floor((rankData.xp / xpForNext) * 100));
    const filled = Math.floor(progress / 10);
    const progressBar = '█'.repeat(filled) + '░'.repeat(10 - filled);

    const embed = new EmbedBuilder()
      .setColor('#DCFF00')
      .setTitle(`Rank de ${targetUser.username}`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'Nivel', value: `${rankData.level}`, inline: true },
        { name: 'Rank', value: rankData.rank > 0 ? `#${rankData.rank}` : 'Sem ranking', inline: true },
        { name: 'XP', value: `${rankData.xp} / ${xpForNext}`, inline: true },
        { name: 'Progresso', value: `${progressBar} ${progress}%`, inline: false }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
