const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Ver saldo de PokeCoins')
    .addUserOption(option =>
      option.setName('user').setDescription('Usuario para consultar').setRequired(false)
    ),

  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    client.db.createUser(targetUser.id, interaction.guild.id, targetUser.username);

    const user = client.db.getUser(targetUser.id, interaction.guild.id);
    const balance = user?.coins || 0;
    const cp = user?.cp || 0;

    const embed = new EmbedBuilder()
      .setColor('#DCFF00')
      .setTitle('Saldo RoguePoke')
      .setDescription([
        `${targetUser} tem **${balance.toLocaleString('pt-BR')} PokeCoins** e **${cp.toLocaleString('pt-BR')} CP**.`,
        '',
        'Use `/daily`, `/weekly`, `/work` e participe de voz para ganhar mais.',
        'Use `/shop` para gastar coins + CP em badges e cosmeticos.'
      ].join('\n'))
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
