const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quests')
    .setDescription('Ver e resgatar missoes diarias/semanais')
    .addSubcommand(subcommand =>
      subcommand.setName('list').setDescription('Listar suas quests')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('claim')
        .setDescription('Resgatar uma quest concluida')
        .addStringOption(option =>
          option
            .setName('quest')
            .setDescription('Quest para resgatar')
            .setRequired(true)
            .addChoices(
              { name: 'Presenca diaria', value: 'daily_messages' },
              { name: 'Treino em call', value: 'daily_voice' },
              { name: 'Feedback da comunidade', value: 'weekly_forum' }
            )
        )
    ),

  async execute(interaction, client) {
    const quests = client.modules.get('quests');
    if (!quests) return interaction.reply({ content: 'Sistema de quests indisponivel.', ephemeral: true });

    client.db.createUser(interaction.user.id, interaction.guild.id, interaction.user.username);

    if (interaction.options.getSubcommand() === 'claim') {
      const questKey = interaction.options.getString('quest');
      const result = quests.claim(client, interaction.guild.id, interaction.user.id, questKey);
      if (!result.success) return interaction.reply({ content: result.message, ephemeral: true });

      const rewardText = formatRewards(result.rewards);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#57F287')
            .setTitle(`Quest resgatada: ${result.quest.title}`)
            .setDescription(`Recompensas: ${rewardText}`)
            .setTimestamp()
        ]
      });
    }

    const rows = quests.listForUser(client, interaction.guild.id, interaction.user.id);
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('Suas quests')
      .setDescription(rows.map(formatQuest).join('\n\n'))
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};

function formatQuest(quest) {
  const status = quest.claimed ? 'resgatada' : quest.completed ? 'pronta para resgatar' : 'em andamento';
  return `**${quest.title}** (\`${quest.key}\`)\n${quest.description}\nProgresso: **${quest.progress}/${quest.target}** · ${status}\nRecompensa: ${formatRewards(quest.rewards)}`;
}

function formatRewards(rewards = {}) {
  return [
    rewards.xp ? `${rewards.xp} XP` : null,
    rewards.coins ? `${rewards.coins} coins` : null,
    rewards.cp ? `${rewards.cp} CP` : null,
    rewards.badge ? `badge ${rewards.badge}` : null
  ].filter(Boolean).join(' + ') || 'sem recompensa';
}
