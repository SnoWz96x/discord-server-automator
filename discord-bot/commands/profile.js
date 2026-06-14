const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Ver perfil, progresso, badges e criaturas')
    .addUserOption(option =>
      option.setName('user').setDescription('Usuario consultado').setRequired(false)
    ),

  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    client.db.createUser(targetUser.id, interaction.guild.id, targetUser.username);
    client.db.updateUsername(targetUser.id, interaction.guild.id, targetUser.username);

    const user = client.db.getUser(targetUser.id, interaction.guild.id);
    const badges = client.db.getUserBadges(interaction.guild.id, targetUser.id);
    const creatures = client.db.getUserCreatures(interaction.guild.id, targetUser.id);
    const xpRank = client.db.getUserRank(interaction.guild.id, targetUser.id, 'xp');
    const coinRank = client.db.getUserRank(interaction.guild.id, targetUser.id, 'coins');

    const nextLevelXp = Math.pow((user.level || 0) + 1, 2) * 100;
    const progress = nextLevelXp > 0 ? Math.min(100, Math.floor(((user.xp || 0) / nextLevelXp) * 100)) : 0;

    const embed = new EmbedBuilder()
      .setColor('#DCFF00')
      .setTitle(`Perfil de ${targetUser.username}`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'Progressao', value: `Nivel **${user.level || 0}**\nXP **${format(user.xp || 0)}**\nProximo nivel **${format(nextLevelXp)} XP**\nProgresso **${progress}%**`, inline: true },
        { name: 'Recursos', value: `Coins **${format(user.coins || 0)}**\nCP **${format(user.cp || 0)}**`, inline: true },
        { name: 'Ranks', value: `XP **#${xpRank || '-'}**\nCoins **#${coinRank || '-'}**`, inline: true },
        { name: 'Atividade', value: `Mensagens **${format(user.message_count || 0)}**\nVoz **${format(user.voice_minutes || 0)} min**`, inline: true },
        { name: 'Badges', value: badges.length ? badges.slice(0, 12).map(badge => `${badge.emoji || ''} ${badge.name}`).join('\n') : 'Nenhuma badge ainda.', inline: true },
        { name: 'Criaturas', value: creatures.length ? creatures.slice(0, 12).map(creature => `${creature.name} x${creature.quantity}`).join('\n') : 'Nenhuma criatura capturada ainda.', inline: true }
      )
      .setFooter({ text: `ID ${targetUser.id}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};

function format(value) {
  return Number(value || 0).toLocaleString('pt-BR');
}
