const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reason')
    .setDescription('Atualizar o motivo de um case')
    .addStringOption(option =>
      option.setName('case').setDescription('ID do case, ex: CASE-00042 ou 42').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Novo motivo').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction, client) {
    const caseId = interaction.options.getString('case');
    const reason = interaction.options.getString('reason').slice(0, 1000);
    const modCase = client.db.updateModCaseReason(interaction.guild.id, caseId, interaction.user.id, reason);

    if (!modCase) {
      return interaction.reply({ content: 'Case nao encontrado.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor('#57F287')
      .setTitle(`Motivo atualizado - ${modCase.case_id}`)
      .addFields(
        { name: 'Acao', value: modCase.action || '-', inline: true },
        { name: 'Usuario', value: `<@${modCase.user_id}> (${modCase.user_id})`, inline: false },
        { name: 'Novo motivo', value: modCase.reason, inline: false },
        { name: 'Atualizado por', value: `${interaction.user} (${interaction.user.id})`, inline: false }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });

    const modlogs = client.modules.get('modlogs');
    if (modlogs) await modlogs.send(interaction.guild, embed);
  }
};
