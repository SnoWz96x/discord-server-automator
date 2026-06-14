const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

const DEFAULT_CATEGORIES = [
  { name: 'Bug Report', color: 0xFF0000 },
  { name: 'Account Support', color: 0x00AAFF },
  { name: 'Gameplay Help', color: 0x00FF00 },
  { name: 'Suggestion', color: 0xFFAA00 },
  { name: 'Report Player', color: 0xFF6B35 }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setticket')
    .setDescription('Configurar sistema de tickets')
    .addChannelOption(option =>
      option.setName('channel').setDescription('Canal para painel de tickets').setRequired(true).addChannelTypes(ChannelType.GuildText)
    )
    .addRoleOption(option =>
      option.setName('staff_role').setDescription('Cargo de staff').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    const channel = interaction.options.getChannel('channel');
    const staffRole = interaction.options.getRole('staff_role');

    const config = {
      enabled: true,
      channelId: channel.id,
      categoryName: 'SUPORTE',
      staffRoles: [staffRole.id],
      categories: DEFAULT_CATEGORIES
    };

    client.db.setTicketConfig(interaction.guild.id, config);

    const ticketModule = client.modules.get('tickets');
    if (ticketModule) {
      await ticketModule.createPanel(channel, config, client);
    }

    const response = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('Tickets configurados')
      .setDescription(`Canal: ${channel}\nStaff: ${staffRole}`)
      .setTimestamp();

    await interaction.reply({ embeds: [response], ephemeral: true });
  }
};
