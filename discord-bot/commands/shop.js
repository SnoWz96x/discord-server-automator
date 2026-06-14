const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Ver a lojinha RoguePoke'),

  async execute(interaction, client) {
    const items = client.db.getShopItems(interaction.guild.id);
    if (!items.length) {
      return interaction.reply({ content: 'A lojinha ainda nao tem itens.', ephemeral: true });
    }

    const description = items.map(item => [
      `**${item.name}**`,
      `ID: \`${item.key}\``,
      `${item.description}`,
      `Preco: **${item.price_coins.toLocaleString('pt-BR')} PokeCoins** + **${(item.price_cp || 0).toLocaleString('pt-BR')} CP** · Nivel minimo: **${item.min_level}**`
    ].join('\n')).join('\n\n');

    const embed = new EmbedBuilder()
      .setColor('#FEE75C')
      .setTitle('Lojinha RoguePoke')
      .setDescription(description)
      .setFooter({ text: 'Use /buy item:<id> para comprar.' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
