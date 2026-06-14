const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Banir um usuario do servidor')
    .addUserOption(option =>
      option.setName('user').setDescription('Usuario banido').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Motivo do banimento').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'Sem motivo especificado';
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!member) return interaction.reply({ content: 'Usuario nao encontrado no servidor.', ephemeral: true });
    if (!member.bannable) return interaction.reply({ content: 'Nao posso banir este usuario.', ephemeral: true });
    if (member.roles.highest.position >= interaction.member.roles.highest.position) {
      return interaction.reply({ content: 'Nao posso banir alguem com cargo igual ou superior ao seu.', ephemeral: true });
    }

    try {
      await member.ban({ reason });
      const modCase = client.db.addModAction(interaction.guild.id, targetUser.id, interaction.user.id, 'ban', reason);

      const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setTitle(`Usuario banido - ${modCase.case_id}`)
        .setDescription(`${targetUser} foi banido.`)
        .addFields(
          { name: 'Usuario', value: `${targetUser.tag} (${targetUser.id})`, inline: false },
          { name: 'Moderador', value: `${interaction.user} (${interaction.user.id})`, inline: false },
          { name: 'Motivo', value: reason, inline: false }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      const modlogs = client.modules.get('modlogs');
      if (modlogs) await modlogs.send(interaction.guild, embed);
    } catch (error) {
      console.error('Error banning:', error);
      await interaction.reply({ content: 'Erro ao banir usuario.', ephemeral: true });
    }
  }
};
