const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'verification',

  init() {
    console.log('Verification module initialized');
  },

  async onMemberJoin(member, client) {
    const config = client.db.getVerificationConfig(member.guild.id);
    if (!config || !config.enabled || !config.channel_id) return;

    const channel = member.guild.channels.cache.get(config.channel_id);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor('#DCFF00')
      .setTitle('Registro RoguePoke')
      .setDescription(`Bem-vindo(a), ${member}.\n\nClique no botao abaixo para liberar seu acesso ao servidor.`)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    const button = new ButtonBuilder()
      .setCustomId('verify_captcha')
      .setLabel(config.button_label || 'Entrar no RoguePoke')
      .setStyle(ButtonStyle.Success);

    if (config.button_emoji) {
      button.setEmoji(config.button_emoji);
    }

    const row = new ActionRowBuilder().addComponents(button);

    await channel.send({ embeds: [embed], components: [row] }).catch(error => {
      console.error('Error sending verification message:', error);
    });
  },

  async handleButton(interaction, client) {
    if (interaction.customId !== 'verify_captcha') return;

    const config = client.db.getVerificationConfig(interaction.guild.id);
    if (!config || !config.enabled) {
      return interaction.reply({ content: 'Registro nao esta habilitado.', ephemeral: true });
    }

    const role = interaction.guild.roles.cache.get(config.role_id);
    if (!role) {
      return interaction.reply({ content: 'Cargo de membro nao encontrado.', ephemeral: true });
    }

    if (interaction.member.roles.cache.has(config.role_id)) {
      return interaction.reply({ content: 'Voce ja esta registrado.', ephemeral: true });
    }

    try {
      await interaction.member.roles.add(role);
      client.db.createUser(interaction.user.id, interaction.guild.id, interaction.user.username);
      client.db.awardBadge(interaction.guild.id, interaction.user.id, 'verified');

      const successEmbed = new EmbedBuilder()
        .setColor('#57F287')
        .setTitle('Registro concluido')
        .setDescription('Acesso liberado. Agora escolha seus idiomas no canal de anuncios.')
        .setTimestamp();

      await interaction.reply({ embeds: [successEmbed], ephemeral: true });
      console.log(`${interaction.user.tag} verified in ${interaction.guild.name}`);
    } catch (error) {
      console.error('Error verifying user:', error);
      await interaction.reply({ content: 'Erro ao registrar. Contate um administrador.', ephemeral: true });
    }
  }
};
