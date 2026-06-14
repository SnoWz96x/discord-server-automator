const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('capture')
    .setDescription('Tentar capturar uma criatura gastando PokeCoins e CP')
    .addStringOption(option =>
      option.setName('creature').setDescription('ID da criatura no /bestiary').setRequired(true)
    ),

  async execute(interaction, client) {
    const creatureKey = interaction.options.getString('creature');
    const creatures = client.modules.get('creatures');
    creatures.seedGuild(interaction.guild.id, client);

    const result = creatures.capture(interaction.user.id, interaction.guild.id, creatureKey, client);
    if (!result.success) {
      return interaction.reply({ content: result.message, ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(result.captured ? '#57F287' : '#ED4245')
      .setTitle(result.captured ? 'Captura concluida' : 'Captura falhou')
      .setDescription([
        `Alvo: **${result.creature.name}**`,
        `Custo: **${result.costCoins.toLocaleString('pt-BR')} coins** + **${result.costCp.toLocaleString('pt-BR')} CP**`,
        `Chance: **${result.creature.success_rate}%** · Rolagem: **${result.roll}**`,
        '',
        result.captured
          ? 'A criatura foi adicionada a sua colecao.'
          : 'A tentativa consumiu recursos, mas a criatura escapou.'
      ].join('\n'))
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
