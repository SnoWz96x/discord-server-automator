const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Registrar um alerta de moderacao')
    .addUserOption(option =>
      option.setName('user').setDescription('Usuario alertado').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Motivo do alerta').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');

    client.db.createUser(targetUser.id, interaction.guild.id, targetUser.username);
    const modCase = client.db.addModAction(interaction.guild.id, targetUser.id, interaction.user.id, 'warn', reason);
    const warnings = client.db.getUserWarnings(interaction.guild.id, targetUser.id);

    const embed = new EmbedBuilder()
      .setColor('#FFAA00')
      .setTitle(`Warning registrado - ${modCase.case_id}`)
      .setDescription(`${targetUser} recebeu um alerta.`)
      .addFields(
        { name: 'Usuario', value: `${targetUser.tag} (${targetUser.id})`, inline: false },
        { name: 'Moderador', value: `${interaction.user} (${interaction.user.id})`, inline: false },
        { name: 'Motivo', value: reason, inline: false },
        { name: 'Warnings totais', value: String(warnings?.count || 0), inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    const modlogs = client.modules.get('modlogs');
    if (modlogs) await modlogs.send(interaction.guild, embed);

    await targetUser.send(
      `Voce recebeu um alerta em ${interaction.guild.name}.\nCase: ${modCase.case_id}\nMotivo: ${reason}\nWarnings totais: ${warnings?.count || 0}`
    ).catch(() => {});
  }
};
