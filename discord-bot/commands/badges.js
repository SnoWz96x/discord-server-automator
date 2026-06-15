const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('badges')
    .setDescription('Ver badges de um membro')
    .addUserOption(option =>
      option.setName('user').setDescription('Membro para consultar').setRequired(false)
    ),

  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    client.db.createUser(targetUser.id, interaction.guild.id, targetUser.username);

    const badges = client.db.getUserBadges(interaction.guild.id, targetUser.id);
    const description = badges.length
      ? badges.map(badge => `${badge.emoji || '-'} **${badge.name}**\n${badge.description}`).join('\n\n')
      : 'Este membro ainda nao possui badges.';

    const embed = new EmbedBuilder()
      .setColor('#FEE75C')
      .setTitle(`Badges de ${targetUser.username}`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .setDescription(description)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: isShopChannel(interaction.channel) });
  }
};

function isShopChannel(channel) {
  return channel?.name?.endsWith('-lojinha') || channel?.name?.endsWith('-compras');
}
