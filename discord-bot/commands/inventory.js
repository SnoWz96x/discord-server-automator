const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('Ver seu inventario RoguePoke')
    .addUserOption(option =>
      option.setName('user').setDescription('Usuario para consultar').setRequired(false)
    ),

  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    client.db.createUser(targetUser.id, interaction.guild.id, targetUser.username);
    const items = client.db.getInventory(interaction.guild.id, targetUser.id);

    const description = items.length
      ? items.map(item => `**${item.name || item.item_key}** x${item.quantity}\n${item.description || 'Item RoguePoke'}`).join('\n\n')
      : 'Inventario vazio. Use `/shop` para ver itens disponiveis.';

    const embed = new EmbedBuilder()
      .setColor('#2DD4BF')
      .setTitle(`Inventario de ${targetUser.username}`)
      .setDescription(description)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
