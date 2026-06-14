const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulsar um usuário do servidor')
    .addUserOption(option =>
      option.setName('user').setDescription('Usuário para expulsar').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Motivo da expulsão').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'Sem motivo especificado';

    const member = interaction.guild.members.cache.get(targetUser.id);
    if (!member) {
      return interaction.reply({ content: '❌ Usuário não encontrado no servidor.', ephemeral: true });
    }

    if (!member.kickable) {
      return interaction.reply({ content: '❌ Não posso expulsar este usuário.', ephemeral: true });
    }

    if (member.roles.highest.position >= interaction.member.roles.highest.position) {
      return interaction.reply({ content: '❌ Não posso expulsar alguém com cargo igual ou superior.', ephemeral: true });
    }

    try {
      await member.kick(reason);

      client.db.addModAction(interaction.guild.id, targetUser.id, interaction.user.id, 'kick', reason);

      const embed = new EmbedBuilder()
        .setColor('#FFAA00')
        .setTitle('👢 Usuário Expulso')
        .setDescription(`**${targetUser.username}** foi expulso.\n\n**Motivo:** ${reason}`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error kicking:', error);
      await interaction.reply({ content: '❌ Erro ao expulsar usuário.', ephemeral: true });
    }
  }
};
