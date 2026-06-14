const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Mostra todos os comandos disponíveis'),

  async execute(interaction, client) {
    const embed = new EmbedBuilder()
      .setColor('#DCFF00')
      .setTitle('🎮 RoguePoke Bot - Comandos')
      .setDescription('Aqui estão todos os comandos disponíveis:')
      .addFields(
        {
          name: '📋 Utilidades',
          value: '`/help` - Mostra esta mensagem\n`/info` - Info do bot\n`/ping` - Latência do bot'
        },
        {
          name: '🎭 Verificação',
          value: '`/verify` - Verificar sua conta\n`/setverification` - Configurar verificação'
        },
        {
          name: '🎮 Leveling',
          value: '`/rank` - Ver seu rank\n`/leaderboard` - Ranking do servidor\n`/setleveling` - Configurar leveling'
        },
        {
          name: '💰 Economia',
          value: '`/balance` - Ver seu saldo\n`/daily` - Resgatar daily\n`/weekly` - Resgatar weekly\n`/work` - Trabalhar\n`/leaderboard` - Ranking de coins'
        },
        {
          name: '🎫 Tickets',
          value: '`/ticket` - Criar/gerenciar tickets\n`/setticket` - Configurar tickets'
        },
        {
          name: '🛡️ Moderação',
          value: '`/ban` - Banir usuário\n`/kick` - Expulsar usuário\n`/mute` - Mutar usuário\n`/warn` - Alertar usuário\n`/warnings` - Ver warnings\n`/clear` - Limpar mensagens'
        },
        {
          name: '🎭 Reaction Roles',
          value: '`/createrolepanel` - Criar painel de cargos'
        },
        {
          name: '⚙️ Admin',
          value: '`/setup` - Configurar o bot\n`/setwelcome` - Configurar boas-vindas\n`/setautomod` - Configurar automod'
        }
      )
      .setFooter({ text: 'RoguePoke - Altarugio Digital Studio' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
