const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Comprar um item da lojinha')
    .addStringOption(option =>
      option.setName('item').setDescription('ID do item da lojinha').setRequired(true)
    ),

  async execute(interaction, client) {
    const itemKey = interaction.options.getString('item');
    const economy = client.modules.get('economy');
    client.db.createUser(interaction.user.id, interaction.guild.id, interaction.user.username);

    const result = await economy.buy(interaction.user.id, interaction.guild.id, itemKey, client, {
      member: interaction.member
    });
    if (!result.success) {
      return interaction.reply({ content: result.message, ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor('#57F287')
      .setTitle('Compra concluida')
      .setDescription([
        `Voce comprou **${result.item.name}** por **${result.item.price_coins.toLocaleString('pt-BR')} PokeCoins** + **${(result.item.price_cp || 0).toLocaleString('pt-BR')} CP**.`,
        '',
        'A compra tambem foi registrada no historico publico de compras.'
      ].join('\n'))
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
