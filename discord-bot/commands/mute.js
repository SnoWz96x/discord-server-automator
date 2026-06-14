const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Aplicar timeout em um usuario')
    .addUserOption(option =>
      option.setName('user').setDescription('Usuario que recebera timeout').setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('duration').setDescription('Duracao em minutos').setMinValue(1).setMaxValue(40320).setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Motivo do timeout').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('user');
    const duration = interaction.options.getInteger('duration');
    const reason = interaction.options.getString('reason') || 'Sem motivo especificado';
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!member) return interaction.reply({ content: 'Usuario nao encontrado no servidor.', ephemeral: true });
    if (!member.moderatable) return interaction.reply({ content: 'Nao posso aplicar timeout neste usuario.', ephemeral: true });

    try {
      await member.timeout(duration * 60 * 1000, reason);
      const modCase = client.db.addModAction(interaction.guild.id, targetUser.id, interaction.user.id, 'timeout', reason, duration * 60 * 1000);

      const embed = new EmbedBuilder()
        .setColor('#FFAA00')
        .setTitle(`Timeout aplicado - ${modCase.case_id}`)
        .setDescription(`${targetUser} recebeu timeout por ${duration} minuto(s).`)
        .addFields(
          { name: 'Usuario', value: `${targetUser.tag} (${targetUser.id})`, inline: false },
          { name: 'Moderador', value: `${interaction.user} (${interaction.user.id})`, inline: false },
          { name: 'Duracao', value: `${duration} minuto(s)`, inline: true },
          { name: 'Motivo', value: reason, inline: false }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      const modlogs = client.modules.get('modlogs');
      if (modlogs) await modlogs.send(interaction.guild, embed);
    } catch (error) {
      console.error('Error applying timeout:', error);
      await interaction.reply({ content: 'Erro ao aplicar timeout.', ephemeral: true });
    }
  }
};
