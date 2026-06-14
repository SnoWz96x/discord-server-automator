const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mutar um usuário')
    .addUserOption(option =>
      option.setName('user').setDescription('Usuário para mutar').setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('duration').setDescription('Duração em minutos').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Motivo do mute').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('user');
    const duration = interaction.options.getInteger('duration');
    const reason = interaction.options.getString('reason') || 'Sem motivo especificado';

    const member = interaction.guild.members.cache.get(targetUser.id);
    if (!member) {
      return interaction.reply({ content: '❌ Usuário não encontrado no servidor.', ephemeral: true });
    }

    if (!member.moderatable) {
      return interaction.reply({ content: '❌ Não posso mutar este usuário.', ephemeral: true });
    }

    try {
      await member.timeout(duration * 60 * 1000, reason);

      client.db.addModAction(interaction.guild.id, targetUser.id, interaction.user.id, 'mute', reason, duration);

      const embed = new EmbedBuilder()
        .setColor('#FFAA00')
        .setTitle('🔇 Usuário Mutado')
        .setDescription(`**${targetUser.username}** foi mutado por **${duration}** minutos.\n\n**Motivo:** ${reason}`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error muting:', error);
      await interaction.reply({ content: '❌ Erro ao mutar usuário.', ephemeral: true });
    }
  }
};
