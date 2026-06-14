const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Banir um usuário do servidor')
    .addUserOption(option =>
      option.setName('user').setDescription('Usuário para banir').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Motivo do ban').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'Sem motivo especificado';

    const member = interaction.guild.members.cache.get(targetUser.id);
    if (!member) {
      return interaction.reply({ content: '❌ Usuário não encontrado no servidor.', ephemeral: true });
    }

    if (!member.bannable) {
      return interaction.reply({ content: '❌ Não posso banir este usuário.', ephemeral: true });
    }

    if (member.roles.highest.position >= interaction.member.roles.highest.position) {
      return interaction.reply({ content: '❌ Não posso banir alguém com cargo igual ou superior.', ephemeral: true });
    }

    try {
      await member.ban({ reason });

      client.db.addModAction(interaction.guild.id, targetUser.id, interaction.user.id, 'ban', reason);

      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('🔨 Usuário Banido')
        .setDescription(`**${targetUser.username}** foi banido.\n\n**Motivo:** ${reason}`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error banning:', error);
      await interaction.reply({ content: '❌ Erro ao banir usuário.', ephemeral: true });
    }
  }
};
