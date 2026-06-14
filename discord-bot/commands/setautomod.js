const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setautomod')
    .setDescription('Configurar auto-moderacao')
    .addBooleanOption(option =>
      option.setName('anti_spam').setDescription('Ativar anti-spam').setRequired(false)
    )
    .addBooleanOption(option =>
      option.setName('anti_caps').setDescription('Ativar anti-caps').setRequired(false)
    )
    .addBooleanOption(option =>
      option.setName('anti_invite').setDescription('Ativar anti-convite').setRequired(false)
    )
    .addBooleanOption(option =>
      option.setName('anti_link').setDescription('Ativar anti-link').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    const antiSpam = interaction.options.getBoolean('anti_spam') ?? true;
    const antiCaps = interaction.options.getBoolean('anti_caps') ?? true;
    const antiInvite = interaction.options.getBoolean('anti_invite') ?? true;
    const antiLink = interaction.options.getBoolean('anti_link') ?? true;

    const config = {
      antiSpam: { enabled: antiSpam, maxMessages: 5, timeWindow: 10000 },
      antiCaps: { enabled: antiCaps, threshold: 70, minLength: 10 },
      antiInvite: { enabled: antiInvite, whitelist: ['roguepoke.com', 'discord.gg'] },
      antiLink: { enabled: antiLink, whitelist: ['roguepoke.com', 'youtube.com', 'twitter.com', 'x.com', 'github.com'] }
    };

    for (const [rule, settings] of Object.entries(config)) {
      client.db.setAutomodRule(interaction.guild.id, rule, settings);
    }

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('AutoMod configurado')
      .addFields(
        { name: 'Anti-Spam', value: antiSpam ? 'Ativo' : 'Inativo', inline: true },
        { name: 'Anti-Caps', value: antiCaps ? 'Ativo' : 'Inativo', inline: true },
        { name: 'Anti-Invite', value: antiInvite ? 'Ativo' : 'Inativo', inline: true },
        { name: 'Anti-Link', value: antiLink ? 'Ativo' : 'Inativo', inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
