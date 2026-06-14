const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Verificar sua conta no servidor'),

  async execute(interaction, client) {
    const config = client.db.getVerificationConfig(interaction.guild.id);
    if (!config || !config.enabled) {
      return interaction.reply({ content: '❌ Verificação não está habilitada.', ephemeral: true });
    }

    if (interaction.member.roles.cache.has(config.role_id)) {
      return interaction.reply({ content: '✅ Você já está verificado!', ephemeral: true });
    }

    const role = interaction.guild.roles.cache.get(config.role_id);
    if (!role) {
      return interaction.reply({ content: '❌ Cargo de verificação não encontrado.', ephemeral: true });
    }

    try {
      await interaction.member.roles.add(config.role_id);
      client.db.createUser(interaction.user.id, interaction.guild.id, interaction.user.username);

      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ Verificado!')
        .setDescription('Você foi verificado com sucesso! Agora você tem acesso a todos os canais do servidor.')
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error('Error verifying:', error);
      await interaction.reply({ content: '❌ Erro ao verificar.', ephemeral: true });
    }
  }
};
