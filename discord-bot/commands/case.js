const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('case')
    .setDescription('Consultar um case de moderacao')
    .addStringOption(option =>
      option.setName('id').setDescription('ID do case, ex: CASE-00042 ou 42').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction, client) {
    const id = interaction.options.getString('id');
    const modCase = client.db.getModCase(interaction.guild.id, id);

    if (!modCase) {
      return interaction.reply({ content: 'Case nao encontrado.', ephemeral: true });
    }

    const embed = buildCaseEmbed(modCase);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};

function buildCaseEmbed(modCase) {
  return new EmbedBuilder()
    .setColor(colorForAction(modCase.action))
    .setTitle(`Moderation Case ${modCase.case_id}`)
    .addFields(
      { name: 'Acao', value: modCase.action || '-', inline: true },
      { name: 'Status', value: modCase.status || 'open', inline: true },
      { name: 'Usuario', value: `<@${modCase.user_id}> (${modCase.user_id})`, inline: false },
      { name: 'Moderador', value: modCase.moderator_id ? `<@${modCase.moderator_id}> (${modCase.moderator_id})` : '-', inline: false },
      { name: 'Motivo', value: modCase.reason || 'Sem motivo registrado', inline: false },
      { name: 'Criado em', value: `<t:${Math.floor(new Date(modCase.created_at).getTime() / 1000)}:F>`, inline: false }
    )
    .setTimestamp(new Date(modCase.updated_at || modCase.created_at));
}

function colorForAction(action) {
  if (action === 'ban' || action === 'kick') return '#ED4245';
  if (action === 'warn' || action === 'timeout' || action === 'mute') return '#FFAA00';
  return '#5865F2';
}
