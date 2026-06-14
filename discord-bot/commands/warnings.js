const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('Ver os warnings de um usuário')
    .addUserOption(option =>
      option.setName('user').setDescription('Usuário para ver warnings').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('user');

    const warnings = client.db.getUserWarnings(interaction.guild.id, targetUser.id);
    const history = client.db.getModHistory(interaction.guild.id, targetUser.id, 5);

    const embed = new EmbedBuilder()
      .setColor('#FFAA00')
      .setTitle(`⚠️ Warnings de ${targetUser.username}`)
      .setDescription(`**Total de warnings:** ${warnings?.count || 0}`)
      .setTimestamp();

    if (history && history.length > 0) {
      const historyText = history.map(h => {
        const date = new Date(h.created_at).toLocaleDateString('pt-BR');
        return `• **${h.action}** - ${h.reason} (${date})`;
      }).join('\n');

      embed.addFields({ name: '📜 Histórico', value: historyText });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
