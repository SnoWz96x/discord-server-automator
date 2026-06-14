const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Ver a lojinha RoguePoke')
    .addStringOption(option =>
      option
        .setName('category')
        .setDescription('Categoria da loja')
        .setRequired(false)
        .addChoices(
          { name: 'Badges', value: 'badges' },
          { name: 'Cosmeticos', value: 'cosmetics' },
          { name: 'Boosts', value: 'boosts' },
          { name: 'Criaturas', value: 'creatures' },
          { name: 'Raros', value: 'rare' }
        )
    ),

  async execute(interaction, client) {
    const category = interaction.options.getString('category');
    const items = client.db.getShopItems(interaction.guild.id, category);
    if (!items.length) {
      return interaction.reply({ content: 'Nao ha itens disponiveis nesta categoria.', ephemeral: true });
    }

    const description = items.map(item => [
      `**${item.name}**`,
      `ID: \`${item.key}\` · Categoria: **${item.category || 'general'}**`,
      item.description,
      `Preco: **${item.price_coins.toLocaleString('pt-BR')} PokeCoins** + **${(item.price_cp || 0).toLocaleString('pt-BR')} CP** · Nivel minimo: **${item.min_level}**`,
      item.stock == null ? null : `Estoque: **${item.stock}**`,
      item.available_until ? `Disponivel ate: **${item.available_until}**` : null
    ].filter(Boolean).join('\n')).join('\n\n');

    const embed = new EmbedBuilder()
      .setColor('#FEE75C')
      .setTitle(category ? `Lojinha RoguePoke - ${category}` : 'Lojinha RoguePoke')
      .setDescription(description.slice(0, 4096))
      .setFooter({ text: 'Use /buy item:<id> para comprar.' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
