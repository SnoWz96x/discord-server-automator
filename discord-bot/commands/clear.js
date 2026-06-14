const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Limpar mensagens do canal')
    .addIntegerOption(option =>
      option.setName('amount').setDescription('Quantidade de mensagens para limpar').setRequired(true).setMinValue(1).setMaxValue(100)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction, client) {
    const amount = interaction.options.getInteger('amount');

    try {
      await interaction.channel.bulkDelete(amount, true);

      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🗑️ Mensagens Limpas')
        .setDescription(`**${amount}** mensagens foram deletadas por ${interaction.user}.`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error clearing messages:', error);
      await interaction.reply({ content: '❌ Erro ao limpar mensagens.', ephemeral: true });
    }
  }
};
