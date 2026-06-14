const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cases')
    .setDescription('Listar cases recentes de moderacao')
    .addUserOption(option =>
      option.setName('user').setDescription('Filtrar por usuario').setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('action')
        .setDescription('Filtrar por acao')
        .setRequired(false)
        .addChoices(
          { name: 'warn', value: 'warn' },
          { name: 'timeout', value: 'timeout' },
          { name: 'kick', value: 'kick' },
          { name: 'ban', value: 'ban' }
        )
    )
    .addIntegerOption(option =>
      option.setName('limit').setDescription('Quantidade de cases').setMinValue(1).setMaxValue(20).setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction, client) {
    const user = interaction.options.getUser('user');
    const action = interaction.options.getString('action');
    const limit = interaction.options.getInteger('limit') || 10;
    const cases = client.db.getModCases(interaction.guild.id, {
      userId: user?.id,
      action,
      limit
    });

    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('Cases recentes')
      .setDescription(cases.length ? cases.map(formatCaseLine).join('\n') : 'Nenhum case encontrado.')
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};

function formatCaseLine(modCase) {
  const timestamp = Math.floor(new Date(modCase.created_at).getTime() / 1000);
  return `\`${modCase.case_id}\` **${modCase.action}** <@${modCase.user_id}> - ${modCase.reason || 'sem motivo'} (<t:${timestamp}:R>)`;
}
