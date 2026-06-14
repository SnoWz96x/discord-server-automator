const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('modhistory')
    .setDescription('Ver historico de moderacao de um usuario')
    .addUserOption(option =>
      option.setName('user').setDescription('Usuario consultado').setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('limit').setDescription('Quantidade de cases').setMinValue(1).setMaxValue(20).setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction, client) {
    const user = interaction.options.getUser('user');
    const limit = interaction.options.getInteger('limit') || 10;
    const cases = client.db.getModCases(interaction.guild.id, { userId: user.id, limit });
    const warnings = client.db.getUserWarnings(interaction.guild.id, user.id);

    const embed = new EmbedBuilder()
      .setColor('#FFAA00')
      .setTitle(`Historico de moderacao - ${user.username}`)
      .setDescription(`Warnings totais: **${warnings?.count || 0}**`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    embed.addFields({
      name: 'Cases recentes',
      value: cases.length ? cases.map(formatCaseLine).join('\n').slice(0, 1024) : 'Nenhum case encontrado.'
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};

function formatCaseLine(modCase) {
  const timestamp = Math.floor(new Date(modCase.created_at).getTime() / 1000);
  return `\`${modCase.case_id}\` **${modCase.action}** - ${modCase.reason || 'sem motivo'} (<t:${timestamp}:R>)`;
}
