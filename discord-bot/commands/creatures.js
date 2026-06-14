const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('creatures')
    .setDescription('Ver sua colecao de criaturas RoguePoke')
    .addUserOption(option =>
      option.setName('user').setDescription('Usuario para consultar').setRequired(false)
    ),

  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    client.db.createUser(targetUser.id, interaction.guild.id, targetUser.username);

    const rows = client.db.getUserCreatures(interaction.guild.id, targetUser.id);
    const description = rows.length
      ? rows.map(row => `**${row.name || row.creature_key}** x${row.quantity}\n${row.rarity || 'Unknown'} · ${row.element || 'Neutral'}\n${row.description || ''}`).join('\n\n')
      : 'Colecao vazia. Use `/bestiary` e depois `/capture`.';

    const embed = new EmbedBuilder()
      .setColor('#2DD4BF')
      .setTitle(`Colecao de ${targetUser.username}`)
      .setDescription(description)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
