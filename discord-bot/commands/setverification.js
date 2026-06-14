const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setverification')
    .setDescription('Configurar sistema de verificacao')
    .addChannelOption(option =>
      option.setName('channel').setDescription('Canal de verificacao').setRequired(true).addChannelTypes(ChannelType.GuildText)
    )
    .addRoleOption(option =>
      option.setName('role').setDescription('Cargo de verificacao').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('button_label').setDescription('Texto do botao').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    const channel = interaction.options.getChannel('channel');
    const role = interaction.options.getRole('role');
    const buttonLabel = interaction.options.getString('button_label') || 'Verificar';

    client.db.setVerificationConfig(interaction.guild.id, {
      enabled: true,
      channelId: channel.id,
      roleId: role.id,
      captchaEnabled: false,
      buttonLabel,
      buttonEmoji: null
    });

    const embed = new EmbedBuilder()
      .setColor('#DCFF00')
      .setTitle('Verificacao')
      .setDescription(`Bem-vindo(a) ao **${interaction.guild.name}**!\n\nPara acessar o servidor, clique no botao abaixo.`)
      .setTimestamp();

    const button = new ButtonBuilder()
      .setCustomId('verify_captcha')
      .setLabel(buttonLabel)
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(button);
    await channel.send({ embeds: [embed], components: [row] });

    const response = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('Verificacao configurada')
      .setDescription(`Canal: ${channel}\nCargo: ${role}\nBotao: ${buttonLabel}`)
      .setTimestamp();

    await interaction.reply({ embeds: [response], ephemeral: true });
  }
};
