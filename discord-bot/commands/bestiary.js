const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bestiary')
    .setDescription('Ver criaturas capturaveis do RoguePoke'),

  async execute(interaction, client) {
    const creaturesModule = client.modules.get('creatures');
    creaturesModule?.seedGuild(interaction.guild.id, client);

    const creatures = client.db.getCreatures(interaction.guild.id);
    const description = creatures.map(creature => [
      `**${creature.name}** \`${creature.key}\``,
      `${creature.rarity} · ${creature.element}`,
      `${creature.capture_cost_coins.toLocaleString('pt-BR')} coins + ${creature.capture_cost_cp.toLocaleString('pt-BR')} CP · ${creature.success_rate}% chance`,
      creature.description
    ].join('\n')).join('\n\n');

    const embed = new EmbedBuilder()
      .setColor('#FEE75C')
      .setTitle('Bestiario RoguePoke')
      .setDescription(description || 'Nenhuma criatura configurada.')
      .setFooter({ text: 'Use /capture creature:<id> para tentar capturar.' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
