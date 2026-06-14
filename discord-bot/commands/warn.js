const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Alertar um usuário')
    .addUserOption(option =>
      option.setName('user').setDescription('Usuário para alertar').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Motivo do alerta').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');

    client.db.addModAction(interaction.guild.id, targetUser.id, interaction.user.id, 'warn', reason);

    const warnings = client.db.getUserWarnings(interaction.guild.id, targetUser.id);

    const embed = new EmbedBuilder()
      .setColor('#FFAA00')
      .setTitle('⚠️ Usuário Alertado')
      .setDescription(`**${targetUser.username}** recebeu um alerta.\n\n**Motivo:** ${reason}\n**Total de warnings:** ${warnings?.count || 0}`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    try {
      await targetUser.send(`⚠️ Você recebeu um alerta em **${interaction.guild.name}**.\n\n**Motivo:** ${reason}\n**Total de warnings:** ${warnings?.count || 0}`);
    } catch (error) {}
  }
};
