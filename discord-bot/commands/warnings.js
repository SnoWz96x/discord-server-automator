const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('Ver warnings de um usuario')
    .addUserOption(option =>
      option.setName('user').setDescription('Usuario consultado').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('user');
    const warnings = client.db.getUserWarnings(interaction.guild.id, targetUser.id);
    const cases = client.db.getModCases(interaction.guild.id, {
      userId: targetUser.id,
      action: 'warn',
      limit: 10
    });

    const embed = new EmbedBuilder()
      .setColor('#FFAA00')
      .setTitle(`Warnings de ${targetUser.username}`)
      .setDescription(`Total de warnings: **${warnings?.count || 0}**`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    embed.addFields({
      name: 'Warnings recentes',
      value: cases.length ? cases.map(formatWarning).join('\n').slice(0, 1024) : 'Nenhum warning registrado.'
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};

function formatWarning(modCase) {
  const timestamp = Math.floor(new Date(modCase.created_at).getTime() / 1000);
  return `\`${modCase.case_id}\` ${modCase.reason || 'sem motivo'} (<t:${timestamp}:R>)`;
}
