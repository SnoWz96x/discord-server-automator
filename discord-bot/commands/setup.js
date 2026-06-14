const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configurar o bot no servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    const embed = new EmbedBuilder()
      .setColor('#DCFF00')
      .setTitle('⚙️ Configuração do RoguePoke Bot')
      .setDescription('Use os comandos abaixo para configurar o bot:\n\n' +
        '`/setwelcome` - Configurar mensagens de boas-vindas\n' +
        '`/setverification` - Configurar sistema de verificação\n' +
        '`/setticket` - Configurar sistema de tickets\n' +
        '`/setleveling` - Configurar sistema de levels\n' +
        '`/setautomod` - Configurar auto-moderação\n' +
        '`/setreactionrole` - Criar painel de reaction roles\n' +
        '`/createrolepanel` - Criar painel de cargos\n' +
        '`/settempvoice` - Configurar canais de voz temporários\n' +
        '`/setautorole` - Configurar auto-role\n\n' +
        '**Módulos ativos:**')
      .setTimestamp();

    const modules = ['verification', 'welcome', 'tickets', 'leveling', 'automod', 'economy', 'reactionroles', 'tempvoice', 'autorole'];
    for (const modName of modules) {
      const mod = client.modules.get(modName);
      embed.addFields({ name: mod ? `✅ ${modName}` : `❌ ${modName}`, value: mod ? 'Ativo' : 'Inativo', inline: true });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
