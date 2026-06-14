const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('createrolepanel')
    .setDescription('Criar painel de reaction roles')
    .addChannelOption(option =>
      option.setName('channel').setDescription('Canal do painel').setRequired(true).addChannelTypes(ChannelType.GuildText)
    )
    .addStringOption(option =>
      option.setName('title').setDescription('Título do painel').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('description').setDescription('Descrição do painel').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('roles').setDescription('Cargos (formato: emoji:id,emoji:id)').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    const channel = interaction.options.getChannel('channel');
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description');
    const rolesStr = interaction.options.getString('roles');

    const roles = rolesStr.split(',').map(r => {
      const [emoji, id] = r.trim().split(':');
      const role = interaction.guild.roles.cache.get(id);
      return {
        emoji: emoji,
        roleId: id,
        label: role ? role.name : 'Unknown',
        style: 'Primary'
      };
    }).filter(r => r.roleId);

    if (roles.length === 0) {
      return interaction.reply({ content: '❌ Nenhum cargo válido encontrado.', ephemeral: true });
    }

    const reactionModule = client.modules.get('reactionroles');
    if (reactionModule) {
      await reactionModule.createPanel(channel, {
        title: title,
        description: description,
        roles: roles,
        type: 'button'
      }, client);
    }

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Painel Criado!')
      .setDescription(`Canal: ${channel}\nCargos: ${roles.length}`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
