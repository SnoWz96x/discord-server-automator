const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setleveling')
    .setDescription('Configurar sistema de leveling')
    .addIntegerOption(option =>
      option.setName('xp_min').setDescription('XP mínimo por mensagem').setRequired(false)
    )
    .addIntegerOption(option =>
      option.setName('xp_max').setDescription('XP máximo por mensagem').setRequired(false)
    )
    .addIntegerOption(option =>
      option.setName('cooldown').setDescription('Cooldown em segundos').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    const xpMin = interaction.options.getInteger('xp_min') || 15;
    const xpMax = interaction.options.getInteger('xp_max') || 25;
    const cooldown = (interaction.options.getInteger('cooldown') || 60) * 1000;

    client.db.setLevelingConfig(interaction.guild.id, {
      enabled: true,
      xpMin: xpMin,
      xpMax: xpMax,
      cooldown: cooldown,
      levelUpMessage: '🎉 Parabéns {user}! Você alcançou o nível **{level}**!'
    });

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Leveling Configurado!')
      .setDescription(`XP Mínimo: ${xpMin}\nXP Máximo: ${xpMax}\nCooldown: ${cooldown / 1000}s`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
