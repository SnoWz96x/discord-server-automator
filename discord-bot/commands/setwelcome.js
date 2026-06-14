const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setwelcome')
    .setDescription('Configurar mensagens de boas-vindas')
    .addChannelOption(option =>
      option.setName('channel').setDescription('Canal de boas-vindas').setRequired(true).addChannelTypes(ChannelType.GuildText)
    )
    .addStringOption(option =>
      option.setName('message').setDescription('Mensagem (use {user} para mencionar)').setRequired(false)
    )
    .addBooleanOption(option =>
      option.setName('dm').setDescription('Enviar DM de boas-vindas?').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    const channel = interaction.options.getChannel('channel');
    const message = interaction.options.getString('message') || `🎮 Bem-vindo(a) ao **${interaction.guild.name}**, {user}!`;
    const dm = interaction.options.getBoolean('dm') || false;

    client.db.setWelcomeConfig(interaction.guild.id, {
      enabled: true,
      channelId: channel.id,
      dmEnabled: dm,
      dmMessage: `Bem-vindo(a) ao ${interaction.guild.name}! Use /verify para verificar sua conta.`,
      embedTitle: `🎮 Bem-vindo ao ${interaction.guild.name}!`,
      embedDescription: message,
      embedColor: '#FF6B35',
      embedThumbnail: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png'
    });

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Boas-vindas Configurado!')
      .setDescription(`Canal: ${channel}\nDM: ${dm ? 'Ativada' : 'Desativada'}`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
